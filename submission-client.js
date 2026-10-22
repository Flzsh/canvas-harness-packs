/* Local-only Market preparation. No dependencies, remote assets or file uploads.
 * CommonJS: require('./submission-client.js'); browser: CanvasHarnessSubmission.
 * inspectBytes(filename, Uint8Array) is synchronous, inspectFile(File, crypto?)
 * reads a local File and hashes its original bytes. Both return {metadata, extension,
 * bytes}; inspectFile also returns id. createStoredZip(filename, bytes) returns a
 * Uint8Array with exactly one stored entry. No backend helpers are required.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    root.CanvasHarnessSubmission = api;
    if (root.document) api.mount(root.document, root);
  }
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const MAX_BYTES = 40000000;
  const KINDS = Object.freeze({ chpack: 'course-art', chkit: 'kit', chtheme: 'theme', chpet: 'pet', chpreset: 'preset' });
  const LICENCES = Object.freeze(['CC BY 4.0', 'CC0 1.0']);
  const CONSENTS = Object.freeze({
    rights: "I made this, or have the right to share it: no copied characters, logos or other people's photos",
    privacy: 'No names, school details or personal information inside'
  });
  const ISSUE_URL = 'https://github.com/Flzsh/canvas-harness-packs/issues/new';
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const fail = message => { throw new Error(message); };
  const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  function printable(value, label, max = Infinity) {
    if (typeof value !== 'string' || /[\p{C}\u2028\u2029]/u.test(value) || value.length > max || !value.trim()) {
      fail(`${label} must contain ${max === Infinity ? 'nonempty printable text' : `1–${max} printable characters`}.`);
    }
    return value.trim();
  }
  function packName(value) {
    const name = printable(value, 'Pack name', 120);
    if (name !== value) fail('Pack name must not start or end with whitespace.');
    return name;
  }
  function validateFileInfo(filename, size) {
    const extension = typeof filename === 'string' && /\.([a-z]+)$/i.exec(filename)?.[1].toLowerCase();
    if (!own(KINDS, extension)) fail('Choose one .chpack, .chkit, .chtheme, .chpet or .chpreset file.');
    if (!Number.isSafeInteger(size) || size < 1 || size > MAX_BYTES) fail('The file must be nonempty and at most 40,000,000 bytes.');
    return extension;
  }
  function asBytes(value) {
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    fail('Expected file bytes as Uint8Array or ArrayBuffer.');
  }
  // Deliberately preliminary. The extension's full checker owns deep schema,
  // SVG sanitation, media decoding, contrast, per-kind budgets and asset hashes.
  function inspectJSON(text, extension) {
    let doc;
    try { doc = JSON.parse(text); } catch { fail('The file must contain valid JSON.'); }
    if (!record(doc)) fail('The JSON must contain one pack object.');
    if (doc.format !== extension) fail(`Expected format "${extension}" for this extension.`);
    return packName(doc.name);
  }
  function attributes(raw) {
    const attrs = Object.create(null);
    let rest = raw;
    const re = /([a-z][a-z0-9-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
    for (const m of raw.matchAll(re)) {
      if (own(attrs, m[1])) fail('Duplicate pack header attribute.');
      attrs[m[1]] = (m[2] ?? m[3]).replace(/&(quot|apos|amp|lt|gt);/g, (_, key) => ({ quot: '"', apos: "'", amp: '&', lt: '<', gt: '>' }[key]));
      rest = rest.replace(m[0], '');
    }
    if (rest.trim()) fail('Malformed pack header.');
    return attrs;
  }
  function inspectChpack(text) {
    // quick-pack.js build() writes this optional prose preamble before the PI.
    const source = text.trimStart().replace(/^Canvas Harness quick upload pack\. Paste all of this text into Quick upload in Canvas Harness, or drop this file there\.\s*/, '');
    const head = /^<\?ch-pack\b([\s\S]*?)\?>/.exec(source);
    if (!head) fail('A .chpack needs a <?ch-pack version="1" name="…"?> header.');
    const attrs = attributes(head[1]);
    if (attrs.version !== '1' || Object.keys(attrs).some(key => !['version', 'name'].includes(key))) fail('Expected a version 1 .chpack header.');
    const name = packName(attrs.name);
    const end = /<\?ch-end\s+parts=(?:"([0-9]+)"|'([0-9]+)')\s*\?>\s*$/.exec(source);
    const parts = [...source.matchAll(/<\?ch-art\b/g)].length;
    if (!end || !parts || Number(end[1] || end[2]) !== parts || !/<svg[\s>]/.test(source) || !/<\/svg>/.test(source)) fail('The .chpack needs complete artwork and a matching <?ch-end parts="N"?> line.');
    if ((source.match(/<\?ch-pack\b/g) || []).length !== 1) fail('Choose one .chpack, with one header.');
    return name;
  }
  function inspectBytes(filename, input) {
    const bytes = asBytes(input), extension = validateFileInfo(filename, bytes.byteLength);
    let text;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { fail('The file must use valid UTF-8 encoding.'); }
    const name = extension === 'chpack' ? inspectChpack(text) : inspectJSON(text, extension);
    return { metadata: { kind: KINDS[extension], name, size: bytes.byteLength }, extension, bytes };
  }
  function slug(name) {
    return String(name).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/g, '') || 'pack';
  }
  function submissionId(name, sha256) {
    if (!/^[a-f0-9]{64}$/.test(sha256)) fail('Expected a lowercase SHA-256 digest.');
    return `${slug(name)}-${sha256.slice(0, 12)}`;
  }
  async function inspectFile(file, cryptography = globalThis.crypto) {
    if (!file || typeof file.arrayBuffer !== 'function') fail('Choose one local pack file.');
    validateFileInfo(file.name, file.size); // Refuse large files before reading.
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length !== file.size) fail('The file size changed while reading. Choose it again.');
    const result = inspectBytes(file.name, bytes);
    if (typeof cryptography?.subtle?.digest !== 'function') fail('SHA-256 is unavailable. Open this page in a modern browser on HTTPS or localhost.');
    const hash = new Uint8Array(await cryptography.subtle.digest('SHA-256', bytes));
    result.metadata.sha256 = Array.from(hash, byte => byte.toString(16).padStart(2, '0')).join('');
    result.id = submissionId(result.metadata.name, result.metadata.sha256);
    return result;
  }
  function validateSubmission(metadata, fields) {
    if (!record(metadata) || !Object.values(KINDS).includes(metadata.kind)) fail('Choose a valid pack first.');
    packName(metadata.name);
    if (!Number.isSafeInteger(metadata.size) || metadata.size < 1 || metadata.size > MAX_BYTES || !/^[a-f0-9]{64}$/.test(metadata.sha256)) fail('The pack metadata is incomplete. Choose the file again.');
    if (!record(fields)) fail('Add a display credit, licence and both confirmations.');
    const credit = printable(fields.credit, 'Display credit', 60);
    if (!LICENCES.includes(fields.licence)) fail('Choose CC BY 4.0 or CC0 1.0.');
    if (fields.rights !== true) fail('Confirm that you made this or have the right to share it.');
    if (fields.privacy !== true) fail('Confirm the privacy and artwork rules.');
    return { credit, licence: fields.licence, rights: true, privacy: true };
  }
  function buildIssueURL(metadata, fields) {
    const valid = validateSubmission(metadata, fields);
    const params = new URLSearchParams({
      template: 'market-submission.yml', title: `Market submission: ${metadata.name}`,
      name: metadata.name, credit: valid.credit, kind: metadata.kind, licence: valid.licence, sha256: metadata.sha256,
      rights: CONSENTS.rights, privacy: CONSENTS.privacy
    });
    return `${ISSUE_URL}?${params}`;
  }
  const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  function crc32(input) {
    const bytes = asBytes(input);
    let crc = 0xffffffff;
    for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 255] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }
  function createStoredZip(filename, input) {
    // Flat ASCII names only: the original filename never reaches the archive.
    if (typeof filename !== 'string' || !/^[a-z0-9][a-z0-9-]{0,70}\.(?:chpack|chkit|chtheme|chpet|chpreset)$/.test(filename)) fail('The ZIP entry must have a safe, flat pack filename.');
    const bytes = asBytes(input);
    if (!bytes.length || bytes.length > MAX_BYTES) fail('Invalid ZIP entry byte size.');
    const name = new TextEncoder().encode(filename), checksum = crc32(bytes);
    const centralOffset = 30 + name.length + bytes.length, centralSize = 46 + name.length;
    const out = new Uint8Array(centralOffset + centralSize + 22), view = new DataView(out.buffer);
    const u16 = (offset, value) => view.setUint16(offset, value, true);
    const u32 = (offset, value) => view.setUint32(offset, value, true);
    u32(0, 0x04034b50); u16(4, 20); u16(6, 0x0800); // UTF-8, stored; fixed 1980-01-01 date.
    u16(12, 0x0021); u32(14, checksum); u32(18, bytes.length); u32(22, bytes.length); u16(26, name.length);
    out.set(name, 30); out.set(bytes, 30 + name.length);
    const c = centralOffset;
    u32(c, 0x02014b50); u16(c + 4, 20); u16(c + 6, 20); u16(c + 8, 0x0800); u16(c + 14, 0x0021);
    u32(c + 16, checksum); u32(c + 20, bytes.length); u32(c + 24, bytes.length); u16(c + 28, name.length);
    out.set(name, c + 46);
    const e = c + centralSize;
    u32(e, 0x06054b50); u16(e + 8, 1); u16(e + 10, 1); u32(e + 12, centralSize); u32(e + 16, centralOffset);
    return out;
  }
  function createPackage(result, fields) {
    const issueURL = buildIssueURL(result.metadata, fields);
    if (!own(KINDS, result.extension) || KINDS[result.extension] !== result.metadata.kind || result.bytes?.length !== result.metadata.size) fail('The file and metadata do not match. Choose the file again.');
    const id = submissionId(result.metadata.name, result.metadata.sha256), filename = `${id}.${result.extension}`;
    return { id, filename, zipName: `${id}.zip`, zip: createStoredZip(filename, result.bytes), issueURL };
  }
  function mount(doc, win) {
    const byId = id => doc.getElementById(`sub-${id}`), form = byId('form');
    if (!form) return null;
    const input = byId('file'), drop = byId('drop'), send = byId('send'), status = byId('status');
    let generation = 0, selected = null, downloadURL = null;
    const fields = () => ({ credit: byId('credit').value, licence: byId('licence').value, rights: byId('rights').checked, privacy: byId('privacy').checked });
    function say(message, error = false) { status.textContent = message; status.dataset.state = error ? 'error' : 'status'; }
    function clearLinks() {
      byId('result').hidden = true;
      byId('github').removeAttribute('href');
      byId('download').removeAttribute('href');
      if (downloadURL) { win.URL.revokeObjectURL(downloadURL); downloadURL = null; }
    }
    function update() {
      let valid = false;
      try { if (selected) { validateSubmission(selected.metadata, fields()); valid = true; } } catch { /* Fill the remaining fields. */ }
      send.disabled = !valid;
    }
    async function choose(files) {
      const token = ++generation;
      selected = null; send.disabled = true; byId('metadata').hidden = true;
      for (const key of ['name', 'kind', 'size', 'sha256']) byId(key).textContent = '';
      // New file, new assent: permission must refer to the file actually sent.
      byId('rights').checked = false; byId('privacy').checked = false;
      clearLinks();
      if (!files || files.length !== 1) { say('Choose exactly one pack file.', true); return; }
      say('Checking your file locally…');
      try {
        const result = await inspectFile(files[0], win.crypto);
        if (token !== generation) return;
        selected = result;
        byId('name').textContent = result.metadata.name;
        byId('kind').textContent = result.metadata.kind;
        byId('size').textContent = `${result.metadata.size.toLocaleString('en-US')} bytes`;
        byId('sha256').textContent = result.metadata.sha256;
        byId('metadata').hidden = false;
        say('Basic local checks passed. Add your credit, choose a licence and confirm both rules.');
        update();
      } catch (error) {
        if (token !== generation) return;
        selected = null;
        say(error.message || 'Could not read that file. Choose it again.', true);
      }
    }
    input.addEventListener('change', () => {
      const files = Array.from(input.files || []);
      input.value = ''; // Allow retrying the same file after an error.
      void choose(files);
    });
    for (const event of ['dragenter', 'dragover']) drop.addEventListener(event, e => { e.preventDefault(); drop.classList.add('sub-over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('sub-over'));
    drop.addEventListener('drop', e => {
      e.preventDefault(); drop.classList.remove('sub-over');
      void choose(Array.from(e.dataTransfer?.files || []));
    });
    // Do not navigate away when a file misses the drop target.
    for (const event of ['dragover', 'drop']) doc.addEventListener(event, e => { e.preventDefault(); });
    form.addEventListener('input', () => { clearLinks(); update(); });
    form.addEventListener('change', () => { clearLinks(); update(); });
    form.addEventListener('submit', e => {
      e.preventDefault();
      try {
        if (!selected) fail('Choose a valid pack first.');
        // No await here: validation and SHA-256 finished during selection. This
        // keeps window.open in the Send gesture, even after slow file reads.
        const pack = createPackage(selected, fields());
        clearLinks();
        downloadURL = win.URL.createObjectURL(new win.Blob([pack.zip], { type: 'application/zip' }));
        const download = byId('download'), github = byId('github');
        download.href = downloadURL; download.download = pack.zipName;
        github.href = pack.issueURL;
        byId('result').hidden = false;
        // Trigger the download before attempting the new tab. Both fallback
        // anchors remain available if either browser action is restricted.
        download.click();
        let opened = null;
        try { opened = win.open(pack.issueURL, '_blank', 'noopener,noreferrer'); } catch { /* Use the visible anchor. */ }
        say(opened ? 'Zip prepared. Continue on GitHub; your file has not been uploaded.' : 'Zip prepared. Use the GitHub link below if a new tab did not open.');
      } catch (error) { say(error.message || 'Could not prepare the zip. Try again.', true); }
    });
    win.addEventListener('pagehide', () => { ++generation; selected = null; send.disabled = true; clearLinks(); });
    update();
    return { choose }; // Also lets Node tests exercise races with a small DOM seam.
  }
  return Object.freeze({ MAX_BYTES, KINDS, LICENCES, CONSENTS, ISSUE_URL, validateFileInfo, inspectBytes, inspectFile, slug, submissionId, validateSubmission, buildIssueURL, crc32, createStoredZip, createPackage, mount });
});
