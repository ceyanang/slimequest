/* ================= sprites ================= */
const _sc = {};
function spriteURL(layers, scale = 8) {
  if (typeof layers === 'string') layers = [[layers]];
  if (layers.length === 1 && SPR_IMG[layers[0][0]]) return SPR_IMG[layers[0][0]];
  const key = JSON.stringify(layers) + scale;
  if (_sc[key]) return _sc[key];
  const h = SPR[layers[0][0]].length, w = SPR[layers[0][0]][0].length;
  // Compose the layers into one colour grid first.
  let g = Array.from({ length:h }, () => Array(w).fill(null));
  layers.forEach(([name, swap]) => SPR[name].forEach((row, yy) => {
    for (let xx = 0; xx < w; xx++) { let c = row[xx]; if (swap && swap[c]) c = swap[c]; if (PAL[c]) g[yy][xx] = PAL[c]; }
  }));
  // Character sprites (16x16) are redrawn at double resolution: smoothed edges plus light/shadow on every shape.
  let px = scale;
  const H = g.length, W = g[0].length;
  const cv = document.createElement('canvas'); cv.width = W * px; cv.height = H * px;
  const x = cv.getContext('2d');
  for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) if (g[yy][xx]) { x.fillStyle = g[yy][xx]; x.fillRect(xx * px, yy * px, px, px); }
  return _sc[key] = cv.toDataURL();
}
// Hat/overlay recolors where the default would blend into the slime's own color.
const OV_SWAP = { 'fire:bard':{ r:'y' }, 'psychic:bard':{ p:'r', P:'R' }, 'dark:bard':{ p:'r', P:'R' }, 'dark:rogue':{ d:'R' }, 'fire:monk':{ r:'y', R:'Y' }, 'water:monk':{ r:'w', R:'X' }, 'lightning:monk':{ r:'p', R:'P' }, 'light:monk':{ r:'o', R:'R' }, 'psychic:monk':{ r:'y', R:'Y' }, 'psychic:mage':{ p:'b', P:'B' }, 'earth:ranger':{ N:'E', n:'e' } };
// Layers: slime body (element colors) + class hat/accessory + class weapon.
// Per-combo gear (e.g. ov_fighter_fire / wp_fighter_fire) if drawn, otherwise the class default.
const gear = (kind, cls, el) => SPR[`${kind}_${cls}_${el}`] ? [`${kind}_${cls}_${el}`] : [`${kind}_${cls}`, kind === 'ov' ? OV_SWAP[el + ':' + cls] : undefined];
const slimeURL = (el, cls) => SPR_IMG[`s_${el}_${cls}`] || (!cls && SPR_IMG['s_' + el]) || spriteURL([['slime', { e:ELEM[el].m, E:ELEM[el].s }], ...(cls ? [gear('ov', cls, el), gear('wp', cls, el)] : [])]);
// Enemy art by role + element (humans, brutes, goblins), falling back to the old grid sprite.
const foeURL = (role, el) => SPR_IMG[`h_${el}_${role}`] || spriteURL([[role, roleSwap(role, el)]], 4);
const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mixHex = (a, b, t) => { const A = hexRgb(a), B = hexRgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
// Fused slime: body is a diagonal gradient between its two elements; hat and weapon come from the parents.
function fusedURL(el, el2, lk) {
  const key = `F${el}|${el2}|${JSON.stringify(lk)}`; if (_sc[key]) return _sc[key];
  const base = SPR.slime, H = base.length, W = base[0].length, px = 8;
  const cv = document.createElement('canvas'); cv.width = W * px; cv.height = H * px; const x = cv.getContext('2d');
  let y0 = H, y1 = 0, x0 = W, x1 = 0; base.forEach((row, yy) => { for (let xx = 0; xx < W; xx++) if (/[eE]/.test(row[xx])) { y0 = Math.min(y0, yy); y1 = Math.max(y1, yy); x0 = Math.min(x0, xx); x1 = Math.max(x1, xx); } });
  base.forEach((row, yy) => { for (let xx = 0; xx < W; xx++) { const c = row[xx]; let col = null;
    if (c === 'e' || c === 'E') { const t = Math.min(1, Math.max(0, ((yy - y0) / Math.max(1, y1 - y0) * 0.6 + (xx - x0) / Math.max(1, x1 - x0) * 1.4) / 2 * 1.3 - 0.15)); col = mixHex(PAL[ELEM[el][c === 'e' ? 'm' : 's']], PAL[ELEM[el2][c === 'e' ? 'm' : 's']], t); }
    else if (PAL[c]) col = PAL[c];
    if (col) { x.fillStyle = col; x.fillRect(xx * px, yy * px, px, px); } } });
  [gear('ov', lk.hat, lk.hatEl || el), gear('wp', lk.wp, lk.wpEl || el2)].forEach(([name, swap]) => SPR[name].forEach((row, yy) => { for (let xx = 0; xx < W; xx++) { let c = row[xx]; if (swap && swap[c]) c = swap[c]; if (PAL[c]) { x.fillStyle = PAL[c]; x.fillRect(xx * px, yy * px, px, px); } } }));
  return _sc[key] = cv.toDataURL();
}
const etags = u => etag(u.el) + (u.el2 ? ' ' + etag(u.el2) : '') + (u.el3 ? ' ' + etag(u.el3) : '');
const unitURL = u => u.side === 'P' ? (u.el2 && u.look ? fusedURL(u.el, u.el2, u.look) : slimeURL(u.el, u.cls)) : (u.role && SPR_IMG[`h_${u.el}_${u.role}`]) || spriteURL(u.spr);
const img = (url, cls = '', st = '') => `<img class="spr ${cls}" style="${st}" src="${url}" alt="">`;
const etag = el => `<span class="etag" style="background:${ELEM[el].c}">${ELEM[el].name}</span>`;
SPR.i_fuse = ["..kkkk..",".kpppPk.","kpyyyyPk","kpyooyPk","kpyooyPk","kpyyyyPk",".kpppPk.","..kkkk.."];
const ICONSPR = { fuse:'i_fuse', dojo:'i_dummy', item:'i_item', fight:'i_fight', elite:'i_elite', camp:'i_camp', treasure:'i_chest', boss:'i_skull', recruit:'i_recruit', train:'i_train', mystery:'i_mystery', start:'i_start', choice:'i_start' };
// Small element symbols (flame, drop, leaf, bolt, rock, sun, moon, eye) used on the map.
const symURL = el => spriteURL('sym_' + el, 3);
const icon = t => `<img class="ico" src="${spriteURL(ICONSPR[t], 4)}" alt="">`;
const itemURL = (id, sc = 4) => spriteURL('it_' + id, sc);
