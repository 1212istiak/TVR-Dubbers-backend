const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/client');
const { loginLimiter } = require('../middleware/rateLimit');

// POST /api/admin/login  { password } → { token }
// Mounted at /api/admin/login WITHOUT requireAdmin (see server.js) — this
// is the one admin-namespaced route that can't itself require a token.
router.post('/', loginLimiter, async (req, res) => {
  try {
    const { password } = req.body || {};
    if (!password) return res.status(400).json({ error: 'Password is required.' });
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set.');
      return res.status(500).json({ error: 'Server auth is not configured yet.' });
    }

    const result = await db.execute({ sql: 'SELECT * FROM admin WHERE id = 1' });
    const admin = result.rows[0];
    if (!admin) return res.status(500).json({ error: 'No admin account exists yet — run the seed script.' });

    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) return res.status(401).json({ error: 'Incorrect password.' });

    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

module.exports = router;
