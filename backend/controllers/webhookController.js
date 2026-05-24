const prisma = require('../config/prisma');
const { sendTgMessage } = require('../utils/telegram');

async function verifyTonTransaction(txHash, contractAddress) {
  if (!txHash || txHash.length > 100) return false;
  try {
    const isTestnet = process.env.TON_TESTNET === 'true';
    const base = isTestnet
      ? 'https://testnet.toncenter.com/api/v2'
      : 'https://toncenter.com/api/v2';

    const apiKey = process.env.TONCENTER_API_KEY || '';
    const headers = apiKey ? { 'X-API-Key': apiKey } : {};

    const url = `${base}/getTransactions?address=${encodeURIComponent(contractAddress)}&limit=20`;
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
    if (computeExitCode !== undefined && computeExitCode !== 0) return false;
    if (actionResultCode !== undefined && actionResultCode !== 0) return false;

    return true;
  } catch (err) {
    console.error('TonCenter verification error:', err.message);
    return false;
  }
}

async function handleTonPayment(req, res) {
  try {
    const secret = req.headers['x-webhook-secret'];
    if (!secret || secret !== process.env.WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { rewardId, transactionHash, contractAddress, status } = req.body;

    if (!rewardId) return res.status(400).json({ error: 'rewardId is required' });
    if (!status)   return res.status(400).json({ error: 'status is required' });

    if (status === 'success') {
      if (!transactionHash) {
        return res.status(400).json({ error: 'transactionHash is required' });
      }
      if (!contractAddress) {
        return res.status(400).json({ error: 'contractAddress is required' });
      }

      const isTestnet = process.env.TON_TESTNET === 'true';
      if (!isTestnet) {
        const isVerified = await verifyTonTransaction(transactionHash, contractAddress);
        if (!isVerified) {
          return res.status(400).json({ error: 'Transaction not found or failed on blockchain' });
        }
      }

      const { count } = await prisma.reward.updateMany({
        where: { id: rewardId, status: { in: ['pending', 'processing'] } },
        data: {
          status: 'distributed',
          transactionHash,
          contractAddress,
          distributedAt: new Date(),
        },
      });

      if (count === 0) {
        return res.status(400).json({ error: 'Reward already distributed or not found' });
      }

      const reward = await prisma.reward.findUnique({
        where: { id: rewardId },
        include: {
          user: { select: { telegramId: true, firstName: true, username: true } },
          quest: { select: { title: true } },
        },
      });

      if (reward) {
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

        if (reward.user.telegramId) {
          const tonscanBase = isTestnet
            ? 'https://testnet.tonscan.org'
            : 'https://tonscan.org';
          await sendTgMessage(
            reward.user.telegramId,
            `<b>Reward sent!</b>\n\n` +
            `<b>${Number(reward.amount).toFixed(2)} TON</b> has been transferred to your wallet.\n\n` +
            `<a href="${tonscanBase}/tx/${transactionHash}">View transaction ↗</a>\n\nCongrats 🎉`
          );
        }
      }

    } else {
      const { count } = await prisma.reward.updateMany({
        where: { id: rewardId, status: { in: ['pending', 'processing'] } },
        data: { status: 'failed' },
      });

      if (count === 0) {
        return res.status(400).json({ error: 'Reward already processed or not found' });
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { handleTonPayment };