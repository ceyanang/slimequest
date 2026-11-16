/* ================= move effects ================= */
const FXCOL = {
  fire:['#f94144','#ff8c42','#f9c74f'], water:['#4cc9f0','#a5e8ff','#2a7a9a'], life:['#90be6d','#c7f0a0','#4e7a3a'],
  earth:['#c08a55','#8a5a32','#e0b98a'], lightning:['#f9c74f','#ffffff','#ffe680'], light:['#fff1b8','#ffffff','#f9c74f'],
  dark:['#5a5078','#2e2944','#8a7fb0'], psychic:['#d17fe8','#ff9cf0','#9b5de5'], neutral:['#ffffff','#d6d0f5','#a49cc8'],
  poison:['#9b5de5','#b07fe8','#5a2d8a'], heal:['#90be6d','#c7f0a0','#ffffff'], shield:['#4cc9f0','#a5e8ff','#ffffff'], buff:['#ff8c42','#f9c74f','#ffffff']
};
function cardOf(u) {
  const side = u.side, i = side === 'P' ? party.indexOf(u) : B.foes.indexOf(u);
  return app.querySelector(`.ucard[data-side="${side}"][data-i="${i}"]`);
}
function burst(card, kind, n = 10) {
  const cols = FXCOL[kind] || FXCOL.neutral, box = document.createElement('div');
  box.className = 'fx-box';
  if (kind === 'neutral') box.innerHTML = '<div class="fx-slash"></div>';
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i'), a = Math.random() * Math.PI * 2, r = 18 + Math.random() * 26;
    const up = kind === 'fire' || kind === 'heal' || kind === 'buff' || kind === 'light';
    p.className = 'fx-p';
    p.style.cssText = `--dx:${Math.cos(a) * r}px;--dy:${up ? -14 - Math.random() * 30 : Math.sin(a) * r}px;background:${cols[i % cols.length]};animation-delay:${Math.random() * 0.08}s`;
    box.appendChild(p);
  }
  box.insertAdjacentHTML('afterbegin', `<div class="fx-flash" style="background:${cols[0]}"></div>`);
  if (kind === 'shield') box.insertAdjacentHTML('beforeend', '<div class="fx-ring"></div>');
  card.appendChild(box);
  setTimeout(() => box.remove(), 900);
}
function floatText(card, text, color, cls = '') {
  const el = document.createElement('div');
  el.className = 'fx-num ' + cls; el.textContent = text; el.style.color = color;
  el.style.left = (35 + Math.random() * 30) + '%';
  card.appendChild(el);
  setTimeout(() => el.remove(), 1100);
}
// Move a unit's HP bar mid-animation (multi-hit moves drain it hit by hit).
function setHp(card, hp, max) {
  const bar = card.querySelector('.bar:not(.sta) i'), t = card.querySelector('.hpt');
  if (bar) bar.style.width = (hp / max * 100) + '%';
  if (t && t.firstChild) t.firstChild.nodeValue = `${hp}/${max}`;
  card.classList.toggle('dead', hp <= 0);
}
function spawnFX(e) {
  const card = cardOf(e.u); if (!card) return;
  if (e.hp != null) setHp(card, e.hp, e.max);
  if (e.k === 'name') {
    const el = document.createElement('div');
    el.className = 'fx-name'; el.textContent = e.t;
    el.style.background = (ELEM[e.el] || ELEM.neutral).c;
    card.appendChild(el); setTimeout(() => el.remove(), 1100);
    card.classList.add('acting'); setTimeout(() => card.classList.remove('acting'), 400);
  } else if (e.k === 'dmg') {
    burst(card, e.el, e.small ? 6 : e.crit ? 16 : 11);
    const col = e.eff > 1 ? '#ff8c42' : e.eff < 1 ? '#a49cc8' : '#ffffff';
    floatText(card, `-${e.v}${e.crit ? '!' : ''}`, col, e.crit || e.eff > 1 ? 'big' : '');
    if (e.crit) setTimeout(() => floatText(card, 'CRIT!', '#f9c74f', 'tag'), 120);
    else if (e.eff > 1) setTimeout(() => floatText(card, 'SUPER!', '#ff8c42', 'tag'), 120);
    else if (e.eff < 1) setTimeout(() => floatText(card, 'resist', '#a49cc8', 'tag'), 120);
    (e.tags || []).forEach((t, i) => setTimeout(() => floatText(card, t.toUpperCase(), '#d17fe8', 'tag'), 260 + i * 140));
    card.classList.add('hit');
    if (e.ko) setTimeout(() => { floatText(card, 'KO', '#f94144', 'big'); card.classList.add('ko-flash'); }, 300);
  } else if (e.k === 'heal') { burst(card, 'heal', 9); floatText(card, `+${e.v}`, '#90be6d', 'big'); }
  else if (e.k === 'shield') { burst(card, 'shield', 8); floatText(card, `+${e.v} SH`, '#4cc9f0'); }
  else if (e.k === 'buff') { burst(card, 'buff', 9); floatText(card, e.t, '#ff8c42'); }
  else if (e.k === 'num') {
    if (e.burst) burst(card, e.burst, 7); floatText(card, e.t, e.c, 'tag');
    (e.tags || []).forEach((t, i) => setTimeout(() => floatText(card, t.toUpperCase(), '#d17fe8', 'tag'), 200 + i * 140));
    if (e.ko) setTimeout(() => { floatText(card, 'KO', '#f94144', 'big'); card.classList.add('ko-flash'); }, 250);
  }
}
function soundOf(e) {
  if (e.snd) return [e.snd];
  if (e.k === 'dmg') { const s = [e.crit ? 'crit' : 'hit']; if (e.eff > 1) s.push('super'); if (e.eff < 1) s.push('weak'); if (e.tags && e.tags.length) s.push('status'); if (e.ko) s.push('ko'); return s; }
  return { heal:['heal'], shield:['shield'], buff:['buff'] }[e.k] || [];
}
function playFX() {
  if (!FX || !FX.length || !app) return;
  const list = FX.splice(0), now = new Set(), later = new Set();
  // Rewind HP bars to before a multi-hit move, so each hit visibly takes its chunk.
  list.forEach(e => { if (e.from != null) { const c = cardOf(e.u); if (c) setHp(c, e.from, e.max); } });
  list.forEach(e => { if (e.k === 'anim') try { ANIM.play(e.m, e.u, e.tg); } catch (err) { console.warn(err); } });
  list.forEach(e => {
    const first = e.k === 'name';
    if (e.delay) {   // multi-hit moves: each hit pops on its own beat with its own sound
      setTimeout(() => { spawnFX(e); soundOf(e).forEach(s => SFX.play(s)); }, 280 + e.delay);
      return;
    }
    soundOf(e).forEach(s => (first ? now : later).add(s));
    setTimeout(() => spawnFX(e), first ? 0 : 280);
  });
  now.forEach(s => SFX.play(s));
  setTimeout(() => later.forEach(s => SFX.play(s)), 280);
}

