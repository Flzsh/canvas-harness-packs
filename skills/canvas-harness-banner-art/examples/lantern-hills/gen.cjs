// Sample made with the banner-art skill: "Lantern hills", a paper-cut dusk landscape for the All courses page
// (banner, frame, icon). Layered flat hills with soft offset shadows, a moon, two drifting clouds, lanterns that glow
// in turn. Writes banner.svg, frame.svg, icon.svg here.  node gen.cjs
const fs = require('fs'), path = require('path');
let seed = 41; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280 - .5) * 2, f = n => (+n).toFixed(1);
const C = { sky: '#F3E3D0', sky2: '#EBCFB8', far: '#9DB5B2', mid: '#5E8C8A', near: '#3C6466', front: '#24434A', moon: '#FFF4D6', lamp: '#F6C25B', glow: '#FFE3A1', cloud: '#FBF3E8', shade: '#16303A', path: '#E9D5B8' };
// a hill line across the width: gentle crests with small irregular bumps, closed down to the bottom
function hill(y0, amp, crests, x0 = 0, x1 = 1680, h = 240, s = 1) {
  const n = 28, pts = [];
  for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, t = i / n; pts.push([x, y0 - amp * Math.sin(t * Math.PI * crests + s) * .5 - amp * .5 * Math.sin(t * Math.PI * crests * 2.3 + s * 2) * .35 + rnd() * 1.4]); }
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) d += ` Q${f(pts[i][0])} ${f(pts[i][1])} ${f((pts[i][0] + pts[i + 1][0]) / 2)} ${f((pts[i][1] + pts[i + 1][1]) / 2)}`;
  return d + ` L${f(x1)} ${f(pts.at(-1)[1])} L${x1} ${h} L${x0} ${h}Z`;
}
// paper layer: a darker copy offset down-right as its shadow, then the layer
const layer = (d, fill, sh = .22) => `<path d="${d}" fill="${C.shade}" opacity="${sh}" transform="translate(4 5)"/><path d="${d}" fill="${fill}"/>`;
const cloud = (x, y, w) => { const r = w / 4; return `M${f(x)} ${f(y)} q${f(r * .2)} ${f(-r * 1.2)} ${f(r * 1.3)} ${f(-r * .9)} q${f(r * .5)} ${f(-r * 1.2)} ${f(r * 1.6)} ${f(-r * .5)} q${f(r * 1.1)} ${f(-r * .3)} ${f(r * 1.2)} ${f(r * .8)} q${f(r * .7)} ${f(r * .1)} ${f(r * .4)} ${f(r * .6)}Z`; };
// a lantern on a post: post, cap, glowing body, halo (the halo and body brighten in turn)
const lantern = (x, y, k, s = 1) => `<g transform="translate(${f(x)} ${f(y)}) scale(${s})"><path d="M0 0 L0 -26" stroke="${C.front}" stroke-width="2.4" stroke-linecap="round"/><path d="M-6 -26 L6 -26 L4 -30 L-4 -30Z" fill="${C.front}"/><circle class="halo h${k}" cx="0" cy="-20" r="11" fill="${C.glow}" opacity=".25"/><rect class="lamp l${k}" x="-4.5" y="-25" width="9" height="11" rx="2" fill="${C.lamp}"/><path d="M-5 -14 L5 -14" stroke="${C.front}" stroke-width="1.6"/></g>`;

