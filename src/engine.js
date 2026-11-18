/* ================= units ================= */
const pick = a => a[Math.floor(Math.random() * a.length)];
const rand = n => 1 + Math.floor(Math.random() * n);
const alive = arr => arr.filter(u => u.hp > 0);

function resetStatus(x) { Object.assign(x, { endureUsed:false, _koBy:false, _ua:false, sta:x.staMax, shield:0, burn:0, poison:0, stun:0, dazed:0, burnP:false, poisonP:false, paraP:false, blindP:false, confuseP:false, para:0, sOff:0, sDef:0, sSDef:0, sSpd:0, blind:0, veil:0, confuse:0, taunt:0, guardBy:null, guardT:0, counter:null, charged:false, marked:0, bomb:null, regen:[], hit:false, locked:null, plumeUsed:false, standUsed:false, defN:0, defT:0, pm:1, passShield:0, passShieldT:0 }); if (x.item === 'feather') x.sSpd = 1; if (x.startSt) Object.assign(x, x.startSt); }
// Speed after paralysis (-25%) and speed stages; used for turn order.
const has = (u, id) => u.item === id;
const effSpd = u => has(u, 'armor') ? u.spd * 0.001 : (u.pm || 1) * u.spd * (u.para ? 0.75 : 1) * stMul(u.sSpd || 0, u) * (has(u, 'badge') ? 1.5 : 1);
const critOf = (a, m) => a.crit + (m.critBonus || 0) + ((ultraPerk(a) || {}).crit || 0) + Math.max(0, a.sSpd || 0) * 0.05 + (has(a, 'clover') ? 0.15 : 0);
// Status chance after items: Alchemy Book boosts yours, Heavy Duty Armor resists control effects.
const CONTROL = { stun:1, para:1, blind:1, confuse:1 };
const ch = (a, d, p, k) => k === 'stun' && (hasPas(d, 'bedrock') || d.dazed) ? 0 : p * (k === 'stun' ? STUN_MULT : 1) * (a.pas === 'trap' ? 2 : 1) * (has(a, 'book') ? 1.25 : 1) * (CONTROL[k] && has(d, 'armor') ? 0.75 : 1);
// Change a stat stage, clamped. Returns how much it actually moved.
function stage(u, k, n) { const b = u[k]; u[k] = Math.max(ST_MIN, Math.min(ST_MAX, u[k] + n)); return u[k] - b; }
const ST_NAME = { sOff:'OFF', sDef:'DEF', sSDef:'SpD', sSpd:'SPE' };
// Which defense stages a DEF-lowering move hits: 'p' physical, 's' special, 'b' both.
const expKeys = m => m.exp === 's' ? ['sSDef'] : m.exp === 'b' ? ['sDef', 'sSDef'] : ['sDef'];
// Apply a stage change with a popup; returns a log fragment.
function stageFx(u, k, n) {
  if (u.pas === 'swords' && k === 'sOff' && n > 0) k = ['sDef', 'sSDef', 'sSpd'][Math.floor(Math.random() * 3)];   // jack of all trades: it doesn't use OFF
  const d = stage(u, k, n); if (!d) return `${ST_NAME[k]} won't go ${n > 0 ? 'higher' : 'lower'}`;
  const w = ['', '', 'sharply ', 'drastically '][Math.min(3, Math.abs(d))];
  fx({ u, k:'num', t:`${ST_NAME[k]} ${d > 0 ? '+' : '-'}${Math.abs(d) * 25}%`, c:d > 0 ? '#7cd67c' : '#ff6b6b', burst:d > 0 ? 'buff' : null, snd:d > 0 ? 'buff' : null });
  return `${ST_NAME[k]} ${w}${d > 0 ? 'rose' : 'fell'}`;
}
// Recompute level-based stats from base stats. Keeps current HP damage the same.
function derive(u) {
  const M = mult(u.lvl), lost = (u.max || 0) - (u.hp || 0);
  u.max = Math.round(u.base.hp * M);
  u.off = Math.round(u.base.off * M);
  u.pdef = Math.round(u.base.pdef * M);
  u.sdef = Math.round(u.base.sdef * M);
  u.spd = Math.round(u.base.spd * M);
  u.staMax = Math.round(u.base.sta + (u.lvl - 1) * 0.4);
  if (u.hp === undefined) u.hp = u.max; else if (u.hp > 0) u.hp = Math.max(1, u.max - lost);
  return u;
}
// Enemies are built with one DEF number; their role splits it (casters resist magic, brutes resist hits).
function mkUnit(o) {
  if (o.base.def != null) { const r = o.dmul || [1, 1]; o.base.pdef = o.base.def * r[0]; o.base.sdef = o.base.def * r[1]; delete o.base.def; }
  derive(o); o.hp = o.max; resetStatus(o); return o; }
const allMoves = u => u.basic ? [...u.moves, u.basic] : u.moves;

function newSlime(el, cls, lvl = 1, recruit = false) {
  const b = baseOf(el, cls);
  const p = { side:'P', name:`${ELEM[el].name} ${CLASSES[cls].name}`, el, cls, lvl:Math.min(LVL_MAX, lvl),
    base:{ hp:b.hp, off:b.off, pdef:b.pdef, sdef:b.sdef, spd:b.spd, sta:b.sta }, crit:b.crit,
    basic:tagCat({ ...clone(BASIC[cls]), el:BASIC[cls].el === 'self' ? el : BASIC[cls].el, tag:'Basic' }, cls), moves:[], learned:[], pas:pick(PASSIVES[cls]).id };
  if (typeof starPts === 'function') STAT_KEYS.forEach(k => { const n = starPts(el, cls, k); if (n) p.base[k] *= 1 + STAR_PER_POINT * n * (recruit ? RECRUIT_STAR : 1); });
  mkUnit(p);
  // Knows the 4 most recent moves it has learned up to its level.
  const known = learnset(el, cls).filter(x => x.lvl <= p.lvl).map(x => clone(x.m));
  // At most one move-slot passive (the newest) among its starting four.
  const acts = known.filter(m => !m.passive), pas = known.filter(m => m.passive).pop();
  p.moves = pas ? [...acts.slice(-3), pas] : acts.slice(-4);
  // Always join with at least one combo move: the newest combo replaces the oldest move.
  if (!p.moves.some(m => m.tag === 'Combo')) {
    const combo = known.filter(m => m.tag === 'Combo').pop();
    if (combo) p.moves[0] = combo;
  }
  p.learned = known.map(m => m.n);
  return p;
}

// Level gain after a win: boss 4, elite 2, normal fight 1.
const LEVEL_REWARD = { boss:4, elite:2, fight:1 };
function levelGain(p, foeLvl, type) { return LEVEL_REWARD[type] || 1; }
const DOWNED_REVIVE = 0.35;
// Rewards after a win, shared by the game and the sim. Slimes that were downed at any point in
// the fight revive at 35% HP and earn half the levels (half levels are banked until they add up).
function fightRewards(p, foeLvl, type, downed) {
  const from = p.lvl, full = levelGain(p, foeLvl, type);
  p.lvFrac = (p.lvFrac || 0) + (downed ? full / 2 : full);
  const n = Math.floor(p.lvFrac + 1e-9); p.lvFrac -= n;
  const learns = gainLevels(p, n);
  if (p.hp <= 0) { resetStatus(p); p.hp = Math.max(1, Math.round(p.max * DOWNED_REVIVE)); }
  else if (!downed) heal(p, p.max * 0.15);
  return { p, from, to:p.lvl, learns, downed, gain:full };
}
// Raise a slime's level. Returns moves it now wants to learn.
// Per-world level cap: the world's boss level + 6. Set LV_WORLD when entering a world.
let LV_WORLD = 0;
const bossLvl = w => lvlOf(w, FLOORS - 1) + (w > 0 ? 2 : 0);
const levelCap = (w = LV_WORLD) => Math.min(LVL_MAX, bossLvl(w) + 6);
function gainLevels(p, n) {
  const from = p.lvl, to = Math.min(levelCap(), p.lvl + n);
  if (to >= levelCap()) p.lvFrac = 0;
  if (to === from) return [];
  p.lvl = to; derive(p);
  const ls = p.parents ? p.parents.flatMap(([el, c]) => learnset(el, c)) : learnset(p.el, p.cls);   // fused slimes learn from both parents' lists
  return ls.filter((x, i) => x.lvl > from && x.lvl <= to && !p.learned.includes(x.m.n) && ls.findIndex(y => y.m.n === x.m.n) === i).map(x => clone(x.m));
}
// Value estimate used by the AI when it has to forget a move.
function moveValue(m) {
  if (m.passive) return 70;   // the bot keeps passives over most single moves, like players do
  return (m.pow || 0) * (m.hits || 1) * (m.t === 'foes' ? 1.6 : 1) + (m.healPct || 0) * 150 + (m.shieldPct || 0) * 120 +
    (m.regen ? m.regen[0] * m.regen[1] * 120 : 0) + (m.offUp || 0) * 20 * (m.t === 'allies' ? 2 : 1) + (m.revive ? 60 : 0) + ((m.burn || 0) * 15 + (m.poison || 0) * 15 + (m.stun || 0) * 25 + (m.weaken || 0) * 14 + (m.expose || 0) * 14 + (m.slow || 0) * 10 + ((m.weakenCh || 0) + (m.exposeCh || 0) + (m.slowCh || 0) * 0.7) * (m.hits || 1) * 14 + (m.para || 0) * 20 + (m.blind || 0) * 18 + (m.confuse || 0) * 20 + (m.staDrain || 0) * 0.4) + (m.mendAlly ? m.mendAlly * 30 : 0) + (m.veil ? 16 * (m.t === 'allies' ? 2 : 1) : 0) + (m.staGain ? m.staGain * 0.5 * (m.t === 'allies' ? 2 : 1) : 0) + (m.haste ? 18 * (m.t === 'allies' ? 2 : 1) : 0) + (m.armor ? 16 * (m.t === 'allies' ? 2 : 1) : 0) * (m.t === 'foes' ? 1.8 : 1) + (m.cleanse ? 10 : 0) + (m.splash || 0) * 0.8 + (m.teamHeal || 0) * 200 + (m.teamShield || 0) * 200 + (m.taunt || m.selfTaunt ? 40 : 0) + (m.guard ? 35 : 0) + (m.dispel ? 15 : 0) + (m.cleanseTeam ? 15 : 0) + (m.selfStun ? -20 : 0) + (m.bonusVs ? 15 : 0) +
    (m.detonate ? 20 : 0) + (m.spread ? 22 : 0) + (m.chain ? m.pow * (m.chain - 1) * 0.5 : 0) + (m.charge ? 45 : 0) + (m.counter ? m.counter.pow * 0.8 : 0) + (m.steal ? 15 : 0) + (m.pierce ? 12 : 0) + (m.berserk ? 15 : 0) + (m.mark ? 18 : 0) + (m.overheal ? 10 : 0) + (m.bomb ? m.bomb.pow * 1.5 : 0) - (m.hpCost || 0) * 60;
}
function autoLearn(p, m) {
  p.learned.push(m.n);
  if (p.moves.length < 4) { p.moves.push(m); return null; }
  let wi = 0; p.moves.forEach((x, i) => { if (moveValue(x) < moveValue(p.moves[wi])) wi = i; });
  if (moveValue(m) <= moveValue(p.moves[wi])) return null;
  const old = p.moves[wi]; p.moves[wi] = m; return old;
}

/* ================= enemies ================= */
function roleSwap(role, el) {
  const m = ELEM[el].m, s = ELEM[el].s;
  return { rogue:{b:m,B:s}, fighter:{y:m,Y:s,R:s}, cleric:{x:m,X:s,e:s,E:s}, barb:{r:m,R:s}, goblin:{e:m,E:s}, mage:{p:m,P:s}, ranger:{e:m,E:s}, monk:{y:m,Y:s}, bulwark:{b:m,B:s}, bard:{r:m,R:s}, sorcerer:{p:m,P:s} }[role] || {};
}
// Enemy base stats are tuned against slime bases (see the balance sim).
const EB = { hp:26.3, off:11.6, def:9.5 };
// How each enemy role attacks (physical/special) and splits its DEF into [DEF, SpD].
const ENEMY_ROLE = { fighter:{ cat:'p', d:[1.15, 0.85] }, rogue:{ cat:'p', d:[0.9, 1.05] }, cleric:{ cat:'s', d:[0.85, 1.2] }, barb:{ cat:'p', d:[1.1, 0.8] }, goblin:{ cat:'s', d:[0.95, 1.05] } };
// Enemies also get tougher per world, so late worlds stay dangerous as your team grows.
const WSCALE = { hp:0.05, off:0.04, def:0.03 };
const eb = (w, k, f = 1) => EB[k] * f * (1 + WSCALE[k] * w) * (k === 'hp' ? REALM_DEF[REALM].foeHp : k === 'off' ? REALM_DEF[REALM].foeOff : 1);
// Human adventurers: the same element+class kits your slimes use, scaled to enemy strength.
// Generic monsters (brutes, goblins) still show up too.
const GENERIC_ROLES = ['barb', 'goblin'];
const FOE_ROLES = [...Object.keys(CLASSES), ...GENERIC_ROLES];
// Realm 3 natives: each country has three creatures, each locked to one element, with two moves and one quirk.
// About half of Realm 3's ordinary foes are natives (see rollFoe / makeFoes); they never fuse.
const CREATURES = {
  ninja:     { n:'Ninja', el:'dark', cat:'p', hp:0.8, off:1.1, spd:9, extra:{ first:true }, q:'Always strikes first.',
               moves:[ { n:'Shuriken', el:'dark', cat:'p', pow:25, hits:2, s:25, t:'foe' }, { n:'Smoke Bomb', el:'dark', pow:0, s:25, t:'foes', blind:0.5 } ] },
  kappa:     { n:'Kappa', el:'water', cat:'s', hp:1.0, off:1.0, spd:5, q:'Refills the water dish on its head to heal.',
               moves:[ { n:'Water Jet', el:'water', cat:'s', pow:55, s:25, t:'foe' }, { n:'Head Dish', el:'water', pow:0, s:30, t:'self', healPct:0.2 } ] },
  oni:       { n:'Oni', el:'fire', cat:'p', hp:1.15, off:1.1, spd:3, q:'Its club hits harder the more it\'s hurt.',
               moves:[ { n:'Kanabo Club', el:'fire', cat:'p', pow:55, s:30, t:'foe', berserk:0.5 }, { n:'Demon Roar', el:'fire', pow:0, s:25, t:'foes', weaken:1 } ] },
  guard:     { n:'Royal Guard', el:'light', cat:'p', d:[1.25, 1], hp:1.1, off:0.9, spd:3, q:'Stands guard: taunts and toughens up.',
               moves:[ { n:'Stand Guard', el:'light', pow:0, s:30, t:'self', selfTaunt:2, armor:1 }, { n:'Bearskin Bonk', el:'light', cat:'p', pow:50, s:25, t:'foe', stun:0.2 } ] },
  fogghost:  { n:'Fog Ghost', el:'dark', cat:'s', hp:0.8, off:1.0, spd:6, q:'Rolls in fog that blinds your team.',
               moves:[ { n:'Pea-Souper', el:'dark', cat:'s', pow:25, s:30, t:'foes', blind:0.5 }, { n:'Spooky Wail', el:'dark', cat:'s', pow:50, s:25, t:'foe', confuse:0.2 } ] },
  pigeon:    { n:'Angry Pigeon', el:'lightning', cat:'p', hp:0.6, off:1.0, spd:10, q:'Pecks three times and steals your snacks (stamina).',
               moves:[ { n:'Peck Peck Peck', el:'lightning', cat:'p', pow:18, hits:3, s:25, t:'foe' }, { n:'Bread Thief', el:'lightning', cat:'p', pow:30, s:20, t:'foe', staDrain:25 } ] },
  lion:      { n:'Lion', el:'earth', cat:'p', hp:1.0, off:1.2, spd:7, q:'Finishes off the wounded (+50% below 35% HP).',
               moves:[ { n:'Maul', el:'earth', cat:'p', pow:55, s:30, t:'foe', execute:true }, { n:'Pounce', el:'earth', cat:'p', pow:40, s:20, t:'foe' } ] },
  elephant:  { n:'Elephant', el:'earth', cat:'p', d:[1.2, 1], hp:1.6, off:0.9, spd:2, q:'A slow, huge tank that stomps everyone.',
               moves:[ { n:'Stomp', el:'earth', cat:'p', pow:35, s:30, t:'foes', slow:1 }, { n:'Trunk Slam', el:'earth', cat:'p', pow:60, s:30, t:'foe' } ] },
  hyena:     { n:'Hyena', el:'dark', cat:'p', hp:0.6, off:0.9, spd:8, pack:true, q:'Hunts in packs.',
               moves:[ { n:'Dirty Bite', el:'dark', cat:'p', pow:35, s:20, t:'foe', poison:0.4 }, { n:'Cackle', el:'dark', cat:'p', pow:40, s:25, t:'foe', bonusVs:'poison' } ] },
  kangaroo:  { n:'Kangaroo', el:'earth', cat:'p', hp:1.0, off:1.0, spd:7, q:'Puts its dukes up and counter-punches.',
               moves:[ { n:'Boxing Stance', el:'earth', pow:0, s:25, t:'self', counter:{ pow:55 } }, { n:'Double Jab', el:'earth', cat:'p', pow:28, hits:2, s:25, t:'foe' } ] },
  dropbear:  { n:'Drop Bear', el:'dark', cat:'p', hp:0.8, off:1.1, spd:6, extra:{ first:true }, q:'Drops from the trees first, often stunning.',
               moves:[ { n:'Ambush Drop', el:'dark', cat:'p', pow:45, s:30, t:'foe', stun:0.2 }, { n:'Gnaw', el:'dark', cat:'p', pow:40, s:20, t:'foe', poison:0.3 } ] },
  emu:       { n:'Emu', el:'lightning', cat:'p', hp:0.8, off:1.0, spd:10, q:'Very fast; its kicks and feathers paralyze.',
               moves:[ { n:'Emu War Kick', el:'lightning', cat:'p', pow:28, hits:2, s:25, t:'foe', para:0.15 }, { n:'Static Feathers', el:'lightning', cat:'s', pow:25, s:30, t:'foes', para:0.25 } ] },
  penguin:   { n:'Penguin', el:'water', cat:'p', hp:0.8, off:1.0, spd:8, pack:true, q:'Waddles in groups and belly-slides through everyone.',
               moves:[ { n:'Belly Slide', el:'water', cat:'p', pow:30, s:25, t:'foes' }, { n:'Fish Slap', el:'water', cat:'p', pow:45, s:20, t:'foe' } ] },
  icegolem:  { n:'Ice Golem', el:'water', cat:'p', d:[1.2, 1.1], hp:1.4, off:0.95, spd:2, q:'Slow and frosty: freezes and shields itself.',
               moves:[ { n:'Freeze Punch', el:'water', cat:'p', pow:45, s:30, t:'foe', stun:0.35 }, { n:'Frost Armor', el:'water', pow:0, s:30, t:'self', shieldPct:0.2 } ] },
  seal:      { n:'Leopard Seal', el:'water', cat:'p', hp:1.1, off:1.1, spd:5, q:'Bites frozen or stunned prey extra hard.',
               moves:[ { n:'Big Bite', el:'water', cat:'p', pow:55, s:30, t:'foe', bonusVs:'stun' }, { n:'Flop', el:'water', cat:'p', pow:30, s:25, t:'foes' } ] },
  frog:      { n:'Poison Frog', el:'life', cat:'s', hp:0.7, off:1.0, spd:7, item:'thorns', q:'Toxic skin: hitting it hurts you back.',
               moves:[ { n:'Toxic Tongue', el:'life', cat:'s', pow:40, s:25, t:'foe', poison:0.6 }, { n:'Lily Leap', el:'life', cat:'s', pow:45, s:20, t:'foe' } ] },
  jaguar:    { n:'Jaguar', el:'dark', cat:'p', hp:0.9, off:1.15, spd:9, crit:0.2, q:'Stalks from the shadows: lots of critical hits.',
               moves:[ { n:'Shadow Pounce', el:'dark', cat:'p', pow:55, s:30, t:'foe', critBonus:0.2 }, { n:'Rake', el:'dark', cat:'p', pow:25, hits:2, s:20, t:'foe' } ] },
  parrot:    { n:'Parrot', el:'psychic', cat:'s', hp:0.7, off:1.0, spd:9, q:'Copies the last move your team used.',
               moves:[ { n:'Polly Want a Move', el:'psychic', pow:0, s:30, t:'self', spoiler:true }, { n:'Squawk', el:'psychic', cat:'s', pow:45, s:25, t:'foe', confuse:0.3 } ] },
  eagle:     { n:'Bald Eagle', el:'lightning', cat:'p', hp:0.8, off:1.1, spd:10, q:'Dives from the sky and snatches slimes.',
               moves:[ { n:'Dive Bomb', el:'lightning', cat:'p', pow:60, s:30, t:'foe' }, { n:'Talon Grab', el:'lightning', cat:'p', pow:35, s:25, t:'foe', stun:0.25 } ] },
  linebacker:{ n:'Linebacker', el:'earth', cat:'p', d:[1.2, 0.9], hp:1.2, off:1.0, spd:5, q:'Tackles hard enough to stun.',
               moves:[ { n:'Tackle', el:'earth', cat:'p', pow:55, s:30, t:'foe', stun:0.35 }, { n:'Blitz', el:'earth', cat:'p', pow:30, s:30, t:'foes' } ] },
  tourist:   { n:'Tourist', el:'light', cat:'s', hp:0.9, off:0.95, spd:5, q:'Camera flashes blind you; asking for directions stuns you.',
               moves:[ { n:'Camera Flash', el:'light', cat:'s', pow:20, s:25, t:'foes', blind:0.5 }, { n:'Ask for Directions', el:'light', pow:0, s:25, t:'foe', stun:0.5 } ] }
};
const R3_NATIVE = [['ninja', 'kappa', 'oni'], ['guard', 'fogghost', 'pigeon'], ['lion', 'elephant', 'hyena'], ['kangaroo', 'dropbear', 'emu'],
                   ['penguin', 'icegolem', 'seal'], ['frog', 'jaguar', 'parrot'], ['eagle', 'linebacker', 'tourist']];
