// Sample made with the pet skill: "Maple", a red panda in pixel art. One 24 x 21 grid of 3-unit pixels (72 x 63, feet
// on y 60, facing right). Each pose is drawn from simple shapes sampled onto the grid, then shaded and outlined, with
// hand-placed face marks; movement is frame by frame with hard switches (the still copy shows the first frame only).
// Writes <pose>.svg, pet.json and sheet.html here.  node gen.cjs
const fs = require('fs'), path = require('path');
const W = 24, H = 21, PX = 3;
const PAL = { k: '#1C1210', o: '#C4502F', l: '#DE7652', O: '#953823', d: '#4D2C25', D: '#35201B', w: '#FFF4E6', W: '#E6D2BC', r: '#EBAA80', e: '#1C1210', h: '#FFFFFF', p: '#2A1A17', b: '#5E86C9', B: '#3E5F99', g: '#FFFDF8', y: '#FFD25A', Y: '#F2A93B', z: '#8FA7C9', G: '#7DB46C', V: '#4F8A4A' };
const GLOW = new Set(['z', 'y', 'Y']);

function canvas() {
  const g = Array.from({ length: H }, () => Array(W).fill('.'));
  const put = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = c; };
  const ell = (cx, cy, rx, ry, c = 'o') => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1) g[y][x] = c; };
  const rect = (x0, y0, x1, y1, c = 'o') => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, c); };
  const pts = (list, c) => { for (const [x, y] of list) put(x, y, c); };
  return { g, put, ell, rect, pts };
}
// rounded ear with a white rim and a dark inside: three wide, sitting on the head at (x, y)
const ear = (cv, x, y) => { cv.pts([[x + 1, y]], 'w'); cv.pts([[x, y + 1], [x + 2, y + 1]], 'w'); cv.put(x + 1, y + 1, 'd'); cv.pts([[x, y + 2], [x + 1, y + 2], [x + 2, y + 2]], 'o'); };
// the face: white eyebrow dots, white muzzle, tear marks, eyes, nose. (fx, fy) is the eye line's left eye
function face(cv, fx, fy, eye = 'open') {
  cv.put(fx, fy - 2, 'w'); cv.put(fx + 3, fy - 2, 'w');
  cv.ell(fx + 2.8, fy + 2.6, 2.6, 1.5, 'w'); cv.put(fx - 2, fy + 2, 'w');
  for (const x of [fx, fx + 3]) {
    if (eye === 'open') { cv.put(x, fy, 'h'); cv.put(x, fy + 1, 'e'); }
    else if (eye === 'closed') { cv.put(x, fy + 1, 'e'); cv.put(x + 1, fy + 1, 'e'); }
    else if (eye === 'happy') { cv.put(x, fy + 1, 'e'); cv.put(x + 1, fy, 'e'); cv.put(x + 2, fy + 1, 'e'); }
    else { cv.put(x, fy, 'e'); cv.put(x + 1, fy, 'e'); cv.put(x, fy + 1, 'e'); cv.put(x + 1, fy + 1, 'h'); }
  }
  cv.put(fx, fy + 2, 'O'); cv.put(fx + 4, fy + 2, 'p');
}
// a ringed tail from a list of [cx, cy, rx, ry] puffs; rings every few pixels along the given axis
// every tail pixel is ringed; with seam, a shaded line where the tail lies over the body keeps the two apart
function tail(cv, puffs, ringAxis = 'y', every = 3, offset = 0, seam = false) {
  const before = cv.g.map(r => r.slice()), inTail = (x, y) => puffs.some(([cx, cy, rx, ry]) => ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!inTail(x, y)) continue;
    cv.g[y][x] = ((ringAxis === 'y' ? y : x) + offset) % every === 0 ? 'r' : 'o';
    if (seam && y > 0 && !inTail(x, y - 1) && before[y - 1][x] !== '.') cv.g[y][x] = 'O';
  }
}
// shading and the outline; dark legs and belly stay a colour of their own so they never merge into the outline
function finish(cv) {
  const { g } = cv, src = g.map(r => r.slice()), empty = c => c === '.' || c === undefined || GLOW.has(c);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = src[y][x], below = src[y + 1]?.[x], right = src[y][x + 1], above = src[y - 1]?.[x];
    if (c === 'o') { if (empty(below) || empty(right)) g[y][x] = 'O'; else if (empty(above)) g[y][x] = 'l'; }
    else if (c === 'd' && (empty(below) || empty(right))) g[y][x] = 'D';
    else if (c === 'w' && (empty(below) || empty(right))) g[y][x] = 'W';
  }
  const out = g.map(r => r.slice());
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (empty(g[y][x]) && !GLOW.has(g[y][x]) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([u, v]) => { const c = g[y + v]?.[x + u]; return c !== undefined && !empty(c); })) out[y][x] = 'k';
  return out;
}
const rects = grid => { let s = ''; for (let y = 0; y < H; y++) { let x = 0; while (x < W) { const c = grid[y][x]; if (c === '.') { x++; continue; } let e = x; while (e + 1 < W && grid[y][e + 1] === c) e++; s += `<rect x="${x * PX}" y="${y * PX}" width="${(e - x + 1) * PX}" height="${PX}" fill="${PAL[c]}"/>`; x = e + 1; } } return s; };
const add = (grid, list) => { const g = grid.map(r => r.slice()); for (const [x, y, c] of list) if (g[y] && g[y][x] === '.') g[y][x] = c; return g; };

