#!/usr/bin/env node
// Packs a folder into one Canvas Harness file: .chtheme, .chpet or .chpreset.
//   node scripts/make-pack.cjs <folder> [--out file]
// The folder holds theme.json, pet.json or preset.json, written exactly as the format says except that each entry in
// "assets" is a file name in the folder instead of {type, data, sha256}:  "assets": {"sky": "sky.mp4", "panel": "panel.svg"}
// This script reads each file, works out its type from the extension, and writes base64 data with its SHA-256.
// Then run scripts/check.cjs on the result. No dependencies.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const args = process.argv.slice(2), at = args.indexOf('--out'), out = at >= 0 ? args.splice(at, 2)[1] : null, dir = args[0];
if (!dir || !fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) { console.error('Usage: node scripts/make-pack.cjs <folder> [--out file]'); process.exit(2); }
const KINDS = { 'theme.json': ['chtheme', '.chtheme'], 'pet.json': ['chpet', '.chpet'], 'preset.json': ['chpreset', '.chpreset'] };
const found = Object.keys(KINDS).filter(f => fs.existsSync(path.join(dir, f)));
if (found.length !== 1) { console.error(`Put exactly one of ${Object.keys(KINDS).join(', ')} in ${dir} (found ${found.length}).`); process.exit(2); }
const [format, ext] = KINDS[found[0]];
const TYPES = { '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2' };
let doc; try { doc = JSON.parse(fs.readFileSync(path.join(dir, found[0]), 'utf8')); } catch (e) { console.error(`${found[0]} is not valid JSON: ${e.message}`); process.exit(1); }
if (doc.format === undefined) doc = { format, version: 1, ...doc };
if (doc.format !== format) { console.error(`${found[0]} says format "${doc.format}"; it must be "${format}".`); process.exit(1); }
const assets = doc.assets || {}, packed = {}; let total = 0;
for (const [id, file] of Object.entries(assets)) {
  if (typeof file !== 'string') { console.error(`assets.${id} must be a file name in the folder.`); process.exit(1); }
  const p = path.join(dir, file), type = TYPES[path.extname(file).toLowerCase()];
  if (!type) { console.error(`assets.${id}: ${file} is not a type Canvas Harness takes (${Object.keys(TYPES).join(' ')}).`); process.exit(1); }
  if (!fs.existsSync(p)) { console.error(`assets.${id}: ${file} is not in ${dir}.`); process.exit(1); }
  const bytes = fs.readFileSync(p); total += bytes.length;
  packed[id] = { type, data: bytes.toString('base64'), sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
}
if (Object.keys(assets).length) doc.assets = packed;
const text = JSON.stringify(doc), file = out || path.join(path.dirname(path.resolve(dir)), path.basename(path.resolve(dir)) + ext);
if (Buffer.byteLength(text) > 40000000) { console.error(`The packed file would be ${(Buffer.byteLength(text) / 1e6).toFixed(1)} MB; Canvas Harness takes at most 40 MB. Shrink the video or images.`); process.exit(1); }
fs.writeFileSync(file, text);
console.log(`packed ${format} "${doc.name}" with ${Object.keys(packed).length} asset(s), ${(total / 1024).toFixed(0)} KiB of files -> ${file}\nNext: node scripts/check.cjs "${file}" --preview preview.html`);
