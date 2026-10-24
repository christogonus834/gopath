const express = require('express');
const multer = require('multer');
const db = require('../db');
const { wrap, ok, bad, clean, toCsv, safeName } = require('../util');
const { requireAuth, requireRole } = require('../auth');
const { checkImage } = require('../files');
const { notifyUser, siteUrl } = require('../mail');

const r = express.Router();
r.use(requireAuth, requireRole('admin'));

const STAGES = ['Eligibility', 'Profile', 'Interview', 'Offer', 'Visa', 'Relocation'];
const VISA_STAGES = ['Eligibility', 'Documents', 'Legalise', 'File', 'Follow up', 'Decision'];
const SECTIONS = ['hero_ticks', 'about_items', 'stats', 'services', 'how_steps', 'placed', 'testimonials', 'news',
  'visa_steps', 'checklist', 'fees', 'faq', 'values', 'team', 'doc_types'];

// Generic list / create / update / delete for one table.
function crud(table, fields, o = {}) {
  const router = express.Router();
  const sel = o.select || '*';
  const order = o.order || [['sort'], ['created_at']];

  router.get('/', wrap(async (req, res) => {
    let q = db.from(table).select(sel);
    if (o.filter) q = o.filter(q, req);
    for (const [col, asc = true] of order) q = q.order(col, { ascending: asc });
    res.json(ok(await q));
  }));

  if (!o.noCreate) router.post('/', wrap(async (req, res) => {
    const row = clean(req.body, fields);
    for (const k of o.required || []) if (row[k] == null) throw bad(`${k.replace(/_/g, ' ')} is required.`);
    if (o.check) o.check(row);
    res.status(201).json(ok(await db.from(table).insert(row).select(sel).single()));
  }));

  if (!o.noUpdate) router.put('/:id', wrap(async (req, res) => {
    const row = clean(req.body, fields);
    for (const k of o.required || []) if (k in row && row[k] == null) throw bad(`${k.replace(/_/g, ' ')} is required.`);
    if (o.check) o.check(row);
    if (o.touch) row.updated_at = new Date().toISOString();
    const prev = o.onUpdate ? ok(await db.from(table).select('*').eq('id', req.params.id).single()) : null;
    const next = ok(await db.from(table).update(row).eq('id', req.params.id).select(sel).single());
    if (o.onUpdate) o.onUpdate(prev, next);
    res.json(next);
  }));

  router.delete('/:id', wrap(async (req, res) => {
    ok(await db.from(table).delete().eq('id', req.params.id));
    res.json({ ok: true });
  }));
  return router;
}

r.use('/jobs', crud('jobs',
  { title: 'text', employer_id: 'text', destination_id: 'text', category_id: 'text', city: 'text', salary: 'text', filled: 'bool', sort: 'int' },
  { required: ['title', 'employer_id', 'destination_id', 'category_id'], order: [['sort'], ['created_at', false]],
    select: 'id,title,city,salary,filled,sort,employer_id,destination_id,category_id,employer:employers(name),destination:destinations(name),category:categories(name)' }));

r.use('/employers', crud('employers',
  { name: 'text', country: 'text', contact_email: 'text', phone: 'text', verified: 'bool', notes: 'text' },
  { required: ['name'], order: [['name']] }));

r.use('/categories', crud('categories',
  { name: 'text', color: 'text', image_url: 'text', sort: 'int' },
  { required: ['name'], order: [['sort'], ['name']] }));

r.use('/destinations', crud('destinations',
  { name: 'text', image_url: 'text', route_text: 'text', typical_time: 'text', sort: 'int' },
  { required: ['name'], order: [['sort'], ['name']] }));

r.use('/content', crud('content_items',
  { section: 'text', title: 'text', body: 'text', value: 'text', extra: 'text', image_url: 'text', sort: 'int', active: 'bool' },
  { required: ['section'], check: row => { if (row.section && !SECTIONS.includes(row.section)) throw bad('Unknown section.'); },
    filter: (q, req) => (req.query.section ? q.eq('section', String(req.query.section)) : q) }));

