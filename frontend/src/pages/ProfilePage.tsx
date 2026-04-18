import React, { useEffect, useState } from 'react';
import { api } from '../api';
import type { User, UserStats, Reward } from '../types';
import { fmtDate } from '../utils';
import { SpinnerPage } from '../components/ui';
import { useApp } from '../context/AppContext';

const C = {
  bg2: '#13131f', border: '#1e1e32',
  purple: '#7B6EF6', purpleL: '#9d90f8',
  muted: '#44445a', sec: '#888',
  green: '#4ade80', amber: '#fbbf24', red: '#f87171',
};

export function ProfilePage() {
  const { showToast } = useApp();
  const [user,    setUser]    = useState<User | null>(null);
  const [stats,   setStats]   = useState<UserStats | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [walletInput, setWalletInput] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [me, st, rw] = await Promise.all([api.getMe(), api.getMyStats(), api.getMyRewards()]);
      setUser(me.user); setStats(st.stats); setRewards(rw.rewards || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const connectWallet = async () => {
    if (!walletInput.trim()) { showToast('Enter wallet address', 'error'); return; }
    try { await api.connectWallet({ walletAddress: walletInput.trim() }); showToast('Wallet connected'); load(); }
    catch (e: any) { showToast(e.message, 'error'); }
  };

  const disconnectWallet = async () => {
    try { await api.disconnectWallet(); showToast('Wallet disconnected'); load(); }
    catch (e: any) { showToast(e.message, 'error'); }
  };

  if (loading) return <SpinnerPage />;
  if (error || !user) return <p style={{ color: C.red, textAlign: 'center', padding: '2rem 0', fontSize: 13 }}>{error}</p>;

  const totalEarned = Number(user.totalRewardsAmount || 0);
  const initials = (user.firstName?.[0] || '?').toUpperCase();
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Anonymous';

  return (
    <div className="flex flex-col gap-5 pb-2">
      {/* Avatar + name — centered */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, paddingBottom: 16, borderBottom: `0.5px solid ${C.border}` }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'linear-gradient(135deg,#7B6EF6,#5B4FD6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 800, color: '#fff',
          border: '2px solid rgba(123,110,246,0.35)',
        }}>
          {user.photoUrl
            ? <img src={user.photoUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            : initials
          }
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{displayName}</div>
        {user.username && <div style={{ fontSize: 11, color: C.sec }}>@{user.username}</div>}
        <span style={{
          fontSize: 9, background: 'rgba(123,110,246,0.12)', color: C.purpleL,
          border: '0.5px solid rgba(123,110,246,0.3)', padding: '2px 10px', borderRadius: 4,
          fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: 0.5,
        }}>{user.role}</span>
      </div>

      {/* Earnings banner */}
      {totalEarned > 0 && (
        <div style={{
          background: 'rgba(74,222,128,0.06)', border: '0.5px solid rgba(74,222,128,0.2)',
          borderRadius: 10, padding: '10px 14px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 10, color: C.sec }}>Total earned</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: C.green, fontFamily: 'IBM Plex Mono, monospace' }}>{totalEarned.toFixed(2)}</span>
            <span style={{ fontSize: 11, color: C.green, fontWeight: 600 }}>TON</span>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {[
          { v: stats?.totalTasksCompleted || 0, l: 'Tasks done' },
          { v: stats?.totalWins || 0,            l: 'Wins' },
          { v: stats?.questsJoined || 0,         l: 'Quests joined' },
          { v: stats?.questsCompleted || 0,      l: 'Completed' },
        ].map((s, i) => (
          <div key={i} style={{ background: C.bg2, border: `0.5px solid ${C.border}`, borderRadius: 10, padding: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.purpleL, fontFamily: 'IBM Plex Mono, monospace' }}>{s.v}</div>
            <div style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 2, fontFamily: 'IBM Plex Mono, monospace' }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Wallet */}
      <div style={{ background: C.bg2, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
        <div style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, fontFamily: 'IBM Plex Mono, monospace' }}>TON Wallet</div>
        {user.walletAddress ? (
          <div className="flex flex-col gap-3">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.green }} />
              <span style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>Connected</span>
            </div>
            <div style={{ background: '#060610', borderRadius: 7, padding: '6px 9px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#555', wordBreak: 'break-all' }}>
              {user.walletAddress}
            </div>
            <button onClick={disconnectWallet} style={dangerBtnSt}>Disconnect</button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p style={{ fontSize: 11, color: '#555', lineHeight: 1.6 }}>Connect your wallet to receive quest rewards via smart contract</p>
            <input
              placeholder="Paste TON wallet address..."
              value={walletInput}
              onChange={e => setWalletInput(e.target.value)}
              style={inputSt}
            />
            <button onClick={connectWallet} style={primaryBtnSt}>Connect TON Wallet</button>
          </div>
        )}
      </div>

      {/* Reward history */}
      {rewards.length > 0 && (
        <div>
          <div style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontFamily: 'IBM Plex Mono, monospace' }}>Reward History</div>
          <div style={{ background: C.bg2, border: `0.5px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
            {rewards.map((r, i) => (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', padding: '8px 14px',
                borderBottom: i < rewards.length - 1 ? `0.5px solid ${C.border}` : 'none',
              }}>
                <span style={{ flex: 1, fontSize: 11, color: '#ccc', paddingRight: 8 }}>{r.questTitle}</span>
                <span style={{ fontSize: 11, color: C.green, fontWeight: 700, marginRight: 8, fontFamily: 'IBM Plex Mono, monospace' }}>
                  +{Number(r.amount).toFixed(2)} TON
                </span>
                <RewardBadge status={r.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RewardBadge({ status }: { status: string }) {
  const s = status === 'distributed'
    ? { color: '#4ade80', bg: 'rgba(74,222,128,0.1)', border: 'rgba(74,222,128,0.25)', label: 'paid' }
    : { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.2)', label: 'pending' };
  return (
    <span style={{ fontSize: 8, padding: '2px 7px', borderRadius: 4, fontWeight: 700, color: s.color, background: s.bg, border: `0.5px solid ${s.border}` }}>
      {s.label}
    </span>
  );
}

const inputSt: React.CSSProperties = {
  background: '#0D0D14', border: '0.5px solid #2a2a3a', borderRadius: 8,
  padding: '9px 11px', fontSize: 12, color: '#888', outline: 'none',
  width: '100%', fontFamily: 'IBM Plex Sans, sans-serif',
};
const primaryBtnSt: React.CSSProperties = {
  background: '#7B6EF6', color: '#fff', fontSize: 12, fontWeight: 700,
  padding: '10px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
  fontFamily: 'IBM Plex Sans, sans-serif', width: '100%',
};
const dangerBtnSt: React.CSSProperties = {
  background: 'rgba(248,113,113,0.08)', color: '#f87171', fontSize: 11, fontWeight: 600,
  padding: '8px 12px', borderRadius: 8, border: '0.5px solid rgba(248,113,113,0.25)',
  cursor: 'pointer', fontFamily: 'IBM Plex Sans, sans-serif',
};