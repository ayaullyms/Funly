import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import type { Task, Quest } from '../types';
import { BackButton, Button, Input, ProgressBar } from '../components/ui';
import { useApp } from '../context/AppContext';
import { useQuestDetail } from '../context/QuestDetailContext';

interface TaskPageProps {
  taskId: string;
  taskIndex: number;
  onBack: () => void;
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function TaskPage({ taskId, taskIndex: initialIndex, onBack }: TaskPageProps) {
  const { showToast } = useApp();
  const { questId, detailState, updateTaskInCache, updateQuestInCache } = useQuestDetail();

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const tasks = detailState?.questData.tasks || [];
  const quest = detailState?.questData.quest;
  const task = tasks[currentIndex];

  useEffect(() => {
    setSelectedAnswer(null);
    setTextAnswer('');
  }, [currentIndex]);

  if (!task || !quest) return null;

  const opts = Array.isArray(task.options) ? task.options : [];
  const isMulti = opts.length > 0;
  const submitted = task.myAnswer != null;
  const totalTasks = tasks.length;
  const taskNum = currentIndex + 1;

  const goTo = (index: number) => {
    if (index < 0 || index >= totalTasks) return;
    setCurrentIndex(index);
  };

  const submit = async () => {
    if (!questId || !task) return;

    const answer = isMulti ? selectedAnswer : textAnswer.trim();
    if (!answer) {
      showToast(isMulti ? 'Select an answer' : 'Enter your answer', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.submitTask(questId, task.id, answer);

      updateTaskInCache(task.id, {
        myAnswer: answer,
        myAnswerCorrect: res.isCorrect,
        myPoints: res.pointsAwarded,
      });

      updateQuestInCache({
        myScore: res.currentScore,
        myRank: res.currentRank,
        myCompletedTasks: (quest.myCompletedTasks || 0) + 1,
      });

      showToast(
        res.isCorrect ? `Correct! +${res.pointsAwarded} pts` : 'Wrong answer',
        res.isCorrect ? 'success' : 'error'
      );
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Get updated task for render (after cache update)
  const currentTask = tasks[currentIndex];
  const isSubmitted = currentTask.myAnswer != null;
  const currentOpts = Array.isArray(currentTask.options) ? currentTask.options : [];
  const currentIsMulti = currentOpts.length > 0;

  return (
    <div className="flex flex-col gap-5 pb-4">
      {/* Hero */}
      <div className="bg-white border border-purple-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <BackButton onClick={onBack} label="Tasks" />
          <span className="font-mono text-[12px] text-purple-500 font-bold">
            {taskNum} / {totalTasks}
          </span>
        </div>
        <ProgressBar value={taskNum - 1} max={totalTasks} />
        <div className="flex justify-between text-[11px] text-purple-500 mt-1.5 font-mono">
          <span>{quest.title}</span>
          <span>+{currentTask.points} pts</span>
        </div>
      </div>

      {/* Question */}
      <div>
        <h2 className="font-black text-[20px] text-zinc-100 leading-tight mb-2">{currentTask.title}</h2>
        {currentTask.description && (
          <p className="text-zinc-400 text-sm leading-relaxed">{currentTask.description}</p>
        )}
      </div>

      {/* Choices / Input */}
      {isSubmitted ? (
        <SubmittedView task={currentTask} opts={currentOpts} />
      ) : quest.status !== 'active' ? (
        <div className="text-zinc-500 text-sm py-4 text-center">Quest is not active</div>
      ) : currentIsMulti ? (
        <div className="flex flex-col gap-2.5">
          {currentOpts.map((o, i) => (
            <button
              key={i}
              onClick={() => setSelectedAnswer(o)}
              className={`flex items-center gap-3 w-full text-left bg-white border rounded-xl px-4 py-3.5 transition-all duration-150 ${
                selectedAnswer === o
                  ? 'border-purple-400 purple-500/10'
                  : 'border-white hover:border-purple-500'
              }`}
            >
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-bold flex-shrink-0 ${
                selectedAnswer === o ? 'bg-purple-500 text-black' : 'bg-zinc-700 text-zinc-400'
              }`}>
                {LETTERS[i] || i + 1}
              </span>
              <span className="text-sm text-white">{o}</span>
            </button>
          ))}
          <Button
            variant="primary"
            className="w-full mt-2"
            disabled={!selectedAnswer || submitting}
            onClick={submit}
          >
            {submitting ? 'Checking...' : 'Check Answer'}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Input
            ref={inputRef}
            placeholder="Type your answer..."
            value={textAnswer}
            onChange={e => setTextAnswer(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            className="text-base py-4"
          />
          <Button
            variant="primary"
            className="w-full"
            disabled={!textAnswer.trim() || submitting}
            onClick={submit}
          >
            {submitting ? 'Checking...' : 'Check Answer'}
          </Button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 mt-2">
        {currentIndex > 0 && (
          <Button variant="ghost" className="flex-1" onClick={() => goTo(currentIndex - 1)}>
            Prev
          </Button>
        )}
        {currentIndex < totalTasks - 1 ? (
          <Button variant="ghost" className="flex-1" onClick={() => goTo(currentIndex + 1)}>
            Next
          </Button>
        ) : (
          <Button variant="primary" className="flex-1" onClick={onBack}>
            View Results
          </Button>
        )}
      </div>
    </div>
  );
}

function SubmittedView({ task, opts }: { task: Task; opts: string[] }) {
  const isCorrect = task.myAnswerCorrect;

  if (opts.length > 0) {
    return (
      <div className="flex flex-col gap-2.5">
        {opts.map((o, i) => {
          const isSelected = o === task.myAnswer;
          let cls = 'border-purple-700 bg-white';
          if (isSelected && isCorrect) cls = 'border-emerald-400 bg-emerald-500/10';
          else if (isSelected && !isCorrect) cls = 'border-red-400 bg-red-500/10';

          return (
            <div
              key={i}
              className={`flex items-center gap-3 w-full text-left border rounded-xl px-4 py-3.5 ${cls}`}
            >
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-bold flex-shrink-0 ${
                isSelected ? (isCorrect ? 'bg-emerald-500 text-black' : 'bg-red-500 text-white') : 'bg-purple-700 text-white'
              }`}>
                {LETTERS[i] || i + 1}
              </span>
              <span className="text-sm text-purple-800">{o}</span>
            </div>
          );
        })}
        <ResultBanner isCorrect={!!isCorrect} points={task.myPoints} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
        <div className="text-[11px] font-mono uppercase tracking-wide text-zinc-500 mb-1">Your answer</div>
        <div className="font-bold text-zinc-100">{task.myAnswer || '—'}</div>
      </div>
      <ResultBanner isCorrect={!!isCorrect} points={task.myPoints} />
    </div>
  );
}

function ResultBanner({ isCorrect, points }: { isCorrect: boolean; points?: number }) {
  return (
    <div className={`rounded-xl px-4 py-3 font-bold text-sm text-center ${
      isCorrect
        ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
        : 'bg-red-500/15 border border-red-500/30 text-red-400'
    }`}>
      {isCorrect ? `Correct! +${points} pts` : 'Wrong answer'}
    </div>
  );
}
