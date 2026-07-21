const express = require('express');
const router = express.Router();
const db = require('../db/client');

// GET /api/episodes?genre=Action&search=battle&special=1&limit=50&offset=0
// Powers both the main grid and the live search dropdown (search + a small
// limit). Newest-first, matching "Newest upload appears on top."
router.get('/', async (req, res) => {
  try {
    const { genre, search, special, limit, offset } = req.query;
    let sql = 'SELECT * FROM episodes WHERE 1=1';
    const args = [];

    if (genre) {
      sql += ' AND genre = ?';
      args.push(genre);
    }
    if (search) {
      sql += ' AND title LIKE ?';
      args.push(`%${search}%`);
    }
    if (special === '1' || special === 'true') {
      sql += ' AND is_special = 1';
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const safeLimit = Math.min(Number(limit) || 50, 100);
    const safeOffset = Number(offset) || 0;
    args.push(safeLimit, safeOffset);

    const result = await db.execute({ sql, args });
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load episodes.' });
  }
});

// GET /api/episodes/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await db.execute({ sql: 'SELECT * FROM episodes WHERE id = ?', args: [req.params.id] });
    const episode = result.rows[0];
    if (!episode) return res.status(404).json({ error: 'Episode not found.' });

    // Fire-and-forget view count bump — never blocks or fails the response.
    db.execute({ sql: 'UPDATE episodes SET view_count = view_count + 1 WHERE id = ?', args: [req.params.id] })
      .catch((err) => console.error('View count update failed:', err));

    res.json(episode);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load that episode.' });
  }
});

module.exports = router;
