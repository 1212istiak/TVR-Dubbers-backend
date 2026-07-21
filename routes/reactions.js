const express = require('express');
const router = express.Router();
const db = require('../db/client');

// Emoji ↔ storage-key mapping (kept as plain ASCII keys in the DB —
// the emoji themselves are purely a frontend rendering concern).
//   heart = ❤   fire = 🔥   laugh = 🤣   cry = 😢
const VALID_REACTIONS = ['heart', 'fire', 'laugh', 'cry'];

// GET /api/reactions/:episodeId — counts per type, for the tile/modal badges.
router.get('/:episodeId', async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'SELECT reaction_type, COUNT(*) as count FROM reactions WHERE episode_id = ? GROUP BY reaction_type',
      args: [req.params.episodeId],
    });
    const counts = { heart: 0, fire: 0, laugh: 0, cry: 0 };
    for (const row of result.rows) counts[row.reaction_type] = Number(row.count);
    res.json(counts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load reactions.' });
  }
});

// POST /api/reactions/:episodeId  { visitor_id, reaction_type }
// One reaction per visitor per episode, enforced by the UNIQUE(episode_id,
// visitor_id) constraint — we let the DB be the source of truth rather than
// pre-checking-then-inserting, which avoids a race between the two steps.
router.post('/:episodeId', async (req, res) => {
  try {
    const { visitor_id, reaction_type } = req.body || {};
    if (!visitor_id || typeof visitor_id !== 'string' || !VALID_REACTIONS.includes(reaction_type)) {
      return res.status(400).json({ error: 'Invalid reaction.' });
    }

    await db.execute({
      sql: 'INSERT INTO reactions (episode_id, visitor_id, reaction_type) VALUES (?, ?, ?)',
      args: [req.params.episodeId, visitor_id, reaction_type],
    });
    res.status(201).json({ message: 'Reaction recorded.' });
  } catch (err) {
    if (String(err.message || '').toLowerCase().includes('unique')) {
      return res.status(409).json({ error: "You've already reacted to this episode." });
    }
    console.error(err);
    res.status(500).json({ error: 'Could not record your reaction.' });
  }
});

module.exports = router;
