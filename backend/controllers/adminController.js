// controller/adminController.js

const prisma = require('../config/prisma');

async function getAdminQuests(req, res) {
  try {
    const quests = await prisma.quest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { tasks: true } },
        rewards: { select: { status: true } },  
      },
    });

    res.json({
      quests: quests.map(q => {
        const pendingRewards    = q.rewards.filter(r => r.status === 'pending' || r.status === 'processing').length;
        const distributedRewards = q.rewards.filter(r => r.status === 'distributed').length;
        return {
          ...q,
          totalTasks: q._count.tasks,
          pendingRewards,       
          distributedRewards,    
          _count: undefined,
          rewards: undefined,
        };
      }),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createQuest(req, res) {
  try {
    const {
      title, shortDescription, fullDescription,
      rewardDescription, rules, startDate, endDate, status,
      rewardAmountPerWinner, winnersCount,
    } = req.body;

    if (!title) return res.status(400).json({ error: 'title required' });
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ error: 'endDate must be after startDate' });
    }

    const quest = await prisma.quest.create({
      data: {
        title, shortDescription, fullDescription,
        rewardDescription, rules,
        startDate: startDate ? new Date(startDate) : null,
        endDate:   endDate   ? new Date(endDate)   : null,
        status: status || 'draft',
        rewardAmountPerWinner: rewardAmountPerWinner ? Number(rewardAmountPerWinner) : null,
        winnersCount: winnersCount ? Number(winnersCount) : 3,
        createdBy: req.user.id,
      },
    });

    res.status(201).json({ quest });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateQuest(req, res) {
  try {
    const { id } = req.params;
    const {
      title, shortDescription, fullDescription,
      rewardDescription, rules, startDate, endDate, status,
      rewardAmountPerWinner, winnersCount,
    } = req.body;

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ error: 'endDate must be after startDate' });
    }

    const data = {};
    if (title !== undefined) data.title = title;
    if (shortDescription !== undefined) data.shortDescription  = shortDescription;
    if (fullDescription !== undefined) data.fullDescription   = fullDescription;
    if (rewardDescription !== undefined) data.rewardDescription = rewardDescription;
    if (rules !== undefined) data.rules = rules;
    if (status !== undefined) data.status = status;
    if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) data.endDate = endDate   ? new Date(endDate)   : null;
    if (rewardAmountPerWinner !== undefined) {
      data.rewardAmountPerWinner = rewardAmountPerWinner ? Number(rewardAmountPerWinner) : null;
    }
    if (winnersCount !== undefined) {
      data.winnersCount = Number(winnersCount) || 3;
    }

    const quest = await prisma.quest.update({ where: { id }, data });
    res.json({ quest });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Quest not found' });
    res.status(500).json({ error: err.message });
  }
}

async function deleteQuest(req, res) {
  try {
    await prisma.quest.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Quest not found' });
    res.status(500).json({ error: err.message });
  }
}

