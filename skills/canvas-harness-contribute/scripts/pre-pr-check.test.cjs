'use strict';
const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), cp = require('node:child_process');
const checker = path.join(__dirname, 'pre-pr-check.cjs');
const noReply = '12345+fixture-user@users.noreply.github.com', footer = 'Generated ' + 'with a tool';
function fixture(t, initial = {}) {
  const tempRoot = fs.realpathSync(os.tmpdir());
  const temp = fs.mkdtempSync(path.join(tempRoot, 'pre-pr-fixture-')), repo = path.join(temp, 'repo with spaces');
  t.after(() => {
    const absolute = fs.realpathSync(temp);
    assert.ok(path.isAbsolute(absolute)); assert.equal(absolute, path.resolve(temp)); assert.equal(path.dirname(absolute), tempRoot);
    assert.match(path.basename(absolute), /^pre-pr-fixture-[a-z0-9]{6}$/i);
    fs.rmSync(absolute, { recursive: true, force: true });
  });
  fs.mkdirSync(repo); fs.mkdirSync(path.join(temp, 'empty'));
  const config = path.join(temp, 'isolated.config'); fs.writeFileSync(config, '');
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^GIT_/i.test(key)));
  Object.assign(env, { GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_SYSTEM: config, GIT_CONFIG_GLOBAL: config, GIT_CONFIG_COUNT: '0', GIT_ATTR_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0', GIT_AUTHOR_NAME: 'Fixture', GIT_COMMITTER_NAME: 'Fixture', GIT_AUTHOR_EMAIL: noReply, GIT_COMMITTER_EMAIL: noReply });
  const args = ['-c', 'commit.gpgsign=false', '-c', 'tag.gpgsign=false', '-c', `core.hooksPath=${path.join(temp, 'empty')}`, '-c', 'core.autocrlf=false', '-c', 'core.safecrlf=false', '-c', `core.attributesFile=${config}`, '-c', `core.excludesFile=${config}`, '-c', `safe.directory=${repo}`];
  function git(argv, extra = {}) {
    const r = cp.spawnSync('git', [...args, ...argv], { cwd: repo, env: { ...env, ...extra }, encoding: 'utf8', timeout: 15000 });
    assert.equal(r.status, 0, `Fixture git ${argv[0]} failed: ${r.error?.code || r.stderr}`); return r.stdout.trim();
  }
  function write(file, data) { const target = path.join(repo, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, data); }
  function commit(message = 'Fixture change', extra = {}) { git(['add', '--all']); return git(['commit', '--no-verify', '--no-gpg-sign', '-m', message], extra); }
  function run(options = {}) {
    const r = cp.spawnSync(process.execPath, [checker, ...(options.defaultCwd ? [] : [repo])], { cwd: options.cwd || (options.defaultCwd ? repo : temp), env: { ...env, ...options.env }, encoding: 'utf8', timeout: 30000 });
    assert.ifError(r.error); return { status: r.status, output: r.stdout + r.stderr };
  }
  git(['init', '--initial-branch=main', `--template=${path.join(temp, 'empty')}`]);
  write('extension/base.js', 'const baseline = true;\n');
  for (const [file, data] of Object.entries(initial)) write(file, typeof data === 'object' && !Buffer.isBuffer(data) ? JSON.stringify(data) + '\n' : data);
  commit('Fixture baseline'); git(['update-ref', 'refs/remotes/origin/main', 'HEAD']); git(['switch', '-c', 'fixture-work']);
  return { repo, temp, env, git, write, commit, run };
}
function passes(result) { assert.equal(result.status, 0, result.output); assert.doesNotMatch(result.output, /^FAIL /m); }
function fails(result, code) { assert.equal(result.status, 1, result.output); assert.match(result.output, new RegExp(`^FAIL ${code}\\b`, 'm')); }

test('clean baseline passes from an explicit repo or default cwd', t => {
  const f = fixture(t); passes(f.run()); passes(f.run({ defaultCwd: true }));
  assert.doesNotMatch(f.run().output, /^WARN /m);
});
test('requiring the module has no output or process exit side effect', () => {
  const r = cp.spawnSync(process.execPath, ['-e', 'require(process.argv[1]); console.log("import-ok");', checker], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr); assert.equal(r.stdout.trim(), 'import-ok');
});
test('missing origin/main fails with local setup guidance and does not create the ref', t => {
  const f = fixture(t); f.git(['update-ref', '-d', 'refs/remotes/origin/main']); const r = f.run();
  fails(r, 'BASE_REF'); assert.match(r.output, /git update-ref refs\/remotes\/origin\/main/); assert.match(r.output, /local|locally/i);
  assert.equal(f.git(['for-each-ref', '--format=%(refname)', 'refs/remotes/origin/main']), '');
});
test('an invalid repo fails without exposing an absolute source path', t => {
  const f = fixture(t), r = cp.spawnSync(process.execPath, [checker, f.temp], { env: f.env, encoding: 'utf8' });
  assert.equal(r.status, 1); assert.match(r.stdout, /^FAIL REPOSITORY/m); assert.ok(!r.stdout.includes(f.temp));
});
test('only commits after the merge base are checked', t => {
  const f = fixture(t); f.write('docs/baseline.md', 'Baseline\n'); f.commit('Baseline-only footer\n\n' + footer, { GIT_AUTHOR_EMAIL: 'fixture@example.test' });
  f.git(['update-ref', 'refs/remotes/origin/main', 'HEAD']); f.write('extension/base.js', 'const baseline = false;\n'); f.commit();
  const r = f.run(); passes(r); assert.doesNotMatch(r.output, /EMAIL|GENERATED_WITH/);
});
test('origin/main may advance independently of the branch', t => {
  const f = fixture(t); f.write('extension/branch.js', 'const branch = true;\n'); f.commit();
  f.git(['switch', 'main']); f.write('extension/upstream.js', footer + '\n'); f.commit(); f.git(['update-ref', 'refs/remotes/origin/main', 'HEAD']); f.git(['switch', 'fixture-work']);
  passes(f.run());
});
for (const [label, extra, expected] of [
  ['author', { GIT_AUTHOR_EMAIL: 'fixture@example.test' }, 'AUTHOR_EMAIL'],
  ['committer', { GIT_COMMITTER_EMAIL: 'fixture@example.test' }, 'COMMITTER_EMAIL']
]) test(`warns independently about ${label} email and explains history repair`, t => {
  const f = fixture(t); f.write('extension/base.js', 'const baseline = false;\n'); f.commit('Fixture change', extra);
  const r = f.run(); passes(r); assert.match(r.output, new RegExp(`^WARN ${expected}\\b`, 'm'));
  assert.doesNotMatch(r.output, new RegExp(`^WARN ${label === 'author' ? 'COMMITTER' : 'AUTHOR'}_EMAIL\\b`, 'm'));
  assert.match(r.output, /git commit --amend --reset-author/); assert.match(r.output, /git rebase -i/); assert.ok(!r.output.includes(extra[Object.keys(extra)[0]]));
});
test('only valid GitHub no-reply email syntax avoids warnings', t => {
  const f = fixture(t);
  for (const email of ['fixture-user@users.noreply.github.com', '123+fixture-user@users.noreply.github.com']) {
    f.write('extension/base.js', `const baseline = ${JSON.stringify(email)};\n`); f.commit('Fixture change', { GIT_AUTHOR_EMAIL: email, GIT_COMMITTER_EMAIL: email });
  }
  let r = f.run(); passes(r); assert.doesNotMatch(r.output, /AUTHOR_EMAIL|COMMITTER_EMAIL/);
  for (const email of ['fixture@elsewhere.noreply.github.com', 'x+fixture@users.noreply.github.com', '123+@users.noreply.github.com', '-fixture@users.noreply.github.com', 'fixture--user@users.noreply.github.com', 'fixture@users.noreply.github.com.evil.test']) {
    f.write('extension/base.js', `const baseline = ${JSON.stringify(email)};\n`); f.commit('Fixture change', { GIT_AUTHOR_EMAIL: email, GIT_COMMITTER_EMAIL: email });
  }
  r = f.run(); passes(r); assert.equal((r.output.match(/^WARN AUTHOR_EMAIL\b/gm) || []).length, 6); assert.equal((r.output.match(/^WARN COMMITTER_EMAIL\b/gm) || []).length, 6);
});
test('AI co-author trailers fail in earlier commits even after a later fix', t => {
  const f = fixture(t); f.write('extension/base.js', 'const baseline = false;\n'); f.commit('Fixture change\n\nCo-authored-by: Claude <bot@example.test>');
  f.write('extension/base.js', 'const baseline = true;\n'); f.commit(); fails(f.run(), 'AI_COAUTHOR');
});
test('human co-authors including a human with an AI-like first name are allowed', t => {
  const f = fixture(t); f.write('extension/base.js', 'const baseline = false;\n');
  f.commit('Fixture change\n\nCo-authored-by: Example Contributor <person@example.test>\nCo-authored-by: Claude Example <other@example.test>');
  passes(f.run());
});
test('AI trailer variants and a decorated generation footer fail in commit messages', t => {
  const f = fixture(t); let n = 0;
  for (const identity of ['ChatGPT', 'OpenAI Codex', 'GitHub Copilot', 'Claude Sonnet 4.5', 'Gemini', 'Cursor', 'Devin', 'GPT-6']) {
    f.write('extension/base.js', `const baseline = ${n++};\n`); f.commit(`Fixture change\n\nco-authored-by: ${identity} <bot@example.test>`);
  }
  f.write('extension/base.js', 'const baseline = 100;\n'); f.commit('Fixture change\n\n🤖 ' + footer);
  const r = f.run(); fails(r, 'AI_COAUTHOR'); assert.equal((r.output.match(/^FAIL AI_COAUTHOR\b/gm) || []).length, 8); assert.match(r.output, /^FAIL GENERATED_WITH\b/m);
});
for (const state of ['committed', 'staged', 'unstaged', 'untracked']) test(`checks forbidden added text in ${state} files with spaces`, t => {
  const f = fixture(t, state === 'unstaged' ? { 'docs/with spaces.md': 'Original text\n' } : {});
  f.write('docs/with spaces.md', footer + '\nCo-authored-by: Codex <bot@example.test>\n');
  if (state === 'committed') f.commit(); else if (state === 'staged') f.git(['add', '--all']);
  const r = f.run(); fails(r, 'GENERATED_WITH'); assert.match(r.output, /^FAIL AI_COAUTHOR\b/m); assert.match(r.output, /with spaces\.md/);
});
test('unchanged and removed forbidden text does not fail added-line rules', t => {
  const f = fixture(t, { 'docs/old.md': footer + '\nCo-authored-by: Codex <bot@example.test>\nKeep\n' });
  f.write('docs/old.md', footer + '\nCo-authored-by: Codex <bot@example.test>\nKeep\nNew prose\n'); passes(f.run());
  f.write('docs/old.md', 'Keep\n'); f.git(['add', '--all']); passes(f.run());
});
test('committed and staged violations remain visible when the working tree repairs them', t => {
  const f = fixture(t); f.write('docs/committed.md', footer + '\n'); f.commit();
  f.write('docs/committed.md', 'Clean\n'); f.write('docs/staged.md', footer + '\n'); f.git(['add', '--all']); f.write('docs/staged.md', 'Clean\n');
  const r = f.run(); fails(r, 'GENERATED_WITH'); assert.match(r.output, /committed\.md/); assert.match(r.output, /staged\.md/);
});
test('added dependencies fail across dependency maps but version updates and removals pass', t => {
  const f = fixture(t, { 'package.json': { dependencies: { existing: '1' }, devDependencies: { development: '1' } } });
  f.write('package.json', JSON.stringify({ dependencies: { existing: '2' }, devDependencies: {} }) + '\n'); passes(f.run());
  const maps = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies', 'overrides', 'resolutions'];
  for (const map of maps) {
    f.write('package.json', JSON.stringify({ dependencies: { existing: '2' }, [map]: { existing: '2', fresh: '1' } }) + '\n');
    const r = f.run(); fails(r, 'DEPENDENCY'); assert.match(r.output, new RegExp(map));
  }
});
test('bundle declarations and pnpm overrides cannot introduce new dependency entries', t => {
  const f = fixture(t);
  for (const declaration of [{ bundledDependencies: ['fresh'] }, { bundleDependencies: ['fresh'] }, { pnpm: { overrides: { fresh: '1' } } }]) {
    f.write('extension/package.json', JSON.stringify(declaration) + '\n'); fails(f.run(), 'DEPENDENCY');
  }
});
test('dependencies are checked in committed, staged, unstaged and untracked nested manifests', t => {
  const f = fixture(t, { 'extension/work/package.json': {} });
  f.write('extension/committed/package.json', '{"dependencies":{"fresh-a":"1"}}\n'); f.commit();
  f.write('extension/staged/package.json', '{"devDependencies":{"fresh-b":"1"}}\n'); f.git(['add', '--all']);
  f.write('extension/staged/package.json', '{}\n'); f.write('extension/work/package.json', '{"peerDependencies":{"fresh-c":"1"}}\n'); f.write('extension/new folder/package.json', '{"optionalDependencies":{"fresh-d":"1"}}\n');
  const r = f.run(); fails(r, 'DEPENDENCY'); for (const name of ['committed', 'staged', 'work', 'new folder']) assert.ok(r.output.includes(name), r.output);
});
test('malformed old or new manifests fail closed instead of silently allowing dependencies', t => {
  const f = fixture(t, { 'extension/package.json': '{ broken baseline\n' });
  f.write('extension/package.json', '{"dependencies":{"fresh":"1"}}\n'); fails(f.run(), 'PACKAGE_JSON');
  for (const text of ['{broken', '[]', 'null', '{"dependencies":[]}', '{"dependencies":null}', '{"bundledDependencies":{}}']) {
    f.write('docs/package.json', text); fails(f.run(), 'PACKAGE_JSON');
  }
});
test('UTF8 BOM and unusual dependency keys do not bypass JSON/blob checks', t => {
  const f = fixture(t, { 'extension/package.json': '\ufeff{"dependencies":{"existing":"1"}}\n' });
  f.write('extension/package.json', '\ufeff{"dependencies":{"existing":"2"}}\n'); f.git(['add', '--all']); passes(f.run());
  f.write('extension/package.json', '\ufeff{"dependencies":{"existing":"2","__proto__":"1"}}\n'); fails(f.run(), 'DEPENDENCY');
});
test('dependency additions removed in later commits still fail', t => {
  const f = fixture(t); f.write('extension/package.json', '{"dependencies":{"fresh":"1"}}\n'); f.commit(); f.write('extension/package.json', '{}\n'); f.commit(); fails(f.run(), 'DEPENDENCY');
});
for (const state of ['committed', 'staged', 'unstaged', 'untracked']) test(`rejects CRLF and invalid UTF8 in ${state} text files`, t => {
  const initial = state === 'unstaged' ? { 'extension/crlf.js': 'const baseline = 0;\n', 'docs/invalid.txt': 'Initial\n' } : {};
  const f = fixture(t, initial); f.write('extension/crlf.js', 'const baseline = 1;\r\n'); f.write('docs/invalid.txt', Buffer.from([0x61, 0xc3, 0x28, 0x0a]));
  if (state === 'committed') f.commit(); else if (state === 'staged') f.git(['add', '--all']);
  const r = f.run(); fails(r, 'CRLF'); assert.match(r.output, /^FAIL UTF8\b/m);
});
test('UTF16 text fails even with NUL bytes while legitimate binary assets pass', t => {
  const f = fixture(t); f.write('extension/utf16.txt', Buffer.from('\ufeffText\r\n', 'utf16le')); fails(f.run(), 'UTF8'); fs.unlinkSync(path.join(f.repo, 'extension/utf16.txt'));
  f.write('extension/image with spaces.png', Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 255]));
  f.write('extension/font.woff2', Buffer.from([119, 79, 70, 50, 0, 255, 13, 10])); f.write('extension/blob.bin', Buffer.from([0, 255, 13, 10, 2]));
  f.write('docs/image.svg', '<svg><text>Café</text></svg>\n'); passes(f.run()); f.commit(); passes(f.run());
});
test('worktree CRLF is caught even when Git normalizes the staged blob to LF', t => {
  const f = fixture(t); f.write('.gitattributes', '*.js text eol=lf\n'); f.commit(); f.write('extension/new.js', 'const added = 1;\r\n'); f.git(['add', '--all']);
  fails(f.run(), 'CRLF');
});
test('inline comments warn only on changed lines and skip strings, URLs and full-line comments', t => {
  const f = fixture(t, { 'extension/comments.js': 'const existing = 1; // legacy\n' });
  const clean = ['const existing = 1; // legacy', '// Full-line comment', 'const a = "https://example.test/path";', "const b = '// string';", 'const c = `https://example.test`; ', 'const d = /https?:\\/\\/[^/]+/;', '/* block // text */', 'const e = "escaped \\\" // text";', ''];
  f.write('extension/comments.js', clean.join('\n')); let r = f.run(); passes(r); assert.doesNotMatch(r.output, /^WARN INLINE_COMMENT/m);
  f.write('extension/comments.js', clean.join('\n') + 'const fresh = 1; // explain\n'); r = f.run(); passes(r); assert.match(r.output, /^WARN INLINE_COMMENT\b/m); assert.match(r.output, /comments\.js:9\b/);
});
test('multiline templates and block comments do not create inline comment false positives', t => {
  const f = fixture(t); f.write('extension/template.js', 'const text = `line\nhttps://example.test // text\n`;\n/* block\nconst example = 1; // text\n*/\nconst actual = 1; // comment\n');
  const r = f.run(); passes(r); assert.equal((r.output.match(/^WARN INLINE_COMMENT\b/gm) || []).length, 1); assert.match(r.output, /template\.js:7\b/);
});
test('generic identity patterns and capitalized titles warn without echoing identity text', t => {
  const f = fixture(t); f.write('docs/sample.md', 'Mr. Example\nMs. Example\nDr. Example\ncontact@example.test\n+44 7700 900123\nStudent ID: 123456\n');
  const r = f.run(); passes(r); assert.equal((r.output.match(/^WARN IDENTITY\b/gm) || []).length, 6); assert.ok(!r.output.includes('contact@example.test')); assert.ok(!r.output.includes('+44 7700 900123'));
});
test('lowercase titles and ordinary prose do not trigger identity warnings', t => {
  const f = fixture(t); f.write('docs/sample.md', 'mr. example\nms. example\ndr. example\nUse an example fixture.\nfixture@users.noreply.github.com\n');
  const r = f.run(); passes(r); assert.doesNotMatch(r.output, /^WARN IDENTITY\b/m);
});
test('scope warnings include deleted and untracked paths outside the four allowed roots', t => {
  const f = fixture(t, { 'outside old.txt': 'Old\n' }); fs.unlinkSync(path.join(f.repo, 'outside old.txt'));
  for (const file of ['extension/ok.txt', 'tests/ok.txt', 'docs/ok.txt', 'scripts/ok.txt', 'extensionish/new.txt', 'outside new.txt']) f.write(file, 'Ordinary fixture\n');
  const r = f.run(); passes(r); assert.equal((r.output.match(/^WARN OUTSIDE_SCOPE\b/gm) || []).length, 3); assert.match(r.output, /outside old/); assert.match(r.output, /outside new/); assert.match(r.output, /extensionish/);
});
test('literal path handling accepts leading punctuation, Unicode and shell metacharacters', t => {
  const f = fixture(t), files = ['docs/$(never-run).md', 'docs/colon [literal].md', 'docs/café.md'];
  for (const file of files) f.write(file, footer + '\n'); f.git(['add', '--all']);
  const r = f.run(); fails(r, 'GENERATED_WITH'); for (const file of files) assert.ok(r.output.includes(file), r.output);
});
test('merge commit resolutions are checked', t => {
  const f = fixture(t); f.write('extension/branch.js', 'const branch = 1;\n'); f.commit();
  f.git(['switch', '-c', 'fixture-side', 'main']); f.write('extension/side.js', 'const side = 1;\n'); f.commit(); f.git(['switch', 'fixture-work']);
  f.git(['merge', '--no-ff', '--no-commit', 'fixture-side']); f.write('docs/merge.md', footer + '\n'); f.commit('Fixture merge'); fails(f.run(), 'GENERATED_WITH');
});

