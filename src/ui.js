/* ================= state ================= */
const app = typeof document !== 'undefined' ? document.getElementById('app') : null;
let choice = { el:'fire', cls:'fighter', realm:0 };
let party = [], G = null, B = null;
let TITLE_UP = false, STAR_EDIT = false;   // true while the title / starter screen is showing
const sleep = ms => new Promise(r => setTimeout(r, ms));
// Battle pacing respects the 2x speed toggle.
// QUICK mode = auto + 2x with no move panel or battle text; new moves are learned automatically (smartLearn).
const isAuto = () => !!(G && (G.auto || G.quick)), isFast = () => !!(G && (G.fast || G.quick));
const SPEED = () => G && G.quick ? 4.4 : isFast() ? 2.2 : 1;   // QUICK runs at 4x, 2x at 2.2x
const wait = ms => sleep(ms / SPEED());

/* ================= shared bits ================= */
function chartHTML() {
  const chain = c => c.map(e => etag(e)).join(' › ') + ' › ' + etag(c[0]);
  return `<div class="faces">Each beats the next one (1.5x damage, and 0.67x the other way).<br>${chain(CYC)}<br>${chain(SPC)}</div>`;
}
function elMods(e) {
  const S = EL_STATS[e], parts = STAT_KEYS.filter(k => S[k]).map(k => `${STAT_NAME[k]} ${stepText(k, S[k])}`);
  return parts.length ? parts.join(' · ') : 'No changes';
}
const statLine = u => `HP ${u.max ?? u.hp} · OFF ${u.off} · DEF ${u.pdef} · SpD ${u.sdef} · SPE ${u.spd} · STA ${u.staMax ?? u.sta}`;
// Tiny pixel icon per move type: sword = class, slime = element (in its color), star = combo. Basic hits get none.
// Attack type marker: explosion = physical, magic trail = special, yin-yang = no damage (support/status).
function catIcon(m) {
  if (m.rest) return '';
  const k = m.pow > 0 ? (m.cat === 's' ? 'spec' : 'phys') : 'ally';
  const t = { phys:'Physical attack', spec:'Special attack', ally:'Support / status move' }[k];
  return `<img class="mic" src="${spriteURL('ic_' + k, 3)}" alt="${k}" title="${t}">`;
}
function mtype(m) {
  return catIcon(m) + tagIcon(m);
}
function tagIcon(m) {
  if (m.passive) return '<span class="mic" style="color:#f9c74f">&#9733;</span>';
  if (m.tag === 'Class') return `<img class="mic" src="${spriteURL('ic_sword', 3)}" alt="class" title="Class move">`;
  if (m.tag === 'Combo') return `<img class="mic" src="${spriteURL('ic_star', 3)}" alt="combo" title="Combo move">`;
  if (m.tag === 'Element') { const E = ELEM[m.el] || ELEM.fire; return `<img class="mic" src="${spriteURL([['ic_slime', { e:E.m || 'e' }]], 3)}" alt="element" title="Element move">`; }
  return '';
}
const moveLine = m => `<div class="mline">${mtype(m)}<b>${m.n}</b> ${etag(m.el)} <span class="mtag">${m.staCharge ? '+' + pct(m.staCharge) + ' STA' : m.s + ' STA'}</span><br><small>${mdesc(m)}</small></div>`;
const moveList = u => allMoves(u).map(moveLine).join('');
function learnsetHTML(el, cls, upTo = 0) {
  return learnset(el, cls).map(x => `<div class="ls ${x.lvl <= upTo ? 'got' : ''}"><span class="lsl">Lv${x.lvl}</span> <b>${x.m.n}</b> ${etag(x.m.el)} <span class="mtag">${x.m.tag}</span></div>`).join('') +
    LEARN_LV.combo.slice((COMBO_MOVES[el + '_' + cls] || []).length).map(l => `<div class="ls soon"><span class="lsl">Lv${l}</span> <i>combo move (coming soon)</i></div>`).join('');
}
const worldTitle = () => `WORLD ${G.w + 1}: ${WORLDS[G.w].name.toUpperCase()}`;
const itemIcon = (id, cls = 'ico') => id ? `<img class="${cls}" src="${itemURL(id)}" alt="">` : '';
function partyMini() {
  return `<div class="row">${party.map((p, i) => `<div class="card mini tappable ${p.hp<=0?'dead':''}" data-pm="${i}">${p.item ? `<span class="held">${itemIcon(p.item)}</span>` : ''}${img(unitURL(p), 'xs')}<div class="nm">${p.name}</div><div class="lv">Lv${p.lvl}</div>
    <div class="bar"><i style="width:${Math.max(0,p.hp)/p.max*100}%"></i></div><div class="hpt">${Math.max(0,p.hp)}/${p.max}</div></div>`).join('')}
    ${Array.from({ length:PARTY_MAX - party.length }, () => `<div class="card mini empty"><div class="hpt">empty slot</div></div>`).join('')}</div>`;
}

/* ================= stat bars =================
   Bar length = the slime's build (base stats, so it doesn't change with level).
   Number = the actual stat at its current level. */
const BAR_MAX = { hp:80, off:17, pdef:16, sdef:16, spd:11, sta:135 };
const BAR_COL = { hp:'#90be6d', off:'#f94144', pdef:'#4cc9f0', sdef:'#b388ff', spd:'#8fe3c8', sta:'#ff8c42' };
const BOOST_COL = '#ffd60a';   // treasure boosts show as a yellow tail on the bar
// Bar color shows how a stat ranks among every element+class slime: red (low) → orange → lime → green (very high) → light blue (extremely high).
const TIER_COL = ['#e01e37', '#ff8c42', '#c5e85a', '#3cc45a', '#5ad8ff'];
let STAT_RANGE = null;
function tierCol(k, v) {
  if (!STAT_RANGE) {
    STAT_RANGE = {};
    const all = []; ALL_ELS.forEach(e => Object.keys(CLASSES).forEach(c => all.push(baseOf(e, c))));
    [...STAT_KEYS, 'crit'].forEach(s => { const xs = all.map(b => b[s]); STAT_RANGE[s] = [Math.min(...xs), Math.max(...xs)]; });
  }
  const r = rankOf(k, v);
  return TIER_COL[r < 0.2 ? 0 : r < 0.42 ? 1 : r < 0.65 ? 2 : r < 0.88 ? 3 : 4];
}
// Where a stat sits between the lowest and highest slime (0..1). Bar length uses this too, so color and length agree.
function rankOf(k, v) { tierCol.init && 0; if (!STAT_RANGE) tierCol(k, v); const [lo, hi] = STAT_RANGE[k]; return hi > lo ? (v - lo) / (hi - lo) : 0.5; }
// Bars keep headroom above the best slime so a fully boosted stat (star points) still has room to show its extra length.
const barW = (k, v) => { rankOf(k, v); const [lo, hi] = STAT_RANGE[k], top = hi * (1 + STAR_PER_POINT * STAR_STAT_MAX); return Math.round(12 + 88 * Math.max(0, Math.min(1, top > lo ? (v - lo) / (top - lo) : 0.5))); };
// Remember which start-screen sections are open so they stay open when you switch slimes.
const OPEN_DET = new Set();
function statBars(u, starKey = null) {
  const b = u.base, now = { hp:u.max, off:u.off, pdef:u.pdef, sdef:u.sdef, spd:u.spd, sta:u.staMax };
  const orig = u.el && CLASSES[u.cls] && !u.el2 && u.side !== 'E' ? baseOf(u.el, u.cls) : b;
  // How much the element shifts each stat vs. a plain slime of the same class and level.
  const C = u.el && !u.el2 && u.side !== 'E' && CLASSES[u.cls], M = mult(u.lvl || 1);
  const plain = C ? { hp:Math.round(C.hp * M), off:Math.round(C.off * M), pdef:Math.round(C.pdef * M), sdef:Math.round(C.sdef * M), spd:Math.round(C.spd * M), sta:Math.round(C.sta + ((u.lvl || 1) - 1) * 0.4) } : null;
  const delta = k => { if (!plain) return ''; const d = Math.round(baseOf(u.el, u.cls)[k] === C[k] ? 0 : (k === 'sta' ? (EL_STATS[u.el].sta || 0) * STEP_STA : Math.round(baseOf(u.el, u.cls)[k] * M) - plain[k]));
    return d ? ` <small class="${d > 0 ? 'dup' : 'ddn'}">(${d > 0 ? '+' : ''}${d})</small>` : ''; };
  const row = (k, label) => {
    const w0 = barW(k, Math.min(b[k], orig[k]));
    const boosted = b[k] > orig[k] + 0.01, w1 = boosted ? Math.max(2, Math.min(100 - w0, barW(k, b[k]) - w0)) : 0;
    return `<div class="sb"><span class="sbl">${label}</span><span class="sbt"><i style="width:${w0}%;background:${tierCol(k, Math.min(b[k], orig[k]))}"></i>${w1 ? `<i style="width:${w1}%;background:${BOOST_COL}"></i>` : ''}</span><span class="sbv" ${boosted ? `style="color:${BOOST_COL}"` : ''}>${now[k]}${delta(k)}</span>${starKey ? starCtl(starKey, k) : ''}</div>`;
  };
  return `<div class="sbars">${row('hp','HP')}${row('off','OFF')}${row('pdef','DEF')}${row('sdef','SpD')}${row('spd','SPE')}${row('sta','STA')}
    </div>`;
}

