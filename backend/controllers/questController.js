//controller/questcontroller.js

const prisma = require('../config/prisma');

// GET /api/quests
async function listQuests(req, res) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      status: { not: 'draft' },
      ...(status ? { status } : {}),
    };

    const [quests, total] = await prisma.$transaction([
      prisma.quest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
        include: {
          participants: {
            where: { userId: req.user.id },
            select: { id: true },
          },
          _count: { select: { tasks: true } },
        },
      }),
      prisma.quest.count({ where }),
    ]);

    res.json({
      quests: quests.map(q => ({
        ...q,
        isJoined: q.participants.length > 0,
        totalTasks: q._count.tasks,
        participants: undefined,
        _count: undefined,
      })),
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/quests/my
async function getMyQuests(req, res) {
  try {
    const participations = await prisma.questParticipant.findMany({
      where: { userId: req.user.id },
      include: {
        quest: {
          include: { _count: { select: { tasks: true } } },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    res.json({
      quests: participations.map(p => ({
        ...p.quest,
        totalTasks: p.quest._count.tasks,
        _count: undefined,
        score: p.score,
        rank: p.rank,
        participationStatus: p.status,
        isWinner: p.isWinner,
        rewardClaimed: p.rewardClaimed,
        joinedAt: p.joinedAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/quests/:id
async function getQuest(req, res) {
  try {
    const { id } = req.params;

    const quest = await prisma.quest.findUnique({
      where: { id },
      include: {
        participants: {
          where: { userId: req.user.id },
          select: { score: true, rank: true, status: true, isWinner: true },
        },
        tasks: {
          orderBy: { orderIndex: 'asc' },
          include: {
            submissions: {
              where: { userId: req.user.id },
              select: { isCorrect: true, pointsAwarded: true, submittedAnswer: true },
            },
          },
        },
        _count: { select: { tasks: true } },
      },
    });

    if (!quest) return res.status(404).json({ error: 'Quest not found' });

    const myParticipation = quest.participants[0] || null;
    const myCompletedTasks = quest.tasks.filter(t => t.submissions.length > 0).length;
    const myCorrectTasks = quest.tasks.filter(t => t.submissions.some(s => s.isCorrect)).length;
    const totalTasks = quest._count.tasks;

    res.json({
      quest: {
        ...quest,
        isJoined: !!myParticipation,
        myScore: myParticipation?.score ?? null,
        myRank: myParticipation?.rank ?? null,
        myStatus: myParticipation?.status ?? null,
        iWon: myParticipation?.isWinner ?? false,
        totalTasks,               
        myCompletedTasks,
        myCorrectTasks,
        isQuestCompleted: myParticipation?.status === 'completed',
        participants: undefined,
        _count: undefined,
      },
      tasks: quest.tasks.map(t => ({
        ...t,
        correctAnswer: undefined,
        options: t.options || [],
        myAnswerCorrect: t.submissions[0]?.isCorrect ?? null,
        myPoints: t.submissions[0]?.pointsAwarded ?? null,
        myAnswer: t.submissions[0]?.submittedAnswer ?? null,
        submissions: undefined,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getLeaderboard(req, res) {
  try {
    const { id } = req.params;

    const top50 = await prisma.questParticipant.findMany({
      where: { questId: id },
      orderBy: [{ score: 'desc' }, { joinedAt: 'asc' }],
      take: 50,
      include: {
        user: { select: { username: true, firstName: true, lastName: true, photoUrl: true } },
      },
    });

    const myEntry = await prisma.questParticipant.findUnique({
      where: { questId_userId: { questId: id, userId: req.user.id } },
      select: { score: true, rank: true, isWinner: true, status: true, joinedAt: true },
    });

    let myPosition = null;
    if (myEntry) {
      const isInTop50 = top50.some(e => e.userId === req.user.id);
      if (isInTop50) {
        myPosition = top50.findIndex(e => e.userId === req.user.id) + 1;
      } else {
        const aheadCount = await prisma.questParticipant.count({
          where: {
            questId: id,
            OR: [
              { score: { gt: myEntry.score } },
              { score: myEntry.score, joinedAt: { lt: myEntry.joinedAt } },
            ],
          },
        });
        myPosition = aheadCount + 1;
      }
    }

    res.json({
      leaderboard: top50.map((e, i) => ({
        rank: i + 1,
        score: e.score,
        isWinner: e.isWinner,
        status: e.status,
        isMe: e.userId === req.user.id,
        username: e.user.username,
        firstName: e.user.firstName,
        lastName: e.user.lastName,
        photoUrl: e.user.photoUrl,
      })),
      myPosition: myEntry ? {
        rank: myPosition,
        score: myEntry.score,
        isWinner: myEntry.isWinner,
        status: myEntry.status,
        inTop50: top50.some(e => e.userId === req.user.id),
      } : null,
      totalParticipants: await prisma.questParticipant.count({ where: { questId: id } }),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/quests/:id/join
async function joinQuest(req, res) {
  try {
    const { id } = req.params;

    const quest = await prisma.quest.findUnique({ where: { id } });
    if (!quest) return res.status(404).json({ error: 'Quest not found' });
    if (quest.status !== 'active') return res.status(400).json({ error: 'Quest is not active' });
    
    if (quest.endDate && new Date() > new Date(quest.endDate)) {
      return res.status(400).json({ error: 'Quest has already ended' });
    }

    const existing = await prisma.questParticipant.findUnique({
      where: { questId_userId: { questId: id, userId: req.user.id } },
    });

    if (existing) return res.json({ participant: existing, alreadyJoined: true });

    const [participant] = await prisma.$transaction([
      prisma.questParticipant.create({
        data: { questId: id, userId: req.user.id, status: 'joined' },
      }),
      prisma.quest.update({
        where: { id },
        data: { participantsCount: { increment: 1 } },
      }),
    ]);

    res.json({ participant, alreadyJoined: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { listQuests, getMyQuests, getQuest, getLeaderboard, joinQuest };