r.use('/visa-cases', crud('visa_cases',
  { user_id: 'text', destination: 'text', route: 'text', stage: 'int', notes: 'text' },
  { required: ['user_id'], touch: true, order: [['updated_at', false]],
    select: 'id,user_id,destination,route,stage,notes,updated_at,user:users(name,email)',
    check: row => { if ('stage' in row && !(row.stage >= 0 && row.stage <= 5)) throw bad('Invalid stage.'); },
    onUpdate: (prev, next) => {
      if (prev.stage !== next.stage) notifyUser(next.user_id, {
        title: `Visa case: ${VISA_STAGES[next.stage]}`, body: next.route || next.destination || '', link: 'dashboard',
        email: { subject: `Your visa case moved to "${VISA_STAGES[next.stage]}"`, heading: 'Visa case update',
          paras: [`Your visa case${next.destination ? ' for ' + next.destination : ''} is now at the "${VISA_STAGES[next.stage]}" step.`],
          button: { label: 'Open my dashboard', url: siteUrl('dashboard') } },
      });
    } }));

r.use('/contacts', crud('contact_messages', { status: 'text' },
  { noCreate: true, order: [['created_at', false]],
    check: row => { if (row.status && !['new', 'read', 'replied'].includes(row.status)) throw bad('Invalid status.'); } }));

r.use('/subscribers', crud('subscribers', {}, { noCreate: true, noUpdate: true, order: [['created_at', false]] }));

// ---- clients, applications, applicants ----
r.get('/clients', wrap(async (req, res) => {
  res.json(ok(await db.from('users').select('id,name,email').eq('role', 'client').order('name')));
}));

const APP_SEL = 'id,stage,destination,profession,placed_at,created_at,user:users(id,name,email,phone,active),job:jobs(title,city,employer:employers(name))';

r.get('/applications', wrap(async (req, res) => {
  const limit = Math.min(Number.parseInt(req.query.limit, 10) || 1000, 1000);
  res.json(ok(await db.from('applications').select(APP_SEL).order('created_at', { ascending: false }).limit(limit)));
}));

r.patch('/applications/:id', wrap(async (req, res) => {
  const stage = Number.parseInt(req.body.stage, 10);
  if (!(stage >= 0 && stage <= 5)) throw bad('Invalid stage.');
  const prev = ok(await db.from('applications').select('stage,user_id,placed_at,profession').eq('id', req.params.id).single());
  const next = ok(await db.from('applications')
    .update({ stage, placed_at: stage === 5 ? (prev.placed_at || new Date().toISOString()) : null })
    .eq('id', req.params.id).select(APP_SEL).single());
  if (prev.stage !== stage) {
    const what = (next.job && next.job.title) || next.profession || 'your application';
    notifyUser(prev.user_id, { title: `Moved to ${STAGES[stage]}`, body: what, link: 'dashboard',
      email: { subject: `Your application moved to "${STAGES[stage]}"`, heading: 'Progress update',
        paras: [`Good news: ${what} is now at the "${STAGES[stage]}" step.`],
        button: { label: 'Open my dashboard', url: siteUrl('dashboard') } } });
  }
  res.json(next);
}));

r.delete('/applications/:id', wrap(async (req, res) => {
  ok(await db.from('applications').delete().eq('id', req.params.id));
  res.json({ ok: true });
}));