// standing on four legs; legs are [x, top, bottom]
function standing({ legs = [[5, 15, 19], [8, 15, 19], [13, 15, 19], [16, 15, 19]], bob = 0, tailSet = 0, eye = 'open', headLift = 0 } = {}) {
  const cv = canvas();
  tail(cv, tailSet === 0 ? [[3, 12.5 + bob, 2.4, 2.2], [1.8, 9.6 + bob, 1.9, 2.2], [1.6, 7 + bob, 1.6, 1.8]] : [[3, 12.5 + bob, 2.4, 2.2], [2.2, 9.8 + bob, 1.9, 2.2], [2.4, 7.2 + bob, 1.6, 1.8]], 'y', 3, bob);
  cv.ell(10.5, 12.6 + bob, 7, 4); cv.ell(10.5, 15.2 + bob, 5.4, 1.3, 'd');
  for (const [x, y0, y1] of legs) cv.rect(x, y0 + bob, x + 1, y1, 'd');
  const hy = 8.4 + bob - headLift; cv.ell(18, hy, 4.8, 4.2); ear(cv, 13, Math.round(hy) - 6); ear(cv, 19, Math.round(hy) - 6);
  face(cv, 17, Math.round(hy) - 1, eye);
  return finish(cv);
}
const POSES = {};
POSES.stand = [standing(), standing({ tailSet: 1 }), standing({ eye: 'closed' })];
POSES.walk = [
  standing({ legs: [[4, 15, 19], [9, 15, 19], [12, 15, 19], [17, 15, 19]] }),
  standing({ legs: [[5, 15, 19], [8, 15, 18], [13, 15, 19], [16, 15, 18]], bob: -1, tailSet: 1 }),
  standing({ legs: [[6, 15, 19], [7, 15, 19], [14, 15, 19], [15, 15, 19]] }),
  standing({ legs: [[5, 15, 18], [8, 15, 19], [13, 15, 18], [16, 15, 19]], bob: -1, tailSet: 1 })];
