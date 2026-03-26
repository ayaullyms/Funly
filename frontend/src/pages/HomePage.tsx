import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import type { Quest } from '../types';
import { fmtDate } from '../utils';
import { Badge, SpinnerPage, EmptyState, Input, Card } from '../components/ui';
import { useApp } from '../context/AppContext';
import { useQuestDetail } from '../context/QuestDetailContext';

const FILTERS = [
  { id: '',          label: 'All' },
  { id: 'active',    label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'draft',     label: 'Draft' },
];

export function HomePage() {
  const { navigate } = useApp();
  const { setQuestId, setDetailState } = useQuestDetail();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async (f: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.listQuests(f);
      setQuests(data.quests || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(filter); }, [filter]);

  const filtered = quests.filter(q =>
    !search ||
    q.title.toLowerCase().includes(search.toLowerCase()) ||
    (q.shortDescription || '').toLowerCase().includes(search.toLowerCase())
  );

  const openQuest = (id: string) => {
    setQuestId(id);
    setDetailState(null);
    navigate('detail');
  };

  return (
    <div className="flex flex-col gap-4 pb-2">
      {/* Search */}
      <Input
        placeholder="Search quests..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => { setFilter(f.id); }}
            className={`flex-shrink-0 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter === f.id
                ? 'bg-emerald-500 text-black'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <SpinnerPage />
      ) : error ? (
        <p className="text-red-400 text-sm text-center py-8">{error}</p>
      ) : filtered.length === 0 ? (
        <EmptyState text="No quests found" />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(q => (
            <QuestCard key={q.id} quest={q} onOpen={openQuest} />
          ))}
        </div>
      )}
    </div>
  );
}

function QuestCard({ quest: q, onOpen }: { quest: Quest; onOpen: (id: string) => void }) {
  return (
    <Card
      onClick={() => onOpen(q.id)}
      className={q.status === 'completed' ? 'opacity-70' : ''}
    >
      <div className="flex justify-between items-start gap-3 mb-2">
        <h3 className="font-bold text-[15px] text-zinc-100 leading-snug flex-1">{q.title}</h3>
        <Badge status={q.status} />
      </div>
      {q.shortDescription && (
        <p className="text-zinc-400 text-[13px] mb-3 line-clamp-2">{q.shortDescription}</p>
      )}
      <div className="flex items-center gap-3 text-[12px] text-zinc-500 flex-wrap">
        {q.rewardDescription && (
          <span className="text-amber-400 font-semibold">{q.rewardDescription}</span>
        )}
        <span>{q.participantsCount || 0} participants</span>
        {q.endDate && <span>Ends {fmtDate(q.endDate)}</span>}
        {q.isJoined && <span className="text-emerald-400 font-bold">Joined</span>}
      </div>
    </Card>
  );
}
