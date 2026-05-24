// api/index.ts

import type {
  User, Quest, Task, LeaderboardData, Reward,
  UserStats, Participant, AdminStats, QuestDetail, EditorTask,
} from '../types';

// const BASE = 'http://localhost:3001/api';
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function getInitData(): string {
  return (window as any).Telegram?.WebApp?.initData || 'dev_mock';
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const opts: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-telegram-init-data': getInitData(),
    },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res  = await fetch(BASE + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data as T;
}


interface MeResponse           { user: User }
interface StatsResponse        { stats: UserStats }
interface RewardsResponse      { rewards: Reward[] }
interface QuestsResponse       { quests: Quest[] }
interface QuestDetailResponse  { quest: Quest; tasks: Task[] }
interface LeaderboardResponse  { leaderboard: LeaderboardData['leaderboard']; myPosition: LeaderboardData['myPosition']; totalParticipants: number }
interface JoinResponse         { message: string }
interface SubmitResponse       { isCorrect: boolean; pointsAwarded: number; currentScore: number; currentRank: number; questCompleted: boolean }
interface AdminStatsResponse   { totalUsers: number; submissions?: { total: number } }
interface CreateQuestResponse  { quest: Quest }
interface CreateTaskResponse   { task: Task }
interface ParticipantsResponse { participants: Participant[] }
interface CompleteQuestResponse {
  success: boolean;
  winners: number;
  rewardPerWinner: number;
  winnerNames: string[];
  warnings: string | null;
}


export interface PendingReward {
  id:                    string;
  questId:               string;
  questTitle:            string;
  userId:                string;
  walletAddress:         string | null;
  walletAddressFriendly: string | null;
  recipientName:         string;
  amount:                string;
  rewardType:            string;
  status:                string;
  createdAt:             string;
}

interface QuestPendingRewardsResponse { rewards: PendingReward[] }

interface DistributeQuestRewardsResponse {
  ok:              boolean;
  distributed:     number;
  transactionHash: string;
  contractAddress: string;
}

// ── API ───────────────────────────────────────────────────────────────────────

export const api = {
  // USER
  getMe:            () => request<MeResponse>('GET', '/users/me'),
  getMyStats:       () => request<StatsResponse>('GET', '/users/me/stats'),
  getMyRewards:     () => request<RewardsResponse>('GET', '/users/me/rewards'),
  connectWallet:    (body: { walletAddress: string; providerName?: string }) =>
                    request<{ message: string }>('POST', '/users/me/wallet', body),
  disconnectWallet: () => request<{ message: string }>('DELETE', '/users/me/wallet'),

  // QUESTS
  listQuests:    (status = '') => request<QuestsResponse>('GET', `/quests${status ? '?status=' + status : ''}`),
  getMyQuests:   ()             => request<QuestsResponse>('GET', '/quests/my'),
  getQuest:      (id: string)   => request<QuestDetailResponse>('GET', `/quests/${id}`),
  getLeaderboard:(id: string)   => request<LeaderboardResponse>('GET', `/quests/${id}/leaderboard`),
  joinQuest:     (id: string)   => request<JoinResponse>('POST', `/quests/${id}/join`),

  // TASKS
  submitTask: (questId: string, taskId: string, answer: string) =>
    request<SubmitResponse>('POST', `/quests/${questId}/tasks/${taskId}/submit`, { answer }),

  // ADMIN — quests
  getAdminStats: () => request<AdminStatsResponse>('GET', '/admin/stats'),
  getAdminQuests: () => request<QuestsResponse>('GET', '/admin/quests'),
  getAdminQuest:  (id: string) => request<QuestDetailResponse>('GET', `/admin/quests/${id}`),
  createQuest:   (body: Partial<Quest>) => request<CreateQuestResponse>('POST', '/admin/quests', body),
  updateQuest:   (id: string, body: Partial<Quest>) => request<{ quest: Quest }>('PUT', `/admin/quests/${id}`, body),
  deleteQuest:   (id: string) => request<{ message: string }>('DELETE', `/admin/quests/${id}`),

  // ADMIN — tasks
  createTask:  (qid: string, body: Partial<EditorTask>) => request<CreateTaskResponse>('POST', `/admin/quests/${qid}/tasks`, body),
  updateTask:  (tid: string, body: Partial<EditorTask>) => request<{ task: Task }>('PUT', `/admin/tasks/${tid}`, body),
  deleteTask:  (tid: string) => request<{ message: string }>('DELETE', `/admin/tasks/${tid}`),

  // ADMIN — participants 
  getParticipants: (id: string) => request<ParticipantsResponse>('GET', `/admin/quests/${id}/participants`),
  completeQuest:   (id: string, body?: object) => request<CompleteQuestResponse>('POST', `/admin/quests/${id}/complete`, body),

  // ADMIN — rewards
  distributeReward: (rid: string, body: { transactionHash: string; contractAddress?: string }) =>
    request<{ message: string }>('POST', `/admin/rewards/${rid}/distribute`, body),

  getQuestPendingRewards: (questId: string) =>
    request<QuestPendingRewardsResponse>('GET', `/admin/quests/${questId}/rewards/pending`),

  distributeQuestRewards: (
    questId: string,
    body: { transactionHash: string; contractAddress: string }
  ) => request<DistributeQuestRewardsResponse>('POST', `/admin/quests/${questId}/distribute`, body),
};