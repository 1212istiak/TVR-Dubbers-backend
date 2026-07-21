// Every route in this file sits behind requireAdmin, applied once where
// this router is mounted in server.js — so req.admin is always available
// and none of these handlers need to check auth themselves.
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/client');
const { parseEmbedUrl } = require('../utils/embedUrl');
const { sanitizeText, isValidImageUrl } = require('../utils/validate');

const ALLOWED_SETTINGS_KEYS = [
  'website_title', 'motto', 'special_folder_thumbnail', 'special_folder_label',
  'countdown_target_date', 'facebook_url', 'youtube_url', 'telegram_group_url',
  'telegram_channel_url', 'whatsapp_number', 'instagram_url', 'dailymotion_url', 'rumble_url',
];

function validateEmbeds({ primary_server_url, backup_server_url }) {
  const out = { primaryEmbed: null, backupEmbed: null, error: null };
  if (primary_server_url) {
    const parsed = parseEmbedUrl(primary_server_url);
    if (!parsed) { out.error = 'Primary server URL must be a valid Dailymotion or Rumble link, embed URL, or embed code.'; return out; }
    out.primaryEmbed = parsed.embedUrl;
  }
  if (backup_server_url) {
    const parsed = parseEmbedUrl(backup_server_url);
    if (!parsed) { out.error = 'Backup server URL must be a valid Dailymotion or Rumble link, embed URL, or embed code.'; return out; }
    out.backupEmbed = parsed.embedUrl;
  }
  return out;
}

// ───────────────────────── Change password ─────────────────────────
router.post('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both current and new password are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    }
    const result = await db.execute({ sql: 'SELECT * FROM admin WHERE id = 1' });
    const admin = result.rows[0];
    const valid = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect.' });

    const newHash = await bcrypt.hash(newPassword, 12);
    await db.execute({ sql: 'UPDATE admin SET password_hash = ? WHERE id = 1', args: [newHash] });
    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update password.' });
  }
});

