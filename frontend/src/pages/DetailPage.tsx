import React, { useEffect, useState } from 'react';
import { api } from '../api';
import type { Quest, Task, LeaderboardData , User} from '../types';
import { fmtDate } from '../utils';
import { SpinnerPage } from '../components/ui';
import { useApp } from '../context/AppContext';
import { useQuestDetail, type QuestDetailState } from '../context/QuestDetailContext';

const C = {
  bg:     '#0D0D14',
  bg2:    '#13131f',
  border: '#1e1e32',
  purple: '#7B6EF6',
  purpleL:'#9d90f8',
  purpleD:'rgba(123,110,246,0.15)',
  purpleB:'rgba(123,110,246,0.35)',
  muted:  '#44445a',
  sec:    '#888',
  text:   '#e8e0ff',
  green:  '#4ade80',
  red:    '#f87171',
  amber:  '#fbbf24',
  ton:    '#0098EA',
};

interface Props { onOpenTask: (taskId: string, index: number) => void; }

const TABS = ['Info', 'Tasks', 'Board', 'Rules'];

export function DetailPage({ onOpenTask }: Props) {
  const { navigate, showToast } = useApp();

  const goBack = () => {
    const returnPage = sessionStorage.getItem('questReturnPage');
    navigate(returnPage === 'myquests' ? 'myquests' : 'home');
  };
  const { questId, detailState, setDetailState } = useQuestDetail();
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [tab, setTab]         = useState('Info');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showWalletWarning, setShowWalletWarning] = useState(false);

  useEffect(() => {
    if (!questId) return;
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [me, qd, lb] = await Promise.all([
          api.getMe(),
          detailState ? Promise.resolve(null) : api.getQuest(questId),
          detailState ? Promise.resolve(null) : api.getLeaderboard(questId),
        ]);
        setCurrentUser(me.user);
        if (qd && lb) {
          setDetailState({ questData: qd, lbData: lb });
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [questId]);

  useEffect(() => {
    if (tab !== 'Board' || !questId) return;
    api.getLeaderboard(questId).then(lb => {
      if (detailState) {
        setDetailState({ ...detailState, lbData: lb });
      }
    }).catch(() => {});
  }, [tab, questId, detailState, setDetailState]);

  const joinQuest = async () => {
    if (!questId) return;
    if (!currentUser?.walletAddress) {
      setShowWalletWarning(true);
      return;
    }
    try {
      await api.joinQuest(questId);
      showToast('Joined!');
      const [qd, lb] = await Promise.all([api.getQuest(questId), api.getLeaderboard(questId)]);
      setDetailState({ questData: qd, lbData: lb });
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  if (loading) return <SpinnerPage />;
  if (error || !detailState) return <p style={{ color: C.red, textAlign: 'center', padding: '2rem 0', fontSize: 13 }}>{error || 'Failed to load'}</p>;

  const { questData: { quest: q, tasks }, lbData } = detailState;

  const correctCount = tasks.filter(t => t.myAnswerCorrect).length;

  return (
    <div className="flex flex-col gap-4 pb-2">

      {showWalletWarning && (
        <WalletWarningModal
          onGoToProfile={() => {
            setShowWalletWarning(false);
            navigate('profile');
          }}
          onClose={() => setShowWalletWarning(false)}
        />
      )}
      {/* Hero */}
      <div style={{
        background: `linear-gradient(155deg, #1a1560 0%, ${C.bg} 75%)`,
        borderRadius: 18, overflow: 'hidden',
        border: `0.5px solid ${C.border}`,
      }}>
        <div style={{ padding: '12px 14px 0' }}>
          {/* back */}
          <button onClick={goBack} style={backBtnStyle}>← Back</button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', margin: '10px 0 4px' }}>
            <h1 style={{ fontWeight: 800, fontSize: 18, color: '#fff', lineHeight: 1.3, flex: 1, paddingRight: 8 }}>{q.title}</h1>
            <StatusBadge status={q.status} />
          </div>

          {q.rewardAmountPerWinner && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#a8a0ff', fontWeight: 600, marginBottom: 10 }}>
              <TonIcon /> {q.rewardAmountPerWinner} TON · {q.participantsCount || 0} participants
            </div>
          )}

          {/* stats row */}
          {q.isJoined && (
            <div>
              {q.iWon && (
                <div style={{
                  margin: '10px 0',
                  background: 'rgba(251,191,36,0.1)',
                  border: '0.5px solid rgba(251,191,36,0.35)',
                  borderRadius: 12,
                  padding: '12px 14px',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: 'rgba(251,191,36,0.15)',
                    border: '0.5px solid rgba(251,191,36,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                    <path d="M4 22h16"/>
                    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
                    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
                  </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#fbbf24' }}>Congratulations! You won</div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                      You placed{' '}
                      <span style={{ color: '#fbbf24', fontWeight: 700 }}>#{q.myRank}</span>
                      {' '}among all participants
                    </div>
                  </div>
                </div>
              )}

              <div style={{
                display: 'flex', borderTop: `0.5px solid ${C.border}`,
                margin: '0 -14px',
              }}>
                {[
                  { v: q.myRank ? '#' + q.myRank : '—', l: 'Rank' },
                  { v: q.myScore || 0,                  l: 'Points' },
                  { v: `${correctCount}/${q.totalTasks || 0}`, l: 'Tasks' },
                ].map((s, i) => (
                  <div key={i} style={{
                    flex: 1, textAlign: 'center', padding: '10px 0',
                    borderRight: i < 2 ? `0.5px solid ${C.border}` : 'none',
                  }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C.purpleL, fontFamily: 'IBM Plex Mono, monospace' }}>{s.v}</div>
                    <div style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2, fontFamily: 'IBM Plex Mono, monospace' }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {q.status === 'active' && !q.isJoined && (
            <button onClick={joinQuest} style={primaryBtnStyle}>Join Quest</button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', margin: '10px 12px', background: C.bg2, border: `0.5px solid ${C.border}`, borderRadius: 10, padding: 2 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '6px 0', textAlign: 'center', fontSize: 10, fontWeight: 600,
              borderRadius: 8, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
              background: tab === t ? C.purple : 'transparent',
              color: tab === t ? '#fff' : C.sec,
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'Info'  && <InfoTab quest={q} />}
      {tab === 'Tasks' && <TasksTab tasks={tasks} quest={q} onOpenTask={onOpenTask} />}
      {tab === 'Board' && <BoardTab lbData={lbData} />}
      {tab === 'Rules' && <RulesTab quest={q} />}
    </div>
  );
}

interface WalletWarningModalProps {
  onGoToProfile: () => void;
  onClose: () => void;
}

function WalletWarningModal({
  onGoToProfile,
  onClose,
}: WalletWarningModalProps) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 999,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex',
        alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 24px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#13131f', border: '0.5px solid #2a2a3a', borderRadius: 20,
          padding: '20px 18px', width: '100%', maxWidth: 420, margin: '0 12px',
        }}
      >
        <div
          style={{
            width: 48, height: 48, borderRadius: 14,
            margin: '0 auto 14px', background: 'rgba(251,191,36,0.1)',
            border: '0.5px solid rgba(251,191,36,0.3)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: 22,
          }}
        >
          ⚠️
        </div>

        <h3
          style={{
            fontSize: 15, fontWeight: 800,
            color: '#fff', textAlign: 'center', marginBottom: 8,
          }}
        >
          Wallet not connected
        </h3>

        <p
          style={{
            fontSize: 12, color: '#888', lineHeight: 1.65,
            textAlign: 'center', marginBottom: 18,
          }}
        >
          Connect your TON wallet in profile to receive rewards.
        </p>

        <button
          onClick={onGoToProfile}
          style={{
            width: '100%', padding: '11px 14px',
            borderRadius: 10, background: '#0098EA',
            border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 700, color: '#fff',
          }}
        >
          Connect wallet in Profile
        </button>
      </div>
    </div>
  );
}

/* ── Info Tab ── */
function InfoTab({ quest: q }: { quest: Quest }) {
  return (
    <div className="flex flex-col gap-3">
      {q.fullDescription && (
        <p style={{ fontSize: 13, color: '#888', lineHeight: 1.7 }}>{q.fullDescription}</p>
      )}
      {(q.startDate || q.endDate) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {q.startDate && <InfoCell label="START" value={fmtDate(q.startDate)} />}
          {q.endDate   && <InfoCell label="END"   value={fmtDate(q.endDate)} />}
        </div>
      )}
      {q.rewardAmountPerWinner && (
        <div style={{ background: 'rgba(123,110,246,0.06)', border: '0.5px solid rgba(123,110,246,0.25)', borderRadius: 10, padding: '10px 13px' }}>
          <div style={{ fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, fontFamily: 'IBM Plex Mono, monospace' }}>Reward</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <TonIcon />
            <span style={{ fontSize: 15, fontWeight: 800, color: '#7B6EF6' }}>{q.rewardAmountPerWinner} TON</span>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#13131f', border: '0.5px solid #1e1e32', borderRadius: 9, padding: 10 }}>
      <div style={{ fontSize: 8, color: '#44445a', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3, fontFamily: 'IBM Plex Mono, monospace' }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#ccc' }}>{value}</div>
    </div>
  );
}

/* ── Tasks Tab ── */
function TasksTab({ tasks, quest: q, onOpenTask }: { tasks: Task[]; quest: Quest; onOpenTask: (id: string, i: number) => void }) {
  if (!q.isJoined && q.status === 'active') {
    return <p style={{ color: '#555', fontSize: 13, textAlign: 'center', padding: '2rem 0' }}>Join the quest to unlock tasks</p>;
  }
  if (!tasks.length) return <p style={{ color: '#555', fontSize: 13, textAlign: 'center', padding: '2rem 0' }}>No tasks yet</p>;

  return (
    <div style={{ background: '#13131f', border: '0.5px solid #1e1e32', borderRadius: 14, overflow: 'hidden' }}>
      {tasks.map((t, i) => {
        const submitted = t.myAnswer != null;
        let numBg = '#1a1a2a', numColor = '#44445a', numText: string = String(i + 1);
        if (submitted && t.myAnswerCorrect)  { numBg = 'rgba(74,222,128,0.15)'; numColor = '#4ade80'; numText = '✓'; }
        if (submitted && !t.myAnswerCorrect) { numBg = 'rgba(248,113,113,0.12)'; numColor = '#f87171'; numText = '✗'; }

        return (
          <div
            key={t.id}
            onClick={() => (q.isJoined && q.status === 'active') && onOpenTask(t.id, i)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              borderBottom: i < tasks.length - 1 ? '0.5px solid #1e1e32' : 'none',
              cursor: q.isJoined ? 'pointer' : 'default',
            }}
          >
            <div style={{
              width: 26, height: 26, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, flexShrink: 0,
              background: numBg, color: numColor,
              border: submitted ? `0.5px solid ${numColor}40` : '0.5px solid #2a2a3a',
            }}>{numText}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#ccc' }}>{t.title}</div>
            </div>
            <span style={{ fontSize: 11, color: '#7B6EF6', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>
              {submitted ? (t.myAnswerCorrect ? `+${t.myPoints}` : '0') : `+${t.points}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Leaderboard Tab ── */
function BoardTab({ lbData }: { lbData: LeaderboardData }) {
  const { leaderboard: lb, myPosition, totalParticipants } = lbData;
  if (!lb.length) return <p style={{ color: '#555', textAlign: 'center', padding: '2rem 0', fontSize: 13 }}>No participants yet</p>;

  return (
    <div className="flex flex-col gap-3">
      {myPosition && (
        <div style={{ background: 'rgba(123,110,246,0.1)', border: '0.5px solid rgba(123,110,246,0.35)', borderRadius: 12, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#c8c0ff' }}>Your position</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#7B6EF6', fontFamily: 'IBM Plex Mono, monospace' }}>#{myPosition.rank}</span>
        </div>
      )}
      <div style={{ background: '#13131f', border: '0.5px solid #1e1e32', borderRadius: 14, overflow: 'hidden' }}>
        {lb.map((e, i) => {
          const r = i + 1;
          const rankColor = r <= 3 ? '#fbbf24' : '#666';
          return (
            <div key={e.userId} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px',
              borderBottom: i < lb.length - 1 ? '0.5px solid #1e1e32' : 'none',
              background: e.isMe ? 'rgba(123,110,246,0.05)' : 'transparent',
            }}>
              <span style={{ width: 22, fontSize: 12, fontWeight: 700, color: rankColor, fontFamily: 'IBM Plex Mono, monospace' }}>#{r}</span>
              <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: e.isMe ? '#9d90f8' : '#ddd' }}>
                {e.firstName || e.username || 'Anonymous'}
                {e.isMe && <span style={{ fontSize: 9, color: '#7B6EF6', marginLeft: 5 }}>← you</span>}
              </span>
              <span style={{ fontSize: 11, color: '#7B6EF6', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>{e.score} pts</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Rules Tab ── */
function RulesTab({ quest: q }: { quest: Quest }) {
  if (!q.rules) return <p style={{ color: '#555', textAlign: 'center', padding: '2rem 0', fontSize: 13 }}>No rules</p>;
  return <p style={{ fontSize: 13, color: '#888', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{q.rules}</p>;
}

/* ── Shared atoms ── */
function TonIcon() {
  return (
    <span style={{
      width: 14, height: 14, background: '#0098EA', borderRadius: '50%',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 7, fontWeight: 700, color: '#fff', flexShrink: 0,
    }}>T</span>
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

const backBtnStyle: React.CSSProperties = {
  fontSize: 11, color: '#7B6EF6', background: 'none', border: 'none', cursor: 'pointer',
  padding: 0, fontFamily: 'IBM Plex Sans, sans-serif',
};

const primaryBtnStyle: React.CSSProperties = {
  width: '100%', background: '#7B6EF6', color: '#fff', fontSize: 13, fontWeight: 700,
  padding: '10px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
  margin: '10px 0', fontFamily: 'IBM Plex Sans, sans-serif',
};