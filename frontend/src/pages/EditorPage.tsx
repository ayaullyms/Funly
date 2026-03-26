import React, { useEffect, useState } from 'react';
import { api } from '../api';
import type { EditorTask, TaskType } from '../types';
import {
  BackButton, Button, Input, Textarea, Select, Card, SectionLabel,
} from '../components/ui';
import { useApp } from '../context/AppContext';

interface EditorPageProps {
  questId: string | null;
  onBack: () => void;
}

const EMPTY_TASK = (): EditorTask => ({
  id: null,
  title: '',
  description: '',
  taskType: 'multiple_choice',
  correctAnswer: '',
  options: ['', '', '', ''],
  points: 10,
  orderIndex: 0,
});

export function EditorPage({ questId: initialQuestId, onBack }: EditorPageProps) {
  const { showToast } = useApp();
  const [questId, setQuestId] = useState<string | null>(initialQuestId);
  const [loading, setLoading] = useState(!!initialQuestId);

  // Quest form
  const [title, setTitle] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [fullDesc, setFullDesc] = useState('');
  const [reward, setReward] = useState('');
  const [rules, setRules] = useState('');
  const [status, setStatus] = useState<string>('draft');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);

  const [tasks, setTasks] = useState<EditorTask[]>([]);

  useEffect(() => {
    if (!initialQuestId) { setLoading(false); return; }
    api.getQuest(initialQuestId)
      .then(({ quest: q, tasks: t }) => {
        setTitle(q.title || '');
        setShortDesc(q.shortDescription || '');
        setFullDesc(q.fullDescription || '');
        setReward(q.rewardDescription || '');
        setRules(q.rules || '');
        setStatus(q.status || 'draft');
        if (q.startDate) setStartDate(q.startDate.slice(0, 10));
        if (q.endDate) setEndDate(q.endDate.slice(0, 10));
        setTasks(t.map(tt => ({
          id: tt.id,
          title: tt.title,
          description: tt.description || '',
          taskType: tt.taskType,
          correctAnswer: tt.correctAnswer || '',
          options: Array.isArray(tt.options) ? tt.options : ['', '', '', ''],
          points: tt.points,
          orderIndex: tt.orderIndex,
        })));
      })
      .catch(e => showToast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, [initialQuestId]);

  const saveQuestInfo = async () => {
    if (!title.trim()) { showToast('Title is required', 'error'); return; }
    setSavingInfo(true);
    try {
      const body = { title, shortDescription: shortDesc, fullDescription: fullDesc, rewardDescription: reward, rules, startDate: startDate || undefined, endDate: endDate || undefined, status: status as any };
      if (questId) {
        await api.updateQuest(questId, body);
        showToast('Quest updated');
      } else {
        const data = await api.createQuest(body);
        setQuestId(data.quest.id);
        showToast('Quest created!');
      }
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSavingInfo(false); }
  };

  const addTask = () => {
    setTasks(prev => [...prev, { ...EMPTY_TASK(), orderIndex: prev.length }]);
    setTimeout(() => {
      document.getElementById(`task-editor-${tasks.length}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const updateTask = (i: number, patch: Partial<EditorTask>) => {
    setTasks(prev => prev.map((t, idx) => idx === i ? { ...t, ...patch } : t));
  };

  const removeTask = (i: number) => {
    if (tasks[i].id && !confirm('Delete this task?')) return;
    setTasks(prev => prev.filter((_, idx) => idx !== i));
  };

  const saveTask = async (i: number) => {
    if (!questId) { showToast('Save quest info first', 'error'); return; }
    const t = tasks[i];
    if (!t.title.trim()) { showToast('Question is required', 'error'); return; }

    const body = {
      title: t.title,
      description: t.description,
      taskType: t.taskType,
      correctAnswer: t.correctAnswer,
      options: t.taskType === 'multiple_choice' ? t.options.filter(o => o.trim()) : [],
      points: t.points,
      orderIndex: i,
    };

    try {
      if (t.id) {
        await api.updateTask(t.id, body);
        showToast('Task updated');
      } else {
        const data = await api.createTask(questId, body);
        updateTask(i, { id: data.task.id });
        showToast('Task added');
      }
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  const completeQuest = async () => {
    if (!questId || !confirm('Complete quest and pick top 3 winners?')) return;
    try { await api.completeQuest(questId, { winnersCount: 3 }); showToast('Quest completed!'); onBack(); }
    catch (e: any) { showToast(e.message, 'error'); }
  };

  const deleteQuest = async () => {
    if (!questId || !confirm('Delete this quest? Cannot be undone.')) return;
    try { await api.deleteQuest(questId); showToast('Quest deleted'); onBack(); }
    catch (e: any) { showToast(e.message, 'error'); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-zinc-600 border-t-emerald-400 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div className="flex items-center gap-3">
        <BackButton onClick={onBack} label="Admin" />
        <h1 className="font-black text-[18px] text-zinc-100">
          {questId ? 'Edit Quest' : 'New Quest'}
        </h1>
      </div>

      {/* Quest Info */}
      <Card>
        <SectionLabel>Quest Info</SectionLabel>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wide text-zinc-500 mb-1.5 block">Title *</label>
            <Input placeholder="Quest title" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wide text-zinc-500 mb-1.5 block">Short Description</label>
            <Input placeholder="Brief summary" value={shortDesc} onChange={e => setShortDesc(e.target.value)} />
          </div>
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wide text-zinc-500 mb-1.5 block">Full Description</label>
            <Textarea placeholder="Full description..." value={fullDesc} onChange={e => setFullDesc(e.target.value)} rows={3} />
          </div>
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wide text-zinc-500 mb-1.5 block">Reward</label>
            <Input placeholder="e.g. 100 TON" value={reward} onChange={e => setReward(e.target.value)} />
          </div>
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wide text-zinc-500 mb-1.5 block">Rules</label>
            <Textarea placeholder="Quest rules..." value={rules} onChange={e => setRules(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-mono uppercase tracking-wide text-zinc-500 mb-1.5 block">Start Date</label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] font-mono uppercase tracking-wide text-zinc-500 mb-1.5 block">End Date</label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wide text-zinc-500 mb-1.5 block">Status</label>
            <Select value={status} onChange={e => setStatus(e.target.value)}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </Select>
          </div>
          <Button variant="primary" onClick={saveQuestInfo} disabled={savingInfo}>
            {savingInfo ? 'Saving...' : 'Save Quest Info'}
          </Button>
        </div>
      </Card>

      {/* Tasks */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionLabel>Tasks</SectionLabel>
          <Button size="sm" variant="ghost" onClick={addTask}>+ Add Task</Button>
        </div>

        {tasks.length === 0 ? (
          <p className="text-zinc-500 text-sm text-center py-6">No tasks yet — click "+ Add Task"</p>
        ) : (
          <div className="flex flex-col gap-4">
            {tasks.map((t, i) => (
              <TaskEditorItem
                key={i}
                task={t}
                index={i}
                onChange={patch => updateTask(i, patch)}
                onRemove={() => removeTask(i)}
                onSave={() => saveTask(i)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Danger zone */}
      {questId && (
        <Card className="border-red-500/20">
          <SectionLabel>Danger Zone</SectionLabel>
          <div className="flex flex-col gap-2">
            <Button variant="green" className="w-full" onClick={completeQuest}>
              Complete Quest (pick top 3)
            </Button>
            <Button variant="danger" className="w-full" onClick={deleteQuest}>
              Delete Quest
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Task Editor Item ──────────────────────────
interface TaskEditorItemProps {
  task: EditorTask;
  index: number;
  onChange: (patch: Partial<EditorTask>) => void;
  onRemove: () => void;
  onSave: () => void;
}

function TaskEditorItem({ task: t, index: i, onChange, onRemove, onSave }: TaskEditorItemProps) {
  const isMulti = t.taskType === 'multiple_choice';
  const opts = t.options?.length ? t.options : ['', '', '', ''];

  const changeType = (type: TaskType) => {
    onChange({ taskType: type, options: type === 'multiple_choice' ? (t.options?.length ? t.options : ['', '', '', '']) : t.options });
  };

  return (
    <Card id={`task-editor-${i}`}>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-zinc-700 flex items-center justify-center text-[12px] font-bold text-zinc-300">
            {i + 1}
          </div>
          <span className="font-bold text-sm text-zinc-200">Task {i + 1}</span>
        </div>
        <Button size="sm" variant="danger" onClick={onRemove}>Remove</Button>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <label className="text-[11px] font-mono uppercase tracking-wide text-zinc-500 mb-1.5 block">Question *</label>
          <Input placeholder="Task question" value={t.title} onChange={e => onChange({ title: e.target.value })} />
        </div>
        <div>
          <label className="text-[11px] font-mono uppercase tracking-wide text-zinc-500 mb-1.5 block">Description (optional)</label>
          <Input placeholder="Hint or extra context" value={t.description} onChange={e => onChange({ description: e.target.value })} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wide text-zinc-500 mb-1.5 block">Type</label>
            <Select value={t.taskType} onChange={e => changeType(e.target.value as TaskType)}>
              <option value="multiple_choice">Multiple choice</option>
              <option value="quiz">Quiz (word/phrase)</option>
              <option value="text">Text (exact answer)</option>
            </Select>
          </div>
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wide text-zinc-500 mb-1.5 block">Points</label>
            <Input
              type="number"
              value={t.points}
              min={1}
              onChange={e => onChange({ points: parseInt(e.target.value) || 10 })}
            />
          </div>
        </div>

        {isMulti ? (
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wide text-zinc-500 mb-1.5 block">
              Options — select correct answer
            </label>
            {opts.map((o, oi) => (
              <div key={oi} className="flex items-center gap-2 mb-2">
                <input
                  type="radio"
                  name={`correct-${i}`}
                  checked={t.correctAnswer === o && !!o}
                  onChange={() => onChange({ correctAnswer: opts[oi] || '' })}
                  className="accent-emerald-400 w-4 h-4 flex-shrink-0"
                />
                <Input
                  placeholder={`Option ${oi + 1}`}
                  value={o}
                  onChange={e => {
                    const newOpts = [...opts];
                    newOpts[oi] = e.target.value;
                    onChange({ options: newOpts });
                  }}
                />
              </div>
            ))}
            <p className="text-[11px] text-zinc-500 mt-1">Radio button marks the correct answer</p>
          </div>
        ) : (
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wide text-zinc-500 mb-1.5 block">Correct Answer *</label>
            <Input
              placeholder="Exact correct answer (not case-sensitive)"
              value={t.correctAnswer}
              onChange={e => onChange({ correctAnswer: e.target.value })}
            />
            <p className="text-[11px] text-zinc-500 mt-1">User types — compared automatically</p>
          </div>
        )}

        <Button variant="primary" onClick={onSave}>
          {t.id ? 'Update Task' : 'Add Task'}
        </Button>
      </div>
    </Card>
  );
}
