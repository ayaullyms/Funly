const prisma = require('../config/prisma');

async function handleTonPayment(req, res) {
  try {
    const { rewardId, transactionHash, status } = req.body;
    
    const secret = req.headers['x-webhook-secret'];
    if (secret !== process.env.WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!rewardId) return res.status(400).json({ error: 'rewardId is required' });
    if (!status) return res.status(400).json({ error: 'status is required' });

    if (status === 'success') {
      if (!transactionHash) {
        return res.status(400).json({ error: 'transactionHash is required for success status' });
      }

      await prisma.reward.updateMany({
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

module.exports = { handleTonPayment };