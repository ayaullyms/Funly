import { useState, useCallback } from 'react';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { Cell } from '@ton/core';
import {
    buildDeployPayload,
    calcTotalTon,
    MAX_WINNERS,
    type WinnerEntry,
} from '../contracts/wrappers/QuestDistributor';
import { api } from '../api';

// ── Типы

export interface PendingReward {
    id:                    string;
    questId:               string;
    userId:                string;
    walletAddress:         string | null;
    walletAddressFriendly: string | null;
    recipientName:         string;
    amount:                string;
    status:                string;
}

export type DistributeStep =
    | 'idle'
    | 'loading'
    | 'confirm'
    | 'no_wallets'
    | 'signing'
    | 'waiting_tx'   
    | 'success'
    | 'error';

export interface DistributeState {
    step:            DistributeStep;
    rewards:         PendingReward[];
    totalTon:        string;
    contractAddress: string;
    txHash:          string;    
    error:           string;
    missingWallets:  string[];
    waitingSeconds:  number;
}


const TONCENTER_BASE = import.meta.env.VITE_TON_TESTNET === 'true'
    ? 'https://testnet.toncenter.com/api/v2'
    : 'https://toncenter.com/api/v2';

function bocToHash(boc: string): string {
   
    const cell = Cell.fromBase64(boc);
    return cell.hash().toString('hex');
}

async function waitForTxHash(
    contractAddr: string,
    bocBase64: string,
    onTick: (seconds: number) => void,
    maxAttempts = 20,
    intervalMs  = 3000
): Promise<string> {
    const bocHash = bocToHash(bocBase64);

    for (let i = 0; i < maxAttempts; i++) {
        await new Promise(r => setTimeout(r, intervalMs));
        onTick((i + 1) * Math.round(intervalMs / 1000));

        try {
            const res = await fetch(
                `${TONCENTER_BASE}/getTransactions` +
                `?address=${encodeURIComponent(contractAddr)}&limit=10`
            );

            if (!res.ok) continue;

            const data = await res.json();
            const txs: any[] = data.result || [];

            const found = txs.find(tx =>
                tx.in_msg?.body_hash === bocHash ||
                tx.transaction_id?.hash === bocHash
            );

            if (found) {
                return found.transaction_id.hash as string;
            }
        } catch {
        }
    }

    throw new Error('Транзакция не подтверждена за 60 секунд. Проверь TonScan вручную.');
}

// ── Хук ──────────────────────────────────────────────────────────────────────

export function useDistributeRewards(questId: string) {
    const wallet = useTonWallet();
    const [tonConnectUI] = useTonConnectUI();

    const [state, setState] = useState<DistributeState>({
        step:            'idle',
        rewards:         [],
        totalTon:        '0',
        contractAddress: '',
        txHash:          '',
        error:           '',
        missingWallets:  [],
        waitingSeconds:  0,
    });

    const set = (patch: Partial<DistributeState>) =>
        setState(prev => ({ ...prev, ...patch }));

    const loadRewards = useCallback(async () => {
        set({ step: 'loading', error: '' });

        try {
            const data    = await api.getQuestPendingRewards(questId);
            const rewards = (data.rewards || []) as PendingReward[];

            if (rewards.length === 0) {
                set({ step: 'error', error: 'Нет наград для раздачи' });
                return;
            }

            const missing = rewards
                .filter(r => !r.walletAddress)
                .map(r => r.recipientName);

            const ready = rewards.filter(r => !!r.walletAddress);

            if (ready.length > MAX_WINNERS) {
                set({
                    step: 'error',
                    error: `Слишком много победителей с кошельками (${ready.length}). Максимум ${MAX_WINNERS} за одну транзакцию.`,
                });
                return;
            }

            set({
                rewards,
                totalTon: calcTotalTon(
                    ready.map(r => ({ address: r.walletAddress!, amount: r.amount }))
                ),
                missingWallets: missing,
                step: missing.length > 0 ? 'no_wallets' : 'confirm',
            });
        } catch (e: any) {
            set({ step: 'error', error: e.message });
        }
    }, [questId]);

    const confirmAndSign = useCallback(async () => {
        if (!wallet?.account?.address) {
            set({ step: 'error', error: 'Подключи кошелёк администратора' });
            return;
        }

        const readyRewards = state.rewards.filter(r => !!r.walletAddress);
        if (readyRewards.length === 0) {
            set({ step: 'error', error: 'Нет победителей с кошельками' });
            return;
        }

        const winners: WinnerEntry[] = readyRewards.map(r => ({
            address: r.walletAddress!,
            amount:  r.amount,
        }));

        set({ step: 'signing', error: '' });

        let payload: ReturnType<typeof buildDeployPayload>;
        let bocResult: string;

        try {
            payload = buildDeployPayload({
                ownerAddress: wallet.account.address,
                winners,
            });

            const result = await tonConnectUI.sendTransaction({
                validUntil: Math.floor(Date.now() / 1000) + 600,
                messages: [{
                    address:   payload.contractAddress,
                    amount:    payload.totalNano.toString(),
                    stateInit: payload.stateInitBase64,
                    payload:   payload.bodyBase64,
                }],
            });

            bocResult = result.boc;
        } catch (e: any) {
            if (
                e?.message?.toLowerCase().includes('cancel') ||
                e?.message?.includes('User rejected') ||
                e?.message?.includes('Reject')
            ) {
                set({ step: state.missingWallets.length > 0 ? 'no_wallets' : 'confirm' });
            } else {
                set({ step: 'error', error: e.message });
            }
            return;
        }

        set({ step: 'waiting_tx', waitingSeconds: 0 });

        let realTxHash: string;
        try {
            realTxHash = await waitForTxHash(
                payload.contractAddress,
                bocResult,
                (seconds) => set({ waitingSeconds: seconds })
            );
        } catch (e: any) {

            realTxHash = bocResult;
            console.warn('TX hash not found, storing BOC as fallback:', e.message);
        }

        try {
            await api.distributeQuestRewards(questId, {
                transactionHash: realTxHash,
                contractAddress: payload.contractAddress,
            });

            set({
                step:            'success',
                contractAddress: payload.contractAddress,
                txHash:          realTxHash,
            });
        } catch (e: any) {
            set({
                step:  'error',
                error: `Транзакция отправлена, но не сохранена в БД: ${e.message}\n` +
                       `TX: ${realTxHash}\nКонтракт: ${payload.contractAddress}`,
            });
        }
    }, [state.rewards, state.missingWallets, wallet, tonConnectUI, questId]);

    const reset = useCallback(() => {
        setState({
            step:            'idle',
            rewards:         [],
            totalTon:        '0',
            contractAddress: '',
            txHash:          '',
            error:           '',
            missingWallets:  [],
            waitingSeconds:  0,
        });
    }, []);

    return { state, loadRewards, confirmAndSign, reset };
}