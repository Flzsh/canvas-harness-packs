#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { TextDecoder } = require('node:util');

const BASE = 'refs/remotes/origin/main';
const ZERO = /^0+$/;
const NO_REPLY = /^(?:[0-9]+\+)?[a-z0-9]+(?:-[a-z0-9]+)*@users\.noreply\.github\.com$/i;
const TEXT = /\.(?:[cm]?[jt]sx?|jsonc?|mdx?|txt|csv|tsv|html?|css|s[ac]ss|less|svg|ya?ml|toml|xml|ini|conf|cfg|sh|bash|bat|cmd|ps1|py|rb|go|rs|[ch]|cpp|hpp|java|sql|lock|vue|svelte)$/i;
const BINARY = /\.(?:png|jpe?g|gif|webp|avif|ico|bmp|tiff?|pdf|zip|gz|bz2|xz|7z|rar|tar|woff2?|ttf|otf|eot|mp[34]|wav|ogg|flac|webm|mov|bin|wasm|dll|exe)$/i;
const CODE = /\.(?:[cm]?[jt]sx?|java|[ch]|cpp|hpp|cs|go|rs|swift|kt|css|s[ac]ss|less|vue|svelte)$/i;
const MAPS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies', 'overrides', 'resolutions'];
const BUNDLES = ['bundledDependencies', 'bundleDependencies'];
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const lines = text => text.split('\n');
const display = file => JSON.stringify(file);

class CheckError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

function aiTrailer(line) {
  const match = /^\s*(?:[-*>]\s*)?co-authored(?:-|\s+)by\s*:\s*(.*?)\s*(?:<([^<>]*)>)?\s*$/i.exec(line);
  if (!match) return false;
  const name = match[1].trim().replace(/\s*\[bot\]$/i, '');
  return /^(?:(?:openai\s+)?(?:chatgpt|codex)|(?:github\s+)?copilot|(?:anthropic\s+)?claude(?:\s+(?:code|sonnet|opus|haiku)(?:[\s\dv.-]+)?)?|(?:google\s+)?gemini(?:[\s\dv.-]+(?:pro|flash)?)?|cursor|devin|aider|codeium|windsurf|coderabbit|gpt[\s-]?\d[\w. -]*|ai(?:\s+(?:assistant|agent))?)(?:\s+bot)?$/i.test(name)
    || /^(?:\d+\+)?(?:claude|codex|chatgpt|copilot|cursor|devin)(?:\[bot\])?@/i.test(match[2] || '');
}

