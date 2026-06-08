//quest-contracts/wrappers/QuestDistributor.ts
import {
    Address,
    Cell,
    beginCell,
    contractAddress,
    storeStateInit,
    toNano,
    fromNano,
    type StateInit,
} from '@ton/core';

const COMPILED_HEX = 'b5ee9c72410210010002c30003f0ff008e88f4a413f4bcf2c80bed53208f633001d072d721d200d200fa4021103450666f04f86102f862ed44d0d200019cfa40d33fd200f40455306c148e10fa40810101d700f404552003d1587001e205925f05e003d70d1ff2e0822182104d5f7b8abae3023082107f5e4d3cbae3025f04f2c082e1ed43d9010c0f020271020702015803050159b4a3bda89a1a4000339f481a67fa401e808aa60d8291c21f481020203ae01e808aa4007a2b0e003c5b678d8830040002230159b6df3da89a1a4000339f481a67fa401e808aa60d8291c21f481020203ae01e808aa4007a2b0e003c5b678d883006000221020148080a0159b6d81da89a1a4000339f481a67fa401e808aa60d8291c21f481020203ae01e808aa4007a2b0e003c5b678d8830090008f8276f100159b72b1da89a1a4000339f481a67fa401e808aa60d8291c21f481020203ae01e808aa4007a2b0e003c5b678d88300b00022202fe31d33f30815cd75112baf2f482008aabf84223c705f2f481235a03b313f2f4702393206eb38e18206ef2d080d0fa4031fa0059a001d2000192d43092306de2e8308200d557f8276f1002821005f5e100a012bef2f47f2393206eb38ae830217070810082036d6d50436d5033c8cf8580ca00cf8440ce01fa028069cf40025c0d0e009e206ef2d080d0fa40fa00d2005a7071036d6d50436d5033c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb000192d43092306de200646e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb005003c87f01ca0055305034cecb3fca00f400c9ed5400bc82008aabf84223c705f2f4217070810082036d6d50436d5033c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb004003c87f01ca0055305034cecb3fca00f400c9ed54f61cbf0d';

export function getContractCode(): Cell {
    return Cell.fromHex(COMPILED_HEX);
}


export interface WinnerEntry {
    address: string;
    amount: string;
}

export interface DistributorParams {
    ownerAddress: string;
    winners: WinnerEntry[];
    nonce?: bigint;
}

export interface DeployPayload {
    contractAddress: string;
    stateInitBase64: string;
    bodyBase64: string;
    totalNano: bigint;
}

export function buildWinnersCell(winners: WinnerEntry[]): Cell | null {
    if (winners.length === 0) return null;

    let current: Cell | null = null;

    for (let i = winners.length - 1; i >= 0; i--) {
        const addr = Address.parse(winners[i].address);
        const nano = toNano(winners[i].amount);

        const builder = beginCell()
            .storeAddress(addr)
            .storeCoins(nano);

        if (current !== null) {
            builder.storeBit(true).storeRef(current);
        } else {
            builder.storeBit(false);
        }

        current = builder.endCell();
    }

    return current;
}


export function buildContractData(
    owner: Address,
    nonce: bigint,
    winners: WinnerEntry[]
): Cell {
    const winnersCell = buildWinnersCell(winners);

    return beginCell()
        .storeBit(false) 
        .storeAddress(owner)
        .storeInt(nonce, 257) 
        .storeMaybeRef(winnersCell)
        .endCell();
}

export function buildDistributeBody(nonce: bigint): Cell {
    return beginCell()
        .storeUint(0x4d5f7b8a, 32)
        .storeUint(nonce, 64)
        .endCell();
}

export function buildWithdrawBody(): Cell {
    return beginCell()
        .storeUint(0x7f5e4d3c, 32)
        .endCell();
}

const MAX_WINNERS = 30;

export function buildDeployPayload(params: DistributorParams): DeployPayload {
    const { ownerAddress, winners } = params;
    const nonce = params.nonce ?? BigInt(Date.now());

    if (winners.length === 0) throw new Error('Нет победителей');
    if (winners.length > MAX_WINNERS) throw new Error(`Максимум ${MAX_WINNERS} победителей за одну транзакцию`);
    if (winners.some(w => !w.address)) throw new Error('У победителя нет кошелька');

    const owner = Address.parse(ownerAddress);
    const code = getContractCode();
    const data = buildContractData(owner, nonce, winners);

    const stateInit: StateInit = { code, data };

    const stateInitCell = beginCell()
        .store(storeStateInit(stateInit))
        .endCell();

    const body = buildDistributeBody(nonce);

    const contractAddr = contractAddress(0, stateInit);

    const totalNano =
        winners.reduce((sum, w) => sum + toNano(w.amount), 0n) +
        BigInt(winners.length) * toNano('0.05') +
        toNano('0.1');

    return {
        contractAddress: contractAddr.toString({ urlSafe: true, bounceable: true }),
        stateInitBase64: stateInitCell.toBoc().toString('base64'),
        bodyBase64: body.toBoc().toString('base64'),
        totalNano,
    };
}


export function formatTon(nano: bigint | string | number): string {
    return Number(fromNano(nano.toString())).toFixed(2);
}

export function calcTotalTon(winners: WinnerEntry[]): string {
    const total = winners.reduce((s, w) => s + parseFloat(w.amount || '0'), 0);
    return total.toFixed(2);
}

export { MAX_WINNERS };