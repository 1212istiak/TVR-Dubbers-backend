const express = require('express');
const router = express.Router();
const db = require('../db/client');

// GET /api/trailer — powers the "Upcoming Episode" button on the hero.
router.get('/', async (req, res) => {
  try {
    const result = await db.execute({ sql: 'SELECT * FROM trailer WHERE id = 1' });
    res.json(result.rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load the trailer.' });
  }
});

module.exports = router;