const NATIVE_RATE = 0.5;
const nativesOf = w => REALM === 2 ? R3_NATIVE[w] || null : null;
const crId = role => role && role.startsWith('cr_') ? role.slice(3) : null;
function creatureEnemy(w, L, id) {
  const C = CREATURES[id];
  const u = mkUnit({ side:'E', name:C.n, el:C.el, spr:[['cr_' + id]], lvl:L, ecat:C.cat, dmul:C.d || [1, 1], creature:id, quirk:C.q,
    base:{ hp:eb(w, 'hp', C.hp), off:eb(w, 'off', C.off), def:eb(w, 'def'), spd:C.spd, sta:80 }, crit:C.crit || 0.05,
    moves:[clone(STRIKE), ...C.moves.map(clone)] });
  if (C.extra) Object.assign(u, C.extra);
  if (C.item) u.item = C.item;
  return u;
}
// Humans have full kits, so their stats run a bit lower; early worlds are gentler.
const humanPower = w => 0.97 + 0.016 * w;
// Classes whose AOE kits hit the whole party get weaker as enemies.
const FOE_MUL = { sorcerer:0.82 };
let CLS_AVG = null;
function classEnemy(w, L, el, cls, f = 1) {
  if (!CLS_AVG) { CLS_AVG = {}; const all = []; ALL_ELS.forEach(e => Object.keys(CLASSES).forEach(c => all.push(baseOf(e, c))));
    ['hp', 'off', 'pdef', 'sdef', 'spd'].forEach(k => CLS_AVG[k] = all.reduce((x, b) => x + b[k], 0) / all.length); }
  const b = baseOf(el, cls), avgDef = (CLS_AVG.pdef + CLS_AVG.sdef) / 2;
  const known = learnset(el, cls).filter(x => x.lvl <= L && !x.m.passive).map(x => clone(x.m));
  return mkUnit({ side:'E', name:`${ADJ[el]} ${CLASSES[cls].name}`, el, cls, role:cls, human:true, spr:[[cls, roleSwap(cls, el)]], lvl:L,
    base:{ hp:b.hp / CLS_AVG.hp * eb(w, 'hp') * humanPower(w) * f, off:b.off / CLS_AVG.off * eb(w, 'off') * humanPower(w) * f,
           pdef:b.pdef / avgDef * eb(w, 'def'), sdef:b.sdef / avgDef * eb(w, 'def'), spd:b.spd * 0.7, sta:b.sta }, crit:b.crit,
    basic:tagCat({ ...clone(BASIC[cls]), el:BASIC[cls].el === 'self' ? el : BASIC[cls].el, tag:'Basic' }, cls), moves:known.slice(-4) });
}
function normalEnemy(w, L, el = pick(WORLDS[w].els), role = pick(FOE_ROLES)) {
  if (crId(role)) return creatureEnemy(w, L, crId(role));
  if (CLASSES[role]) return classEnemy(w, L, el, role, FOE_MUL[role] || 1);
  const moves = [clone(STRIKE), clone(E_MOVE[el])];
  if (w >= 2) moves.push(clone(E_HEAVY[el]));
  const R = ENEMY_ROLE[role];
  return mkUnit({ side:'E', name:`${ADJ[el]} ${ROLES[role]}`, el, role, spr:[[role, roleSwap(role, el)]], lvl:L, ecat:R.cat, dmul:R.d,
    base:{ hp:eb(w,'hp'), off:eb(w,'off'), def:eb(w,'def'), spd:2 + rand(5), sta:60 }, crit:0.05, moves });
}
function eliteEnemy(w, L) {
  const el = pick(SPC);
  // The holy elite is now a Light Bulwark paladin with the real class kit.
  if (el === 'light') { const u = classEnemy(w, L, 'light', 'bulwark', 1.35); u.name = 'Holy Paladin'; return u; }
  const look = { light:['Holy Paladin', [['cleric', roleSwap('cleric','light')]]], dark:['Bone Knight', [['skeleton']]], psychic:['Mind Wraith', [['wraith']]] }[el];
  const ec = { light:['s', [0.9, 1.2]], dark:['p', [1.2, 0.85]], psychic:['s', [0.85, 1.2]] }[el];
  return mkUnit({ side:'E', name:look[0], el, spr:look[1], lvl:L, ecat:ec[0], dmul:ec[1], base:{ hp:eb(w,'hp',1.5), off:eb(w,'off',1.05), def:eb(w,'def',1.05), spd:6, sta:90 }, crit:0.1,
    moves:[ clone(STRIKE), clone(E_MOVE[el]), clone(E_HEAVY[el]) ] });
}
/* ================= bosses =================
   One boss per world, each a parody of an RPG trope. They use the same rules as everyone else,
   plus a few boss-only tricks: always going first (first), acting twice (twice), hunting your
   strongest hitter (hunter), never missing (sure), rolling dice (d4) and phases. */
