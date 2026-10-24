// Creates (or resets) the admin account from ADMIN_EMAIL / ADMIN_PASSWORD in .env
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../src/db');

(async () => {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  const name = process.env.ADMIN_NAME || 'Admin';
  if (!email || password.length < 8) {
    console.error('Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 8 characters in .env first.');
    process.exit(1);
  }
  const password_hash = await bcrypt.hash(password, 10);
  const { error } = await db.from('users').upsert({ email, name, password_hash, role: 'admin', active: true }, { onConflict: 'email' });
  if (error) { console.error(error.message); process.exit(1); }
  console.log(`Admin ready: ${email}`);
})();
