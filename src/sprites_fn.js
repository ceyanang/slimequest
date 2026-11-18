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
// Ultra form: the same slime, with brighter gold-trimmed gear and an elemental aura baked around it.
function ultraURL(u) {
  const lk = u.el2 && u.look ? u.look : null;
  const key = `U${u.el}|${u.el2 || ''}|${u.cls}|${JSON.stringify(lk)}`; if (_sc[key]) return _sc[key];
  const base = SPR.slime, H = base.length, W = base[0].length, PAD = 2, px = 8, GH = H + PAD * 2, GW = W + PAD * 2;
  const g = Array.from({ length:GH }, () => Array(GW).fill(null));
  // body (gradient for fused slimes)
  let y0 = H, y1 = 0, x0 = W, x1 = 0; base.forEach((row, yy) => { for (let xx = 0; xx < W; xx++) if (/[eE]/.test(row[xx])) { y0 = Math.min(y0, yy); y1 = Math.max(y1, yy); x0 = Math.min(x0, xx); x1 = Math.max(x1, xx); } });
  base.forEach((row, yy) => { for (let xx = 0; xx < W; xx++) { const c = row[xx]; let col = null;
    if (c === 'e' || c === 'E') { const k = c === 'e' ? 'm' : 's';
      if (u.el2 && lk) { const t = Math.min(1, Math.max(0, ((yy - y0) / Math.max(1, y1 - y0) * 0.6 + (xx - x0) / Math.max(1, x1 - x0) * 1.4) / 2 * 1.3 - 0.15)); col = mixHex(PAL[ELEM[u.el][k]], PAL[ELEM[u.el2][k]], t); }
      else col = PAL[ELEM[u.el][k]]; }
    else if (PAL[c]) col = PAL[c];
    if (col) g[yy + PAD][xx + PAD] = col; } });
  // gear, boosted: shadows turn gold, mid tones brighten, outlines stay
  const boost = hex => { const [r, gg, b] = hexRgb(hex), l = 0.3 * r + 0.59 * gg + 0.11 * b;
    return l < 45 ? hex : l < 115 ? mixHex(hex, '#f2c14e', 0.6) : mixHex(hex, '#ffffff', 0.28); };
  const layers = lk ? [gear('ov', lk.hat, lk.hatEl || u.el), gear('wp', lk.wp, lk.wpEl || u.el2)] : [gear('ov', u.cls, u.el), gear('wp', u.cls, u.el)];
  layers.forEach(([name, swap]) => SPR[name].forEach((row, yy) => { for (let xx = 0; xx < W; xx++) { let c = row[xx]; if (swap && swap[c]) c = swap[c]; if (PAL[c]) g[yy + PAD][xx + PAD] = boost(PAL[c]); } }));
  // aura: element glow fading out from the silhouette, plus a few sparkles
  const cv = document.createElement('canvas'); cv.width = GW * px; cv.height = GH * px; const x = cv.getContext('2d');
  const near = (yy, xx) => { let d = 9; for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const a = yy + dy, b = xx + dx; if (a >= 0 && b >= 0 && a < GH && b < GW && g[a][b]) d = Math.min(d, Math.max(Math.abs(dy), Math.abs(dx))); } return d; };
  let seed = (u.el + u.cls).split('').reduce((s, ch) => s + ch.charCodeAt(0), 7); const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let yy = 0; yy < GH; yy++) for (let xx = 0; xx < GW; xx++) if (!g[yy][xx]) {
    const d = near(yy, xx); if (d > 2) continue;
    const ac = mixHex(u.el2 && xx > GW / 2 ? ELEM[u.el2].c : ELEM[u.el].c, '#ffffff', 0.35);
    x.globalAlpha = d === 1 ? 0.8 : 0.4; x.fillStyle = ac; x.fillRect(xx * px, yy * px, px, px);
    if (d === 2 && R() < 0.12) { x.globalAlpha = 1; x.fillStyle = mixHex(ac, '#ffffff', 0.6); x.fillRect(xx * px + 2, yy * px + 2, px - 4, px - 4); }
  }
  x.globalAlpha = 1;
  for (let yy = 0; yy < GH; yy++) for (let xx = 0; xx < GW; xx++) if (g[yy][xx]) { x.fillStyle = g[yy][xx]; x.fillRect(xx * px, yy * px, px, px); }
  return _sc[key] = cv.toDataURL();
}
const etags = u => etag(u.el) + (u.el2 ? ' ' + etag(u.el2) : '') + (u.el3 ? ' ' + etag(u.el3) : '');
const unitURL = u => u.side === 'P' ? (u.ultra ? ultraURL(u) : u.el2 && u.look ? fusedURL(u.el, u.el2, u.look) : slimeURL(u.el, u.cls)) : (u.role && SPR_IMG[`h_${u.el}_${u.role}`]) || spriteURL(u.spr);
const img = (url, cls = '', st = '') => `<img class="spr ${cls}" style="${st}" src="${url}" alt="">`;
const etag = el => `<span class="etag" style="background:${ELEM[el].c}">${ELEM[el].name}</span>`;
SPR.i_fuse = ["..kkkk..",".kpppPk.","kpyyyyPk","kpyooyPk","kpyooyPk","kpyyyyPk",".kpppPk.","..kkkk.."];
SPR.i_ultra = ["...yy...","..yLLy..","yyLwwLyy",".yLwwLy.","..yLLy..",".yy..yy.","yy....yy","........"];
const ICONSPR = { ultra:'i_ultra', fuse:'i_fuse', dojo:'i_dummy', item:'i_item', fight:'i_fight', elite:'i_elite', camp:'i_camp', treasure:'i_chest', boss:'i_skull', recruit:'i_recruit', train:'i_train', mystery:'i_mystery', start:'i_start', choice:'i_start' };
// Small element symbols (flame, drop, leaf, bolt, rock, sun, moon, eye) used on the map.
const symURL = el => spriteURL('sym_' + el, 3);
const icon = t => `<img class="ico" src="${spriteURL(ICONSPR[t], 4)}" alt="">`;
const itemURL = (id, sc = 4) => spriteURL('it_' + id, sc);
