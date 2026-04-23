import React, { useEffect, useState } from 'react';
import { api } from '../api';
import type { EditorTask, TaskType } from '../types';
import { useApp } from '../context/AppContext';

const C = {
  bg: '#0D0D14', bg2: '#13131f', border: '#1e1e32',
  purple: '#7B6EF6', purpleL: '#9d90f8',
  muted: '#44445a', sec: '#888',
  green: '#4ade80', red: '#f87171',
};

const EMPTY_TASK = (): EditorTask => ({
  id: null, title: '', description: '',
  taskType: 'multiple_choice', correctAnswer: '',
  options: ['', '', '', ''], points: 10, orderIndex: 0,
});

interface Props { questId: string | null; onBack: () => void; }

export function EditorPage({ questId: initialQuestId, onBack }: Props) {
  const { showToast } = useApp();
  const [questId, setQuestId] = useState<string | null>(initialQuestId);
  const [loading, setLoading] = useState(!!initialQuestId);
  const [step, setStep] = useState(0); // 0=info, 1=tasks, 2=review

  /* Quest form */
  const [title,     setTitle]     = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [fullDesc,  setFullDesc]  = useState('');
  const [reward,    setReward]    = useState('');
  const [rules,     setRules]     = useState('');
  const [status,    setStatus]    = useState('draft');
  const [startDate, setStartDate] = useState('');
  const [endDate,   setEndDate]   = useState('');
  const [saving,    setSaving]    = useState(false);
  const [tasks,     setTasks]     = useState<EditorTask[]>([]);

  useEffect(() => {
    if (!initialQuestId) { setLoading(false); return; }
    api.getQuest(initialQuestId)
      .then(({ quest: q, tasks: t }) => {
        setTitle(q.title || ''); setShortDesc(q.shortDescription || '');
        setFullDesc(q.fullDescription || ''); setReward(q.rewardDescription || '');
        setRules(q.rules || ''); setStatus(q.status || 'draft');
        if (q.startDate) setStartDate(q.startDate.slice(0, 10));
        if (q.endDate)   setEndDate(q.endDate.slice(0, 10));
        setTasks(t.map(tt => ({
          id: tt.id, title: tt.title, description: tt.description || '',
          taskType: tt.taskType, correctAnswer: tt.correctAnswer || '',
          options: Array.isArray(tt.options) ? tt.options : ['', '', '', ''],
          points: tt.points, orderIndex: tt.orderIndex,
        })));
      })
      .catch(e => showToast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, [initialQuestId]);

  const saveInfo = async () => {
    if (!title.trim()) { showToast('Title is required', 'error'); return; }
    setSaving(true);
    try {
      const body = { title, shortDescription: shortDesc, fullDescription: fullDesc, rewardDescription: reward, rules, startDate: startDate || undefined, endDate: endDate || undefined, status: status as any };
      if (questId) { await api.updateQuest(questId, body); showToast('Quest updated'); }
      else { const d = await api.createQuest(body); setQuestId(d.quest.id); showToast('Quest created!'); }
      setStep(1);
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const updateTask = (i: number, patch: Partial<EditorTask>) =>
    setTasks(prev => prev.map((t, idx) => idx === i ? { ...t, ...patch } : t));

  const removeTask = (i: number) => {
    if (tasks[i].id && !confirm('Delete task?')) return;
    setTasks(prev => prev.filter((_, idx) => idx !== i));
  };

  const saveTask = async (i: number) => {
    if (!questId) { showToast('Save quest info first', 'error'); return; }
    const t = tasks[i];
    if (!t.title.trim()) { showToast('Question is required', 'error'); return; }
    const body = {
      title: t.title, description: t.description, taskType: t.taskType,
      correctAnswer: t.correctAnswer,
      options: t.taskType === 'multiple_choice' ? t.options.filter(o => o.trim()) : [],
      points: t.points, orderIndex: i,
    };
    try {
      if (t.id) { await api.updateTask(t.id, body); showToast('Task updated'); }
      else { const d = await api.createTask(questId, body); updateTask(i, { id: d.task.id }); showToast('Task added'); }
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  const launch = async () => {
    if (!questId) return;
    try { await api.updateQuest(questId, { status: 'active' }); showToast('Quest launched!'); onBack(); }
    catch (e: any) { showToast(e.message, 'error'); }
  };

  const deleteQuest = async () => {
    if (!questId || !confirm('Delete this quest?')) return;
    try { await api.deleteQuest(questId); showToast('Quest deleted'); onBack(); }
    catch (e: any) { showToast(e.message, 'error'); }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem 0' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #2a2a3a', borderTopColor: C.green, animation: 'spin 0.6s linear infinite' }} />
    </div>
  );

  const stepLabels = ['Main Info', 'Questions', 'Review & Launch'];

  return (
    <div className="flex flex-col gap-5 pb-6">
      {/* Header with step progress */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: `0.5px solid ${C.border}` }}>
        <button onClick={step > 0 ? () => setStep(s => s - 1) : onBack} style={backBtnSt}>
          {step > 0 ? '← Back' : '← Admin'}
        </button>
        <div style={{ display: 'flex', gap: 5 }}>
          {stepLabels.map((_, i) => (
            <div key={i} style={{
              width: 22, height: 3, borderRadius: 2,
              background: i < step ? C.purple : i === step ? `${C.purple}66` : C.border,
            }} />
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 10, color: C.purpleL, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontFamily: 'IBM Plex Mono, monospace' }}>
          Step {step + 1} of {stepLabels.length}
        </div>
        <h1 style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{stepLabels[step]}</h1>
      </div>

      {/* ── Step 0: Quest Info ── */}
      {step === 0 && (
        <div style={{ background: C.bg2, border: `0.5px solid ${C.border}`, borderRadius: 14, padding: 14 }} className="flex flex-col gap-3">
          <Field label="Title *">
            <input placeholder="Quest title" value={title} onChange={e => setTitle(e.target.value)} style={inputSt} />
          </Field>
          <Field label="Short description">
            <input placeholder="Brief summary" value={shortDesc} onChange={e => setShortDesc(e.target.value)} style={inputSt} />
          </Field>
          <Field label="Full description">
            <textarea placeholder="Full description..." value={fullDesc} onChange={e => setFullDesc(e.target.value)} rows={3} style={{ ...inputSt, resize: 'vertical' }} />
          </Field>
          <Field label="Reward">
            <input placeholder="e.g. 50 TON for top 3" value={reward} onChange={e => setReward(e.target.value)} style={inputSt} />
          </Field>
          <Field label="Rules">
            <textarea placeholder="Quest rules..." value={rules} onChange={e => setRules(e.target.value)} rows={3} style={{ ...inputSt, resize: 'vertical' }} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Field label="Start date">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputSt} />
            </Field>
            <Field label="End date">
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputSt} />
            </Field>
          </div>
          <button onClick={saveInfo} disabled={saving} style={primaryBtnSt}>
            {saving ? 'Saving...' : 'Save & Continue →'}
          </button>
        </div>
      )}

      {/* ── Step 1: Tasks ── */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          {tasks.length === 0 ? (
            <p style={{ fontSize: 13, color: C.muted, textAlign: 'center', padding: '2rem 0' }}>No tasks yet — click "+ Add Question"</p>
          ) : (
            tasks.map((t, i) => (
              <TaskEditorItem key={i} task={t} index={i}
                onChange={patch => updateTask(i, patch)}
                onRemove={() => removeTask(i)}
                onSave={() => saveTask(i)}
              />
            ))
          )}
          <button onClick={() => setTasks(prev => [...prev, { ...EMPTY_TASK(), orderIndex: prev.length }])} style={addBtnSt}>
            + Add Question
          </button>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={() => setStep(0)} style={ghostBtnSt}>← Back</button>
            <button onClick={() => setStep(2)} style={{ ...primaryBtnSt, flex: 1 }}>Next → Review</button>
          </div>
        </div>
      )}

      {/* ── Step 2: Review & Launch ── */}
      {step === 2 && (
        <div className="flex flex-col gap-4">
          <div style={{ background: 'rgba(74,222,128,0.05)', border: '0.5px solid rgba(74,222,128,0.18)', borderRadius: 10, padding: '11px 14px' }}>
            {[
              { l: 'Title',      v: title || '—' },
              { l: 'Reward',     v: reward || '—' },
              { l: 'Questions',  v: `${tasks.length} added` },
              { l: 'Start date', v: startDate || '—' },
              { l: 'End date',   v: endDate || '—' },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: i < 4 ? 6 : 0 }}>
                <span style={{ fontSize: 10, color: C.muted }}>{r.l}</span>
                <span style={{ fontSize: 11, color: '#ccc', fontWeight: 600 }}>{r.v}</span>
              </div>
            ))}
          </div>

          <div style={{ background: 'rgba(123,110,246,0.06)', border: '0.5px solid rgba(123,110,246,0.2)', borderRadius: 9, padding: '10px 13px' }}>
            <div style={{ fontSize: 10, color: C.purpleL, fontWeight: 700, marginBottom: 6 }}>Status after launch</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <StatusBadge status="draft" />
              <span style={{ fontSize: 12, color: C.muted }}>→</span>
              <StatusBadge status="active" />
            </div>
            <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.5 }}>Quest becomes visible to all users immediately after launch</div>
          </div>

          <button onClick={launch} style={primaryBtnSt}>🚀 Launch Quest</button>
          <button onClick={() => { saveInfo(); }} style={ghostBtnSt}>Save as Draft</button>

          {questId && (
            <button onClick={deleteQuest} style={dangerBtnSt}>Delete Quest</button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Task editor item ── */
interface TaskEditorItemProps {
  task: EditorTask; index: number;
  onChange: (p: Partial<EditorTask>) => void;
  onRemove: () => void; onSave: () => void;
}

function TaskEditorItem({ task: t, index: i, onChange, onRemove, onSave }: TaskEditorItemProps) {
  const isMulti = t.taskType === 'multiple_choice';
  const opts = t.options?.length ? t.options : ['', '', '', ''];

  return (
    <div style={{ background: C.bg2, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, background: '#7B6EF6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>{i + 1}</div>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#9d90f8' }}>Question {i + 1}</span>
        </div>
        <button onClick={onRemove} style={dangerBtnSt}>Remove</button>
      </div>

      <div className="flex flex-col gap-3">
        <Field label="Question *">
          <input placeholder="Task question" value={t.title} onChange={e => onChange({ title: e.target.value })} style={inputSt} />
        </Field>
        <Field label="Description (optional)">
          <input placeholder="Hint or extra context" value={t.description} onChange={e => onChange({ description: e.target.value })} style={inputSt} />
        </Field>

        {/* Type selector pills */}
        <div>
          <div style={labelSt}>Type</div>
          <div style={{ display: 'flex', gap: 5 }}>
            {[['multiple_choice', 'Multiple choice'], ['quiz', 'Word/phrase'], ['text', 'Text']] .map(([val, label]) => (
              <button key={val} onClick={() => onChange({ taskType: val as TaskType })} style={{
                fontSize: 9, padding: '4px 9px', borderRadius: 5, cursor: 'pointer',
                background: t.taskType === val ? 'rgba(123,110,246,0.15)' : 'transparent',
                border: `0.5px solid ${t.taskType === val ? 'rgba(123,110,246,0.4)' : C.border}`,
                color: t.taskType === val ? '#9d90f8' : C.muted,
              }}>{label}</button>
            ))}
          </div>
        </div>

        <Field label="Points">
          <input type="number" value={t.points} min={1} onChange={e => onChange({ points: parseInt(e.target.value) || 10 })} style={{ ...inputSt, width: 80 }} />
        </Field>

        {isMulti ? (
          <div>
            <div style={labelSt}>Options — select correct answer (●)</div>
            {opts.map((o, oi) => (
              <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                <input
                  type="radio" name={`correct-${i}`}
                  checked={t.correctAnswer === o && !!o}
                  onChange={() => onChange({ correctAnswer: opts[oi] || '' })}
                  style={{ accentColor: '#4ade80', width: 14, height: 14, flexShrink: 0 }}
                />
                <input
                  placeholder={`Option ${oi + 1}`} value={o}
                  onChange={e => { const n = [...opts]; n[oi] = e.target.value; onChange({ options: n }); }}
                  style={{ ...inputSt, margin: 0 }}
                />
              </div>
            ))}
          </div>
        ) : (
          <Field label="Correct answer *">
            <input placeholder="Exact correct answer (not case-sensitive)" value={t.correctAnswer} onChange={e => onChange({ correctAnswer: e.target.value })} style={inputSt} />
          </Field>
        )}

        <button onClick={onSave} style={primaryBtnSt}>
          {t.id ? 'Update Task' : 'Add Task'}
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string; border: string }> = {
    active: { color: '#9d90f8', bg: 'rgba(123,110,246,0.15)', border: 'rgba(123,110,246,0.35)' },
    draft:  { color: '#555',    bg: 'rgba(100,100,120,0.2)',   border: '#2a2a3a' },
  };
  const s = map[status] || map.draft;
  return (
    <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 5, fontWeight: 700, color: s.color, background: s.bg, border: `0.5px solid ${s.border}` }}>
      {status}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={labelSt}>{label}</div>
      {children}
    </div>
  );
}

