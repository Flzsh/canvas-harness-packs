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
function preview(pack, id) {
  let type, data;
  if (pack.kind === 'course-art') {
    const part = [...pack.text.matchAll(/<\?ch-art\s+([^?]*)\?>([\s\S]*?)(?=<\?ch-|$)/g)].find(m => /\bslot\s*=\s*["']banner["']/.test(m[1]));
    const svg = part?.[2].match(/<svg[\s>][\s\S]*<\/svg>/)?.[0];
    if (svg) { type = 'image/svg+xml'; data = Buffer.from(svg); }
  } else {
    const d = pack.doc;
    const refs = pack.kind === 'pet' ? [d.poses?.stand] : pack.kind === 'theme' ? [d.banner?.still, d.banner?.asset, d.background?.still, d.background?.asset] : [];
    // A movie banner must not hide an available background still.
    const asset = refs.map(ref => typeof ref === 'string' ? d.assets?.[ref] : null).find(a => a && ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(a.type));
    if (asset && ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(asset.type) && typeof asset.data === 'string') {
      if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(asset.data)) fail('The card picture is not valid base64.');
      data = Buffer.from(asset.data, 'base64'); type = asset.type;
      if (!data.length || hash(data) !== asset.sha256) fail('The card picture does not match its asset SHA-256.');
    }
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
