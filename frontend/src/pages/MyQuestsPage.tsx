import React, { useEffect, useState } from 'react';
import { api } from '../api';
import type { Quest } from '../types';
import { timeAgo } from '../utils';
import { Badge, SpinnerPage, EmptyState, Button, Card } from '../components/ui';
import { useApp } from '../context/AppContext';
import { useQuestDetail } from '../context/QuestDetailContext';

const FILTERS = [
  { id: 'all',       label: 'All' },
  { id: 'active',    label: 'Active' },
  { id: 'completed', label: 'Completed' },
];

export function MyQuestsPage() {
  const { navigate } = useApp();
  const { setQuestId, setDetailState } = useQuestDetail();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.getMyQuests()
      .then(d => setQuests(d.quests || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = quests.filter(q =>
    filter === 'all' ? true : q.status === filter
  );

  const openQuest = (id: string) => {
    setQuestId(id);
    setDetailState(null);
    navigate('detail');
  };

  if (loading) return <SpinnerPage />;
  if (error) return <p className="text-red-400 text-sm text-center py-8">{error}</p>;

  return (
    <div className="flex flex-col gap-4 pb-2">
      {/* Filter tabs */}
      <div className="flex gap-2">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
              filter === f.id
                ? 'bg-emerald-500 text-black'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          text="No quests yet"
          action={
            <Button onClick={() => navigate('home')} className="mt-2">
              Browse Quests
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(q => (
            <MyQuestCard key={q.id} quest={q} onOpen={openQuest} />
          ))}
        </div>
      )}
    </div>
  );
}

function MyQuestCard({ quest: q, onOpen }: { quest: Quest; onOpen: (id: string) => void }) {
  return (
    <Card onClick={() => onOpen(q.id)}>
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-bold text-[15px] text-zinc-100 flex-1 pr-3">{q.title}</h3>
        <div className="flex flex-col items-end gap-1.5">
          <Badge status={q.status} />
          {q.iWon && <Badge status="winner" />}
        </div>
      </div>
      <div className="flex items-center gap-5">
        <div className="text-center">
          <div className="font-mono text-xl font-black text-emerald-400">{(q as any).score ?? q.myScore ?? 0}</div>
          <div className="text-[10px] font-mono uppercase tracking-wide text-zinc-500">Score</div>
        </div>
        <div className="text-center">
          <div className="font-mono text-xl font-black text-zinc-100">{((q as any).rank ?? q.myRank) ? '#' + ((q as any).rank ?? q.myRank) : '—'}</div>
          <div className="text-[10px] font-mono uppercase tracking-wide text-zinc-500">Rank</div>
        </div>
        <div className="ml-auto text-[12px] text-zinc-500">
          {timeAgo((q as any).joinedAt)}
        </div>
      </div>
    </Card>
  );
}