const labelSt: React.CSSProperties = {
  fontSize: 9, color: '#44445a', textTransform: 'uppercase', letterSpacing: 0.8,
  marginBottom: 5, fontFamily: 'IBM Plex Mono, monospace',
};
const inputSt: React.CSSProperties = {
  background: '#060610', border: '0.5px solid #2a2a3a', borderRadius: 8,
  padding: '9px 11px', fontSize: 12, color: '#ddd', outline: 'none',
  width: '100%', fontFamily: 'IBM Plex Sans, sans-serif',
};
const primaryBtnSt: React.CSSProperties = {
  background: '#7B6EF6', color: '#fff', fontSize: 13, fontWeight: 700,
  padding: '10px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
  fontFamily: 'IBM Plex Sans, sans-serif', width: '100%',
};
const ghostBtnSt: React.CSSProperties = {
  background: 'rgba(123,110,246,0.1)', color: '#9d90f8', fontSize: 11, fontWeight: 600,
  padding: '9px 14px', borderRadius: 8, border: '0.5px solid rgba(123,110,246,0.35)',
  cursor: 'pointer', fontFamily: 'IBM Plex Sans, sans-serif',
};
const dangerBtnSt: React.CSSProperties = {
  background: 'rgba(248,113,113,0.08)', color: '#f87171', fontSize: 10, fontWeight: 600,
  padding: '7px 11px', borderRadius: 7, border: '0.5px solid rgba(248,113,113,0.25)',
  cursor: 'pointer', fontFamily: 'IBM Plex Sans, sans-serif',
};
const addBtnSt: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
  padding: 10, border: '0.5px dashed #2a2a3a', borderRadius: 9,
  fontSize: 11, color: '#44445a', cursor: 'pointer', background: 'transparent',
  fontFamily: 'IBM Plex Sans, sans-serif', width: '100%',
};

const backBtnSt: React.CSSProperties = {
  background: 'transparent',
  color: '#9d90f8',
  fontSize: 12,
  fontWeight: 600,
  padding: '6px 10px',
  borderRadius: 6,
  border: '0.5px solid #2a2a3a',
  cursor: 'pointer',
  fontFamily: 'IBM Plex Sans, sans-serif',
};