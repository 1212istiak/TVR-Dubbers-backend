const express = require('express');
const router = express.Router();
const db = require('../db/client');

// GET /api/voice-artists — ordered list for the footer credits box.
router.get('/', async (req, res) => {
  try {
    const result = await db.execute({ sql: 'SELECT id, name FROM voice_artists ORDER BY display_order ASC, id ASC' });
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load voice artists.' });
  }
});

module.exports = router;
