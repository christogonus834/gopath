const express = require('express');
const db = require('../db');
const { wrap, ok } = require('../util');
const { requireAuth } = require('../auth');

const r = express.Router();
r.use(requireAuth);

r.get('/', wrap(async (req, res) => {
  const items = ok(await db.from('notifications').select('id,title,body,link,read,created_at')
    .eq('user_id', req.user.id).order('created_at', { ascending: false }).limit(30));
  const { count } = await db.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', req.user.id).eq('read', false);
  res.json({ items, unread: count || 0 });
}));

// Body { id } marks one as read; no id marks all.
r.post('/read', wrap(async (req, res) => {
  let q = db.from('notifications').update({ read: true }).eq('user_id', req.user.id).eq('read', false);
  if (req.body.id) q = q.eq('id', req.body.id);
  ok(await q);
  res.json({ ok: true });
}));

module.exports = r;