function identities(line) {
  const email = /[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+/gi;
  return /\b(?:Mr|Ms|Dr)\.\s+\p{Lu}[\p{L}\p{M}'-]*/u.test(line)
    || [...line.matchAll(email)].some(match => !NO_REPLY.test(match[0]))
    || /(?:\+\d{1,3}[ .()-]*)?(?:\d[ .()-]*){9,14}\d\b/.test(line)
    || /\b(?:student|school|employee|patient)\s*(?:id|number|no\.)\s*[:#=]?\s*\d+/i.test(line)
    || /\b\d{3}-\d{2}-\d{4}\b/.test(line)
    || /\b(?:api[_ -]?key|access[_ -]?token|password|secret)\s*[:=]\s*["']?[^\s"']{6,}/i.test(line);
}

// Keep lexical state across unchanged lines, too: a hunk can start inside a string.
function inlineComments(text) {
  const found = new Set();
  let state = 'code', escaped = false, regexClass = false, previous = '', code = false, number = 1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i + 1];
    if (ch === '\n') {
      number++; code = false; previous = '';
      if (state === 'line' || state === 'regex') state = 'code';
      if ((state === "'" || state === '"') && !escaped) state = 'code';
      escaped = false; continue;
    }
    if (state === 'line') continue;
    if (state === 'block') {
      if (ch === '*' && next === '/') { state = 'code'; i++; }
      continue;
    }
    if (state !== 'code') {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (state === 'regex') {
        if (ch === '[') regexClass = true;
        if (ch === ']') regexClass = false;
        if (ch === '/' && !regexClass) { state = 'code'; previous = 'value'; }
      } else if (ch === state) { state = 'code'; previous = 'value'; code = true; }
      continue;
    }
    if (/\s/.test(ch)) continue;
    if (ch === '/' && next === '*') { state = 'block'; i++; continue; }
    if (ch === '/' && next === '/') { if (code) found.add(number); state = 'line'; i++; continue; }
    code = true;
    if (ch === '"' || ch === "'" || ch === '`') { state = ch; escaped = false; continue; }
    if (ch === '/' && (!previous || /[=(:,!&|?;{\[]/.test(previous))) {
      state = 'regex'; regexClass = false; continue;
    }
    previous = ch;
  }
  return found;
}

function decode(buffer, file) {
  const namedText = TEXT.test(file) || /^(?:\.[\w.-]+|Dockerfile|Makefile|LICENSE|NOTICE)$/i.test(path.posix.basename(file));
  if (!namedText && BINARY.test(file)) return null;
  const utf16 = buffer.length >= 2 && ((buffer[0] === 255 && buffer[1] === 254) || (buffer[0] === 254 && buffer[1] === 255));
  if (!namedText && buffer.includes(0) && !utf16) return null;
  if (utf16 || buffer.includes(0)) throw new CheckError('UTF8', 'Text must use UTF-8, without NUL bytes.');
  try { return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(buffer); }
  catch { throw new CheckError('UTF8', 'Text is not valid UTF-8.'); }
}

function manifest(buffer) {
  let value;
  try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(buffer)); }
  catch { throw new CheckError('PACKAGE_JSON', 'Cannot safely compare malformed package.json.'); }
  if (!object(value)) throw new CheckError('PACKAGE_JSON', 'package.json must contain an object.');
  const result = new Map();
  const invalid = () => { throw new CheckError('PACKAGE_JSON', 'Invalid dependency declaration in package.json.'); };
  function map(value, prefix, nested = false) {
    if (!object(value)) invalid();
    for (const [name, version] of Object.entries(value)) {
      if (!name) invalid();
      if (name !== '.' || !nested || prefix.length === 1) result.set(JSON.stringify([...prefix, name]), prefix[0]);
      if (typeof version === 'string') continue;
      if (nested && object(version)) map(version, [...prefix, name], true);
      else invalid();
    }
  }
  for (const field of MAPS) if (own(value, field)) map(value[field], [field], field === 'overrides');
  for (const field of BUNDLES) if (own(value, field)) {
    const bundle = value[field];
    if (typeof bundle === 'boolean') { if (bundle) result.set(JSON.stringify([field, '*']), field); }
    else if (Array.isArray(bundle) && bundle.every(name => typeof name === 'string' && name.length)) {
      for (const name of bundle) result.set(JSON.stringify([field, name]), field);
    } else invalid();
  }
  if (own(value, 'pnpm')) {
    if (!object(value.pnpm)) invalid();
    if (own(value.pnpm, 'overrides')) map(value.pnpm.overrides, ['pnpm.overrides']);
    if (own(value.pnpm, 'packageExtensions')) {
      if (!object(value.pnpm.packageExtensions)) invalid();
      for (const [selector, extension] of Object.entries(value.pnpm.packageExtensions)) {
        if (!object(extension)) invalid();
        for (const field of MAPS.slice(0, 4)) if (own(extension, field)) map(extension[field], ['pnpm.packageExtensions', selector, field]);
      }
    }
  }
  return result;
}

function check(cwd = process.cwd()) {
  const report = [];
  const emit = (level, code, detail) => report.push(`${level} ${code} ${detail}`);
  const env = { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_NO_REPLACE_OBJECTS: '1', GIT_TERMINAL_PROMPT: '0', GIT_PAGER: 'cat' };
  // A supplied clone path, rather than an inherited Git worktree/index override, is authoritative.
  for (const key of Object.keys(env)) if (/^GIT_(?:DIR|WORK_TREE|COMMON_DIR|INDEX_FILE|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES|CEILING_DIRECTORIES|PREFIX|SHALLOW_FILE)$/i.test(key)) delete env[key];
  let root = path.resolve(cwd);
  const gitOptions = ['--no-optional-locks', '--no-replace-objects', '--literal-pathspecs', '-c', 'core.fsmonitor=false', '-c', 'color.ui=false'];
  function git(args, { optional = false, input } = {}) {
    const r = spawnSync('git', [...gitOptions, ...args], { cwd: root, env, input, maxBuffer: 128 * 1024 * 1024, timeout: 30000, windowsHide: true });
    if (r.error || r.signal) throw new CheckError('GIT', 'Unable to run Git reliably; check the Git installation and local repository.');
    if (r.status !== 0 && !optional) throw new CheckError('GIT', 'Git could not read the local history, index or diff; check repository integrity.');
    return { status: r.status, data: r.stdout };
  }
  function string(buffer) {
    try { return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(buffer); }
    catch { throw new CheckError('UTF8', 'Git returned a path or commit message that is not valid UTF-8.'); }
  }
  const blobCache = new Map();
  function blobs(oids) {
    const missing = [...new Set(oids.filter(oid => !ZERO.test(oid) && !blobCache.has(oid)))];
    for (let start = 0; start < missing.length; start += 64) {
      const chunk = missing.slice(start, start + 64);
      const data = git(['cat-file', '--batch'], { input: chunk.join('\n') + '\n' }).data;
      let offset = 0;
      for (const oid of chunk) {
        const end = data.indexOf(10, offset);
        const header = data.subarray(offset, end).toString('ascii').split(' ');
        const size = Number(header[2]);
        if (end < 0 || header[0] !== oid || header[1] !== 'blob' || !Number.isSafeInteger(size) || size < 0 || end + size + 2 > data.length) {
          throw new CheckError('GIT', 'Git could not read a required file blob; check repository integrity.');
        }
        blobCache.set(oid, data.subarray(end + 1, end + 1 + size)); offset = end + size + 2;
      }
    }
  }
  const blob = oid => ZERO.test(oid) ? Buffer.alloc(0) : blobCache.get(oid);
  const diffOptions = ['--no-ext-diff', '--no-textconv', '--find-renames', '--ignore-submodules=none'];
  function changes(args) {
    const fields = string(git([...args, ...diffOptions, '--raw', '--no-abbrev', '-z', '--']).data).split('\0');
    const result = [];
    for (let i = 0; i < fields.length && fields[i];) {
      const match = /^:(\d+) (\d+) ([0-9a-f]+) ([0-9a-f]+) ([A-Z])\d*$/.exec(fields[i++]);
      if (!match || !fields[i]) throw new CheckError('GIT', 'Git returned an unreadable file change.');
      const oldPath = fields[i++], file = match[5] === 'R' || match[5] === 'C' ? fields[i++] : oldPath;
      if (!file || match[5] === 'U') throw new CheckError('INDEX', 'Resolve unmerged index entries before checking a PR.');
      result.push({ oldMode: match[1], mode: match[2], oldOid: match[3], oid: match[4], oldPath, file, args });
    }
    blobs(result.flatMap(change => [change.oldMode === '160000' ? '0' : change.oldOid, change.mode === '160000' ? '0' : change.oid]));
    return result;
  }
  function addedNumbers(patch) {
    const numbers = new Set(); let number = 0, inHunk = false;
    for (const line of lines(patch)) {
      const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
      if (hunk) { number = Number(hunk[1]); inHunk = true; continue; }
      if (!inHunk) continue;
      if (line.startsWith('+')) numbers.add(number++);
      else if (line.startsWith(' ')) number++;
      else if (!line.startsWith('-') && !line.startsWith('\\')) inHunk = false;
    }
    return numbers;
  }
  function added(change) {
    // Deleted legacy bytes need not be UTF-8; the new snapshot is validated separately.
    return addedNumbers(git([...change.args, ...diffOptions, '--text', '--unified=0', '--no-color', '--', ...new Set([change.oldPath, change.file])]).data.toString('utf8'));
  }
  let scratch, tempRoot;
  function worktreeAdded(before, after) {
    // Diff literal bytes outside the clone: attributes, clean filters and index
    // flags must not hide physical worktree edits or run external filter code.
    if (!scratch) {
      tempRoot = fs.realpathSync(os.tmpdir());
      scratch = fs.mkdtempSync(path.join(tempRoot, 'pre-pr-diff-'));
    }
    const oldFile = path.join(scratch, 'before'), newFile = path.join(scratch, 'after');
    fs.writeFileSync(oldFile, before, { mode: 0o600 });
    fs.writeFileSync(newFile, after, { mode: 0o600 });
    const diff = git(['diff', '--no-index', '--no-ext-diff', '--no-textconv', '--text', '--unified=0', '--no-color', '--', oldFile, newFile], { optional: true });
    if (diff.status !== 0 && diff.status !== 1) throw new CheckError('GIT', 'Git could not compare worktree file bytes.');
    return addedNumbers(diff.data.toString('utf8'));
  }
  const scope = new Set();
  function scopeOf(file) {
    if (!/^(?:extension|tests|docs|scripts)\//.test(file) && !scope.has(file)) {
      scope.add(file); emit('WARN', 'OUTSIDE_SCOPE', `${display(file)} is outside extension/, tests/, docs/ and scripts/.`);
    }
  }
  function inspect(file, buffer, previous, getAdded, context) {
    scopeOf(file);
    const where = `${display(file)} (${context})`;
    if (path.posix.basename(file) === 'package.json') {
      try {
        const now = manifest(buffer), before = previous.map(old => manifest(old));
        const fields = new Set([...now].filter(([key]) => before.every(map => !map.has(key))).map(([, field]) => field));
        for (const field of fields) emit('FAIL', 'DEPENDENCY', `${where}: new entries in ${field}; no new dependencies are allowed.`);
      } catch (error) { if (!(error instanceof CheckError)) throw error; emit('FAIL', error.code, `${where}: ${error.message}`); }
    }
    let text;
    try { text = decode(buffer, file); }
    catch (error) { emit('FAIL', error.code, `${where}: ${error.message}`); return; }
    if (text === null) return;
    if (text.includes('\r\n')) emit('FAIL', 'CRLF', `${where}: use LF line endings.`);
    const numbers = getAdded();
    const comments = CODE.test(file) ? inlineComments(text) : new Set();
    lines(text).forEach((line, i) => {
      if (!numbers.has(i + 1)) return;
      const location = `${display(`${file}:${i + 1}`)} (${context})`;
      if (/\bgenerated[ \t]+with\b/i.test(line)) emit('FAIL', 'GENERATED_WITH', `${location}: remove the generation footer.`);
      if (aiTrailer(line)) emit('FAIL', 'AI_COAUTHOR', `${location}: remove the AI co-author trailer.`);
      if (comments.has(i + 1)) emit('WARN', 'INLINE_COMMENT', `${location}: review the end-of-code // comment.`);
      if (identities(line)) emit('WARN', 'IDENTITY', `${location}: review possible private identity or credential text (content withheld).`);
    });
  }
  function review(groups, context) {
    const maps = groups.map(group => new Map(group.map(change => [change.file, change])));
    for (const [file, change] of maps[0]) {
      if (!maps.every(map => map.has(file))) continue;
      const versions = maps.map(map => map.get(file));
      scopeOf(file); for (const version of versions) scopeOf(version.oldPath);
      if (change.mode === '000000') continue;
      if (change.mode === '160000') { emit('WARN', 'SUBMODULE', `${display(file)} (${context}): submodule contents require separate review.`); continue; }
      const previous = versions.map(version => version.oldMode === '160000' || (path.posix.basename(file) === 'package.json' && path.posix.basename(version.oldPath) !== 'package.json') ? Buffer.from('{}') : blob(version.oldOid));
      // An absent manifest is an empty declaration, rather than malformed JSON.
      if (path.posix.basename(file) === 'package.json') versions.forEach((version, i) => { if (version.oldMode === '000000') previous[i] = Buffer.from('{}'); });
      inspect(file, blob(change.oid), previous, () => {
        const sets = versions.map(added);
        return new Set([...sets[0]].filter(number => sets.every(set => set.has(number))));
      }, context);
    }
  }
  function worktree(file, mode) {
    const absolute = path.resolve(root, file);
    const relative = path.relative(root, absolute);
    if (!relative || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) throw new CheckError('PATH', 'A changed path escapes the clone.');
    try {
      // Never follow a symlink (including a parent directory) outside the clone.
      const parts = file.split('/'); let parent = root;
      for (const part of parts.slice(0, -1)) {
        parent = path.join(parent, part);
        if (fs.lstatSync(parent).isSymbolicLink()) throw new CheckError('PATH', 'A changed file has a symlink parent; inspect it separately.');
      }
      const stat = fs.lstatSync(absolute);
      if (stat.isSymbolicLink()) return Buffer.from(fs.readlinkSync(absolute), 'utf8');
      if (mode === '160000' || stat.isDirectory()) return null;
      if (!stat.isFile()) throw new CheckError('FILE', 'A changed path is not a regular file.');
      return fs.readFileSync(absolute);
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null;
      if (error instanceof CheckError) throw error;
      throw new CheckError('FILE', 'Unable to read a changed file.');
    }
  }
  try {
    const repository = git(['rev-parse', '--show-toplevel'], { optional: true });
    if (repository.status !== 0) throw new CheckError('REPOSITORY', 'Run this checker in a local clone working directory, or pass its path.');
    root = string(repository.data).replace(/\r?\n$/, '');
    if (git(['rev-parse', '--verify', '--quiet', `${BASE}^{commit}`], { optional: true }).status !== 0) {
      throw new CheckError('BASE_REF', 'Missing local origin/main. Verify a trusted local main commit, then use git update-ref refs/remotes/origin/main <verified-local-main-commit>. No network fetch was attempted.');
    }
    if (git(['rev-parse', '--verify', '--quiet', 'HEAD^{commit}'], { optional: true }).status !== 0) throw new CheckError('HEAD', 'The clone needs a valid HEAD commit.');
    if (git(['merge-base', BASE, 'HEAD'], { optional: true }).status !== 0) throw new CheckError('HISTORY', 'HEAD and local origin/main need readable, shared history; check the base ref and shallow-clone history.');
    const commits = string(git(['rev-list', '--reverse', '--topo-order', `${BASE}..HEAD`]).data).trim().split('\n').filter(Boolean);
    for (const oid of commits) {
      const [parents, author, committer, ...body] = string(git(['show', '-s', '--format=%P%x00%ae%x00%ce%x00%B', oid]).data).split('\0');
      const context = `commit ${oid.slice(0, 12)}`;
      for (const [role, email] of [['AUTHOR', author], ['COMMITTER', committer]]) if (!NO_REPLY.test(email)) {
        emit('WARN', `${role}_EMAIL`, `${context}: ${role.toLowerCase()} email is not GitHub no-reply (email withheld). Configure your GitHub no-reply identity, then git commit --amend --reset-author --no-edit for the tip; use git rebase -i to edit older commits and amend each affected commit.`);
      }
      const message = body.join('\0');
      if (/\bgenerated[ \t]+with\b/i.test(message)) emit('FAIL', 'GENERATED_WITH', `${context}: remove the generation footer from the commit message.`);
      if (lines(message).some(aiTrailer)) emit('FAIL', 'AI_COAUTHOR', `${context}: remove the AI co-author trailer from the commit message.`);
      const parentList = parents.split(' ').filter(Boolean);
      const groups = parentList.length ? parentList.map(parent => changes(['diff', parent, oid])) : [changes(['diff-tree', '--root', '--no-commit-id', '-r', oid])];
      // Side-branch commits are checked individually. A merge adds only lines absent
      // from every parent; importing local origin/main is not a new violation.
      review(groups, context);
    }
    review([changes(['diff', '--cached', 'HEAD'])], 'staged');

    const entries = string(git(['ls-files', '--stage', '-z', '--']).data).split('\0').filter(Boolean).map(entry => {
      const match = /^(\d+) ([0-9a-f]+) (\d)\t([\s\S]+)$/.exec(entry);
      if (!match) throw new CheckError('GIT', 'Git returned an unreadable index entry.');
      if (match[3] !== '0') throw new CheckError('INDEX', 'Resolve unmerged index entries before checking a PR.');
      return { mode: match[1], oid: match[2], file: match[4] };
    });
    blobs(entries.filter(entry => entry.mode !== '160000').map(entry => entry.oid));
    for (const entry of entries) {
      if (entry.mode === '160000') continue;
      const current = worktree(entry.file, entry.mode), previous = blob(entry.oid);
      if (current === null) { scopeOf(entry.file); continue; }
      if (current.equals(previous)) continue;
      inspect(entry.file, current, [previous], () => worktreeAdded(previous, current), 'unstaged');
    }
    for (const file of string(git(['ls-files', '--others', '--exclude-standard', '-z', '--']).data).split('\0').filter(Boolean)) {
      const current = worktree(file);
      if (current !== null) inspect(file, current, [Buffer.from('{}')], () => new Set(lines(current.toString('utf8')).map((_, i) => i + 1)), 'untracked');
    }
  } catch (error) {
    emit('FAIL', error instanceof CheckError ? error.code : 'CHECKER', error instanceof CheckError ? error.message : 'The checker could not complete; no passing result is available.');
  } finally {
    if (scratch) {
      try {
        const resolved = fs.realpathSync(scratch);
        if (!path.isAbsolute(resolved) || path.dirname(resolved) !== tempRoot || resolved !== path.resolve(scratch) || !/^pre-pr-diff-[a-z0-9]{6}$/i.test(path.basename(resolved))) {
          throw new Error('Unsafe temporary path');
        }
        fs.rmSync(resolved, { recursive: true, force: true });
      } catch { emit('FAIL', 'TEMP', 'Could not safely clean up the temporary byte-diff directory.'); }
    }
  }
  const failures = report.filter(line => line.startsWith('FAIL ')).length;
  const warnings = report.filter(line => line.startsWith('WARN ')).length;
  report.push(`Pre-PR check: ${failures} failure(s), ${warnings} warning(s).`);
  return { status: failures ? 1 : 0, output: report.join('\n') + '\n' };
}

if (require.main === module) {
  const result = process.argv.length > 3 ? { status: 1, output: 'FAIL USAGE Use node pre-pr-check.cjs [local-clone-path]\n' } : check(process.argv[2]);
  process.stdout.write(result.output);
  process.exitCode = result.status;
}

module.exports = { check };
