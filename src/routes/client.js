const express = require('express');
const multer = require('multer');
const db = require('../db');
const { wrap, ok, bad } = require('../util');
const { requireAuth, requireRole } = require('../auth');
const { storeDoc } = require('../files');
const { notifyUser, notifyAdmins, siteUrl } = require('../mail');

const r = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 1 } });
r.use(requireAuth, requireRole('client'));

r.get('/dashboard', wrap(async (req, res) => {
  const uid = req.user.id;
  const [apps, docs, msgs, types] = await Promise.all([
    db.from('applications').select('id,kind,stage,destination,profession,created_at,job:jobs(id,title,city,salary,employer:employers(name),destination:destinations(name)),program:study_programs(id,title,school,city,level,tuition,destination:destinations(name))')
      .eq('user_id', uid).order('created_at', { ascending: false }),
    db.from('documents').select('id,doc_type,file_name,status,uploaded_at').eq('user_id', uid).order('uploaded_at', { ascending: false }),
    db.from('messages').select('id,sender,body,created_at').eq('user_id', uid).order('created_at'),
    db.from('content_items').select('title,extra').eq('section', 'doc_types').eq('active', true).order('sort').order('created_at'),
  ]);
  const applications = ok(apps);
  const isStudent = applications.some(a => a.kind === 'study');
  // a document type marked "study" is only shown to students
  const docTypes = ok(types).filter(t => t.extra !== 'study' || isStudent).map(t => t.title);
  res.json({ user: req.user, applications, documents: ok(docs), messages: ok(msgs), docTypes });
}));

r.post('/apply', wrap(async (req, res) => {
  const job = ok(await db.from('jobs').select('id,title,filled,destination:destinations(name)').eq('id', req.body.job_id).maybeSingle());
  if (!job) throw bad('That job does not exist.', 404);
  if (job.filled) throw bad('This position has been filled.', 409);
  const { error } = await db.from('applications').insert({
    user_id: req.user.id, job_id: job.id, destination: job.destination && job.destination.name, profession: job.title,
  });
  if (error && error.code === '23505') throw bad('You already applied for this job.', 409);
  if (error) ok({ error });
  notifyUser(req.user.id, { title: 'Application sent', body: job.title, link: 'dashboard',
    email: { subject: `Application received: ${job.title}`, heading: 'We received your application',
      paras: [`Your application for ${job.title} is in. Your recruiter will review it and contact you about the next step.`],
      button: { label: 'Open my dashboard', url: siteUrl('dashboard') } } });
  notifyAdmins({ title: 'New job application', body: `${req.user.name} applied for ${job.title}`, link: `admin?s=applicants&open=${req.user.id}`,
    email: { subject: `${req.user.name} applied for ${job.title}`, heading: 'New job application',
      paras: [`${req.user.name} <${req.user.email}> applied for ${job.title}.`],
      button: { label: 'Open applicant', url: siteUrl(`admin?s=applicants&open=${req.user.id}`) } } });
  res.status(201).json({ ok: true });
}));

r.post('/apply-study', wrap(async (req, res) => {
  const p = ok(await db.from('study_programs').select('id,title,school,closed,destination:destinations(name)').eq('id', req.body.program_id).maybeSingle());
  if (!p) throw bad('That program does not exist.', 404);
  if (p.closed) throw bad('Applications for this program are closed.', 409);
  const { error } = await db.from('applications').insert({
    user_id: req.user.id, kind: 'study', program_id: p.id, destination: p.destination && p.destination.name, profession: p.title,
  });
  if (error && error.code === '23505') throw bad('You already applied for this program.', 409);
  if (error) ok({ error });
  const what = `${p.title} at ${p.school}`;
  notifyUser(req.user.id, { title: 'Study application sent', body: what, link: 'dashboard',
    email: { subject: `Application received: ${p.title}`, heading: 'We received your study application',
      paras: [`Your application for ${what} is in. Your advisor will review it and tell you what to prepare next.`],
      button: { label: 'Open my dashboard', url: siteUrl('dashboard') } } });
  notifyAdmins({ title: 'New study application', body: `${req.user.name} applied for ${what}`, link: `admin?s=applicants&open=${req.user.id}`,
    email: { subject: `${req.user.name} applied for ${p.title}`, heading: 'New study application',
      paras: [`${req.user.name} <${req.user.email}> applied for ${what}.`],
      button: { label: 'Open applicant', url: siteUrl(`admin?s=applicants&open=${req.user.id}`) } } });
  res.status(201).json({ ok: true });
}));

r.post('/documents', upload.single('file'), wrap(async (req, res) => {
  const type = String(req.body.doc_type || '').trim().slice(0, 80);
  if (!type) throw bad('Choose a document type.');
  if (!req.file) throw bad('Choose a file to upload.');
  const doc = await storeDoc(req.user.id, type, req.file);
  notifyUser(req.user.id, { title: 'Document received', body: type, link: 'dashboard' });
  notifyAdmins({ title: 'Document uploaded', body: `${req.user.name}: ${type}`, link: `admin?s=applicants&open=${req.user.id}` });
  res.status(201).json({ id: doc.id });
}));

r.post('/messages', wrap(async (req, res) => {
  const body = String(req.body.body || '').trim();
  if (!body) throw bad('Write a message first.');
  if (body.length > 2000) throw bad('Message is too long.');
  ok(await db.from('messages').insert({ user_id: req.user.id, sender: 'client', body }));
  notifyAdmins({ title: `Message from ${req.user.name}`, body: body.slice(0, 120), link: `admin?s=applicants&open=${req.user.id}`,
    email: { subject: `New message from ${req.user.name}`, heading: 'New client message', replyTo: req.user.email,
      paras: [`${req.user.name} <${req.user.email}>`, body],
      button: { label: 'Reply in the dashboard', url: siteUrl(`admin?s=applicants&open=${req.user.id}`) } } });
  res.status(201).json({ ok: true });
}));

module.exports = r;
