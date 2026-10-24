const db = require('./db');
const { bad, ok, safeName } = require('./util');

// Checks the first bytes so a renamed .exe cannot pass as a PDF.
const SIGS = [
  ['application/pdf', [0x25, 0x50, 0x44, 0x46]],
  ['image/jpeg', [0xff, 0xd8, 0xff]],
  ['image/png', [0x89, 0x50, 0x4e, 0x47]],
  ['application/msword', [0xd0, 0xcf, 0x11, 0xe0]],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', [0x50, 0x4b]],
];
const IMG_SIGS = [
  ['image/jpeg', [0xff, 0xd8, 0xff]],
  ['image/png', [0x89, 0x50, 0x4e, 0x47]],
  ['image/gif', [0x47, 0x49, 0x46]],
  ['image/webp', [0x52, 0x49, 0x46, 0x46]],
];
const matches = (buf, sig) => sig.every((b, i) => buf[i] === b);

function checkFile(file, kinds = SIGS, msg = 'Upload a PDF, JPG, PNG or Word file.') {
  if (!file || !kinds.some(([mime, sig]) => file.mimetype === mime && matches(file.buffer, sig))) throw bad(msg);
}
const checkImage = f => checkFile(f, IMG_SIGS, 'Upload a JPG, PNG, GIF or WebP image.');

async function storeDoc(userId, docType, file) {
  checkFile(file);
  const path = `${userId}/${Date.now()}-${safeName(file.originalname)}`;
  const up = await db.storage.from('documents').upload(path, file.buffer, { contentType: file.mimetype });
  if (up.error) { console.error('[storage]', up.error); throw bad('Could not store the file.', 500); }
  return ok(await db.from('documents')
    .insert({ user_id: userId, doc_type: docType, file_path: path, file_name: String(file.originalname).slice(0, 120) })
    .select().single());
}

module.exports = { checkFile, checkImage, storeDoc };
