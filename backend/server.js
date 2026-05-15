require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');

const routes = require('./routes');
const { sendQuestEndReminders } = require('./jobs/questReminder');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(morgan('dev'));
app.use(cors({
  origin: function(origin, callback) {
    const allowed = [
      process.env.FRONTEND_URL,
      'https://funly-three.vercel.app',
    ].filter(Boolean);
    if (!origin) return callback(null, true);
    
    if (allowed.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

cron.schedule('0 * * * *', () => {
  sendQuestEndReminders().catch(console.error);
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
if (process.env.NODE_ENV === 'production') {
  app.use('/api', limiter);
}

app.post('/debug-auth', (req, res) => {
  const initData = req.headers['x-telegram-init-data'] || 'MISSING';
  const token = process.env.TELEGRAM_BOT_TOKEN || 'MISSING';
  const crypto = require('crypto');
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  urlParams.delete('hash');
  const dataCheckString = Array.from(urlParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  const computed = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  res.json({
    tokenLength: token.length,
    tokenFirst10: token.substring(0, 10),
    hashFromTelegram: hash,
    hashComputed: computed,
    match: hash === computed,
    initDataLength: initData.length,
  });
});

// Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// 404
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Env: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;