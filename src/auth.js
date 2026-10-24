const jwt = require('jsonwebtoken');
const db = require('./db');
const { ok, randomToken, sha } = require('./util');

const sign = u => jwt.sign({ sub: u.id, role: u.role }, process.env.JWT_SECRET, { expiresIn: '7d', algorithm: 'HS256' });
const publicUser = u => ({ id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone, profession: u.profession, destination: u.destination });

async function requireAuth(req, res, next) {
  try {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'Please sign in.' });
    const p = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    const { data: u } = await db.from('users').select('id,name,email,role,active,phone,profession,destination').eq('id', p.sub).maybeSingle();
    if (!u || !u.active) return res.status(401).json({ error: 'Please sign in.' });
    req.user = u;
    next();
  } catch {
    res.status(401).json({ error: 'Please sign in.' });
  }
}

const requireRole = role => (req, res, next) =>
  req.user && req.user.role === role ? next() : res.status(403).json({ error: 'Not allowed.' });

// Single-use link token for "set password" and "reset password" emails. Only the hash is stored.
async function makeToken(userId, purpose, hours) {
  const raw = randomToken();
  ok(await db.from('password_tokens').insert({
    user_id: userId,
    token_hash: sha(raw),
    purpose,
    expires_at: new Date(Date.now() + hours * 3600e3).toISOString(),
  }));
  return raw;
}

module.exports = { sign, publicUser, requireAuth, requireRole, makeToken };