const P = 'p', S = 's';
// Bosses are tuned up so a player who plays smart still gets a fight.
const bossHp = w => Math.min(1.4, 1.2 + 0.055 * w), bossOff = w => Math.min(1.13, 1.07 + 0.02 * w);
function bossUnit(w, L, o) {
  const k = o.k;
  const u = mkUnit({ side:'E', boss:true, name:o.name, el:o.el, spr:[[o.spr]], lvl:L, cls:o.cls, dmul:o.dmul || [1, 1],
    base:{ hp:eb(w, 'hp', k.hp * bossHp(w)), off:eb(w, 'off', k.off * bossOff(w)), def:eb(w, 'def', k.def), spd:k.spd, sta:k.sta || 110 }, crit:k.crit || 0.08,
    basic:{ ...STRIKE, ...(o.basic || {}), tag:'Basic' }, moves:o.moves.map(clone), ...(o.extra || {}) });
  if (o.extra && o.extra.startSt) Object.assign(u, o.extra.startSt);
  if (o.phase) u.phase = clone(o.phase);
  if (o.script) u.script = o.script;
  return u;
}
// Boss sidekicks: more HP than a normal foe of their kind (so the boss can play off them), same damage.
const SIDE_HP = 1.4;
const side = (w, L, el, cls, f) => { const u = classEnemy(w, Math.max(1, L - 1), el, cls, f); u.base.hp *= SIDE_HP; derive(u); u.hp = u.max; return u; };
const BOSSES = [
  // 1. The Protagonist: spiky hair, a sword bigger than he is, and a full party of tropes.
  (w, L) => [bossUnit(w, L, { name:'The Protagonist', el:'light', spr:'b_hero', cls:'fighter', dmul:[1.1, 1],
      k:{ hp:2.0, off:1.0, def:1.05, spd:6, crit:0.1 }, basic:{ n:'Sword Poke', cat:P },
      script:[null, 'Dramatic Power-Up', 'Buster Slash', null],
      phase:{ at:0.5, title:'PLOT TWIST', shield:0.15, script:['Chosen One Parry', 'Dramatic Power-Up', 'Limit Break: Omega Overslash', null], offUp:1, heal:0.1, say:'The Protagonist: "I can\'t lose my first fight!" His hair somehow gets spikier, and he starts parrying.',
              addMoves:[ { n:'Chosen One Parry', el:'light', pow:0, s:30, t:'self', counter:{ pow:55 } } ] },
      moves:[ { n:'Buster Slash', el:'light', cat:P, pow:70, s:25, t:'foe' },
              { n:'Spiky Hair Spin', el:'light', cat:P, pow:40, s:30, t:'foes' },
              { n:'Plot Armor', el:'neutral', pow:0, s:35, t:'self', shieldPct:0.3 },
              { n:'Limit Break: Omega Overslash', el:'light', cat:P, pow:45, hits:3, s:60, t:'foe', critBonus:0.2 },
              { n:'Dramatic Power-Up', el:'light', pow:0, s:30, t:'self', charge:true } ] }),
    side(w, L, 'light', 'cleric', 0.4), side(w, L, 'fire', 'mage', 0.4), side(w, L, 'lightning', 'rogue', 0.4)],
  // 2. Cantmiss: the tribute archer who literally cannot miss. Freezes you solid.
  (w, L) => [bossUnit(w, L, { name:'Cantmiss', el:'water', spr:'b_archer', cls:'ranger', dmul:[0.95, 1.1],
      k:{ hp:2.6, off:1.1, def:1, spd:9, crit:0.15 }, basic:{ n:'Practice Shot', cat:P, sure:true }, extra:{ sure:true },
      script:['Mark Prey', 'Songbird Shot', 'Ice Bomb', null],
      phase:{ at:0.5, title:'FROZEN HEART', shield:0.15, script:['Mark Prey', 'Absolute Zero', 'Ice Bomb', 'Flash Freeze Arrow'], offUp:1, say:'Cantmiss: "Practice is over." The air turns to ice around her.',
              addMoves:[ { n:'Absolute Zero', el:'water', cat:P, pow:40, s:55, t:'foes', stun:0.3 } ] },
      moves:[ { n:'Songbird Shot', el:'water', cat:P, pow:60, s:20, t:'foe', critBonus:0.2 },
              { n:'Flash Freeze Arrow', el:'water', cat:P, pow:45, s:35, t:'foe', stun:0.6, slow:1 },
              { n:'Frost Volley', el:'water', cat:P, pow:35, s:40, t:'foes', slow:1 },
              { n:'Bola of Ice', el:'water', cat:P, pow:0, s:45, t:'foe', stun:1 },
              { n:'Mark Prey', el:'water', pow:0, s:25, t:'foe', mark:2 },
              { n:'Ice Bomb', el:'water', pow:0, s:50, t:'foe', bomb:{ pow:55, stun:0.3 } } ] }),
    side(w, L, 'water', 'fighter', 0.85)],
  // 3. Jimmy: a miner with way too much HP. The more you hurt him, the harder he swings.
  (w, L) => [bossUnit(w, L, { name:'Jimmy the Miner', el:'earth', spr:'b_miner', cls:'bulwark', dmul:[1.2, 0.9],
      k:{ hp:3.6, off:1.05, def:1.1, spd:3, sta:120 }, basic:{ n:'Pickaxe Swing', cat:P, pow:50 },
      script:[null, 'Hard Hat Stance', null, 'Collapse the Mine'],
      phase:{ at:0.4, title:'CAVE RAGE', shield:0.15, script:['Collapse the Mine', 'Pickaxe Frenzy', 'Payback Pickaxe', 'Cave-In'], offUp:1, heal:0.1, say:'Jimmy throws his hard hat down. "THAT WAS MY GOOD PICKAXE!"',
              addMoves:[ { n:'Pickaxe Frenzy', el:'earth', cat:P, pow:30, hits:4, s:45, t:'foe' } ] },
      moves:[ { n:'Payback Pickaxe', el:'earth', cat:P, pow:50, s:30, t:'foe', berserk:2.5 },
              { n:'Cave-In', el:'earth', cat:P, pow:45, s:45, t:'foes', stun:0.2 },
              { n:'Pickled Egg Break', el:'neutral', pow:0, s:40, t:'self', healPct:0.18 },
              { n:'Dynamite Toss', el:'fire', cat:P, pow:55, s:40, t:'foe', splash:35 },
              { n:'Hard Hat Stance', el:'earth', pow:0, s:30, t:'self', counter:{ pow:55 } },
              { n:'Collapse the Mine', el:'earth', pow:0, s:55, t:'foe', bomb:{ pow:70, stun:0.3 } } ] })],
  // 4. Grimm Edgelord: always acts first, always targets your strongest hitter, rolls a fistful of D4s.
  (w, L) => [bossUnit(w, L, { name:'Grimm Edgelord', el:'dark', spr:'b_edgelord', cls:'rogue', dmul:[0.9, 1.1],
      k:{ hp:3.2, off:1.02, def:0.95, spd:10, crit:0.18 }, basic:{ n:'Edgy Poke', cat:P }, extra:{ first:true, hunter:true },
      script:['Mark for Death', 'Shadow Execution', 'Edgy Ricochet', null],
      phase:{ at:0.5, title:'EDGE OVERLOAD', shield:0.15, script:['Mark for Death', 'Thousand Cuts', 'Shadow Execution', null], offUp:1, say:'Grimm Edgelord: "You think this is my final form? This is just my darker form."',
              addMoves:[ { n:'Thousand Cuts', el:'dark', cat:P, pow:20, hits:6, exposeCh:0.2, s:55, t:'foe' } ] },
      moves:[ { n:'Sneak Attack (D4s)', el:'dark', cat:P, pow:26, d4:true, hits:4, s:25, t:'foe' },
              { n:'Brooding Monologue', el:'dark', pow:0, s:20, t:'self', veil:1, offUp:1 },
              { n:'Shadow Execution', el:'dark', cat:P, pow:85, s:45, t:'foe', execute:true },
              { n:'Bleed the Weak', el:'dark', cat:P, pow:50, s:30, t:'foe', poison:1, blind:0.4 },
              { n:'Mark for Death', el:'dark', pow:0, s:20, t:'foe', mark:2 },
              { n:'Edgy Ricochet', el:'dark', cat:P, pow:45, s:40, t:'foe', chain:3 } ] })],
  // 5. Dracona Dragonslayer: a knight in dragon-scale armor. Good at everything. Brought backup.
  (w, L) => [bossUnit(w, L, { name:'Dracona Dragonslayer', el:'fire', spr:'b_knight', cls:'fighter', dmul:[1.15, 1.15],
      k:{ hp:2.6, off:1.0, def:1.2, spd:6, sta:120, crit:0.1 }, basic:{ n:'Lance Jab', cat:P },
      script:[null, 'Wyrmfire Bomb', 'Dragonguard Stance', 'Rally the Order'],
      phase:{ at:0.5, title:'WYRMBLOOD', shield:0.15, script:['Wyrmfire Bomb', "Dragon's Breath", 'Dragonguard Stance', null], offUp:1, heal:0.1, say:'Dracona drinks the dragon blood from her flask. Her armor glows red-hot.',
              addMoves:[ { n:"Dragon's Breath", el:'fire', cat:P, pow:70, s:50, t:'foes', burn:0.6, burnP:true } ] },
      moves:[ { n:'Dragonslayer', el:'fire', cat:P, pow:85, s:35, t:'foe', pierce:true },
              { n:'Wyrmfire Cleave', el:'fire', cat:P, pow:50, s:40, t:'foes', burn:0.4 },
              { n:'Scale Guard', el:'neutral', pow:0, s:30, t:'self', armor:1, healPct:0.15 },
              { n:'Rally the Order', el:'fire', pow:0, s:35, t:'allies', offUp:1 },
              { n:'Dragonguard Stance', el:'fire', pow:0, s:30, t:'self', counter:{ pow:60 } },
              { n:'Wyrmfire Bomb', el:'fire', pow:0, s:50, t:'foe', bomb:{ pow:60, burn:0.5 } } ] }),
    side(w, L, 'fire', 'fighter', 0.55), side(w, L, 'fire', 'fighter', 0.55)],
  // 6. Claire Rick: spams heals on her tank while the mage nukes you. Alone, she stops pretending to be a healer.
  (w, L) => { const c = bossUnit(w, L, { name:'Claire Rick', el:'light', spr:'b_healer', cls:'cleric', dmul:[1, 1.25],
      k:{ hp:2.5, off:1.05, def:1, spd:4, sta:130 }, basic:{ n:'Holy Bonk', cat:S }, extra:{ favor:'bulwark' },
      moves:[ { n:'Heal Spam', el:'light', pow:0, s:15, t:'ally', healPct:0.35 },
              { n:'Bless the Tank', el:'light', pow:0, s:25, t:'ally', shieldPct:0.3, armor:1 },
              { n:'Group Heal (Again)', el:'light', pow:0, s:35, t:'allies', healPct:0.2 },
              { n:'Divine Ward', el:'light', pow:0, s:40, t:'allies', shieldPct:0.2, cleanse:true } ] });
    c.phase = { alone:true, name:'Claire Rick, Unleashed', title:'DIVINE MODE', script:['Heavenly Bombardment', 'Divine Wrath', 'Judgment Day', 'Self Heal (Finally)'], offUp:1, heal:0.2,
      say:'Claire Rick: "Fine. I\'ll do it MYSELF." Her healer act drops. Divine fury takes over!',
      moves:[ { n:'Divine Wrath', el:'light', cat:S, pow:75, s:30, t:'foes', blind:0.3 },
              { n:'Judgment Day', el:'light', cat:S, pow:120, s:40, t:'foe' },
              { n:'Self Heal (Finally)', el:'light', pow:0, s:30, t:'self', healPct:0.25 },
              { n:'Heavenly Bombardment', el:'light', pow:0, s:45, t:'foe', bomb:{ pow:70, stun:0.3 } } ] };
    const team = [c, side(w, L, 'earth', 'bulwark', 0.65), side(w, L, 'fire', 'mage', 0.7)];
    c.teamRef = team; return team; },
  // 7. Monkey D. Monk: a stretchy monkey monk, ridiculously fast, and his punches scramble your brain.
  (w, L) => [bossUnit(w, L, { name:'Monkey D. Monk', el:'psychic', spr:'b_monkey', cls:'monk', dmul:[1, 1.05],
      k:{ hp:2.9, off:1.05, def:1, spd:9, crit:0.12 }, basic:{ n:'Stretchy Slap', cat:P }, extra:{ first:true, startSt:{ sSpd:2 } },
      script:[null, 'Rubber Reflex', 'Banana Bomb', null],
      phase:{ at:0.5, title:'GEAR FOURTH', shield:0.15, script:['Stretchy Barrage', 'Rubber Reflex', 'Banana Bomb', 'Stretchy Psi Gatling'], offUp:1, heal:0.1, say:'Monkey D. Monk inflates his arms like balloons. "GEAR... FOURTH!"',
              addMoves:[ { n:'Stretchy Barrage', el:'psychic', cat:P, pow:25, hits:6, exposeCh:0.15, s:50, t:'foe' } ] },
      moves:[ { n:'Stretchy Mind Bell', el:'psychic', cat:P, pow:30, s:30, t:'foes', confuse:0.6 },
              { n:'Stretchy Psi Gatling', el:'psychic', cat:P, pow:20, hits:5, s:40, t:'foe', exposeCh:0.2 },
              { n:'Gear Psychic', el:'psychic', pow:0, s:30, t:'self', offUp:1, haste:1 },
              { n:'MEAT!', el:'neutral', pow:0, s:35, t:'self', healPct:0.3 },
              { n:'Rubber Reflex', el:'psychic', pow:0, s:30, t:'self', counter:{ pow:50 } },
              { n:'Banana Bomb', el:'psychic', pow:0, s:45, t:'foe', bomb:{ pow:50, stun:0.4 } } ] })],
  // 8. The Ascended Protagonist: he came back stronger. Acts twice. Gets a friendship power-up at half HP.
  (w, L) => { const h = bossUnit(w, L, { name:'Ascended Protagonist', el:'light', spr:'b_ascended', cls:'fighter', dmul:[1.15, 1.15],
      k:{ hp:2.6, off:0.85, def:1.0, spd:6, sta:140, crit:0.08 }, basic:{ n:'Divine Sword Poke', cat:P, pow:35 }, extra:{ twice:false },
      script:[null, "Heaven's Charge", 'Omega Overslash Infinity', 'Cutscene Counter', 'Orbital Friend Cannon', null],
      moves:[ { n:'Omega Overslash Infinity', el:'light', cat:P, pow:32, hits:3, s:55, t:'foe', critBonus:0.1 },
              { n:"Heaven's Spiky Hair", el:'light', cat:S, pow:40, s:45, t:'foes', blind:0.3 },
              { n:'Plot Armor EX', el:'neutral', pow:0, s:55, t:'self', shieldPct:0.22 },
              { n:'The Final Monologue', el:'light', pow:0, s:55, t:'foes', weaken:1 },
              { n:"Heaven's Charge", el:'light', pow:0, s:40, t:'self', charge:true },
              { n:'Cutscene Counter', el:'light', pow:0, s:35, t:'self', counter:{ pow:45 } },
              { n:'Orbital Friend Cannon', el:'light', pow:0, s:60, t:'foe', bomb:{ pow:70, stun:0.3 } } ] });
    h.phase = { at:0.5, title:'POWER OF FRIENDSHIP', offUp:1, heal:0.15, revive:0.35, extra:{ twice:true },
      say:'The Ascended Protagonist remembers his friends! They get back up, the music swells, and he starts acting twice a turn.' };
    const team = [h, side(w, L, 'light', 'cleric', 0.4), side(w, L, 'fire', 'mage', 0.4), side(w, L, 'lightning', 'rogue', 0.4)];
    h.teamRef = team; return team; }
];
// Realm 2 bosses (Genre Hop). Same boss tricks as Realm 1 (scripts, phases, bombs, counters), one world each.
const named = (u, name) => { u.name = name; return u; };
function boss2(w, L, i, o) { const b = BOSS_INFO[i], u = bossUnit(w, L, { name:b.name, el:b.els[0], spr:b.spr, ...o }); u.el2 = b.els[1]; u.el3 = b.els[2]; return u; }
function rat(w, L) { const u = normalEnemy(w, Math.max(1, L - 2), 'dark', 'goblin'); u.name = 'Plague Rat'; u.base.hp *= 0.45; u.base.off *= 0.75; derive(u); u.hp = u.max; return u; }
const BOSSES2 = [
  // 1. Lance Skydancer: a duelist. Deflects, lifts and pushes; trusts the Force at half HP.
  (w, L) => { const h = boss2(w, L, 0, { cls:'fighter', dmul:[1, 1.15], k:{ hp:3.8, off:1.22, def:1.1, spd:8, crit:0.12 }, basic:{ n:'Crystal Jab', cat:P },
      script:[null, 'Deflect Stance', 'Force Lift', 'Saber Throw'],
      phase:{ at:0.5, title:'TRUST THE FORCE', shield:0.15, script:['Deflect Stance', 'Force Wave', 'Force Lift', 'Saber Throw'], offUp:1, say:'Lance Skydancer closes his eyes. "I can feel it." The crystal blade burns white.',
              addMoves:[ { n:'Force Wave', el:'psychic', cat:S, pow:45, s:45, t:'foes' } ] },
      moves:[ { n:'Crystal Slash', el:'light', cat:P, pow:30, hits:2, s:25, t:'foe' },
              { n:'Mind Push', el:'psychic', cat:S, pow:35, s:30, t:'foe', staDrain:30 },
              { n:'Force Lift', el:'psychic', pow:0, s:40, t:'foe', stun:1 },
              { n:'Deflect Stance', el:'light', pow:0, s:30, t:'self', counter:{ pow:60 } },
              { n:'Saber Throw', el:'light', cat:P, pow:75, s:40, t:'foe' } ] });
    const team = [h, named(side(w, L, 'psychic', 'cleric', 0.45), 'Padawan')]; h.teamRef = team; return team; },
  // 2. High Noon: always first, a six-gun, and a telegraphed killing shot every few rounds.
  (w, L) => { const h = boss2(w, L, 1, { cls:'ranger', dmul:[0.95, 1], k:{ hp:1.8, off:1.0, def:0.95, spd:11, crit:0.15 }, basic:{ n:'Quickdraw', cat:P }, extra:{ first:true },
      script:['Dust Cloud', 'Six-Shooter', 'High Noon Draw', null],
      phase:{ at:0.5, title:'DUEL AT SUNDOWN', shield:0.15, script:['Six-Shooter', 'High Noon Draw', 'Dust Cloud', 'Fan the Hammer'], offUp:1, say:'High Noon: "Sun\'s going down, partner." He pulls his hat low and the sky turns orange.',
              addMoves:[ { n:'Fan the Hammer', el:'fire', cat:P, pow:16, hits:8, s:55, t:'foe' } ] },
      moves:[ { n:'Six-Shooter', el:'fire', cat:P, pow:22, hits:6, s:35, t:'foe' },
              { n:'Dust Cloud', el:'earth', cat:P, pow:25, s:35, t:'foes', blind:0.7 },
              { n:'Tumbleweed Trap', el:'earth', cat:P, pow:35, s:30, t:'foe', stun:0.4 },
              { n:'High Noon Draw', el:'fire', pow:0, s:50, t:'foe', bomb:{ pow:90 } } ] });
    const team = [h, named(side(w, L, 'earth', 'rogue', 0.5), 'Outlaw Deputy')]; h.teamRef = team; return team; },
  // 3. Piper Ratty: her rat crew gets her songs. At half HP the encore brings fallen rats back.
  (w, L) => { const h = boss2(w, L, 2, { cls:'bard', dmul:[1, 1.1], k:{ hp:3.0, off:1.0, def:1, spd:7, sta:130 }, basic:{ n:'Fiddle Whack', cat:S },
      script:['Sea Shanty', null, 'Cannon Chorus', 'Healing Hornpipe'],
      phase:{ at:0.5, title:'ENCORE!', shield:0.15, revive:0.4, script:['Sea Shanty', 'Cannon Chorus', 'Healing Hornpipe', 'Rat Rondo'], offUp:1, say:'Piper Ratty: "Encore, me hearties!" Every rat in the harbor scrambles back to its feet.' },
      moves:[ { n:'Sea Shanty', el:'water', pow:0, s:30, t:'allies', offUp:1, haste:1 },
              { n:'Healing Hornpipe', el:'life', pow:0, s:35, t:'allies', healPct:0.2, regen:[0.1, 3] },
              { n:'Cannon Chorus', el:'water', cat:S, pow:45, s:40, t:'foes', slow:1 },
              { n:'Rat Rondo', el:'life', cat:S, pow:55, s:25, t:'foe' } ] });
    h.summon = { every:3, make:() => rat(w, L), title:'RAT CALL', say:'Piper Ratty whistles a tune, and a fresh Plague Rat scurries in!' };
    const team = [h, rat(w, L), rat(w, L)]; h.teamRef = team; return team; },
  // 4. Matilda: poison, curses, and her husband's head as a bomb. Her vows bring her back at the brink.
  (w, L) => { const h = boss2(w, L, 3, { cls:'sorcerer', dmul:[0.95, 1.2], k:{ hp:2.6, off:1.05, def:1, spd:6, sta:120 }, basic:{ n:'Veil Whip', cat:S },
      script:["Widow's Curse", 'Toss the Head', 'Soggy Embrace', null],
      phase:{ at:0, title:'TILL DEATH DO US PART', shield:0.15, script:['Toss the Head', "Widow's Curse", 'Drain the Living', 'Soggy Embrace'], offUp:1, say:'Matilda: "Till death do us part." She rises again, mascara running, vows still on her lips.',
              addMoves:[ { n:'Drain the Living', el:'dark', cat:S, pow:55, s:45, t:'foe', leech:0.5 } ] },
      moves:[ { n:"Widow's Curse", el:'dark', cat:S, pow:40, s:30, t:'foe', poison:1, poisonP:true, blind:0.4 },
              { n:'Soggy Embrace', el:'water', cat:S, pow:40, s:40, t:'foes', slow:1 },
              { n:'Toss the Head', el:'dark', pow:0, s:50, t:'foe', bomb:{ pow:65, stun:0.4 } },
              { n:'Dress Drip', el:'water', pow:0, s:30, t:'self', healPct:0.15, regen:[0.1, 3] } ] });
    h.undying = { pct:0.35, phase:true, title:'TILL DEATH', say:'Matilda falls... then her eyes snap open. Her vows hold her together.' };
    const team = [h, named(side(w, L, 'dark', 'bulwark', 0.55), 'Ghost Groom')]; h.teamRef = team; return team; },
  // 5. Soldier 67: marks a target, rains pulse fire, patches himself up.
  (w, L) => { const h = boss2(w, L, 4, { cls:'ranger', dmul:[1.1, 1], k:{ hp:3.3, off:1.12, def:1.1, spd:7, sta:120, crit:0.12 }, basic:{ n:'Pulse Burst', cat:P },
      script:['Tactical Mark', 'Pulse Barrage', 'Rocket Salvo', 'Field Medic'],
      phase:{ at:0.5, title:'LAST MISSION', shield:0.15, script:['Tactical Mark', 'Pulse Barrage', 'Rocket Salvo', 'Helix Burst'], offUp:1, say:'Soldier 67 reloads. "One more mission. They always say that."',
              addMoves:[ { n:'Helix Burst', el:'lightning', cat:P, pow:50, s:40, t:'foes', para:0.3, paraP:true } ] },
      moves:[ { n:'Tactical Mark', el:'light', pow:0, s:25, t:'foe', mark:2 },
              { n:'Pulse Barrage', el:'lightning', cat:P, pow:24, hits:4, s:35, t:'foe', para:0.3 },
              { n:'Rocket Salvo', el:'lightning', pow:0, s:50, t:'foe', bomb:{ pow:70, para:0.4 } },
              { n:'Field Medic', el:'light', pow:0, s:35, t:'self', healPct:0.15, regen:[0.1, 3] } ] });
    const team = [h, named(side(w, L, 'lightning', 'ranger', 0.5), 'Sentry Drone')]; h.teamRef = team; return team; },
  // 6. Roxxane Candy: every Crescendo makes her louder. Kill her before the song builds.
  (w, L) => { const h = boss2(w, L, 5, { cls:'bard', dmul:[1, 1.15], k:{ hp:4.0, off:1.15, def:1, spd:8, sta:130 }, basic:{ n:'Pick Strike', cat:P },
      script:['Crescendo', 'Power Chord', 'Feedback', 'Stage Dive'],
      phase:{ at:0.5, title:'GUITAR SOLO', shield:0.15, script:['Crescendo', 'Encore Solo', 'Feedback', 'Crescendo'], offUp:1, haste:1, say:'Roxxane Candy rips the guitar over her head. "THIS ONE\'S FOR THE SPRINKLES!"',
              addMoves:[ { n:'Encore Solo', el:'psychic', cat:S, pow:25, hits:4, s:45, t:'foe' } ] },
      moves:[ { n:'Power Chord', el:'earth', cat:S, pow:35, s:30, t:'foes' },
              { n:'Crescendo', el:'psychic', pow:0, s:25, t:'self', offUp:1 },
              { n:'Feedback', el:'psychic', cat:S, pow:20, s:35, t:'foes', confuse:0.6, confuseP:true },
              { n:'Stage Dive', el:'earth', cat:P, pow:70, s:35, t:'foe' } ] });
    const team = [h, named(side(w, L, 'life', 'cleric', 0.45), 'Backup Singer')]; h.teamRef = team; return team; },
  // 7. The Janitor: a very slow, very sticky tank. Wet floors, cones, and a mop that hits hard.
  (w, L) => { const h = boss2(w, L, 6, { cls:'bulwark', dmul:[1.2, 1], k:{ hp:2.7, off:1.2, def:1.15, spd:4, sta:130 }, basic:{ n:'Mop Slap', cat:P, pow:45 },
      script:['Hazard Cone', 'Wet Floor', 'Mop Swing', null],
      phase:{ at:0.4, title:'OVERTIME', shield:0.15, heal:0.2, script:['Hazard Cone', 'Mop Swing', 'Wet Floor', 'Clean Up'], offUp:1, say:'The Janitor sighs and rolls up his sleeves. "I\'m on the clock until this is clean."' },
      moves:[ { n:'Mop Swing', el:'earth', cat:P, pow:60, s:30, t:'foe' },
              { n:'Wet Floor', el:'life', cat:S, pow:25, s:35, t:'foes', slow:1, para:0.3 },
              { n:'Hazard Cone', el:'earth', pow:0, s:30, t:'self', selfTaunt:2, armor:1 },
              { n:'Clean Up', el:'life', pow:0, s:30, t:'self', healPct:0.15, regen:[0.1, 3] },
              { n:'Caution Sign', el:'earth', pow:0, s:35, t:'self', counter:{ pow:50 } } ] });
    const team = [h, named(side(w, L, 'life', 'ranger', 0.5), 'Mutant Sprout')]; h.teamRef = team; return team; },
  // 8. The Narrator: foreshadows his big hits a round early, and a deus ex machina at the end.
  (w, L) => { const h = boss2(w, L, 7, { cls:'sorcerer', dmul:[1, 1.2], k:{ hp:2.4, off:0.95, def:1, spd:8, sta:150, crit:0.08 }, basic:{ n:'Paper Cut', cat:S },
      script:[null, 'Foreshadowing', 'Spoiler Alert', 'Plot Twist', 'Retcon'],
      phase:{ at:0.5, title:'THE CLIMAX', shield:0.2, script:['Foreshadowing', 'Retcon', 'Ink Blot', 'Spoiler Alert', 'Plot Twist'], offUp:1, say:'The Narrator: "And now, the exciting part." The pages begin to burn at the edges.',
              addMoves:[ { n:'Ink Blot', el:'dark', cat:S, pow:35, s:40, t:'foes', poison:1 } ] },
      moves:[ { n:'Plot Twist', el:'dark', cat:S, pow:55, s:30, t:'foe', confuse:0.5, confuseP:true },
              { n:'Bad Review', el:'light', cat:S, pow:40, s:35, t:'foes', blind:0.4 },
              { n:'Spoiler Alert', el:'light', pow:0, s:30, t:'self', spoiler:true },
              { n:'Retcon', el:'psychic', pow:0, s:35, t:'self', retcon:true },
              { n:'Foreshadowing', el:'psychic', pow:0, s:50, t:'foe', bomb:{ pow:75, stun:0.3 } },
              { n:'Plot Armor', el:'light', pow:0, s:35, t:'self', shieldPct:0.3, armor:1 } ] });
    h.undying = { pct:0.3, shield:0.1, title:'DEUS EX MACHINA', say:'The Narrator: "And just when all seemed lost..." A golden crane lowers him back onto the stage.' };
    const team = [h, named(side(w, L, 'psychic', 'cleric', 0.3), 'Editor'), named(side(w, L, 'dark', 'rogue', 0.3), 'Critic')]; h.teamRef = team; return team; }
];
// Realm 3 bosses (World Domination). New tricks: boomerangs that come back (rang), arrows that cycle elements (rainbow),
// abductions (abduct), executive orders (decree), sabers that fizzle (fizzle) and the Sun's rising heat (heat).
if (typeof SPR !== "undefined") SPR.corgi = [
  "................",
  "................",
  "..R...R.........",
  ".kRk.kRk........",
  ".kook.kok.......",
  "kooookook.......",
  "koroooorok......",
  "kwoooooook...kk.",
  ".kwwwoooook.kok.",
  "..kwwoooooookok.",
  "..kwwwoooooooook",
  "..kwwwwwoooooook",
  "...kkwwwwwwwwkk.",
  "...kwk.kkk.kwk..",
  "...kwk.....kwk..",
  "...kk......kk..."
];
const SUN_LV = 7;   // the Sun sits this many levels above the Moon's base boss level
function boss3(w, L, info, o) { const u = bossUnit(w, L, { name:info.name, el:info.els[0], spr:info.spr, ...o }); u.el2 = info.els[1]; return u; }
// A sidekick that wears its own art (a corgi, the Snow Monster) instead of a recolored class sprite.
function pet(w, L, el, cls, f, name, spr, moves, big) {
  const u = named(side(w, L, el, cls, f), name); u.spr = [[spr]]; u.role = null; u.human = false; if (big) u.art = true;
  if (moves) u.moves = moves.map(clone); return u;
}
const RAINBOW = ['fire', 'water', 'life', 'earth', 'lightning', 'light', 'dark', 'psychic'];
const BOSSES3 = [
  // 1. Japan: the fallen Protagonist. Slow and soft-hearted; he stops to eat ramen. Burst him before he refuels.
  (w, L) => { const h = boss3(w, L, REALM3_BOSSES[0], { cls:'fighter', dmul:[1.1, 1], k:{ hp:3.1, off:0.95, def:1.05, spd:3, sta:130 }, basic:{ n:'Lazy Swipe', cat:P },
      script:[null, 'Belly Flop', 'Ramen Break', 'Couch Quake'],
      phase:{ at:0.4, title:'THIS IS MY LAST FORM', shield:0.1, script:['Forgotten Limit Break', 'Belly Flop', 'Ramen Break', 'Forgotten Limit Break'], offUp:1, say:'The Protagonist drops his ramen. "I still... have one form left!" His hair spikes up, briefly.',
              addMoves:[ { n:'Forgotten Limit Break', el:'earth', cat:P, pow:55, s:40, t:'foe', berserk:1 } ] },
      moves:[ { n:'Belly Flop', el:'earth', cat:P, pow:65, s:35, t:'foe', slow:1 },
              { n:'Couch Quake', el:'earth', cat:P, pow:35, s:35, t:'foes' },
              { n:'Ramen Break', el:'water', pow:0, s:25, t:'self', healPct:0.12, regen:[0.06, 2] },
              { n:'Anime Monologue', el:'psychic', pow:0, s:30, t:'foes', weaken:1 } ] });
    return [h]; },
  // 2. United Kingdom: the Queen and two demon corgis that guard her. If the corgis fall, she stops holding back.
  (w, L) => { const h = boss3(w, L, REALM3_BOSSES[1], { cls:'fighter', dmul:[1.05, 1.05], k:{ hp:2.6, off:1.12, def:1.05, spd:7, crit:0.12 }, basic:{ n:'Royal Pommel', cat:P },
      script:['Royal Cleave', 'Knighting', 'Stiff Upper Lip', 'Knighting'],
      phase:{ alone:true, name:'The Queen, Unamused', title:'ONE IS NOT AMUSED', shield:0.15, heal:0.15, offUp:1, script:['Off With Their Heads', 'Royal Cleave', 'Knighting', 'Off With Their Heads'],
              say:'The Queen looks at her fallen corgis. Her face does not move. Her sword does.', addMoves:[ { n:'Off With Their Heads', el:'light', cat:P, pow:60, s:45, t:'foe', execute:true, critBonus:0.2 } ] },
      moves:[ { n:'Royal Cleave', el:'light', cat:P, pow:40, s:35, t:'foes' },
              { n:'Knighting', el:'light', cat:P, pow:70, s:35, t:'foe' },
              { n:'Stiff Upper Lip', el:'light', pow:0, s:30, t:'self', shieldPct:0.2 } ] });
    const corgi = () => { const c = pet(w, L, 'dark', 'rogue', 0.38, 'Demon Corgi', 'corgi',
        [ { n:'Royal Guard', el:'dark', pow:0, s:20, t:'ally', guard:2 }, { n:'Ankle Bite', el:'dark', cat:P, pow:40, s:20, t:'foe', bonusVs:'burn' }, { n:'Hellbark', el:'fire', cat:S, pow:25, s:25, t:'foes', burn:0.3 } ]);
      c.favor = 'fighter'; c.script = ['Royal Guard', 'Ankle Bite', 'Hellbark']; return c; };
    const team = [h, corgi(), corgi()]; h.teamRef = team; return team; },
  // 3. Africa: the Lion King taunts and soaks the hits while his two clerics heal and shield him. Break the wall or go around it.
  (w, L) => { const h = boss3(w, L, REALM3_BOSSES[2], { cls:'bulwark', dmul:[1.15, 1], k:{ hp:3.3, off:1.05, def:1.2, spd:4, sta:130 }, basic:{ n:'Shield Shove', cat:P },
      script:['Pride Roar', 'Mane Hammer', null, 'Sunlit Bash'],
      phase:{ at:0.5, title:'KING OF THE PRIDE', shield:0.15, offUp:1, script:['Pride Roar', 'Stampede', 'Mane Hammer', 'Sunlit Bash'], say:'The Lion King roars, and the whole savanna roars with him.',
              addMoves:[ { n:'Stampede', el:'earth', cat:P, pow:45, s:40, t:'foes', slow:1 } ] },
      moves:[ { n:'Pride Roar', el:'light', pow:0, s:30, t:'self', selfTaunt:2, armor:1 },
              { n:'Mane Hammer', el:'earth', cat:P, pow:65, s:35, t:'foe' },
              { n:'Sunlit Bash', el:'light', cat:P, pow:40, s:30, t:'foe', stun:0.35 } ] });
    const cl = () => { const c = named(side(w, L, 'life', 'cleric', 0.42), 'Pride Cleric'); c.favor = 'bulwark'; return c; };
    const team = [h, cl(), cl()]; h.teamRef = team; return team; },
  // 4. Australia: Boomer Rang. His boomerang hits on the throw, then comes back at the end of the round. Plus dynamite.
  (w, L) => { const h = boss3(w, L, REALM3_BOSSES[3], { cls:'ranger', dmul:[1, 1], k:{ hp:2.7, off:1.12, def:1.0, spd:8, crit:0.12 }, basic:{ n:'Thong Slap', cat:P },
      script:['Big Boomerang', 'Dynamite', 'Croc Wrestle', 'Big Boomerang'],
      phase:{ at:0.5, title:'NO WORRIES', shield:0.15, offUp:1, script:['Double Boomerang', 'Dynamite', 'Big Boomerang', 'Croc Wrestle'], say:'Boomer Rang pulls out a second boomerang. "She\'ll be right, mate!"',
              addMoves:[ { n:'Double Boomerang', el:'fire', cat:P, pow:30, hits:2, s:45, t:'foe', rang:50 } ] },
      moves:[ { n:'Big Boomerang', el:'fire', cat:P, pow:50, s:35, t:'foe', rang:40 },
              { n:'Dynamite', el:'fire', pow:0, s:45, t:'foe', bomb:{ pow:65, burn:0.4 } },
              { n:'Croc Wrestle', el:'earth', cat:P, pow:40, s:30, t:'foe', stun:0.3 } ] });
    const team = [h, named(side(w, L, 'earth', 'fighter', 0.45), 'His Mate Dazza')]; h.teamRef = team; return team; },
  // 5. Antarctica: the Frost Queen freezes and drains stamina. Her Snow Monster hits hard and she rebuilds it every few rounds.
  (w, L) => { const h = boss3(w, L, REALM3_BOSSES[4], { cls:'sorcerer', dmul:[0.95, 1.2], k:{ hp:2.2, off:1.0, def:1.05, spd:6, sta:150 }, basic:{ n:'Ice Shard', cat:S },
      script:['Blizzard', 'Flash Freeze', 'Frostbite', 'Ice Mirror'],
      phase:{ at:0.5, title:'ETERNAL WINTER', shield:0.15, offUp:1, script:['Absolute Zero', 'Frostbite', 'Flash Freeze', 'Blizzard'], say:'The Frost Queen raises her hands. The sun goes out behind the clouds.',
              addMoves:[ { n:'Absolute Zero', el:'water', cat:S, pow:45, s:50, t:'foes', stun:0.2, stunP:true } ] },
      moves:[ { n:'Flash Freeze', el:'water', cat:S, pow:35, s:35, t:'foe', stun:0.35 },
              { n:'Blizzard', el:'water', cat:S, pow:30, s:35, t:'foes', staDrain:20 },
              { n:'Frostbite', el:'water', cat:S, pow:40, s:30, t:'foe', staDrain:35, slow:1 },
              { n:'Ice Mirror', el:'water', pow:0, s:30, t:'self', shieldPct:0.25 } ] });
    const snow = () => { const m = pet(w, L, 'water', 'bulwark', 0.6, 'Snow Monster', 'b_snowmonster',
        [ { n:'Avalanche Slam', el:'water', cat:P, pow:65, s:35, t:'foe' }, { n:'Icy Roar', el:'water', pow:0, s:30, t:'foes', weaken:1, slow:1 } ], true);
      m.script = ['Avalanche Slam', 'Icy Roar', 'Avalanche Slam']; return m; };
    h.summon = { every:5, make:snow, title:'SNOW MONSTER', say:'The Frost Queen sculpts a fresh Snow Monster out of the blizzard!' };
    const team = [h, snow()]; h.teamRef = team; return team; },
  // 6. Tropical Forests: Arabella Rain-bow. Every Rainbow Arrow is the next color of the rainbow (shown on the move).
  (w, L) => { const h = boss3(w, L, REALM3_BOSSES[5], { cls:'ranger', dmul:[1, 1.05], k:{ hp:3.0, off:1.15, def:1.0, spd:10, crit:0.15 }, basic:{ n:'Leaf Flick', cat:P },
      script:['Rainbow Arrow', 'Vine Snare', 'Rainbow Arrow', 'Canopy Cover'],
      phase:{ at:0.5, title:'DOUBLE RAINBOW', shield:0.15, offUp:1, script:['Double Rainbow', 'Rainbow Arrow', 'Vine Snare', 'Double Rainbow'], say:'Arabella gasps. "A double rainbow... all the way across the sky!"',
              addMoves:[ { n:'Double Rainbow', el:'water', cat:P, pow:35, hits:2, s:45, t:'foes', rainbow:RAINBOW } ] },
      moves:[ { n:'Rainbow Arrow', el:'fire', cat:P, pow:60, s:30, t:'foe', rainbow:RAINBOW },
              { n:'Vine Snare', el:'life', cat:P, pow:30, s:30, t:'foe', stun:0.35, poison:0.5 },
              { n:'Canopy Cover', el:'life', pow:0, s:30, t:'self', healPct:0.12, regen:[0.08, 3] } ] });
    const team = [h, named(side(w, L, 'psychic', 'rogue', 0.42), 'Parrot Scout')]; h.teamRef = team; return team; },
  // 7. USA: Mr. President. Every few rounds he signs an Executive Order (a random rule that hurts you or helps him).
  (w, L) => { const h = boss3(w, L, REALM3_BOSSES[6], { cls:'bard', dmul:[1, 1.1], k:{ hp:3.0, off:1.1, def:1.05, spd:7, sta:150 }, basic:{ n:'Gavel Tap', cat:S },
      script:['Executive Order', 'Lightning Rally', 'Presidential Veto', 'Stump Speech'],
      phase:{ at:0.5, title:'STATE OF EMERGENCY', shield:0.2, offUp:1, script:['Executive Order', 'Air Strike', 'Lightning Rally', 'Presidential Veto'], say:'Mr. President picks up the red phone. "Yes. All of it. Now."',
              addMoves:[ { n:'Air Strike', el:'lightning', pow:0, s:50, t:'foe', bomb:{ pow:75, stun:0.3 } } ] },
      moves:[ { n:'Executive Order', el:'light', pow:0, s:30, t:'self', decree:true },
              { n:'Lightning Rally', el:'lightning', cat:S, pow:40, s:35, t:'foes', para:0.3 },
              { n:'Presidential Veto', el:'light', cat:S, pow:60, s:35, t:'foe', dispel:true },
              { n:'Stump Speech', el:'light', pow:0, s:30, t:'allies', offUp:1 } ] });
    const ss = () => { const c = named(side(w, L, 'dark', 'fighter', 0.42), 'Secret Service'); c.favor = 'bard';
      c.moves = [...c.moves.slice(-3), { n:'Take the Bullet', el:'dark', pow:0, s:20, t:'ally', guard:2 }]; return c; };
    const team = [h, ss(), ss()]; h.teamRef = team; return team; },
  // 8. The Moon's Champion: the Sun. Its heat rises every round (a clock), Solar Flare is telegraphed, and at half HP: eclipse.
  (w, L) => { const h = boss3(w, L, REALM3_BOSSES[7], { cls:'sorcerer', dmul:[1.05, 1.15], k:{ hp:4.6, off:1.12, def:1.1, spd:6, sta:170 }, basic:{ n:'Sunburn', cat:S },
      script:['Corona', 'Solar Flare', 'Sunbeam', 'Fusion Core'],
      phase:{ at:0.5, name:'The Eclipsed Sun', title:'TOTAL ECLIPSE', shield:0.2, offUp:1, extra:{ el:'dark', el2:'fire' },
              script:['Umbra', 'Totality', 'Black Corona', 'Umbra'], say:'The Moon slides across the Sun\'s face. The light goes out... and something colder burns behind it.',
              moves:[ { n:'Umbra', el:'dark', cat:S, pow:40, s:35, t:'foes', blind:0.4 },
                      { n:'Black Corona', el:'dark', cat:S, pow:65, s:35, t:'foe' },
                      { n:'Totality', el:'dark', pow:0, s:50, t:'foe', bomb:{ pow:85, stun:0.3 } },
                      { n:'Sunbeam', el:'light', cat:S, pow:55, s:35, t:'foe' } ] },
      moves:[ { n:'Corona', el:'fire', cat:S, pow:35, s:35, t:'foes', burn:0.4, burnP:true },
              { n:'Solar Flare', el:'fire', pow:0, s:50, t:'foe', bomb:{ pow:85, burn:0.5, burnP:true } },
              { n:'Sunbeam', el:'light', cat:S, pow:60, s:35, t:'foe' },
              { n:'Fusion Core', el:'fire', pow:0, s:35, t:'self', healPct:0.08, shieldPct:0.1 } ] });
    h.art = true; h.heat = { n:0, step:0.02, max:0.1 };
    return [h]; }
];
// The Elite 4, back to back on the Moon (between them only the usual after-fight revive and 15% heal).
const MOON_FIGHTS = [
  // 1. Nellie Strongarms: low-gravity grabs lift a slime out of the fight for a round; her punches grow as she gets hurt.
  (w, L) => { const h = boss3(w, L, MOON_ELITE[0], { cls:'monk', dmul:[1.05, 1], k:{ hp:3.3, off:1.12, def:1.1, spd:9, crit:0.12 }, basic:{ n:'Jab', cat:P },
      script:['Low-G Grab', 'Rocket Punch', 'Moonwalk Combo', null],
      phase:{ at:0.5, title:'MAX REPS', shield:0.15, offUp:1, extra:{ first:true }, script:['Low-G Grab', 'Rocket Punch', 'Rocket Punch', 'Moonwalk Combo'], say:'Nellie tightens her ponytail. "Okay. Warm-up\'s over."' },
      moves:[ { n:'Low-G Grab', el:'light', cat:P, pow:30, s:35, t:'foe', stun:1 },
              { n:'Rocket Punch', el:'light', cat:P, pow:60, s:35, t:'foe', berserk:0.5 },
              { n:'Moonwalk Combo', el:'light', cat:P, pow:20, hits:4, s:35, t:'foe' },
              { n:'Spot Me', el:'light', pow:0, s:30, t:'self', healPct:0.12, offUp:1 } ] });
    return [h]; },
  // 2. The Protagonist, redeemed, with Claire Rick healing and Cantmiss freezing. The full party, one last time.
  (w, L) => { const h = boss3(w, L, MOON_ELITE[1], { cls:'fighter', dmul:[1.1, 1.05], k:{ hp:2.0, off:1.05, def:1.05, spd:7, crit:0.1 }, basic:{ n:'Hero Strike', cat:P },
      script:['Comeback Slash', 'Training Arc', 'Omega Overslash II', null],
      phase:{ at:0.5, title:'MAIN CHARACTER ENERGY', shield:0.15, offUp:1, revive:0.25, script:['Omega Overslash II', 'Comeback Slash', 'Training Arc', 'Comeback Slash'], say:'The Protagonist: "This time, I don\'t fight alone!" His friends get back up.' },
      moves:[ { n:'Comeback Slash', el:'earth', cat:P, pow:65, s:35, t:'foe' },
              { n:'Training Arc', el:'earth', pow:0, s:30, t:'self', offUp:1, healPct:0.1 },
              { n:'Omega Overslash II', el:'light', cat:P, pow:45, s:45, t:'foes' } ] });
    const claire = boss3(w, L - 1, { ...REALM1_BOSSES[5], els:['light'] }, { cls:'cleric', dmul:[1, 1.2], k:{ hp:1.0, off:0.8, def:0.95, spd:5, sta:150 }, basic:{ n:'Staff Bonk', cat:S },
      moves:[ { n:'Heal (Finally)', el:'light', pow:0, s:40, t:'ally', healPct:0.18 },
              { n:'Holy Bubble', el:'light', pow:0, s:35, t:'allies', shieldPct:0.1 },
              { n:'Smite', el:'light', cat:S, pow:45, s:30, t:'foe' } ] });
    const cant = boss3(w, L - 1, { ...REALM1_BOSSES[1], els:['water'] }, { cls:'ranger', dmul:[0.95, 1.1], k:{ hp:1.0, off:0.95, def:0.9, spd:10, crit:0.12 }, basic:{ n:'Quick Shot', cat:P },
      script:['Mark Prey', 'Freeze Arrow', 'Freeze Arrow'],
      moves:[ { n:'Freeze Arrow', el:'water', cat:P, pow:40, s:30, t:'foe', stun:0.35 },
              { n:'Mark Prey', el:'water', pow:0, s:25, t:'foe', mark:2 } ] });
    claire.small = cant.small = true; claire.favor = 'fighter';
    const team = [h, claire, cant]; h.teamRef = team; return team; },
  // 3. Glorb: beams a slime up for two rounds (it can't act and can't be hit), copies nothing, probes everything.
  (w, L) => { const h = boss3(w, L, MOON_ELITE[2], { cls:'mage', dmul:[0.95, 1.15], k:{ hp:2.9, off:1.2, def:1.0, spd:9, sta:150 }, basic:{ n:'Antenna Zap', cat:S },
      script:['Abduct', 'Raygun', 'Probe', 'Raygun'],
      phase:{ at:0.5, title:'MOTHERSHIP', shield:0.2, offUp:1, script:['Abduct', 'Mind Melt', 'Raygun', 'Mind Melt'], say:'Glorb presses a big red button. The mothership\'s shadow falls over the Moon.',
              addMoves:[ { n:'Mind Melt', el:'psychic', cat:S, pow:40, s:40, t:'foes', confuse:0.3, confuseP:true } ] },
      moves:[ { n:'Abduct', el:'psychic', pow:0, s:40, t:'foe', abduct:2 },
              { n:'Raygun', el:'psychic', cat:S, pow:55, s:30, t:'foe' },
              { n:'Probe', el:'dark', cat:S, pow:35, s:30, t:'foe', confuse:0.5, expose:1 },
              { n:'Saucer Shield', el:'dark', pow:0, s:30, t:'self', shieldPct:0.25 } ] });
    const team = [h, named(side(w, L, 'psychic', 'rogue', 0.4), 'Grey Drone')]; h.teamRef = team; return team; },
  // 4. Dark Saber: hits like a truck when his cheap saber works. It doesn't always work.
  (w, L) => { const h = boss3(w, L, MOON_ELITE[3], { cls:'fighter', dmul:[1.15, 1], k:{ hp:3.7, off:1.25, def:1.1, spd:6, sta:130 }, basic:{ n:'Cape Swish', cat:P },
      script:['Heavy Breathing', 'Flickering Saber', 'Telekinetic Squeeze', 'Flickering Saber'],
      phase:{ at:0.4, title:'I AM YOUR... UM', shield:0.15, offUp:1, script:['Flickering Saber', 'Telekinetic Squeeze', 'Flickering Saber', 'Heavy Breathing'], say:'Dark Saber smacks the side of his saber. It hums back to life, mostly.' },
      moves:[ { n:'Flickering Saber', el:'dark', cat:P, pow:85, s:35, t:'foe', fizzle:0.3 },
              { n:'Heavy Breathing', el:'dark', cat:S, pow:25, s:30, t:'foes', weaken:1 },
              { n:'Telekinetic Squeeze', el:'dark', pow:0, s:35, t:'foe', stun:0.4, stunP:true },
              { n:'Cardboard Armor', el:'dark', pow:0, s:30, t:'self', shieldPct:0.2 } ] });
    const tr = () => { const c = named(side(w, L, 'dark', 'ranger', 0.35), 'Bucket Trooper'); c.blind = 3; return c; };   // can't see out of their buckets at first
    const team = [h, tr(), tr()]; h.teamRef = team; return team; }
];
function bossTeam(w, L, node) {
  if (REALM === 2) {
    if (isMoon(w)) { const gi = node && node.gi != null ? node.gi : MOON_FIGHTS.length;   // the Elite 4 climb in level; the Sun sits above them all
      return gi < MOON_FIGHTS.length ? MOON_FIGHTS[gi](w, L - 2 + 2 * gi) : BOSSES3[MOON_W](w, L + SUN_LV); }
    return BOSSES3[Math.min(w, BOSSES3.length - 1)](w, L);
  }
  return REALM ? BOSSES2[Math.min(w, BOSSES2.length - 1)](w, L) : BOSSES[Math.min(w, BOSSES.length - 1)](w, L);
}
function makeFoes(w, node, partySize) {
  const f = node.f, L = lvlOf(w, f);
  let foes;
  if (node.type === 'boss') foes = bossTeam(w, bossLvl(w), node);   // later bosses sit a couple of levels above their world
  else if (node.type === 'elite') foes = partySize > 1 ? [eliteEnemy(w, L + 1), normalEnemy(w, Math.max(1, L - 1))] : [eliteEnemy(w, L)];
  else {
    const size = Math.max(1, partySize);
    const n = Math.min(3, f === 0 ? Math.min(size, w === 0 ? 1 : 2) : size + (f >= 4 && Math.random() < 0.3 ? 1 : 0));
    // The map previews the lead enemy; teammates usually share its element.
    const pv = node.foe;
    const nat = nativesOf(w), pack = pv && crId(pv.role) && CREATURES[crId(pv.role)].pack ? crId(pv.role) : null;
    foes = Array.from({ length:n }, (_, i) => pv && i === 0 ? normalEnemy(w, L, pv.el, pv.role)
      : pack ? creatureEnemy(w, L, pack)   // hyenas and penguins come in packs
      : nat && Math.random() < NATIVE_RATE ? creatureEnemy(w, L, pick(nat))
      : normalEnemy(w, L, pv && Math.random() < 0.6 ? pv.el : pick(WORLDS[w].els)));
    if (REALM >= 1) foes.forEach(f => { if (Math.random() < FOE_FUSE) fuseFoe(f, w); });   // Realm 2+ brings dual-element enemies
  }
  // Only elite and boss fights get the sharp target picking; ordinary enemies swing a bit more randomly.
  if (node.type === 'boss' || node.type === 'elite') foes.forEach(e => e.smart = true);
  const seen = {};
  foes.forEach(e => { seen[e.name] = (seen[e.name] || 0) + 1; if (seen[e.name] > 1) e.name += ' ' + 'ABC'[seen[e.name] - 1]; });
  return foes;
}

