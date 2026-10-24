const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { wrap, ok, bad, isEmail, sha } = require('../util');
const { sign, publicUser, requireAuth, makeToken } = require('../auth');
const { sendEmail, siteUrl } = require('../mail');

const r = express.Router();
const strict = rateLimit({ windowMs: 15 * 60 * 1000, max: 25, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Please wait a few minutes.' } });
const checkPw = p => { if (typeof p !== 'string' || p.length < 8 || p.length > 100) throw bad('Password must be 8 to 100 characters.'); };

r.post('/login', strict, wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const { data: u } = await db.from('users').select('*').eq('email', email).maybeSingle();
  const good = u && u.active && u.password_hash && await bcrypt.compare(password, u.password_hash);
  if (!good) throw bad('Wrong email or password.', 401);
  res.json({ token: sign(u), user: publicUser(u) });
}));

r.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

r.post('/forgot', strict, wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!isEmail(email)) throw bad('Please enter a valid email address.');
  const { data: u } = await db.from('users').select('id,name,active').eq('email', email).maybeSingle();
  if (u && u.active) {
    const token = await makeToken(u.id, 'reset', 2);
    sendEmail({ to: email, name: u.name, subject: 'Reset your password', heading: 'Reset your password',
      paras: ['Use the button below to choose a new password. The link works for 2 hours. If you did not ask for this, ignore this email.'],
      button: { label: 'Choose a new password', url: siteUrl(`set-password?token=${token}`) } });
  }
  res.json({ message: 'If that email has an account, a reset link is on its way.' });
}));

r.post('/set-password', strict, wrap(async (req, res) => {
  checkPw(req.body.password);
  const hash = sha(String(req.body.token || ''));
  const { data: t } = await db.from('password_tokens').select('*').eq('token_hash', hash).is('used_at', null).maybeSingle();
  if (!t || new Date(t.expires_at) < new Date()) throw bad('This link has expired. Request a new one with "Forgot password".', 400);
  const user = ok(await db.from('users').update({ password_hash: await bcrypt.hash(req.body.password, 10) }).eq('id', t.user_id).select().single());
  ok(await db.from('password_tokens').update({ used_at: new Date().toISOString() }).eq('id', t.id));
  res.json({ token: sign(user), user: publicUser(user) });
}));

r.post('/change-password', requireAuth, wrap(async (req, res) => {
  checkPw(req.body.password);
  const { data: u } = await db.from('users').select('password_hash').eq('id', req.user.id).single();
  if (u.password_hash && !(await bcrypt.compare(String(req.body.current || ''), u.password_hash))) throw bad('Current password is wrong.', 401);
  ok(await db.from('users').update({ password_hash: await bcrypt.hash(req.body.password, 10) }).eq('id', req.user.id));
  res.json({ message: 'Password changed.' });
}));

module.exports = r;
