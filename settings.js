const express = require('express');
const router = express.Router();
const db = require('../db/client');

// GET /api/settings — flattened key/value map, used for the site title,
// motto, social links, countdown target, and special folder tile.
router.get('/', async (req, res) => {
  try {
    const result = await db.execute({ sql: 'SELECT key, value FROM settings' });
    const settings = {};
    for (const row of result.rows) settings[row.key] = row.value;
    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load site settings.' });
  }
});

module.exports = router;