/* ================= battle engine (shared by the game and the balance sim) ================= */
let FX = [];
const fx = e => { if (FX) FX.push(e); };
function heal(x, amt) { const b = x.hp; x.hp = Math.min(x.max, x.hp + Math.round(amt)); const h = x.hp - b; if (h > 0 && hasPas(x, 'ebb')) x.sta = Math.min(x.staMax, x.sta + Math.round(h * 0.25)); return h; }
const nm = x => x.name;
const offOf = a => (a.pas === 'swords' ? a.sdef : a.off) * (a.pas === 'brute' ? 1.25 : 1) * (a.pm || 1) * stMul(a.sOff || 0, a) * (has(a, 'hat') ? 1.5 : 1) * (has(a, 'cloak') ? 0.85 : 1);
const hasStatus = d => d.burn || d.poison || d.stun || d.para || d.blind || d.confuse || d.marked || d.sOff < 0 || d.sDef < 0 || d.sSDef < 0 || d.sSpd < 0;
const DEF_EXP = 0.7, DEF_REF = 11;   // see calcDmg: how strongly DEF reduces damage, and the average base DEF
function calcDmg(a, d, m, eff, crit) {
  if (a.pas === 'embody' && eff < 1) eff = 1;   // resisted hits land at full strength
  // Physical hits check DEF, special hits check SpD.
  const sp = (m.cat || a.ecat || 'p') === 's', st0 = (sp ? d.sSDef : d.sDef) || 0;
  const ds = m.pierce ? Math.min(0, st0) : st0, e = m.pierce ? Math.max(1, eff) : eff;
  // Defense is softened: the raw DEF/SpD stat counts as DEF^0.7 measured against an average DEF for that level,
  // so tanks still take noticeably less and glass cannons stop getting one-shot. Items, passives and stages apply in full.
  const rawDef = sp ? d.sdef : (d.pas === 'tricky' ? (d.sdef + d.pdef) / 2 : d.pdef), defRef = DEF_REF * mult(d.lvl || 1);
  const softDef = Math.pow(Math.max(0.1, rawDef), DEF_EXP) * Math.pow(defRef, 1 - DEF_EXP);
  const dv = (hasPas(d, 'bedrock') ? 1.25 : 1) * (d.pm || 1) * softDef * (sp ? (has(d, 'cloak') ? 1.5 : 1) : (has(d, 'armor') ? 1.5 : 1));
  // Bulk hits (Bulwark): part of the attack stat comes from the attacker's DEF instead of OFF.
  const atk = m.bulk ? offOf(a) * (1 - m.bulk) + a.pdef * stMul(a.sDef || 0, a) * (has(a, 'armor') ? 1.5 : 1) * m.bulk : offOf(a);
  let v = m.pow * (has(a, 'sword') ? 1.25 : 1) * atk / (dv * stMul(ds, d)) * mult(a.lvl) / 5 * e * (crit ? 1.5 : 1);
  if (m.berserk) v *= 1 + (m.berserk === true ? 1 : m.berserk) * (1 - Math.max(0, a.hp) / a.max);   // hits harder the more HP is missing
  if (m.bonusVs && d[m.bonusVs]) v *= 1.5;   // punishes foes already suffering that status
  if (a.charged && m.pow > 0) v *= 2;
  if (m.execute && d.hp < d.max * 0.35) v *= 1.5;
  if (a.pas === 'opportunist' && hasStatus(d)) v *= 1.5;
  if (a.pas === 'volley' && m.t === 'foes') v *= 1.25;
  if (d.pas === 'embody' && m.el === d.el) v *= 0.75;
  if (hasPas(a, 'nightfall') && d.hp < d.max / 2) v *= 1.25;
  if (hasPas(d, 'hold') && d.taunt > 0) v *= 0.75;
  if (hasPas(d, 'ironbody') && d.hp > d.max / 2) v *= 0.75;
  if (hasPas(d, 'laststand') && d.hp < d.max / 2) v *= 0.75;
  if (hasPas(d, 'mountain') && m.t === 'foes') v *= 0.75;
  if (hasPas(d, 'mindwall') && sp) v *= 0.75;
  if (hasPas(a, 'grudge') && a.hp < a.max / 2) v *= 1.25;
  v *= ultraDmgMul(a, d, m, sp);
  return Math.max(1, Math.round(v));
}
function resolveTargets(a, m, target, allies, foes) {
  const af = alive(foes), aa = alive(allies);
  if (m.t === 'foes') return af;
  if (m.t === 'allies') return aa;
  if (m.t === 'self') return [a];
  if (m.t === 'fallen') { const dead = allies.filter(u => u.hp <= 0); return dead.length ? [target && target.hp <= 0 ? target : dead[0]] : []; }
  if (m.t === 'foe') {
    const taunters = af.filter(u => u.taunt > 0);
    if (taunters.length) return [target && target.taunt > 0 && target.hp > 0 ? target : taunters[0]];
    let t = af.length ? (target && target.hp > 0 ? target : pick(af)) : null;
    if (t && t.guardT > 0 && t.guardBy && t.guardBy.hp > 0) t = t.guardBy;   // a Bulwark steps in front of its ward
    return t ? [t] : [];
  }
  if (m.t === 'ally') {
    const pool = m.guard ? aa.filter(u => u !== a) : aa;   // you can't guard yourself
    if (!pool.length) return m.guard ? [] : [a];
    return [target && target.hp > 0 && pool.includes(target) ? target : pool.reduce((x, y) => x.hp / x.max < y.hp / y.max ? x : y)];
  }
  return [];
}

const BUFF_KEYS = ['shield', 'veil'], STAGES = ['sOff', 'sDef', 'sSDef', 'sSpd'];
const hasBuffs = d => BUFF_KEYS.some(k => d[k]) || STAGES.some(k => d[k] > 0);
const buffCount = d => BUFF_KEYS.filter(k => d[k]).length + STAGES.reduce((x, k) => x + Math.max(0, d[k]), 0) * 0.6;
// Dispel strips shields, veil, regen and every raised stat stage.
function dispel(d) {
  const had = hasBuffs(d) || (d.regen && d.regen.length);
  BUFF_KEYS.forEach(k => d[k] = 0); STAGES.forEach(k => { if (d[k] > 0) d[k] = 0; }); d.regen = [];
  return had;
}
// Cleanse cures status effects and resets lowered stat stages.
function cleanse(t) {
  const had = t.burn || t.poison || t.para || t.blind || t.confuse || STAGES.some(k => t[k] < 0);
  t.burn = 0; t.poison = 0; t.para = 0; t.blind = 0; t.confuse = 0; STAGES.forEach(k => { if (t[k] < 0) t[k] = 0; });
  return had;
}
// Copy a foe's debuffs onto every other living foe.
function spreadDebuffs(d, foes) {
  const keys = { burn:3, poison:4, para:3, blind:3, confuse:3 }, got = [];
  alive(foes).filter(o => o !== d).forEach(o => { Object.keys(keys).forEach(k => { if (d[k] && !o[k]) { o[k] = d[k]; got.push(k); } });
    STAGES.forEach(k => { if (d[k] < o[k] && d[k] < 0) { o[k] = d[k]; got.push(k); } }); });
  return got.length ? ['debuffs spread'] : [];
}
// Take the target's buffs for yourself.
function stealBuffs(a, d) {
  let took = false;
  BUFF_KEYS.forEach(k => { if (d[k]) { took = true; a[k] = k === 'shield' ? a.shield + d.shield : Math.max(a[k], d[k]); d[k] = 0; } });
  STAGES.forEach(k => { if (d[k] > 0) { took = true; stage(a, k, d[k]); d[k] = 0; } });
  return took;
}
// Someone in a counter stance strikes back when hit by a single-target attack.
function counterAttack(d, a, dTeam, aTeam) {
  const c = d.counter; if (!c) return '';
  let v = calcDmg(d, a, { pow:c.pow }, effVs(c.el, a), false);
  const ab = Math.min(a.shield, v); a.shield -= ab; v -= ab; a.hp -= v; a.hit = true;
  if (c.weaken) stage(a, 'sOff', -c.weaken);
  if (c.blind) a.blind = 3;
  if (c.stun && !a.stun && Math.random() < ch(d, a, c.stun, 'stun')) a.stun = 1;
  if (c.mendAlly) { const hurt = alive(dTeam).sort((x, y) => x.hp / x.max - y.hp / y.max)[0]; if (hurt) heal(hurt, v * c.mendAlly); }
  fx({ u:a, k:'dmg', v, el:c.el, small:true, ko:a.hp <= 0, tags:['COUNTER'] });
  if (--c.left <= 0) d.counter = null;
  return `countered for ${v}`;
}

// Extra effects that ride along with a move: splash, team support, self buffs, self stun.
function applyRiders(a, m, tg, total, allies, foes, out) {
  const team = alive(allies), enemies = alive(foes);
  if (m.splash && m.t === 'foe') {
    const others = enemies.filter(o => !tg.includes(o)), hits = [];
    for (const o of others) {
      let v = calcDmg(a, o, { pow:m.splash, cat:m.cat }, effVs(m.el, o), false);
      const ab = Math.min(o.shield, v); o.shield -= ab; v -= ab; o.hp -= v; o.hit = true;
      fx({ u:o, k:'dmg', v, el:m.el, small:true, ko:o.hp <= 0 }); hits.push(`${nm(o)} -${v}${o.hp <= 0 ? ' KO' : ''}`);
    }
    if (hits.length) out.push('Splash: ' + hits.join(', '));
  }
  if (m.foeStaDrain) { enemies.forEach(o => { o.sta = Math.max(0, o.sta - Math.round(o.staMax * m.foeStaDrain)); }); out.push(`foes lose ${pct(m.foeStaDrain)} STA`); }
  if (m.teamLeech && total) { let h = 0; team.forEach(u => { const x = heal(u, total * m.teamLeech); h += x; if (x) fx({ u, k:'heal', v:x }); }); if (h) out.push(`team heals ${h}`); }
  if (m.teamSta) { team.forEach(u => { u.sta = Math.min(u.staMax, u.sta + Math.round(u.staMax * m.teamSta)); }); out.push(`team +${pct(m.teamSta)} STA`); fx({ u:a, k:'num', t:'TEAM STA', c:'#f9c74f' }); }
  if (m.teamShield) { team.forEach(u => { const v = Math.round(u.max * m.teamShield); u.shield += v; fx({ u, k:'shield', v }); }); out.push('team shielded'); }
  if (m.teamHeal) { team.forEach(u => { const amt = (a.pas === 'healer' ? Math.max(...team.map(x => x.max)) : u.max) * m.teamHeal, x = heal(u, amt); if (x) fx({ u, k:'heal', v:x }); if (m.overheal && amt - x >= 1) u.shield += Math.round(amt - x); }); out.push(`team heals ${pct(m.teamHeal)}${m.overheal ? ' (extra becomes shield)' : ''}`); }
  if (m.cleanseTeam) { if (team.filter(cleanse).length) out.push('team cured'); }
  if (m.selfOffUp) out.push(`${nm(a)}'s ${stageFx(a, 'sOff', m.selfOffUp)}`);
  if (m.selfHaste) out.push(`${nm(a)}'s ${stageFx(a, 'sSpd', stN(m.selfHaste, 2))}`);
  if (m.selfArmor) { const n = stN(m.selfArmor, 1); out.push(`${nm(a)}'s ${stageFx(a, 'sDef', n)}, ${stageFx(a, 'sSDef', n)}`); }
  if (m.selfVeil) { a.veil = 3; out.push(`${nm(a)} veiled`); }
  if (m.staCharge) { const b = a.sta; a.sta = Math.min(a.staMax, a.sta + Math.round(a.staMax * m.staCharge)); if (a.sta > b) { out.push(`${nm(a)} +${a.sta - b} STA`); fx({ u:a, k:'num', t:`+${a.sta - b} STA`, c:'#f9c74f' }); } }
  if (m.selfStun) { a.stun = 1; out.push(`${nm(a)} must recover next turn`); fx({ u:a, k:'num', t:'RECOVERING', c:'#f9c74f' }); }
}

// Passives that rewrite a move: Unlimited Power (no side effects, +25% damage) and Quick Hands (+1 hit). Safe to call twice.
const POWER_STRIP = ['burn', 'poison', 'stun', 'para', 'blind', 'confuse', 'weaken', 'expose', 'slow', 'weakenCh', 'exposeCh', 'slowCh', 'dispel', 'mark', 'steal', 'spread', 'staDrain', 'leech', 'mendAlly', 'foeStaDrain', 'teamLeech', 'teamSta', 'teamShield', 'teamHeal', 'overheal', 'cleanseTeam', 'selfOffUp', 'selfHaste', 'selfArmor', 'selfVeil', 'staCharge', 'exp'];
function effMove(a, m) {
  if (!a || !m || m._e) return m;
  let r = m;
  if (a.pas === 'power' && m.pow > 0 && (m.t === 'foe' || m.t === 'foes')) { r = { ...m }; POWER_STRIP.forEach(k => delete r[k]); r.pow = Math.round(m.pow * 1.5); }
  if (a.pas === 'hands' && (m.hits || 1) > 1 && !m.d4) { if (r === m) r = { ...m }; r.hits = m.hits + 1; }
  if (r !== m) r._e = 1;
  return r;
}
// Start-of-fight passives. Call once after resetStatus and makeFoes.
/* ================= Ultra forms =================
   A rare map tile turns one slime Ultra for the rest of the run: +35% stats, boosted gear with an elemental aura,
   and a hand-made perk for its element+class combo (fused slimes pick one of their parents' perks).
   Perk effects (all optional):
     start: fight-start  { selfShield, teamShield, offUp, teamOffUp, haste, teamHaste, teamDef, teamRegen:[pct,turns], veil, foeWeaken, foeSlow }
     round: end of round { heal, healHurt, teamHeal, teamSta, shield }
     hit:   on each landed hit { burn, poison, para, blind, confuse, stun, slow, expose, weaken (chances), burnP/poisonP/paraP/blindP, leech, mend, teamLeech, staDrain }
     hurt:  when hit by an attack { reflect, burn, para, confuse (chances on the attacker) }
     dmg:   damage dealt x mult when { aoe, single, first, status, burn, poison, slowed, blinded, foeLow, lowhp }
     taken: damage taken x mult when { physical, special, aoe, highhp }
     kill:  { heal, sta, offUp }   crit: extra crit chance   endure: survives one knockout per fight at 1 HP */
