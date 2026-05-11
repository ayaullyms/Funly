import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { Quest, Task, LeaderboardData } from '../types';

export interface QuestDetailState {
  questData: { quest: Quest; tasks: Task[] };
  lbData: LeaderboardData;
}

interface QuestDetailContextValue {
  questId: string | null;
  setQuestId: (id: string | null) => void;
  detailState: QuestDetailState | null;
  setDetailState: (s: QuestDetailState | null | ((prev: QuestDetailState | null) => QuestDetailState | null)) => void;
  updateTaskInCache: (taskId: string, patch: Partial<Task>) => void;
  updateQuestInCache: (patch: Partial<Quest>) => void;
}

const QuestDetailContext = createContext<QuestDetailContextValue | null>(null);

export function QuestDetailProvider({ children }: { children: ReactNode }) {
  const [questId, setQuestId] = useState<string | null>(null);
  const [detailState, setDetailState] = useState<QuestDetailState | null>(null);

  const updateTaskInCache = (taskId: string, patch: Partial<Task>) => {
    setDetailState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        questData: {
          ...prev.questData,
          tasks: prev.questData.tasks.map(t => t.id === taskId ? { ...t, ...patch } : t),
        },
      };
    });
  };

  const updateQuestInCache = (patch: Partial<Quest>) => {
    setDetailState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        questData: {
          ...prev.questData,
          quest: { ...prev.questData.quest, ...patch },
        },
      };
    });
  };

  return (
    <QuestDetailContext.Provider value={{ questId, setQuestId, detailState, setDetailState, updateTaskInCache, updateQuestInCache }}>
      {children}
    </QuestDetailContext.Provider>
  );
}

export function useQuestDetail() {
  const ctx = useContext(QuestDetailContext);
  if (!ctx) throw new Error('useQuestDetail must be used within QuestDetailProvider');
  return ctx;
}
