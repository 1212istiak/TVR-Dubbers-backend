#!/usr/bin/env node
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db/client');

const newPass = process.argv[2] || process.env.NEW_ADMIN_PASSWORD;
if (!newPass) {
  console.error('Usage: node reset-admin.js NEW_PASSWORD');
  process.exit(1);
}

(async () => {
  try {
    const hash = await bcrypt.hash(newPass, 12);
    await db.execute({ sql: 'UPDATE admin SET password_hash = ? WHERE id = 1', args: [hash] });
    console.log('✓ Admin password updated successfully.');
    console.log('You can now log in with the new password.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to update admin password:', err);
    process.exit(1);
  }
})();