/* star boosts: spend points on the starter you're about to pick (only possible here, so runs can't be rigged mid-way) */
function starCtl(key, k) {
  const n = ((META.stars[key] || {})[k]) || 0;
  return `<span class="stp"><button class="stb" data-sk="${k}" data-d="-1" ${n ? '' : 'disabled'}>-</button><b>${n}</b><button class="stb" data-sk="${k}" data-d="1" ${canAddStar(key, k) ? '' : 'disabled'}>+</button></span>`;
}
// Corner badges for selection cards: filled stars (10 placed points each) top right, earned points top left.
function starsOf(el, cls) { return Math.min(starsUnlocked(), Math.floor(starAlloc(comboKey(el, cls)) / STAR_STEP)); }
// One star per slot of 10 placed points; a slot that is only partly filled shows a partly filled star.
function starBadge(el, cls) {
  const a = starAlloc(comboKey(el, cls)), out = [];
  for (let i = 0; i < starsUnlocked(); i++) {
    const f = Math.max(0, Math.min(1, (a - STAR_STEP * i) / STAR_STEP));
    if (f >= 1) out.push('&#9733;'); else if (f > 0) out.push(`<span class="pst" style="--f:${Math.round(f * 100)}%">&#9733;</span>`);
  }
  return out.length ? `<span class="cbadge sr">${out.join('')}</span>` : '';
}
function earnBadge(el, cls) { const n = comboPts(comboKey(el, cls)); return n ? `<span class="cbadge sl">+${n}</span>` : ''; }
// A combo has unspent points when it still has earned points it could place (and star room left).
const unspent = (el, cls) => { const k = comboKey(el, cls); return ownLeft(k) > 0 && starAlloc(k) < starCap(); };
const elUnspent = el => STARTER_CLASSES.some(c => unspent(el, c));
function starBox(el, cls) {
  const key = comboKey(el, cls), alloc = starAlloc(key), cap = starCap(), unlocked = starsUnlocked(), room = starRoom(key);
  const stars = Array.from({ length:REALMS + 1 }, (_, i) => i < unlocked ? (alloc >= STAR_STEP * (i + 1) ? '&#9733;' : '&#9734;') : '<span class="lock">locked</span>').join(' ');
  return `<div class="starbox"><div class="sttitle"><span>STAR BOOSTS <span class="stars">${stars}</span></span><span class="stbtns"><button id="starinfo" class="infobtn">INFO</button><button id="staredit" class="infobtn ${STAR_EDIT ? 'primary' : ''}">${STAR_EDIT ? 'DONE' : 'SPEND'}</button></span></div>
    <div class="stsub"><b>${alloc}/${cap}</b> placed · <b>${room}</b> to spend</div>
    <div class="stsub split"><span>SHARED <b>${Math.max(0, sharedAvail())}</b> left</span><span>THIS SLIME <b>${ownLeft(key)}</b> left</span></div>
    ${STAR_EDIT && room <= 0 ? `<div class="stsub dim">${alloc >= cap ? `This slime is at its cap (${cap}). Clear another realm to unlock the next star.` : `No points to spend on this slime. Stars raise the cap; points are earned: beat the World 3 boss (+2), World 5 boss (+3) or clear a realm (+5) with this element+class in your party, or beat any boss for the first time (+1 shared, usable on any slime). Combos with points waiting show a <b>!</b> badge.`}</div>` : ''}</div>`;
}
function showStarInfo() {
  const key = comboKey(choice.el, choice.cls), own = comboPts(key), alloc = starAlloc(key);
  const tiers = REALM_DEF.map((R, r) => `<div><b>${R.name.split(':')[0]}</b></div>` + MILESTONES.map((m, i) => { const tk = r ? `r${r + 1}_${i}` : i, got = META.combos[key] && META.combos[key].tiers && META.combos[key].tiers[tk]; return `<div class="${got ? 'got' : ''}">${got ? '&#10003; ' : '&#9675; '}${m.label}: +${m.pts}</div>`; }).join('')).join('');
  const box = document.createElement('div'); box.className = 'modal';
  box.innerHTML = `<div class="mcard"><div class="sttitle">STAR BOOSTS</div>
    <div class="stsub">Place points in a slime's stats on this screen, before a run starts. Each point adds ${STAR_PER_POINT * 100}% of that stat, up to ${STAR_STAT_MAX} per stat. They apply when this slime is your starter, and at half strength when you recruit it.</div>
    <div class="stsub"><b>Cap:</b> ${STAR_STEP} points per star, and at most ${STAR_STAT_MAX} in any one stat. You have ${starsUnlocked()} star${starsUnlocked() > 1 ? 's' : ''}${starsUnlocked() <= REALMS ? `; clear Realm ${starsUnlocked()} for the first time to unlock star ${starsUnlocked() + 1} (${STAR_STEP * (starsUnlocked() + 1)} points)` : ''}.</div>
    <div class="stsub"><b>Earning:</b> this slime gets points when it's in your party as a boss falls (once each):</div>
    <div class="stsub tiers">${tiers}</div>
    <div class="stsub">The first time you beat each boss also adds 1 shared point that any slime can use.</div>
    <div class="stsub"><b>Now:</b> this slime's own points are spent first; shared points cover the rest (and are refunded first). Shared: ${Math.max(0, sharedAvail())} left. This slime: ${own} earned, ${ownLeft(key)} left. ${alloc} placed here.</div>
    <div class="row"><button class="primary" id="mclose">CLOSE</button></div></div>`;
  document.body.appendChild(box);
  box.onclick = e => { if (e.target === box) box.remove(); };
  box.querySelector('#mclose').onclick = () => box.remove();
}
// Tap-to-inspect: stats (with current boosts), passive, matchups, statuses and moves.
function showUnitInfo(u) {
  const st = [['HP', `${Math.max(0, u.hp)}/${u.max}`, 0], ['OFF', Math.round(u.off * stMul(u.sOff || 0, u)), u.sOff], ['DEF', Math.round(u.pdef * stMul(u.sDef || 0, u)), u.sDef],
    ['SpD', Math.round(u.sdef * stMul(u.sSDef || 0, u)), u.sSDef], ['SPE', Math.round(u.spd * stMul(u.sSpd || 0, u)), u.sSpd], ['STA', `${u.sta}/${u.staMax}`, 0], ['CRIT', Math.round((u.crit || 0) * 100) + '%', 0]];
  const arrow = s => !s ? '' : s > 0 ? ` <span style="color:#7cd67c">+${s * 25}%</span>` : ` <span style="color:#ff6b6b">${Math.round((stMul(s, u) - 1) * 100)}%</span>`;
  const mult = ALL_ELS.map(e => [e, effVs(e, u)]);
  const weak = mult.filter(x => x[1] > 1.01).sort((a, b) => b[1] - a[1]), res = mult.filter(x => x[1] < 0.99).sort((a, b) => a[1] - b[1]);
  const ml = list => list.length ? list.map(([e, m]) => `${etag(e)} <small>${m.toFixed(2).replace(/\.?0+$/, '')}x</small>`).join(' ') : '<small>none</small>';
  const ps = passiveOf(u), tricks = [];
  if (ultraPerk(u)) tricks.push(`<b class="ultratag">&#9733; ${ultraPerk(u).n} (Ultra):</b> ${ultraPerk(u).d}`);
  if (u.quirk) tricks.push(`<b>Native to ${WORLDS[G ? G.w : 0].name}:</b> ${u.quirk}`);
  if (u.undying && !u.undyingUsed) tricks.push(`<b>${u.undying.title}:</b> gets back up once when knocked out.`);
  if (u.summon) tricks.push(`<b>${u.summon.title}:</b> calls in reinforcements every ${u.summon.every} rounds.`);
  if (u.phase && !u.phase.done) tricks.push(`<b>${u.phase.title}:</b> changes tactics at ${Math.round(u.phase.at * 100)}% HP.`);
  const box = document.createElement('div'); box.className = 'modal';
  box.innerHTML = `<div class="mcard uinfo"><div class="sttitle">${u.name}</div>
    <div class="stsub">Lv${u.lvl} ${etags(u)}${u.kind ? ` · ${u.kind}` : u.cls && CLASSES[u.cls] ? ` · ${CLASSES[u.cls].name}` : ''}${u.el2 && u.parents ? ` <small>(${ELEM[u.el].name} + ${ELEM[u.el2].name}${u.cls2 ? `, ${CLASSES[u.cls].name} + ${CLASSES[u.cls2].name}` : ''})</small>` : ''}</div>
    ${ps ? `<div class="stsub"><b>&#9733; ${ps.n}:</b> ${ps.d}</div>` : ''}
    ${tricks.map(t => `<div class="stsub">${t}</div>`).join('')}
    <div class="stsub">HP <b>${Math.max(0, u.hp)}/${u.max}</b> · STA <b>${u.sta}/${u.staMax}</b> · Crit <b>${Math.round((u.crit || 0) * 100)}%</b></div>
    ${statBars(u)}
    ${st.some(x => x[2]) ? `<div class="stsub"><b>In this fight:</b> ${st.filter(x => x[2]).map(([k, v, s]) => `${k}${arrow(s)}`).join(' · ')}</div>` : ''}
    <div class="stsub"><b>Weak to:</b> ${ml(weak)}</div><div class="stsub"><b>Resists:</b> ${ml(res)}</div>
    ${statusTags(u) ? `<div class="stsub"><b>Status:</b> ${statusTags(u)}</div>` : ''}
    <details><summary>MOVES</summary><div class="faces small">${moveList(u)}</div></details>
    <div class="row"><button class="primary" id="mclose">CLOSE</button></div></div>`;
  document.body.appendChild(box);
  box.onclick = e => { if (e.target === box) box.remove(); };
  box.querySelector('#mclose').onclick = () => box.remove();
}
function confirmBox(msg, okLabel, onOk) {
  const box = document.createElement('div'); box.className = 'modal';
  box.innerHTML = `<div class="mcard"><div class="sub" style="text-align:center;margin-bottom:10px">${msg}</div>
    <div class="row"><button id="cno">CANCEL</button><button class="primary" id="cyes">${okLabel}</button></div></div>`;
  document.body.appendChild(box);
  box.onclick = e => { if (e.target === box) box.remove(); };
  box.querySelector('#cno').onclick = () => box.remove();
  box.querySelector('#cyes').onclick = () => { box.remove(); onOk(); };
}

/* party slime details popup (tap a slime on the map) */
function showSlimeCard(i) {
  const p = party[i]; if (!p) return;
  const box = document.createElement('div');
  box.className = 'modal';
  box.innerHTML = `<div class="mcard">
    <div class="hero">${img(unitURL(p), 'mid bob')}<div><div class="name">${p.name} · Lv${p.lvl}</div><div class="kind">${p.kind || ""}</div>${etags(p)}${passiveLine(p)}
      <div class="hpt">${Math.max(0, p.hp)}/${p.max} HP${p.lvl >= levelCap() ? ` · <b>level cap (Lv${levelCap()}) for this world</b>` : p.lvFrac > 0.05 ? ` · ${Math.round(p.lvFrac * 100)}% to next level` : ''}</div></div></div>
    ${statBars(p)}
    <div class="sub"><small>Item: ${p.item ? `${itemIcon(p.item)} <b>${ITEMS[p.item].n}</b> · ${ITEMS[p.item].desc}` : 'none'}</small></div>
    <div class="faces small">${moveList(p)}</div>
    <div class="row"><button class="primary" id="mclose">CLOSE</button></div></div>`;
  document.body.appendChild(box);
  const close = () => box.remove();
  box.onclick = e => { if (e.target === box) close(); };
  box.querySelector('#mclose').onclick = close;
}

// Realm r (0-based) opens once realm r-1 (1-based number r) has been cleared.
// Clearing Realm 1 opens the rare elements as starters.
const starterEls = () => META.cleared.includes(1) ? [...STARTERS, ...RARE_ELS] : STARTERS;
const REALM_LOCKED = r => r > 0 && !META.cleared.includes(r);
function passiveLine(p) { const ps = passiveOf(p), up = ultraPerk(p); return (ps ? `<div class="pas"><b>${ps.n}</b> ${ps.d}</div>` : '') + (up ? `<div class="pas"><b class="ultratag">&#9733; ${up.n} (Ultra)</b> ${up.d}</div>` : ''); }
// Fused starter: choose which parent's basic hit (and main element/class) the fusion keeps. A Warlock always blasts.
function basicPick(el, cls) {
  const par = [[el, cls], [choice.el2, choice.cls2]], b = ([e, c]) => newSlime(e, c).basic;
  const wl = par.findIndex(x => x[1] === 'sorcerer');
  if (wl >= 0) { const m = b(par[choice.fzb || 0]);
    return `<div class="sub">Basic hit: <b>${m.n}</b> (a Warlock always keeps its blast).</div>`; }
  return `<div class="sub">Basic hit (which parent's default attack it keeps):</div><div class="row">${par.map((x, i) => { const m = b(x);
    return `<div class="card choice ${(choice.fzb || 0) === i ? 'on' : ''}" data-fzb="${i}"><div class="name">${m.n}</div><div class="trait">${ELEM[x[0]].name} ${CLASSES[x[1]].name} · ${m.pow} POW${m.el !== 'neutral' ? ' ' + ELEM[m.el].name : ''}</div></div>`; }).join('')}</div>`;
}
/* ================= pick screen ================= */
function renderPick() {
  TITLE_UP = true;
  MUSIC.play('map');
  if (REALM_LOCKED(choice.realm)) choice.realm = 0;
  if (!starterEls().includes(choice.el)) choice.el = 'fire';
  document.body.style.backgroundColor = REALM_WORLDS[choice.realm][0].bg;
  const { el, cls } = choice; let p = newSlime(el, cls), keep = cls;
  const fzOn = FUSION_ON() && choice.fuse;   // fused starter: unlocked by clearing Realm 2
  if (fzOn) {
    if (!starterEls().includes(choice.el2) || choice.el2 === el) choice.el2 = starterEls().find(e => e !== el);
    if (!STARTER_CLASSES.includes(choice.cls2)) choice.cls2 = 'fighter';
    if (cls === 'sorcerer' || choice.cls2 === 'sorcerer') choice.fzb = cls === 'sorcerer' ? 0 : 1;   // a Warlock always keeps its blast
    const sig = JSON.stringify([el, cls, choice.el2, choice.cls2, META.stars, META.shared, choice.fzb || 0]);
    if (!choice.fz || choice.fz.sig !== sig) choice.fz = { sig, unit:absorbPending(fuseSlimes(p, newSlime(choice.el2, choice.cls2), choice.fzb || 0), 4) };
    p = choice.fz.unit; keep = p.cls;
  }
  const pasOpts = fzOn ? [...PASSIVES[p.cls], ...(p.cls2 ? PASSIVES[p.cls2] : [])] : PASSIVES[keep];
  if (!pasOpts.some(x => x.id === choice.pas)) choice.pas = pasOpts[0].id;
  p.pas = choice.pas;
  app.innerHTML = `
    <h1>SLIME QUEST</h1>
    <div class="sub">You're a level 1 slime. Recruit a crew and fight through 8 worlds to level ${LVL_MAX}.</div>
    ${SAVED ? `<div class="resume"><div><b>SAVED RUN</b> · ${REALM_DEF[SAVED.realm || 0].name.split(':')[0]} · World ${SAVED.w + 1}: ${REALM_WORLDS[SAVED.realm || 0][SAVED.w].name}<br><small>${SAVED.party.map(p => `${p.name} Lv${p.lvl}`).join(', ')}</small></div><button class="primary" id="resume">RESUME RUN</button></div>` : ''}
    <div class="hero"><div class="dicewrap">${img(unitURL(p), 'mid bob')}${fzOn ? '<button class="dice" id="lookdice" title="Reroll look">&#127922;</button>' : ''}</div><div><div class="name">${fzOn ? p.kind : ELEM[el].name + ' ' + CLASSES[cls].name} Slime</div>
    </div></div>
    ${statBars(p, STAR_EDIT ? comboKey(el, cls) : null)}${STAR_EDIT && fzOn ? `<div class="tip">Star points go to your first slime, the <b>${ELEM[el].name} ${CLASSES[cls].name}</b>; the fused preview updates as you spend.</div>` : ''}
    ${starBox(el, cls)}
    <div class="section">REALM</div>
    <div class="row">${REALM_DEF.map((R, r) => `<div class="card choice realmc ${r === choice.realm ? 'on' : ''} ${REALM_LOCKED(r) ? 'locked' : ''}" data-realm="${r}"><div class="name">${R.name}</div><div class="trait">${REALM_LOCKED(r) ? `Locked: clear Realm ${r} first.` : R.blurb}</div></div>`).join('')}</div>
    <div class="section">ELEMENT</div>
    <div class="row">${starterEls().map(e => `<div class="card choice chip ${e===el?'on':''}" data-el="${e}">${elUnspent(e) ? '<span class="cbadge ex">!</span>' : ''}${img(slimeURL(e), 'xs')}${etag(e)}</div>`).join('')}</div>
    <div class="eldesc"><b>${ELEM[el].name}:</b> ${EL_STATS[el].desc}.</div>
    <div class="section">CLASS</div>
    <div class="row clsgrid">${STARTER_CLASSES.map(c => { const C = CLASSES[c]; return `<div class="card choice ${c===cls?'on':''}" data-cls="${c}">${unspent(el, c) ? '<span class="cbadge ex ex2">!</span>' : ''}${earnBadge(el, c)}${starBadge(el, c)}${img(slimeURL(el, c), 'sm')}<div class="name">${C.name}</div></div>`; }).join('')}</div>
    <div class="eldesc"><b>${CLASSES[cls].name}:</b> ${CLASSES[cls].desc}</div>
    ${FUSION_ON() ? `<div class="section">FUSION</div><div class="row"><button id="fztog" ${fzOn ? 'class="primary"' : ''}>${fzOn ? 'FUSED STARTER: ON' : 'FUSE WITH A SECOND SLIME'}</button></div>` : ''}
    ${fzOn ? `<div class="sub">Second slime (the fusion is both elements AND both classes, with averaged stats):</div>
      <div class="row">${starterEls().map(e => `<div class="card choice chip ${e === choice.el2 ? 'on' : ''}" data-el2="${e}">${img(slimeURL(e), 'xs')}${etag(e)}</div>`).join('')}</div>
      <div class="row" style="flex-wrap:wrap">${STARTER_CLASSES.map(c => `<div class="card choice chip ${c === choice.cls2 ? 'on' : ''}" style="flex:1 0 30%;font-size:10px" data-cls2="${c}">${CLASSES[c].name}</div>`).join('')}</div>
      ${basicPick(el, cls)}` : ''}
    <div class="section">PASSIVE (pick one)</div>
    <div class="row" style="flex-wrap:wrap">${pasOpts.map(x => `<div class="card choice paschoice ${x.id === choice.pas ? 'on' : ''}" data-pas="${x.id}"><div class="name">${x.n}</div><div class="trait">${x.d}</div></div>`).join('')}</div>
    <div class="row" style="margin-top:8px"><button class="primary" id="go">START QUEST</button></div>
    <details data-k="moves" ${OPEN_DET.has('moves') ? 'open' : ''}><summary>STARTING MOVES</summary><div class="faces">${moveList(p)}<div class="mline"><small>Your basic hit is free, never takes a move slot, and recharges ${pct(BASIC_CHARGE)} stamina. Stamina also refills +${STA_REGEN} each turn, and Rest recharges ${pct(REST_PCT)}.</small></div></div></details>
    <details data-k="learn" ${OPEN_DET.has('learn') ? 'open' : ''}><summary>LEARNSET</summary><div class="faces">${learnsetHTML(el, cls, 1)}</div></details>
    <details data-k="chart" ${OPEN_DET.has('chart') ? 'open' : ''}><summary>ELEMENT CHART</summary>${chartHTML()}</details>`;
  app.querySelectorAll('details[data-k]').forEach(d => d.addEventListener('toggle', () => d.open ? OPEN_DET.add(d.dataset.k) : OPEN_DET.delete(d.dataset.k)));
  app.querySelectorAll('[data-realm]').forEach(c => c.onclick = () => { const r = +c.dataset.realm; if (REALM_LOCKED(r)) return; choice.realm = r; renderPick(); });
  app.querySelectorAll('[data-el]').forEach(c => c.onclick = () => { choice.el = c.dataset.el; renderPick(); });
  app.querySelectorAll('[data-cls]').forEach(c => c.onclick = () => { choice.cls = c.dataset.cls; renderPick(); });
  const tg = document.getElementById('fztog'); if (tg) tg.onclick = () => { const y = window.scrollY; choice.fuse = !choice.fuse; renderPick(); window.scrollTo(0, y); };
  const re = (sel, f) => app.querySelectorAll(sel).forEach(c => c.onclick = () => { const y = window.scrollY; f(c); renderPick(); window.scrollTo(0, y); });
  re('#lookdice', () => { rerollLook(choice.fz.unit); SFX.play('buff'); });
  re('[data-el2]', c => choice.el2 = c.dataset.el2); re('[data-cls2]', c => choice.cls2 = c.dataset.cls2); re('[data-fzb]', c => choice.fzb = +c.dataset.fzb);
  app.querySelectorAll('[data-pas]').forEach(c => c.onclick = () => { const y = window.scrollY; choice.pas = c.dataset.pas; renderPick(); window.scrollTo(0, y); });
  const yoff = () => window.scrollY;
  app.querySelectorAll('[data-sk]').forEach(b => b.onclick = () => { const y = yoff(); if (changeStar(comboKey(choice.el, choice.cls), b.dataset.sk, +b.dataset.d)) { renderPick(); window.scrollTo(0, y); } });
  document.getElementById('starinfo').onclick = showStarInfo;
  document.getElementById('staredit').onclick = () => { const y = yoff(); STAR_EDIT = !STAR_EDIT; renderPick(); window.scrollTo(0, y); };
  const rs = document.getElementById('resume');
  if (rs) rs.onclick = () => { restoreRun(SAVED); SAVED = null; persist(); TITLE_UP = false; showMap(); };
  document.getElementById('go').onclick = () => SAVED ? confirmBox('Starting a new run will discard your saved run.', 'DISCARD AND START', () => { SAVED = null; persist(); startRun(); }) : startRun();
}

/* ================= run + map ================= */
function startRun() {
  TITLE_UP = false;
  // The fused starter is a copy of the starter-screen preview, so a run never changes the preview (or the next run).
  if (FUSION_ON() && choice.fuse && choice.fz) { const u = clone(choice.fz.unit), lab = u.kind; party = [giveName(u, [])]; party[0].kind = lab; }
  else party = [giveName(newSlime(choice.el, choice.cls))];
  const opts0 = [...PASSIVES[party[0].cls], ...(party[0].cls2 ? PASSIVES[party[0].cls2] : [])];   // fused starters can pick from both classes
  party[0].pas = opts0.some(x => x.id === choice.pas) ? choice.pas : opts0[0].id;
  setRealm(REALM_LOCKED(choice.realm) ? 0 : choice.realm);
  G = { w:0, map:genMap(0), pos:null, node:null, learnQ:[], auto:false, fast:false, bag:[] };
  G.ultraSeen = ensureUltra(G.map, 0, false);
  showMap();
}

// World 1 only, and only while the party is still standing on the flag: a free map reroll (forfeiting and restarting would do the same).
const canRerollMap = () => G.w === 0 && (!G.pos || G.pos.f === 0);
function showMap() {
  LV_WORLD = G.w;
  MUSIC.play('map', WORLD_KEY[G.w]);
  document.body.style.backgroundColor = WORLDS[G.w].bg;
  const reach = G.pos ? G.pos.next : G.map[0];
  const W = 300, H = 470, top = 30, bot = H - 30;
  const GAP = { 1:0, 2:116, 3:80, 4:61 };
  const MOON_X = [0, -60, 45, -45, 60, -20, 0];   // the Moon's single path wanders across the surface
  const px = n => W / 2 + (isMoon(G.w) ? MOON_X[n.f] || 0 : (n.c - (G.map[n.f].length - 1) / 2) * GAP[G.map[n.f].length]);
  const py = n => bot - n.f * ((bot - top) / (G.map.length - 1));
  let lines = '', nodes = '';
  G.map.forEach(row => row.forEach(n => n.next.forEach(m => {
    const hot = G.pos === n;
    lines += `<line x1="${px(n)}" y1="${py(n)}" x2="${px(m)}" y2="${py(m)}" stroke="${hot ? '#f9c74f' : '#3d3560'}" stroke-width="${hot ? 4 : 3}" stroke-dasharray="6 5"/>`;
  })));
  G.map.forEach(row => row.forEach(n => {
    const r = reach.includes(n), cur = G.pos === n, op = r || cur || n.visited ? 1 : 0.45;
    const cls = r ? 'n-reach' : (n.visited ? 'n-done' : 'n-off');
    const s = n.type === 'boss' ? 22 : 18, x = px(n), y = py(n);
    let art;
    if (n.type === 'fight' && n.foe && !n.visited) {
      // Show the enemy waiting there plus its element symbol.
      const is = s * 1.75, ss = 13;
      art = `<image href="${foeURL(n.foe.role, n.foe.el)}" x="${x - is / 2}" y="${y - is / 2 - 2}" width="${is}" height="${is}" style="image-rendering:pixelated" opacity="${op}"/>
        <rect x="${x + s - ss + 1}" y="${y + s - ss + 1}" width="${ss}" height="${ss}" fill="#0e0c18" stroke="#000" stroke-width="1.5"/>
        <image href="${symURL(n.foe.el)}" x="${x + s - ss + 2}" y="${y + s - ss + 2}" width="${ss - 2}" height="${ss - 2}" style="image-rendering:pixelated" opacity="${op}"/>`;
    } else if (n.type === 'boss' && isMoon(G.w)) {   // the Moon shows who's waiting on each tile
      const is = s * 2.4, bi = bossInfoOf(G.w, n);
      art = `<image href="${spriteURL(bi.spr, 4)}" x="${x - is / 2}" y="${y - is / 2}" width="${is}" height="${is}" opacity="${n.visited ? 0.35 : op}"/>`;
    } else if (n.type === 'boss') {
      const is = s * 1.6;
      art = `<image href="${spriteURL('i_skull', 4)}" x="${x - is / 2}" y="${y - is / 2}" width="${is}" height="${is}" style="image-rendering:pixelated" opacity="${op}"/>`;
    } else {
      const is = s * 1.3;
      art = `<image href="${spriteURL(ICONSPR[n.type], 4)}" x="${x - is / 2}" y="${y - is / 2}" width="${is}" height="${is}" style="image-rendering:pixelated" opacity="${op}"/>`;
    }
    nodes += `<g data-n="${n.f}-${n.c}" class="${r ? 'nclick' : ''}">
      <rect class="${cls}" x="${x - s}" y="${y - s}" width="${s * 2}" height="${s * 2}" ${cur ? 'stroke="#fff" stroke-width="4"' : ''}/>${art}</g>`;
  }));
  const nextLv = lvlOf(G.w, reach[0] ? reach[0].f : 0);
  app.innerHTML = `
    <h1>${worldTitle()}</h1>
    ${planetRule() ? `<div class="sub"><b style="color:var(--gold)">&#127756; Planet rule: ${planetRule().n}.</b> ${planetRule().d}${G.w === 7 ? ' <b>Two bosses wait at the end.</b>' : ''}</div>` : ''}${isMoon(G.w) ? `<div class="sub">The Elite 4 wait across the surface, back to back. Between fights you only get the usual patch-up. One rest at the Moon Base, then the Sun.</div>` : ''}<div class="sub"${isMoon(G.w) ? ' style="display:none"' : ''}>Tap a flashing node. Enemies ahead: about Lv${nextLv}. Level cap here: Lv${levelCap()}. Fight tiles show the enemy and its element. ${icon('elite')} elite · ${icon('recruit')} recruit · ${icon('camp')} camp · ${icon('treasure')} treasure · ${icon('train')} training · ${icon('mystery')} mystery · ${icon('item')} item · ${icon('dojo')} move training · ${icon('start')} start · ${REALM >= 1 && !isMoon(G.w) ? icon('fuse') + ' fusion shrine · ' : ''}${icon('ultra')} ultra · ${icon('boss')} boss</div>
    ${partyMini()}
    <div class="row"><button id="bagbtn">${icon('item')} BAG (${G.bag.length})</button><button id="savebtn">SAVE &amp; QUIT</button><button id="forfeitbtn" class="danger">FORFEIT</button></div>
    <div class="row maptog"><button id="mauto" class="tog ${G.auto ? 'on' : ''}">AUTO: ${G.auto ? 'ON' : 'OFF'}</button><button id="mquick" class="tog ${G.quick ? 'on' : ''}">QUICK: ${G.quick ? 'ON' : 'OFF'}</button></div>
    ${canRerollMap() ? '<div class="row"><button id="rerollmap">REROLL MAP</button></div>' : ''}
    <div class="tip">Tap a slime to see its stats and moves.</div>
    <svg viewBox="0 0 ${W} ${H}" class="map" style="background:linear-gradient(rgba(11,9,20,.38),rgba(11,9,20,.38)),url(${worldArt(REALM * 8 + G.w)}) center/cover;image-rendering:pixelated">${lines}${nodes}</svg>`;
  app.querySelectorAll('[data-pm]').forEach(c => c.onclick = () => showSlimeCard(+c.dataset.pm));
  document.getElementById('bagbtn').onclick = () => showBag(showMap);
  document.getElementById('mauto').onclick = () => { G.auto = !G.auto; SFX.play('buff'); showMap(); };
  document.getElementById('mquick').onclick = () => { G.quick = !G.quick; SFX.play('buff'); showMap(); };
  document.getElementById('savebtn').onclick = () => { SAVED = snapshotRun(); persist(); SFX.play('level'); renderPick(); };
  const rm = document.getElementById('rerollmap');
  if (rm) rm.onclick = () => { SFX.play('buff'); G.map = genMap(0); G.pos = null; showMap(); };
  document.getElementById('forfeitbtn').onclick = () => confirmBox('Forfeit this run? Boss rewards you already earned are kept, but the run is over.', 'FORFEIT', () => { G = null; party = []; renderPick(); });
  app.querySelectorAll('.nclick').forEach(g => g.onclick = () => {
    const [f, c] = g.dataset.n.split('-').map(Number);
    enterNode(G.map[f].find(n => n.c === c));
  });
}

/* very first tile of a run: pick how to begin */
function showStartChoice(n) {
  app.innerHTML = `
    <h1>THE ADVENTURE BEGINS</h1>
    ${img(unitURL(party[0]), 'mid bob')}
    <div class="sub" style="text-align:center">How does your slime start its journey?</div>
    <div class="row" style="margin-bottom:8px"><button class="offer" id="cfight">${img(spriteURL('i_fight', 4), 'tiny')}<span><b>Pick a fight</b><br><small>Battle a lone Lv1 enemy and level up.</small></span></button></div>
    <div class="row"><button class="offer" id="crecruit">${img(spriteURL('i_recruit', 4), 'tiny')}<span><b>Find a friend</b><br><small>Choose a teammate from ${RECRUIT_CHOICES} slimes.</small></span></button></div>`;
  document.getElementById('cfight').onclick = () => { n.type = 'fight'; n.foe = rollFoe(G.w); startFight(n); };
  document.getElementById('crecruit').onclick = () => { n.type = 'recruit'; showRecruit(); };
}

/* mystery tile: reveals a random event */
const MYSTERY_TEXT = {
  ambush:   ['AMBUSH!', 'It was a trap! Enemies jump out of the bushes.', 'FIGHT!'],
  treasure: ['HIDDEN STASH', 'Something shiny is half-buried here.', 'OPEN IT'],
  recruit:  ['LOST SLIMES', 'A few wandering slimes want to tag along.', 'MEET THEM'],
  train:    ['OLD DOJO', 'An abandoned training ground. One slime can train here.', 'TRAIN'],
  camp:     ['HOT SPRING', 'A warm spring. Everyone soaks and recovers.', 'REST'],
  trap:     ['SPIKE TRAP', 'Ouch! The whole party loses 15% HP.', 'KEEP GOING']
};
function showMystery(n) {
  const out = rollMystery(), [title, text, btn] = MYSTERY_TEXT[out];
  if (out === 'trap') party.forEach(p => { if (p.hp > 0) p.hp = Math.max(1, p.hp - Math.round(p.max * 0.15)); });
  SFX.play(out === 'trap' || out === 'ambush' ? 'status' : 'heal');
  app.innerHTML = `
    <h1>${title}</h1>
    ${img(spriteURL('i_mystery', 8), 'mid')}
    <div class="sub" style="text-align:center">${text}</div>
    ${out === 'trap' ? partyMini() : ''}
    <div class="row" style="margin-top:10px"><button class="primary" id="go">${btn}</button></div>`;
  document.getElementById('go').onclick = () => {
    if (out === 'ambush') { n.type = 'fight'; n.foe = rollFoe(G.w); return startFight(n); }
    if (out === 'trap') return showMap();
    n.type = out;                      // the tile now shows what it turned out to be
    enterNode(n);
  };
}

function enterNode(n) {
  G.pos = n; G.node = n; n.visited = true;
  if (n.type === 'camp') return showCamp();
  if (n.type === 'treasure') return showUpgrade('TREASURE!', showMap);
  if (n.type === 'recruit') return showRecruit();
  if (n.type === 'train') return showTrain();
  if (n.type === 'item') return showItemTile();
  if (n.type === 'dojo') return showDojo();
  if (n.type === 'fuse') return showFuse();
  if (n.type === 'ultra') return showUltra();
  if (n.type === 'mystery') return showMystery(n);
  if (n.type === 'choice') return showStartChoice(n);
  if (n.type === 'start') return showMap();
  startFight(n);
}

function showCamp() {
  campHeal(party);
  app.innerHTML = `
    <h1>CAMP</h1>
    ${img(spriteURL('i_camp', 8), 'mid')}
    <div class="sub" style="text-align:center">Your party rests by the fire. Everyone is fully healed, and fallen slimes wobble back up at full HP.</div>
    ${partyMini()}
    <div class="row" style="margin-top:12px"><button class="primary" id="go">BACK TO MAP</button></div>`;
  document.getElementById('go').onclick = showMap;
}

/* training: +3 levels to one slime, free */
function showTrain() {
  app.innerHTML = `
    <h1>TRAINING GROUNDS</h1>
    ${img(spriteURL('i_train', 8), 'mid')}
    <div class="sub" style="text-align:center">Pick a slime. It gains <b>+${TRAIN_LEVELS} levels</b>, free.</div>
    ${party.map((p, i) => `<div class="row" style="margin-bottom:6px"><button class="offer" data-t="${i}" ${p.lvl >= levelCap() ? 'disabled' : ''}>${img(unitURL(p), 'tiny')}<span>${p.name} · Lv${p.lvl} → Lv${Math.min(LVL_MAX, p.lvl + TRAIN_LEVELS)}<br><small>${p.lvl >= LVL_MAX ? 'already max level' : `${Math.max(0, p.hp)}/${p.max} HP`}</small></span></button></div>`).join('')}
    ${party.every(p => p.lvl >= levelCap()) ? `<div class="sub" style="text-align:center"><small>Everyone is at this world's level cap (Lv${levelCap()}). Beat the boss to raise it.</small></div>` : ''}
    <div class="row"><button id="tleave">LEAVE</button></div>`;
  document.getElementById('tleave').onclick = showMap;
  app.querySelectorAll('[data-t]').forEach(b => b.onclick = () => {
    const p = party[+b.dataset.t], from = p.lvl;
    G.learnQ = gainLevels(p, TRAIN_LEVELS).map(m => ({ u:p, m }));
    SFX.play('level');
    app.innerHTML = `<h1>TRAINED!</h1>${img(unitURL(p), 'mid bob')}
      <div class="sub" style="text-align:center"><b>${p.name}</b>: Lv${from} → <b>Lv${p.lvl}</b>${G.learnQ.length ? `<br>Wants to learn: ${G.learnQ.map(x => x.m.n).join(', ')}` : ''}</div>
      <div class="row"><button class="primary" id="go">${G.learnQ.length && !G.quick ? 'LEARN NEW MOVES' : 'BACK TO MAP'}</button></div>`;
    document.getElementById('go').onclick = () => processLearns(showMap);
  });
}

/* recruit */
// One optional reroll per recruit tile; the old offers are gone once you reroll.
function showRecruit(offers = recruitOffers(party), rerolled = false) {
  const full = party.length >= PARTY_MAX;
  app.innerHTML = `
    <h1>RECRUIT</h1>
    <div class="sub">Three slimes want to join your crew.${full ? ' Your party is full, so recruiting means replacing someone.' : ''}</div>
    ${offers.map((o, i) => `<div class="card fcard recruit">${o.el2 ? '' : starBadge(o.el, o.cls)}${img(unitURL(o), 'mid bob')}<div class="info">
      <div class="name">${o.name} · Lv${o.lvl} ${etags(o)}</div><div class="kind">${o.kind || ""}</div>${passiveLine(o)}
      ${statBars(o)}
      <details><summary>MOVES</summary><div class="faces small">${moveList(o)}</div></details>
      <div class="row"><button class="primary" data-r="${i}">RECRUIT</button></div></div></div>`).join('')}
    <div class="row" style="margin-top:8px">${rerolled ? '' : '<button id="reroll">REROLL (1x)</button>'}<button id="skip">SKIP</button></div>
    ${rerolled ? '<div class="sub"><small>Rerolled. No going back.</small></div>' : ''}`;
  app.querySelectorAll('[data-r]').forEach(b => b.onclick = () => {
    const o = offers[+b.dataset.r];
    if (!full) { party.push(o); return showMap(); }
    showReplace(o, () => showRecruit(offers, rerolled));
  });
  const rr = document.getElementById('reroll');
  if (rr) rr.onclick = () => { SFX.play('buff'); showRecruit(recruitOffers(party), true); };
  document.getElementById('skip').onclick = showMap;
}
/* fusion shrine: pick two slimes, preview, merge; then learn the other parent's moves one by one */
/* Ultra tile: one slime takes its Ultra form for the rest of the run. */
function showUltra() {
  const ok = party.filter(p => !p.ultra && p.hp > 0);
  if (!ok.length) { app.innerHTML = `<h1>ULTRA CRYSTAL</h1>${img(spriteURL('i_ultra', 8), 'mid')}<div class="sub" style="text-align:center">The crystal glows, but nobody here can take an Ultra form right now.</div><div class="row"><button class="primary" id="go">BACK TO MAP</button></div>`; return document.getElementById('go').onclick = showMap; }
  app.innerHTML = `<h1>ULTRA CRYSTAL</h1>${img(spriteURL('i_ultra', 8), 'mid bob')}
    <div class="sub" style="text-align:center">A crystal hums with raw power. One slime can take its <b>Ultra form</b> for the rest of this run: +25% stats, upgraded gear, an elemental aura and a unique Ultra perk.</div>
    ${ok.map(p => { const keys = ultraChoices(p); return `<div class="row" style="margin-bottom:6px"><button class="offer" data-u="${party.indexOf(p)}">${img(unitURL(p), 'tiny')}<span><b>${p.name}</b> · Lv${p.lvl} ${etags(p)}<br><small>${keys.map(k => `<span class="ultratag">${ULTRA_PERKS[k].n}</span>: ${ULTRA_PERKS[k].d}`).join('<br>or ')}</small></span></button></div>`; }).join('')}
    <div class="row"><button id="skip">LEAVE IT</button></div>`;
  app.querySelectorAll('[data-u]').forEach(b => b.onclick = () => { const p = party[+b.dataset.u], keys = ultraChoices(p); keys.length > 1 ? pickUltraPerk(p, keys) : doUltra(p, keys[0]); });
  document.getElementById('skip').onclick = showMap;
}
// Fused slimes choose which parent's Ultra perk they take.
function pickUltraPerk(p, keys) {
  app.innerHTML = `<h1>CHOOSE A POWER</h1>${img(unitURL(p), 'mid bob')}<div class="sub" style="text-align:center">${p.name} carries two bloodlines. Which Ultra perk awakens?</div>
    ${keys.map((k, i) => { const [e, c] = k.split('_'); return `<div class="row" style="margin-bottom:6px"><button class="offer" data-k="${i}"><span><span class="ultratag">${ULTRA_PERKS[k].n}</span> <small>(${ELEM[e].name} ${CLASSES[c].name})</small><br><small>${ULTRA_PERKS[k].d}</small></span></button></div>`; }).join('')}
    <div class="row"><button id="back">BACK</button></div>`;
  app.querySelectorAll('[data-k]').forEach(b => b.onclick = () => doUltra(p, keys[+b.dataset.k]));
  document.getElementById('back').onclick = showUltra;
}
function doUltra(p, key) {
  const before = unitURL(p); makeUltra(p, key); SFX.play('level');
  const P = ULTRA_PERKS[key];
  app.innerHTML = `<h1>ULTRA FORM!</h1>
    <div class="row" style="justify-content:center;align-items:center;gap:6px">${img(before, 'big')}<span style="font-size:22px;color:var(--gold)">&#10148;</span>${img(unitURL(p), 'big bob ultraglow', `--uc:${ELEM[p.el].c}`)}</div>
    <div class="sub" style="text-align:center"><b>${p.name}</b> awakens! All stats +25%.</div>
    <div class="faces"><span class="ultratag">&#9733; ${P.n}</span><br>${P.d}</div>${partyMini()}
    <div class="row"><button class="primary" id="go">ONWARD</button></div>`;
  document.getElementById('go').onclick = showMap;
}
function showFuse() {
  const leave = () => showMap();
  if (party.length + (G.essence ? 1 : 0) < 2) { app.innerHTML = '<h1>FUSION SHRINE</h1><div class="sub">The shrine hums, but it needs two slimes (party or pocket essence).</div><div class="row"><button id="fx">LEAVE</button></div>'; return document.getElementById('fx').onclick = leave; }
  let sel = [];
  const unitOf = k => k === 'E' ? G.essence : party[k];
  const ok = () => sel.length === 2 && sel.some(k => k !== 'E') && unitOf(sel[0]).el !== unitOf(sel[1]).el;
  const pick2 = () => {
    app.innerHTML = `<h1>FUSION SHRINE</h1><div class="sub">Pick two slimes with different elements. They become one multiclass slime: both elements, both classes, averaged stats. One parent (at random) gives its moves; then you can learn the other parent's moves one by one.</div>
      ${party.map((p, i) => `<div class="row" style="margin-bottom:8px"><button class="offer" data-p="${i}" ${p.el2 ? 'disabled' : ''} style="${sel.includes(i) ? 'outline:3px solid #f9c74f' : ''}">${img(unitURL(p), 'tiny')}<span>${p.name} · Lv${p.lvl} ${etags(p)}<br><small>${CLASSES[p.cls].name}${p.el2 ? ' · already fused' : ''}</small></span></button></div>`).join('')}
      ${G.essence ? `<div class="row" style="margin-bottom:8px"><button class="offer" data-p="E" style="${sel.includes('E') ? 'outline:3px solid #f9c74f' : ''}">${img(unitURL(G.essence), 'tiny essence')}<span>Essence of ${G.essence.name} · Lv${G.essence.lvl} ${etags(G.essence)}<br><small>${CLASSES[G.essence.cls].name} · from your pocket (doesn't cost a party slot)</small></span></button></div>` : ''}
      ${sel.length === 2 && !ok() ? '<div class="sub"><small>They need different elements.</small></div>' : ''}
      <div class="row"><button class="primary" id="fnext" ${ok() ? '' : 'disabled'}>NEXT</button><button id="fx">LEAVE</button></div>`;
    app.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { const i = b.dataset.p === 'E' ? 'E' : +b.dataset.p; sel = sel.includes(i) ? sel.filter(x => x !== i) : [...sel, i].slice(-2); pick2(); });
    document.getElementById('fx').onclick = leave;
    document.getElementById('fnext').onclick = () => preview(null, false);
  };
  const preview = (pv, rerolled) => {
    const a = unitOf(sel[0]), b = unitOf(sel[1]); pv = pv || fuseSlimes(a, b);
    const from = pv.parents[0][1] === a.cls && pv.parents[0][0] === a.el ? a : b;
    app.innerHTML = `<h1>FUSE!</h1><div class="sub">${a.name} + ${b.name}</div>
      <div class="card fcard recruit"><div class="dicewrap">${img(unitURL(pv), 'mid bob')}<button class="dice" id="lookdice" title="Reroll look">&#127922;</button></div><div class="info"><div class="name">${pv.name} · Lv${pv.lvl} ${etags(pv)}</div><div class="kind">${pv.kind}</div>${passiveLine(pv)}${statBars(pv)}
      <details open><summary>MOVES (from ${from.name})</summary><div class="faces small">${moveList(pv)}</div></details>
      ${pv.pending.length ? `<div class="sub"><small>Then it can learn: ${pv.pending.map(m => m.n).join(', ')}</small></div>` : ''}</div></div>
      <div class="row" style="margin-top:8px"><button class="primary" id="fgo">FUSE</button>${rerolled ? '' : '<button id="frr">REROLL MOVES (1x)</button>'}<button id="fback">BACK</button></div>`;
    document.getElementById('fback').onclick = pick2;
    document.getElementById('lookdice').onclick = () => { rerollLook(pv); SFX.play('buff'); preview(pv, rerolled); };
    const rr = document.getElementById('frr'); if (rr) rr.onclick = () => { SFX.play('buff'); preview(null, true); };
    document.getElementById('fgo').onclick = () => {
      SFX.play('buff');
      if (sel.includes('E')) { party[sel.find(k => k !== 'E')] = pv; G.essence = null; }
      else { const lo = Math.min(...sel), hi = Math.max(...sel); party[lo] = pv; party.splice(hi, 1); }
      G.learnQ = pv.pending.map(m => ({ u:pv, m })); delete pv.pending; processLearns(showMap);
    };
  };
  pick2();
}
function showReplace(o, back = showMap) {
  // In Realm 2 the pocket is an extra option: the recruit (or a party member) can become essence instead of leaving.
  const pk = pocketOn(), held = G.essence;
  const toPocket = (u, then) => { const go = () => { resetStatus(u); u.hp = u.max; u.sta = u.staMax; if (u.item) { G.bag.push(u.item); u.item = null; } G.essence = u; SFX.play('buff'); then(); };
    held ? confirmBox(`The pocket already holds the essence of ${held.name}. Replace it with ${u.name}? The old essence is gone for good.`, 'REPLACE', go) : go(); };
  app.innerHTML = `
    <h1>REPLACE WHO?</h1>
    <div class="sub">${o.name} the ${o.kind || 'slime'} (Lv${o.lvl}) joins. Pick a slime to leave the party${pk ? ', or send one to the pocket as essence' : ''}.</div>
    ${party.map((p, i) => `<div class="row" style="margin-bottom:8px;gap:6px"><button class="offer" data-x="${i}" style="flex:1">${img(unitURL(p), 'tiny')}<span>${p.name} · Lv${p.lvl}<br><small>${Math.max(0,p.hp)}/${p.max} HP</small></span></button>${pk && !p.el2 ? `<button data-xp="${i}" style="flex:none">TO<br>POCKET</button>` : ''}</div>`).join('')}
    ${pk && !o.el2 ? `<div class="row" style="margin-bottom:8px"><button data-op="1">PUT ${o.name.toUpperCase()} IN THE POCKET INSTEAD</button></div>` : ''}
    ${pk && held ? `<div class="sub"><small>Pocket now: essence of ${held.name} (${ELEM[held.el].name} ${CLASSES[held.cls].name}). Storing another replaces it.</small></div>` : ''}
    <div class="row"><button id="skip">NEVER MIND</button></div>`;
  app.querySelectorAll('[data-x]').forEach(b => b.onclick = () => { party[+b.dataset.x] = o; showMap(); });
  app.querySelectorAll('[data-xp]').forEach(b => b.onclick = () => { const i = +b.dataset.xp; toPocket(party[i], () => { party[i] = o; showMap(); }); });
  const op = app.querySelector('[data-op]'); if (op) op.onclick = () => toPocket(o, showMap);
  document.getElementById('skip').onclick = back;
}

/* treasure */
function showUpgrade(title, then) {
  const pool = upgradePool(party);
  app.innerHTML = `
    <h1>${title}</h1>
    ${img(spriteURL('i_chest', 8), 'mid')}
    <div class="sub" style="text-align:center">Pick one. Stat boosts are permanent and grow with level.</div>
    ${pool.map((o, i) => `<div class="row" style="margin-bottom:8px"><button data-o="${i}" class="offer">${img(unitURL(o.who), 'tiny')}<span>${o.t}<br><small>for ${o.who.name} (Lv${o.who.lvl})</small></span></button></div>`).join('')}
    <div class="row"><button id="skip">SKIP</button></div>`;
  app.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { pool[+b.dataset.o].f(); then(); });
  document.getElementById('skip').onclick = then;
}

/* move training tile: level up one move for free */
function showDojo() {
  const pick = () => {
    app.innerHTML = `<h1>TRAINING DUMMY</h1>${img(spriteURL('i_dummy', 8), 'mid')}
      <div class="sub" style="text-align:center">A battered dummy stands ready. One slime can practice one move and level it up (more power or a stronger effect).</div>
      ${party.map((p, i) => `<div class="row" style="margin-bottom:6px"><button class="offer" data-ps="${i}">${img(unitURL(p), 'tiny')}<span>${p.name} · Lv${p.lvl}<br><small>${p.moves.map(m => m.n).join(', ')}</small></span></button></div>`).join('')}
      <div class="row"><button id="skip">SKIP</button></div>`;
    app.querySelectorAll('[data-ps]').forEach(b => b.onclick = () => moves(party[+b.dataset.ps]));
    document.getElementById('skip').onclick = showMap;
  };
  const moves = p => {
    app.innerHTML = `<h1>TRAINING DUMMY</h1><div class="sub">Which of ${p.name}'s moves gets leveled up?</div>
      ${p.moves.map((m, j) => `<div class="row" style="margin-bottom:6px"><button class="offer" data-mv="${j}" style="border-left:6px solid ${ELEM[m.el].c}"><span>${moveLine(m)}</span></button></div>`).join('')}
      <div class="row"><button id="back">BACK</button></div>`;
    app.querySelectorAll('[data-mv]').forEach(b => b.onclick = () => {
      const m = p.moves[+b.dataset.mv], what = boostMove(m); SFX.play('level');
      app.innerHTML = `<h1>MOVE LEVELED UP!</h1>${img(unitURL(p), 'mid bob')}<div class="sub" style="text-align:center">${m.n}: ${what}</div><div class="card fcard"><div class="faces small">${moveLine(m)}</div></div>
        <div class="row"><button class="primary" id="go">CONTINUE</button></div>`;
      document.getElementById('go').onclick = showMap;
    });
    document.getElementById('back').onclick = pick;
  };
  pick();
}

/* ================= items ================= */
function showItemTile() {
  const offers = itemOffers();
  app.innerHTML = `
    <h1>ITEM FOUND!</h1>
    ${img(spriteURL('i_item', 8), 'mid')}
    <div class="sub" style="text-align:center">Pick one to put in your bag.</div>
    ${offers.map((k, i) => `<div class="row" style="margin-bottom:8px"><button class="offer" data-it="${i}">${itemIcon(k, 'spr tiny')}<span><b>${ITEMS[k].n}</b> <small>(${ITEMS[k].kind === 'use' ? 'use on map' : 'held'})</small><br><small>${ITEMS[k].desc}</small></span></button></div>`).join('')}
    <div class="row"><button id="skip">SKIP</button></div>`;
  app.querySelectorAll('[data-it]').forEach(b => b.onclick = () => { G.bag.push(offers[+b.dataset.it]); SFX.play('buff'); showBag(showMap); });
  document.getElementById('skip').onclick = showMap;
}
// Bag: held items can be equipped, unequipped and swapped freely; consumables are used here (never in battle).
// The pocket (one slime essence) only matters where Fusion Shrines exist: Realm 2.
const pocketOn = () => REALM >= 1 || !!(G && G.essence);
function showBag(back) {
  app.innerHTML = `
    <h1>BAG</h1>
    <div class="sub">Each slime can hold one item. Consumables are used from here, not in battle.</div>
    ${party.map((p, i) => `<div class="card fcard"><div class="row" style="justify-content:flex-start;gap:8px">${img(unitURL(p), 'tiny')}
      <span style="flex:1"><b>${p.name}</b> · Lv${p.lvl}<br><small>${p.item ? `${itemIcon(p.item)} ${ITEMS[p.item].n}` : 'no item'}</small></span>
      ${p.item ? `<button data-un="${i}">UNEQUIP</button>` : ''}${pocketOn() && !G.essence && !p.el2 && party.length > 1 ? `<button data-ess="${i}" style="flex:none">TO ESSENCE</button>` : ''}</div></div>`).join('')}
    ${pocketOn() ? `<h1 style="font-size:11px;margin-top:10px">POCKET</h1>
    ${G.essence ? `<div class="card fcard"><div class="row" style="justify-content:flex-start;gap:8px">${img(unitURL(G.essence), 'tiny essence')}
      <span style="flex:1"><b>Essence of ${G.essence.name}</b> · Lv${G.essence.lvl} ${etags(G.essence)}<br><small>${ELEM[G.essence.el].name} ${CLASSES[G.essence.cls].name}. Can be fused at a Fusion Shrine; it can't rejoin the party.</small></span>
      <button data-rel="1" style="flex:none">RELEASE</button></div></div>` : '<div class="sub"><small>Empty. Turn an unfused slime into essence: it leaves the party for good, but its element, class, stats and moves can still be fused at a Fusion Shrine.</small></div>'}` : ''}
    <h1 style="font-size:11px;margin-top:10px">IN THE BAG</h1>
    ${G.bag.length ? G.bag.map((k, i) => `<div class="card fcard"><div class="row" style="justify-content:flex-start;gap:8px">${itemIcon(k, 'spr tiny')}
      <span style="flex:1"><b>${ITEMS[k].n}</b><br><small>${ITEMS[k].desc}</small></span>
      <button class="primary" data-b="${i}">${ITEMS[k].kind === 'use' ? 'USE' : 'EQUIP'}</button></div></div>`).join('') : '<div class="sub">Empty. Find items on item tiles.</div>'}
    <div class="row"><button class="primary" id="done">DONE</button></div>`;
  app.querySelectorAll('[data-un]').forEach(b => b.onclick = () => { const p = party[+b.dataset.un]; G.bag.push(p.item); p.item = null; showBag(back); });
  app.querySelectorAll('[data-ess]').forEach(b => b.onclick = () => { const i = +b.dataset.ess, p = party[i];
    confirmBox(`Turn ${p.name} into essence? It leaves the party for good, but can be fused at a Fusion Shrine.${p.item ? ' Its item goes back in the bag.' : ''}`, 'TO ESSENCE', () => {
      if (p.item) { G.bag.push(p.item); p.item = null; }
      resetStatus(p); p.hp = p.max; p.sta = p.staMax; G.essence = p; party.splice(i, 1); SFX.play('buff'); showBag(back); }); });
  app.querySelectorAll('[data-rel]').forEach(b => b.onclick = () => confirmBox(`Release the essence of ${G.essence.name}? It's gone for good.`, 'RELEASE', () => { G.essence = null; showBag(back); }));
  app.querySelectorAll('[data-b]').forEach(b => b.onclick = () => useBagItem(+b.dataset.b, back));
  document.getElementById('done').onclick = back;
}
function pickSlime(title, text, ok, then, cancel) {
  app.innerHTML = `<h1>${title}</h1><div class="sub">${text}</div>
    ${party.map((p, i) => `<div class="row" style="margin-bottom:6px"><button class="offer" data-ps="${i}" ${ok(p) ? '' : 'disabled'}>${img(unitURL(p), 'tiny')}<span>${p.name} · Lv${p.lvl}<br><small>${Math.max(0, p.hp)}/${p.max} HP${p.item ? ` · holds ${ITEMS[p.item].n}` : ''}</small></span></button></div>`).join('')}
    <div class="row"><button id="cancel">CANCEL</button></div>`;
  app.querySelectorAll('[data-ps]').forEach(b => b.onclick = () => then(party[+b.dataset.ps]));
  document.getElementById('cancel').onclick = cancel;
}
function useBagItem(i, back) {
  const k = G.bag[i], it = ITEMS[k], again = () => showBag(back);
  const consume = () => G.bag.splice(i, 1);
  const levelUp = (p, n, extra) => {
    const from = p.lvl; consume(); extra && extra(p);
    G.learnQ = gainLevels(p, n).map(m => ({ u:p, m })); SFX.play('level');
    app.innerHTML = `<h1>${it.n.toUpperCase()}!</h1>${img(unitURL(p), 'mid bob')}
      <div class="sub" style="text-align:center"><b>${p.name}</b>: Lv${from} → <b>Lv${p.lvl}</b>${G.learnQ.length ? `<br>Wants to learn: ${G.learnQ.map(x => x.m.n).join(', ')}` : ''}</div>
      <div class="row"><button class="primary" id="go">${G.learnQ.length && !G.quick ? 'LEARN NEW MOVES' : 'BACK TO BAG'}</button></div>`;
    document.getElementById('go').onclick = () => processLearns(again);
  };
  if (it.kind === 'hold') return pickSlime('EQUIP', `Who holds the <b>${it.n}</b>? Their current item goes back in the bag.`, () => true, p => {
    consume(); if (p.item) G.bag.push(p.item); p.item = k; SFX.play('buff'); again();
  }, again);
  if (k === 'potion') return pickSlime('LEVEL POTION', 'Who drinks it? (+2 levels)', p => p.lvl < levelCap(), p => levelUp(p, 2), again);
  if (k === 'revive') return pickSlime('REVIVE', 'Who gets it? Full HP and +1 level.', p => p.hp < p.max || p.lvl < levelCap(), p => levelUp(p, 1, q => { q.hp = q.max; }), again);
  if (k === 'booster') return pickSlime('MOVE BOOSTER', 'Whose move gets upgraded?', () => true, p => {
    app.innerHTML = `<h1>MOVE BOOSTER</h1><div class="sub">Pick ${p.name}'s move to upgrade.</div>
      ${p.moves.map((m, j) => `<div class="row" style="margin-bottom:6px"><button class="offer" data-mv="${j}"><span>${moveLine(m)}</span></button></div>`).join('')}
      <div class="row"><button id="cancel">CANCEL</button></div>`;
    app.querySelectorAll('[data-mv]').forEach(b => b.onclick = () => { consume(); boostMove(p.moves[+b.dataset.mv]); SFX.play('level'); again(); });
    document.getElementById('cancel').onclick = again;
  }, again);
}

/* learning moves */
function processLearns(then) {
  if (G.quick) { G.learnQ.splice(0).forEach(({ u, m }) => smartLearn(u, m)); return then(); }
  const next = G.learnQ.shift();
  if (!next) return then();
  const { u, m } = next;
  if (u.moves.length < 4) { u.moves.push(m); u.learned.push(m.n); return showLearned(u, m, null, () => processLearns(then)); }
  app.innerHTML = `
    <h1>NEW MOVE!</h1>
    ${img(unitURL(u), 'mid bob')}
    <div class="sub" style="text-align:center"><b>${u.name}</b> (Lv${u.lvl}) wants to learn:</div>
    <div class="faces newmove" style="border-left:6px solid ${ELEM[m.el].c}">${moveLine(m)}</div>
    <div class="sub" style="text-align:center">It already knows 4 moves. Forget one? (The basic hit is always kept.)</div>
    ${u.moves.map((x, i) => `<div class="row" style="margin-bottom:6px"><button class="offer forget" data-f="${i}" style="border-left:6px solid ${ELEM[x.el].c}"><span>${mtype(x)}<b>Forget ${x.n}</b> ${etag(x.el)}<br><small>${x.tag} · ${x.s} STA · ${mdesc(x)}</small></span></button></div>`).join('')}
    <div class="row"><button id="keep">DON'T LEARN ${m.n.toUpperCase()}</button></div>`;
  app.querySelectorAll('[data-f]').forEach(b => b.onclick = () => {
    const old = u.moves[+b.dataset.f]; u.moves[+b.dataset.f] = m; u.learned.push(m.n);
    showLearned(u, m, old, () => processLearns(then));
  });
  document.getElementById('keep').onclick = () => { u.learned.push(m.n); processLearns(then); };
}
function showLearned(u, m, old, then) {
  SFX.play('level');
  app.innerHTML = `
    <h1>MOVE LEARNED</h1>
    ${img(unitURL(u), 'mid bob')}
    <div class="sub" style="text-align:center">${old ? `${u.name} forgot <b>${old.n}</b> and` : u.name} learned <b>${m.n}</b>!</div>
    <div class="faces">${moveLine(m)}</div>
    <div class="row"><button class="primary" id="go">OK</button></div>`;
  document.getElementById('go').onclick = then;
}

/* ================= battle ================= */
function startFight(node) {
  LV_WORLD = G.w;   // planet rules and level caps follow the world this fight is in
  MUSIC.play(node.type === 'boss' ? 'boss' : 'battle', node.type === 'elite' ? 2 : 0);
  party.forEach(p => { const hp = p.hp; resetStatus(p); p.hp = hp; });
  B = { downed:new Set(), foes:makeFoes(G.w, node, party.length), queue:[], qi:0, cur:null, sel:null, pending:null, busy:false, over:null, log:[], round:0, gains:[] };
  battleStart(party, B.foes, node);
  if (node.type === 'boss') {
    const bi = bossInfoOf(G.w, node);
    B.log.push(bi.intro);
    return showBossIntro(bi, () => openBattle(`${bi.name} blocks the way!`));
  }
  const line = `${B.foes.map(e => `Lv${e.lvl} ${e.name}`).join(', ')} ${B.foes.length > 1 ? 'appear' : 'appears'}!`;
  B.log.push(line);
  openBattle(line);
}
async function openBattle(line) {
  const b0 = B; B.busy = true; setDlg([line]); renderBattle();
  await dlgWait(Math.max(G.quick ? 600 : 0, dlgTime(line)));
  if (B !== b0) return;
  B.busy = false; startRound();
}

/* ---- Pokemon-style dialogue box: while actions play out, the move panel becomes a text box that types out what happened.
   Tap it to finish the text or skip ahead. ---- */
const TW = { key:null, i:0, timer:null };
const dlgCps = () => isFast() ? 130 : 60;   // characters per second
function setDlg(lines) { B.dlg = lines.filter(Boolean).map(l => String(l).replace(/<[^>]+>/g, '')); B.dlgId = (B.dlgId || 0) + 1; }
const dlgText = () => (B.dlg || []).join('\n');
// How long an action's text stays up: typing time plus a moment to read it.
const dlgTime = t => G && G.quick ? 0 : Math.min(3600, 650 + (t || '').length / 60 * 1000);
function dlgWait(ms) {
  return new Promise(res => {
    const done = () => { clearTimeout(t); if (B && B.skip === done) B.skip = null; res(); };
    const t = setTimeout(done, ms / (G && G.quick ? 4.4 : G && G.fast ? 1.4 : 1));
    if (B) B.skip = done;
  });
}
// Type the current dialogue into an element; survives re-renders (keeps its place).
function typeInto(el, key, full, onDone) {
  clearInterval(TW.timer);
  if (TW.key !== key) { TW.key = key; TW.i = 0; }
  const step = () => { el.textContent = full.slice(0, TW.i); if (TW.i >= full.length) { clearInterval(TW.timer); el.parentNode.classList.add('done'); if (onDone) onDone(); } };
  step();
  if (TW.i < full.length) TW.timer = setInterval(() => { TW.i = Math.min(full.length, TW.i + 2); step(); }, 2000 / dlgCps());
}
const dlgDone = full => TW.i >= full.length;
function dlgTap(full) {
  if (!dlgDone(full)) { TW.i = full.length; const el = app.querySelector('.dlgt'); if (el) { el.textContent = full; el.parentNode.classList.add('done'); } clearInterval(TW.timer); return; }
  if (B && B.skip) B.skip();
}
// Split long boss speeches into pages of about two sentences.
function dlgPages(text) {
  const sents = text.match(/[^.!?]+[.!?]+["']?\s*|[^.!?]+$/g) || [text], pages = [];
  let cur = '';
  sents.forEach(x => { if (cur && (cur + x).length > 150) { pages.push(cur.trim()); cur = ''; } cur += x; });
  if (cur.trim()) pages.push(cur.trim());
  return pages;
}
// Pre-boss cutscene: big art, the speech typed out page by page; only CONTINUE moves on.
function showBossIntro(bi, then) {
  const pages = dlgPages(bi.intro); let p = 0;
  const draw = () => {
    const full = pages[p], key = 'boss:' + bi.name + ':' + p, last = p === pages.length - 1;
    app.innerHTML = `<div class="cut"><div class="cutname">${bi.name.toUpperCase()}</div>${img(spriteURL(bi.spr, 4), 'bossbig cutart')}
      <div class="dlg big" id="cutdlg"><div class="dlgt"></div><span class="dlgarrow">&#9660;</span></div>
      <div class="row"><button class="primary" id="cutgo">${last ? 'FIGHT!' : 'CONTINUE'}</button></div></div>`;
    typeInto(app.querySelector('.dlgt'), key, full);
    const go = () => { if (!dlgDone(full)) return dlgTap(full); SFX.play('buff'); if (last) then(); else { p++; draw(); } };
    document.getElementById('cutgo').onclick = go; document.getElementById('cutdlg').onclick = go;
  };
  draw();
}
// Turn order: every living unit, fastest first (ties go to your slimes).
// After any action, re-sort who's left this round so slows and hastes take effect right away.
function bumpOrder() {
  const slowed = reorderRest(B.queue, B.qi);
  slowed.filter(u => u.hp > 0).forEach(u => B.log.push(`${u.name} is slowed and falls back in the turn order!`));
}
function turnOrder() {
  return roundOrder([...alive(party), ...alive(B.foes)]);
}
function startRound() {
  B.round++;
  B.queue = turnOrder(); B.qi = 0; B.pending = null; B.sel = null;
  advance();
}
// Extra wait so multi-hit moves can finish showing every hit.
const fxExtra = () => FX && FX.length ? Math.max(0, ...FX.map(e => e.delay || 0)) : 0;
async function advance() {
  const b0 = B;   // stop if a different fight has started meanwhile
  B.busy = true;
  while (B.qi < B.queue.length) {
    const u = B.queue[B.qi];
    if (u.hp <= 0) { B.qi++; continue; }
    if (u.side === 'P') {
      if (u.stun) { const L0 = B.log.length; act(u, REST, null, party, B.foes, B.log); setDlg(B.log.slice(L0)); B.qi++; renderBattle(); await dlgWait(dlgTime(dlgText())); if (B !== b0) return; continue; }
      if (!isAuto()) { B.sel = u; B.busy = false; renderBattle(); return; } // wait for the player
    }
    B.sel = null;
    const mine = u.side === 'P', al = mine ? party : B.foes, fo = mine ? B.foes : party;
    const pl = planFor(u, al, fo, B.round, mine ? 0.05 : 0.12);
    const L0 = B.log.length;
    act(u, pl.m, pl.target, al, fo, B.log);
    setDlg(B.log.slice(L0));
    const ex = fxExtra();
    B.qi++; bumpOrder(); B.cur = u; renderBattle(); B.cur = null;
    await dlgWait(Math.max(950 + ex, dlgTime(dlgText())));
    if (B !== b0) return;
    if (battleOver(party, B.foes, B.log)) return finishCheck();
  }
  const L1 = B.log.length;
  [...party, ...B.foes].forEach(u => endRound(u, B.log));
  if (FX.length || B.log.length > L1) { const extra = FX.length ? Math.max(0, ...FX.map(e => e.delay || 0)) : 0; setDlg(B.log.slice(L1)); renderBattle(); await dlgWait(Math.max(700 + extra, B.dlg.length ? dlgTime(dlgText()) : 0)); if (B !== b0) return; }
  if (finishCheck()) return;
  B.busy = false;
  startRound();
}
function finishCheck() {
  const res = battleOver(party, B.foes, B.log);
  if (!res) return false;
  B.busy = false; B.sel = null;
  MUSIC.stop();
  if (res === 'win') { SFX.play('win'); winFight(); }
  else { B.over = 'lose'; B.log.push('Your whole party splats...'); SFX.play('lose'); renderBattle(); }
  return true;
}

function pickMove(i) {
  const u = B.sel; if (!u || B.busy) return;
  const m = i === 'rest' ? REST : i === 'basic' ? u.basic : u.moves[i];
  if (m.s > u.sta) return;
  if (m.t === 'fallen' && !party.some(p => p.hp <= 0)) return;
  const needFoe = m.t === 'foe' && alive(B.foes).length > 1;
  const needAlly = m.t === 'ally' && alive(party).length > 1;
  const needFallen = m.t === 'fallen' && party.filter(p => p.hp <= 0).length > 1;
  if (needFoe || needAlly || needFallen) { B.pending = m; return renderBattle(); }
  doTurn(u, m, m.t === 'foe' ? alive(B.foes)[0] : m.t === 'ally' ? u : m.t === 'fallen' ? party.find(p => p.hp <= 0) : null);
}
async function doTurn(u, m, target) {
  const b0 = B; B.pending = null; B.sel = null; B.busy = true;
  const L0 = B.log.length;
  act(u, m, target, party, B.foes, B.log);
  setDlg(B.log.slice(L0));
  const ex = fxExtra();
  B.qi++; bumpOrder(); B.cur = u; renderBattle(); B.cur = null;
  await dlgWait(Math.max(900 + ex, dlgTime(dlgText())));
  if (B !== b0) return;
  if (battleOver(party, B.foes, B.log)) return finishCheck();
  advance();
}
function tapUnit(side, i) {
  const u = side === 'E' ? B.foes[i] : party[i];
  if (!u) return;
  // Not picking a target (or tapped someone who isn't a valid target): show their info instead.
  const t0 = B.pending && B.pending.t;
  const valid = !B.busy && !B.over && B.pending && ((t0 === 'foe' && side === 'E' && u.hp > 0) || (t0 === 'ally' && side === 'P' && u.hp > 0) || (t0 === 'fallen' && side === 'P' && u.hp <= 0));
  if (!valid) return showUnitInfo(u);
  const t = B.pending.t;
  if (t === 'fallen') { if (side === 'P' && u.hp <= 0) doTurn(B.sel, B.pending, u); return; }
  if (u.hp <= 0) return;
  if (t === 'foe' && side === 'E') return doTurn(B.sel, B.pending, u);
  if (t === 'ally' && side === 'P') return doTurn(B.sel, B.pending, u);
}

function winFight() {
  noteDowned();
  const t = G.node.type, fl = Math.max(...B.foes.map(e => e.lvl));
  B.over = 'win';
  if (t === 'boss') G.award = eliteNode(G.node) || r4Dwarf(G.node) ? null : awardBoss(G.w, party);
  G.learnQ = [];
  B.gains = party.map(p => {
    const g = fightRewards(p, fl, t, B.downed.has(p));
    g.learns.forEach(m => G.learnQ.push({ u:p, m }));
    return g;
  });
  B.log.push('Victory! ' + B.gains.map(g => `${g.p.name} Lv${g.from}→${g.to}${g.downed ? ' (downed: half levels, revived at 35%)' : ''}`).join(', ') + '.');
  setTimeout(() => SFX.play('level'), 900);
  renderBattle();
}
const eliteNode = n => !!n && n.gi != null && n.gi < MOON_ELITE.length && isMoon(G.w);
const r4Dwarf = n => REALM === 3 && G.w === 7 && !!n && n.gi === 0;   // Neptune: Mother Earth comes next
function afterFight() {
  const t = G.node.type;
  processLearns(() => {
    if (t === 'elite') return showUpgrade('ELITE TREASURE!', showMap);
    if (t === 'boss' && r4Dwarf(G.node)) return showUpgrade('THE DWARF PLANET FALLS!', () => { const n = { ...G.node, gi:1 }; G.node = n; startFight(n); });
    if (t === 'boss' && eliteNode(G.node)) return showUpgrade(`${bossInfoOf(G.w, G.node).name.toUpperCase()} DOWN!`, showMap);   // the Moon: straight on to the next one
    if (t === 'boss') return showUpgrade("HERO'S LOOT!", showWorldClear);
    showMap();
  });
}

function awardHTML() {
  const a = G.award; if (!a) return '';
  const lines = [];
  if (a.realm) lines.push(`<b>REALM ${a.realm} CLEARED!</b> Star ${starsUnlocked()} is unlocked: every slime can now hold ${starCap()} boost points.${a.realm === 1 ? ' <b>Realm 2: Genre Hop is now open, and Light, Dark and Psychic slimes can start runs!</b>' : ''}${a.realm === 2 ? ' <b>Fusion unlocked!</b> On the starter screen you can now fuse two slimes into a fused starter. <b>Realm 3: World Domination is now open!</b>' : ''}${a.realm === 3 ? ' <b>The slimes rule the Earth, the Moon and the Sun. Realm 4: Lights Out is now open!</b>' : ''}${a.realm === 4 ? ' <b>The slimes rule the whole solar system.</b>' : ''}`);
  if (a.shared) lines.push(`+${a.shared} shared star point (first time beating this boss)`);
  a.combos.forEach(c => lines.push(`${c.name}: +${c.pts} star points (${c.label})`));
  return lines.length ? `<div class="award">${lines.map(l => `<div>${l}</div>`).join('')}<small>Spend star points on the starter screen at the start of a run.</small></div>` : '';
}
function showWorldClear() {
  if (G.w >= WORLDS.length - 1) {
    app.innerHTML = `<h1>REALM ${REALM + 1} CLEARED!</h1>${img(unitURL(party[0]), 'big bob')}
      <div class="sub" style="text-align:center">${REALM === 3 ? R4_FINALE.outro : BOSS_INFO[BOSS_INFO.length - 1].outro} ${REALM >= 2 ? '' : REALM ? 'Every genre has been hopped. The slimes have won.' : 'From level 1 punching bags to legends of the God\'s Planes. The slimes have won.'}</div>${awardHTML()}${partyMini()}
      <div class="row" style="margin-top:12px"><button class="primary" id="go">NEW RUN</button></div>`;
    return document.getElementById('go').onclick = renderPick;
  }
  const next = WORLDS[G.w + 1].name, moon = isMoon(G.w + 1);
  app.innerHTML = `<h1>${WORLDS[G.w].name.toUpperCase()} CLEARED!</h1>${img(spriteURL(BOSS_INFO[G.w].spr, 4), 'bossbig')}
    <div class="sub" style="text-align:center">${BOSS_INFO[G.w].outro} ${moon ? 'Your party is fully healed for the trip to the Moon. Up there: the Elite 4, back to back, then one rest at the Moon Base before the Sun itself.' : `Your party patches up (50% heal, fallen slimes revive) and heads for the ${next}.`}</div>${awardHTML()}${partyMini()}
    <div class="row" style="margin-top:12px"><button class="primary" id="go">ENTER THE ${next.toUpperCase()}</button></div>`;
  document.getElementById('go').onclick = () => { if (moon) campHeal(party); else campHeal(party, 0.5, 0.5); G.w++; G.map = genMap(G.w); G.ultraSeen = ensureUltra(G.map, G.w, G.ultraSeen) || G.ultraSeen; G.pos = G.map[0][0]; G.pos.visited = true; G.node = null; showMap(); };
}

function statusTags(x) {
  const t = [];
  if (x.shield) t.push(['SH ' + x.shield, '#4cc9f0']);
  if (x.burn) t.push([x.burnP ? 'BURN+' : 'BURN', '#f94144']);
  if (x.poison) t.push([x.poisonP ? 'PSN+' : 'PSN', '#9b5de5']);
  if (x.stun) t.push([x.stun > 1 ? 'STUN x2' : 'STUN', '#f9c74f']);
  if (x.dazed && !x.stun) t.push(['DAZED', '#b8a04a']);
  if (x.regen && x.regen.length) { const rp = x.regen.reduce((s, r) => s + r[0], 0) >= 0.15 ? 'REGEN+' : 'REGEN'; t.push([x.regen.length > 1 ? `${rp} x${x.regen.length}` : rp, '#90be6d']); }
  if (x.para) t.push([x.paraP ? 'PARA+' : 'PARA', '#f9c74f']);
  if (x.blind) t.push([x.blindP ? 'BLIND+' : 'BLIND', '#5a5078']);
  if (x.veil) t.push(['VEIL', '#8a7fb0']);
  if (x.confuse) t.push([x.confuseP ? 'CONF+' : 'CONF', '#d17fe8']);
  if (x.hex) t.push(['HEX', '#9b5de5']);
  if (x.taunt) t.push(['TAUNT', '#f94144']);
  if (x.guardT > 0 && x.guardBy && x.guardBy.hp > 0) t.push(['GUARDED', '#4cc9f0']);
  if (x.counter) t.push(['COUNTER', '#4cc9f0']);
  if (x.charged) t.push(['CHARGED', '#ffe680']);
  if (x.marked) t.push(['MARK ' + x.marked, '#f94144']);
  if (x.bomb) t.push(['BOMB ' + x.bomb.t, '#ff8c42']);
  if (x.abducted) t.push(['ABDUCTED ' + x.abducted, '#d17fe8']);
  if (x.rang) t.push(['BOOMERANG OUT', '#ff8c42']);
  if (x.heat) t.push([`HEAT ${Math.round(Math.min(x.heat.max, x.heat.step * (x.heat.n + 1)) * 100)}%`, '#f94144']);
  for (const [k, lab] of [['sOff', 'OFF'], ['sDef', 'DEF'], ['sSDef', 'SpD'], ['sSpd', 'SPE']]) if (x[k]) t.push([`${lab}${x[k] > 0 ? '+' : '-'}${Math.round(Math.abs(stMul(x[k], x) - 1) * 100)}%`, x[k] > 0 ? '#2d9a4a' : '#c0392b']);
  return t.map(([s, c]) => `<span class="st" style="background:${c}">${s}</span>`).join('');
}

function unitCard(u, i) {
  const side = u.side, t = B.pending && B.pending.t;
  const targetable = !B.busy && B.pending && ((t === 'foe' && side === 'E' && u.hp > 0) || (t === 'ally' && side === 'P' && u.hp > 0) || (t === 'fallen' && side === 'P' && u.hp <= 0));
  const big = (u.boss || u.art) && !u.small && u.spr && SPR_IMG[u.spr[0][0]];
  const cls = ['card', 'ucard', big ? 'bosscard' : '', u.hp <= 0 ? 'dead' : '', u.hit ? 'hit' : '', B.sel === u || B.cur === u ? 'sel' : '', targetable ? 'targetable' : ''].join(' ');
  return `<div class="${cls}" data-side="${side}" data-i="${i}">
    ${img(unitURL(u), (big ? 'bossimg ' : u.boss || u.small ? 'mid ' : 'xs ') + (u.hp > 0 ? 'bob' : '') + (u.ultra && u.hp > 0 ? ' ultraglow' : ''), `animation-delay:${i * 0.3}s` + (u.ultra ? `;--uc:${ELEM[u.el].c}` : ''))}
    ${big ? '<div class="binfo">' : ''}<div class="nm">${u.name}</div>
    <div class="lv">Lv${u.lvl} ${etags(u)}</div>${passiveOf(u) ? `<div class="pasn">&#9733; ${passiveOf(u).n}</div>` : ''}
    <div class="bar ${side === 'E' ? 'red' : ''}"><i style="width:${Math.max(0, u.hp)/u.max*100}%"></i></div>
    <div class="bar sta"><i style="width:${Math.max(0, u.sta)/u.staMax*100}%"></i></div>
    <div class="hpt">${Math.max(0, u.hp)}/${u.max}<span class="stv"> · ${u.sta}st</span></div>
    <div class="sts">${statusTags(u)}</div>${big ? '</div>' : ''}
  </div>`;
}
function orderBar() {
  const left = B.over || !B.queue ? [] : B.queue.slice(B.qi).filter(u => u.hp > 0);
  if (!left.length) return `<div class="order"></div>`;   // keep the row so nothing below jumps
  return `<div class="order" title="Turn order, fastest first">${left.map((u, k) =>
    `<div class="ord ${u.side === 'E' ? 'foe' : 'mine'} ${k === 0 ? 'now' : ''}">${img(unitURL(u), 'ord-img')}<span>${Math.round(effSpd(u))}</span></div>`).join('')}</div>`;
}
function moveButton(u, m, key, ref) {
  if (m.passive) return `<button class="mv pmv" disabled style="border-left:6px solid #f9c74f"><div class="mvt"><b>&#9733; ${m.n}</b><span class="cost">PASSIVE</span></div><div class="mvd">${m.d.replace('Passive: ', '')}</div></button>`;
  const effs = m.pow > 0 ? ref.map(e => effVs(m.el, e)) : [1];
  const et = effs.some(x => x > 1) ? ' · <span class="sup">SUPER!</span>' : effs.every(x => x < 1) ? ' · <span class="res">RESISTED</span>' : '';
  const short = m.s > u.sta, noFallen = m.t === 'fallen' && !party.some(p => p.hp <= 0), locked = u.locked && m.n !== u.locked;
  return `<button class="mv" data-m="${key}" ${short || noFallen || locked ? 'disabled' : ''} style="border-left:6px solid ${ELEM[m.el].c}">
    <div class="mvt">${mtype(m)}<b>${m.n}</b><span class="cost">${m.staCharge ? '+' + pct(m.staCharge) : m.s}</span></div>
    <div class="mvd">${et ? et.replace(' · ', '') + ' ' : ''}${mdesc(effMove(u, m))}</div>
    ${locked ? `<div class="cdov">LOCKED BY ${ITEMS[u.item].n.toUpperCase()}</div>` : short ? `<div class="cdov">NEED ${m.s} STA</div>` : noFallen ? `<div class="cdov">NOBODY IS DOWN</div>` : ''}</button>`;
}

function toggleAuto(k = 'auto') {
  G[k] = !G[k];
  // If it's your turn right now, let the AI take it.
  if (isAuto() && B && B.sel && !B.busy && !B.over) { B.sel = null; B.pending = null; advance(); }
  else renderBattle();
}
// Auto-learn for QUICK mode: take a new move if it beats the move it would replace, counting what the party is missing
// (nobody heals, nobody hits every foe, nobody protects) so the team stays well rounded.
const ROLE_TESTS = [
  [m => m.healPct || m.teamHeal || m.regen || m.mendAlly || m.teamLeech || m.revive, 45],
  [m => m.pow > 0 && m.t === 'foes', 25],
  [m => m.shieldPct || m.teamShield || m.guard || (m.t === 'allies' && (m.armor || m.offUp)), 20]];
function smartLearn(p, m) {
  if (!p.learned.includes(m.n)) p.learned.push(m.n);
  if (p.moves.some(x => x.n === m.n)) return null;
  if (p.moves.length < 4) { p.moves.push(m); return m; }
  const others = party.filter(o => o !== p).flatMap(o => o.moves);
  const score = (x, rest) => moveValue(x) + ROLE_TESTS.reduce((s, [has, bonus]) => s + (has(x) && !rest.some(has) ? bonus : 0), 0);
  let best = -1, gain = 0;
  p.moves.forEach((x, i) => { const rest = [...others, ...p.moves.filter((_, j) => j !== i)], g = score(m, rest) - score(x, rest); if (g > gain) { gain = g; best = i; } });
  if (best < 0) return null;
  p.moves[best] = m; return m;
}
function battleBar() {
  if (B.over) return '';
  return `<div class="autobar"><button id="auto" class="${G.auto ? 'on' : ''}">AUTO</button><button id="fast" class="${isFast() ? 'on' : ''}">${G.quick ? '4x' : isFast() ? '2x' : '1x'}</button><button id="quick" class="${G.quick ? 'on' : ''}">QUICK</button></div>`;
}

function noteDowned() { if (B) party.forEach(p => { if (p.hp <= 0) B.downed.add(p); }); }

// Move details that don't fit scroll sideways after a short pause, then scroll back.
function marquee() {
  app.querySelectorAll('.mv .mvd').forEach(el => {
    const over = el.scrollWidth - el.clientWidth;
    if (over <= 4 || el.querySelector('.mq')) return;
    el.innerHTML = `<span class="mq" style="--d:-${over + 6}px;--t:${(2.6 + over / 40).toFixed(1)}s">${el.innerHTML}</span>`;
    el.classList.add('scroll');
  });
}
function renderBattle() {
  noteDowned();
  const node = G.node;
  const title = eliteNode(node) ? 'ELITE 4' : node.type === 'boss' ? 'BOSS' : node.type === 'elite' ? 'ELITE' : 'FIGHT';
  let controls = '';
  if (B.over === 'win') {
    const learnN = G.learnQ.length;
    controls = `<div class="banner"><h2>VICTORY!</h2>
      <div class="gains">${B.gains.map(g => `<div class="gain">${img(unitURL(g.p), 'tiny')}<div><b>${g.p.name}</b> Lv${g.from} → <b>Lv${g.to}</b>${g.downed ? ` <span class="downed">downed: half XP, back at 35% HP</span>` : ''}${g.learns.length ? `<br><small>new: ${g.learns.map(m => m.n).join(', ')}</small>` : ''}</div></div>`).join('')}</div>
      <div class="row"><button class="primary" id="next">${learnN && !G.quick ? 'LEARN NEW MOVES' : node.type === 'elite' || node.type === 'boss' ? 'OPEN TREASURE' : 'BACK TO MAP'}</button></div></div>`;
  } else if (B.over === 'lose') {
    controls = `<div class="banner"><h2>SPLAT</h2><div class="sub">Your party fell in world ${G.w + 1} (${WORLDS[G.w].name}), floor ${node.f + 1}.</div><div class="row"><button class="primary" id="again">NEW RUN</button></div></div>`;
  } else if (G.quick) {
    controls = `<div class="hint quickhint">&#9889; QUICK MODE · round ${B.round}<br><small>Tap QUICK above to take over.</small></div>`;
  } else if (B.busy && B.dlg && B.dlg.length) {
    controls = `<div class="dlg" id="bdlg"><div class="dlgt"></div><span class="dlgarrow">&#9660;</span></div>`;
  } else if (B.busy) {
    controls = `<div class="hint">${B.cur ? B.cur.name + ' acts...' : G.auto ? 'Auto-fighting...' : 'Enemies are moving...'}</div>`;
  } else if (B.pending) {
    const what = { foe:'an enemy', ally:'an ally', fallen:"a KO'd ally" }[B.pending.t];
    controls = `<div class="hint">${B.sel.name}: ${B.pending.n}. Tap ${what} to target.</div><div class="row"><button id="cancel">CANCEL</button></div>`;
  } else if (B.sel) {
    const u = B.sel, ref = alive(B.foes);
    controls = `<div class="hint"><b>${u.name}</b>'s turn</div>
      <div class="grid">${u.moves.map((m, i) => moveButton(u, m, i, ref)).join('')}</div>
      <div class="basicrow">${moveButton(u, u.basic, 'basic', ref)}</div>
      <button id="rest" class="restbtn" ${u.sta >= u.staMax ? 'disabled' : ''}>REST · +${pct(REST_PCT)} STA (skip attack)</button>`;
  }
  const hold = B.hold = B.hold || {};
  const mh = k => hold[k] ? ` style="min-height:${hold[k]}px"` : '';
  app.innerHTML = `
    <div class="bhead"${mh('bhead')}><div class="btitle">W${G.w + 1} ${WORLDS[G.w].name} · ${title} F${node.f + 1}${planetRule() ? ` · ${planetRule().n.toUpperCase()}` : ''}</div>${battleBar()}</div>
    ${orderBar().replace('class="order"', `class="order"${mh('order')}`)}
    <div class="row foes">${B.foes.map(unitCard).join('')}</div>
    <div class="row mine">${party.map(unitCard).join('')}</div>
    <div class="controls"${mh('controls')}>${controls}</div>
    ${G.quick && !B.over ? '' : `<div class="log"${mh('log')}>${B.log.slice(-3).map(l => `<div>${l}</div>`).join('')}</div>`}`;
  // First render of a fight: pre-measure the tallest move panel in the party so your first turn doesn't shift the screen.
  if (!B.over && !hold.probed) {
    hold.probed = true;
    const ref = alive(B.foes), pr = document.createElement('div');
    pr.className = 'controls'; pr.style.cssText = `position:absolute;visibility:hidden;left:0;width:${app.clientWidth}px`;
    app.appendChild(pr);
    party.filter(u => u.hp > 0).forEach(u => {
      pr.innerHTML = `<div class="hint"><b>${u.name}</b>'s turn</div><div class="grid">${u.moves.map((m, i) => moveButton(u, m, i, ref)).join('')}</div><div class="basicrow">${moveButton(u, u.basic, 'basic', ref)}</div><button class="restbtn">REST</button>`;
      hold.controls = Math.max(hold.controls || 0, pr.offsetHeight);
    });
    pr.className = 'log'; pr.innerHTML = '<div>Fire Warlock uses Eldritch Storm on all foes! It is super effective!</div>'.repeat(3);
    hold.log = pr.offsetHeight;   // the log fills up to three lines
    pr.remove();
    const c = app.querySelector('.controls'); if (c && hold.controls) c.style.minHeight = hold.controls + 'px';
    const lg = app.querySelector('.log'); if (lg && hold.log) lg.style.minHeight = hold.log + 'px';
  }
  // Remember the tallest each block has been this fight, so it never collapses and shifts the screen.
  if (!B.over) for (const [k, sel] of [['bhead', '.bhead'], ['order', '.order'], ['controls', '.controls'], ['log', '.log']]) {
    const e = app.querySelector(sel); if (e) hold[k] = Math.max(hold[k] || 0, e.offsetHeight);
  }
  const dl = app.querySelector('#bdlg');
  if (dl) { const full = dlgText(); if (hold.controls) dl.style.minHeight = (hold.controls - 6) + 'px'; typeInto(dl.querySelector('.dlgt'), 'b' + B.dlgId, full); dl.onclick = () => dlgTap(full); }
  else clearInterval(TW.timer);
  [...party, ...B.foes].forEach(u => u.hit = false);
  playFX();
  marquee();
  app.querySelectorAll('[data-m]').forEach(b => b.onclick = () => pickMove(b.dataset.m === 'basic' ? 'basic' : +b.dataset.m));
  app.querySelectorAll('.ucard').forEach(c => c.onclick = () => tapUnit(c.dataset.side, +c.dataset.i));
  const $ = id => document.getElementById(id);
  if ($('rest')) $('rest').onclick = () => pickMove('rest');
  if ($('cancel')) $('cancel').onclick = () => { B.pending = null; renderBattle(); };
  if ($('next')) $('next').onclick = afterFight;
  if ($('again')) $('again').onclick = renderPick;
  if ($('auto')) $('auto').onclick = () => toggleAuto('auto');
  if ($('quick')) $('quick').onclick = () => toggleAuto('quick');
  if ($('fast')) $('fast').onclick = () => { G.fast = !G.fast; renderBattle(); };
}

/* ================= boot ================= */
if (app) {
  document.addEventListener('click', e => {
    SFX.unlock();
    if (e.target.closest('#mute, #music')) return;
    if (e.target.closest('button:not([disabled]), .choice, .ucard.targetable')) SFX.play('select');
    else if (e.target.closest('.nclick')) SFX.play('map');
  }, true);
  const mu = document.getElementById('music');
  if (mu) { const ml = () => { mu.textContent = 'MUS'; mu.classList.toggle('off', MUSIC.muted); }; ml(); mu.onclick = () => { MUSIC.toggle(); ml(); }; }
  const mb = document.getElementById('mute');
  if (mb) { const label = () => { mb.textContent = 'SFX'; mb.classList.toggle('off', SFX.muted); }; label(); mb.onclick = () => { SFX.toggle(); label(); if (!SFX.muted) SFX.play('select'); }; }
  loadProgress();
  renderPick();
  cloudInit();
}
