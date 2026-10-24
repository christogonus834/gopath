const db = require('./db');
const { esc } = require('./util');

async function setting(key, def = '') {
  const { data } = await db.from('settings').select('value').eq('key', key).maybeSingle();
  return data && data.value != null ? data.value : def;
}
const brandName = async () => (await setting('brand_a', 'Bridge')) + (await setting('brand_b', 'way'));
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

// Sends one transactional email through Brevo. Never throws: a failed email must not break the request.
async function sendEmail({ to, name, subject, heading, paras = [], button, replyTo }) {
  const brand = await brandName();
  const sender = process.env.BREVO_SENDER_EMAIL;
  if (!process.env.BREVO_API_KEY || !sender) {
    console.log(`[email not sent: Brevo not configured] to=${to} subject="${subject}"`);
    return false;
  }
  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { email: sender, name: process.env.BREVO_SENDER_NAME || brand },
        to: [{ email: to, name: name || undefined }],
        subject,
        htmlContent: layout(brand, heading || subject, paras, button),
        ...(replyTo ? { replyTo: { email: replyTo } } : {}),
      }),
    });
    if (!r.ok) { console.error('[brevo]', r.status, await r.text()); return false; }
    return true;
  } catch (e) {
    console.error('[brevo]', e.message);
    return false;
  }
}

async function addSubscriber(email) {
  if (!process.env.BREVO_API_KEY || !process.env.BREVO_LIST_ID) return;
  try {
    const r = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ email, listIds: [Number(process.env.BREVO_LIST_ID)], updateEnabled: true }),
    });
    if (!r.ok) console.error('[brevo contacts]', r.status, await r.text());
  } catch (e) {
    console.error('[brevo contacts]', e.message);
  }
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

module.exports = { setting, siteUrl, sendEmail, addSubscriber, notifyUser, notifyAdmins };
