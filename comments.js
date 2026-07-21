const express = require('express');
const router = express.Router();
const db = require('../db/client');
const { commentLimiter } = require('../middleware/rateLimit');
const { sanitizeText } = require('../utils/validate');

// GET /api/comments/:episodeId — newest first, as specced.
router.get('/:episodeId', async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'SELECT id, nickname, body, created_at FROM comments WHERE episode_id = ? ORDER BY created_at DESC',
      args: [req.params.episodeId],
    });
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load comments.' });
  }
});

// POST /api/comments/:episodeId — nickname optional, body required.
router.post('/:episodeId', commentLimiter, async (req, res) => {
  try {
    const { nickname, body } = req.body || {};
    const cleanBody = sanitizeText(body, 500);
    if (!cleanBody) return res.status(400).json({ error: 'Write something before posting.' });

    const cleanNickname = sanitizeText(nickname, 40) || 'Anonymous';

    const result = await db.execute({
      sql: 'INSERT INTO comments (episode_id, nickname, body) VALUES (?, ?, ?)',
      args: [req.params.episodeId, cleanNickname, cleanBody],
    });

    res.status(201).json({
      id: Number(result.lastInsertRowid),
      nickname: cleanNickname,
      body: cleanBody,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not post your comment.' });
  }
});

module.exports = router;
