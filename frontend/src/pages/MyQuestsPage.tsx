import React, { useEffect, useState } from 'react';
import { api } from '../api';
import type { Quest } from '../types';
import { timeAgo } from '../utils';
import { SpinnerPage, EmptyState } from '../components/ui';
import { useApp } from '../context/AppContext';
import { useQuestDetail } from '../context/QuestDetailContext';

const FILTERS = [
  { id: 'all',       label: 'All' },
  { id: 'active',    label: 'Active' },
  { id: 'completed', label: 'Completed' },
];

const C = {
  bg2: '#13131f', border: '#1e1e32',
  purple: '#7B6EF6', purpleL: '#9d90f8',
  muted: '#44445a', sec: '#888',
  green: '#4ade80', amber: '#fbbf24',
};

export function MyQuestsPage() {
  const { navigate } = useApp();
  const { setQuestId, setDetailState } = useQuestDetail();
  const [quests,  setQuests]  = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [filter,  setFilter]  = useState('all');

  useEffect(() => {
    api.getMyQuests()
      .then(d => setQuests(d.quests || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = quests.filter(q => filter === 'all' ? true : q.status === filter);

  const openQuest = (id: string) => {
    setQuestId(id); setDetailState(null); navigate('detail');
  };

  // Summary stats
  const active    = quests.filter(q => q.status === 'active').length;
  const completed = quests.filter(q => q.status === 'completed').length;
  const won       = quests.filter(q => (q as any).iWon).length;
  const earned    = quests.reduce((s, q) => s + Number((q as any).rewardAmount || 0), 0);

  if (loading) return <SpinnerPage />;
  if (error)   return <p style={{ color: '#f87171', textAlign: 'center', padding: '2rem 0', fontSize: 13 }}>{error}</p>;

  return (
    <div className="flex flex-col gap-4 pb-2">
      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        {[
          { v: quests.length, l: 'Joined' },
          { v: active,        l: 'Active' },
          { v: won,           l: 'Won' },
        ].map((s, i) => (
          <div key={i} style={{ background: C.bg2, border: `0.5px solid ${C.border}`, borderRadius: 9, padding: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.purpleL, fontFamily: 'IBM Plex Mono, monospace' }}>{s.v}</div>
            <div style={{ fontSize: 8, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 1, fontFamily: 'IBM Plex Mono, monospace' }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Earned banner */}
      {earned > 0 && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'rgba(74,222,128,0.06)', border: '0.5px solid rgba(74,222,128,0.2)', borderRadius: 9, padding: '9px 13px',
        }}>
          <span style={{ fontSize: 10, color: C.sec }}>Total earned</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 13, height: 13, background: '#0098EA', borderRadius: '50%', display: 'inline-block' }} />
            <span style={{ fontSize: 15, fontWeight: 800, color: C.green, fontFamily: 'IBM Plex Mono, monospace' }}>{earned.toFixed(2)}</span>
            <span style={{ fontSize: 10, color: C.green, fontWeight: 600 }}>TON</span>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', background: C.bg2, border: `0.5px solid ${C.border}`, borderRadius: 10, padding: 2 }}>
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            flex: 1, padding: '6px 0', textAlign: 'center', fontSize: 10, fontWeight: 600,
            borderRadius: 8, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
            background: filter === f.id ? C.purple : 'transparent',
            color: filter === f.id ? '#fff' : C.sec,
          }}>{f.label}</button>
        ))}
      </div>

      {/* Quest cards */}
      {filtered.length === 0 ? (
        <EmptyState text="No quests yet" action={
          <button onClick={() => navigate('home')} style={{
            marginTop: 8, background: C.purple, color: '#fff', fontSize: 12, fontWeight: 700,
            padding: '9px 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
            fontFamily: 'IBM Plex Sans, sans-serif',
          }}>Browse Quests</button>
        } />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(q => <MyQuestCard key={q.id} quest={q} onOpen={openQuest} />)}
        </div>
      )}
    </div>
  );
}

function MyQuestCard({ quest: q, onOpen }: { quest: Quest; onOpen: (id: string) => void }) {
  const score   = (q as any).score ?? q.myScore ?? 0;
  const rank    = (q as any).rank ?? q.myRank;
  const isWinner = (q as any).iWon;
  const isActive = q.status === 'active';

  return (
    <div
      onClick={() => onOpen(q.id)}
      style={{
        background: C.bg2, border: `0.5px solid ${isActive ? 'rgba(123,110,246,0.4)' : C.border}`,
        borderRadius: 11, padding: 12, cursor: 'pointer',
      }}
    >
      {/* title row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 9 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: '#ddd', flex: 1, paddingRight: 6 }}>{q.title}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <StatusBadge status={q.status} />
          {isWinner && <SmallBadge label="Winner 🏆" color={C.amber} bg="rgba(251,191,36,0.12)" border="rgba(251,191,36,0.3)" />}
        </div>
      </div>

      {/* stats row */}
      <div style={{ display: 'flex', gap: 0, marginBottom: q.isJoined && isActive ? 9 : 0 }}>
        {[
          { v: rank ? '#' + rank : '—', l: 'Rank' },
          { v: score,                    l: 'Pts' },
          ...(isWinner ? [{ v: `+${(q as any).rewardAmount || '?'} T`, l: 'Earned' }] : []),
        ].map((s, i, arr) => (
          <div key={i} style={{
            flex: 1, textAlign: 'center',
            borderRight: i < arr.length - 1 ? `0.5px solid ${C.border}` : 'none',
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: isWinner && s.l === 'Earned' ? C.green : C.purpleL, fontFamily: 'IBM Plex Mono, monospace' }}>{s.v}</div>
            <div style={{ fontSize: 8, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 1, fontFamily: 'IBM Plex Mono, monospace' }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* progress bar for active */}
      {isActive && q.totalTasks != null && q.totalTasks > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: C.muted, marginBottom: 3 }}>
            <span>Progress</span>
            <span>{Math.round(((q.myCompletedTasks||0)/q.totalTasks)*100)}%</span>
          </div>
          <div style={{ height: 2, background: '#2a2a3a', borderRadius: 2 }}>
            <div style={{ height: '100%', borderRadius: 2, background: C.purple, width: `${((q.myCompletedTasks||0)/q.totalTasks)*100}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string; border: string }> = {
    active:    { color: '#9d90f8', bg: 'rgba(123,110,246,0.15)', border: 'rgba(123,110,246,0.35)' },
    draft:     { color: '#555',    bg: 'rgba(100,100,120,0.2)',   border: '#2a2a3a' },
    completed: { color: '#4ade80', bg: 'rgba(74,222,128,0.1)',    border: 'rgba(74,222,128,0.25)' },
  };
  const s = map[status] || map.draft;
  return (
    <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 5, fontWeight: 700, color: s.color, background: s.bg, border: `0.5px solid ${s.border}`, whiteSpace: 'nowrap' }}>
      {status}
    </span>
  );
}
function SmallBadge({ label, color, bg, border }: { label: string; color: string; bg: string; border: string }) {
  return (
    <span style={{ fontSize: 8, padding: '2px 7px', borderRadius: 4, fontWeight: 700, color, background: bg, border: `0.5px solid ${border}` }}>
      {label}
    </span>
  );
}