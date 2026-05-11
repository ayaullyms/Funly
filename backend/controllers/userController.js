//controller/usercontroller.js

const prisma = require('../config/prisma');
const { Address } = require('@ton/core');

// GET /api/users/me
async function getMe(req, res) {
  try {
    const user = { ...req.user, telegramId: req.user.telegramId.toString() };
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// PUT /api/users/me
async function updateMe(req, res) {
  try {
    const { firstName, lastName } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { firstName, lastName },
    });
    res.json({ user: { ...user, telegramId: user.telegramId.toString() } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/users/me/stats
async function getMyStats(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        totalTasksCompleted: true,
        totalWins: true,
        totalRewardsAmount: true,
        _count: { select: { participations: true } },
      },
    });

    const questsCompleted = await prisma.questParticipant.count({
      where: { userId: req.user.id, status: 'completed' },
    });

    res.json({
      stats: {
        totalTasksCompleted: user.totalTasksCompleted,
        totalWins: user.totalWins,
        totalRewardsAmount: user.totalRewardsAmount.toString(),
        questsJoined: user._count.participations,
        questsCompleted,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/users/me/rewards
async function getMyRewards(req, res) {
  try {
    const rewards = await prisma.reward.findMany({
      where: { userId: req.user.id },
      include: { quest: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({
      rewards: rewards.map(r => ({
        ...r,
        questTitle: r.quest.title,
        amount: r.amount.toString(),
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function normalizeTonAddress(input) {
  const addr = Address.parse(input);
  const raw = addr.toRawString(); 
  const friendly = addr.toString({ urlSafe: true, bounceable: true });
  return { raw, friendly };
}

// POST /api/users/me/wallet
async function connectWallet(req, res) {
  try {
    const { walletAddress, providerName } = req.body;
    if (!walletAddress) return res.status(400).json({ error: 'walletAddress required' });
    const { raw, friendly } = normalizeTonAddress(walletAddress);

    await prisma.walletConnection.updateMany({
      where: { userId: req.user.id },
      data: { isActive: false },
    });

    await prisma.walletConnection.create({
      data: { userId: req.user.id, walletAddress: raw, providerName: providerName || 'TON Connect' },
    });

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { walletAddress: raw, walletAddressFriendly: friendly },
    });

    res.json({ user: { ...user, telegramId: user.telegramId.toString() } });
  } catch (err) {
    if (err?.message?.includes('Invalid address')) {
      return res.status(400).json({ error: 'Invalid TON wallet address' });
    }
    res.status(500).json({ error: err.message });
  }
}

// DELETE /api/users/me/wallet
async function disconnectWallet(req, res) {
  try {
    await prisma.walletConnection.updateMany({
      where: { userId: req.user.id },
      data: { isActive: false },
    });
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { walletAddress: null, walletAddressFriendly: null }
    });
    res.json({ user: { ...user, telegramId: user.telegramId.toString() } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getMe, updateMe, getMyStats, getMyRewards, connectWallet, disconnectWallet };