import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import type { Quest, Task } from '../types';
import { fmtDate } from '../utils';
import { Badge, SpinnerPage, EmptyState } from '../components/ui';
import { useApp } from '../context/AppContext';
import { useQuestDetail } from '../context/QuestDetailContext';

/* ── colour tokens ── */
const C = {
  bg2:    '#13131f',
  bg3:    '#1a1a2a',
  border: '#1e1e32',
  purple: '#7B6EF6',
  purpleD:'rgba(123,110,246,0.15)',
  purpleB:'rgba(123,110,246,0.35)',
  muted:  '#44445a',
  sec:    '#888',
  text:   '#e8e0ff',
};

export function HomePage() {
  const { navigate } = useApp();
  const { setQuestId, setDetailState } = useQuestDetail();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const d = await api.listQuests('active');
      const activeQuests: Quest[] = (d.quests || []).filter((q: Quest) => q.status === 'active');
      const withProgress = await Promise.all(
        activeQuests.map(async (q) => {
          if (!q.isJoined) return q;

          try {
            const detail = await api.getQuest(q.id);
            const tasks: Task[] = detail.tasks || [];
            const completedTasks = tasks.filter(t => t.myAnswer != null).length;

            return {
              ...q,
              totalTasks: detail.quest?.totalTasks ?? q.totalTasks ?? tasks.length,
              myCompletedTasks: completedTasks,
            } as Quest;
          } catch {
            return q;
          }
        })
      );

      setQuests(withProgress);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = quests.filter(q =>
    q.status === 'active' &&
    (
      !search ||
      q.title.toLowerCase().includes(search.toLowerCase()) ||
      (q.shortDescription || '').toLowerCase().includes(search.toLowerCase())
    )
  );

  const openQuest = (id: string) => {
    sessionStorage.setItem('questReturnPage', 'home');
    setQuestId(id);
    setDetailState(null);
    navigate('detail');
  };

  return (
    <div className="flex flex-col gap-4 pb-2">
      {/* Search */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: C.bg2, border: `0.5px solid ${C.border}`,
          borderRadius: 10, padding: '9px 12px',
        }}
      >
        <SearchIcon />
        <input
          placeholder="Search active quests..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            background: 'transparent', border: 'none', outline: 'none',
            fontSize: 13, color: C.text, width: '100%',
            fontFamily: 'IBM Plex Sans, sans-serif',
          }}
        />
      </div>

      {loading ? <SpinnerPage /> : error ? (
        <p style={{ color: '#f87171', textAlign: 'center', fontSize: 13, padding: '2rem 0' }}>{error}</p>
      ) : filtered.length === 0 ? (
        <EmptyState text="No active quests found" />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(q => <QuestCard key={q.id} quest={q} onOpen={openQuest} />)}
        </div>
      )}
    </div>
  );
}

function QuestCard({ quest: q, onOpen }: { quest: Quest; onOpen: (id: string) => void }) {
  const isHot = (q.participantsCount || 0) >= 300;
  const totalTasks = Number(q.totalTasks || 0);
  const completedTasks = Math.max(0, Math.min(Number(q.myCompletedTasks || 0), totalTasks));
  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div
      onClick={() => onOpen(q.id)}
      style={{
        background: C.bg2,
        border: `0.5px solid ${q.isJoined ? 'rgba(123,110,246,0.45)' : C.border}`,
        borderRadius: 14, padding: 14, cursor: 'pointer', position: 'relative', overflow: 'hidden',
        transition: 'border-color 0.15s',
      }}
    >
      {/* top purple line for joined quest */}
      {q.isJoined && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: `linear-gradient(90deg, transparent, ${C.purple}, transparent)`,
        }} />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 7 }}>
        <h3 style={{ fontWeight: 700, fontSize: 14, color: '#ddd', flex: 1, paddingRight: 8, lineHeight: 1.3 }}>
          {q.title}
        </h3>
        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          {isHot && <SmallBadge label="HOT" color="#ff7050" bg="rgba(255,100,50,0.12)" border="rgba(255,100,50,0.3)" />}
          <Badge status={q.status} />
        </div>
      </div>

      {q.rewardDescription && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
          <TonIcon />
          <span style={{ fontSize: 12, color: C.purple, fontWeight: 700 }}>{q.rewardDescription}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, fontSize: 11, color: C.sec, flexWrap: 'wrap', marginBottom: q.isJoined ? 8 : 0 }}>
        <span>{q.participantsCount || 0} participants</span>
        {q.endDate && <><span style={{ color: C.border }}>·</span><span>ends {fmtDate(q.endDate)}</span></>}
        {q.isJoined && (
          <>
            <span style={{ color: C.border }}>·</span>
            <span style={{
              color: C.purple, fontSize: 9, border: `0.5px solid ${C.purpleB}`,
              padding: '1px 5px', borderRadius: 3, fontFamily: 'IBM Plex Mono, monospace',
            }}>JOINED</span>
          </>
        )}
      </div>

      {/* progress bar for joined */}
      {q.isJoined && totalTasks > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 2, background: '#2a2a3a', borderRadius: 2 }}>
            <div style={{
              height: '100%', borderRadius: 2, background: C.purple,
              width: `${progressPercent}%`,
            }} />
          </div>
          <span style={{ fontSize: 10, color: C.purple, fontFamily: 'IBM Plex Mono, monospace', flexShrink: 0 }}>
            {completedTasks}/{totalTasks}
          </span>
        </div>
      )}
    </div>
  );
}

/* ── micro components ── */
function SmallBadge({ label, color, bg, border }: { label: string; color: string; bg: string; border: string }) {
  return (
    <span style={{
      fontSize: 8, padding: '2px 7px', borderRadius: 4, fontWeight: 700,
      color, background: bg, border: `0.5px solid ${border}`,
    }}>
      {label}
    </span>
  );
}

function TonIcon() {
  return (
    <span style={{
      width: 13, height: 13, background: '#0098EA', borderRadius: '50%',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 6, fontWeight: 700, color: '#fff', flexShrink: 0,
    }}>T</span>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="6" cy="6" r="4.5" stroke="#44445a" strokeWidth="1.5" />
      <path d="M10 10L12.5 12.5" stroke="#44445a" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