test('a nested default cwd and detached HEAD still check the whole clone', t => {
  const f = fixture(t); f.write('docs/detached.md', footer + '\n'); f.commit(); f.git(['switch', '--detach']);
  const r = f.run({ defaultCwd: true, cwd: path.join(f.repo, 'extension') });
  fails(r, 'GENERATED_WITH'); assert.match(r.output, /detached\.md/);
});
test('missing Git fails cleanly without a stack trace or source path', t => {
  const f = fixture(t), env = Object.fromEntries(Object.entries(f.env).map(([key, value]) => [key, /^PATH$/i.test(key) ? '' : value]));
  const r = f.run({ env }); fails(r, 'GIT'); assert.doesNotMatch(r.output, /\bat (?:check|Object\.)/); assert.ok(!r.output.includes(f.temp));
});
test('an unborn HEAD and unrelated local history fail with actionable reports', t => {
  const f = fixture(t); f.git(['switch', '--orphan', 'fixture-unrelated']);
  fails(f.run(), 'HEAD'); f.write('extension/unrelated.js', 'const unrelated = true;\n'); f.commit();
  const r = f.run(); fails(r, 'HISTORY'); assert.match(r.output, /shared history/);
});
test('a missing file blob is a Git failure, never a passing or partial result', t => {
  const f = fixture(t); f.write('docs/broken.md', 'Fixture text\n'); f.commit();
  const oid = f.git(['rev-parse', 'HEAD:docs/broken.md']);
  fs.unlinkSync(path.join(f.repo, '.git', 'objects', oid.slice(0, 2), oid.slice(2)));
  const r = f.run(); fails(r, 'GIT'); assert.ok(!r.output.includes(f.temp));
});
test('upstream-only commits, dependencies and text stay excluded after merging origin/main', t => {
  const f = fixture(t); f.write('extension/local.js', 'const local = 1;\n'); f.commit();
  f.git(['switch', 'main']); f.write('extension/upstream.md', footer + '\nCo-authored-by: Codex <bot@example.test>\n');
  f.write('extension/package.json', '{"dependencies":{"upstream-only":"1"}}\n');
  f.commit('Upstream-only footer\n\n' + footer, { GIT_AUTHOR_EMAIL: 'fixture@example.test', GIT_COMMITTER_EMAIL: 'fixture@example.test' });
  f.git(['update-ref', 'refs/remotes/origin/main', 'HEAD']); f.git(['switch', 'fixture-work']); f.git(['merge', '--no-ff', '--no-edit', 'main']);
  const r = f.run(); passes(r); assert.doesNotMatch(r.output, /GENERATED_WITH|AI_COAUTHOR|DEPENDENCY|AUTHOR_EMAIL|COMMITTER_EMAIL/);
});
test('merge-only resolutions are checked against every parent for text and dependencies', t => {
  const f = fixture(t); f.write('extension/base.js', 'const branch = 1;\n'); f.commit();
  f.git(['switch', '-c', 'fixture-side', 'main']); f.write('extension/side.js', 'const side = 1;\n'); f.commit(); f.git(['switch', 'fixture-work']);
  f.git(['merge', '--no-ff', '--no-commit', 'fixture-side']);
  f.write('extension/base.js', '// ' + footer + '\n'); f.write('extension/package.json', '{"devDependencies":{"merge-only":"1"}}\n'); f.commit('Fixture merge');
  const r = f.run(); fails(r, 'GENERATED_WITH'); assert.match(r.output, /^FAIL DEPENDENCY\b/m);
});
test('Git-detectable renames preserve existing source lines and dependency keys', t => {
  const f = fixture(t, { 'docs/original.md': footer + '\n', 'extension/old/package.json': JSON.stringify({ dependencies: { existing: '1' } }, null, 2) + '\n' });
  f.git(['mv', 'docs/original.md', 'docs/renamed file.md']); f.git(['mv', 'extension/old', 'extension/new folder']);
  f.write('extension/new folder/package.json', JSON.stringify({ dependencies: { existing: '2' } }, null, 2) + '\n'); f.commit();
  passes(f.run());
});
test('copying an existing dependency manifest to a new nested path is a new declaration', t => {
  const f = fixture(t, { 'extension/old/package.json': { dependencies: { existing: '1' } } });
  f.write('extension/new/package.json', '{"dependencies":{"existing":"1"}}\n'); fails(f.run(), 'DEPENDENCY');
});
test('nested override entries and package extensions are checked while version changes pass', t => {
  const initial = { overrides: { existing: { '.': '1', child: '1' } }, pnpm: { overrides: { existing: '1' }, packageExtensions: { 'existing@*': { dependencies: { child: '1' } } } } };
  const f = fixture(t, { 'extension/package.json': initial });
  const update = JSON.parse(JSON.stringify(initial)); update.overrides.existing['.'] = '2'; update.overrides.existing.child = '2'; update.pnpm.overrides.existing = '2';
  f.write('extension/package.json', JSON.stringify(update) + '\n'); passes(f.run());
  update.overrides.existing.fresh = '1'; f.write('extension/package.json', JSON.stringify(update) + '\n'); fails(f.run(), 'DEPENDENCY');
  delete update.overrides.existing.fresh; update.pnpm.packageExtensions['existing@*'].optionalDependencies = { fresh: '1' };
  f.write('extension/package.json', JSON.stringify(update) + '\n'); const r = f.run(); fails(r, 'DEPENDENCY'); assert.match(r.output, /pnpm\.packageExtensions/);
});
test('boolean bundling and unusual dependency names cannot bypass the dependency rule', t => {
  const f = fixture(t, { 'extension/package.json': { bundleDependencies: false } });
  for (const declaration of [{ bundleDependencies: true }, { dependencies: { '.': '1' } }, { dependencies: { constructor: '1' } }]) {
    f.write('extension/package.json', JSON.stringify(declaration) + '\n'); fails(f.run(), 'DEPENDENCY');
  }
});
test('fixing legacy non-UTF8 or CRLF text is allowed when the new content is clean', t => {
  const f = fixture(t, { 'docs/legacy.txt': Buffer.from([0x63, 0x61, 0x66, 0xe9, 0x0a]), 'extension/legacy.js': 'const baseline = 1;\r\n' });
  f.write('docs/legacy.txt', 'caf\u00e9\n'); f.write('extension/legacy.js', 'const baseline = 1;\n'); passes(f.run()); f.commit(); passes(f.run());
});
test('normalization-only worktree CRLF is caught on an otherwise Git-clean tracked file', t => {
  const f = fixture(t, { '.gitattributes': '*.js text eol=lf\n' });
  f.write('extension/base.js', 'const baseline = true;\r\n'); assert.equal(f.git(['diff', '--name-only']), ''); fails(f.run(), 'CRLF');
});
test('skip-worktree and assume-unchanged flags cannot hide added forbidden worktree lines', t => {
  const f = fixture(t);
  for (const flag of ['--skip-worktree', '--assume-unchanged']) {
    f.git(['update-index', '--no-skip-worktree', '--no-assume-unchanged', 'extension/base.js']);
    f.git(['update-index', flag, 'extension/base.js']); f.write('extension/base.js', 'const baseline = true;\n// ' + footer + '\n');
    assert.equal(f.git(['diff', '--name-only']), ''); fails(f.run(), 'GENERATED_WITH');
    f.write('extension/base.js', 'const baseline = true;\n');
  }
});
test('closing a multiline template before a trailing comment warns at the closing line', t => {
  const f = fixture(t); f.write('extension/template.js', 'const text = `line\nhttps://example.test // string\n`; // actual comment\n');
  const r = f.run(); passes(r); assert.equal((r.output.match(/^WARN INLINE_COMMENT\b/gm) || []).length, 1); assert.match(r.output, /template\.js:3\b/);
});
test('Git quoting and shell-sensitive names are literal and safely reported', t => {
  const f = fixture(t), files = ["docs/single'quote.md", 'docs/-leading.md', 'docs/[glob].md', 'docs/a b; & echo.md', 'docs/caf\u00e9-\u6771\u4eac.md'];
  if (process.platform !== 'win32') files.push('docs/"double".md', 'docs/line\nbreak.md', 'docs/tab\tname.md');
  for (const file of files) f.write(file, footer + '\n'); f.git(['add', '--all']);
  const r = f.run(); fails(r, 'GENERATED_WITH'); assert.equal((r.output.match(/^FAIL GENERATED_WITH\b/gm) || []).length, files.length);
  for (const file of files) assert.ok(r.output.includes(JSON.stringify(file + ':1')), r.output);
});
test('literal diff control-looking lines do not corrupt added line numbers', t => {
  const f = fixture(t, { 'docs/patch.txt': 'Keep\nOld\n' });
  f.write('docs/patch.txt', 'Keep\n+++ literal text\n@@ -1 +1 @@\n' + footer + '\n');
  const r = f.run(); fails(r, 'GENERATED_WITH'); assert.match(r.output, /patch\.txt:4\b/);
});
test('raw metadata is checked despite mailmap aliases and local replacement commits', t => {
  const f = fixture(t, { '.mailmap': `Fixture <${noReply}> <fixture@example.test>\n` });
  const parent = f.git(['rev-parse', 'HEAD']); f.write('extension/base.js', 'const baseline = false;\n');
  f.commit('Fixture footer\n\n' + footer, { GIT_AUTHOR_EMAIL: 'fixture@example.test' });
  const original = f.git(['rev-parse', 'HEAD']), tree = f.git(['rev-parse', 'HEAD^{tree}']);
  const replacement = f.git(['commit-tree', tree, '-p', parent, '-m', 'Clean replacement']); f.git(['replace', original, replacement]);
  const r = f.run(); fails(r, 'GENERATED_WITH'); assert.match(r.output, /^WARN AUTHOR_EMAIL\b/m); assert.ok(!r.output.includes('fixture@example.test'));
});
test('checker preserves HEAD, refs and index bytes while reviewing staged and worktree edits', t => {
  const f = fixture(t); f.write('extension/base.js', 'const baseline = 2;\n'); f.git(['add', '--all']); f.write('extension/base.js', 'const baseline = 3;\n');
  const head = f.git(['rev-parse', 'HEAD']), refs = f.git(['show-ref']), index = fs.readFileSync(path.join(f.repo, '.git', 'index'));
  passes(f.run()); assert.deepEqual(fs.readFileSync(path.join(f.repo, '.git', 'index')), index);
  assert.equal(f.git(['rev-parse', 'HEAD']), head); assert.equal(f.git(['show-ref']), refs);
});