const ULTRA_STAT = 1.35;
const ULTRA_PERKS = {
  // Fire: offense and burns
  fire_fighter:   { n:'Blazing Valor', d:'Starts each fight with +25% OFF. Its hits have a 25% chance to burn.', start:{ offUp:1 }, hit:{ burn:0.25 } },
  fire_cleric:    { n:'Cauterize', d:'Each round, heals the most hurt ally 6%. Its hits have a 20% chance to burn.', round:{ healHurt:0.06 }, hit:{ burn:0.2 } },
  fire_mage:      { n:'Wildfire', d:'+25% damage to burning foes. Its hits have a 30% chance to burn.', dmg:{ burn:1.25 }, hit:{ burn:0.3 } },
  fire_monk:      { n:'Fire Fists', d:'Its hits have a 25% chance to burn, and heal the most hurt ally for 10% of the damage.', hit:{ burn:0.25, mend:0.1 } },
  fire_bulwark:   { n:'Magma Plating', d:'Starts each fight with a 20% shield. Attackers have a 30% chance to be burned.', start:{ selfShield:0.2 }, hurt:{ burn:0.3 } },
  fire_bard:      { n:'Encore of Embers', d:'The whole team starts each fight with +25% OFF.', start:{ teamOffUp:1 } },
  fire_ranger:    { n:'Flaming Arrows', d:'Its hits have a 30% chance to inflict burn+. +10% crit chance.', hit:{ burn:0.3, burnP:true }, crit:0.1 },
  fire_sorcerer:  { n:'Inferno Core', d:'+25% damage with attacks that hit all foes.', dmg:{ aoe:1.25 } },
  fire_rogue:     { n:'Ember Assassin', d:'+15% crit chance. Each knockout raises its OFF by 25%.', crit:0.15, kill:{ offUp:1 } },
  // Water: bulky speed, sustain, stamina
  water_fighter:  { n:'Riptide', d:'Its hits have a 30% chance to slow. Heals 4% each round.', hit:{ slow:0.3 }, round:{ heal:0.04 } },
  water_cleric:   { n:'Wellspring Grace', d:'Each round, heals the most hurt ally 8%.', round:{ healHurt:0.08 } },
  water_mage:     { n:'Undertow', d:'+25% damage to slowed foes. Its hits drain 10 STA.', dmg:{ slowed:1.25 }, hit:{ staDrain:10 } },
  water_monk:     { n:'Flowing Form', d:'Takes 25% less physical damage. Its hits heal the most hurt ally for 15% of the damage.', taken:{ physical:0.75 }, hit:{ mend:0.15 } },
  water_bulwark:  { n:'Tidal Fortress', d:'The whole team starts each fight with a 10% shield. Gains a 5% shield each round.', start:{ teamShield:0.1 }, round:{ shield:0.05 } },
  water_bard:     { n:'Ocean Hymn', d:'Each round, the whole team regains 10 STA.', round:{ teamSta:10 } },
  water_ranger:   { n:'Tideshot', d:'Its hits have a 25% chance to slow. +25% damage to slowed foes.', hit:{ slow:0.25 }, dmg:{ slowed:1.25 } },
  water_sorcerer: { n:'Maelstrom Mind', d:'Its hits drain 10 STA. Takes 25% less special damage.', hit:{ staDrain:10 }, taken:{ special:0.75 } },
  water_rogue:    { n:'Slipstream', d:'Starts each fight with +50% SPE and a veil (attacks may miss it).', start:{ haste:2, veil:1 } },
  // Life: sustain and spreading poison
  life_fighter:   { n:'Evergreen', d:'Heals 6% each round.', round:{ heal:0.06 } },
  life_cleric:    { n:'Bloom', d:'The whole team starts each fight with 8% regen for 3 rounds.', start:{ teamRegen:[0.08, 3] } },
  life_mage:      { n:'Overgrowth', d:'Its hits have a 30% chance to poison and drain 15% of the damage as HP.', hit:{ poison:0.3, leech:0.15 } },
  life_monk:      { n:'Photosynthesis Palm', d:'Its hits heal the most hurt ally for 20% of the damage.', hit:{ mend:0.2 } },
  life_bulwark:   { n:'Ancient Oak', d:'Survives one knockout each fight with 1 HP. Heals 5% each round.', endure:true, round:{ heal:0.05 } },
  life_bard:      { n:'Song of Spring', d:'The whole team starts each fight with 6% regen for 4 rounds.', start:{ teamRegen:[0.06, 4] } },
  life_ranger:    { n:'Thornshot', d:'Its hits have a 35% chance to inflict poison+.', hit:{ poison:0.35, poisonP:true } },
  life_sorcerer:  { n:'Verdant Surge', d:'Its hits drain 20% of the damage as HP.', hit:{ leech:0.2 } },
  life_rogue:     { n:'Venom Bloom', d:'Its hits have a 25% chance to poison. +25% damage to poisoned foes.', hit:{ poison:0.25 }, dmg:{ poison:1.25 } },
  // Lightning: speed, paralysis, opening strikes
  lightning_fighter:  { n:'Thunder Charge', d:'Starts each fight with +25% SPE. Its first attack each fight deals +50% damage.', start:{ haste:1 }, dmg:{ first:1.5 } },
  lightning_cleric:   { n:'Static Renewal', d:'Each round, the whole team regains 10 STA. Its hits have a 20% chance to paralyze.', round:{ teamSta:10 }, hit:{ para:0.2 } },
  lightning_mage:     { n:'Overload', d:'Its hits have a 30% chance to inflict paralysis+.', hit:{ para:0.3, paraP:true } },
  lightning_monk:     { n:'Lightning Reflexes', d:'Starts each fight with +25% SPE. Takes 25% less physical damage.', start:{ haste:1 }, taken:{ physical:0.75 } },
  lightning_bulwark:  { n:'Grounding Rod', d:'Takes 25% less special damage. Attackers have a 30% chance to be paralyzed.', taken:{ special:0.75 }, hurt:{ para:0.3 } },
  lightning_bard:     { n:'Electric Tempo', d:'The whole team starts each fight with +25% SPE.', start:{ teamHaste:1 } },
  lightning_ranger:   { n:'Arc Shot', d:'Its hits have a 30% chance to paralyze. +10% crit chance.', hit:{ para:0.3 }, crit:0.1 },
  lightning_sorcerer: { n:'Storm Heart', d:'+25% damage with attacks that hit all foes. Its hits have a 15% chance to paralyze.', dmg:{ aoe:1.25 }, hit:{ para:0.15 } },
  lightning_rogue:    { n:'Flash Step', d:'Starts each fight with +50% SPE. Its first attack each fight deals +50% damage.', start:{ haste:2 }, dmg:{ first:1.5 } },
  // Earth: toughness and heavy single blows
  earth_fighter:  { n:'Stone Skin', d:'Takes 25% less damage while above half HP.', taken:{ highhp:0.75 } },
  earth_cleric:   { n:'Mountain Blessing', d:'The whole team starts each fight with a 12% shield.', start:{ teamShield:0.12 } },
  earth_mage:     { n:'Tectonic Focus', d:'+25% damage with single-target attacks. Its hits have a 20% chance to slow.', dmg:{ single:1.25 }, hit:{ slow:0.2 } },
  earth_monk:     { n:'Iron Palm', d:'Its hits have a 25% chance to lower DEF, and heal the most hurt ally for 10% of the damage.', hit:{ expose:0.25, mend:0.1 } },
  earth_bulwark:  { n:'Unbreakable', d:'Survives one knockout each fight with 1 HP. Takes 25% less damage from attacks that hit all foes.', endure:true, taken:{ aoe:0.75 } },
  earth_bard:     { n:'Drums of the Deep', d:'The whole team starts each fight with +25% DEF and SpD.', start:{ teamDef:1 } },
  earth_ranger:   { n:'Boulder Bolts', d:'Its hits have a 10% chance to stun and a 20% chance to slow.', hit:{ stun:0.1, slow:0.2 } },
  earth_sorcerer: { n:'Quake Core', d:'+25% damage with attacks that hit all foes. Takes 25% less physical damage.', dmg:{ aoe:1.25 }, taken:{ physical:0.75 } },
  earth_rogue:    { n:'Rockfall Ambush', d:'Its first attack each fight deals +50% damage. +10% crit chance.', dmg:{ first:1.5 }, crit:0.1 },
  // Light: protection and healing
  light_fighter:  { n:'Dawnblade', d:'Its hits heal the most hurt ally for 25% of the damage. Heals the most hurt ally 4% each round.', hit:{ mend:0.25 }, round:{ healHurt:0.04 } },
  light_cleric:   { n:'Sanctified', d:'The whole team starts each fight with a 10% shield. Each round, heals the most hurt ally 6%.', start:{ teamShield:0.1 }, round:{ healHurt:0.06 } },
  light_mage:     { n:'Radiant Lens', d:'Its hits have a 30% chance to blind. +25% damage to foes with any ailment.', hit:{ blind:0.3 }, dmg:{ status:1.25 } },
  light_monk:     { n:'Inner Sun', d:'Its hits heal the most hurt ally for 25% of the damage.', hit:{ mend:0.25 } },
  light_bulwark:  { n:'Aegis Eternal', d:'The whole team starts each fight with a 15% shield.', start:{ teamShield:0.15 } },
  light_bard:     { n:'Hymn of Dawn', d:'Each round, heals the whole team 4%.', round:{ teamHeal:0.04 } },
  light_ranger:   { n:'Sunpiercer', d:'+15% crit chance. Its hits have a 20% chance to blind.', crit:0.15, hit:{ blind:0.2 } },
  light_sorcerer: { n:'Solar Crown', d:'Its hits heal the whole team for 10% of the damage.', hit:{ teamLeech:0.1 } },
  light_rogue:    { n:'Blinding Edge', d:'Its hits have a 35% chance to inflict blind+.', hit:{ blind:0.35, blindP:true } },
  // Dark: drains and executions
  dark_fighter:   { n:'Blood Oath', d:'Its hits drain 20% of the damage as HP. +25% damage while below half HP.', hit:{ leech:0.2 }, dmg:{ lowhp:1.25 } },
  dark_cleric:    { n:'Unholy Mending', d:'Its hits drain 25% of the damage as HP. Each round, heals the most hurt ally 4%.', hit:{ leech:0.25 }, round:{ healHurt:0.04 } },
  dark_mage:      { n:'Void Hunger', d:'+25% damage to foes below half HP. Each knockout restores 15% HP and 30 STA.', dmg:{ foeLow:1.25 }, kill:{ heal:0.15, sta:30 } },
  dark_monk:      { n:'Shadow Communion', d:'Its hits heal the most hurt ally for 20% of the damage and have a 15% chance to blind.', hit:{ mend:0.2, blind:0.15 } },
  dark_bulwark:   { n:'Spite Armor', d:'Attackers take 20% of the damage they deal to it back.', hurt:{ reflect:0.2 } },
  dark_bard:      { n:'Dirge', d:'Every foe starts each fight with -25% OFF.', start:{ foeWeaken:1 } },
  dark_ranger:    { n:'Nightstalker', d:'+15% crit chance. +25% damage to foes below half HP.', crit:0.15, dmg:{ foeLow:1.25 } },
  dark_sorcerer:  { n:'Eclipse Core', d:'+25% damage with attacks that hit all foes. Its hits drain 10% of the damage as HP.', dmg:{ aoe:1.25 }, hit:{ leech:0.1 } },
  dark_rogue:     { n:'Executioner', d:'+25% damage to foes below half HP. Each knockout raises its OFF by 25%.', dmg:{ foeLow:1.25 }, kill:{ offUp:1 } },
  // Psychic: control and stamina
  psychic_fighter:  { n:'Mind Over Matter', d:'Takes 25% less special damage. Its hits have a 15% chance to confuse.', taken:{ special:0.75 }, hit:{ confuse:0.15 } },
  psychic_cleric:   { n:'Clarity', d:'Each round, the whole team regains 10 STA and the most hurt ally heals 4%.', round:{ teamSta:10, healHurt:0.04 } },
  psychic_mage:     { n:'Mindbreak', d:'+25% damage to foes with any ailment. Its hits have a 20% chance to confuse.', dmg:{ status:1.25 }, hit:{ confuse:0.2 } },
  psychic_monk:     { n:'Third Eye', d:'Takes 25% less physical damage. Its hits drain 10 STA.', taken:{ physical:0.75 }, hit:{ staDrain:10 } },
  psychic_bulwark:  { n:'Psychic Barrier', d:'Starts each fight with a 25% shield. Attackers have a 20% chance to be confused.', start:{ selfShield:0.25 }, hurt:{ confuse:0.2 } },
  psychic_bard:     { n:'Mesmerize', d:'Every foe starts each fight with -25% SPE.', start:{ foeSlow:1 } },
  psychic_ranger:   { n:'Precog Shot', d:'+20% crit chance.', crit:0.2 },
  psychic_sorcerer: { n:'Psionic Storm', d:'+25% damage with attacks that hit all foes. Its hits have a 15% chance to confuse.', dmg:{ aoe:1.25 }, hit:{ confuse:0.15 } },
  psychic_rogue:    { n:'Mind Thief', d:'Its hits drain 15 STA. Its first attack each fight deals +50% damage.', hit:{ staDrain:15 }, dmg:{ first:1.5 } }
};
const ultraPerk = u => u && u.ultra ? ULTRA_PERKS[u.ultra] || null : null;
// The combos a slime can take its Ultra perk from: its own, or (fused) either parent's.
const ultraChoices = u => u.parents ? [...new Set(u.parents.map(([e, c]) => e + '_' + c))] : [u.el + '_' + u.cls];
function makeUltra(u, key) {
  u.ultra = key; u.name = u.name.startsWith('Ultra ') ? u.name : 'Ultra ' + u.name;
  ['hp', 'off', 'pdef', 'sdef', 'spd'].forEach(k => { u.base[k] *= ULTRA_STAT; });
  const frac = u.max ? Math.max(0, u.hp) / u.max : 1; derive(u); u.hp = Math.max(1, Math.round(u.max * frac));
  return u;
}

// Perk hooks (no-ops for units without a perk).
function ultraStart(team, foes) {
  team.forEach(u => { const P = ultraPerk(u); if (!P || !P.start || u.hp <= 0) return; const s = P.start, al = alive(team);
    if (s.selfShield) u.shield += Math.round(u.max * s.selfShield);
    if (s.teamShield) al.forEach(o => { o.shield += Math.round(o.max * s.teamShield); });
    if (s.offUp) stage(u, 'sOff', s.offUp);
    if (s.teamOffUp) al.forEach(o => stage(o, 'sOff', s.teamOffUp));
    if (s.haste) stage(u, 'sSpd', s.haste);
    if (s.teamHaste) al.forEach(o => stage(o, 'sSpd', s.teamHaste));
    if (s.teamDef) al.forEach(o => { stage(o, 'sDef', s.teamDef); stage(o, 'sSDef', s.teamDef); });
    if (s.teamRegen) al.forEach(o => { o.regen = [...(o.regen || []), s.teamRegen.slice()]; });
    if (s.veil) u.veil = Math.max(u.veil || 0, s.veil + 1);
    if (s.foeWeaken) alive(foes).forEach(o => stage(o, 'sOff', -s.foeWeaken));
    if (s.foeSlow) alive(foes).forEach(o => stage(o, 'sSpd', -s.foeSlow));
    u._ua = false;
  });
}
function ultraRound(x, L) {
  const P = ultraPerk(x); if (!P || !P.round || x.hp <= 0) return; const r = P.round, team = x.teamRef || [x];
  if (r.heal) { const h = heal(x, x.max * r.heal); if (h) fx({ u:x, k:'heal', v:h, small:true }); }
  if (r.shield) x.shield += Math.round(x.max * r.shield);
  if (r.healHurt) { const w = alive(team).sort((p, q) => p.hp / p.max - q.hp / q.max)[0]; if (w && w.hp < w.max) { const h = heal(w, w.max * r.healHurt); if (h) fx({ u:w, k:'heal', v:h, small:true }); } }
  if (r.teamHeal) alive(team).forEach(o => { const h = heal(o, o.max * r.teamHeal); if (h) fx({ u:o, k:'heal', v:h, small:true }); });
  if (r.teamSta) alive(team).forEach(o => { o.sta = Math.min(o.staMax, o.sta + r.teamSta); });
}
const ULTRA_ST = [['burn', 3], ['poison', 4], ['para', 3], ['blind', 3], ['confuse', 3]];
function ultraHit(a, d, m, dmg, allies, fl) {
  const P = ultraPerk(a); if (!P || !P.hit || dmg <= 0) return; const h = P.hit;
  if (d.hp > 0) {
    ULTRA_ST.forEach(([k, n]) => { if (h[k] && !d[k] && Math.random() < ch(a, d, h[k], k)) { d[k] = n; d[k + 'P'] = !!h[k + 'P']; fl.push(`${k}${h[k + 'P'] ? '+' : ''} (ultra)`); } });
    if (h.stun && !d.stun && Math.random() < ch(a, d, h.stun, 'stun')) { d.stun = 1; fl.push('stunned (ultra)'); }
    if (h.slow && Math.random() < h.slow) stage(d, 'sSpd', -1);
    if (h.expose && Math.random() < h.expose) stage(d, 'sDef', -1);
    if (h.weaken && Math.random() < h.weaken) stage(d, 'sOff', -1);
    if (h.staDrain) { const v = Math.min(d.sta, h.staDrain); d.sta -= v; }
  }
  if (h.leech) heal(a, dmg * h.leech);
  if (h.mend) { const w = alive(allies).sort((p, q) => p.hp / p.max - q.hp / q.max)[0]; if (w) heal(w, dmg * h.mend); }
  if (h.teamLeech) alive(allies).forEach(o => heal(o, dmg * h.teamLeech));
}
function ultraHurt(d, a, dmg, fl) {   // returns damage reflected to the attacker
  const P = ultraPerk(d); if (!P || !P.hurt || dmg <= 0) return 0; const h = P.hurt; let r = 0;
  if (h.reflect) { r = Math.max(1, Math.round(dmg * h.reflect)); a.hp -= r; }
  [['burn', 3], ['para', 3], ['confuse', 3]].forEach(([k, n]) => { if (h[k] && !a[k] && Math.random() < h[k]) { a[k] = n; a[k + 'P'] = false; fl.push(`${nm(a)} ${k} (ultra)`); } });
  return r;
}
function ultraKill(a) {
  const P = ultraPerk(a); if (!P || !P.kill || a.hp <= 0) return; const k = P.kill;
  if (k.heal) heal(a, a.max * k.heal);
  if (k.sta) a.sta = Math.min(a.staMax, a.sta + k.sta);
  if (k.offUp) stage(a, 'sOff', k.offUp);
}
const hasAilment = d => d.burn || d.poison || d.stun || d.para || d.blind || d.confuse || d.sOff < 0 || d.sDef < 0 || d.sSDef < 0 || d.sSpd < 0;
function ultraDmgMul(a, d, m, sp) {
  let v = 1; const A = ultraPerk(a), D = ultraPerk(d);
  if (A && A.dmg) { const g = A.dmg;
    if (g.aoe && m.t === 'foes') v *= g.aoe;
    if (g.single && m.t === 'foe') v *= g.single;
    if (g.first && a._uaNow) v *= g.first;
    if (g.status && hasAilment(d)) v *= g.status;
    if (g.burn && d.burn) v *= g.burn;
    if (g.poison && d.poison) v *= g.poison;
    if (g.slowed && d.sSpd < 0) v *= g.slowed;
    if (g.blinded && d.blind) v *= g.blinded;
    if (g.foeLow && d.hp < d.max / 2) v *= g.foeLow;
    if (g.lowhp && a.hp < a.max / 2) v *= g.lowhp; }
  if (D && D.taken) { const t = D.taken;
    if (t.physical && !sp) v *= t.physical;
    if (t.special && sp) v *= t.special;
    if (t.aoe && m.t === 'foes') v *= t.aoe;
    if (t.highhp && d.hp > d.max / 2) v *= t.highhp; }
  return v;
}
function battleStart(team, foes, node) {
  const boss = !!node && node.type === 'boss';
  team.forEach(u => {
    if (u.hp <= 0) return;
    if (u.pas === 'blessing') u.pas = 'guardian';   // old saves
    if (u.pas === 'guardian') u.teamRef = team;
    if (u.pas === 'armor') { const s = Math.round(u.max * 0.5); u.shield += s; u.passShield = s; u.passShieldT = 1; }
    if (u.pas === 'champion') u.taunt = 1;
    if (u.pas === 'defender') alive(team).forEach(o => { stage(o, 'sDef', 1); stage(o, 'sSDef', 1); o.defN = (o.defN || 0) + 1; o.defT = 3; });
  });
  foes.forEach(u => { if (u.heat) u.heat.team = team; });
  team.forEach(u => { if (ultraPerk(u)) u.teamRef = team; });
  ultraStart(team, foes);
  [team, foes].forEach(side => side.forEach(u => { if (hasPas(u, 'sanctuary')) u.teamRef = side; }));   // the Sun's heat burns your side
  // move-slot passives work for both sides
  [team, foes].forEach(side => alive(side).forEach(u => {
    u._fs = false; u._hm = false; u._oc = false;
    if (hasPas(u, 'overcharge')) { stage(u, 'sSpd', 1); u._oc = true; }
    if (hasPas(u, 'radiance')) alive(side).forEach(o => { o.shield += Math.round(o.max * 0.1); });
  }));
}