// ───────────────────────── Episodes ─────────────────────────
router.post('/episodes', async (req, res) => {
  try {
    const { title, episode_number, season, genre, thumbnail_url, primary_server_url, backup_server_url, is_special } = req.body || {};
    if (!title || !String(title).trim() || !episode_number) {
      return res.status(400).json({ error: 'Title and episode number are required.' });
    }
    if (thumbnail_url && !isValidImageUrl(thumbnail_url)) {
      return res.status(400).json({ error: 'Thumbnail URL must be a valid image URL.' });
    }
    const { primaryEmbed, backupEmbed, error } = validateEmbeds(req.body || {});
    if (error) return res.status(400).json({ error });

    const result = await db.execute({
      sql: `INSERT INTO episodes (title, episode_number, season, genre, thumbnail_url, primary_server_url, backup_server_url, is_special)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        sanitizeText(title, 150),
        Number(episode_number),
        Number(season) || 1,
        genre || null,
        thumbnail_url || null,
        primaryEmbed,
        backupEmbed,
        is_special ? 1 : 0,
      ],
    });
    res.status(201).json({ message: 'Saved successfully ✓', id: Number(result.lastInsertRowid) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not save the episode.' });
  }
});

router.put('/episodes/:id', async (req, res) => {
  try {
    const existingResult = await db.execute({ sql: 'SELECT * FROM episodes WHERE id = ?', args: [req.params.id] });
    const existing = existingResult.rows[0];
    if (!existing) return res.status(404).json({ error: 'Episode not found.' });

    const { title, episode_number, season, genre, thumbnail_url, primary_server_url, backup_server_url, is_special } = req.body || {};

    if (thumbnail_url && !isValidImageUrl(thumbnail_url)) {
      return res.status(400).json({ error: 'Thumbnail URL must be a valid image URL.' });
    }
    let primaryEmbed = existing.primary_server_url;
    let backupEmbed = existing.backup_server_url;
    if (primary_server_url !== undefined) {
      const { primaryEmbed: pe, error } = validateEmbeds({ primary_server_url });
      if (error) return res.status(400).json({ error });
      primaryEmbed = pe;
    }
    if (backup_server_url !== undefined) {
      const { backupEmbed: be, error } = validateEmbeds({ backup_server_url });
      if (error) return res.status(400).json({ error });
      backupEmbed = be;
    }

    await db.execute({
      sql: `UPDATE episodes SET title = ?, episode_number = ?, season = ?, genre = ?,
            thumbnail_url = ?, primary_server_url = ?, backup_server_url = ?, is_special = ?,
            updated_at = datetime('now')
            WHERE id = ?`,
      args: [
        title ? sanitizeText(title, 150) : existing.title,
        episode_number ? Number(episode_number) : existing.episode_number,
        season ? Number(season) : existing.season,
        genre !== undefined ? genre : existing.genre,
        thumbnail_url !== undefined ? thumbnail_url : existing.thumbnail_url,
        primaryEmbed,
        backupEmbed,
        is_special !== undefined ? (is_special ? 1 : 0) : existing.is_special,
        req.params.id,
      ],
    });
    res.json({ message: 'Saved successfully ✓' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update the episode.' });
  }
});

router.delete('/episodes/:id', async (req, res) => {
  try {
    // Explicit cleanup alongside the schema's ON DELETE CASCADE — see the
    // note in db/schema.sql for why both exist.
    await db.execute({ sql: 'DELETE FROM comments WHERE episode_id = ?', args: [req.params.id] });
    await db.execute({ sql: 'DELETE FROM reactions WHERE episode_id = ?', args: [req.params.id] });
    const result = await db.execute({ sql: 'DELETE FROM episodes WHERE id = ?', args: [req.params.id] });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Episode not found.' });
    res.json({ message: 'Deleted successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete the episode.' });
  }
});

// ───────────────────────── Trailer ─────────────────────────
router.put('/trailer', async (req, res) => {
  try {
    const { title, genre, thumbnail_url } = req.body || {};
    if (thumbnail_url && !isValidImageUrl(thumbnail_url)) {
      return res.status(400).json({ error: 'Thumbnail URL must be a valid image URL.' });
    }
    const { primaryEmbed, backupEmbed, error } = validateEmbeds(req.body || {});
    if (error) return res.status(400).json({ error });

    await db.execute({
      sql: `INSERT INTO trailer (id, title, genre, thumbnail_url, primary_server_url, backup_server_url)
            VALUES (1, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              title = excluded.title, genre = excluded.genre, thumbnail_url = excluded.thumbnail_url,
              primary_server_url = excluded.primary_server_url, backup_server_url = excluded.backup_server_url`,
      args: [title ? sanitizeText(title, 150) : null, genre || null, thumbnail_url || null, primaryEmbed, backupEmbed],
    });
    res.json({ message: 'Saved successfully ✓' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not save the trailer.' });
  }
});

// ───────────────────────── Site settings & links ─────────────────────────
router.put('/settings', async (req, res) => {
  try {
    const updates = req.body || {};
    const entries = Object.entries(updates).filter(([key]) => ALLOWED_SETTINGS_KEYS.includes(key));
    if (entries.length === 0) return res.status(400).json({ error: 'No recognized settings were provided.' });

    for (const [key, value] of entries) {
      await db.execute({
        sql: 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        args: [key, sanitizeText(String(value ?? ''), 300)],
      });
    }
    res.json({ message: 'Saved successfully ✓' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not save settings.' });
  }
});

// ───────────────────────── Voice artists ─────────────────────────
router.post('/voice-artists', async (req, res) => {
  try {
    const name = sanitizeText((req.body || {}).name, 80);
    if (!name) return res.status(400).json({ error: 'Name is required.' });

    const countResult = await db.execute({ sql: 'SELECT COUNT(*) as c FROM voice_artists' });
    const order = Number(countResult.rows[0].c);
    const result = await db.execute({
      sql: 'INSERT INTO voice_artists (name, display_order) VALUES (?, ?)',
      args: [name, order],
    });
    res.status(201).json({ id: Number(result.lastInsertRowid), name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not add voice artist.' });
  }
});

router.delete('/voice-artists/:id', async (req, res) => {
  try {
    const result = await db.execute({ sql: 'DELETE FROM voice_artists WHERE id = ?', args: [req.params.id] });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Voice artist not found.' });
    res.json({ message: 'Deleted successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete voice artist.' });
  }
});

// ───────────────────────── Comment moderation ─────────────────────────
router.get('/comments', async (req, res) => {
  try {
    const result = await db.execute({
      sql: `SELECT c.id, c.episode_id, e.title as episode_title, c.nickname, c.body, c.created_at
            FROM comments c LEFT JOIN episodes e ON e.id = c.episode_id
            ORDER BY c.episode_id, c.created_at DESC`,
    });
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load comments.' });
  }
});

router.delete('/comments/:id', async (req, res) => {
  try {
    const result = await db.execute({ sql: 'DELETE FROM comments WHERE id = ?', args: [req.params.id] });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Comment not found.' });
    res.json({ message: 'Comment deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete comment.' });
  }
});

module.exports = router;
