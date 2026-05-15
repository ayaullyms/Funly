const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendTgMessage(telegramId, text) {
  if (!BOT_TOKEN || !telegramId) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramId.toString(),
        text,
        parse_mode: 'HTML',
      }),
    });
  } catch (e) {
    console.error('TG notify error:', e.message);
  }
}

module.exports = { sendTgMessage };