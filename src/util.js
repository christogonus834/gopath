const crypto = require('crypto');

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const bad = (message, status = 400) => new HttpError(status, message);

// Lets async route handlers throw without a try/catch in every one.
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Unwraps a supabase-js result or throws a readable error.
const ok = ({ data, error }) => {
  if (error) {
    if (error.code === '23503') throw bad('That record is still in use, or the linked record does not exist.', 409);
    if (error.code === '23505') throw bad('That already exists.', 409);
    if (error.code === '22P02') throw bad('Invalid value.');
    console.error('[db]', error);
    throw bad('Database error', 500);
  }
  return data;
};

// Keeps only the allowed fields and converts them to the right type.
function clean(body = {}, fields) {
  const out = {};
  for (const [k, type] of Object.entries(fields)) {
    if (!(k in body)) continue;
    let v = body[k];
    if (type === 'bool') v = v === true || v === 'true' || v === 1;
    else if (type === 'int') v = Number.parseInt(v, 10) || 0;
    else {
      v = v == null ? '' : String(v).trim();
      if (v.length > 8000) throw bad(`${k} is too long`);
      if (v === '') v = null;
    }
    out[k] = v;
  }
  return out;
}

const isEmail = s => typeof s === 'string' && s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const randomToken = () => crypto.randomBytes(32).toString('hex');
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeName = s => String(s || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);

// cols: [[row => value, 'Header'], ...]
function toCsv(rows, cols) {
  const q = v => {
    let s = v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // stops spreadsheet formula injection
    return '"' + s.replace(/"/g, '""') + '"';
  };
  return [cols.map(c => q(c[1])).join(','), ...rows.map(r => cols.map(c => q(c[0](r))).join(','))].join('\r\n');
}

module.exports = { HttpError, bad, wrap, ok, clean, isEmail, randomToken, sha, esc, safeName, toCsv };
