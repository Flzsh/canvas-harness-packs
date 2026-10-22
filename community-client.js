(function (root) {
  'use strict';
  const KINDS = { 'course-art': 'Banner', kit: 'Kit', theme: 'Theme', pet: 'Pet', preset: 'Preset' };
  function valid(c) {
    return c && typeof c.id === 'string' && /^[a-z0-9][a-z0-9-]{0,79}$/.test(c.id) && Object.hasOwn(KINDS, c.kind) &&
      typeof c.name === 'string' && c.name.trim() && c.name.length <= 120 && typeof c.by === 'string' && c.by.trim() && c.by.length <= 60 &&
      ['CC BY 4.0', 'CC0 1.0'].includes(c.licence) && Number.isInteger(c.size) && c.size > 0 && c.size <= 40_000_000 && /^[a-f0-9]{64}$/.test(c.sha256) &&
      c.file === `community/${c.id}/${c.id}${{ 'course-art': '.chpack', kit: '.chkit', theme: '.chtheme', pet: '.chpet', preset: '.chpreset' }[c.kind]}` &&
      (c.picture === `community/${c.id}/picture.svg` || /^assets\/community\/(layout|planner|routines|settings|preset|theme|kit)\.svg$/.test(c.picture));
  }
  function makeCard(doc, c, art) {
    if (!valid(c)) throw Error('Invalid community card.');
    const card = doc.createElement('article'); card.className = 'card'; card.tabIndex = 0;
    Object.assign(card.dataset, { kind: KINDS[c.kind], id: c.id, name: c.name, inside: 'by ' + c.by + '|' + c.licence });
    // Only build-owned artwork enters innerHTML. All community text uses textContent.
    card.innerHTML = '<div class="pic">' + art.frame + '</div><footer><div><h3></h3><span class="kind"></span><div class="sub-credit"></div><div class="sub-licence"></div></div><button type="button" class="add">' + art.add + '</button></footer>';
    const img = doc.createElement('img'); img.src = c.picture; img.alt = ''; card.querySelector('.pic').prepend(img);
    card.querySelector('h3').textContent = c.name; card.querySelector('.kind').textContent = KINDS[c.kind];
    card.querySelector('.sub-credit').textContent = 'by ' + c.by; card.querySelector('.sub-licence').textContent = c.licence;
    const add = card.querySelector('button.add'); add.dataset.chPack = c.id; add.setAttribute('aria-label', 'Add ' + c.name);
    return card;
  }
  async function load(doc, fetcher, art, addCard, refresh) {
    const shelf = doc.getElementById('community-shelf'), heading = doc.getElementById('community-title');
    try {
      const response = await fetcher('community.json'); if (!response.ok) throw Error('Cannot read community packs.');
      const list = await response.json(); if (!Array.isArray(list)) throw Error('Invalid community catalogue.');
      const seen = new Set();
      for (const c of list) { if (!valid(c) || seen.has(c.id) || doc.querySelector(`[data-id="${c.id}"]`)) continue; seen.add(c.id); const card = makeCard(doc, c, art); shelf.append(card); addCard(card); }
      shelf.hidden = heading.hidden = shelf.children.length === 0; refresh();
    } catch { shelf.hidden = heading.hidden = true; }
  }
  const api = { KINDS, valid, makeCard, load };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.MarketCommunity = api;
})(globalThis);
