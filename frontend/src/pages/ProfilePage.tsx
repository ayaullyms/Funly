import React, { useEffect, useState } from 'react';
import { api } from '../api';
import type { User, UserStats, Reward } from '../types';
import { fmtDate } from '../utils';
import { Badge, SpinnerPage, SectionLabel, StatCard, Button, Input, Card } from '../components/ui';
import { useApp } from '../context/AppContext';

export function ProfilePage() {
  const { showToast } = useApp();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [walletInput, setWalletInput] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [me, st, rw] = await Promise.all([
        api.getMe(),
        api.getMyStats(),
        api.getMyRewards(),
      ]);
      setUser(me.user);
      setStats(st.stats);
      setRewards(rw.rewards || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const connectWallet = async () => {
    if (!walletInput.trim()) { showToast('Enter wallet address', 'error'); return; }
    try {
      await api.connectWallet({ walletAddress: walletInput.trim() });
      showToast('Wallet connected');
      load();
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  const disconnectWallet = async () => {
    try {
      await api.disconnectWallet();
      showToast('Wallet disconnected');
      load();
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  if (loading) return <SpinnerPage />;
  if (error || !user) return <p className="text-red-400 text-sm py-8 text-center">{error}</p>;

  const totalEarned = Number(user.totalRewardsAmount || 0);

  return (
    <div className="flex flex-col gap-6 pb-2">
      {/* Avatar & name */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden flex-shrink-0">
          {user.photoUrl
            ? <img src={user.photoUrl} alt="" className="w-full h-full object-cover" />
            : <span className="text-xl font-black text-zinc-300">{(user.firstName?.[0] || '?').toUpperCase()}</span>
          }
        </div>
        <div>
          <div className="font-bold text-[18px] text-zinc-100">
            {[user.firstName, user.lastName].filter(Boolean).join(' ') || 'Anonymous'}
          </div>
          {user.username && <div className="text-zinc-500 text-sm">@{user.username}</div>}
          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase tracking-wide ${
            user.role === 'admin'
              ? 'bg-amber-500/15 text-amber-400'
              : 'bg-emerald-500/15 text-emerald-400'
          }`}>
            {user.role}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div>
        <SectionLabel>Stats</SectionLabel>
        <div className="grid grid-cols-2 gap-2.5">
          <StatCard value={stats?.totalTasksCompleted || 0} label="Tasks done" color="text-emerald-400" />
          <StatCard value={stats?.totalWins || 0} label="Wins" color="text-amber-400" />
          <StatCard value={stats?.questsJoined || 0} label="Quests joined" color="text-zinc-100" />
          <StatCard value={stats?.questsCompleted || 0} label="Completed" color="text-zinc-100" />
        </div>
      </div>

      {/* Total earned */}
      {totalEarned > 0 && (
        <Card className="flex items-center gap-4 bg-emerald-500/5 border-emerald-500/20">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wide text-zinc-500">Total Earned</div>
            <div className="font-mono text-2xl font-black text-emerald-400">{totalEarned.toFixed(2)} TON</div>
          </div>
        </Card>
      )}

      {/* Wallet */}
      <div>
        <SectionLabel>TON Wallet</SectionLabel>
        <Card>
          {user.walletAddress ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-sm font-semibold text-emerald-400">Connected</span>
              </div>
              <p className="font-mono text-[12px] text-zinc-400 break-all bg-zinc-800 rounded-xl p-3">
                {user.walletAddress}
              </p>
              <Button variant="danger" onClick={disconnectWallet}>Disconnect Wallet</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-zinc-400 text-sm">Connect TON wallet to receive rewards</p>
              <Input
                placeholder="Paste TON wallet address..."
                value={walletInput}
                onChange={e => setWalletInput(e.target.value)}
              />
              <Button variant="green" onClick={connectWallet}>Connect Wallet</Button>
            </div>
          )}
        </Card>
      </div>

      {/* Rewards history */}
      {rewards.length > 0 && (
        <div>
          <SectionLabel>Reward History</SectionLabel>
          <div className="flex flex-col gap-2.5">
            {rewards.map(r => (
              <Card key={r.id} className="p-3.5">
                <div className="flex justify-between items-start mb-1">
                  <div className="font-semibold text-sm text-zinc-100 flex-1 pr-3">{r.questTitle}</div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`font-mono font-bold text-sm ${r.status === 'distributed' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {Number(r.amount).toFixed(2)} TON
                    </span>
                    <Badge status={r.status} />
                  </div>
                </div>
                <div className="text-[11px] text-zinc-500">{fmtDate(r.createdAt)}</div>
                {r.transactionHash && (
                  <div className="mt-2 font-mono text-[10px] text-zinc-600 break-all">
                    tx: {r.transactionHash}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