async function createTask(req, res) {
  try {
    const { id } = req.params;
    const { title, description, taskType, correctAnswer, options, points, orderIndex } = req.body;

    if (!correctAnswer?.trim()) {
      return res.status(400).json({ error: 'correctAnswer is required' });
    }

    const task = await prisma.task.create({
      data: {
        questId: id, title, description,
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

async function updateTask(req, res) {
  try {
    const { taskId } = req.params;
    const { title, description, taskType, correctAnswer, options, points, orderIndex } = req.body;

    if (!correctAnswer?.trim()) {
      return res.status(400).json({ error: 'correctAnswer is required' });
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: { title, description, taskType, correctAnswer, options: options || null, points, orderIndex },
    });

    res.json({ task });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Task not found' });
    res.status(500).json({ error: err.message });
  }
}

async function deleteTask(req, res) {
  try {
    await prisma.task.delete({ where: { id: req.params.taskId } });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Task not found' });
    res.status(500).json({ error: err.message });
  }
}

async function getParticipants(req, res) {
  try {
    const participants = await prisma.questParticipant.findMany({
      where: { questId: req.params.id },
      orderBy: { score: 'desc' },
      include: {
        user: { select: { username: true, firstName: true, lastName: true, walletAddress: true } },
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

async function completeQuest(req, res) {
  try {
    const { id } = req.params;

    const quest = await prisma.quest.findUnique({ where: { id } });
    if (!quest) return res.status(404).json({ error: 'Quest not found' });
    if (quest.status === 'completed') return res.status(400).json({ error: 'Quest is already completed' });

    const rewardAmount = Number(quest.rewardAmountPerWinner);
    if (!rewardAmount || rewardAmount <= 0) {
      return res.status(400).json({ error: 'Set rewardAmountPerWinner before completing' });
    }

    const totalTasks = await prisma.task.count({ where: { questId: id } });
    if (totalTasks === 0) return res.status(400).json({ error: 'Quest has no tasks' });

    const MAX_WINNERS = 30;
    const winnersCount = Math.min(quest.winnersCount || 3, MAX_WINNERS);

    const topParticipants = await prisma.questParticipant.findMany({
      where: { questId: id, score: { gt: 0 } },
      orderBy: [{ score: 'desc' }, { joinedAt: 'asc' }],
      take: winnersCount,
      include: {
        user: { select: { firstName: true, username: true, walletAddress: true } },
      },
    });

    if (topParticipants.length === 0) {
      return res.status(400).json({ error: 'No participants with score > 0 found' });
    }

    const winnersWithoutWallet = topParticipants.filter(p => !p.user.walletAddress);

    await prisma.$transaction([
      prisma.quest.update({ where: { id }, data: { status: 'completed' } }),
      ...topParticipants.flatMap(p => [
        prisma.questParticipant.update({ where: { id: p.id }, data: { isWinner: true } }),
        prisma.reward.create({
          data: { questId: id, userId: p.userId, amount: rewardAmount, rewardType: 'ton', status: 'pending' },
        }),
        prisma.user.update({ where: { id: p.userId }, data: { totalWins: { increment: 1 } } }),
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

// GET /api/admin/quests/:id/rewards/pending 

async function getQuestPendingRewards(req, res) {
  try {
    const { id } = req.params;

    const rewards = await prisma.reward.findMany({
      where: { questId: id, status: { in: ['pending', 'processing'] } },
      include: {
        user: {
          select: {
            walletAddress: true,
            walletAddressFriendly: true,
            firstName: true,
            username: true,
          },
        },
        quest: { select: { title: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      rewards: rewards.map(r => ({
        id:                    r.id,
        questId:               r.questId,
        questTitle:            r.quest.title,
        userId:                r.userId,
        walletAddress:         r.user.walletAddress         || null,
        walletAddressFriendly: r.user.walletAddressFriendly || null,
        recipientName:         r.user.firstName || r.user.username || 'Anonymous',
        amount:                r.amount.toString(),
        rewardType:            r.rewardType,
        status:                r.status,
        createdAt:             r.createdAt,
      })),
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
        id: r.id, questId: r.questId, questTitle: r.quest.title,
        userId: r.userId, walletAddress: r.user.walletAddress,
        recipientName: r.user.firstName || r.user.username,
        amount: r.amount.toString(), rewardType: r.rewardType,
        status: r.status, createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function verifyTonTransaction(txHash, contractAddress) {
  if (!txHash || txHash.length > 100) return false;

  try {
    const isTestnet = process.env.TON_TESTNET === 'true';
    const base = isTestnet
      ? 'https://testnet.toncenter.com/api/v2'
      : 'https://toncenter.com/api/v2';

    const apiKey = process.env.TONCENTER_API_KEY || '';
    const headers = apiKey ? { 'X-API-Key': apiKey } : {};

    const url = `${base}/getTransactions?address=${encodeURIComponent(contractAddress)}&limit=10`;
    const res = await fetch(url, { headers });

    if (!res.ok) return false;

    const data = await res.json();
    const txs = data.result || [];

    const found = txs.find(tx =>
      tx.transaction_id?.hash === txHash ||
      tx.in_msg?.body_hash === txHash
    );

    if (!found) return false;

    const computeExitCode = found.description?.compute_ph?.exit_code;
    const actionResultCode = found.description?.action?.result_code;

    if (computeExitCode !== undefined && computeExitCode !== 0) {
      console.warn(`TX failed: compute exit_code=${computeExitCode}`);
      return false;
    }
    if (actionResultCode !== undefined && actionResultCode !== 0) {
      console.warn(`TX failed: action result_code=${actionResultCode}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error('TonCenter verification error:', err.message);
    return false; 
  }
}


async function distributeQuestRewards(req, res) {
  try {
    const { id } = req.params;
    const { transactionHash, contractAddress } = req.body;

    if (!transactionHash) {
      return res.status(400).json({ error: 'transactionHash is required' });
    }
    if (!contractAddress) {
      return res.status(400).json({ error: 'contractAddress is required' });
    }

    if (transactionHash.length > 100) {
      return res.status(400).json({
        error: 'Transaction not confirmed yet. Wait and retry.',
      });
    }

    const isTestnet = process.env.TON_TESTNET === 'true';
    const isVerified = isTestnet ? true : await verifyTonTransaction(transactionHash, contractAddress);
    if (!isVerified) {
        return res.status(400).json({
            error: 'Transaction not found or failed on blockchain. Check TonScan.',
        });
    }

    const rewards = await prisma.reward.findMany({
      where: { questId: id, status: { in: ['pending', 'processing'] } },
    });

    if (rewards.length === 0) {
      return res.status(400).json({ error: 'No pending rewards found for this quest' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.reward.updateMany({
        where: { questId: id, status: { in: ['pending', 'processing'] } },
        data: {
          status: 'distributed',
          transactionHash,
          contractAddress,
          distributedAt: new Date(),
        },
      });

      for (const reward of rewards) {
        await tx.user.update({
          where: { id: reward.userId },
          data: { totalRewardsAmount: { increment: reward.amount } },
        });
      }

      await tx.questParticipant.updateMany({
        where: { questId: id, isWinner: true },
        data: { rewardClaimed: true },
      });
    });

    res.json({ ok: true, distributed: rewards.length, transactionHash, contractAddress });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function distributeReward(req, res) {
  try {
    const { rewardId } = req.params;
    const { transactionHash, contractAddress } = req.body;

    if (!transactionHash) {
      return res.status(400).json({ error: 'transactionHash is required' });
    }

    const { count } = await prisma.reward.updateMany({
      where: { id: rewardId, status: { in: ['pending', 'processing'] } },
      data: {
        status: 'distributed',
        transactionHash,
        distributedAt: new Date(),
        ...(contractAddress ? { contractAddress } : {}),
      },
    });

    if (count === 0) {
      return res.status(400).json({ error: 'Reward already distributed or not found' });
    }

    const reward = await prisma.reward.findUnique({ where: { id: rewardId } });
    if (!reward) return res.status(404).json({ error: 'Reward not found after update' });

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

    res.json({ reward: { ...reward, amount: reward.amount.toString() } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function markRewardProcessing(req, res) {
  try {
    const { rewardId } = req.params;
    const { contractAddress } = req.body;

    const { count } = await prisma.reward.updateMany({
      where: { id: rewardId, status: 'pending' },
      data: {
        status: 'processing',
        processingAt: new Date(),
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

async function getStats(req, res) {
  try {
    const [totalUsers, questsByStatus, submissionsAgg, rewardsAgg] =
      await prisma.$transaction([
        prisma.user.count(),
        prisma.quest.groupBy({ by: ['status'], _count: { _all: true } }),
        prisma.taskSubmission.aggregate({
          _count: { _all: true },
          _sum:   { pointsAwarded: true },
        }),
        prisma.reward.groupBy({
          by: ['status'],
          _count: { _all: true },
          _sum:   { amount: true },
        }),
      ]);

    res.json({
      totalUsers,
      questsByStatus: questsByStatus.map(r => ({ status: r.status, count: r._count._all })),
      submissions: { total: submissionsAgg._count._all, totalPoints: submissionsAgg._sum.pointsAwarded },
      rewards: rewardsAgg.map(r => ({
        status: r.status, count: r._count._all, totalAmount: r._sum.amount?.toString(),
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
  getPendingRewards,
  getQuestPendingRewards,  
  distributeQuestRewards,  
  distributeReward,         
  markRewardProcessing,
  getStats,
};