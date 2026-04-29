async function handleTonPayment(req, res) {
  try {
    const { rewardId, transactionHash, status } = req.body;
    
    const secret = req.headers['x-webhook-secret'];
    if (secret !== process.env.WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (status === 'success') {
      const { count } = await prisma.reward.updateMany({
        where: { id: rewardId, status: { in: ['pending', 'processing'] } },
        data: { status: 'distributed', transactionHash, distributedAt: new Date() },
      });
    } else {
      await prisma.reward.updateMany({
        where: { id: rewardId },
        data: { status: 'failed' },
      });
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}