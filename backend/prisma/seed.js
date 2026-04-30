const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding...');

  const adminTelegramId = BigInt(process.env.ADMIN_TELEGRAM_ID || '123456789');
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminFirstName = process.env.ADMIN_FIRST_NAME || 'Admin';

  const admin = await prisma.user.upsert({
    where: { telegramId: adminTelegramId },
    update: { role: 'admin' },
    create: {
      telegramId: adminTelegramId,
      username: adminUsername,
      firstName: adminFirstName,
      role: 'admin',
    },
  });
  console.log('✅ Admin:', admin.firstName);

  const questTitle = process.env.SEED_QUEST_TITLE || 'Welcome Quest';
  let quest = await prisma.quest.findFirst({
    where: { title: questTitle, createdBy: admin.id },
  });

  if (!quest) {
    quest = await prisma.quest.create({
      data: {
        title: questTitle,
        shortDescription: 'Первый квест для теста',
        fullDescription: 'Выполни задания и получи награду!',
        rewardDescription: '100 TON',
        rules: 'Один ответ на задание. Без читерства.',
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'active',
        createdBy: admin.id,
      },
    });
    console.log('✅ Quest created:', quest.title);
  } else {
    console.log('ℹ️ Quest exists:', quest.title);
  }

  // Создаём задания
  const existingTasks = await prisma.task.count({ where: { questId: quest.id } });
  if (existingTasks === 0) {
    await prisma.task.createMany({
      data: [
        {
          questId: quest.id,
          title: 'Что такое TON?',
          description: 'Напиши полное название TON (3 слова на английском)',
          taskType: 'quiz',
          correctAnswer: 'the open network',
          points: 10,
          orderIndex: 0,
        },
        {
          questId: quest.id,
          title: 'Твой кошелёк',
          description: 'Подключи TON кошелёк через TonConnect',
          taskType: 'text',
          points: 20,
          orderIndex: 1,
        },
      ],
    });
    console.log('✅ Tasks created');
  } else {
    console.log(`ℹ️ Tasks exist: ${existingTasks}`);
  }

  console.log('\n🎉 Done!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());