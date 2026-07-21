const rateLimit = require('express-rate-limit');

// Spec: max 5 login attempts per 15 minutes.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Wait a few minutes and try again.' },
});

// Spec: max 3 comments per minute per IP.
const commentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Slow down — you can post again in a moment.' },
});

// NOTE: this is in-memory, so limits reset if the Render instance restarts,
// and won't be shared across multiple instances. Fine for a single free-tier
// web service (which is what this project deploys to); if you ever scale to
// more than one instance, swap in a shared store like rate-limit-redis.
module.exports = { loginLimiter, commentLimiter };
