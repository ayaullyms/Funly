import React, { useEffect, useState } from 'react';
import { api } from '../api';
import type { Quest, AdminStats, Participant } from '../types';
import { SpinnerPage, EmptyState } from '../components/ui';
import { useApp } from '../context/AppContext';

const C = {
  bg2: '#13131f',
  bg3: '#1a1a2a',
  border: '#1e1e32',
  purple: '#7B6EF6',
  purpleL: '#9d90f8',
  purpleB: 'rgba(123,110,246,0.35)',
  muted: '#44445a',
  sec: '#888',
  green: '#4ade80',
  red: '#f87171',
};

type AdminTab = 'active' | 'draft' | 'completed';

interface Props {
  onOpenEditor: (id: string | null) => void;
}

export function AdminPage({ onOpenEditor }: Props) {
  const { showToast } = useApp();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<AdminTab>('active');

  const load = async () => {
    setLoading(true);
    setError('');

    try {
      const [s, q] = await Promise.all([api.getAdminStats(), api.listQuests()]);
      setStats(s);
      setQuests(q.quests || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const activeQuests = quests.filter(q => q.status === 'active');
  const draftQuests = quests.filter(q => q.status === 'draft');
  const completedQuests = quests.filter(q => q.status === 'completed');

  const visibleQuests =
    tab === 'active' ? activeQuests :
    tab === 'draft' ? draftQuests :
    completedQuests;

  const activateQuest = async (id: string) => {
    if (!confirm('Activate this quest?')) return;

    try {
      await api.updateQuest(id, { status: 'active' });
      showToast('Quest activated');
      setTab('active');
      load();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const finishQuest = async (id: string) => {
    if (!confirm('Complete quest and pick top 3 winners?')) return;

    try {
      await api.completeQuest(id, { winnersCount: 3 });
      showToast('Quest completed');
      setTab('completed');
      load();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const removeQuest = async (id: string) => {
    if (!confirm('Delete this quest?')) return;

    try {
      await api.deleteQuest(id);
      showToast('Quest deleted');
      load();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  if (loading) return <SpinnerPage />;

  if (error) {
    return (
      <p style={{ color: C.red, textAlign: 'center', padding: '2rem 0', fontSize: 13 }}>
        {error}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-2">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <h1 style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>Admin</h1>
        <button onClick={() => onOpenEditor(null)} style={newQuestBtnSt}>+ New Quest</button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {[
            { v: stats.totalUsers, l: 'Users' },
            { v: stats.submissions?.total || 0, l: 'Submissions' },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                background: C.bg2,
                border: `0.5px solid ${C.border}`,
                borderRadius: 10,
                padding: 10,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 17, fontWeight: 800, color: C.purpleL, fontFamily: 'IBM Plex Mono, monospace' }}>
                {s.v}
              </div>
              <div style={{ fontSize: 8, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2, fontFamily: 'IBM Plex Mono, monospace' }}>
                {s.l}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs: active shown by default, drafts/completed separate */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, background: C.bg2, border: `0.5px solid ${C.border}`, borderRadius: 10, padding: 3 }}>
        <TabButton label="Active" count={activeQuests.length} active={tab === 'active'} onClick={() => setTab('active')} />
        <TabButton label="Drafts" count={draftQuests.length} active={tab === 'draft'} onClick={() => setTab('draft')} />
        <TabButton label="Done" count={completedQuests.length} active={tab === 'completed'} onClick={() => setTab('completed')} />
      </div>

      {/* Quest list */}
      {visibleQuests.length === 0 ? (
        <EmptyState text={tab === 'active' ? 'No active quests' : tab === 'draft' ? 'No draft quests' : 'No completed quests'} />
      ) : (
        <div className="flex flex-col gap-3">
          {visibleQuests.map(q => (
            <AdminQuestRow
              key={q.id}
              quest={q}
              onEdit={() => onOpenEditor(q.id)}
              onActivate={() => activateQuest(q.id)}
              onFinish={() => finishQuest(q.id)}
              onRemove={() => removeQuest(q.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TabButton({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? 'rgba(123,110,246,0.18)' : 'transparent',
        color: active ? C.purpleL : C.sec,
        border: 'none',
        borderRadius: 7,
        padding: '7px 4px',
        fontSize: 10,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'IBM Plex Sans, sans-serif',
      }}
    >
      {label} <span style={{ color: active ? '#fff' : C.muted }}>{count}</span>
    </button>
  );
}

interface RowProps {
  quest: Quest;
  onEdit: () => void;
  onActivate: () => void;
  onFinish: () => void;
  onRemove: () => void;
}

function AdminQuestRow({ quest: q, onEdit, onActivate, onFinish, onRemove }: RowProps) {
  const [participants, setParticipants] = useState<Participant[] | null>(null);
  const [loadingP, setLoadingP] = useState(false);
  const [showP, setShowP] = useState(false);

  const toggleP = async () => {
    if (showP) {
      setShowP(false);
      return;
    }

    setShowP(true);

    if (participants !== null) return;

    setLoadingP(true);
    try {
      const d = await api.getParticipants(q.id);
      setParticipants(d.participants || []);
    } catch {
      setParticipants([]);
    } finally {
      setLoadingP(false);
    }
  };

  return (
    <div style={{ background: C.bg2, border: `0.5px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '11px 14px 5px' }}>
        <div style={{ flex: 1, paddingRight: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#ddd' }}>{q.title}</div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
            {q.participantsCount || 0} participants
            {q.status === 'active' && <span> · active</span>}
            {q.status === 'draft' && <span> · draft</span>}
            {q.status === 'completed' && <span> · completed</span>}
          </div>
        </div>
        <StatusBadge status={q.status} />
      </div>

      <div style={{ display: 'flex', gap: 6, padding: '8px 14px', borderTop: `0.5px solid ${C.border}`, flexWrap: 'wrap' }}>
        <button onClick={onEdit} style={ghostBtnSt}>✎ Edit</button>

        {q.status === 'active' && (
          <button
            onClick={onFinish}
            style={{
              ...ghostBtnSt,
              color: C.green,
              background: 'rgba(74,222,128,0.08)',
              border: '0.5px solid rgba(74,222,128,0.25)',
            }}
          >
            Complete
          </button>
        )}

        {q.status === 'draft' && (
          <button onClick={onActivate} style={primaryBtnSmSt}>▶ Activate</button>
        )}

        <button onClick={toggleP} style={ghostBtnSt}>
          {showP ? 'Hide' : 'Participants'}
        </button>

        <button onClick={onRemove} style={dangerBtnSt}>✕</button>
      </div>

      {showP && (
        <div style={{ borderTop: `0.5px solid ${C.border}`, padding: '10px 14px' }}>
          {loadingP ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 12 }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #2a2a3a', borderTopColor: C.green, animation: 'spin 0.6s linear infinite' }} />
            </div>
          ) : !participants?.length ? (
            <p style={{ fontSize: 12, color: C.muted }}>No participants</p>
          ) : (
            <div>
              {participants.map(p => (
                <div
                  key={p.userId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '5px 0',
                    borderBottom: `0.5px solid ${C.border}`,
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: '#ccc' }}>
                    {p.firstName || p.username || 'Anonymous'}
                    {p.username && <span style={{ color: C.muted, marginLeft: 5 }}>@{p.username}</span>}
                  </span>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: C.green, fontWeight: 700 }}>{p.score} pts</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string; border: string }> = {
    active: { color: '#9d90f8', bg: 'rgba(123,110,246,0.15)', border: 'rgba(123,110,246,0.35)' },
    draft: { color: '#777', bg: 'rgba(100,100,120,0.2)', border: '#2a2a3a' },
    completed: { color: '#4ade80', bg: 'rgba(74,222,128,0.1)', border: 'rgba(74,222,128,0.25)' },
  };

  const s = map[status] || map.draft;

  return (
    <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 5, fontWeight: 700, color: s.color, background: s.bg, border: `0.5px solid ${s.border}`, whiteSpace: 'nowrap' }}>
      {status}
    </span>
  );
}

const newQuestBtnSt: React.CSSProperties = {
  background: '#05050c',
  color: '#fff',
  fontSize: 11,
  fontWeight: 800,
  padding: '8px 12px',
  borderRadius: 8,
  border: `0.5px solid ${C.border}`,
  cursor: 'pointer',
  fontFamily: 'IBM Plex Sans, sans-serif',
  whiteSpace: 'nowrap',
};

const primaryBtnSmSt: React.CSSProperties = {
  background: '#7B6EF6',
  color: '#fff',
  fontSize: 10,
  fontWeight: 700,
  padding: '6px 11px',
  borderRadius: 7,
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'IBM Plex Sans, sans-serif',
};

const ghostBtnSt: React.CSSProperties = {
  background: 'rgba(123,110,246,0.1)',
  color: '#9d90f8',
  fontSize: 10,
  fontWeight: 600,
  padding: '6px 11px',
  borderRadius: 7,
  border: '0.5px solid rgba(123,110,246,0.35)',
  cursor: 'pointer',
  fontFamily: 'IBM Plex Sans, sans-serif',
};

const dangerBtnSt: React.CSSProperties = {
  background: 'rgba(248,113,113,0.08)',
  color: '#f87171',
  fontSize: 10,
  fontWeight: 600,
  padding: '6px 10px',
  borderRadius: 7,
  border: '0.5px solid rgba(248,113,113,0.25)',
  cursor: 'pointer',
  fontFamily: 'IBM Plex Sans, sans-serif',
};
