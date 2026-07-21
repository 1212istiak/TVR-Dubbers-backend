-- TVR Dubbers database schema (Turso / SQLite-compatible)
-- Applied by db/migrate.js — safe to run repeatedly (IF NOT EXISTS everywhere).
--
-- Deviations from a bare-minimum schema, and why:
--   - `updated_at` on episodes: lets the admin panel show "last edited" info later.
--   - Indices: the frontend always sorts episodes by newest-first and filters by
--     genre/special, and comments/reactions are always looked up by episode —
--     these are the queries that matter once the catalog grows past a handful
--     of rows, so they're indexed from day one rather than retrofitted.
--   - ON DELETE CASCADE on comments/reactions: belt-and-suspenders alongside the
--     explicit cleanup delete in routes/admin.js — if one mechanism is ever
--     skipped, the other still prevents orphaned rows.

CREATE TABLE IF NOT EXISTS episodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  episode_number INTEGER NOT NULL,
  season INTEGER DEFAULT 1,
  genre TEXT,
  thumbnail_url TEXT,
  primary_server_url TEXT,
  backup_server_url TEXT,
  is_special INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  view_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_episodes_created_at ON episodes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_episodes_genre       ON episodes(genre);
CREATE INDEX IF NOT EXISTS idx_episodes_is_special  ON episodes(is_special);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  episode_id INTEGER NOT NULL,
  nickname TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comments_episode_id ON comments(episode_id);

CREATE TABLE IF NOT EXISTS reactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  episode_id INTEGER NOT NULL,
  visitor_id TEXT NOT NULL,
  reaction_type TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(episode_id, visitor_id),
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reactions_episode_id ON reactions(episode_id);

-- Free-form key/value site settings: website_title, motto,
-- special_folder_thumbnail, special_folder_label, countdown_target_date,
-- facebook_url, youtube_url, telegram_group_url, telegram_channel_url,
-- whatsapp_number, instagram_url, dailymotion_url, rumble_url.
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS trailer (
  id INTEGER PRIMARY KEY,
  title TEXT,
  genre TEXT,
  thumbnail_url TEXT,
  primary_server_url TEXT,
  backup_server_url TEXT
);

CREATE TABLE IF NOT EXISTS voice_artists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS admin (
  id INTEGER PRIMARY KEY,
  password_hash TEXT NOT NULL
);
