export type QuestStatus = 'draft' | 'active' | 'completed';
export type TaskType = 'multiple_choice' | 'quiz' | 'text';
export type RewardStatus = 'pending' | 'distributed';
export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  telegramId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  role: UserRole;
  walletAddress?: string;
  walletAddressFriendly?: string;
  totalRewardsAmount?: string | number;
}

export interface Quest {
  id: string;
  title: string;
  shortDescription?: string;
  fullDescription?: string;
  rewardDescription?: string;
  rules?: string;
  status: QuestStatus;
  startDate?: string;
  endDate?: string;
  participantsCount?: number;
  totalTasks?: number;
  rewardAmountPerWinner?: number | null;
  pendingRewards?:    number;
  distributedRewards?: number;
  winnersCount?: number; 
  // joined user fields
  isJoined?: boolean;
  myScore?: number;
  myRank?: number;
  myCompletedTasks?: number;
  myCorrectTasks?: number;
  isQuestCompleted?: boolean;
  myStatus?: string;
  iWon?: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  taskType: TaskType;
  options?: string[];
  points: number;
  orderIndex: number;
  correctAnswer?: string;
  // user progress
  myAnswer?: string | null;
  myAnswerCorrect?: boolean;
  myPoints?: number;
}

export interface LeaderboardEntry {
  rank?: number;
  userId: string;
  firstName?: string;
  username?: string;
  score: number;
  isMe?: boolean;
  isWinner?: boolean;
  status?: string;
}

export interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  myPosition?: {
    rank: number;
    score: number;
    inTop50: boolean;
  } | null;
  totalParticipants: number;
}

export interface Reward {
  id: string;
  questTitle: string;
  amount: string | number;
  status: RewardStatus;
  createdAt: string;
  transactionHash?: string;
}

export interface UserStats {
  totalTasksCompleted: number;
  totalWins: number;
  questsJoined: number;
  questsCompleted: number;
}

export interface Participant {
  userId: string;
  firstName?: string;
  username?: string;
  score: number;
}

export interface AdminStats {
  totalUsers: number;
  submissions?: { total: number };
}

export interface QuestDetail {
  quest: Quest;
  tasks: Task[];
}

// Editor
export interface EditorTask {
  id: string | null;
  title: string;
  description: string;
  taskType: TaskType;
  correctAnswer: string;
  options: string[];
  points: number;
  orderIndex: number;
}

export interface CompleteQuestResult {
  success: boolean;
  winners: number;
  rewardPerWinner: number;
  winnerNames: string[];
  warnings: string | null;
}