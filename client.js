// Single shared libSQL client.
//
// If TURSO_DATABASE_URL is unset, we fall back to a local SQLite file
// (./local.db) so the whole backend can be developed and tested with
// zero cloud setup and zero network access. The exact same client API
// (execute / batch) works identically against both — only the `url`
// changes for production.
const { createClient } = require('@libsql/client');

const url = process.env.TURSO_DATABASE_URL && process.env.TURSO_DATABASE_URL.trim()
  ? process.env.TURSO_DATABASE_URL.trim()
  : 'file:local.db';

const authToken = process.env.TURSO_AUTH_TOKEN && process.env.TURSO_AUTH_TOKEN.trim()
  ? process.env.TURSO_AUTH_TOKEN.trim()
  : undefined;

const client = createClient({ url, authToken });

module.exports = client;
