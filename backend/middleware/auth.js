//middleware/auth.js

const crypto = require('crypto');
const prisma = require('../config/prisma');

/**
 * Validates Telegram Mini App initData
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
function validateTelegramInitData(initData) {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  if (!hash) return null;

  urlParams.delete('hash');

  const dataCheckString = Array.from(urlParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(process.env.TELEGRAM_BOT_TOKEN)
    .digest();

  const hmac = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (hmac !== hash) return null;

  const user = JSON.parse(urlParams.get('user') || '{}');
  return user;
}

//  Main auth middleware — validates initData and attaches user to req
async function authMiddleware(req, res, next) {
  try {
    const initData = req.headers['x-telegram-init-data'];

    if (!initData) {
      return res.status(401).json({ error: 'Missing Telegram initData' });
    }

    // In development, allow mock auth
    let telegramUser;
    if (process.env.NODE_ENV === 'development' && initData === 'dev_mock') {
      telegramUser = { id: 123456789, username: 'devuser', first_name: 'Dev', last_name: 'User' };
    } else {
      telegramUser = validateTelegramInitData(initData);
      if (!telegramUser) {
        return res.status(401).json({ error: 'Invalid Telegram initData' });
      }
    }

    // Upsert user via Prisma
    const user = await prisma.user.upsert({
      where: { telegramId: BigInt(telegramUser.id) },
      update: {
        username: telegramUser.username ?? undefined,
        firstName: telegramUser.first_name ?? undefined,
        lastName: telegramUser.last_name ?? undefined,
        photoUrl: telegramUser.photo_url ?? undefined,
      },
      create: {
        telegramId: BigInt(telegramUser.id),
        username: telegramUser.username ?? null,
        firstName: telegramUser.first_name ?? null,
        lastName: telegramUser.last_name ?? null,
        photoUrl: telegramUser.photo_url ?? null,
      },
    });

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
}


// Admin-only middleware (use after authMiddleware)

function adminMiddleware(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { authMiddleware, adminMiddleware };