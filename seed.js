// Populates a freshly-migrated database with:
//   1. an admin account (password from ADMIN_SEED_PASSWORD, or a generated one)
//   2. default site settings (matching the values already in the spec)
//   3. the starting voice artist roster
//   4. one clearly-marked demo episode, so the grid isn't empty on first load
//
// Safe to re-run: every step checks for existing rows first.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('./client');

const VOICE_ARTISTS = [
  'Md Afsin', 'Argho Shekhar', 'Yousa Mahin', 'Redwan Ahmed', 'Amjad Hussain',
  'Meherima Jahan', 'Saurav Talukder', 'Shehzana Rahman', 'Bushrath Jahan',
  'Kamonika Paul', 'Sabrina Ahmed',
];

// NOTE on telegram_group_url vs telegram_channel_url: the spec mentions a
// general "Telegram" social link (t.me/TVR_Dubbers) alongside a separate
// "Contact us on Telegram / Official Telegram Channel" line in the footer.
// I've modeled these as two settings keys so you can point them at two
// different destinations (e.g. a discussion group vs. a broadcast channel)
// if that's what you meant — both default to the same link for now, and
// either can be changed independently from Site Settings → Update Links.
const DEFAULT_SETTINGS = {
  website_title: 'TVR Dubbers',
  motto: 'We Believe in Quality',
  special_folder_thumbnail: '',
  special_folder_label: 'Season 1 · New Episodes Weekly',
  countdown_target_date: '',
  facebook_url: 'https://facebook.com/dubtvr',
  youtube_url: 'https://youtube.com/@tvr_dubbers',
  telegram_group_url: 'https://t.me/TVR_Dubbers',
  telegram_channel_url: 'https://t.me/TVR_Dubbers',
  whatsapp_number: '',
  instagram_url: '',
  dailymotion_url: '',
  rumble_url: '',
};

async function seedAdmin() {
  const existing = await db.execute({ sql: 'SELECT id FROM admin WHERE id = 1', args: [] });
  if (existing.rows.length > 0) {
    console.log('· Admin account already exists — skipping.');
    return;
  }

  const usedProvidedPassword = Boolean(process.env.ADMIN_SEED_PASSWORD && process.env.ADMIN_SEED_PASSWORD.trim());
  const seedPassword = usedProvidedPassword
    ? process.env.ADMIN_SEED_PASSWORD.trim()
    : crypto.randomBytes(9).toString('base64url');

  const hash = await bcrypt.hash(seedPassword, 12);
  await db.execute({ sql: 'INSERT INTO admin (id, password_hash) VALUES (1, ?)', args: [hash] });

  if (usedProvidedPassword) {
    console.log('✓ Admin account created using ADMIN_SEED_PASSWORD from your .env');
  } else {
    console.log('─────────────────────────────────────────────────────────');
    console.log('  No ADMIN_SEED_PASSWORD set — generated one for you:');
    console.log(`  ${seedPassword}`);
    console.log('  Log in once with this (5 quick taps/clicks on the site');
    console.log('  title), then change it immediately from Site Settings →');
    console.log('  Change Password. This will not be printed again.');
    console.log('─────────────────────────────────────────────────────────');
  }
}

async function seedSettings() {
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.execute({
      sql: 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING',
      args: [key, value],
    });
  }
  console.log('✓ Default settings in place');
}

async function seedVoiceArtists() {
  const existing = await db.execute({ sql: 'SELECT COUNT(*) as c FROM voice_artists', args: [] });
  if (Number(existing.rows[0].c) > 0) {
    console.log('· Voice artist roster already has entries — skipping.');
    return;
  }
  for (let i = 0; i < VOICE_ARTISTS.length; i++) {
    await db.execute({
      sql: 'INSERT INTO voice_artists (name, display_order) VALUES (?, ?)',
      args: [VOICE_ARTISTS[i], i],
    });
  }
  console.log(`✓ Seeded ${VOICE_ARTISTS.length} voice artists`);
}

async function seedDemoEpisode() {
  const existing = await db.execute({ sql: 'SELECT COUNT(*) as c FROM episodes', args: [] });
  if (Number(existing.rows[0].c) > 0) {
    console.log('· Episodes table already has entries — skipping demo episode.');
    return;
  }
  // Deliberately placeholder: I don't have real Dailymotion/Rumble URLs for
  // your actual episodes, so this is here purely so the grid isn't empty on
  // first load. Delete it from the admin panel once you've uploaded real
  // episodes — its embed URLs are left blank on purpose (a null server URL
  // shows a "coming soon" state in the player rather than a broken embed).
  await db.execute({
    sql: `INSERT INTO episodes (title, episode_number, season, genre, thumbnail_url, primary_server_url, backup_server_url, is_special)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      '[DEMO] Battle Through the Heavens — Episode 1',
      1, 1, 'Martial Arts',
      'https://placehold.co/400x225/0a0a12/00e5ff?text=TVR+Dubbers',
      null, null, 1,
    ],
  });
  console.log('✓ Added one demo episode (replace via the admin panel)');
}

async function seed() {
  await seedAdmin();
  await seedSettings();
  await seedVoiceArtists();
  await seedDemoEpisode();
  console.log('\nDone. Start the API with `npm start` (or `npm run dev`).');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