// curled asleep, the tail wrapped round over the nose; or a loaf lying awake with the tail along the ground
function curled(k = 0) {
  const cv = canvas();
  cv.ell(10, 15.4, 7.8, 3.9); cv.ell(16.8, 13.8, 4.2, 3.6); ear(cv, 13, 8); ear(cv, 17, 8);
  cv.put(15, 12, 'w'); cv.put(18, 12, 'w'); cv.pts([[15, 13], [16, 13], [18, 13], [19, 13]], 'e'); cv.put(13, 15, 'w');
  // the tail runs along the front and its tip curls up over the nose
  tail(cv, [[10.5, 18.6, 9, 1.5], [19.6, 16.6, 2.4, 2.6], [20.6, 14.4, 1.6, 1.6]], 'x', 3, k, true);
  return finish(cv);
}
POSES.sleep = [curled(0), curled(0)].map((f, i) => add(f, (i ? [[20, 4], [21, 4], [22, 4], [21, 5], [20, 6], [21, 6], [22, 6]] : [[19, 5], [20, 5], [21, 5], [20, 6], [19, 7], [20, 7], [21, 7]]).map(([x, y]) => [x, y, 'z'])));
function loaf({ eye = 'open', flick = 0 } = {}) {
  const cv = canvas();
  tail(cv, [[4.5, 18.4, 4.4, 1.5], [1.4, 17.6 - flick, 1.4, 1.6]], 'x', 3);
  cv.ell(11.5, 15.8, 7.4, 3.6); cv.rect(15, 18, 20, 19, 'd'); cv.ell(18.2, 12.4, 4.6, 4); ear(cv, 13, 6); ear(cv, 19, 6);
  face(cv, 17, 11, eye);
  return finish(cv);
}
POSES.lie = [loaf(), loaf({ flick: 1 }), loaf({ eye: 'closed' })];
// sitting up: the read, eat and wave poses build on it
function sitting({ eye = 'open', paw = null, book = false, flip = false, bamboo = 0 } = {}) {
  const cv = canvas();
  tail(cv, [[5.2, 18.3, 4.2, 1.5], [1.6, 17, 1.4, 1.8]], 'x', 3);
  cv.ell(11, 14.2, 5.4, 5.4); cv.ell(11.2, 16.4, 3.4, 2.6, 'd'); cv.rect(8, 18, 9, 19, 'd'); cv.rect(13, 18, 14, 19, 'd');
  cv.ell(13.6, 7.2, 4.6, 4.1); ear(cv, 9, 1); ear(cv, 15, 1); face(cv, 13, 6, eye);
  if (paw === 'up') { cv.rect(16, 6, 17, 12, 'd'); } else if (paw === 'mid') { cv.rect(16, 9, 17, 13, 'd'); } else cv.rect(13, 13, 16, 14, 'd');
  if (book) { cv.rect(14, 11, 21, 16, 'B'); cv.rect(15, 11, 20, 15, 'g'); cv.rect(17, 11, 18, 15, 'b'); if (flip) cv.rect(18, 10, 20, 14, 'g'); cv.rect(14, 14, 16, 15, 'd'); }
  if (bamboo) { const t = bamboo - 1; cv.rect(17, 7 + t, 17, 16, 'V'); cv.pts([[18, 8 + t], [19, 7 + t], [20, 7 + t], [18, 11 + t], [19, 11 + t], [20, 10 + t], [16, 9 + t], [15, 8 + t]], 'G'); cv.rect(15, 13, 17, 14, 'd'); }
  return finish(cv);
}
POSES.read = [sitting({ book: true }), sitting({ book: true }), sitting({ book: true, flip: true }), sitting({ book: true, eye: 'closed' })];
POSES.eat = [sitting({ bamboo: 1, eye: 'happy' }), sitting({ bamboo: 2, eye: 'closed' })];
POSES.flag = [sitting({ paw: 'up', eye: 'happy' }), sitting({ paw: 'mid', eye: 'happy' })];
POSES.cheer = [standing({ bob: 1, eye: 'happy' }),
  add(standing({ legs: [[4, 14, 16], [8, 14, 16], [13, 14, 16], [17, 14, 16]], bob: -3, eye: 'happy', tailSet: 1 }), [[1, 1, 'y'], [0, 2, 'Y'], [2, 2, 'Y'], [1, 3, 'Y'], [22, 15, 'y'], [21, 16, 'Y'], [23, 16, 'Y'], [22, 17, 'Y'], [10, 2, 'y']])];