// Mr. President's Executive Order: a random rule that hurts your side or helps his.
const DECREES = [
  { n:'Mandatory Nap Time', d:'every slime loses 30 STA', f:(a, al, fo) => fo.forEach(u => { u.sta = Math.max(0, u.sta - 30); }) },
  { n:'National Speed Limit', d:'every slime is slowed', f:(a, al, fo) => fo.forEach(u => stage(u, 'sSpd', -1)) },
  { n:'Tax Cuts (For Him)', d:'his side gains +25% OFF', f:(a, al) => al.forEach(u => stage(u, 'sOff', 1)) },
  { n:'Security Detail', d:'his side gains a 10% shield', f:(a, al) => al.forEach(u => { u.shield += Math.round(u.max * 0.1); }) }
];
function decree(a, m, allies, foes, L) {
  a.sta -= m.s; const d = pick(DECREES);
  d.f(a, alive(allies), alive(foes).filter(u => !u.abducted));
  L.push(`${nm(a)} signs an Executive Order: "${d.n}"! (${d.d})`);
  fx({ u:a, k:'name', t:d.n, el:'light', snd:'buff' }); fx({ u:a, k:'buff', t:'EXECUTIVE ORDER' });
}
function act(a, m, target, allies, foes, L) {
  const canEnc = !a.stun && m && m.s <= a.sta;
  const r0 = act0(a, m, target, allies, foes, L);
  // Encore (Bard): songs (support or debuff moves) can play a second time for free.
  if (canEnc && !m.rest && !m._enc && !m.passive && a.hp > 0 && hasPas(a, 'encore') && (m.t === 'allies' || (m.pow === 0 && m.t !== 'self')) && (!target || target.hp > 0) && Math.random() < 0.25) {
    L.push(`${nm(a)}'s Encore! The song plays again.`); fx({ u:a, k:'name', t:'ENCORE!', el:a.el, snd:'buff' });
    act0(a, { ...m, _enc:true, s:0 }, target, allies, foes, L);
  }
  return r0;
}
function act0(a, m, target, allies, foes, L) {
  if (a._oc) { a._oc = false; stage(a, 'sSpd', -1); }
  if (a.abducted) { L.push(`${nm(a)} is still up in the saucer!`); fx({ u:a, k:'name', t:'Abducted!', el:'psychic', snd:'status' }); return; }
  if (a.stun) { a.stun--; const more = a.stun > 0; if (!more) { a.stun = 0; a.dazed = 1; } L.push(more ? `${nm(a)} is stunned and can't move! (Stun+: one more turn.)` : `${nm(a)} is stunned and can't move! (Dazed: can't be stunned again until its next turn.)`); fx({ u:a, k:'name', t:'Stunned!', el:'lightning', snd:'status' }); return; }
  a.dazed = 0;   // it got its turn: it can be stunned again
  if (a.confuse && Math.random() < (a.confuseP ? 0.6 : 0.4)) {
    const v = calcDmg(a, a, { pow:30 }, 1, false); a.hp -= v; a.hit = true;
    L.push(`${nm(a)} is confused and hurts itself for ${v}!${a.hp <= 0 ? ' KO!' : ''}`);
    fx({ u:a, k:'name', t:'Confused!', el:'psychic', snd:'status' }); fx({ u:a, k:'dmg', v, el:'psychic', small:true, ko:a.hp <= 0 }); return;
  }
  if (a.para && Math.random() < (a.paraP ? 0.5 : 0.3)) { L.push(`${nm(a)} is paralyzed and can't move!`); fx({ u:a, k:'name', t:'Paralyzed!', el:'lightning', snd:'status' }); return; }
  if (m.rest) { const b = a.sta; a.sta = Math.min(a.staMax, a.sta + Math.round(a.staMax * m.rest)); L.push(`${nm(a)} rests. +${a.sta - b} STA.`); fx({ u:a, k:'name', t:'Rest', el:'neutral', snd:'rest' }); fx({ u:a, k:'num', t:`+${a.sta - b} STA`, c:'#f9c74f' });
    if (a.pas === 'peace') { const h = heal(a, a.max * 0.2), cured = cleanse(a); if (h) fx({ u:a, k:'heal', v:h }); if (cured) fx({ u:a, k:'num', t:'CURED', c:'#ffffff' }); if (h || cured) L.push(`${nm(a)}'s inner peace heals ${h} HP${cured ? ' and cures its ailments' : ''}.`); }
    return; }
  if (m.s > a.sta) return act(a, REST, null, allies, foes, L);
  if (a.side === 'P' && !m.rest && m.tag !== 'Basic') LAST_P_MOVE = m;
  if (m.spoiler) {   // copies the last move your team used, aimed back at you
    const src = LAST_P_MOVE;
    if (!src) { L.push(`${nm(a)}: "Nothing to spoil yet."`); a.sta -= m.s; return; }
    const c = { ...clone(src), s:m.s, n:`Spoiler: ${src.n}` };
    const tg = c.t === 'foe' ? pick(alive(foes)) : c.t === 'ally' ? a : c.t === 'fallen' ? (allies.find(u => u.hp <= 0) || a) : null;
    if (c.t === 'fallen' && tg === a) c.t = 'self';
    L.push(`${nm(a)} flips ahead a few pages... SPOILER: ${src.n}!`); fx({ u:a, k:'name', t:'SPOILER!', el:'light', snd:'status' });
    return act(a, c, tg, allies, foes, L);
  }
  if (m.retcon) {   // wipes your buffs and his team's debuffs
    a.sta -= m.s;
    alive(foes).forEach(u => { dispel(u); u.counter = null; u.charged = false; u.taunt = 0; });
    alive(allies).forEach(u => { ['sOff', 'sDef', 'sSDef', 'sSpd'].forEach(k => { if (u[k] < 0) u[k] = 0; }); ['burn', 'poison', 'stun', 'para', 'blind', 'confuse', 'marked'].forEach(k => u[k] = 0); });
    L.push(`${nm(a)} used Retcon! "That never happened." Your boosts and shields are erased, and his side's ailments vanish.`);
    fx({ u:a, k:'name', t:'RETCON', el:'psychic', snd:'buff' }); return;
  }
  a._uaNow = !a._ua; a._ua = true;   // Ultra 'first attack' perks
  if (m.decree) return decree(a, m, allies, foes, L);
  if (m.fizzle && Math.random() < m.fizzle) {   // Dark Saber's cheap saber: sometimes it just turns off
    a.sta -= m.s; const v = calcDmg(a, a, { pow:20 }, 1, false); a.hp = Math.max(1, a.hp - v); a.hit = true;
    L.push(`${nm(a)} swings ${m.n}... it flickers out and he hits himself for ${v}!`);
    fx({ u:a, k:'name', t:'Fizzle!', el:'dark', snd:'weak' }); fx({ u:a, k:'dmg', v, el:'dark', small:true }); return;
  }
  if (m.rainbow) {   // Arabella: each arrow takes the next color; the move shows the color coming up
    const seq = m.rainbow, i = (a.rb || 0) % seq.length; a.rb = i + 1;
    m = { ...m, el:seq[i] }; const src = !IN_SIM && a.moves.find(x => x.n === m.n); if (src) src.el = seq[(i + 1) % seq.length];
  }
  m = effMove(a, m);
  a.counter = null;   // a counter stance lasts until your next action
  if (m.d4) { const r = 1 + Math.floor(Math.random() * 4); m = { ...m, hits:r + (a.pas === 'hands' && r > 1 ? 1 : 0) }; L.push(`${nm(a)} rolls a D4... it's a ${r}!`); }
  if ((has(a, 'hat') || has(a, 'badge')) && !a.locked) a.locked = m.n;   // Choice items lock in your first move
  const tg = resolveTargets(a, m, target, allies, foes);
  if (!tg.length) { if (m.t === 'fallen') { L.push(`${nm(a)} tried ${m.n}, but nobody is down.`); } return; }
  a.sta -= m.s;
  if (m.rang && tg[0]) a.rang = { t:1, tgt:tg[0], pow:m.rang, el:m.el, cat:m.cat, n:m.n, team:foes };   // comes back at the end of the round
  let msg = `${nm(a)} used ${m.n}!`, total = 0;
  if (m.hpCost) { const c = Math.round(a.max * m.hpCost); a.hp = Math.max(1, a.hp - c); msg += ` (paid ${c} HP)`; fx({ u:a, k:'dmg', v:c, el:'dark', small:true }); }
  fx({ u:a, k:'name', t:m.n, el:m.el, snd:m.el });
  fx({ u:a, k:'anim', m, tg:tg.slice() });
  const hostile = m.t === 'foe' || m.t === 'foes';
  if (hostile && m.pow <= 0) {
    const parts = [];
    for (const d of tg) {
      const fl = [];
      if (d.abducted) { parts.push(`${nm(d)} is out of reach`); continue; }
      if (m.burn && Math.random() < ch(a, d, m.burn, 'burn') && !d.burn) { d.burn = hasPas(a, 'kindling') ? 4 : 3; d.burnP = !!m.burnP; fl.push(m.burnP ? 'burned+' : 'burned'); }
      if (m.poison && Math.random() < ch(a, d, m.poison, 'poison') && !d.poison) { d.poison = 4; d.poisonP = !!m.poisonP; fl.push(m.poisonP ? 'poisoned+' : 'poisoned'); }
      if (m.stun && Math.random() < ch(a, d, m.stun, 'stun') && !d.stun) { d.stun = m.stunP ? 2 : 1; fl.push(m.stunP ? 'stunned+ (2 turns)' : 'stunned'); }
      if (m.para && Math.random() < ch(a, d, m.para, 'para') && !d.para) { d.para = 3; d.paraP = !!m.paraP; fl.push(m.paraP ? 'paralyzed+' : 'paralyzed'); }
      if (m.blind && Math.random() < ch(a, d, m.blind, 'blind') && !d.blind) { d.blind = 3; d.blindP = !!m.blindP; fl.push(m.blindP ? 'blinded+' : 'blinded'); }
      if (m.confuse && Math.random() < ch(a, d, m.confuse, 'confuse') && !d.confuse) { d.confuse = 3; d.confuseP = !!m.confuseP; fl.push(m.confuseP ? 'confused+' : 'confused'); }
      if (m.staDrain) { const v = Math.min(d.sta, m.staDrain); d.sta -= v; a.sta = Math.min(a.staMax, a.sta + v); if (v) fl.push(`-${v} STA`); }
      if (m.weaken) fl.push(stageFx(d, 'sOff', -m.weaken));
      if (m.expose) expKeys(m).forEach(k => fl.push(stageFx(d, k, -m.expose)));
      if (m.slow) fl.push(stageFx(d, 'sSpd', -m.slow));
      if (m.dispel && dispel(d)) fl.push('buffs removed');
      if (m.bomb) { d.bomb = { ...m.bomb, el:m.el, owner:a, t:1, team:foes }; fl.push('bomb planted'); }
      if (m.spread) fl.push(...spreadDebuffs(d, foes));
      if (m.abduct && !d.abducted && foes.filter(u => u.hp > 0 && !u.abducted).length > 1) { d.abducted = m.abduct; d.bomb = null; fl.push('beamed up'); }
      fx({ u:d, k:'num', t:(fl.join(' ') || 'missed').toUpperCase(), c:'#d17fe8', burst:m.el, snd:fl.length ? 'status' : 'weak' });
      parts.push(`${nm(d)} ${fl.join(', ') || 'shrugs it off'}`);
    }
    msg += ' ' + parts.join('; ') + '.';
  } else if (m.pow > 0) {
    const parts = [];
    // Chain moves hit the chosen foe, then bounce to random living foes (one hit each).
    const seq = m.chain ? [tg[0]] : tg;
    for (let si = 0; si < seq.length; si++) {
      const d = seq[si];
      if (m.chain && si + 1 < m.chain) { const nx = alive(foes); if (nx.length) seq.push(pick(nx)); }
      if (d.hp <= 0) continue;
      if (d.abducted) { parts.push(`${nm(d)} is up in the saucer, out of reach`); fx({ u:d, k:'num', t:'OUT OF REACH', c:'#d17fe8' }); continue; }
      const eff = effVs(m.el, d), multi = (m.hits || 1) > 1, hp0 = Math.max(0, d.hp); let dealt = 0, crits = 0, misses = 0, fl = [], thorn = 0, firstFx = true, drained = 0;
      if (m.detonate) {          // cash in remaining burn/poison as instant damage
        const left = (d.burn || 0) + (d.poison || 0);
        if (left) { const v = Math.round(d.max * 0.08 * left * 1.5); d.burn = 0; d.poison = 0; d.hp -= v; dealt += v; fl.push(`detonated ${v}`); }
      }
      for (let h = 0; h < (m.hits || 1); h++) {
        if (d.hp <= 0) break;
        if (d.hp <= 0) break;
        if (!m.sure && !a.sure && Math.random() < (a.blind ? (a.blindP ? 0.55 : 0.35) : 0) + (d.veil ? 0.3 : 0) + (m.t === 'foe' && hasPas(d, 'evasion') ? 0.25 : 0)) { misses++; continue; }
        const marked = d.marked > 0; if (marked) d.marked--;
        const crit = marked || Math.random() < critOf(a, m);
        if (crit) crits++;
        let dmg = calcDmg(a, d, m, eff, crit);
        if (hasPas(d, 'foresight') && !d._fs) { d._fs = true; dmg = Math.max(1, Math.round(dmg / 2)); fl.push('foreseen'); }
        if (!m.pierce) { const ab = Math.min(d.shield, dmg); d.shield -= ab; dmg -= ab; }
        d.hp -= dmg; dealt += dmg; d.hit = true;
        if (hasPas(d, 'retaliate') && d.taunt > 0 && dmg > 0) { const rr = Math.max(1, Math.round(dmg * 0.25)); a.hp -= rr; thorn += rr; }
        if (hasPas(a, 'huntmark') && !a._hm && d.hp > 0) { a._hm = true; d.marked = Math.max(d.marked || 0, 2); fl.push('hunted'); }
        if (multi) { fx({ u:d, k:'dmg', v:dmg, crit, eff, el:m.el, small:true, delay:h * 230, snd:crit ? 'crit' : 'hit', hp:Math.max(0, d.hp), max:d.max, from:firstFx ? hp0 : undefined }); firstFx = false; }
        if (has(d, 'thorns') && dmg > 0) { const r = Math.max(1, Math.round(dmg * 0.15)); a.hp -= r; thorn += r; }
        if (hasPas(d, 'bramble') && dmg > 0) { const r = Math.max(1, Math.round(dmg * 0.15)); a.hp -= r; thorn += r; }
        thorn += ultraHurt(d, a, dmg, fl);
        ultraHit(a, d, m, dmg, allies, fl);
        if (m.t === 'foe' && dmg > 0 && hasPas(d, 'kiln') && !a.burn && Math.random() < 0.25) { a.burn = 3; a.burnP = false; fl.push(`${nm(a)} burned by its molten core`); }
        if (m.t === 'foe' && dmg > 0 && hasPas(d, 'staticbody') && !a.para && Math.random() < 0.25) { a.para = 3; fl.push(`${nm(a)} paralyzed by static`); }
        if (d.hp <= 0 && has(d, 'plume') && !d.plumeUsed) { d.hp = 1; d.plumeUsed = true; fl.push('held on'); }
        if (d.hp <= 0 && (ultraPerk(d) || {}).endure && !d.endureUsed) { d.hp = 1; d.endureUsed = true; fl.push('ULTRA ENDURE'); fx({ u:d, k:'num', t:'ULTRA ENDURE', c:'#f9c74f', burst:'buff' }); }
        if (d.hp <= 0 && d.pas === 'standing' && !d.standUsed) { d.hp = 1; d.standUsed = true; fl.push('STILL STANDING'); fx({ u:d, k:'num', t:'STILL STANDING', c:'#f9c74f', burst:'buff' }); }
        if (d.hp <= 0 && !d._koBy) { d._koBy = true; ultraKill(a); }
        if (d.pas === 'spite' && dmg > 0 && d.hp > 0) { const tgt = pick(alive(allies)); if (tgt) { const r = Math.max(1, Math.round(dmg * 0.2)); tgt.hp -= r; tgt.hit = true; fl.push(`spite hits ${nm(tgt)} for ${r}`); fx({ u:tgt, k:'dmg', v:r, el:d.el, small:true, ko:tgt.hp <= 0, tags:['SPITE'] }); } }
        if (m.burn && Math.random() < ch(a, d, m.burn, 'burn') && !d.burn) { d.burn = hasPas(a, 'kindling') ? 4 : 3; d.burnP = !!m.burnP; fl.push(m.burnP ? 'burned+' : 'burned'); }
        if (m.poison && Math.random() < ch(a, d, m.poison, 'poison') && !d.poison) { d.poison = 4; d.poisonP = !!m.poisonP; fl.push(m.poisonP ? 'poisoned+' : 'poisoned'); }
        if (m.stun && Math.random() < ch(a, d, m.stun, 'stun') && !d.stun) { d.stun = m.stunP ? 2 : 1; fl.push(m.stunP ? 'stunned+ (2 turns)' : 'stunned'); }
        if (m.para && Math.random() < ch(a, d, m.para, 'para') && !d.para) { d.para = 3; d.paraP = !!m.paraP; fl.push(m.paraP ? 'paralyzed+' : 'paralyzed'); }
        if (m.blind && Math.random() < ch(a, d, m.blind, 'blind') && !d.blind) { d.blind = 3; d.blindP = !!m.blindP; fl.push(m.blindP ? 'blinded+' : 'blinded'); }
        if (m.confuse && Math.random() < ch(a, d, m.confuse, 'confuse') && !d.confuse) { d.confuse = 3; d.confuseP = !!m.confuseP; fl.push(m.confuseP ? 'confused+' : 'confused'); }
        // Per-hit rolls: every hit that lands gets its own chance (misses roll nothing).
        if (d.hp > 0) for (const [k, sts] of [['weakenCh', ['sOff']], ['exposeCh', expKeys(m)], ['slowCh', ['sSpd']]]) if (m[k] && Math.random() < ch(a, d, m[k], k)) sts.forEach(st => fl.push(stageFx(d, st, -1)));
        if (m.staDrain && multi) { const v = Math.min(d.sta, m.staDrain); d.sta -= v; a.sta = Math.min(a.staMax, a.sta + v); drained += v; }
      }
      if (drained) fl.push(`-${drained} STA`);
      if (m.dispel && dealt && dispel(d)) fl.push('buffs removed');
      if (m.staDrain && dealt && !multi) { const v = Math.min(d.sta, m.staDrain); d.sta -= v; a.sta = Math.min(a.staMax, a.sta + v); if (v) fl.push(`-${v} STA`); }
      if (a.pas === 'killer' && dealt > 0 && d.hp > 0) {
        if (d.boss) { const bonus = Math.max(1, Math.round(dealt * 0.15)), ab = Math.min(d.shield, bonus); d.shield -= ab; d.hp -= bonus - ab; dealt += bonus; fl.push(`+${bonus} extra hit`); }
        else if (d.hp <= d.max * 0.15) { d.hp = 0; fl.push('EXECUTED'); }
      }
      if (misses === (m.hits || 1)) fl.push('MISS');
      if (m.weaken && dealt && d.hp > 0) fl.push(stageFx(d, 'sOff', -m.weaken));
      if (m.expose && dealt && d.hp > 0) expKeys(m).forEach(k => fl.push(stageFx(d, k, -m.expose)));
      if (m.slow && dealt && d.hp > 0) fl.push(stageFx(d, 'sSpd', -m.slow));
      if (m.mark && d.hp > 0) { d.marked = m.mark; fl.push('marked'); }
      if (hasPas(a, 'overflow') && d.hp < 0 && m.pow > 0) { const o = pick(alive(foes).filter(x => x !== d)); if (o) { let v = -d.hp; const ab = Math.min(o.shield, v); o.shield -= ab; v -= ab; o.hp -= v; o.hit = true; fl.push(`overflow hits ${nm(o)} for ${-d.hp}`); fx({ u:o, k:'dmg', v:-d.hp, el:m.el, small:true, ko:o.hp <= 0 }); } }
      if (m.steal && d.hp > 0 && stealBuffs(a, d)) fl.push('buffs stolen');
      if (m.spread && d.hp > 0) fl.push(...spreadDebuffs(d, foes));
      if (d.counter && d.hp > 0 && a.hp > 0 && dealt) fl.push(counterAttack(d, a, foes, allies));
      total += dealt;
      if ((m.hits || 1) > 1) fx({ u:d, k:'num', t:`${m.hits - misses} HITS · ${dealt}`, c:'#ffffff', delay:(m.hits - 1) * 230 + 120, tags:fl.slice(), ko:d.hp <= 0 });
      else fx({ u:d, k:'dmg', v:dealt, crit:crits > 0, eff, el:m.el, tags:fl.slice(), ko:d.hp <= 0 });
      if (thorn) fx({ u:a, k:'dmg', v:thorn, el:'life', small:true, ko:a.hp <= 0, tags:['THORNS'] });
      let t = `${nm(d)} -${dealt}${(m.hits || 1) > 1 ? ` (${m.hits - misses} hits)` : ''}`;
      if (thorn) t += `, thorns hit back ${thorn}`;
      if (crits) t += ' CRIT';
      if (eff > 1) t += ' (super!)';
      if (eff < 1) t += ' (resisted)';
      if (fl.length) t += ', ' + fl.join(', ');
      if (d.hp <= 0) t += ', KO';
      parts.push(t);
    }
    msg += ' ' + parts.join('; ') + '.';
    if (a.pas === 'volley' && m.t === 'foe' && !m.splash && total > 0) {
      const sp = [];
      for (const o of alive(foes).filter(o => !tg.includes(o))) {
        let v = Math.max(1, Math.round(total * 0.2)); const ab = Math.min(o.shield, v); o.shield -= ab; v -= ab; o.hp -= v; o.hit = true;
        const got = []; [['burn', 3, 'burned'], ['poison', 4, 'poisoned'], ['stun', 1, 'stunned'], ['para', 3, 'paralyzed'], ['blind', 3, 'blinded'], ['confuse', 3, 'confused']].forEach(([k, n, w]) => { if (m[k] && !o[k] && Math.random() < ch(a, o, m[k], k)) { o[k] = k === 'stun' && m.stunP ? 2 : n; o[k + 'P'] = !!m[k + 'P']; got.push(w + (m[k + 'P'] ? '+' : '')); } });
        fx({ u:o, k:'dmg', v, el:m.el, small:true, ko:o.hp <= 0, tags:got.map(g => g.toUpperCase()) }); sp.push(`${nm(o)} -${v}${got.length ? ' ' + got.join('/') : ''}${o.hp <= 0 ? ' KO' : ''}`);
      }
      if (sp.length) msg += ' Volley: ' + sp.join(', ') + '.';
    }
    if (m.mendAlly && total) { const hurt = alive(allies).sort((x, y) => x.hp / x.max - y.hp / y.max)[0]; if (hurt) { const h = heal(hurt, total * m.mendAlly); if (h) { msg += ` ${nm(hurt)} mended ${h}.`; fx({ u:hurt, k:'heal', v:h }); } } }
    if (has(a, 'fang') && total && a.hp > 0) { const h = heal(a, total * 0.15); if (h) { msg += ` Fang drains ${h}.`; fx({ u:a, k:'heal', v:h }); } }
    if (m.leech && total) { const h = heal(a, total * m.leech); if (h) { msg += ` Drained ${h}.`; fx({ u:a, k:'heal', v:h }); } }
    if (m.recoil && total) { const r = Math.max(1, Math.round(total * m.recoil)); a.hp -= r; msg += ` ${r} recoil.`; fx({ u:a, k:'dmg', v:r, el:'neutral', small:true, ko:a.hp <= 0 }); }
    if (a.charged) { a.charged = false; msg += ' (charged hit!)'; }
  } else {
    const parts = [];
    for (const t of tg) {
      const fl = [];
      if (m.revive && t.hp <= 0) { resetStatus(t); t.hp = Math.max(1, Math.round(t.max * m.revive)); fl.push(`revived with ${t.hp} HP`); fx({ u:t, k:'heal', v:t.hp }); }
      if (m.healPct) { const amt = (a.pas === 'healer' ? Math.max(...alive(allies).map(u => u.max)) : t.max) * m.healPct, h = heal(t, amt); fl.push(`+${h} HP`); fx({ u:t, k:'heal', v:h });
        if (hasPas(a, 'devotion') && cleanse(t)) fl.push('cured');
        if (hasPas(a, 'ebb') && t !== a && h > 0) a.sta = Math.min(a.staMax, a.sta + Math.round(h * 0.25));
        if (m.overheal && amt - h >= 1) { const sh = Math.round(amt - h); t.shield += sh; fl.push(`+${sh} shield`); } }
      if (m.counter) { t.counter = { ...m.counter, el:m.el, left:3 }; fl.push('counter stance'); fx({ u:t, k:'num', t:'COUNTER', c:'#4cc9f0', burst:'shield' }); }
      if (m.charge) { t.charged = true; fl.push('charging'); fx({ u:t, k:'buff', t:'CHARGED' }); }
      if (m.shieldPct) { const s = Math.round(t.max * m.shieldPct); t.shield += s; fl.push(`+${s} shield`); fx({ u:t, k:'shield', v:s }); }
      if (m.regen) { (t.regen = t.regen || []).push([m.regen[0], m.regen[1]]); fl.push(t.regen.length > 1 ? `regen x${t.regen.length}` : 'regen'); fx({ u:t, k:'num', t:'REGEN', c:'#90be6d', snd:'heal', burst:'heal' }); }
      if (m.offUp) fl.push(stageFx(t, 'sOff', m.offUp));
      if (m.haste) fl.push(stageFx(t, 'sSpd', m.haste));
      if (m.guard) { alive(allies).forEach(o => { if (o.guardBy === a) { o.guardBy = null; o.guardT = 0; } }); t.guardBy = a; t.guardT = m.guard; fl.push(`guarded by ${nm(a)}`); fx({ u:t, k:'num', t:'GUARDED', c:'#4cc9f0', burst:'shield', snd:'shield' }); }
      if (m.taunt) { t.taunt = m.taunt + 1; fl.push(`taunting for ${m.taunt} turns`); fx({ u:t, k:'num', t:'TAUNT', c:'#f94144', burst:'buff' }); }
      if (m.selfTaunt && t === a) { t.taunt = m.selfTaunt + 1; fl.push(`taunting for ${m.selfTaunt} turns`); fx({ u:t, k:'num', t:'TAUNT', c:'#f94144', burst:'buff' }); }
      if (m.veil) { t.veil = 3; fl.push('veiled'); fx({ u:t, k:'num', t:'VEIL', c:'#8a7fb0', burst:'dark' }); }
      if (m.staGain) { const b = t.sta; t.sta = Math.min(t.staMax, t.sta + m.staGain); fl.push(`+${t.sta - b} STA`); fx({ u:t, k:'num', t:`+${t.sta - b} STA`, c:'#f9c74f', burst:'psychic' }); }
      if (m.armor) { fl.push(stageFx(t, 'sDef', m.armor)); fl.push(stageFx(t, 'sSDef', m.armor)); }
      if (m.cleanse && cleanse(t)) { fl.push('cured'); fx({ u:t, k:'num', t:'CURED', c:'#ffffff' }); }
      parts.push(`${tg.length > 1 || t !== a ? nm(t) + ' ' : ''}${fl.join(', ')}`);
    }
    msg += ' ' + parts.join('; ') + '.';
  }
  const extra = []; applyRiders(a, m, tg, total, allies, foes, extra);
  if (extra.length) msg += ' ' + extra.join('; ') + '.';
  L.push(msg);
}

