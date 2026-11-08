#!/usr/bin/env node
'use strict';
// Trusted workflow code. Issue fields and submitted bytes are always data.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const crypto = require('node:crypto'), zlib = require('node:zlib'), cp = require('node:child_process');
const MAX = 40_000_000, ZIP_MAX = MAX + 65_536;
const TYPES = { '.chpack': 'course-art', '.chkit': 'kit', '.chtheme': 'theme', '.chpet': 'pet', '.chpreset': 'preset' };
const LABELS = { name: 'Pack name', credit: 'Credit', kind: 'Kind', licence: 'Licence', sha256: 'SHA-256', attachment: 'Attachment', rights: 'Rights', privacy: 'Privacy' };
const RIGHTS = 'I made this, or have the right to share it: no copied characters, logos or other people\'s photos';
const PRIVACY = 'No names, school details or personal information inside';
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const fail = message => { throw new Error(message); };
const cleanText = (v, max = 120) => typeof v === 'string' && v.trim().length > 0 && v === v.trim() && v.length <= max && !/[\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/u.test(v);
const idFor = (name, sha) => (name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40).replace(/-$/, '') || 'pack') + '-' + sha.slice(0, 12);

function parseIssue(body) {
  if (typeof body !== 'string' || body.length > 65_536) fail('The submission form is missing or too long.');
  const sections = new Map(), problems = [];
  const matches = [...body.replace(/\r\n/g, '\n').matchAll(/^### ([^\n]+)\n/gm)];
  for (let i = 0; i < matches.length; i++) {
    const heading = matches[i][1].trim();
    if (sections.has(heading)) problems.push('The form repeats ' + heading + '.');
    sections.set(heading, body.slice(matches[i].index + matches[i][0].length, matches[i + 1]?.index ?? body.length).trim());
  }
  const fields = Object.fromEntries(Object.entries(LABELS).map(([id, label]) => [id, sections.get(label) || '']));
  for (const [id, max] of [['name', 120], ['credit', 60]]) if (!cleanText(fields[id], max)) problems.push(`${LABELS[id]} must be one line, between 1 and ${max} characters.`);
  if (!Object.values(TYPES).includes(fields.kind)) problems.push('Choose a supported pack kind.');
  if (!['CC BY 4.0', 'CC0 1.0'].includes(fields.licence)) problems.push('Choose CC BY 4.0 or CC0 1.0.');
  if (!/^[a-f0-9]{64}$/i.test(fields.sha256)) problems.push('SHA-256 must be the 64 letters and numbers shown by the submission page.');
  fields.sha256 = fields.sha256.toLowerCase();
  for (const [id, text] of [['rights', RIGHTS], ['privacy', PRIVACY]]) if (fields[id] !== '- [x] ' + text && fields[id] !== '- [X] ' + text) problems.push('Tick the ' + LABELS[id].toLowerCase() + ' confirmation.');
  return { fields, problems };
}
function attachmentURL(value) {
  // Check the raw spelling too: URL normalisation must not hide traversal or escapes.
  if (typeof value !== 'string' || !/^https:\/\/github\.com\/user-attachments\/files\/[0-9]+\/[A-Za-z0-9_~.-]+\.zip$/.test(value) || value.includes('..')) return null;
  const u = new URL(value);
  return u.origin === 'https://github.com' && !u.username && !u.password && !u.search && !u.hash ? u.href : null;
}
function findAttachment(text) {
  const urls = [...String(text).matchAll(/https?:\/\/[^\s<>"'\)\]]+/g)].map(m => m[0]);
  const valid = [...new Set(urls.map(attachmentURL).filter(Boolean))];
  if (valid.length !== 1 || urls.some(u => !attachmentURL(u))) fail('Attach exactly one zip using GitHub\'s attachment button (https://github.com/user-attachments/files/…).');
  return valid[0];
}
function crc32(bytes) { let crc = 0xffffffff; for (const b of bytes) { crc ^= b; for (let k = 0; k < 8; k++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1; } return (crc ^ 0xffffffff) >>> 0; }
function unzip(input) {
  const b = Buffer.from(input);
  if (b.length > ZIP_MAX) fail('The zip is too large; the pack limit is 40 MB.');
  if (b.length < 98) fail('The zip is incomplete.');
  const end = b.length - 22;
  if (b.readUInt32LE(end) !== 0x06054b50 || b.readUInt16LE(end + 20)) fail('Use a zip without a comment or trailing data.');
  if (b.readUInt16LE(end + 4) || b.readUInt16LE(end + 6) || b.readUInt16LE(end + 8) !== 1 || b.readUInt16LE(end + 10) !== 1) fail('The zip must contain exactly one file on one disk.');
  const c = b.readUInt32LE(end + 16), cdSize = b.readUInt32LE(end + 12);
  if (c < 30 || c + cdSize !== end || cdSize < 46 || c + 46 > end || b.readUInt32LE(c) !== 0x02014b50) fail('The zip directory is invalid.');
  const flags = b.readUInt16LE(c + 8), method = b.readUInt16LE(c + 10), crc = b.readUInt32LE(c + 16), compressed = b.readUInt32LE(c + 20), size = b.readUInt32LE(c + 24);
  const nl = b.readUInt16LE(c + 28), extra = b.readUInt16LE(c + 30), comment = b.readUInt16LE(c + 32), attr = b.readUInt32LE(c + 38), mode = attr >>> 16;
  if (46 + nl + extra + comment !== cdSize || b.readUInt16LE(c + 34) || b.readUInt32LE(c + 42) !== 0 || extra || comment) fail('Use a simple zip with one file and no extra entries or metadata.');
  if (flags & ~0x0800 || ![0, 8].includes(method) || b.readUInt16LE(c + 6) > 20) fail('Encrypted, streamed and ZIP64 files are not accepted. Use the submission page\'s zip.');
  if ((mode & 0xf000) && (mode & 0xf000) !== 0x8000 || attr & 0x10) fail('Links, folders and special files are not accepted.');
  const nameBytes = b.subarray(c + 46, c + 46 + nl), name = nameBytes.toString('utf8');
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,159}\.(chpack|chkit|chtheme|chpet|chpreset)$/i.test(name) || name.includes('..')) fail('The zip must hold one pack file, with no folders or paths.');
  if (!size || size > MAX) fail('The pack must be nonempty and at most 40 MB.');
  if (b.readUInt32LE(0) !== 0x04034b50 || b.readUInt16LE(4) !== b.readUInt16LE(c + 6) || b.readUInt16LE(6) !== flags || b.readUInt16LE(8) !== method || b.readUInt32LE(14) !== crc || b.readUInt32LE(18) !== compressed || b.readUInt32LE(22) !== size || b.readUInt16LE(26) !== nl || b.readUInt16LE(28) !== 0 || !b.subarray(30, 30 + nl).equals(nameBytes) || 30 + nl + compressed !== c) fail('The zip header and directory disagree.');
  const packed = b.subarray(30 + nl, c); let bytes;
  if (method === 0) bytes = packed;
  else {
    try { const r = zlib.inflateRawSync(packed, { maxOutputLength: MAX, info: true }); if (r.engine.bytesWritten !== packed.length) fail('Unexpected compressed data.'); bytes = r.buffer; }
    catch { fail('The compressed pack is damaged or expands beyond 40 MB.'); }
  }
  if (bytes.length !== size || crc32(bytes) !== crc) fail('The zip content does not match its size or checksum.');
  return { name, bytes: Buffer.from(bytes) };
}
function inspectPack(name, bytes) {
  const extension = path.extname(name).toLowerCase(), kind = TYPES[extension];
  if (!kind || !bytes.length || bytes.length > MAX) fail('Choose a supported pack file of at most 40 MB.');
  let text; try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { fail('The pack must be valid UTF-8 text.'); }
  let doc, packName;
  if (kind === 'course-art') {
    const h = text.match(/<\?ch-pack\s+([^?]*)\?>/), attrs = h?.[1];
    if (!attrs || !/\bversion\s*=\s*["']1["']/.test(attrs)) fail('The .chpack needs a version 1 ch-pack header.');
    packName = attrs.match(/\bname\s*=\s*(?:"([^"]*)"|'([^']*)')/)?.slice(1).find(v => v !== undefined);
    packName = packName?.replace(/&(quot|apos|lt|gt|amp);/g, (_, k) => ({ quot: '"', apos: "'", lt: '<', gt: '>', amp: '&' }[k]));
  } else {
    try { doc = JSON.parse(text); } catch { fail('The pack is not valid JSON.'); }
    if (!doc || Array.isArray(doc) || typeof doc !== 'object' || doc.format !== extension.slice(1)) fail('The JSON format must match the file extension.');
    packName = doc.name;
  }
  if (!cleanText(packName)) fail('The pack needs a name of 1 to 120 characters on one line.');
  return { name: packName, kind, extension, doc, text, size: bytes.length, sha256: hash(bytes) };
}
function runChecker(checker, pack, bytes, { allowTestChecker = false } = {}) {
  if (!allowTestChecker && fs.readFileSync(checker, 'utf8').includes('MARKET_TEST_CHECKER_ONLY')) fail('The test checker is installed. The owner must build with Canvas Harness\'s real CH_SKILL_CHECK before accepting submissions.');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'market-check-'));
  try {
    const file = path.join(temp, 'submission' + pack.extension); fs.writeFileSync(file, bytes);
    const r = cp.spawnSync(process.execPath, [path.resolve(checker), file], { cwd: temp, encoding: 'utf8', timeout: 30_000, maxBuffer: 2_000_000, shell: false, env: { PATH: process.env.PATH || '', SystemRoot: process.env.SystemRoot || '', TEMP: temp, TMP: temp, HOME: temp } });
    if (r.error || r.status !== 0) {
      const details = ((r.stdout || '') + '\n' + (r.stderr || '')).trim();
      fail('Canvas Harness refused the pack.' + (details ? '\n' + details : '\nThe checker could not finish.'));
    }
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
}
function safeRedirect(url) {
  const u = new URL(url);
  return u.protocol === 'https:' && !u.username && !u.password && !u.port && (u.hostname === 'github.com' && u.pathname.startsWith('/user-attachments/') || u.hostname === 'objects.githubusercontent.com' || u.hostname === 'release-assets.githubusercontent.com' || /^github-production-user-asset-[0-9a-f]+\.s3\.amazonaws\.com$/.test(u.hostname));
}
async function download(url, fetcher = fetch) {
  if (!attachmentURL(url)) fail('That attachment address is not allowed.');
  const abort = new AbortController(), timer = setTimeout(() => abort.abort(), 30_000);
  try {
    for (let redirects = 0; redirects <= 3; redirects++) {
      const r = await fetcher(url, { redirect: 'manual', signal: abort.signal, headers: { Accept: 'application/octet-stream' } });
      if ([301, 302, 303, 307, 308].includes(r.status)) {
        const next = new URL(r.headers.get('location') || '', url).href;
        await r.body?.cancel();
        if (redirects === 3 || !safeRedirect(next)) fail('The attachment redirected somewhere unexpected.');
        url = next; continue;
      }
      if (!r.ok) fail('GitHub could not download the attachment. Attach the zip again.');
      if (Number(r.headers.get('content-length')) > ZIP_MAX) { await r.body?.cancel(); fail('The attached zip is too large.'); }
      if (!r.body) fail('The attachment is empty.');
      const reader = r.body.getReader(), chunks = []; let total = 0;
      try { while (true) { const { done, value } = await reader.read(); if (done) break; total += value.byteLength; if (total > ZIP_MAX) fail('The attached zip is too large.'); chunks.push(Buffer.from(value)); } }
      catch (e) { await reader.cancel(); throw e; }
      return Buffer.concat(chunks);
    }
  } finally { clearTimeout(timer); }
}
async function checkSubmission(issue, { fetcher = fetch, checker = path.join(__dirname, 'check.cjs'), allowTestChecker = false } = {}) {
  let parsed; try { parsed = parseIssue(issue.body); } catch (e) { return { ok: false, fields: {}, problems: [e.message] }; }
  const { fields, problems } = parsed;
  let url, file, pack;
  try { url = findAttachment(fields.attachment); } catch (e) { problems.push(e.message); }
  if (url) {
    try {
      file = unzip(await download(url, fetcher)); pack = inspectPack(file.name, file.bytes);
      if (pack.sha256 !== fields.sha256) problems.push('The SHA-256 does not match the attached file. Choose it again on the submission page.');
      if (pack.kind !== fields.kind) problems.push('The chosen kind does not match the file.');
      if (pack.name !== fields.name) problems.push('The pack name does not match the name inside the file.');
      try { runChecker(checker, pack, file.bytes, { allowTestChecker }); } catch (e) { problems.push(e.message); }
    } catch (e) { problems.push(e.message); }
  }
  return { ok: problems.length === 0, fields, problems, file, pack };
}
function plain(value) { return String(value).replace(/[\x00-\x1f\x7f]/g, ' ').replace(/@/g, '@\u200b').replace(/[\\`*_{}\[\]()<>#!|]/g, c => '\\' + c); }
function commentText(result) {
  if (result.ok) return `OK: ${plain(result.pack.name)} is a ${result.pack.kind} pack (${result.pack.size} bytes). The file matches its SHA-256 and passed the Canvas Harness checker.\n\nThe owner still needs to review the artwork, rights and privacy before approving it.`;
  return 'Please fix these problems and edit this issue:\n\n' + result.problems.map(p => '- ' + plain(p)).join('\n') + '\n\nNothing has been added to the Market.';
}
async function postComment(api, number, text) {
  // GitHub limits comment bodies. Preserve all checker diagnostics across comments.
  const parts = String(text).match(/[\s\S]{1,30000}/gu) || [''];
  for (const body of parts) await api('POST', `/issues/${number}/comments`, { body });
}
const PICTURE_TYPES = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'];
// A pack asset for the card picture: only an image type, valid base64, and the bytes its SHA-256 names.
function pictureAsset(d, ref) {
  const asset = typeof ref === 'string' && d.assets && Object.hasOwn(d.assets, ref) ? d.assets[ref] : null;
  if (!asset || !PICTURE_TYPES.includes(asset.type) || typeof asset.data !== 'string') return null;
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(asset.data)) fail('The card picture is not valid base64.');
  const data = Buffer.from(asset.data, 'base64');
  if (!data.length || hash(data) !== asset.sha256) fail('The card picture does not match its asset SHA-256.');
  return { ref, type: asset.type, data, size: imageSize(asset.type, data) };
}
// Width and height (an SVG's viewBox units, or pixels) read from the image's own header; null when unknown.
function imageSize(type, b) {
  const n = v => { const x = Number(v); return Number.isFinite(x) && x > 0 && x < 1e6 ? x : 0; };
  try {
    if (type === 'image/svg+xml') {
      const root = b.toString('utf8').match(/<svg\b[^>]*>/)?.[0] || '';
      const box = root.match(/\sviewBox\s*=\s*["']\s*[-+\d.eE]+[\s,]+[-+\d.eE]+[\s,]+([+\d.eE]+)[\s,]+([+\d.eE]+)\s*["']/);
      if (box && n(box[1]) && n(box[2])) return { w: n(box[1]), h: n(box[2]) };
      const w = n(root.match(/\swidth\s*=\s*["']\s*([\d.]+)(?:px)?\s*["']/)?.[1]), h = n(root.match(/\sheight\s*=\s*["']\s*([\d.]+)(?:px)?\s*["']/)?.[1]);
      return w && h ? { w, h } : null;
    }
    let w = 0, h = 0;
    if (type === 'image/png' && b.toString('latin1', 12, 16) === 'IHDR') { w = b.readUInt32BE(16); h = b.readUInt32BE(20); }
    else if (type === 'image/gif') { w = b.readUInt16LE(6); h = b.readUInt16LE(8); }
    else if (type === 'image/jpeg') {
      for (let i = 2; i + 9 < b.length;) {
        if (b[i] !== 0xff) { i++; continue; }
        const m = b[i + 1];
        if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) { h = b.readUInt16BE(i + 5); w = b.readUInt16BE(i + 7); break; }
        i += m === 0xff ? 1 : m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7) ? 2 : 2 + b.readUInt16BE(i + 2);
      }
    } else if (type === 'image/webp' && b.toString('latin1', 8, 12) === 'WEBP') {
      const chunk = b.toString('latin1', 12, 16);
      if (chunk === 'VP8X') { w = 1 + b.readUIntLE(24, 3); h = 1 + b.readUIntLE(27, 3); }
      else if (chunk === 'VP8L') { const v = b.readUInt32LE(21); w = 1 + (v & 0x3fff); h = 1 + ((v >>> 14) & 0x3fff); }
      else if (chunk === 'VP8 ') { w = b.readUInt16LE(26) & 0x3fff; h = b.readUInt16LE(28) & 0x3fff; }
    }
    return n(w) && n(h) ? { w, h } : null;
  } catch { return null; }
}
// A theme's card picture: a small Home in the theme. The top shows the band still (cover, its right part) or the
// banner's subject (its right part, drawn whole); two course cards in the card frame stand on the left, and a module
// in the panel frame holds the icons; everything sits on the theme's colours and background still. Only the pack's
// own checked pictures, as data: images, and plain shapes go in; nothing is fetched and nothing runs.
function themePicture(d) {
  const part = p => { if (!p || typeof p !== 'object') return null; for (const ref of [typeof p.still === 'string' ? p.still : p.stillAsset, p.asset]) { const a = pictureAsset(d, ref); if (a) return a; } return null; };
  const band = part(d.band), banner = band ? null : part(d.banner), back = part(d.background);
  if (!band && !banner && !back) return null;
  const mode = d.colors?.light || d.colors?.dark || {}, c = {};
  for (const [k, v] of Object.entries({ bg: '#FAF9F5', surface: '#FFFFFF', ink: '#141413', muted: '#5E5D59', line: '#D9D4CA', accent: '#A9522F' })) c[k] = /^#[0-9A-Fa-f]{6}$/.test(mode[k]) ? mode[k] : v;
  const frameOf = kind => { const fr = d.frames?.[kind], a = fr && pictureAsset(d, fr.asset), sl = Array.isArray(fr?.slice) && fr.slice.length === 4 ? fr.slice.map(Number) : null; return a?.size && sl?.every(v => Number.isFinite(v) && v >= 0) && sl[0] + sl[2] <= a.size.h && sl[1] + sl[3] <= a.size.w ? { a, sl } : null; };
  const panelFrame = frameOf('panel'), cardFrame = frameOf('card') || panelFrame;
  const icons = (Array.isArray(d.icons) ? d.icons.slice(0, 6) : []).map(ref => pictureAsset(d, ref)).filter(a => a);
  // Keep the file light: the main picture always goes in; the background under it, the frames and the icons only
  // while all the pictures together stay under 3 MB.
  let budget = 3_000_000 - (band || banner || back).data.length;
  const fits = a => { if (!a) return false; if (a === (band || banner || back)) return true; budget -= a.data.length; return budget >= 0; };
  const useBack = back && fits(back), useFrames = [panelFrame, cardFrame].every(f => !f || fits(f.a)), useIcons = icons.filter(fits);
  // Laid out for the 16:7 theme card, which shows x 7-693 of the 700 x 300 picture.
  const W = 700, H = 300, L = 40, R = 660, T = 20, B = H - 20, colW = 152, ax = L + colW + 14, panelY = 194, r2 = v => +v.toFixed(2);
  const defs = new Map(), body = [`<rect width="${W}" height="${H}" fill="${c.bg}"/>`];
  // A picture whose size cannot be read is fitted whole into the size its part usually has.
  const def = (a, usual = { w: 100, h: 100 }) => { if (!defs.has(a.ref)) { const s = a.size || usual; defs.set(a.ref, { id: 'p' + defs.size, ...s, tag: `<image id="p${defs.size}" width="${s.w}" height="${s.h}" preserveAspectRatio="${a.size ? 'none' : 'xMidYMid meet'}" href="data:${a.type};base64,${a.data.toString('base64')}"/>` }); } return defs.get(a.ref); };
  // Part (sx sy sw sh) of a picture shown in the box (x y w h).
  const show = (p, [sx, sy, sw, sh], [x, y, w, h], fit = 'none') => body.push(`<svg x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}" viewBox="${r2(sx)} ${r2(sy)} ${r2(sw)} ${r2(sh)}" preserveAspectRatio="${fit}"><use href="#${p.id}"/></svg>`);
  const whole = (a, box, fit, usual) => { const p = def(a, usual); show(p, [0, 0, p.w, p.h], box, fit); };
  const focusX = (p, o, sw) => { const fx = Number(o?.focus?.x); const at = Number.isFinite(fx) && fx >= 0 && fx <= 1 ? fx * p.w - sw / 2 : o?.position === 'left' ? 0 : o?.position === 'center' ? (p.w - sw) / 2 : p.w - sw; return Math.max(0, Math.min(p.w - sw, at)); };
  // The background is softened (Canvas Harness shows it faintly behind Home) so the banner and panels lead.
  if (useBack) { body.push('<g opacity=".6">'); whole(back, [0, 0, W, H], ({ top: 'xMidYMin', bottom: 'xMidYMax' }[d.background?.position] || 'xMidYMid') + ' slice', { w: 1920, h: 1080 }); body.push('</g>'); }
  if (band) {
    // The band spans the top like a built-in scene: cover, showing its right part (or its focus).
    const p = def(band, { w: 4096, h: 512 }), h = panelY - 10, sw = Math.min(p.w, p.h * W / h);
    show(p, [focusX(p, d.band, sw), 0, sw, p.h], [0, 0, W, h], 'xMidYMid slice');
  } else if (banner) {
    // The banner is drawn whole at its full height; only its right part (its subject, by the theme skill) is shown.
    const p = def(banner, { w: 1680, h: 240 }), bh = Math.min(170, panelY - 12 - T), s = bh / p.h, sw = Math.min(p.w, (R - ax) / s);
    show(p, [focusX(p, d.banner, sw), 0, sw, p.h], [R - sw * s, T + (panelY - 12 - T - bh) / 2, sw * s, bh]);
  }
  const box = (fr, x, y, w, h) => {
    body.push(`<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}" fill="${c.surface}"${fr ? '' : ` stroke="${c.line}" stroke-width="2" rx="6"`}/>`);
    if (!fr) return;
    // Nine-slice like Canvas Harness: corners keep their shape, edges stretch, the middle is left out.
    const p = def(fr.a), [t, r, b, l] = fr.sl, k = Math.min(0.7, h / Math.max(1, t + b), w / Math.max(1, l + r));
    const cols = [[0, l, x, l * k], [l, p.w - l - r, x + l * k, w - (l + r) * k], [p.w - r, r, x + w - r * k, r * k]];
    const rows = [[0, t, y, t * k], [t, p.h - t - b, y + t * k, h - (t + b) * k], [p.h - b, b, y + h - b * k, b * k]];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (i !== 1 || j !== 1) { const [sx, sw, dx, dw] = cols[j], [sy, sh, dy, dh] = rows[i]; if (sw > 0 && sh > 0 && dw > 0.01 && dh > 0.01) show(p, [sx, sy, sw, sh], [dx, dy, dw, dh]); }
  };
  const icon = (a, x, y, s) => whole(a, [x, y, s, s], 'xMidYMid meet');
  const ch = (B - T - 10) / 2, is = 48;
  for (let i = 0; i < 2; i++) {
    const y = T + i * (ch + 10), ix = L + 13; box(useFrames ? cardFrame : null, L, y, colW, ch);
    if (useIcons.length) icon(useIcons[i % useIcons.length], ix, y + (ch - is) / 2, is);
    const bx = useIcons.length ? ix + is + 11 : ix + 4, bw = L + colW - 15 - bx;
    body.push(`<rect x="${r2(bx)}" y="${r2(y + ch / 2 - 8)}" width="${r2(bw)}" height="7" rx="3.5" fill="${c.ink}" opacity=".82"/>`, `<rect x="${r2(bx)}" y="${r2(y + ch / 2 + 4)}" width="${r2(bw * 0.62)}" height="5" rx="2.5" fill="${i ? c.muted : c.accent}" opacity="${i ? 0.6 : 1}"/>`);
  }
  const pw = R - ax, ph = B - panelY, row = useIcons.length > 2 ? useIcons.slice(2) : useIcons, s = 44;
  box(useFrames ? panelFrame : null, ax, panelY, pw, ph);
  if (row.length) {
    const g = Math.min(40, (pw - 48 - row.length * s) / Math.max(1, row.length - 1)); let x = ax + (pw - row.length * s - (row.length - 1) * g) / 2;
    for (const a of row) { icon(a, x, panelY + (ph - s) / 2, s); x += s + g; }
  } else for (let i = 0; i < 2; i++) { const y = panelY + ph * (i ? 0.64 : 0.36); body.push(`<circle cx="${r2(ax + 30)}" cy="${r2(y)}" r="6" fill="${i ? c.line : c.accent}"/>`, `<rect x="${r2(ax + 48)}" y="${r2(y - 4)}" width="${r2((pw - 80) * (i ? 0.55 : 0.8))}" height="8" rx="4" fill="${c.ink}" opacity=".8"/>`); }
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${[...defs.values()].map(p => p.tag).join('')}</defs>${body.join('')}</svg>\n`);
}
function preview(pack, id) {
  let type, data;
  if (pack.kind === 'theme') {
    const bytes = themePicture(pack.doc);
    return bytes ? { picture: `community/${id}/picture.svg`, bytes } : { picture: 'assets/community/theme.svg' };
  }
  if (pack.kind === 'course-art') {
    const part = [...pack.text.matchAll(/<\?ch-art\s+([^?]*)\?>([\s\S]*?)(?=<\?ch-|$)/g)].find(m => /\bslot\s*=\s*["']banner["']/.test(m[1]));
    const svg = part?.[2].match(/<svg[\s>][\s\S]*<\/svg>/)?.[0];
    if (svg) { type = 'image/svg+xml'; data = Buffer.from(svg); }
  } else if (pack.kind === 'pet') {
    const asset = pictureAsset(pack.doc, pack.doc.poses?.stand);
    if (asset && asset.type !== 'image/avif') { data = asset.data; type = asset.type; }
  }
  if (!data) {
    if (pack.kind === 'pet' || pack.kind === 'course-art') fail('The pack needs ' + (pack.kind === 'pet' ? 'a stand pose' : 'a banner SVG') + ' for its Market picture.');
    const kind = pack.kind === 'preset' && ['layout', 'planner', 'routines', 'settings'].includes(pack.doc.kind) ? pack.doc.kind : pack.kind;
    return { picture: `assets/community/${kind}.svg` };
  }
  // Even when opened directly, submitted SVG is an isolated image inside this inert wrapper.
  const bytes = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="700" height="300" viewBox="0 0 700 300"><image width="700" height="300" preserveAspectRatio="xMidYMid meet" href="data:${type};base64,${data.toString('base64')}"/></svg>\n`);
  return { picture: `community/${id}/picture.svg`, bytes };
}
function approvalChanges(result, issue, community, catalogue) {
  if (!result.ok) fail('A submission with problems cannot be approved.');
  if (!Array.isArray(community) || !catalogue || !Array.isArray(catalogue.packs)) fail('The Market catalogues are not valid.');
  const { fields: f, pack: p, file } = result, id = idFor(p.name, p.sha256);
  if (community.some(c => c.id === id || c.sha256 === p.sha256) || catalogue.packs.some(c => c.id === id)) fail('This pack is already in the Market.');
  const filePath = `community/${id}/${id}${p.extension}`, picture = preview(p, id);
  const entry = { id, name: p.name, by: f.credit, licence: f.licence, kind: p.kind, file: filePath, size: p.size, sha256: p.sha256, picture: picture.picture, issue: issue.html_url };
  const changes = [{ path: filePath, bytes: file.bytes }, { path: 'community.json', bytes: Buffer.from(JSON.stringify([...community, entry], null, 2) + '\n') }, { path: 'packs.json', bytes: Buffer.from(JSON.stringify({ ...catalogue, packs: [...catalogue.packs, { ...entry }] }, null, 2) + '\n') }];
  if (picture.bytes) changes.push({ path: picture.picture, bytes: picture.bytes });
  return { id, entry, changes };
}
function ownerApproval(event) {
  return event.action === 'labeled' && event.label?.name === 'approved' && typeof event.sender?.login === 'string' && event.sender.login.toLowerCase() === event.repository?.owner?.login?.toLowerCase() && event.issue?.labels?.some(l => l.name === 'submission') && !event.issue.pull_request;
}
function githubAPI(repo, token, fetcher = fetch) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) fail('Invalid repository.');
  return async (method, route, body) => {
    const r = await fetcher(`https://api.github.com/repos/${repo}${route}`, { method, redirect: 'error', signal: AbortSignal.timeout(30_000), headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    if (!r.ok) { const e = new Error(`GitHub could not complete ${method} ${route.split('?')[0]} (${r.status}).`); e.status = r.status; throw e; }
    return r.status === 204 ? null : r.json();
  };
}
async function setResultLabels(api, number, ok, issue) {
  const labels = issue.labels.map(l => l.name);
  const remove = ok ? ['needs-changes'] : ['checked', 'approved'];
  for (const label of remove) if (labels.includes(label)) await api('DELETE', `/issues/${number}/labels/${label}`);
  await api('POST', `/issues/${number}/labels`, { labels: [ok ? 'checked' : 'needs-changes'] });
}
async function currentIssue(api, event) {
  const latest = await api('GET', `/issues/${event.issue.number}`);
  if (latest.body !== event.issue.body || latest.state !== 'open' || !latest.labels.some(l => l.name === 'submission')) fail('The issue changed or closed while this run was waiting. Edit it or apply approved again.');
  return latest;
}
async function approve(event, result, api) {
  if (!ownerApproval(event)) fail('Only the repository owner can approve a submission.');
  const issue = await currentIssue(api, event);
  if (!issue.labels.some(l => l.name === 'approved')) fail('Approval has been removed.');
  const repo = event.repository, branch = `market/submission-${issue.number}-${result.pack.sha256.slice(0, 12)}-${hash(Buffer.from(issue.body)).slice(0, 8)}`;
  const existing = await api('GET', `/pulls?state=all&head=${encodeURIComponent(repo.owner.login + ':' + branch)}`);
  if (existing.length) return { url: existing[0].html_url, reused: true };
  const ref = await api('GET', `/git/ref/heads/${encodeURIComponent(repo.default_branch)}`), base = ref.object.sha;
  const commit = await api('GET', `/git/commits/${base}`);
  const readJSON = async name => { const r = await api('GET', `/contents/${name}?ref=${base}`); if (r.encoding !== 'base64' || typeof r.content !== 'string') fail('Cannot read ' + name); return JSON.parse(Buffer.from(r.content, 'base64').toString('utf8')); };
  const community = await readJSON('community.json'), catalogue = await readJSON('packs.json');
  const plan = approvalChanges(result, issue, community, catalogue), tree = [];
  for (const change of plan.changes) { const blob = await api('POST', '/git/blobs', { encoding: 'base64', content: change.bytes.toString('base64') }); tree.push({ path: change.path, mode: '100644', type: 'blob', sha: blob.sha }); }
  const newTree = await api('POST', '/git/trees', { base_tree: commit.tree.sha, tree });
  const next = await api('POST', '/git/commits', { message: `Add community pack ${plan.id}`, tree: newTree.sha, parents: [base] });
  const latest = await currentIssue(api, event); if (!latest.labels.some(l => l.name === 'approved')) fail('Approval has been removed.');
  try { await api('POST', '/git/refs', { ref: 'refs/heads/' + branch, sha: next.sha }); }
  catch (e) {
    if (e.status !== 422) throw e;
    // A prior run may have created the branch but lost its PR response. Reuse it
    // only if its entire tree is exactly the tree just prepared from checked data.
    const existingRef = await api('GET', '/git/ref/heads/' + encodeURIComponent(branch));
    const existingCommit = await api('GET', '/git/commits/' + existingRef.object.sha);
    if (existingCommit.tree.sha !== newTree.sha) fail('The submission branch already exists with different files. The owner needs to review it.');
  }
  const pr = await api('POST', '/pulls', { title: `Add student pack: ${result.pack.name}`, head: branch, base: repo.default_branch, body: `Adds the checked pack from #${issue.number}.\n\nCredit: ${plain(result.fields.credit)}\nLicence: ${result.fields.licence}\nSHA-256: ${result.pack.sha256}\n\nThe owner reviews and merges this pull request to publish it.\n\nCloses #${issue.number}.` });
  return { url: pr.html_url, reused: false, plan };
}
async function main(mode, env = process.env) {
  const event = JSON.parse(fs.readFileSync(env.GITHUB_EVENT_PATH, 'utf8'));
  if (event.repository?.full_name !== env.GITHUB_REPOSITORY || !event.issue || event.issue.pull_request) fail('Unexpected repository or event.');
  if (mode === 'approve' && !ownerApproval(event)) return;
  if (!['check', 'approve'].includes(mode) || !event.issue.labels?.some(l => l.name === 'submission')) return;
  const api = githubAPI(env.GITHUB_REPOSITORY, env.GITHUB_TOKEN), issue = await currentIssue(api, event);
  const result = await checkSubmission(issue);
  // Re-check the body after the download/check; never label a later edit with an older result.
  await currentIssue(api, event);
  if (mode === 'approve' && result.ok) {
    try { const pr = await approve(event, result, api); await postComment(api, issue.number, 'The checked pack is ready for owner review: ' + pr.url); }
    catch (e) { result.ok = false; result.problems.push(e.message); await postComment(api, issue.number, commentText(result)); await setResultLabels(api, issue.number, false, issue); }
  } else {
    await postComment(api, issue.number, commentText(result));
    if (mode === 'check' && event.action === 'edited' && issue.labels.some(l => l.name === 'approved')) await api('DELETE', `/issues/${issue.number}/labels/approved`);
    await setResultLabels(api, issue.number, result.ok, issue);
  }
}
module.exports = { MAX, ZIP_MAX, TYPES, LABELS, RIGHTS, PRIVACY, hash, idFor, parseIssue, attachmentURL, findAttachment, crc32, unzip, inspectPack, runChecker, safeRedirect, download, checkSubmission, commentText, postComment, preview, approvalChanges, ownerApproval, githubAPI, approve, main };
if (require.main === module) main(process.argv[2]).catch(e => { console.error(e.message); process.exitCode = 1; });
