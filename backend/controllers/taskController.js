//controller/taskcontroller.js
const prisma = require('../config/prisma');

// Internal: recalculate ranks for all participants in a quest
async function updateRanks(questId) {
  const participants = await prisma.questParticipant.findMany({
    where: { questId },
    orderBy: [{ score: 'desc' }, { joinedAt: 'asc' }],
    select: { id: true },
  });
  await prisma.$transaction(
    participants.map((p, i) =>
      prisma.questParticipant.update({
        where: { id: p.id },
        data: { rank: i + 1 },
      })
    )
  );
}

// Internal: check if user completed all tasks and mark quest as completed
async function checkAndCompleteQuest(questId, userId) {
  const totalTasks = await prisma.task.count({ where: { questId } });
  if (totalTasks === 0) return;
 
  const completedTasks = await prisma.taskSubmission.count({
    where: { questId, userId },
  });
 
  if (completedTasks >= totalTasks) {
    await prisma.questParticipant.update({
      where: { questId_userId: { questId, userId } },
      data: { status: 'completed', completedAt: new Date() },
    });
  }
}

// POST /api/quests/:questId/tasks/:taskId/submit
async function submitTask(req, res) {
  try {
    const { questId, taskId } = req.params;
    const { answer } = req.body;

    if (!answer?.trim()) return res.status(400).json({ error: 'Answer is required' });

    // Must be a participant
    const participant = await prisma.questParticipant.findUnique({
      where: { questId_userId: { questId, userId: req.user.id } },
    });
    if (!participant) return res.status(403).json({ error: 'Not a participant' });

    // Get task
    const task = await prisma.task.findFirst({
      where: { id: taskId, questId },
      include: { quest: { select: { endDate: true, status: true } } },
    });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    if (task.quest.status !== 'active') {
      return res.status(400).json({ error: 'Quest is not active' });
    }
    if (task.quest.endDate && new Date() > new Date(task.quest.endDate)) {
      return res.status(400).json({ error: 'Quest has ended' });
    }

    // Duplicate check
    const existing = await prisma.taskSubmission.findUnique({
      where: { taskId_userId: { taskId, userId: req.user.id } },
    });
    if (existing) return res.status(409).json({ error: 'Already submitted' });

    // Grade answer
    let isCorrect = false;
    let pointsAwarded = 0;
    isCorrect = task.correctAnswer?.toLowerCase().trim() === answer.toLowerCase().trim();
    pointsAwarded = isCorrect ? task.points : 0;
      
    // Save submission + update score in one transaction
    const [submission] = await prisma.$transaction([
      prisma.taskSubmission.create({
        data: { taskId, userId: req.user.id, questId, submittedAnswer: answer, isCorrect, pointsAwarded },
      }),
      prisma.questParticipant.update({
        where: { questId_userId: { questId, userId: req.user.id } },
        data: { score: { increment: pointsAwarded }, status: 'in_progress' },
      }),
      ...(isCorrect
        ? [prisma.user.update({
            where: { id: req.user.id },
            data: { totalTasksCompleted: { increment: 1 } },
          })]
        : []),
    ]);

    await updateRanks(questId);
    await checkAndCompleteQuest(questId, req.user.id);

    const updatedParticipant = await prisma.questParticipant.findUnique({
      where: { questId_userId: { questId, userId: req.user.id } },
      select: { status: true, score: true, rank: true },
    });

    res.json({
      submission,
      isCorrect,
      pointsAwarded,
      questCompleted: updatedParticipant?.status === 'completed',
      currentScore: updatedParticipant?.score,
      currentRank: updatedParticipant?.rank,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { submitTask };