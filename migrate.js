// Applies schema.sql to whatever database db/client.js is pointed at
// (local file by default, or Turso once TURSO_DATABASE_URL is set).
// Safe to re-run — every statement is CREATE ... IF NOT EXISTS.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./client');

async function migrate() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

  // Split into individual statements for client.batch(). This is a plain
  // semicolon split rather than a real SQL parser, which is fine here
  // because we own schema.sql and none of its statements contain a
  // semicolon inside a string or comment — but if you hand-edit the
  // schema later, keep that assumption in mind.
  //
  // Each chunk has its full-line `--` comments stripped before the
  // emptiness check, so a statement preceded by a comment block (like
  // the header comment above `episodes`, or the settings-keys comment
  // above `settings`) doesn't get thrown away as if it were just a
  // comment.
  const statements = schema
    .split(';')
    .map((chunk) =>
      chunk
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .trim()
    )
    .filter((s) => s.length > 0);

  await db.batch(statements, 'write');
  console.log(`✓ Schema applied (${statements.length} statements) against ${process.env.TURSO_DATABASE_URL ? 'Turso' : 'local.db'}`);
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
