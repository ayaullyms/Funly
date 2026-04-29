// controller/adminController.js

const prisma = require('../config/prisma');

// GET /api/admin/quests
async function getAdminQuests(req, res) {
  try {
    const quests = await prisma.quest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { tasks: true } },
      },
    });

    res.json({
      quests: quests.map(q => ({
        ...q,
        totalTasks: q._count.tasks,
        _count: undefined,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/admin/quests
async function createQuest(req, res) {
  try {
    const {
      title, shortDescription, fullDescription,
      rewardDescription, rules, startDate, endDate, status,
    } = req.body;

    if (!title) return res.status(400).json({ error: 'title required' });
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ error: 'endDate must be after startDate' });
    }

    const quest = await prisma.quest.create({
      data: {
        title,
        shortDescription,
        fullDescription,
        rewardDescription,
        rules,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status: status || 'draft',
        createdBy: req.user.id,
      },
    });

    res.status(201).json({ quest });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// PUT /api/admin/quests/:id
async function updateQuest(req, res) {
  try {
    const { id } = req.params;
    const {
      title, shortDescription, fullDescription,
      rewardDescription, rules, startDate, endDate, status,
    } = req.body;

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ error: 'endDate must be after startDate' });
    }

    const quest = await prisma.quest.update({
      where: { id },
      data: {
        title,
        shortDescription,
        fullDescription,
        rewardDescription,
        rules,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status,
      },
    });

    res.json({ quest });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Quest not found' });
    res.status(500).json({ error: err.message });
  }
}

// DELETE /api/admin/quests/:id
async function deleteQuest(req, res) {
  try {
    await prisma.quest.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Quest not found' });
    res.status(500).json({ error: err.message });
  }
}

// POST /api/admin/quests/:id/tasks
async function createTask(req, res) {
  try {
    const { id } = req.params;
    const { title, description, taskType, correctAnswer, options, points, orderIndex } = req.body;

    if (!correctAnswer?.trim()) {
      return res.status(400).json({ error: 'correctAnswer is required for automatic checking' });
    }

    const task = await prisma.task.create({
      data: {
        questId: id,
        title,
        description,
        taskType: taskType || 'multiple_choice',
        correctAnswer,
        options: options || null,
        points: points ?? 10,
        orderIndex: orderIndex ?? 0,
      },
    });

    res.status(201).json({ task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// PUT /api/admin/tasks/:taskId
async function updateTask(req, res) {
  try {
    const { taskId } = req.params;
    const { title, description, taskType, correctAnswer, options, points, orderIndex } = req.body;

    if (!correctAnswer?.trim()) {
      return res.status(400).json({ error: 'correctAnswer is required for automatic checking' });
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        title,
        description,
        taskType,
        correctAnswer,
        options: options || null,
        points,
        orderIndex,
      },
    });

    res.json({ task });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Task not found' });
    res.status(500).json({ error: err.message });
  }
}

// DELETE /api/admin/tasks/:taskId
async function deleteTask(req, res) {
  try {
    await prisma.task.delete({ where: { id: req.params.taskId } });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Task not found' });
    res.status(500).json({ error: err.message });
  }
}

// GET /api/admin/quests/:id/participants
async function getParticipants(req, res) {
  try {
    const participants = await prisma.questParticipant.findMany({
      where: { questId: req.params.id },
      orderBy: { score: 'desc' },
      include: {
        user: {
          select: {
            username: true, firstName: true, lastName: true, walletAddress: true,
          },
        },
      },
    });

    res.json({
      participants: participants.map(p => ({
        ...p,
        username: p.user.username,
        firstName: p.user.firstName,
        lastName: p.user.lastName,
        walletAddress: p.user.walletAddress,
        user: undefined,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/admin/quests/:id/complete
async function completeQuest(req, res) {
  try {
    const { id } = req.params;
    const { winnersCount = 3, rewardAmountPerWinner } = req.body;

    const rewardAmount = Number(rewardAmountPerWinner);
    if (!rewardAmountPerWinner || isNaN(rewardAmount) || rewardAmount <= 0) {
      return res.status(400).json({ error: 'rewardAmountPerWinner must be a number greater than 0' });
    }

    const quest = await prisma.quest.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!quest) return res.status(404).json({ error: 'Quest not found' });
    if (quest.status === 'completed') {
      return res.status(400).json({ error: 'Quest is already completed' });
    }

    const totalTasks = await prisma.task.count({ where: { questId: id } });
    if (totalTasks === 0) {
      return res.status(400).json({ error: 'Quest has no tasks' });
    }

    const topParticipants = await prisma.questParticipant.findMany({
      where: { questId: id, score: { gt: 0 } },
      orderBy: [{ score: 'desc' }, { joinedAt: 'asc' }],
      take: winnersCount,
      include: {
        user: {
          select: { firstName: true, username: true, walletAddress: true },
        },
      },
    });

    if (topParticipants.length === 0) {
      return res.status(400).json({ error: 'No participants with score > 0 found' });
    }

    const winnersWithoutWallet = topParticipants.filter(p => !p.user.walletAddress);

    await prisma.$transaction([
      prisma.quest.update({ where: { id }, data: { status: 'completed' } }),
      ...topParticipants.flatMap(p => [
        prisma.questParticipant.update({
          where: { id: p.id },
          data: { isWinner: true },
        }),

        prisma.reward.create({
          data: {
            questId: id,
            userId: p.userId,
            amount: rewardAmount,
            rewardType: 'ton',
            status: 'pending',
          },
        }),
        prisma.user.update({
          where: { id: p.userId },
          data: { totalWins: { increment: 1 } },
        }),
      ]),
    ]);

    res.json({
      success: true,
      winners: topParticipants.length,
      rewardPerWinner: rewardAmount,
      winnerNames: topParticipants.map(p => p.user.firstName || p.user.username),
      warnings: winnersWithoutWallet.length > 0
        ? `${winnersWithoutWallet.length} winner(s) have no wallet address connected`
        : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/admin/rewards/pending
async function getPendingRewards(req, res) {
  try {
    const rewards = await prisma.reward.findMany({
      where: { status: 'pending' },
      include: {
        user: { select: { walletAddress: true, firstName: true, username: true } },
        quest: { select: { title: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      rewards: rewards.map(r => ({
        id: r.id,
        questId: r.questId,
        questTitle: r.quest.title,
        userId: r.userId,
        walletAddress: r.user.walletAddress,
        recipientName: r.user.firstName || r.user.username,
        amount: r.amount.toString(),
        rewardType: r.rewardType,
        status: r.status,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/admin/rewards/:rewardId/distribute
async function distributeReward(req, res) {
  try {
    const { rewardId } = req.params;
    const { transactionHash } = req.body;

    if (!transactionHash) {
      return res.status(400).json({ error: 'transactionHash is required' });
    }

    const { count } = await prisma.reward.updateMany({
      where: { id: rewardId, status: { in: ['pending', 'processing'] } },
      data: {
        status: 'distributed',
        transactionHash,
        distributedAt: new Date(),
      },
    });

    if (count === 0) {
      return res.status(400).json({ error: 'Reward already distributed or not found' });
    }

    const reward = await prisma.reward.findUnique({ where: { id: rewardId } });
    if (!reward) {
      return res.status(404).json({ error: 'Reward record not found after update' });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: reward.userId },
        data: { totalRewardsAmount: { increment: reward.amount } },
      }),
      prisma.questParticipant.updateMany({
        where: { questId: reward.questId, userId: reward.userId },
        data: { rewardClaimed: true },
      }),
    ]);

    res.json({
      reward: {
        ...reward,
        amount: reward.amount.toString(),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/admin/rewards/:rewardId/processing
async function markRewardProcessing(req, res) {
  try {
    const { rewardId } = req.params;
    const { contractAddress } = req.body;

    const { count } = await prisma.reward.updateMany({
      where: { id: rewardId, status: 'pending' },
      data: {
        status: 'processing',
        ...(contractAddress ? { contractAddress } : {}),
      },
    });

    if (count === 0) {
      return res.status(400).json({ error: 'Reward is not in pending state or not found' });
    }

    const reward = await prisma.reward.findUnique({ where: { id: rewardId } });
    res.json({ reward: { ...reward, amount: reward.amount.toString() } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/admin/stats
async function getStats(req, res) {
  try {
    const [totalUsers, questsByStatus, submissionsAgg, rewardsAgg] =
      await prisma.$transaction([
        prisma.user.count(),
        prisma.quest.groupBy({ by: ['status'], _count: { _all: true } }),
        prisma.taskSubmission.aggregate({
          _count: { _all: true },
          _sum: { pointsAwarded: true },
        }),
        prisma.reward.groupBy({
          by: ['status'],
          _count: { _all: true },
          _sum: { amount: true },
        }),
      ]);

    res.json({
      totalUsers,
      questsByStatus: questsByStatus.map(r => ({
        status: r.status,
        count: r._count._all,
      })),
      submissions: {
        total: submissionsAgg._count._all,
        totalPoints: submissionsAgg._sum.pointsAwarded,
      },
      rewards: rewardsAgg.map(r => ({
        status: r.status,
        count: r._count._all,
        totalAmount: r._sum.amount?.toString(),
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getAdminQuests,
  createQuest, updateQuest, deleteQuest,
  createTask, updateTask, deleteTask,
  getParticipants, completeQuest,
  getPendingRewards, distributeReward, markRewardProcessing,
  getStats,
};