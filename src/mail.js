const db = require('./db');
const { esc } = require('./util');

async function setting(key, def = '') {
  const { data } = await db.from('settings').select('value').eq('key', key).maybeSingle();
  return data && data.value != null ? data.value : def;
}
const brandName = async () => (await setting('brand_a', 'GoPath')) + (await setting('brand_b', 'Legal'));
const siteUrl = (path = '') => `${(process.env.FRONTEND_URL || '').replace(/\/$/, '')}/#/${path}`;

function layout(brand, heading, paras, button) {
  const p = paras.map(t => `<p style="margin:0 0 14px;line-height:1.6">${esc(t)}</p>`).join('');
  const b = button
    ? `<p style="margin:22px 0"><a href="${esc(button.url)}" style="background:#1b6ef3;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">${esc(button.label)}</a></p>`
    : '';
  return `<!doctype html><html><body style="margin:0;background:#eef3fb;font-family:Arial,Helvetica,sans-serif;color:#1c2540">
<div style="max-width:560px;margin:0 auto;padding:24px">
<div style="background:#0b1f4b;color:#fff;padding:18px 24px;border-radius:12px 12px 0 0;font-size:20px;font-weight:700">${esc(brand)}</div>
<div style="background:#fff;padding:28px 24px;border-radius:0 0 12px 12px">
<h2 style="margin:0 0 16px;color:#0b1f4b;font-size:20px">${esc(heading)}</h2>${p}${b}
<p style="margin:24px 0 0;font-size:12px;color:#5b6785">We never ask for payment by message, gift card or crypto.</p>
</div></div></body></html>`;
}

const BREVO = 'https://api.brevo.com/v3';

// One place that talks to Brevo. Never throws; always returns { ok, status, data }.
async function brevo(path, { method = 'GET', body } = {}) {
  try {
    const r = await fetch(BREVO + path, {
      method,
      headers: { 'api-key': process.env.BREVO_API_KEY || '', 'content-type': 'application/json', accept: 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await r.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { message: text.slice(0, 200) }; }
    return { ok: r.ok, status: r.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: { message: e.message } };
  }
}

// BREVO_LIST_ID must be the list's number (Brevo > Contacts > Lists), not its name.
const listId = () => { const n = Number.parseInt(process.env.BREVO_LIST_ID, 10); return Number.isInteger(n) && n > 0 ? n : null; };
const configured = () => !!(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL);

// Sends one transactional email and reports what Brevo said.
async function deliver({ to, name, subject, heading, paras = [], button, replyTo }) {
  if (!configured()) {
    console.log(`[email not sent: set BREVO_API_KEY and BREVO_SENDER_EMAIL] to=${to} subject="${subject}"`);
    return { ok: false, status: 0, message: 'Brevo is not configured (BREVO_API_KEY or BREVO_SENDER_EMAIL is missing).' };
  }
  const brand = await brandName();
  const r = await brevo('/smtp/email', { method: 'POST', body: {
    sender: { email: process.env.BREVO_SENDER_EMAIL, name: process.env.BREVO_SENDER_NAME || brand },
    to: [{ email: to, ...(name ? { name } : {}) }],
    subject,
    htmlContent: layout(brand, heading || subject, paras, button),
    ...(replyTo ? { replyTo: { email: replyTo } } : {}),
  } });
  if (!r.ok) {
    const message = (r.data && r.data.message) || `HTTP ${r.status}`;
    console.error(`[brevo] email to ${to} failed (${r.status}): ${message}`);
    return { ok: false, status: r.status, message };
  }
  return { ok: true, status: r.status, message: 'Sent.' };
}
// Never throws and never blocks a request on a failed email.
const sendEmail = async opts => (await deliver(opts)).ok;

async function addSubscriber(email) {
  if (!process.env.BREVO_API_KEY) return;
  const id = listId();
  if (!id) { console.warn('[brevo] newsletter sign-up not sent to Brevo: BREVO_LIST_ID must be a number'); return; }
  const r = await brevo('/contacts', { method: 'POST', body: { email, listIds: [id], updateEnabled: true } });
  if (!r.ok) console.error(`[brevo] adding subscriber failed (${r.status}): ${r.data && r.data.message}`);
}

// Step-by-step health check shown in Admin > Settings.
async function brevoCheck() {
  const out = { apiKey: false, sender: false, list: null, notes: [] };
  if (!process.env.BREVO_API_KEY) { out.notes.push('BREVO_API_KEY is not set on the server.'); return out; }
  const acc = await brevo('/account');
  if (!acc.ok) {
    out.notes.push(`Brevo rejected the API key (${acc.status}): ${(acc.data && acc.data.message) || 'no details'}`);
    if (/ip/i.test((acc.data && acc.data.message) || '')) out.notes.push('Brevo is blocking this server\'s IP address. In Brevo go to Security > Authorised IPs and deactivate blocking, or add this server\'s IP.');
    return out;
  }
  out.apiKey = true;
  out.account = acc.data && acc.data.email;
  const want = String(process.env.BREVO_SENDER_EMAIL || '').toLowerCase();
  if (!want) out.notes.push('BREVO_SENDER_EMAIL is not set on the server.');
  else {
    const s = await brevo('/senders');
    const hit = s.ok && (s.data.senders || []).find(x => String(x.email).toLowerCase() === want);
    if (!s.ok) out.notes.push(`Could not read your senders (${s.status}).`);
    else if (!hit) out.notes.push(`${want} is not a sender in Brevo. Add it under Senders, domains and dedicated IPs > Senders, then verify it.`);
    else if (!hit.active) out.notes.push(`${want} exists in Brevo but is not verified yet. Open the email Brevo sent and confirm it.`);
    else out.sender = true;
  }
  if (!process.env.BREVO_LIST_ID) { out.notes.push('BREVO_LIST_ID is not set, so newsletter sign-ups are saved here but not added to Brevo.'); }
  else if (!listId()) { out.list = false; out.notes.push('BREVO_LIST_ID must be the list number from Brevo > Contacts > Lists (for example 3), not its name.'); }
  else {
    const l = await brevo('/contacts/lists/' + listId());
    out.list = l.ok;
    if (!l.ok) out.notes.push(`Brevo list ${listId()} was not found (${l.status}). Check the number in Brevo > Contacts > Lists.`);
  }
  return out;
}

// In-app notification for one user, plus an optional email.
async function notifyUser(userId, { title, body, link, email }) {
  await db.from('notifications').insert({ user_id: userId, title, body, link });
  if (!email) return;
  const { data: u } = await db.from('users').select('email,name').eq('id', userId).maybeSingle();
  if (u) sendEmail({ to: u.email, name: u.name, ...email });
}

// In-app notification for every active admin. Email goes to the "notify email" setting, or to the admins.
async function notifyAdmins({ title, body, link, email }) {
  const { data: admins } = await db.from('users').select('id,email,name').eq('role', 'admin').eq('active', true);
  if (!admins || !admins.length) return;
  await db.from('notifications').insert(admins.map(a => ({ user_id: a.id, title, body, link })));
  if (!email) return;
  const fixed = await setting('notify_email', process.env.ADMIN_NOTIFY_EMAIL || '');
  const targets = fixed ? [{ email: fixed, name: '' }] : admins;
  for (const t of targets) sendEmail({ to: t.email, name: t.name, ...email });
}

module.exports = { setting, siteUrl, sendEmail, deliver, addSubscriber, brevoCheck, configured, notifyUser, notifyAdmins };
