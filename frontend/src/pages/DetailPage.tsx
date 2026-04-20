// pages/DetailPage.tsx

import React, { useEffect, useState } from 'react';
import { api } from '../api';
import type { Quest, Task, LeaderboardData } from '../types';
import { fmtDate } from '../utils';
import { SpinnerPage } from '../components/ui';
import { useApp } from '../context/AppContext';
import { useQuestDetail } from '../context/QuestDetailContext';

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
  const { questId, detailState, setDetailState } = useQuestDetail();
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [tab, setTab]         = useState('Info');

  useEffect(() => {
    if (!questId) return;
    if (detailState) { setLoading(false); return; }
    setLoading(true);
    Promise.all([api.getQuest(questId), api.getLeaderboard(questId)])
      .then(([qd, lb]) => {
        setDetailState({
          questData: qd,
          lbData: {
            leaderboard: lb.leaderboard,
            myPosition: lb.myPosition,
            totalParticipants: lb.totalParticipants,
          },
        });
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [questId]);

  const joinQuest = async () => {
    if (!questId) return;
    try {
      await api.joinQuest(questId);
      showToast('Joined!');
      const [qd, lb] = await Promise.all([api.getQuest(questId), api.getLeaderboard(questId)]);
      setDetailState({ questData: qd, lbData: { leaderboard: lb.leaderboard, myPosition: lb.myPosition, totalParticipants: lb.totalParticipants } });
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  if (loading) return <SpinnerPage />;
  if (error || !detailState) return <p className="text-red-400 text-sm py-8 text-center">{error || 'Failed to load'}</p>;

  const { questData: { quest: q, tasks }, lbData } = detailState;

  return (
    <div className="flex flex-col gap-4 pb-2">
      {/* Hero */}
      <div className="bg-white border border-purple-800 rounded-2xl p-4 mb-4">
        <BackButton onClick={() => navigate('home')} label="Back" />

        <div className="flex justify-between items-start gap-3 mt-3 mb-2">
          <h1 className="font-black text-[20px] text-purple-800 leading-tight flex-1">{q.title}</h1>
          <Badge status={q.status} />
        </div>

        {q.rewardDescription && (
          <div className="text-amber-400 font-bold font-mono text-[13px] mb-3">{q.rewardDescription}</div>
        )}

        <div className="flex gap-4 text-[12px] text-zinc-500 mb-4 flex-wrap">
          <span>{q.participantsCount || 0} participants</span>
          {q.endDate && <span>Ends {fmtDate(q.endDate)}</span>}
        </div>

        {/* My score bar */}
        {q.isJoined && (
          <div className="flex gap-4 bg-purple-100 border border-purple-800 rounded-xl p-3 mb-4">
            <ScoreItem value={q.myScore || 0} label="Score" />
            <ScoreItem value={q.myRank ? '#' + q.myRank : '—'} label="Rank" />
            <ScoreItem
              value={`${q.myCompletedTasks || 0}/${q.totalTasks || 0}`}
              label="Tasks"
              color={q.isQuestCompleted ? 'text-emerald-400' : undefined}
            />
            {q.iWon && <div className="flex items-center text-amber-400 font-bold text-sm ml-auto">Winner</div>}
          </div>
        )}

        {q.isQuestCompleted && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-emerald-400 font-bold text-sm text-center mb-4">
            You completed this quest!
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
      <div className="flex flex-col gap-3">
        {activeTab === 'overview' && <OverviewTab quest={q} />}
        {activeTab === 'tasks' && <TasksTab tasks={tasks} quest={q} onOpenTask={onOpenTask} />}
        {activeTab === 'leaderboard' && <LeaderboardTab lbData={lbData} />}
        {activeTab === 'rules' && <RulesTab quest={q} />}
      </div>
    </div>
  );
}

function ScoreItem({ value, label, color }: { value: React.ReactNode; label: string; color?: string }) {
  return (
    <div className="text-center">
      <div className={`font-mono text-lg font-black ${color || 'text-purple-800'}`}>{value}</div>
      <div className="text-[10px] font-mono uppercase tracking-wide text-purple-800">{label}</div>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────
function OverviewTab({ quest: q }: { quest: Quest }) {
  return (
    <div className="flex flex-col gap-3">
      {q.fullDescription && (
        <p style={{ fontSize: 13, color: '#888', lineHeight: 1.7 }}>{q.fullDescription}</p>
      )}
      {(q.startDate || q.endDate) && (
        <div className="grid grid-cols-2 gap-2.5">
          {q.startDate && (
            <Card className="p-3.5">
              <div className="text-[10px] font-mono uppercase tracking-wide text-zinc-500 mb-1">Start</div>
              <div className="font-bold text-purple-800">{fmtDate(q.startDate)}</div>
            </Card>
          )}
          {q.endDate && (
            <Card className="p-3.5">
              <div className="text-[10px] font-mono uppercase tracking-wide text-zinc-500 mb-1">End</div>
              <div className="font-bold text-purple-800">{fmtDate(q.endDate)}</div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tasks Tab ─────────────────────────────────
function TasksTab({ tasks, quest: q, onOpenTask }: { tasks: Task[]; quest: Quest; onOpenTask: (id: string, idx: number) => void }) {
  if (!q.isJoined && q.status === 'active') {
    return (
      <div className="flex flex-col items-center py-12 gap-2 text-zinc-500">
        <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-lg mb-2">
          <span className="text-zinc-600">L</span>
        </div>
        <p className="text-sm">Join the quest to unlock tasks</p>
      </div>
    );
  }
  if (!tasks.length) return <p className="text-zinc-500 text-sm py-8 text-center">No tasks yet</p>;

  const done = tasks.filter(t => t.myAnswer != null).length;
  const total = tasks.length;

  return (
    <div className="flex flex-col gap-3">
      {q.isJoined && (
        <div>
          <div className="flex justify-between text-[12px] text-zinc-500 mb-2">
            <span>Progress</span>
            <span className={`font-mono font-bold ${done === total && total > 0 ? 'text-emerald-400' : 'text-zinc-100'}`}>
              {done} / {total} done
            </span>
          </div>
          <ProgressBar value={done} max={total} />
        </div>
      )}

      {tasks.map((t, i) => (
        <TaskListItem
          key={t.id}
          task={t}
          index={i}
          quest={q}
          onOpen={() => (t.myAnswer != null || (q.isJoined && q.status === 'active')) && onOpenTask(t.id, i)}
        />
      ))}
    </div>
  );
}

function TaskListItem({ task: t, index: i, quest: q, onOpen }: { task: Task; index: number; quest: Quest; onOpen: () => void }) {
  const submitted = t.myAnswer != null;
  const canInteract = submitted || (q.isJoined && q.status === 'active' && !submitted);

  let statusClass = 'bg-zinc-700 text-zinc-400';
  let statusText: React.ReactNode = String(i + 1);
  if (submitted) {
    statusClass = t.myAnswerCorrect ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30';
    statusText = t.myAnswerCorrect ? '✓' : '✗';
  }

  return (
    <div
      className={`flex items-center gap-3 bg-white border-purple-800 rounded-2xl p-4 transition-all duration-150 ${
        canInteract ? 'cursor-pointer hover:border-zinc-600 active:scale-[0.99] border-zinc-800' : 'border-zinc-800'
      } ${submitted ? 'opacity-80' : ''}`}
      onClick={onOpen}
    >
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${statusClass}`}>
        {statusText}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-[14px] text-purple-800">{t.title}</div>
        {t.description && (
          <div className="text-zinc-500 text-[12px] mt-0.5 truncate">{t.description}</div>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
        <span className="font-mono text-emerald-400 text-[13px] font-bold">+{t.points}pts</span>
        {submitted && (
          <span className={`text-[11px] ${t.myAnswerCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
            {t.myAnswerCorrect ? `+${t.myPoints} pts` : '0 pts'}
          </span>
        )}
        {!submitted && q.status === 'active' && q.isJoined && (
          <span className="text-[11px] text-zinc-500">Tap</span>
        )}
      </div>
    </div>
  );
}

/* ── Leaderboard Tab ── */
function BoardTab({ lbData }: { lbData: LeaderboardData }) {
  const { leaderboard: lb, myPosition, totalParticipants } = lbData;
  if (!lb.length) return <p className="text-zinc-500 text-sm py-8 text-center">No participants yet</p>;

  return (
    <div className="flex flex-col gap-2">
      {myPosition && (
        <div className="bg-white border border-purple-800 rounded-2xl p-4 mb-1">
          <div className="flex justify-between items-center mb-1">
            <span className="font-bold text-purple-800">Your position</span>
            <span className="text-purple-400 font-mono text-xl font-black">#{myPosition.rank}</span>
          </div>
          <div className="flex justify-between text-[12px] text-zinc-500">
            <span>out of {totalParticipants} participants</span>
            <span className="font-mono font-bold text-purple-400">{myPosition.score} pts</span>
          </div>
          {!myPosition.inTop50 && (
            <p className="text-[11px] text-purple-800 mt-2">Not in top 50 yet — answer more tasks to climb up</p>
          )}
        </div>
      )}

      <div className="flex flex-col divide-y divide-zinc-800 bg-white border border-purple-800 rounded-2xl overflow-hidden">
        {lb.map((e, i) => {
          const r = i + 1;
          const medal = r === 1 ? '01' : r === 2 ? '02' : r === 3 ? '03' : null;
          return (
            <div
              key={e.userId}
              className={`flex items-center gap-3 px-4 py-3 ${e.isMe ? 'bg-purple-500/5' : ''}`}
            >
              <div className={`w-8 text-center font-mono font-black text-[13px] ${
                r <= 3 ? 'text-amber-400' : 'text-zinc-500'
              }`}>
                {medal ? `#${medal}` : `#${r}`}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[14px] font-semibold text-purple-800 truncate">
                  {e.firstName || e.username || 'Anonymous'}
                </span>
                {e.username && <span className="text-zinc-500 text-[12px] ml-1">@{e.username}</span>}
                {e.isMe && <span className="text-[11px] text-emerald-400 font-bold ml-1.5">you</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[13px] font-bold text-purple-800">{e.score}</span>
                <span className="text-[10px] text-zinc-500">pts</span>
                {e.isWinner && <span className="text-amber-400 text-[12px]">W</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Rules Tab ── */
function RulesTab({ quest: q }: { quest: Quest }) {
  if (!q.rules) return <p className="text-zinc-500 text-sm py-8 text-center">No rules</p>;
  return <p className="text-zinc-300 text-[15px] leading-relaxed whitespace-pre-wrap">{q.rules}</p>;
}