// Turn order for a round: fastest first, "first" units always lead, "twice" units act twice.
// Each unit's place in line: current speed plus a tie-break roll fixed for the round.
const orderKey = u => effSpd(u) + (u._jit || 0) + (u.first ? 1000 : 0);
function roundOrder(units, pBias = 0.05) {
  units.forEach(u => u._jit = Math.random() * 0.9 + (u.side === 'P' ? pBias : 0));
  let o = units.slice().sort((a, b) => orderKey(b) - orderKey(a));
  o.filter(u => u.twice).forEach(u => o.splice(Math.min(o.length, Math.ceil(o.length / 2) + 1), 0, u));
  return o;
}
// Speed changes mid-round: everyone who hasn't acted yet gets re-sorted by their current speed.
// (A unit's second turn from "twice" keeps its slot.) Returns the units that moved later in line.
function reorderRest(q, from) {
  const fixed = q.map((u, i) => i >= from && q.indexOf(u) < i);
  const slots = [], movers = [];
  for (let i = from; i < q.length; i++) if (!fixed[i]) { slots.push(i); movers.push(q[i]); }
  const before = movers.slice();
  movers.sort((a, b) => orderKey(b) - orderKey(a));
  slots.forEach((i, k) => q[i] = movers[k]);
  return before.filter((u, k) => movers.indexOf(u) > k);
}
// Boss phases: at an HP threshold, or when a boss is left alone.
function checkPhase(x, L) {
  if (!x.phase || x.phase.done || x.hp <= 0) return;
  const ph = x.phase, team = x.teamRef || [];
  const trig = ph.alone ? !team.some(u => u !== x && u.hp > 0) : x.hp <= x.max * ph.at;
  if (!trig) return;
  ph.done = true;
  if (ph.name) x.name = ph.name;
  if (ph.moves) x.moves = ph.moves.map(clone);
  if (ph.addMoves) x.moves.push(...ph.addMoves.map(clone));
  if (ph.script) x.script = ph.script;
  if (ph.heal) x.hp = Math.min(x.max, x.hp + Math.round(x.max * ph.heal));
  if (ph.shield) x.shield += Math.round(x.max * ph.shield);
  if (ph.offUp) stage(x, 'sOff', ph.offUp);
  if (ph.extra) Object.assign(x, ph.extra);
  if (ph.revive) team.forEach(u => { if (u !== x && u.hp <= 0) { u.hp = Math.round(u.max * ph.revive); resetStatus(u); } });
  L.push(ph.say);
  fx({ u:x, k:'name', t:ph.title || 'PHASE 2!', el:x.el, snd:'crit' }); fx({ u:x, k:'buff', t:ph.title || 'POWER UP' });
}
function endRound(x, L) {
  checkPhase(x, L);
  if (x.hp > 0 && hasPas(x, 'wellspring')) x.sta = Math.min(x.staMax, x.sta + 10);
  if (x.hp > 0 && hasPas(x, 'tidewall') && x.taunt > 0) { const h = heal(x, x.max * 0.05); if (h) fx({ u:x, k:'heal', v:h, small:true }); }
  if (x.hp > 0 && hasPas(x, 'sanctuary') && x.teamRef) { const w = alive(x.teamRef).sort((p, q) => p.hp / p.max - q.hp / q.max)[0]; if (w && w.hp < w.max) { const h = heal(w, w.max * 0.05); if (h) { L.push(`${nm(x)}'s Sanctuary heals ${nm(w)} (+${h}).`); fx({ u:w, k:'heal', v:h, small:true }); } } }
  if (x.hp > 0 && hasPas(x, 'photo')) { const h = heal(x, x.max * 0.05); if (h) fx({ u:x, k:'heal', v:h, small:true }); }
  summonTick(x, L);
  ultraRound(x, L);
  if (x.pas === 'guardian' && x.hp > 0 && x.teamRef) {   // Guardian Angel: shield the most hurt ally
    const w = alive(x.teamRef).sort((p, q) => p.hp / p.max - q.hp / q.max)[0];
    if (w && w.hp < w.max) { const s = Math.round(w.max * 0.2); w.shield += s; L.push(`${nm(x)}'s Guardian Angel shields ${nm(w)} (+${s}).`); fx({ u:w, k:'num', t:`+${s} shield`, c:'#9ad0ff', burst:'buff' }); }
  }
  if (x.bomb && --x.bomb.t <= 0) {
    const b = x.bomb; x.bomb = null; const hit = [];
    alive(b.team).filter(o => !o.abducted).forEach(o => {
      let v = calcDmg(b.owner, o, { pow:b.pow }, effVs(b.el, o), false);
      const ab = Math.min(o.shield, v); o.shield -= ab; v -= ab; o.hp -= v; o.hit = true;
      if (b.burn && Math.random() < b.burn && !o.burn) { o.burn = 3; o.burnP = !!b.burnP; }
      if (b.stun && !o.stun && Math.random() < ch(b.owner, o, b.stun, 'stun')) o.stun = b.stunP ? 2 : 1;
      fx({ u:o, k:'dmg', v, el:b.el, ko:o.hp <= 0, snd:'crit' }); hit.push(`${nm(o)} -${v}${o.hp <= 0 ? ' KO' : ''}`);
    });
    if (hit.length) L.push(`BOOM! The bomb explodes: ${hit.join(', ')}.`);
  }
  if (x.abducted > 0 && --x.abducted <= 0) { x.abducted = 0; L.push(`${nm(x)} is dropped back onto the Moon!`); fx({ u:x, k:'num', t:'RETURNED', c:'#d17fe8' }); }
  if (x.rang && --x.rang.t <= 0) {   // Boomer Rang: the boomerang comes back for a second hit
    const r = x.rang; x.rang = null;
    const d = r.tgt && r.tgt.hp > 0 && !r.tgt.abducted ? r.tgt : pick(alive(r.team).filter(o => !o.abducted));
    if (x.hp > 0 && d) { let v = calcDmg(x, d, { pow:r.pow, cat:r.cat }, effVs(r.el, d), false); const ab = Math.min(d.shield, v); d.shield -= ab; v -= ab; d.hp -= v; d.hit = true;
      L.push(`...and the ${r.n} comes back! ${nm(d)} -${v}${d.hp <= 0 ? ' KO' : ''}.`); fx({ u:d, k:'dmg', v, el:r.el, ko:d.hp <= 0, snd:'hit' }); }
  }
  if (x.heat && x.hp > 0) {   // the Sun: every round it burns a little hotter, for everyone on your side
    const H = x.heat; H.n++; const pct = Math.min(H.max, H.step * H.n), hit = [];
    alive(H.team || []).filter(o => !o.abducted).forEach(o => { const v = Math.max(1, Math.round(o.max * pct)); o.hp -= v; o.hit = true; hit.push(`${nm(o)} -${v}${o.hp <= 0 ? ' KO' : ''}`); fx({ u:o, k:'dmg', v, el:'fire', small:true, ko:o.hp <= 0, snd:'fire' }); });
    if (hit.length) L.push(`The heat rises (${Math.round(pct * 100)}% a round): ${hit.join(', ')}.`);
  }
  if (x.hp <= 0) return;
  if (x.defT > 0 && --x.defT <= 0) { x.sDef = Math.max(-6, x.sDef - x.defN); x.sSDef = Math.max(-6, x.sSDef - x.defN); x.defN = 0; }
  if (x.passShieldT > 0 && --x.passShieldT <= 0) { x.shield = Math.max(0, x.shield - x.passShield); x.passShield = 0; }
  const n = nm(x);
  const plume = () => { if (x.hp <= 0 && has(x, 'plume') && !x.plumeUsed) { x.hp = 1; x.plumeUsed = true; L.push(`${n} holds on with the Phoenix Plume!`); } if (x.hp <= 0 && x.pas === 'standing' && !x.standUsed) { x.hp = 1; x.standUsed = true; L.push(`${n} is still standing!`); } };
  if (x.burn > 0) { const v = Math.max(1, Math.round(x.max * (x.burnP ? 0.12 : 0.08))); x.hp -= v; x.burn--; x.hit = true; plume(); L.push(`${n} takes ${v} burn damage.${x.hp <= 0 ? ' KO!' : ''}`); fx({ u:x, k:'dmg', v, el:'fire', small:true, ko:x.hp <= 0, snd:'fire' }); }
  if (x.hp > 0 && x.poison > 0) { const v = Math.max(1, Math.round(x.max * (x.poisonP ? 0.12 : 0.08))); x.hp -= v; x.poison--; x.hit = true; plume(); L.push(`${n} takes ${v} poison damage.${x.hp <= 0 ? ' KO!' : ''}`); fx({ u:x, k:'dmg', v, el:'poison', small:true, ko:x.hp <= 0, snd:'status' }); }
  if (x.hp > 0 && x.regen && x.regen.length) { const h = heal(x, x.max * x.regen.reduce((s, r) => s + r[0], 0)); x.regen.forEach(r => r[1]--); x.regen = x.regen.filter(r => r[1] > 0); if (h) { L.push(`${n} regenerates ${h} HP.`); fx({ u:x, k:'heal', v:h }); } }
  if (x.para > 0) x.para--;
  if (x.blind > 0) x.blind--;
  if (x.veil > 0) x.veil--;
  if (x.confuse > 0) x.confuse--;
  if (x.taunt > 0) x.taunt--;
  if (x.guardT > 0 && --x.guardT <= 0) x.guardBy = null;
  if (x.hp > 0 && has(x, 'moss')) { const h = heal(x, x.max * 0.06); if (h) { L.push(`${n}'s moss heals ${h} HP.`); fx({ u:x, k:'heal', v:h }); } }
  x.sta = Math.min(x.staMax, x.sta + STA_REGEN + (has(x, 'ring') ? 10 : 0));
}
// Bosses with an 'undying' trick get back up once when they fall (Matilda's vows, the Narrator's deus ex machina).
function cheatDeath(units, L) {
  units.forEach(u => { const d = u.undying; if (!d || u.hp > 0 || u.undyingUsed) return;
    u.undyingUsed = true; ['burn', 'poison', 'stun', 'para', 'blind', 'confuse'].forEach(k => u[k] = 0); u.bomb = null;
    u.hp = Math.max(1, Math.round(u.max * d.pct)); if (d.shield) u.shield += Math.round(u.max * d.shield);
    if (L) L.push(d.say); fx({ u, k:'name', t:d.title, el:u.el, snd:'crit' }); fx({ u, k:'heal', v:u.hp });
    if (d.phase && u.phase && !u.phase.done) { u.phase.at = 1; checkPhase(u, L || []); } });
}
const battleOver = (team, foes, L) => { cheatDeath(foes, L); return !alive(foes).length ? 'win' : !alive(team).length ? 'lose' : null; };
// Piper's rats keep coming: every few rounds a fresh rat takes a fallen one's place (the team never grows past its starting size).
function summonTick(x, L) {
  const s = x.summon; if (!s || x.hp <= 0) return;
  s.t = (s.t || 0) + 1; if (s.t % s.every) return;
  const team = x.teamRef || [], i = team.findIndex(u => u !== x && u.hp <= 0); if (i < 0) return;
  team[i] = s.make(); L.push(s.say); fx({ u:x, k:'name', t:s.title, el:x.el, snd:'buff' });
}
// The Narrator's last player move, so Spoiler Alert can steal it.
let LAST_P_MOVE = null;

/* ================= AI =================
   Scores every move + target. Loves kills, focuses wounded targets, uses type advantage,
   heals or shields allies in danger, buffs early, and avoids wasting stamina. */
function expDmg(a, d, m) {
  const eff = effVs(m.el, d), c = Math.min(1, critOf(a, m));
  let v = calcDmg(a, d, m, eff, false) * (1 + (d.marked > 0 ? 0.5 : c * 0.5)) * (m.hits || 1);
  if (m.chain) v *= 1 + (m.chain - 1) * 0.5;                   // bounces land somewhere useful
  if (m.detonate) v += d.max * 0.08 * ((d.burn || 0) + (d.poison || 0)) * 1.5;
  return v;
}
/* Tactical helpers (from how a good human plays):
   - focus the units that hit hardest and die fastest: fewer enemies acting = fewer hits taken
   - treat stuns, paralysis, confusion, blinds and OFF drops as "skip their turn", worth most on their biggest hitter
   - heal when someone would actually die to the next round of hits, not just because they're scratched */
const AIW = { focus:1, ctl:1, heal:1, deny:1, sideP:1, sideE:1 };   // tuning switches for the tactical rules
const offPow = u => u.off * stMul(u.sOff || 0, u) * (u.charged ? 1.3 : 1);
function threatOf(d, team) { const al = alive(team); if (!al.length) return 1; const avg = al.reduce((x, u) => x + offPow(u), 0) / al.length; return Math.max(0.4, Math.min(2, offPow(d) / Math.max(1, avg))); }
// Roughly how much damage u could take before it acts again: the hardest single hit, plus part of everyone else's.
function incoming(u, foes) {
  const best = alive(foes).map(e => allMoves(e).filter(m => m.pow > 0 && m.s <= e.sta).reduce((x, m) => Math.max(x, expDmg(e, u, m) * (m.t === 'foes' ? 0.9 : 1)), 0)).sort((x, y) => y - x);
  return best.length ? best[0] + best.slice(1).reduce((x, v) => x + v, 0) * 0.4 : 0;
}
function scoreMove(a, m, t, allies, foes, round) {
  let s = 0;
  const smart = a.side === 'P' ? AIW.sideP : (a.smart || a.boss) ? AIW.sideE : 0;
  if (m.t === 'foe' || m.t === 'foes') {
    const tg = m.t === 'foes' ? alive(foes) : [t];
    const allyPower = alive(allies).length;
    for (const d of tg) {
      const dmg = m.pow > 0 ? expDmg(a, d, m) : 0, ehp = d.hp + d.shield;
      const thr = threatOf(d, foes), ctl = Math.min(1.8, 0.4 + 0.7 * thr);   // controls are worth most on the biggest hitter
      const room = (v, n) => Math.max(0, Math.min(n, v - ST_MIN));             // stages a lower can still take
      if (m.expose && d.hp > d.max * 0.3) { const sk = d[expKeys(m)[0]]; s += 13 * allyPower * room(sk, m.expose) * (sk < 0 ? 0.7 : 1) * (m.exp === 'b' ? 1.4 : 1); }   // everyone hits it harder
      if (m.weaken && d.hp > d.max * 0.3) s += 26 * room(d.sOff, m.weaken) * (d.sOff < 0 ? 0.7 : 1) * (smart && AIW.ctl ? ctl : 1);
      if (m.slow && d.hp > d.max * 0.3) s += 12 * room(d.sSpd, m.slow) * (d.sSpd < 0 ? 0.6 : 1);
      const hitsN = m.hits || 1;
      if (m.weakenCh && d.hp > d.max * 0.3) s += 26 * Math.min(room(d.sOff, 3), m.weakenCh * hitsN) * 0.8;
      if (m.exposeCh && d.hp > d.max * 0.3) s += 13 * allyPower * Math.min(room(d[expKeys(m)[0]], 3), m.exposeCh * hitsN) * 0.8;
      if (m.slowCh && d.hp > d.max * 0.3) s += 12 * Math.min(room(d.sSpd, 3), m.slowCh * hitsN) * 0.8;              // it hits you softer
      s += Math.min(dmg, ehp) / d.max * 100;               // share of their HP removed
      if (smart && AIW.focus && m.pow > 0 && dmg > 0) s += 32 * AIW.focus * thr / Math.max(1, Math.ceil(ehp / dmg));   // focus the squishy, scary ones
      if (m.pow > 0 && dmg >= ehp) s += 70 + (d.boss ? 20 : 0) + (smart && AIW.deny && d._r !== round ? 45 * AIW.deny * threatOf(d, foes) : 0); // finishing someone is worth a lot, more if it hasn't acted yet this round
      if (m.pow > 0) s += (1 - d.hp / d.max) * 15;          // focus wounded targets
      s += (m.burn && !d.burn ? m.burn * 14 : 0) + (m.poison && !d.poison ? m.poison * 18 : 0) + ((m.stun && !d.stun && !d.dazed ? m.stun * 25 : 0) + (m.para && !d.para ? m.para * 24 : 0) + (m.blind && !d.blind ? m.blind * 22 : 0) + (m.confuse && !d.confuse ? m.confuse * 24 : 0)) * (smart && AIW.ctl && d.hp > d.max * 0.25 ? ctl * 1.3 : 1) + (m.staDrain ? Math.min(d.sta, m.staDrain) * 0.5 : 0) + 0;
      if (m.mark && !d.marked) s += 12 * allyPower;
      if (m.bomb && !d.bomb) s += alive(foes).reduce((x, o) => x + Math.min(calcDmg(a, o, { pow:m.bomb.pow }, effVs(m.el, o), false), o.hp) / o.max * 70, 0);
      if (m.steal) s += buffCount(d) * 16;
      if (m.spread) { const n = alive(foes).length - 1, deb = ['burn','poison','para','blind','confuse'].filter(k => d[k] || m[k]).length + STAGES.filter(k => d[k] < 0).length; s += n * deb * 9; }
      if (d.counter && m.pow > 0) s -= 20;     // walking into a counter stance
      if (m.pow <= 0 && d.hp < d.max * 0.25) s *= 0.5;      // don't debuff someone about to die
    }
    if (m.leech) s += (1 - a.hp / a.max) * 20;
    if (m.mendAlly) { const hurt = alive(allies).reduce((x, y) => x.hp / x.max < y.hp / y.max ? x : y); s += (1 - hurt.hp / hurt.max) * 30 * m.mendAlly * 2; }
    if (a.blind) s *= 0.7;
    if (m.recoil && a.hp < a.max * 0.3) s -= 30;
    if (a.charged && m.pow > 0) s *= 1.3;
  } else {
    const tg = m.t === 'allies' ? alive(allies) : m.t === 'self' ? [a] : m.t === 'fallen' ? allies.filter(u => u.hp <= 0).slice(0, 1) : [t];
    for (const u of tg) {
      const miss = 1 - u.hp / u.max;
      let danger = u.hp < u.max * 0.4 ? 1.5 : 1;
      if (smart && AIW.heal && (m.healPct || m.shieldPct || m.veil || m.armor)) { const inc = incoming(u, foes), eh = u.hp + u.shield; danger = eh <= inc ? 2.4 : eh <= inc * 1.6 ? 1.3 : 0.55; }
      if (m.revive) s += 120;
      if (m.healPct) s += Math.min(miss, m.healPct) * 140 * danger;
      if (m.shieldPct && u.shield < u.max * 0.1) s += m.shieldPct * (miss > 0.25 ? 110 : round <= 2 ? 70 : 40) * danger;
      if (m.regen) s += Math.min(miss + 0.1, m.regen[0] * m.regen[1]) * 100 * (u.regen && u.regen.length ? 0.5 : 1);
      if (m.offUp && u.sOff < 4) { const avgOff = alive(allies).reduce((x, y) => x + y.off, 0) / alive(allies).length; s += Math.min(m.offUp, 4 - u.sOff) * (round <= 3 ? 26 : 15) * (u.off / avgOff) * (u.sOff > 1 ? 0.6 : 1); }
      if (m.cleanse && (u.burn || u.poison || u.para || u.blind || u.confuse || STAGES.some(k => u[k] < 0))) s += 25;
      if (m.veil && !u.veil) s += (miss > 0.2 ? 24 : round <= 2 ? 16 : 10) * danger;
      if (m.staGain) s += Math.min(u.staMax - u.sta, m.staGain) * (u.sta < u.staMax * 0.4 ? 0.9 : 0.35);
      if (m.haste && u.sSpd < 2) { const avgOff = alive(allies).reduce((x, y) => x + y.off, 0) / alive(allies).length; s += (round <= 3 ? 22 : 12) * (u.off / avgOff); }
      if (m.guard && u !== a && !(u.guardT > 0)) { const dfu = u.pdef + u.sdef, dfa = a.pdef + a.sdef, fragile = 1 - dfu / Math.max(dfu, dfa) + miss; s += a.hp > a.max * 0.4 ? 20 + fragile * 45 : 4; }
      if (m.armor && u.sDef < 3) s += (miss > 0.2 ? 30 : round <= 2 ? 18 : 10) * danger * Math.min(m.armor, 3 - u.sDef) * (u.sDef > 0 ? 0.7 : 1);
      if (m.counter && !u.counter) s += m.counter.pow * 0.45 * Math.min(2, alive(foes).length) * 0.6;
      if (m.charge && !u.charged) s += a.sta >= 60 ? 34 : 8;
      if (m.overheal && m.healPct) s += Math.max(0, m.healPct - miss) * 50;
    }
  }
  s += riderScore(a, m, t, allies, foes, round);
  if (m.staCharge) s += Math.min(a.staMax - a.sta, a.staMax * m.staCharge) * 0.3;   // basic hits refill stamina
  return s;
}
function riderScore(a, m, t, allies, foes, round) {
  let s = 0;
  const team = alive(allies), enemies = alive(foes);
  const hurt = u => 1 - u.hp / u.max;
  if (m.splash && m.t === 'foe') enemies.filter(o => o !== t).forEach(o => { const v = calcDmg(a, o, { pow:m.splash }, effVs(m.el, o), false); s += Math.min(v, o.hp) / o.max * 90 + (v >= o.hp ? 40 : 0); });
  if (m.dispel && t) s += buffCount(t) * 14 + (t.regen && t.regen.length ? 10 : 0);
  if (m.dispel && m.t === 'foes') enemies.forEach(o => s += buffCount(o) * 10);
  if (m.cleanseTeam) s += team.filter(u => u.burn || u.poison || u.para || u.blind || u.confuse || STAGES.some(k => u[k] < 0)).length * 22;
  if (m.teamLeech) s += team.reduce((x, u) => x + hurt(u), 0) * 25 * m.teamLeech * 4;
  if (m.teamSta) s += team.reduce((x, u) => x + Math.min(u.staMax - u.sta, u.staMax * m.teamSta), 0) * 0.35;
  if (m.foeStaDrain) s += enemies.length * 7;
  if (m.teamShield) s += team.reduce((x, u) => x + (hurt(u) > 0.15 || round <= 2 ? 1 : 0.4), 0) * m.teamShield * 70;
  if (m.teamHeal) s += team.reduce((x, u) => x + Math.min(hurt(u), m.teamHeal), 0) * 130;
  if (m.selfOffUp && a.sOff < 4) s += m.selfOffUp * 17;
  if (m.selfHaste && a.sSpd < 2) s += 14;
  if (m.selfArmor && a.sDef < 3) s += 14;
  if (m.selfVeil && !a.veil) s += 14;
  if (m.selfStun) s -= 28;
  if (m.hpCost) s -= m.hpCost * 100 * (a.hp < a.max * 0.4 ? 3 : 1);                                   // losing your next turn hurts
  if (m.taunt) {                                             // tank for fragile or hurt teammates
    const need = team.filter(u => u !== a).reduce((x, u) => x + hurt(u) + (u.pdef + u.sdef < a.pdef + a.sdef ? 0.25 : 0), 0);
    s += a.hp > a.max * 0.5 && !a.taunt ? 25 + need * 30 : -20;
  }
  return s;
}
/* ---- Lookahead: smart units try their best few options on a copy of the battle, play out the rest of the round
   (everyone else using the normal one-step AI, then end-of-round ticks), and keep the option that leaves the board best. ---- */
