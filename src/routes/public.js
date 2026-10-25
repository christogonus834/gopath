const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { wrap, ok, bad, isEmail } = require('../util');
const { makeToken } = require('../auth');
const { checkFile, storeDoc } = require('../files');
const { sendEmail, addSubscriber, notifyAdmins, siteUrl } = require('../mail');

const r = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
const limit = (max, windowMin = 60) => rateLimit({
  windowMs: windowMin * 60 * 1000, max, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

// Everything the public website needs, in one request.
r.get('/site', wrap(async (req, res) => {
  const [s, cats, dests, items, jobs, progs] = await Promise.all([
    db.from('settings').select('key,value'),
    db.from('categories').select('id,name,color,image_url,sort').order('sort').order('name'),
    db.from('destinations').select('id,name,image_url,route_text,typical_time,sort').order('sort').order('name'),
    db.from('content_items').select('id,section,title,body,value,extra,image_url,sort').eq('active', true).order('sort').order('created_at'),
    db.from('jobs').select('id,title,city,salary,filled,employer:employers(name,verified),destination:destinations(name),category:categories(name)')
      .order('sort').order('created_at', { ascending: false }),
    db.from('study_programs').select('id,title,school,city,level,duration,intake,tuition,summary,image_url,closed,destination:destinations(name)')
      .order('sort').order('created_at', { ascending: false }),
  ]);
  const settings = {};
  ok(s).forEach(x => { settings[x.key] = x.value; });
  const content = {};
  ok(items).forEach(x => { (content[x.section] = content[x.section] || []).push(x); });
  res.json({
    settings,
    categories: ok(cats),
    destinations: ok(dests),
    content,
    programs: ok(progs).map(p => ({ ...p, destination: p.destination && p.destination.name })),
    jobs: ok(jobs).map(j => ({
      id: j.id, title: j.title, city: j.city, salary: j.salary, filled: j.filled,
      employer: j.employer && j.employer.name, verified: !!(j.employer && j.employer.verified),
      destination: j.destination && j.destination.name, category: j.category && j.category.name,
    })),
  });
}));

r.post('/contact', limit(10), wrap(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const destination = String(req.body.destination || '').trim().slice(0, 60);
  const message = String(req.body.message || '').trim();
  if (name.length < 2 || !isEmail(email) || message.length < 3) throw bad('Please fill in your name, email and message.');
  if (message.length > 4000) throw bad('Message is too long.');
  ok(await db.from('contact_messages').insert({ name, email, destination, message }));
  notifyAdmins({
    title: 'New contact message', body: `${name}: ${message.slice(0, 120)}`, link: 'admin?s=inbox',
    email: { subject: `New contact message from ${name}`, heading: 'New contact message', replyTo: email,
      paras: [`From: ${name} <${email}>`, `Destination: ${destination || 'not given'}`, message],
      button: { label: 'Open inbox', url: siteUrl('admin?s=inbox') } },
  });
  sendEmail({ to: email, name, subject: 'We received your message', heading: `Thanks, ${name.split(' ')[0]}`,
    paras: ['Your message has reached our team. We usually reply within one working day.'] });
  res.status(201).json({ message: 'Message sent. We will reply by email.' });
}));

r.post('/subscribe', limit(10), wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!isEmail(email)) throw bad('Please enter a valid email address.');
  ok(await db.from('subscribers').upsert({ email }, { onConflict: 'email', ignoreDuplicates: true }));
  addSubscriber(email);
  res.status(201).json({ message: 'Subscribed.' });
}));

// Homepage "Apply for a job": creates the client account and emails a set-password link.
r.post('/apply', limit(10), upload.single('cv'), wrap(async (req, res) => {
  const b = req.body;
  const name = String(b.name || '').trim();
  const email = String(b.email || '').trim().toLowerCase();
  const profession = String(b.profession || '').trim().slice(0, 100);
  const destination = String(b.destination || '').trim().slice(0, 60);
  const phone = String(b.phone || '').trim().slice(0, 40);
  if (name.length < 2 || !isEmail(email) || !profession) throw bad('Please fill in your name, email and profession.');
  if (req.file) checkFile(req.file); // validate before anything is created

  const reply = { message: 'Thanks! Check your email for a link to set your password and follow your application.' };
  const { data: existing } = await db.from('users').select('id,name').eq('email', email).maybeSingle();
  if (existing) {
    // Same reply either way, so this form cannot be used to find out who has an account.
    sendEmail({ to: email, name: existing.name, subject: 'You already have an account', heading: 'Welcome back',
      paras: ['We received an application from this email address, but you already have an account.', 'Sign in to apply for jobs and track your progress. If you forgot your password, use "Forgot password" on the sign-in page.'],
      button: { label: 'Sign in', url: siteUrl('login') } });
    return res.status(201).json(reply);
  }

  const user = ok(await db.from('users').insert({ name, email, phone, profession, destination }).select().single());
  ok(await db.from('applications').insert({ user_id: user.id, destination, profession }));
  if (req.file) await storeDoc(user.id, 'CV', req.file);

  const token = await makeToken(user.id, 'set', 48);
  sendEmail({ to: email, name, subject: 'Set your password', heading: `Welcome, ${name.split(' ')[0]}`,
    paras: ['We received your application. Create your password to open your dashboard, upload documents and follow each step.', 'This link works for 48 hours.'],
    button: { label: 'Set my password', url: siteUrl(`set-password?token=${token}`) } });
  notifyAdmins({
    title: 'New applicant', body: `${name} · ${profession} · ${destination}`, link: `admin?s=applicants&open=${user.id}`,
    email: { subject: `New applicant: ${name}`, heading: 'New applicant',
      paras: [`${name} <${email}>`, `Profession: ${profession}`, `Destination: ${destination || 'not given'}`],
      button: { label: 'Open applicant', url: siteUrl(`admin?s=applicants&open=${user.id}`) } },
  });
  res.status(201).json(reply);
}));

module.exports = r;
