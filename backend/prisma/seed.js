const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding...');

  const admin = await prisma.user.upsert({
    where: { telegramId: BigInt(123456789) },
    update: { role: 'admin' },
    create: {
      telegramId: BigInt(123456789),
      username: 'admin',
      firstName: 'Admin',
      role: 'admin',
    },
  });
  console.log('✅ Admin:', admin.firstName);

  const quest = await prisma.quest.create({
    data: {
      title: 'Welcome Quest',
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
  console.log('✅ Quest:', quest.title);

  // Создаём задания
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
        description: 'Вставь адрес своего TON кошелька',
        taskType: 'text',
        points: 20,
        orderIndex: 1,
      },
    ],
  });
  console.log('✅ Tasks created');

  console.log('\n🎉 Done!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());