const W = 1680, H = 240, CYCLE = 20;
// lanterns glow up one after another across the hills; each holds, then settles (all return to rest by the cycle end)
const LAMPS = [[1010, 164, .9], [1140, 140, 1], [1268, 176, 1.05], [1395, 150, 1], [1520, 186, 1.1], [1612, 162, .95]];
const glowKeys = LAMPS.map((_, k) => { const a = (k * 2 + 1.5) / CYCLE * 100, b = a + 6, c = b + 12; return `@keyframes g${k}{0%,${f(a)}%{opacity:.25}${f(b)}%,${f(c)}%{opacity:.75}${f(c + 8)}%,100%{opacity:.25}}@keyframes b${k}{0%,${f(a)}%{fill:${C.lamp}}${f(b)}%,${f(c)}%{fill:#FFF0C2}${f(c + 8)}%,100%{fill:${C.lamp}}}.h${k}{animation:g${k} ${CYCLE}s linear infinite}.l${k}{animation:b${k} ${CYCLE}s linear infinite}`; }).join('');
const style = `<style>${glowKeys}.c1{animation:c1 ${CYCLE}s linear infinite}.c2{animation:c2 ${CYCLE}s linear infinite}@keyframes c1{0%,100%{transform:translateX(0)}50%{transform:translateX(-46px)}}@keyframes c2{0%,100%{transform:translateX(0)}50%{transform:translateX(38px)}}.s1{animation:t1 5s linear infinite}.s2{animation:t2 5s linear infinite}.s3{animation:t3 5s linear infinite}@keyframes t1{0%,10%,30%,100%{opacity:.9}20%{opacity:.3}}@keyframes t2{0%,43%,63%,100%{opacity:.9}53%{opacity:.3}}@keyframes t3{0%,76%,96%,100%{opacity:.9}86%{opacity:.3}}</style>`;
// the left third stays quiet (the greeting can sit there): only the far hills and sky fade in from the left
const fade = `<defs><linearGradient id="fade" x1="0" x2="1" y1="0" y2="0"><stop offset=".3" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".35"/><stop offset=".64" stop-color="#fff" stop-opacity="1"/></linearGradient><mask id="m"><rect width="${W}" height="${H}" fill="url(#fade)"/></mask></defs>`;
let b = '';
b += `<g mask="url(#m)"><rect width="${W}" height="${H}" fill="${C.sky}"/><path d="M0 150 L${W} 150 L${W} 240 L0 240Z" fill="${C.sky2}" opacity=".7"/>`;
b += `<circle cx="1478" cy="62" r="30" fill="${C.moon}"/><circle cx="1478" cy="62" r="44" fill="${C.moon}" opacity=".25"/>`;
for (const [x, y, k] of [[1180, 40, 1], [1300, 28, 2], [1590, 34, 3], [1060, 58, 2], [1376, 86, 3]]) b += `<path class="star s${k}" d="M${x} ${y - 4} L${x + 1.2} ${y - 1.2} L${x + 4} ${y} L${x + 1.2} ${y + 1.2} L${x} ${y + 4} L${x - 1.2} ${y + 1.2} L${x - 4} ${y} L${x - 1.2} ${y - 1.2}Z" fill="${C.moon}"/>`;
b += `<g class="c1"><path d="${cloud(1200, 92, 120)}" fill="${C.cloud}" opacity=".9"/></g><g class="c2"><path d="${cloud(1520, 112, 90)}" fill="${C.cloud}" opacity=".85"/></g>`;
b += layer(hill(150, 34, 3, 0, W, H, .4), C.far, .12) + layer(hill(176, 30, 4, 0, W, H, 1.3), C.mid, .18);
b += layer(hill(196, 26, 3, 0, W, H, 2.1), C.near) + layer(hill(220, 18, 5, 0, W, H, .7), C.front, .25);
b += `<path d="M1040 240 Q1150 214 1240 222 Q1330 230 1420 206 Q1500 186 1600 196" fill="none" stroke="${C.path}" stroke-width="5" stroke-linecap="round" stroke-dasharray="14 10" opacity=".85"/>`;
b += LAMPS.map(([x, y, s], k) => lantern(x, y, k, s * 1.5)).join('');
b += `</g>`;
const banner = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">${style}${fade}${b}</svg>`;

// frame: paper hills along the bottom corners and a moon in the top-right corner, the middle left clear
seed = 7;
const frame = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 110" preserveAspectRatio="none"><path d="M6 4 L354 4 L354 106 L6 106Z" fill="none" stroke="${C.near}" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/><path d="M6 4 L22 4 L6 20Z" fill="${C.far}"/><path d="M300 106 Q316 90 332 98 Q344 92 354 100 L354 106Z" fill="${C.mid}"/><path d="M326 106 Q338 96 354 102 L354 106Z" fill="${C.front}"/><circle cx="340" cy="18" r="7" fill="${C.lamp}"/><circle cx="340" cy="18" r="11" fill="${C.glow}" opacity=".35"/></svg>`;
// icon: one lantern on a little hill under the moon
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="70" cy="28" r="14" fill="${C.moon}" stroke="${C.near}" stroke-width="2.5"/><path d="M8 92 Q30 64 52 74 Q74 62 92 80 L92 92Z" fill="${C.mid}" stroke="${C.front}" stroke-width="3" stroke-linejoin="round"/><path d="M40 78 L40 48" stroke="${C.front}" stroke-width="4" stroke-linecap="round"/><path d="M32 48 L48 48 L45 42 L35 42Z" fill="${C.front}"/><circle cx="40" cy="57" r="14" fill="${C.glow}" opacity=".45"/><rect x="34" y="49" width="12" height="15" rx="3" fill="${C.lamp}" stroke="${C.front}" stroke-width="2.5"/></svg>`;
for (const [n, s] of [['lantern-hills-banner.svg', banner], ['lantern-hills-frame.svg', frame], ['lantern-hills-icon.svg', icon]]) fs.writeFileSync(path.join(__dirname, n), s);
console.log('banner', banner.length, 'frame', frame.length, 'icon', icon.length);
