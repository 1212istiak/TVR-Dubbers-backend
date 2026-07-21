const jwt = require('jsonwebtoken');

// Applied once at the router-mount level for everything under /api/admin
// (except /api/admin/login itself, which is how you get the token).
function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing admin session — please log in again.' });
  }
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not set — refusing all admin requests until it is.');
    return res.status(500).json({ error: 'Server auth is not configured yet.' });
  }

  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Your admin session expired — please log in again.' });
  }
}

module.exports = { requireAdmin };
