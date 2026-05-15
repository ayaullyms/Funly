const prisma = require('../config/prisma');
const { sendTgMessage } = require('../utils/telegram');

async function sendQuestEndReminders() {
  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const in23h = new Date(Date.now() + 23 * 60 * 60 * 1000);

  const quests = await prisma.quest.findMany({
    where: {
      status: 'active',
      endDate: { gte: in23h, lte: in24h },
    },
  });

  for (const quest of quests) {
    const totalTasks = await prisma.task.count({ where: { questId: quest.id } });

    const participants = await prisma.questParticipant.findMany({
      where: { questId: quest.id, status: { not: 'completed' } },
      include: { user: { select: { telegramId: true } } },
    });

    for (const p of participants) {
      const submitted = await prisma.taskSubmission.count({
        where: { questId: quest.id, userId: p.userId },
      });
      if (submitted >= totalTasks) continue; 

      await sendTgMessage(p.user.telegramId,
        `<b>Quest ends soon!</b>\n\n"${quest.title}"\n\nYou still have unfinished tasks. Complete them before time runs out.`
      );
    }
  }
}

module.exports = { sendQuestEndReminders };