POSES.fall = [standing({ legs: [[3, 14, 17], [8, 15, 18], [13, 15, 18], [18, 14, 17]], eye: 'wide', bob: -2 })];
function hanging(dx = 0) {
  const cv = canvas();
  tail(cv, [[18 + dx, 14, 1.6, 4.4]], 'y', 3);
  cv.ell(12 + dx, 13, 4.2, 5.2); cv.ell(12 + dx, 14.4, 2.6, 3.2, 'd'); cv.rect(9 + dx, 16, 10 + dx, 19, 'd'); cv.rect(14 + dx, 16, 15 + dx, 19, 'd');
  cv.ell(12 + dx, 6, 4.6, 4); ear(cv, 7 + dx, 0); ear(cv, 14 + dx, 0); face(cv, 10 + dx, 5, 'wide');
  return finish(cv);
}
POSES.held = [hanging(0), hanging(1)];

// frames switch hard (step-end), each holding its share of the cycle
const CYCLE = { stand: 4, walk: .6, sleep: 3, lie: 5, read: 6, eat: 1.2, flag: .8, cheer: 1, fall: 1, held: 2 };
const WEIGHT = { stand: [6, 1, 1], lie: [6, 1, 1], read: [3, 3, 1, 1] };
function poseSVG(name, frames) {
  const n = frames.length, w = WEIGHT[name] || Array(n).fill(1), tot = w.reduce((a, b) => a + b, 0);
  let acc = 0, css = '', body = '';
  frames.forEach((f, k) => {
    const a = acc / tot * 100, b = (acc += w[k]) / tot * 100;
    if (n > 1) css += `.f${k}{${k ? 'opacity:0;' : ''}animation:a${k} ${CYCLE[name]}s step-end infinite}@keyframes a${k}{0%{opacity:${k ? 0 : 1}}${k ? `${a.toFixed(2)}%{opacity:1}` : ''}${b < 100 ? `${b.toFixed(2)}%{opacity:0}` : ''}100%{opacity:${k ? (b < 100 ? 0 : 1) : 0}}}`;
    body += `<g class="f${k}">${rects(f)}</g>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W * PX} ${H * PX}" shape-rendering="crispEdges">${css ? `<style>${css}</style>` : ''}${body}</svg>`;
}
const files = {};
for (const [name, frames] of Object.entries(POSES)) { files[name] = poseSVG(name, frames); fs.writeFileSync(path.join(__dirname, name + '.svg'), files[name]); }
fs.writeFileSync(path.join(__dirname, 'pet.json'), JSON.stringify({ format: 'chpet', version: 1, name: 'Maple', by: 'Canvas Harness', size: [72, 63], ground: 60, faces: 'right', poses: Object.fromEntries(Object.keys(POSES).map(n => [n, n])), assets: Object.fromEntries(Object.keys(POSES).map(n => [n, n + '.svg'])) }, null, 1));
const frozen = (name, k) => files[name].replace(/<style>[\s\S]*?<\/style>/, `<style>g{opacity:0}.f${k}{opacity:1}</style>`);
const cell = (name, bg, fg) => `<figure style="margin:6px;text-align:center;color:${fg};font:600 13px Georgia"><div style="background:${bg};padding:4px;border-bottom:2px dashed #C96442"><img src="data:image/svg+xml,${encodeURIComponent(frozen(name, 0))}" style="width:144px;height:126px"></div>${name}<div>${POSES[name].map((_, k) => `<img src="data:image/svg+xml,${encodeURIComponent(frozen(name, k))}" style="width:48px;height:42px;margin:1px;background:${bg}">`).join('')}</div></figure>`;
const row = (bg, fg) => `<div style="display:flex;flex-wrap:wrap;background:${bg};padding:8px">${Object.keys(POSES).map(n => cell(n, bg, fg)).join('')}</div>`;
fs.writeFileSync(path.join(__dirname, 'sheet.html'), `<!doctype html><meta charset="utf-8"><body style="margin:0">${row('#FAF9F5', '#141413')}${row('#262624', '#E8E4DA')}</body>`);
console.log(Object.entries(files).map(([n, s]) => `${n} ${s.length}`).join(', '));
