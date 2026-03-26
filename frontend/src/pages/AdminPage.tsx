import React, { useEffect, useState } from 'react';
import { api } from '../api';
import type { Quest, AdminStats, Participant } from '../types';
import { Badge, SpinnerPage, EmptyState, Button, StatCard, Card } from '../components/ui';
import { useApp } from '../context/AppContext';

interface AdminPageProps {
  onOpenEditor: (id: string | null) => void;
}

export function AdminPage({ onOpenEditor }: AdminPageProps) {
  const { showToast } = useApp();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
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

  useEffect(() => { load(); }, []);

  const activateQuest = async (id: string) => {
    if (!confirm('Activate this quest?')) return;
    try { await api.updateQuest(id, { status: 'active' }); showToast('Quest activated'); load(); }
    catch (e: any) { showToast(e.message, 'error'); }
  };

  const finishQuest = async (id: string) => {
    if (!confirm('Complete quest and pick top 3 winners?')) return;
    try { await api.completeQuest(id, { winnersCount: 3 }); showToast('Quest completed'); load(); }
    catch (e: any) { showToast(e.message, 'error'); }
  };

  const removeQuest = async (id: string) => {
    if (!confirm('Delete this quest?')) return;
    try { await api.deleteQuest(id); showToast('Quest deleted'); load(); }
    catch (e: any) { showToast(e.message, 'error'); }
  };

  if (loading) return <SpinnerPage />;
  if (error) return <p className="text-red-400 text-sm py-8 text-center">{error}</p>;

  return (
    <div className="flex flex-col gap-5 pb-2">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-2.5">
          <StatCard value={stats.totalUsers} label="Total Users" color="text-emerald-400" />
          <StatCard value={stats.submissions?.total || 0} label="Submissions" color="text-zinc-100" />
        </div>
      )}

      {/* New quest button */}
      <Button variant="primary" className="w-full" onClick={() => onOpenEditor(null)}>
        New Quest
      </Button>

      {/* Quest list */}
      {quests.length === 0 ? (
        <EmptyState text="No quests yet" />
      ) : (
        <div className="flex flex-col gap-3">
          {quests.map(q => (
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

interface AdminQuestRowProps {
  quest: Quest;
  onEdit: () => void;
  onActivate: () => void;
  onFinish: () => void;
  onRemove: () => void;
}

function AdminQuestRow({ quest: q, onEdit, onActivate, onFinish, onRemove }: AdminQuestRowProps) {
  const [participants, setParticipants] = useState<Participant[] | null>(null);
  const [loadingP, setLoadingP] = useState(false);
  const [showP, setShowP] = useState(false);

  const toggleParticipants = async () => {
    if (showP) { setShowP(false); return; }
    setShowP(true);
    if (participants !== null) return;
    setLoadingP(true);
    try {
      const data = await api.getParticipants(q.id);
      setParticipants(data.participants || []);
    } catch (e: any) {
      setParticipants([]);
    } finally {
      setLoadingP(false);
    }
  };

  return (
    <Card>
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 pr-3">
          <div className="font-bold text-[15px] text-zinc-100">{q.title}</div>
          <div className="text-zinc-500 text-[12px] mt-0.5">{q.participantsCount || 0} participants</div>
        </div>
        <Badge status={q.status} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="ghost" onClick={onEdit}>Edit</Button>
        {q.status === 'active' && (
          <Button size="sm" variant="green" onClick={onFinish}>Complete</Button>
        )}
        {q.status === 'draft' && (
          <Button size="sm" variant="ghost" onClick={onActivate}>Activate</Button>
        )}
        <Button size="sm" variant="ghost" onClick={toggleParticipants}>
          {showP ? 'Hide' : 'Participants'}
        </Button>
        <Button size="sm" variant="danger" onClick={onRemove}>Delete</Button>
      </div>

      {showP && (
        <div className="mt-3 pt-3 border-t border-zinc-800">
          {loadingP ? (
            <div className="flex justify-center py-3">
              <div className="w-4 h-4 border-2 border-zinc-600 border-t-emerald-400 rounded-full animate-spin" />
            </div>
          ) : !participants?.length ? (
            <p className="text-zinc-500 text-[13px]">No participants</p>
          ) : (
            <div className="flex flex-col divide-y divide-zinc-800">
              {participants.map(p => (
                <div key={p.userId} className="flex justify-between py-2 text-[13px]">
                  <span className="text-zinc-300">
                    {p.firstName || p.username || 'Anonymous'}
                    {p.username && <span className="text-zinc-500 ml-1">@{p.username}</span>}
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">{p.score} pts</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