r.get('/applicants/:id', wrap(async (req, res) => {
  const id = req.params.id;
  const [u, apps, docs, msgs, visa] = await Promise.all([
    db.from('users').select('id,name,email,phone,profession,destination,active,created_at').eq('id', id).eq('role', 'client').maybeSingle(),
    db.from('applications').select(APP_SEL).eq('user_id', id).order('created_at', { ascending: false }),
    db.from('documents').select('id,doc_type,file_name,status,uploaded_at').eq('user_id', id).order('uploaded_at', { ascending: false }),
    db.from('messages').select('id,sender,body,created_at').eq('user_id', id).order('created_at'),
    db.from('visa_cases').select('id,destination,route,stage').eq('user_id', id),
  ]);
  const user = ok(u);
  if (!user) throw bad('Applicant not found.', 404);
  res.json({ user, applications: ok(apps), documents: ok(docs), messages: ok(msgs), visaCases: ok(visa) });
}));

r.post('/applicants/:id/messages', wrap(async (req, res) => {
  const body = String(req.body.body || '').trim();
  if (!body) throw bad('Write a message first.');
  if (body.length > 2000) throw bad('Message is too long.');
  ok(await db.from('messages').insert({ user_id: req.params.id, sender: 'staff', body }));
  notifyUser(req.params.id, { title: 'New message from your recruiter', body: body.slice(0, 120), link: 'dashboard',
    email: { subject: 'New message from your recruiter', heading: 'You have a new message', paras: [body],
      button: { label: 'Reply in your dashboard', url: siteUrl('dashboard') } } });
  res.status(201).json({ ok: true });
}));

r.patch('/users/:id', wrap(async (req, res) => {
  ok(await db.from('users').update({ active: req.body.active === true }).eq('id', req.params.id).eq('role', 'client'));
  res.json({ ok: true });
}));

r.delete('/users/:id', wrap(async (req, res) => {
  const files = ok(await db.from('documents').select('file_path').eq('user_id', req.params.id));
  if (files.length) await db.storage.from('documents').remove(files.map(f => f.file_path));
  ok(await db.from('users').delete().eq('id', req.params.id).eq('role', 'client'));
  res.json({ ok: true });
}));

// ---- documents ----
r.get('/documents', wrap(async (req, res) => {
  res.json(ok(await db.from('documents').select('id,doc_type,file_name,status,uploaded_at,user:users(id,name,email)').order('uploaded_at', { ascending: false }).limit(500)));
}));

r.get('/documents/:id/url', wrap(async (req, res) => {
  const d = ok(await db.from('documents').select('file_path').eq('id', req.params.id).single());
  const s = await db.storage.from('documents').createSignedUrl(d.file_path, 300);
  if (s.error) throw bad('Could not open the file.', 500);
  res.json({ url: s.data.signedUrl });
}));

r.patch('/documents/:id', wrap(async (req, res) => {
  const status = req.body.status;
  if (!['received', 'approved', 'rejected'].includes(status)) throw bad('Invalid status.');
  const d = ok(await db.from('documents').update({ status }).eq('id', req.params.id).select('user_id,doc_type').single());
  if (status === 'rejected') notifyUser(d.user_id, { title: 'Please upload again', body: d.doc_type, link: 'dashboard',
    email: { subject: `Please upload your ${d.doc_type} again`, heading: 'Document needs attention',
      paras: [`We could not accept your ${d.doc_type}. Please upload a clear, complete copy from your dashboard.`],
      button: { label: 'Open my dashboard', url: siteUrl('dashboard') } } });
  if (status === 'approved') notifyUser(d.user_id, { title: 'Document approved', body: d.doc_type, link: 'dashboard' });
  res.json({ ok: true });
}));

// ---- page text and images ----
r.get('/settings', wrap(async (req, res) => {
  const out = {};
  ok(await db.from('settings').select('key,value')).forEach(x => { out[x.key] = x.value; });
  res.json(out);
}));

// Body: { key: "value" }. An empty value removes the override and brings the default text back.
r.put('/settings', wrap(async (req, res) => {
  const rows = [], drop = [];
  for (const [k, v] of Object.entries(req.body || {})) {
    if (!/^[a-z0-9_]{1,60}$/.test(k)) continue;
    const s = v == null ? '' : String(v);
    if (s.length > 5000) throw bad(`${k} is too long.`);
    s.trim() === '' ? drop.push(k) : rows.push({ key: k, value: s });
  }
  if (rows.length) ok(await db.from('settings').upsert(rows, { onConflict: 'key' }));
  if (drop.length) ok(await db.from('settings').delete().in('key', drop));
  res.json({ ok: true });
}));

const imgUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
r.post('/upload', imgUpload.single('file'), wrap(async (req, res) => {
  checkImage(req.file);
  const path = `${Date.now()}-${safeName(req.file.originalname)}`;
  const up = await db.storage.from('site-media').upload(path, req.file.buffer, { contentType: req.file.mimetype });
  if (up.error) { console.error('[storage]', up.error); throw bad('Upload failed.', 500); }
  res.status(201).json({ url: db.storage.from('site-media').getPublicUrl(path).data.publicUrl });
}));

// ---- dashboard numbers and exports ----
r.get('/stats', wrap(async (req, res) => {
  const [users, apps, jobs, visa] = await Promise.all([
    db.from('users').select('created_at').eq('role', 'client'),
    db.from('applications').select('stage,placed_at,destination'),
    db.from('jobs').select('id').eq('filled', false),
    db.from('visa_cases').select('id').lt('stage', 5),
  ]);
  const U = ok(users), A = ok(apps);
  const now = new Date(), months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ y: d.getFullYear(), m: d.getMonth(), label: d.toLocaleString('en', { month: 'short' }), registered: 0, placed: 0 });
  }
  const bump = (iso, key) => {
    if (!iso) return;
    const d = new Date(iso), slot = months.find(x => x.y === d.getFullYear() && x.m === d.getMonth());
    if (slot) slot[key]++;
  };
  U.forEach(u => bump(u.created_at, 'registered'));
  A.forEach(a => bump(a.placed_at, 'placed'));
  const byDest = {};
  A.filter(a => a.placed_at).forEach(a => { const k = a.destination || 'Other'; byDest[k] = (byDest[k] || 0) + 1; });
  res.json({
    kpi: { registered: U.length, activeJobs: ok(jobs).length, placements: A.filter(a => a.placed_at).length, visaOpen: ok(visa).length },
    months: months.map(({ label, registered, placed }) => ({ label, registered, placed })),
    placedByDestination: Object.entries(byDest).map(([name, count]) => ({ name, count })),
    pipeline: STAGES.map((name, i) => ({ name, count: A.filter(a => a.stage >= i).length })),
    totalApplications: A.length,
  });
}));

r.get('/export/:what', wrap(async (req, res) => {
  const d = v => (v ? new Date(v).toISOString().slice(0, 10) : '');
  let rows, cols;
  switch (req.params.what) {
    case 'applications':
      rows = ok(await db.from('applications').select(APP_SEL).order('created_at', { ascending: false }));
      cols = [[x => x.user && x.user.name, 'Name'], [x => x.user && x.user.email, 'Email'], [x => x.user && x.user.phone, 'Phone'],
        [x => x.profession, 'Profession'], [x => x.destination, 'Destination'], [x => x.job && x.job.title, 'Job'],
        [x => STAGES[x.stage], 'Stage'], [x => d(x.created_at), 'Applied']];
      break;
    case 'contacts':
      rows = ok(await db.from('contact_messages').select('*').order('created_at', { ascending: false }));
      cols = [[x => x.name, 'Name'], [x => x.email, 'Email'], [x => x.destination, 'Destination'], [x => x.message, 'Message'], [x => x.status, 'Status'], [x => d(x.created_at), 'Date']];
      break;
    case 'subscribers':
      rows = ok(await db.from('subscribers').select('*').order('created_at', { ascending: false }));
      cols = [[x => x.email, 'Email'], [x => d(x.created_at), 'Subscribed']];
      break;
    default: throw bad('Unknown export.', 404);
  }
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${req.params.what}.csv"` });
  res.send(toCsv(rows, cols));
}));

module.exports = r;