const LOOK = { on:1, k:3, roll:2 };
let IN_SIM = false;
function cloneBattle(allies, foes) {
  const map = new Map(), A2 = [], F2 = [];
  const cp = u => { const c = { ...u, base:{ ...u.base } };
    if (u.regen) c.regen = u.regen.map(x => x.slice()); if (u.phase) c.phase = { ...u.phase }; if (u.summon) c.summon = { ...u.summon };
    map.set(u, c); return c; };
  allies.forEach(u => A2.push(cp(u))); foes.forEach(u => F2.push(cp(u)));
  const arr = t => t === allies ? A2 : t === foes ? F2 : t ? t.map(x => map.get(x) || x) : t;
  map.forEach(c => { if (c.guardBy) c.guardBy = map.get(c.guardBy) || null; if (c.teamRef) c.teamRef = arr(c.teamRef);
    if (c.bomb) c.bomb = { ...c.bomb, owner:map.get(c.bomb.owner) || c.bomb.owner, team:arr(c.bomb.team) };
    if (c.rang) c.rang = { ...c.rang, tgt:map.get(c.rang.tgt) || c.rang.tgt, team:arr(c.rang.team) };
    if (c.heat) c.heat = { ...c.heat, team:arr(c.heat.team) }; });
  return { A2, F2, map };
}
// Board value from one side's view: living units weighted by how hard they hit, scaled by remaining HP; disabled units count less.
function boardValue(mine, theirs) {
  const all = [...alive(mine), ...alive(theirs)], avg = all.reduce((x, u) => x + offPow(u), 0) / Math.max(1, all.length);
  const v = u => u.hp <= 0 ? 0 : (0.45 + 0.55 * Math.min(1, (u.hp + u.shield * 0.7) / u.max)) * (0.6 + 0.4 * offPow(u) / Math.max(1, avg)) * (u.stun ? 0.6 : u.para || u.confuse ? 0.85 : 1);
  return mine.reduce((x, u) => x + v(u), 0) - theirs.reduce((x, u) => x + v(u), 0) * 1.15;
}
function rollout(a, opt, allies, foes, round) {
  const { A2, F2, map } = cloneBattle(allies, foes), a2 = map.get(a), t2 = opt.target ? map.get(opt.target) || opt.target : null;
  const keepFX = typeof FX !== 'undefined' ? FX : null, keepLast = LAST_P_MOVE; FX = null; IN_SIM = true;
  try {
    act(a2, opt.m, t2, A2, F2, []);
    const rest = roundOrder([...alive(A2), ...alive(F2)].filter(u => u._r !== round && u !== a2));
    for (const u of rest) { if (u.hp <= 0 || battleOver(A2, F2)) break; const mine = A2.includes(u), al = mine ? A2 : F2, fo = mine ? F2 : A2;
      const pl = planFor(u, al, fo, round); act(u, pl.m, pl.target, al, fo, []); }
    if (!battleOver(A2, F2)) [...A2, ...F2].forEach(u => endRound(u, []));
    const res = battleOver(A2, F2);
    return res === 'win' ? 50 : res === 'lose' ? -50 : boardValue(A2, F2);   // allies = the acting unit's side
  } finally { FX = keepFX; IN_SIM = false; LAST_P_MOVE = keepLast; }
}
function planFor(a, allies, foes, round = 1, noise = 0.12) {
  const plan = planFor1(a, allies, foes, round, noise);
  a._r = round;   // marks that this unit has taken (or is taking) its turn this round
  if (!LOOK.on || IN_SIM || !(a.side === 'P' ? LOOK.sideP !== 0 : (a.smart || a.boss) && LOOK.sideE !== 0) || plan.scripted) return plan;
  const cands = [plan, ...(plan.alts || [])].slice(0, LOOK.k);
  if (cands.length < 2) return plan;
  let best = plan, bv = -1e9;
  for (const c of cands) { let v = 0; for (let i = 0; i < LOOK.roll; i++) v += rollout(a, c, allies, foes, round); v /= LOOK.roll; if (v > bv) { bv = v; best = c; } }
  return best;
}
function planFor1(a, allies, foes, round = 1, noise = 0.12) {
  const opts = [];
  for (const m0 of allMoves(a)) {
    if (m0.passive) continue;
    const m = effMove(a, m0);
    if (m.s > a.sta) continue;
    if (a.locked && m.n !== a.locked) continue;
    if (!a.locked && (has(a, 'hat') || has(a, 'badge')) && !(m.pow > 0) && m.t !== 'fallen') continue;   // don't lock into a non-attack
    const taunters = alive(foes).filter(u => u.taunt > 0);
    const hunt = a.hunter && !taunters.length ? [alive(foes).reduce((x, y) => y.off * stMul(y.sOff || 0, y) > x.off * stMul(x.sOff || 0, x) ? y : x)] : null;   // goes for your strongest hitter
    const reach = alive(foes).filter(u => !u.abducted);
    const tgs = m.t === 'foe' ? (taunters.length ? taunters : hunt || (reach.length ? reach : alive(foes))) : m.t === 'ally' ? alive(allies).filter(u => !m.guard || u !== a) : m.t === 'fallen' ? allies.filter(u => u.hp <= 0) : [null];
    for (const t of tgs) opts.push({ m, target:t, s:scoreMove(a, m, t, allies, foes, round) * (1 + (Math.random() - 0.5) * noise) * (a.favor && t && t.cls === a.favor && m.t === 'ally' ? 2.5 : 1) });
  }
  opts.sort((x, y) => y.s - x.s);
  // Bosses follow a scripted rhythm (setup, then payoff); anything unusable falls back to the normal AI.
  if (a.script) {
    const want = a.script[(round - 1) % a.script.length];
    const pick_ = want && opts.find(o => o.m.n === want && !(o.m.charge && a.charged) && !(o.m.counter && a.counter) && !(o.m.bomb && o.target && o.target.bomb) && !(o.m.mark && o.target && o.target.marked > 0));
    if (pick_) return { ...pick_, scripted:true };
  }
  if (!opts.length || opts[0].s < 3) return { m:REST, alts:opts.slice(0, LOOK.k - 1) };
  const best = { ...opts[0], alts:[...opts.slice(1, LOOK.k), { m:REST }] };
  // Ordinary enemies still take a kill when they can see one (most of the time), but otherwise pick their victim at random.
  if (a.side === 'E' && !a.smart && !a.boss && best.m.t === 'foe' && best.m.pow > 0) {
    const same = opts.filter(o => o.m === best.m && o.target);
    const kills = same.filter(o => expDmg(a, o.target, o.m) >= o.target.hp + o.target.shield);
    if (kills.length && Math.random() < 0.75) return kills[0];
    if (same.length > 1) return same[Math.floor(Math.random() * same.length)];
  }
  return best;
}

/* ================= run helpers (no DOM) ================= */
// Fixed diamond layout (bottom to top): 1, 2, 3, 4, 3, 4, 3, 2 nodes, then the boss.
// Every node links to its neighbors in the next row, so the paths always look the same.
const MAP_ROWS = [1, 2, 3, 4, 3, 4, 3, 2, 1];
// Odds for the middle rows.
const ULTRA_ODDS = 0.005;   // Ultra tile: rare (a guaranteed one is placed by World 7 if none showed up; see ensureUltra)
const NODE_ODDS = [['ultra', ULTRA_ODDS], ['fight', 0.32], ['elite', 0.12], ['recruit', 0.10], ['camp', 0.08], ['treasure', 0.07], ['train', 0.09], ['mystery', 0.08], ['item', 0.09], ['dojo', 0.05]];
// Item tile offers: consumables and held items mixed.
const itemOffers = () => { const pool = [...USE_ITEMS, ...USE_ITEMS, ...HOLD_ITEMS], out = []; while (out.length < ITEM_CHOICES) { const k = pick(pool); if (!out.includes(k)) out.push(k); } return out; };
function rollType(f) {
  const odds = REALM >= 1 ? [['fuse', 0.05], ...NODE_ODDS] : NODE_ODDS;
  let r = Math.random() * odds.reduce((s, o) => s + o[1], 0), t = 'fight';
  for (const [k, p] of odds) { if (r < p) { t = k; break; } r -= p; }
  return (t === 'elite' || t === 'ultra') && f < 2 ? 'fight' : t;
}
function rollFoe(w) {
  const nat = nativesOf(w);
  if (nat && Math.random() < NATIVE_RATE) { const id = pick(nat); return { el:CREATURES[id].el, role:'cr_' + id }; }
  return { el:pick(WORLDS[w].els), role:pick(FOE_ROLES) };
}
function genMap(w) {
  if (isMoon(w)) return moonMap();
  const rows = MAP_ROWS.map((n, f) => Array.from({ length:n }, (_, c) => ({ f, c, type:'fight', next:[], visited:false })));
  const last = FLOORS - 1;
  rows.forEach((row, f) => row.forEach(n => {
    if (f === last) n.type = 'boss';
    else if (f === 0) n.type = w === 0 ? 'choice' : 'start';   // very first tile of a run: pick a fight or a recruit; later worlds: empty start
    else if (f === last - 1) n.type = n.c === 0 ? 'camp' : rollType(f) === 'elite' ? 'treasure' : rollType(f);
    else n.type = rollType(f);
    if (n.type === 'fight') n.foe = rollFoe(w);
  }));
  if (!rows[1].some(n => n.type === 'recruit') && !rows[2].some(n => n.type === 'recruit')) { const n = pick(rows[2]); n.type = 'recruit'; delete n.foe; }
  // Realm 2+ maps always have at least one shrine.
  if (REALM >= 1 && !rows.some(r => r.some(n => n.type === 'fuse'))) { const n = pick(rows.slice(2, last - 1).flat().filter(n => n.type !== 'recruit')); n.type = 'fuse'; delete n.foe; }
  for (let f = 0; f < last; f++) {
    const a = rows[f].length, b = rows[f + 1].length;
    rows[f].forEach((n, i) => {
      const idx = b > a ? [i, i + 1] : b < a ? [i - 1, i] : [i];
      n.next = [...new Set(idx.filter(j => j >= 0 && j < b))].map(j => rows[f + 1][j]);
    });
  }
  return rows;
}
// The Moon: a straight walk across the surface. Landing (full heal on arrival), the Elite 4 back to back,
// one Moon Base camp, then the Sun. No other tiles: it's there for the view.
function moonMap() {
  const types = ['start', 'boss', 'boss', 'boss', 'boss', 'camp', 'boss'];
  const rows = types.map((type, f) => [{ f, c:0, type, next:[], visited:false }]);
  let gi = 0; rows.forEach(r => { if (r[0].type === 'boss') r[0].gi = gi++; });
  for (let f = 0; f < rows.length - 1; f++) rows[f][0].next = [rows[f + 1][0]];
  return rows;
}
// Make sure a run sees at least one Ultra tile by World 7 (index 6). Returns true if the map has one.
function ensureUltra(map, w, seen) {
  const has = map.some(r => r.some(n => n.type === 'ultra'));
  if (has || seen || w < 6 || isMoon(w)) return has;
  const spots = map.slice(2, map.length - 2).flat().filter(n => n.type !== 'recruit' && n.type !== 'camp');
  const n = pick(spots); n.type = 'ultra'; delete n.foe; return true;
}
// What a mystery tile turns into when you step on it.
const MYSTERY_ODDS = [['ambush', 0.20], ['treasure', 0.16], ['recruit', 0.13], ['train', 0.16], ['camp', 0.13], ['trap', 0.06], ['item', 0.10], ['dojo', 0.06]];
function rollMystery() {
  let r = Math.random();
  for (const [k, p] of MYSTERY_ODDS) { if (r < p) return k; r -= p; }
  return 'treasure';
}
// Camps fully heal and revive by default; other callers can pass smaller amounts.
function campHeal(team, revivePct = 1, healPct = 1) {
  team.forEach(p => {
    if (p.hp <= 0) p.hp = Math.max(1, Math.round(p.max * revivePct));
    else p.hp = Math.min(p.max, p.hp + Math.ceil(p.max * healPct));
  });
}
// Training tile: a free level boost for one slime.
const TRAIN_LEVELS = 3;
const avgLvl = team => Math.max(1, Math.round(team.reduce((s, p) => s + p.lvl, 0) / team.length));
// Slimes you've put star points into show up more often: +100% weight per full star's worth of placed points (partial stars count partially).
const STAR_ROLL_BOOST = 1;
function recruitWeight(el, cls) {
  const base = RARE_ELS.includes(el) && REALM === 0 ? RARE_WEIGHT : 1;   // Realm 2: rare elements are as common as the rest
  const a = typeof starAlloc === 'function' ? starAlloc(comboKey(el, cls)) : 0;
  return base * (1 + STAR_ROLL_BOOST * a / STAR_STEP);
}
const FUSION_ON = () => typeof META !== 'undefined' && META.cleared.includes(2);   // clearing Realm 2 unlocks fused starters; shrines only appear in Realm 2 itself, wild fused slimes anywhere
const FUSE_BONUS = 1, WILD_FUSE = 0.06, FOE_FUSE = 0.3;
// Merge two slimes into one: both elements, two random moves from each parent. The kept class decides stats, basic attack, passive pool and level-up moves; the hat and weapon are each a random parent's class in a random parent's element style.
// No stat bonus: fusing trades two slimes for one that has both elements and a mixed moveset.
// Fusion = multiclass. Both elements AND both classes; stats are the parents' average (star boosts included).
// A random parent supplies the base moves, basic attack and passive; the other parent's moves are offered to learn (p.pending).
// Special names for multiclass fusions (order doesn't matter).
const MULTICLASS = {
  'cleric+fighter':'Templar', 'fighter+mage':'Spellblade', 'fighter+monk':'Brawler', 'bulwark+fighter':'Vanguard', 'bard+fighter':'Skald',
  'fighter+ranger':'Skirmisher', 'fighter+sorcerer':'Eldritch Knight', 'fighter+rogue':'Duelist',
  'cleric+mage':'Oracle', 'cleric+monk':'Mystic', 'bulwark+cleric':'Paladin', 'bard+cleric':'Hymnist', 'cleric+ranger':'Druid',
  'cleric+sorcerer':'Theurge', 'cleric+rogue':'Inquisitor',
  'mage+monk':'Arcane Fist', 'bulwark+mage':'Spellguard', 'bard+mage':'Enchanter', 'mage+ranger':'Arcane Archer', 'mage+sorcerer':'Archmage', 'mage+rogue':'Trickster',
  'bulwark+monk':'Sentinel', 'bard+monk':'Dancer', 'monk+ranger':'Pathfinder', 'monk+sorcerer':'Avatar', 'monk+rogue':'Ninja',
  'bard+bulwark':'Herald', 'bulwark+ranger':'Warden', 'bulwark+sorcerer':'Runeguard', 'bulwark+rogue':'Bodyguard',
  'bard+ranger':'Troubadour', 'bard+sorcerer':'Siren', 'bard+rogue':'Swashbuckler',
  'ranger+sorcerer':'Shaman', 'ranger+rogue':'Stalker', 'rogue+sorcerer':'Hexblade'
};
const multiName = (c1, c2) => c1 === c2 ? CLASSES[c1].name : MULTICLASS[[c1, c2].sort().join('+')] || CLASSES[c1].name + '/' + CLASSES[c2].name;
const ELEMENT_COMBO = {
  'fire+water':'Steam', 'earth+fire':'Magma', 'fire+life':'Phoenix', 'fire+lightning':'Plasma', 'fire+light':'Solar', 'dark+fire':'Hellfire', 'fire+psychic':'Astral Flame',
  'earth+water':'Mud', 'life+water':'Coral', 'lightning+water':'Storm', 'light+water':'Rainbow', 'dark+water':'Abyss', 'psychic+water':'Mirage',
  'earth+life':'Forest', 'earth+lightning':'Magnet', 'earth+light':'Crystal', 'dark+earth':'Grave', 'earth+psychic':'Rune',
  'life+lightning':'Pulse', 'life+light':'Sunbloom', 'dark+life':'Blight', 'life+psychic':'Spirit',
  'light+lightning':'Laser', 'dark+lightning':'Nightstorm', 'lightning+psychic':'Psionic',
  'dark+light':'Twilight', 'light+psychic':'Starlight', 'dark+psychic':'Nightmare'
};
const elName = (e1, e2) => !e2 || e1 === e2 ? ELEM[e1].name : ELEMENT_COMBO[[e1, e2].sort().join('+')] || ELEM[e1].name + '/' + ELEM[e2].name;
const fuseKind = (a, b) => `${elName(a.el, b.el)} ${multiName(a.cls, b.cls)}`;
function fuseSlimes(a, b) {
  const [base, other] = Math.random() < 0.5 ? [a, b] : [b, a];
  const avg = k => (a.base[k] + b.base[k]) / 2;
  const p = { side:'P', name:`${a.name.split(' ')[0]}-${b.name.split(' ')[0]}`, kind:fuseKind(base, other), el:base.el, el2:other.el, cls:base.cls, cls2:other.cls !== base.cls ? other.cls : undefined,
    lvl:Math.min(LVL_MAX, Math.ceil((a.lvl + b.lvl) / 2)), lvFrac:0,
    base:{ hp:avg('hp'), off:avg('off'), pdef:avg('pdef'), sdef:avg('sdef'), spd:avg('spd'), sta:avg('sta') }, crit:(a.crit + b.crit) / 2,
    basic:clone(base.basic), moves:base.moves.map(clone), learned:[...new Set([...a.learned, ...b.learned])], pas:base.pas || pick(PASSIVES[base.cls]).id,
    look:{ hat:pick([a.cls, b.cls]), hatEl:pick([a.el, b.el]), wp:pick([a.cls, b.cls]), wpEl:pick([a.el, b.el]) }, parents:[[base.el, base.cls], [other.el, other.cls]] };
  p.pending = other.moves.filter(m => !p.moves.some(x => x.n === m.n)).map(clone);
  mkUnit(p);
  p.hp = Math.max(1, Math.round(p.max * (Math.max(0, a.hp) / a.max + Math.max(0, b.hp) / b.max) / 2));
  return p;
}
// New random hat/weapon mix from the parents (cosmetic only).
function rerollLook(p) { const P = p.parents; if (!P) return; const c = () => pick(P)[1], el = () => pick(P)[0]; let n = 0, old = JSON.stringify(p.look);
  do { p.look = { hat:c(), hatEl:el(), wp:c(), wpEl:el() }; } while (JSON.stringify(p.look) === old && ++n < 8); }
// Fill free move slots from the pending list without asking (starters, wild fusions).
function absorbPending(p, keepOther = 2) {
  const pend = p.pending || []; delete p.pending;
  if (p.moves.length + pend.length > 4) p.moves = [...p.moves.slice(0, 4 - Math.min(keepOther, pend.length)), ...pend.slice(-keepOther)];
  else p.moves = [...p.moves, ...pend];
  return p;
}
const shuf = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
// Wild fused slime for the recruit screen.
function wildFused(team) {
  const L = avgLvl(team), cl = Object.keys(CLASSES), els = shuf(ALL_ELS.slice()).slice(0, 2);
  const f = absorbPending(fuseSlimes(newSlime(els[0], pick(cl), L, true), newSlime(els[1], pick(cl), L, true)));
  f.hp = f.max;
  const k = f.kind, nm = giveName(f, team); nm.kind = k; return nm;
}
// Dual-element enemy: a second element and a few of its moves.
function fuseFoe(u, w) {
  const pool = WORLDS[w].els.filter(e => e !== u.el); if (!pool.length || u.boss || u.el2 || u.creature) return;
  const el2 = pick(pool); u.el2 = el2; u.name = `${ADJ[el2]}-${u.name}`;
  if (u.cls && u.cls === u.role) { const k2 = learnset(el2, u.cls).filter(x => x.lvl <= u.lvl && !x.m.passive).map(x => clone(x.m)); u.moves = [...u.moves.slice(-2), ...k2.slice(-2)]; }
  else { u.moves.push(clone(E_MOVE[el2])); if (w >= 2 && E_HEAVY[el2]) u.moves.push(clone(E_HEAVY[el2])); }
}
function recruitOffers(team) {
  const out = [], combos = [];
  STARTERS.concat(RARE_ELS).forEach(el => Object.keys(CLASSES).forEach(cls => combos.push({ el, cls, w:recruitWeight(el, cls) })));
  while (out.length < RECRUIT_CHOICES) {
    let r = Math.random() * combos.reduce((s, c) => s + (out.some(o => o.el === c.el && o.cls === c.cls) ? 0 : c.w), 0), c = null;
    for (const x of combos) { if (out.some(o => o.el === x.el && o.cls === x.cls)) continue; c = x; r -= x.w; if (r <= 0) break; }
    if (REALM >= 1 && Math.random() < WILD_FUSE && !out.some(o => o.el2)) { out.push(wildFused(team.concat(out))); continue; }
    out.push(giveName(newSlime(c.el, c.cls, avgLvl(team), true), team.concat(out)));
  }
  return out;
}
// Move upgrades always improve the same thing for a given move, picked from the move's role:
// damage moves get +POW (and +5% to any status chance), status-built moves get +status chance, pure status moves +chance
// (a guaranteed status becomes its + version instead), pure debuffs +1 stage, support moves their main effect,
// bombs/counters their power; anything else gets cheaper. A few favorites keep the old all-in-one upgrade.
const FULL_BOOST = new Set(['Dissonance', 'Firebrand Anthem', 'Fan the Flames', 'Bonfire Song']);
const BOOST_STATUS = ['burn', 'poison', 'stun', 'para', 'blind', 'confuse'];
const r2 = x => Math.round(x * 100) / 100;
const pushChance = (m, ks, d) => ks.forEach(k => { m[k] = Math.min(1, r2(m[k] + d)); });
function boostPlan(m) {
  const P = (t, f) => ({ t, f });
  if (FULL_BOOST.has(m.n.replace(/\+$/, ''))) return P('everything improves', () => boostAll(m));
  const sts = BOOST_STATUS.filter(k => m[k]), open = sts.filter(k => m[k] < 1), powUp = m.hits > 1 ? 5 : 10;
  const hostile = m.t === 'foe' || m.t === 'foes';
  if (m.pow > 0) {
    const statusBuilt = m.pow <= 40 && sts.some(k => m[k] >= 0.4);
    if (statusBuilt && open.length) return P(`+10% ${open.join('/')} chance, +5 POW`, () => { pushChance(m, open, 0.1); m.pow += 5; });
    if (open.length) return P(`+${powUp} POW, +5% ${open.join('/')} chance`, () => { m.pow += powUp; pushChance(m, open, 0.05); });
    return P(`+${powUp} POW`, () => { m.pow += powUp; });
  }
  if (m.bomb) return P('+10 bomb POW', () => { m.bomb.pow += 10; });
  if (m.counter) return P('+10 counter POW', () => { m.counter.pow += 10; });
  if (hostile && sts.length) {
    if (open.length) return P(`+10% ${open.join('/')} chance`, () => pushChance(m, open, 0.1));
    const plus = sts.find(k => k !== 'stun' && !m[k + 'P']);
    if (plus) return P(`${plus} becomes ${plus}+`, () => { m[plus + 'P'] = true; });
  }
  if (hostile) for (const [k, lab] of [['weaken', 'OFF'], ['expose', 'DEF'], ['slow', 'SPE']]) if (m[k] && m[k] < 3) return P(`lowers ${lab} 1 more stage`, () => { m[k] += 1; });
  if (m.healPct) return P('heal x1.25', () => { m.healPct = r2(m.healPct * 1.25); });   // support amounts grow by 25% of themselves
  if (m.shieldPct) return P('shield x1.25', () => { m.shieldPct = r2(m.shieldPct * 1.25); });
  if (m.regen) return P('regen x1.25', () => { m.regen[0] = Math.round(m.regen[0] * 1.25 * 1000) / 1000; });
  if (m.revive) return P('+10% revive HP', () => { m.revive = r2(m.revive + 0.1); });
  if (m.offUp) return P('+1 OFF stage', () => { m.offUp += 1; });
  if (m.staGain) return P('STA given x1.25', () => { m.staGain = Math.round(m.staGain * 1.25); });
  if (m.staDrain) return P('+10 STA drained', () => { m.staDrain += 10; });
  if (m.s >= 20) return P('-5 STA cost', () => { m.s -= 5; });
  return P('everything improves', () => boostAll(m));
}
const rollBoost = boostPlan;   // kept name: upgrades are no longer random
function boostMove(m, opt = rollBoost(m)) {
  opt.f();
  if (!m.n.endsWith('+')) m.n += '+';
  return opt.t;
}
function boostAll(m) {
  if (m.pow > 0) m.pow += m.hits > 1 ? 5 : 10;
  if (m.healPct) m.healPct = Math.round((m.healPct + 0.05) * 100) / 100;
  if (m.shieldPct) m.shieldPct = Math.round((m.shieldPct + 0.05) * 100) / 100;
  if (m.regen) m.regen[0] = Math.round((m.regen[0] + 0.02) * 100) / 100;
  if (m.offUp) m.offUp += 1;
  if (m.revive) m.revive = Math.round((m.revive + 0.1) * 100) / 100;
  ['burn', 'poison', 'stun', 'para', 'blind', 'confuse'].forEach(k => { if (m[k] && m[k] < 1) m[k] = Math.min(1, Math.round((m[k] + 0.1) * 100) / 100); });
  if (m.staGain) m.staGain += 10;
  if (m.staDrain) m.staDrain += 10;
}
// Treasure: permanent base-stat boosts (they grow with level) or a move upgrade.
function upgradePool(team) {
  const out = [];
  for (let i = 0; i < 3; i++) {
    const p = pick(team), m = pick(allMoves(p));
    const up = (k, f, label) => ({ t:label, f:() => { p.base[k] = Math.round(p.base[k] * f * 10) / 10; derive(p); } });
    const o = pick([
      up('hp', 1.12, 'Max HP +12%'), up('off', 1.1, 'Offense +10%'), up('pdef', 1.1, 'DEF +10%'), up('sdef', 1.1, 'SpD +10%'), up('spd', 1.12, 'SPE +12%'),
      { t:'Stamina +20', f:() => { p.base.sta += 20; derive(p); } },
      (bo => ({ t:`Upgrade ${m.n} (${bo.t})`, f:() => boostMove(m, bo) }))(rollBoost(m))
    ]);
    out.push({ ...o, who:p });
  }
  return out;
}
