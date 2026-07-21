require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const { requireAdmin } = require('./middleware/auth');

const episodesRouter = require('./routes/episodes');
const trailerRouter = require('./routes/trailer');
const commentsRouter = require('./routes/comments');
const reactionsRouter = require('./routes/reactions');
const settingsRouter = require('./routes/settings');
const voiceArtistsRouter = require('./routes/voiceArtists');
const loginRouter = require('./routes/login');
const adminRouter = require('./routes/admin');
const shareRouter = require('./routes/share');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || '*' }));
app.use(express.json({ limit: '1mb' }));

// Render's free tier spins down after 15 minutes idle; this gives you (or
// an uptime pinger) something cheap to hit to keep it warm, or just to
// check it's alive after a deploy.
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Public, resource-named routes — nothing here overlaps with /api/admin,
// so there's no ambiguity about which router handles a given path.
app.use('/api/episodes', episodesRouter);
app.use('/api/trailer', trailerRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/reactions', reactionsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/voice-artists', voiceArtistsRouter);

// Admin: login is intentionally mounted at the more specific path FIRST
// and is not gated; everything else under /api/admin IS gated, applied
// once here rather than per-route inside admin.js.
app.use('/api/admin/login', loginRouter);
app.use('/api/admin', requireAdmin, adminRouter);

// Social-preview proxy for static-site OG tags — see routes/share.js.
app.use('/share', shareRouter);

app.use((req, res) => res.status(404).json({ error: 'Not found.' }));

// Centralized error handler — catches anything a route handler throws
// synchronously (async errors are already caught per-route above).
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our end.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`TVR Dubbers API listening on port ${PORT}`);
  if (!process.env.TURSO_DATABASE_URL) {
    console.log('→ No TURSO_DATABASE_URL set — using local file DB (backend/local.db).');
  }
});
