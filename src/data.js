/* ================= elements ================= */
const ELEM = {
  fire:{name:'Fire',c:'#f94144',m:'r',s:'R'}, water:{name:'Water',c:'#4cc9f0',m:'b',s:'B'},
  life:{name:'Life',c:'#90be6d',m:'e',s:'E'}, earth:{name:'Earth',c:'#c08a55',m:'n',s:'N'},
  lightning:{name:'Lightning',c:'#f9c74f',m:'y',s:'Y'}, light:{name:'Light',c:'#fff1b8',m:'x',s:'X'},
  dark:{name:'Dark',c:'#8a7fb0',m:'d',s:'D'}, psychic:{name:'Psychic',c:'#d17fe8',m:'p',s:'P'},
  neutral:{name:'Normal',c:'#c9c1ee'}
};
const CYC = ['water','fire','life','earth','lightning']; // each beats the next, last beats first
const SPC = ['light','dark','psychic'];
function effMult(a, d) {
  if (!a || a === 'neutral' || !d) return 1;
  for (const c of [CYC, SPC]) {
    const i = c.indexOf(a), j = c.indexOf(d);
    if (i >= 0 && j >= 0) {
      if ((i + 1) % c.length === j) return 1.5;
      if ((j + 1) % c.length === i) return 0.67;
      return 1;
    }
  }
  return 1;
}
// Multi-element units multiply their multipliers (x1.5 and x0.67 cancel out to neutral; double weakness is x2.25).
const effVs = (me, u) => { const v = [u.el, u.el2, u.el3].filter(Boolean).reduce((s, x) => s * effMult(me, x), 1); return Math.abs(v - 1) < 0.02 ? 1 : v; };

/* ================= levels + stats =================
   Every stat (except stamina) is base x mult(level). Level 100 = about 6x level 1.
   Damage = pow x (OFF / DEF) x mult(attacker level) / 5, so fights stay the same length at any level
   but a level gap really matters. */
const LVL_MAX = 100;
const mult = L => 1 + 0.05 * (L - 1);

const CLASSES = {
  fighter:{ name:'Fighter', hp:54, off:12.2, pdef:12.5, sdef:10.5, spd:5, sta:80,  crit:0.05, desc:'All-rounder. Solid stats, can hit every foe.' },
  cleric: { name:'Cleric',  hp:50, off:9.3, pdef:11, sdef:12.5, spd:4, sta:100, crit:0.05, desc:'Support. Heals and buffs, decent damage.' },
  mage:   { name:'Mage',    hp:44, off:12.9, pdef:7.5, sdef:11, spd:7.5, sta:110, crit:0.05, desc:'Glass cannon. Huge OFF and stamina, but fragile.' },
  monk:   { name:'Monk',    hp:49, off:10.5, pdef:9, sdef:9.5, spd:8.5, sta:90, crit:0.1, desc:'Half healer, half striker. Fast combos that mend allies.' },
  bulwark:{ name:'Bulwark', hp:72, off:10.8, pdef:15, sdef:12, spd:2.5, sta:90, crit:0.05, desc:'The tank. Hammer and shield: taunts, guards allies, shrugs off hits.' },
  bard:   { name:'Bard',    hp:45, off:10, pdef:8, sdef:14, spd:7, sta:100, crit:0.05, desc:'Songs that buff the team and wreck the foes. Weak hits.' },
  ranger: { name:'Ranger',  hp:54, off:12.5, pdef:10, sdef:9.5,  spd:8,   sta:95,  crit:0.1,  desc:'The debuffer. Reliable debuffs, shield breaking, extra turns and arrow storms that hit every foe.' },
  sorcerer:{ name:'Warlock', hp:60, off:12.4, pdef:9.5, sdef:12, spd:4.5, sta:50, crit:0.05, desc:'Pact magic. Tiny stamina and costly spells, but its free Eldritch Blast grows with every invocation it learns.' },
  rogue:  { name:'Rogue',   hp:52, off:13, pdef:9, sdef:12, spd:9, sta:80,  crit:0.1,  desc:'Fast, massive single-target damage. Increased crit rate.' }
};
/* ---- class passives: a starter picks one of its class's two, recruits roll one at random ---- */
const PASSIVES = {
  fighter:  [{ id:'standing', n:"I'm Still Standing", d:'The first time it would be knocked out each fight, it survives with 1 HP. Stacks with the Phoenix Plume.' },
             { id:'brute', n:'Brute', d:'+25% OFF.' }],
  cleric:   [{ id:'healer', n:'Healer', d:'Its heals are 25% stronger.' },
             { id:'guardian', n:'Guardian Angel', d:'At the end of every round, shields the ally with the lowest HP (by %) for 20% of their max HP.' }],
  rogue:    [{ id:'opportunist', n:'Opportunist', d:'+50% damage against foes with a status ailment or lowered stats (burn, poison, stun, paralysis, blind, confusion, marked, stat drops).' },
             { id:'killer', n:'Cold Hearted Killer', d:'Hits that leave a foe at 15% HP or less finish it. Against bosses, each damaging move adds a bonus hit worth 15% of its damage.' }],
  mage:     [{ id:'armor', n:'Mage Armor', d:'Starts each fight with a shield worth 50% of max HP that lasts one turn.' },
             { id:'power', n:'Unlimited Power', d:'Damaging moves lose their side effects but deal 50% more damage. Drawbacks like recoil stay.' }],
  ranger:   [{ id:'trap', n:'Trap Master', d:'Status effect chances are doubled.' },
             { id:'volley', n:'Volley Expert', d:'Single-target moves also hit the other foes for 20% of the damage (status chances can still land). Area moves deal 25% more.' }],
  monk:     [{ id:'hands', n:'Quick Hands', d:'Multi-hit moves hit once more.' },
             { id:'peace', n:'La Peace', d:'Resting also heals 20% of max HP and cures ailments.' }],
  bulwark:  [{ id:'champion', n:'Champion', d:'Starts each fight taunting for 1 turn.' },
             { id:'defender', n:'Elite Defender', d:'Your whole team starts each fight with +25% DEF and SpD for 3 rounds.' }],
  bard:     [{ id:'tricky', n:'Too Tricky for Pain', d:'Its DEF is the average of its DEF and SpD.' },
             { id:'swords', n:'College of Swords', d:'Attacks with its SpD instead of its OFF. OFF boosts it gets become random stat boosts.' }],
  sorcerer: [{ id:'embody', n:'Embodiment', d:'Resisted attacks deal normal damage, and it takes 25% less damage from its own element.' },
             { id:'spite', n:'Spite', d:'When hit, 20% of the damage is thrown back at a random foe.' }]
};
const passiveOf = u => { if (u && u.pas === 'blessing') u.pas = 'guardian';   // old saves
  return u && u.pas && PASSIVES[u.cls] ? [...PASSIVES[u.cls], ...(PASSIVES[u.cls2] || [])].find(p => p.id === u.pas) || null : null; };
const STARTERS = ['fire','water','life','lightning','earth'];
// Rare elements: recruit-only, offered less often.
const RARE_ELS = ['light','dark','psychic'];
const ALL_ELS = [...STARTERS, ...RARE_ELS];
const RARE_WEIGHT = 0.5;   // each rare element is half as likely as a starter element in recruit offers
// Classes you can start as. Mage and Ranger are recruit-only for now.
const STARTER_CLASSES = ['fighter','cleric','rogue','mage','ranger','monk','bulwark','bard','sorcerer'];
const STAT_KEYS = ['hp','off','pdef','sdef','spd','sta'];
// Star boosts: each point adds this much of a stat; a recruited copy gets only part of your starter's bonus.
// Stuns land 50% more often than a move's listed base chance, but a unit that just lost a turn to a stun is Dazed:
// it can't be stunned again until it has had a turn, so everyone acts at least every other turn.
const STUN_MULT = 1.5;
const STAR_STEP = 10, STAR_STAT_MAX = 10, STAR_PER_POINT = 0.05, RECRUIT_STAR = 0.5;
const STAT_NAME = { hp:'HP', off:'OFF', pdef:'DEF', sdef:'SpD', spd:'SPE', sta:'STA' };
const EL_STATS = {
  fire:  { hp:-0.75, off:+2.5, pdef:+0, sdef:+0,  spd:+1, sta:0,  desc:'Hyper offense: big OFF, fast, low HP' },
  water: { hp:+1, off:-0.5, pdef:+0, sdef:+0.5, spd:+0.75, sta:-1, desc:'Bulky speedster: lots of HP and speed, low OFF and STA' },
  life:  { hp:+1, off:0,  pdef:+0, sdef:+0,  spd:0,  sta:0,  desc:'Well rounded. Sustains itself and spreads effects' },
  lightning: { hp:+0.5, off:+1, pdef:+0, sdef:+0, spd:+1.75, sta:0,  desc:'Fast and tricky: paralyzes, hastes allies' },
  earth: { hp:+1, off:+1, pdef:+1.5, sdef:-0.5, spd:-1.5, sta:-1, desc:'Tough, solid and strong, but sluggish' },
  light:   { hp:+0.5, off:0,  pdef:+0, sdef:+0.75,  spd:-1, sta:-1, desc:'Strong protector: shields, heals, and attacks that mend allies' },
  dark:    { hp:+1,  off:+1.5, pdef:+0, sdef:+0,  spd:+0.75, sta:-0.5, desc:'Ruthless offense: hits hard, blinds foes, veils allies' },
  psychic: { hp:+1,  off:+1.5,  pdef:+0, sdef:+0.5,  spd:+1,  sta:+0.5, desc:'Fast controller: confusion and stamina drain; its attacks hit confused or drained foes 25% harder' }
};
// Element steps: each step is +/-10% for HP, OFF, DEF and SPE, or +/-12 for stamina.
const STEP_PCT = 0.1, STEP_STA = 12;
function baseOf(el, cls) {
  const C = CLASSES[cls], S = EL_STATS[el] || {}, o = { crit:C.crit };
  STAT_KEYS.forEach(k => o[k] = k === 'sta' ? C.sta + (S.sta || 0) * STEP_STA : Math.round(C[k] * (1 + (S[k] || 0) * STEP_PCT) * 10) / 10);
  return o;
}
const stepText = (k, v) => k === 'sta' ? `${v > 0 ? '+' : ''}${v * STEP_STA}` : `${v > 0 ? '+' : ''}${v * 10}%`;
// Basic hits are free and recharge 20% of max stamina; Rest recharges 50%.
const BASIC_COST = 0, BASIC_CHARGE = 0.2, STA_REGEN = 10, REST_PCT = 0.5, PARTY_MAX = 3, RECRUIT_CHOICES = 3;

/* ================= moves =================
   pow 0-100 (a few ultimates go past). s = stamina cost.
   t = target: foe, foes (all), self, ally, allies (whole team), fallen (a KO'd ally). */
// Warlock invocations: move-slot passives that add to its Eldritch Blast (see effMove). inv: flags merged into the blast, powMul scales it.
const INV = (id, n, d, inv) => ({ n, passive:id, d, el:'neutral', pow:0, s:0, t:'self', inv });
const BASIC = {
  fighter:{ n:'Slam',  el:'neutral', pow:50, s:BASIC_COST, t:'foe', staCharge:BASIC_CHARGE },
  cleric: { n:'Smite', el:'light',   cat:'s', pow:60, s:BASIC_COST, t:'foe', staCharge:BASIC_CHARGE },   // always Light, whatever the slime's element
  rogue:  { n:'Stab',  el:'neutral', pow:45, s:BASIC_COST, t:'foe', staCharge:BASIC_CHARGE, critBonus:0.2 },
  mage:   { n:'Bonk',  el:'neutral', pow:25, s:BASIC_COST, t:'foe', staCharge:BASIC_CHARGE },   // genuinely bad: mages cast spells
  ranger: { n:'Arrow Shot', el:'neutral', pow:45, s:BASIC_COST, t:'foe', staCharge:BASIC_CHARGE },
  bulwark:{ n:'Hammer Bonk', el:'neutral', pow:45, s:BASIC_COST, t:'foe', staCharge:BASIC_CHARGE },
  sorcerer:{ n:'Eldritch Blast', el:'self', cat:'s', pow:65, s:BASIC_COST, t:'foe', staCharge:0.3, blast:true },   // own element; more beams at Lv20/40, invocations add to it (effMove)
  bard:   { n:'Lute Smack',  el:'neutral', pow:40, s:BASIC_COST, t:'foe', staCharge:BASIC_CHARGE },
  monk:   { n:'Palm Strike', el:'neutral', pow:40, s:BASIC_COST, t:'foe', staCharge:BASIC_CHARGE, mendAlly:0.15 }
};

// Learnset curve, squeezed so a full 8-world run (about Lv60) gets the whole kit.
// Classes are the main kit; elements add a few buffs/debuffs on top. Combo levels 22 / 44 are reserved for later.
// Attack type: physical (weapons, fists, arrows) or special (spells, holy/dark power, songs).
// Most moves follow their class; support classes' DEF-lowering hits both defenses, attackers lower their own type.
const CLS_CAT = { fighter:'p', rogue:'p', monk:'p', ranger:'p', bulwark:'p', mage:'s', cleric:'s', bard:'s', sorcerer:'s' };
const SUPPORT_CLS = { cleric:1, bard:1 };
const tagCat = (m, cls) => { if (!m.cat) m.cat = CLS_CAT[cls] || 'p'; if (m.expose || m.exposeCh) m.exp = SUPPORT_CLS[cls] ? 'b' : m.cat; return m; };
const LEARN_LV = { el:[1, 18, 36], cls:[1, 5, 10, 17, 26, 38, 52], combo:[1, 22, 44] };
// Classes that have their full combo set swap some generic element/class moves for extra combo moves.
// drop: indexes of EL_MOVES / CLASS_MOVES they skip; combo: learn levels for each combo move, in array order.
const CLASS_LEARN = {
  fighter:{ dropEl:[1], dropCls:[1, 4], combo:[1, 22, 44, 8, 14, 32] },  // no Power Strike, Whirlwind or element support move
  cleric: { dropEl:[1], dropCls:[1, 3], combo:[1, 22, 44, 8, 14, 32] },  // no Holy Bolt, Radiant Burst or element support move
  rogue:  { dropEl:[1], dropCls:[1, 3], combo:[1, 22, 44, 8, 14, 32] },  // no Twin Slash, Poison Blade or element support move
  mage:   { dropEl:[1], dropCls:[2, 5], combo:[1, 22, 44, 8, 14, 32] },  // no Elemental Blast, Meteor or element support move
  ranger: { dropEl:[1], dropCls:[0], combo:[1, 22, 44, 8, 14, 32] },  // no Pinning Shot or element support move
  bulwark:{ dropEl:[], dropCls:[3, 5], combo:[1, 22, 44, 8, 14, 32] },  // no Fortress or Last Stand
  bard:   { dropEl:[], dropCls:[3, 5], combo:[1, 22, 44, 8, 14, 32] },   // no Ballad of Rest or Inspire
  sorcerer:{ dropEl:[1], dropCls:[], combo:[1, 22, 44, 8, 14, 32] },   // Warlock keeps its whole class kit (invocations live there)
  monk:   { dropEl:[1], dropCls:[2, 3], combo:[1, 22, 44, 8, 14, 32] }   // no Chi Strike, Pressure Point or element support move
};
const comboLv = cls => (CLASS_LEARN[cls] || LEARN_LV).combo;

// Element moves: mostly support and effects.
const EL_MOVES = {
  fire: [   // aggression: burns, attack buffs, armor melting
    { n:'Ember',        el:'fire', pow:60, s:20, t:'foe',    burn:0.6 },
    { n:'Kindle',       el:'fire', pow:0,  s:20, t:'ally',   offUp:2 },
    { n:'Scorch',       el:'fire', pow:0,  s:35, t:'foes',   burn:0.5, expose:1 }
  ],
  water: [  // protection: shields, weakening foes, healing
    { n:'Bubble Shield',el:'water', pow:0, s:25, t:'ally',   shieldPct:0.42 },
    { n:'Soak',         el:'water', pow:0, s:25, t:'foes',   weaken:1 },
    { n:'Tide Pool',    el:'water', pow:0, s:35, t:'allies', healPow:60, cleanse:true }
  ],
  life: [   // sustain: drain, poison, regen
    { n:'Leech Seed',     el:'life', pow:45, s:20, t:'foe',    poison:0.6, leech:0.5 },
    { n:'Photosynthesis', el:'life', pow:0,  s:30, t:'self',   healPct:0.3, regen:[0.1,3] },
    { n:'Spore Cloud',    el:'life', pow:0,  s:35, t:'foes',   poison:0.5, stun:0.1 }
  ],
  lightning: [ // tempo: paralysis, speed, crits
    { n:'Static Shock',   el:'lightning', pow:40, s:20, t:'foe',  para:0.5 },
    { n:'Overcharge',     el:'lightning', pow:0,  s:25, t:'ally', haste:2 },
    { n:'Static Field',   el:'lightning', pow:0,  s:35, t:'foes', para:0.4, stun:0.1 }
  ],
  earth: [     // toughness: armor, cracking defenses, heavy hits
    { n:'Rock Smash',     el:'earth', pow:55, s:25, t:'foe',  expose:1 },
    { n:'Stone Skin',     el:'earth', pow:0,  s:25, t:'ally', armor:2, shieldPct:0.15 },
    { n:'Earthquake',     el:'earth', pow:40, s:30, t:'foes', stun:0.15 }
  ],
  light: [     // protection with some bite: attacks mend allies
    { n:'Holy Light',     el:'light', pow:50, s:25, t:'foe',    mendAlly:0.3 },
    { n:'Sacred Shield',  el:'light', pow:0,  s:30, t:'ally',   shieldPct:0.27, armor:1 },
    { n:'Dawn',           el:'light', pow:0,  s:45, t:'allies', healPow:60, offUp:1, cleanse:true }
  ],
  dark: [      // tricks: blind foes, veil allies
    { n:'Shadow Bite',    el:'dark', pow:50, s:25, t:'foe',    blind:0.5 },
    { n:'Dread',          el:'dark', pow:0,  s:30, t:'foes',   weaken:1, blind:0.3 },
    { n:'Night Veil',     el:'dark', pow:0,  s:40, t:'allies', veil:1 }
  ],
  psychic: [   // mind games: confusion and stamina warfare
    { n:'Mind Spike',     el:'psychic', pow:55, s:20, t:'foe',    staDrain:20, confuse:0.35 },
    { n:'Psych Out',      el:'psychic', pow:0,  s:30, t:'foes',   confuse:0.55 },
    { n:'Insight',        el:'psychic', pow:0,  s:35, t:'allies', staGain:30, offUp:1 }
  ]
};
// Class moves: the main kit. Attacks marked el:'self' hit with the slime's own element.
const CLASS_MOVES = {
  fighter: [   // all-rounder: hits everything, sturdy, rallies the team
    { n:'Cleave',            el:'self', pow:40,  s:25, t:'foes' },
    { n:'Power Strike',      el:'self', pow:65,  s:25, t:'foe' },
    { n:'Battle Cry',        el:'neutral', pow:0, s:30, t:'allies', offUp:1, selfTaunt:2 },
    { n:'Shield Bash',       el:'self', pow:55,  s:25, t:'foe',  stun:0.3, selfTaunt:1 },
    { n:'Whirlwind',         el:'self', pow:60,  s:45, t:'foes' },
    { n:'Second Wind',       el:'neutral', pow:0, s:35, t:'self', healPct:0.3, shieldPct:0.22, armor:1 },
    { n:"Champion's Strike", el:'self', pow:110, s:55, t:'foe',  critBonus:0.3 }
  ],
  cleric: [    // support with real damage
    { n:'Mend',           el:'neutral', pow:0, s:25, t:'ally',   healPow:145 },
    { n:'Holy Bolt',      el:'self', pow:85,   s:25, t:'foe' },
    { n:'Bless',          el:'neutral', pow:0, s:25, t:'ally',   offUp:1, shieldPct:0.3 },
    { n:'Radiant Burst',  el:'self', pow:55,   s:35, t:'foes' },
    { n:'Resurrection',   el:'neutral', pow:0, s:70, t:'fallen', revive:0.4 },   // Lv26: every Cleric gets a revive by mid-run
    { n:'Judgment',       el:'self', pow:100,   s:45, t:'foe',    expose:1 },
    { n:'Sanctuary',      el:'neutral', pow:0, s:55, t:'allies', healPow:125, shieldPct:0.15, cleanse:true }
  ],
  rogue: [     // fast, massive single-target damage
    { n:'Assassinate',     el:'self', pow:85,  s:35, t:'foe',  critBonus:0.1 },
    { n:'Twin Slash',      el:'self', pow:35,  s:20, t:'foe',  hits:2, exposeCh:0.25 },
    { n:'Expose Weakness', el:'self', pow:30,  s:12, t:'foe',  expose:1 },
    { n:'Poison Blade',    el:'self', pow:50,  s:30, t:'foe',  poison:0.8 },
    { n:'Fan of Knives',   el:'self', pow:50,  s:45, t:'foes', critBonus:0.2 },
    { n:'Shadowstep',      el:'neutral', pow:0, s:30, t:'self', shieldPct:0.3, offUp:1 },
    { n:'Death Mark',      el:'self', pow:110, s:60, t:'foe',  critBonus:0.3, execute:true }
  ],
  mage: [      // glass cannon: huge elemental spells, needs protecting
    { n:'Arcane Bolt',     el:'self', pow:70,  s:30, t:'foe' },
    { n:'Mana Shield',     el:'neutral', pow:0, s:25, t:'self', shieldPct:0.45 },
    { n:'Elemental Blast', el:'self', pow:50,  s:35, t:'foes' },
    { n:'Arcane Focus',    el:'neutral', pow:0, s:25, t:'self', offUp:2 },
    { n:'Hex',             el:'neutral', pow:0, s:30, t:'foe',  weaken:1, expose:1 },
    { n:'Meteor',          el:'self', pow:70,  s:65, t:'foes', stun:0.15 },
    { n:'Cataclysm',       el:'self', pow:125, s:75, t:'foe' }
  ],
  bulwark: [   // the tank: protects allies, soaks hits, slow but sturdy
    { n:'Shield Up',          el:'neutral', pow:0, s:20, t:'self', taunt:2 },
    { n:'Hammer Down',        el:'self', pow:60,  s:30, t:'foe',  stun:0.25, bulk:0.5 },
    { n:'Guard',              el:'neutral', pow:0, s:25, t:'ally', guard:3, armor:1 },
    { n:'Fortress',           el:'neutral', pow:0, s:30, t:'self', armor:2 },
    { n:'Shield Slam',        el:'self', pow:55,  s:30, t:'foe',  weaken:1, bulk:0.5 },
    { n:'Last Stand',         el:'neutral', pow:0, s:40, t:'self', healPct:0.3, armor:1 },
    { n:'Earthbreaker',       el:'self', pow:70,  s:60, t:'foes', stun:0.08, para:0.2 }
  ],
  sorcerer: [  // Warlock: tiny STA, costly spells, and invocations (passives) that power up its free Eldritch Blast
    { n:'Hex',              el:'neutral', pow:0, s:20, t:'foe', hex:3 },
    { ...INV('agonizing', 'Agonizing Blast', 'Invocation: Eldritch Blast deals 25% more damage.', { powMul:1.25 }) },
    { n:'Dark Pact',        el:'neutral', pow:0, s:25, t:'self', shieldPct:0.3, offUp:1 },
    { ...INV('repelling', 'Repelling Blast', 'Invocation: each Eldritch Blast beam has a 35% chance to lower SPE 25%.', { slowCh:0.35 }) },
    { n:'Eldritch Storm',   el:'self', pow:90, s:45, t:'foes' },
    { ...INV('spear', 'Eldritch Spear', 'Invocation: Eldritch Blast never misses, and resisted blasts deal normal damage.', { sure:true, noresist:true }) },
    { n:'Pact Cataclysm',   el:'self', pow:150, s:50, t:'foe' }
  ],
  bard: [      // songs: team buffs and foe debuffs, weak hits
    { n:'Off-Key Shriek',     el:'self', pow:35,  s:35, t:'foes', weaken:1 },
    { n:'Rally Song',         el:'neutral', pow:0, s:30, t:'allies', offUp:1 },
    { n:'Lullaby',            el:'neutral', pow:0, s:25, t:'foe',  stun:0.5 },
    { n:'Ballad of Rest',     el:'neutral', pow:0, s:35, t:'allies', regen:[0.1,3] },
    { n:'Tempo',              el:'neutral', pow:0, s:45, t:'allies', haste:1 },
    { n:'Inspire',            el:'neutral', pow:0, s:30, t:'allies', staGain:25 },
    { n:'Grand Finale',       el:'self', pow:65,  s:60, t:'foes', teamHeal:0.15 }
  ],
  monk: [      // cleric + rogue: fast multi-hits, self-care, strikes that heal allies
    { n:'Flurry of Blows', el:'self', pow:25,  s:25, t:'foe',  hits:3, weakenCh:0.2 },
    { n:'Inner Peace',     el:'neutral', pow:0, s:25, t:'self', healPct:0.3, cleanse:true },
    { n:'Chi Strike',      el:'self', pow:60,  s:35, t:'foe',  mendAlly:0.4 },
    { n:'Pressure Point',  el:'self', pow:35,  s:20, t:'foe',  stun:0.3, critBonus:0.2 },
    { n:'Meditate',        el:'neutral', pow:0, s:0, t:'self', staGain:30, offUp:1 },
    { n:'Harmony',         el:'neutral', pow:0, s:45, t:'allies', healPow:60, haste:1 },
    { n:'Hundred Fists',   el:'self', pow:22,  s:65, t:'foe',  hits:6, teamLeech:0.2 }
  ],
  ranger: [    // the debuffer: reliable debuffs, shield breaks, extra turns, area damage (no heals or buffs: that's Bard and Cleric)
    { n:'Pinning Shot',     el:'self', pow:50, s:20, t:'foe',  slow:1 },
    { n:'Armor Piercer',    el:'self', pow:55, s:30, t:'foe',  shatter:true, expose:1 },
    { n:'Volley',           el:'self', pow:60, s:30, t:'foes' },
    { n:'Quick Draw',       el:'self', pow:50, s:25, t:'foe',  extraTurn:true },
    { n:'Crippling Trap',   el:'neutral', pow:0, s:35, t:'foes', weaken:1, slow:1 },
    { n:'Rain of Arrows',   el:'self', pow:85, s:45, t:'foes', para:0.35 },
    { n:'Shredding Storm',  el:'self', pow:90, s:60, t:'foes', shatter:true, expose:1 }
  ]
};
// Cut for now (could come back as combo moves or new classes):
// Fire: Blaze Aura · Water: Aqua Veil · Life: Overgrowth
// Fighter: Guard Up, Crushing Blow · Cleric: Purify, Barrier · Rogue: Flurry, Eviscerate
// Combo moves: only the level 1 move exists so far (levels 22 / 44 are reserved).
const COMBO_MOVES = {
  fire_fighter: [{ n:'Blazing Slam', el:'fire', pow:65, s:35, t:'foe', selfOffUp:1, recoil:0.1 },
    { n:'Volcanic Blitz',   el:'fire',  pow:70,  s:45, t:'foe', splash:45 }, { n:'Inferno Brand', el:'fire', pow:120, s:65, t:'foe', burn:1, blind:1, recoil:0.15 },
    { n:'Searing Edge',  el:'fire', pow:65, s:30, t:'foe',  expose:1 }, { n:'Heat Wave', el:'fire', pow:45, s:45, t:'foes', burn:0.4 },
    { n:'Molten Armor', el:'fire', pow:0, s:35, t:'self', armor:1, offUp:1 }],
  fire_cleric:  [{ n:'Phoenix Hymn',  el:'fire',  pow:0,  s:45, t:'allies', offUp:1, healPow:40 },
    { n:'Purging Flame', el:'fire', pow:85, s:40, t:'foe', burn:0.5, dispel:true },
    { n:'Holy Inferno', el:'fire', pow:90, s:65, t:'foes', burn:0.6, teamHeal:0.15 },
    { n:'Cinder Smite', el:'fire', pow:75, s:25, t:'foe', selfOffUp:1 },
    { n:'Flame Sermon', el:'fire', pow:45, s:30, t:'foes', teamSta:0.15 },
    { n:"Zealot's Fury", el:'fire', pow:0, s:30, t:'self', offUp:2, haste:1 }],
  fire_rogue:   [{ n:'Flame Flurry',  el:'fire',  pow:30, s:45, t:'foe',    hits:3, burn:0.3 },
    { n:'Blazing Fan', el:'fire', pow:40, s:45, t:'foes', burn:0.4 },
    { n:'Immolate', el:'fire', pow:130, s:65, t:'foe', execute:true, recoil:0.1 },
    { n:'Ember Dagger', el:'fire', pow:50, s:20, t:'foe', critBonus:0.15, selfHaste:1 },
    { n:'Smoke Bomb', el:'fire', pow:0, s:25, t:'foes', blind:0.6, blindP:true },
    { n:'Hot Pursuit', el:'fire', pow:0, s:30, t:'self', offUp:1, haste:2 }],
  water_fighter: [{ n:'Tidal Wave',    el:'water', pow:35, s:45, t:'foes',   weaken:1 },
    { n:'Washing Strike', el:'water', pow:60,  s:40, t:'foe', dispel:true, cleanseTeam:true }, { n:'Whale Strike', el:'water', pow:165, s:55, t:'foe', selfStun:true },
    { n:'Riptide Slash', el:'water', pow:60, s:30, t:'foe',  weaken:1 }, { n:'Breakwater', el:'water', pow:0, s:35, t:'self', taunt:2, shieldPct:0.3 },
    { n:'Maelstrom', el:'water', pow:60, s:55, t:'foes', foeStaDrain:0.15 }],
  water_cleric: [{ n:'Healing Rain',  el:'water', pow:0,  s:45, t:'allies', healPow:50, regen:[0.1,3] },
    { n:'Drench', el:'water', pow:40, s:25, t:'foes', weaken:1 },
    { n:'Great Flood', el:'water', pow:70, s:60, t:'foes', teamHeal:0.22, cleanseTeam:true },
    { n:'Purify', el:'water', pow:0, s:25, t:'ally', healPow:65, cleanse:true },
    { n:'Tidal Ward', el:'water', pow:0, s:30, t:'allies', shieldPct:0.12 },
    { n:'Spring Water', el:'water', pow:0, s:40, t:'allies', staGain:25, cleanse:true }],
  water_rogue:  [{ n:'Undertow',      el:'water', pow:60, s:45, t:'foe',    stun:0.35 },
    { n:'Whirlpool Slash', el:'water', pow:40, s:40, t:'foes', weaken:1 },
    { n:'Abyssal Strike', el:'water', pow:140, s:65, t:'foe', weaken:2 },
    { n:'Riptide Stab', el:'water', pow:45, s:15, t:'foe', selfHaste:1 },
    { n:'Slip Away', el:'water', pow:0, s:25, t:'self', veil:1, shieldPct:0.22 },
    { n:'Flash Flood', el:'water', pow:75, s:45, t:'foe', staDrain:25 }],
  life_fighter: [{ n:'Bramble Bash', el:'life', pow:55, s:40, t:'foe', leech:0.35 },
    { n:'Sap Strike',      el:'life',  pow:55,  s:40, t:'foe', poison:1, teamLeech:0.25 }, { n:'Yggdrasil', el:'life', pow:0, s:55, t:'self', shieldPct:1, taunt:2, selfStun:true },
    { n:'Thorn Lash', el:'life', pow:55, s:25, t:'foe', expose:1 }, { n:'Overgrowth', el:'life', pow:0, s:35, t:'self', regen:[0.1,3], armor:1 },
    { n:'Briar Sweep', el:'life', pow:55, s:50, t:'foes', poison:0.5, leech:0.2 }],
  life_cleric:  [{ n:'Bloom',         el:'life',  pow:0,  s:45, t:'allies', regen:[0.1,3], cleanse:true },
    { n:'Verdant Chorus', el:'life', pow:0, s:45, t:'allies', staGain:25, offUp:1 },
    { n:'World Tree', el:'life', pow:0, s:70, t:'allies', healPow:155, armor:1 },
    { n:'Herbal Remedy', el:'life', pow:0, s:20, t:'ally', cleanse:true, staGain:20 },
    { n:'Seed of Life', el:'life', pow:0, s:30, t:'ally', regen:[0.1,3] },
    { n:'Lifebloom Strike', el:'life', pow:65, s:30, t:'foe', teamLeech:0.4 }],
  life_rogue:   [{ n:'Toxic Spores', el:'life', pow:30, s:45, t:'foes', poison:0.7 },
    { n:'Nettle Flurry', el:'life', pow:30, s:40, t:'foe', hits:3, exposeCh:0.25 },
    { n:'Deathbloom', el:'life', pow:70, s:60, t:'foes', leech:0.3, slow:1 },
    { n:'Venom Fang', el:'life', pow:50, s:20, t:'foe', critBonus:0.2, slow:1 },
    { n:'Crippling Toxin', el:'life', pow:0, s:25, t:'foe', poison:1, weaken:1 },
    { n:'Lifesteal Dance', el:'life', pow:70, s:40, t:'foe', teamLeech:0.3 }],
  lightning_fighter: [{ n:'Thunder Clap', el:'lightning', pow:40, s:45, t:'foes', slow:1, para:0.2 },
    { n:'Overdrive',   el:'lightning', pow:60, s:40, t:'foe', selfOffUp:1, selfHaste:true }, { n:'Thunderous Charge', el:'lightning', pow:55, s:50, t:'foes', teamSta:0.15, foeStaDrain:0.15 },
    { n:'Spark Jab', el:'lightning', pow:45, s:15, t:'foe', para:0.3 }, { n:'Battle Surge', el:'lightning', pow:0, s:35, t:'allies', haste:1 },
    { n:'Lightning Dash', el:'lightning', pow:80, s:40, t:'foe', pierce:true, selfHaste:1 }],
  lightning_cleric: [{ n:'Energize',     el:'lightning', pow:0,  s:45, t:'allies', haste:2, healPow:40 },
    { n:'Thunder Sermon', el:'lightning', pow:50, s:40, t:'foes', blind:0.3, para:0.2 },
    { n:'Divine Bolt', el:'lightning', pow:105, s:55, t:'foe', para:1 },
    { n:'Jolt', el:'lightning', pow:45, s:20, t:'foe', stun:0.25 },
    { n:'Recharge Hymn', el:'lightning', pow:0, s:25, t:'allies', staGain:25 },
    { n:'Overload', el:'lightning', pow:0, s:35, t:'ally', haste:2, staGain:30 }],
  lightning_rogue:  [{ n:'Volt Strike', el:'lightning', pow:75, s:40, t:'foe', para:0.5, selfHaste:1 },
    { n:'Thunderstep', el:'lightning', pow:35, s:30, t:'foe', hits:2, para:0.25 },
    { n:'Lightning Execution', el:'lightning', pow:125, s:60, t:'foe', critBonus:0.3, stun:0.3 },
    { n:'Quickstrike', el:'lightning', pow:40, s:15, t:'foe', critBonus:0.3, staDrain:25 },
    { n:'Static Siphon', el:'lightning', pow:65, s:30, t:'foe', leech:0.3, staDrain:20 },
    { n:'Arc Fan', el:'lightning', pow:50, s:40, t:'foes', slow:1, para:0.25 }],
  earth_fighter: [{ n:'Seismic Slam', el:'earth', pow:70, s:45, t:'foe', splash:25 },
    { n:'Bedrock Bash', el:'earth', pow:60, s:40, t:'foe', selfArmor:1, weaken:1 }, { n:'Tectonic Rupture', el:'earth', pow:60, s:60, t:'foes', stun:0.3, expose:1 },
    { n:'Stone Fist', el:'earth', pow:55, s:25, t:'foe', expose:1 }, { n:'Stand Firm', el:'earth', pow:0, s:30, t:'self', taunt:2, armor:1 },
    { n:'Landslide', el:'earth', pow:50, s:45, t:'foes', slow:1 }],
  earth_cleric:     [{ n:'Fortify',      el:'earth',     pow:0,  s:45, t:'allies', armor:1, shieldPct:0.18 },
    { n:'Quake Smite', el:'earth', pow:55, s:40, t:'foes', slow:1 },
    { n:'Bastion', el:'earth', pow:0, s:60, t:'allies', regen:[0.1,3], veil:1 },
    { n:'Stone Ward', el:'earth', pow:0, s:25, t:'self', taunt:2, veil:1 },
    { n:'Rampart', el:'earth', pow:0, s:25, t:'ally', armor:2 },
    { n:'Mountain Stance', el:'earth', pow:0, s:45, t:'self', regen:[0.1,3], cleanse:true }],
  earth_rogue:      [{ n:'Boulder Drop', el:'earth', pow:75, s:45, t:'foe', splash:30 },
    { n:'Crushing Blow', el:'earth', pow:90, s:45, t:'foe', pierce:true },
    { n:'Avalanche Strike', el:'earth', pow:140, s:70, t:'foe', stun:0.4 },
    { n:'Rock Shiv', el:'earth', pow:50, s:20, t:'foe', slow:1 },
    { n:'Sandblast', el:'earth', pow:30, s:20, t:'foe', blind:1 },
    { n:'Burrow', el:'earth', pow:0, s:35, t:'self', armor:2, veil:1 }],
  fire_mage:        [{ n:'Fireball', el:'fire', pow:45, s:45, t:'foes', burn:0.3 },
    { n:'Flame Pillar', el:'fire', pow:110, s:55, t:'foe', critBonus:0.2 },
    { n:'Supernova', el:'fire', pow:110, s:80, t:'foes', expose:1, selfStun:true },
    { n:'Heat Ray', el:'fire', pow:85, s:40, t:'foe', dispel:true },
    { n:'Combustion', el:'fire', pow:0, s:25, t:'foe', burn:1, burnP:true, expose:1 },
    { n:'Pyroclasm', el:'fire', pow:80, s:65, t:'foes', blind:0.3, recoil:0.1 }],
  water_mage:       [{ n:'Torrent',         el:'water',     pow:45, s:45, t:'foes',   weaken:1 },
    { n:'Tsunami', el:'water', pow:75, s:60, t:'foes', slow:1 },
    { n:'Deluge', el:'water', pow:90, s:75, t:'foes', stun:0.25, selfStun:true },
    { n:'Aqua Jet', el:'water', pow:60, s:25, t:'foe', slow:1 },
    { n:'Water Barrier', el:'water', pow:0, s:35, t:'allies', shieldPct:0.15 },
    { n:'Pressure Jet', el:'water', pow:100, s:50, t:'foe', pierce:true }],
  life_mage:        [{ n:'Thorn Storm', el:'life', pow:40, s:45, t:'foes', poison:0.75 },
    { n:'Bramble Storm', el:'life', pow:55, s:50, t:'foes', slow:1 },
    { n:"Gaia's Wrath", el:'life', pow:80, s:80, t:'foes', teamHeal:0.22 },
    { n:'Thorn Bolt', el:'life', pow:55, s:25, t:'foe', teamLeech:0.2 },
    { n:'Regrowth', el:'life', pow:0, s:30, t:'self', regen:[0.1,3], shieldPct:0.15 },
    { n:'Life Drain', el:'life', pow:90, s:45, t:'foe', teamHeal:0.15 }],
  lightning_mage:   [{ n:'Chain Lightning', el:'lightning', pow:55, s:40, t:'foes', para:0.35 },
    { n:'Thunderstorm', el:'lightning', pow:50, s:40, t:'foes', leech:0.25 },
    { n:'Storm Lock', el:'lightning', pow:65, s:60, t:'foes', stun:0.4, slow:1 },
    { n:'Shock Net', el:'lightning', pow:40, s:25, t:'foe', para:0.8, paraP:true, slow:1 },
    { n:'Static Prison', el:'lightning', pow:50, s:35, t:'foe', stun:0.4 },
    { n:'EMP', el:'lightning', pow:35, s:45, t:'foes', staDrain:25, weaken:1 }],
  earth_mage:       [{ n:'Meteor Strike', el:'earth', pow:90, s:55, t:'foe', splash:30 },
    { n:'Tremor', el:'earth', pow:45, s:45, t:'foes', slow:1 },
    { n:'Earthshatter', el:'earth', pow:90, s:75, t:'foes', stun:0.4, expose:1 },
    { n:'Quicksand', el:'earth', pow:0, s:20, t:'foe', slow:2 },
    { n:'Petrify', el:'earth', pow:0, s:35, t:'foe', stun:0.7 },
    { n:'Stone Prison', el:'earth', pow:0, s:40, t:'foe', dispel:true, weaken:1 }],
  fire_ranger:      [{ n:'Flaming Arrows', el:'fire', pow:45, s:40, t:'foes', burn:0.4 },
    { n:'Incendiary Trap', el:'fire', pow:35, s:35, t:'foes', slow:1, expose:1 },
    { n:'Inferno Rain', el:'fire', pow:95, s:60, t:'foes', burn:0.6, shatter:true },
    { n:'Fire Arrow', el:'fire', pow:55, s:20, t:'foe', dispel:true, burn:0.3 },
    { n:'Melting Shot', el:'fire', pow:50, s:30, t:'foe', shatter:true, burn:0.6 },
    { n:'Blazing Volley', el:'fire', pow:70, s:50, t:'foes', burn:0.4 }],
  water_ranger:     [{ n:'Water Arrow', el:'water', pow:50, s:20, t:'foe', weaken:1 },
    { n:'Net Shot', el:'water', pow:35, s:25, t:'foe', stun:0.5 },
    { n:'Hydro Barrage', el:'water', pow:90, s:60, t:'foes', weaken:1, slow:1 },
    { n:'Riptide Shot', el:'water', pow:45, s:30, t:'foe', slow:1, extraTurn:true },
    { n:'Undertow Volley', el:'water', pow:45, s:40, t:'foes', slow:1 },
    { n:'Drenching Trap', el:'water', pow:0, s:35, t:'foes', weaken:1, expose:1 }],
  life_ranger:      [{ n:'Venom Arrow', el:'life', pow:50, s:30, t:'foe', poison:1 },
    { n:'Thorn Volley', el:'life', pow:55, s:40, t:'foes', poison:0.6 },
    { n:'Hydra Arrow', el:'life', pow:40, s:55, t:'foe', hits:3, slowCh:0.4, exposeCh:0.4 },
    { n:'Poison Dart', el:'life', pow:35, s:15, t:'foe', weaken:1, poison:0.5 },
    { n:'Spore Trap', el:'life', pow:0, s:35, t:'foes', poison:0.7, slow:1 },
    { n:'Blight Arrow', el:'life', pow:60, s:35, t:'foe', spread:true }],
  lightning_ranger: [{ n:'Thunder Arrow', el:'lightning', pow:55, s:30, t:'foe', para:0.6 },
    { n:'Storm Volley', el:'lightning', pow:55, s:45, t:'foes', para:0.4 },
    { n:'Thunderbolt Arrow', el:'lightning', pow:130, s:60, t:'foe', pierce:true, para:0.5 },
    { n:'Shock Trap', el:'lightning', pow:0, s:20, t:'foe', stun:0.5 },
    { n:'Tailwind Arrow', el:'lightning', pow:45, s:35, t:'foe', allyTurn:true },
    { n:'Overcharge Volley', el:'lightning', pow:70, s:50, t:'foes', staDrain:15 }],
  earth_ranger:     [{ n:'Boulder Trap', el:'earth', pow:40, s:40, t:'foes', expose:1 },
    { n:'Stone Arrow', el:'earth', pow:60, s:25, t:'foe', slow:1, shatter:true },
    { n:'Meteor Arrow', el:'earth', pow:120, s:60, t:'foe', splash:50, stun:0.3 },
    { n:'Pitfall', el:'earth', pow:0, s:25, t:'foe', stun:0.6 },
    { n:'Seismic Shot', el:'earth', pow:50, s:30, t:'foe', expose:2 },
    { n:'Rockslide Volley', el:'earth', pow:70, s:50, t:'foes', slow:1 }],
  light_fighter: [{ n:'Holy Strike', el:'light', pow:65, s:35, t:'foe', teamHeal:0.12 },   // a damage dealer whose hits heal the team
    { n:'Sunfire Blade',   el:'light', pow:80,  s:50, t:'foe', teamHeal:0.1 }, { n:'Aegis of Dawn', el:'light', pow:90, s:60, t:'foe', teamHeal:0.3, cleanseTeam:true },
    { n:'Dawn Strike', el:'light', pow:55, s:30, t:'foe',  leech:0.3 }, { n:'Lightbringer', el:'light', pow:60, s:35, t:'foe', mendAlly:0.35 },
    { n:'Radiant Sweep', el:'light', pow:60, s:55, t:'foes', teamHeal:0.12 }],
  light_cleric:     [{ n:'Divine Grace', el:'light', pow:0, s:45, t:'allies', shieldPct:0.22 },
    { n:'Blessed Light', el:'light', pow:0, s:45, t:'allies', offUp:1, armor:1 },
    { n:'Miracle', el:'light', pow:0, s:80, t:'allies', healPow:155, haste:1 },
    { n:'Radiant Mend', el:'light', pow:0, s:25, t:'ally', healPow:80, shieldPct:0.15, cleanse:true },
    { n:'Halo', el:'light', pow:0, s:35, t:'allies', veil:1 },
    { n:'Holy Ward', el:'light', pow:0, s:45, t:'allies', regen:[0.1,3], staGain:15 }],
  light_rogue:      [{ n:'Sunblade', el:'light', pow:70, s:45, t:'foe', teamShield:0.1 },
    { n:'Radiant Flurry', el:'light', pow:30, s:40, t:'foe', hits:3, exposeCh:0.2 },
    { n:'Judgment Blade', el:'light', pow:120, s:60, t:'foe', critBonus:0.3, teamHeal:0.15 },
    { n:'Dazzle', el:'light', pow:40, s:20, t:'foe', blind:0.5, critBonus:0.2 },
    { n:'Guardian Step', el:'light', pow:0, s:25, t:'ally', veil:1, haste:1 },
    { n:'Blessed Blades', el:'light', pow:0, s:45, t:'allies', haste:1, shieldPct:0.1 }],
  light_mage:       [{ n:'Holy Nova',       el:'light',   pow:50, s:45, t:'foes',   mendAlly:0.3 },
    { n:'Sunbeam', el:'light', pow:125, s:55, t:'foe', critBonus:0.2 },
    { n:'Judgment Ray', el:'light', pow:115, s:80, t:'foes', teamHeal:0.22 },
    { n:'Light Lance', el:'light', pow:90, s:40, t:'foe', blind:0.3 },
    { n:'Prism Shield', el:'light', pow:0, s:40, t:'allies', shieldPct:0.18 },
    { n:'Radiance', el:'light', pow:0, s:50, t:'allies', healPow:85, offUp:1, armor:1 }],
  light_ranger:     [{ n:'Glint Arrow', el:'light', pow:50, s:20, t:'foe', blind:0.6 },
    { n:'Starfall', el:'light', pow:55, s:45, t:'foes', blind:0.4 },
    { n:'Solar Arrow', el:'light', pow:130, s:60, t:'foe', blind:1 },
    { n:'Flash Trap', el:'light', pow:0, s:35, t:'foes', blind:0.55 },
    { n:'Judging Light', el:'light', pow:55, s:30, t:'foe', dispel:true, expose:1 },
    { n:'Prism Volley', el:'light', pow:70, s:50, t:'foes', blind:0.3 }],
  dark_fighter: [{ n:'Dark Cleave',     el:'dark',    pow:40, s:35, t:'foes',   blind:0.35 },
    { n:'Shadow Feint',     el:'dark',  pow:50,  s:40, t:'foe', blind:1, selfVeil:true }, { n:'Eclipse', el:'dark', pow:70, s:60, t:'foes', expose:1, leech:0.2 },
    { n:'Gloom Cut', el:'dark', pow:60, s:30, t:'foe',  leech:0.25 }, { n:'Terrorize', el:'dark', pow:0, s:35, t:'foes', weaken:1 },
    { n:'Nightfall', el:'dark', pow:0, s:35, t:'self', veil:1, armor:1 }],
  dark_cleric:      [{ n:'Shadow Pact',     el:'dark',    pow:0,  s:45, t:'allies', veil:1, offUp:1 },
    { n:'Soul Drain', el:'dark', pow:80, s:40, t:'foe', teamLeech:0.3 },
    { n:'Final Rites', el:'dark', pow:150, s:65, t:'foe', execute:true, leech:0.3 },
    { n:'Hex Bolt', el:'dark', pow:65, s:25, t:'foe', weaken:1 },
    { n:'Curse', el:'dark', pow:0, s:25, t:'foe', blind:1, slow:1 },
    { n:'Blasphemy', el:'dark', pow:65, s:45, t:'foes', blind:0.4, expose:1 }],
  dark_rogue:       [{ n:'Shadow Strike', el:'dark', pow:70, s:40, t:'foe', steal:true },
    { n:'Bleed Out', el:'dark', pow:60, s:35, t:'foe', poison:1 },
    { n:"Assassin's End", el:'dark', pow:120, s:60, t:'foe', leech:0.4, critBonus:0.2 },
    { n:'Backstab', el:'dark', pow:55, s:20, t:'foe', blind:0.5 },
    { n:'Vanish', el:'dark', pow:0, s:25, t:'self', veil:1, offUp:1 },
    { n:'Night Flurry', el:'dark', pow:35, s:45, t:'foe', hits:3, weakenCh:0.25 }],
  dark_mage:        [{ n:'Void Bolt', el:'dark', pow:105, s:45, t:'foe', dispel:true },
    { n:'Soul Siphon', el:'dark', pow:70, s:45, t:'foes', leech:0.3 },
    { n:'Oblivion', el:'dark', pow:185, s:80, t:'foe', execute:true, recoil:0.15 },
    { n:'Shadow Bolt', el:'dark', pow:90, s:40, t:'foe', leech:0.25 },
    { n:'Hexfire', el:'dark', pow:75, s:35, t:'foe', poison:0.6, expose:1 },
    { n:'Dark Pact', el:'dark', pow:0, s:0, t:'self', offUp:3, hpCost:0.2 }],
  dark_ranger:      [{ n:'Shadow Arrow', el:'dark', pow:50, s:25, t:'foe', slow:1 },
    { n:'Death Volley', el:'dark', pow:55, s:45, t:'foes', poison:0.5 },
    { n:'Night Hunter', el:'dark', pow:120, s:60, t:'foe', execute:true, critBonus:0.2 },
    { n:'Cripple', el:'dark', pow:0, s:25, t:'foe', weaken:2 },
    { n:'Nightshade Arrow', el:'dark', pow:50, s:40, t:'foe', poison:1, poisonP:true, blind:0.6 },
    { n:'Umbral Snare', el:'dark', pow:0, s:40, t:'foes', weaken:1, slow:1, blind:0.4 }],
  psychic_fighter: [{ n:'Mind Crush', el:'psychic', pow:60, s:30, t:'foe', staDrain:20 },
    { n:'Mind Bash',     el:'psychic', pow:55, s:40, t:'foe', confuse:0.5, teamSta:0.15 }, { n:'Mindbreaker', el:'psychic', pow:110, s:60, t:'foe', dispel:true, weaken:1 },
    { n:'Focus Strike', el:'psychic', pow:55, s:25, t:'foe', critBonus:0.3, pierce:true }, { n:'Mind Link', el:'psychic', pow:0, s:30, t:'allies', staGain:20, cleanse:true },
    { n:'Psychic Wave', el:'psychic', pow:55, s:50, t:'foes', weaken:1 }],
  psychic_cleric:   [{ n:'Clarity', el:'psychic', pow:0, s:45, t:'allies', staGain:20, veil:1 },
    { n:'Mass Hysteria', el:'psychic', pow:0, s:40, t:'foes', confuse:0.6 },
    { n:'Psychic Collapse', el:'psychic', pow:0, s:60, t:'foes', expose:2, slow:1 },
    { n:'Mind Fog', el:'psychic', pow:0, s:30, t:'foes', weaken:1 },
    { n:'Psi Wave', el:'psychic', pow:45, s:35, t:'foes', critBonus:0.2 },
    { n:'Mind Shatter', el:'psychic', pow:65, s:50, t:'foes', staDrain:20 }],
  psychic_rogue:    [{ n:'Psycho Cut', el:'psychic', pow:65, s:45, t:'foe', staDrain:25, critBonus:0.15 },
    { n:'Psi Blades', el:'psychic', pow:35, s:30, t:'foe', hits:2, exposeCh:0.3 },
    { n:'Mind Rend', el:'psychic', pow:120, s:60, t:'foe', weaken:1, dispel:true },
    { n:'Mind Prick', el:'psychic', pow:35, s:15, t:'foe', slow:1 },
    { n:'Mind Games', el:'psychic', pow:0, s:25, t:'foe', confuse:0.7, blind:0.5 },
    { n:'Mental Theft', el:'psychic', pow:60, s:40, t:'foe', steal:true }],
  psychic_mage:     [{ n:'Psystorm',        el:'psychic', pow:55, s:45, t:'foes',   confuse:0.35 },
    { n:'Mind Drain', el:'psychic', pow:55, s:45, t:'foes', staDrain:20 },
    { n:'Mindstorm', el:'psychic', pow:90, s:75, t:'foes', weaken:1, expose:1 },
    { n:'Mind Lock', el:'psychic', pow:50, s:25, t:'foe', confuse:0.8, confuseP:true },
    { n:'Mana Burn', el:'psychic', pow:65, s:30, t:'foe', dispel:true, staDrain:30 },
    { n:'Psychic Crush', el:'psychic', pow:70, s:35, t:'foe', confuse:0.4, bonusVs:'confuse' }],
  psychic_ranger:   [{ n:'Mind Arrow', el:'psychic', pow:40, s:35, t:'foes', slow:1 },
    { n:'Hypno Dart', el:'psychic', pow:0, s:25, t:'foe', confuse:0.8, weaken:1 },
    { n:'Psionic Arrow', el:'psychic', pow:120, s:60, t:'foe', steal:true, critBonus:0.2 },
    { n:'Psi Arrow', el:'psychic', pow:55, s:20, t:'foe', staDrain:25 },
    { n:'Mind Snare', el:'psychic', pow:0, s:35, t:'foes', confuse:0.5 },
    { n:'Mind Volley', el:'psychic', pow:65, s:45, t:'foes', confuse:0.3 }],
  fire_monk:      [{ n:'Dragon Fist',     el:'fire',      pow:55, s:35, t:'foe', burn:0.5, selfOffUp:1 },
    { n:'Phoenix Kick', el:'fire', pow:70, s:40, t:'foe', teamHeal:0.15 },
    { n:'Inferno Palm', el:'fire', pow:130, s:65, t:'foe', mendAlly:0.4, recoil:0.1 },
    { n:'Ember Kick', el:'fire', pow:50, s:20, t:'foe', critBonus:0.2, selfHaste:1 },
    { n:'Burning Spirit', el:'fire', pow:0, s:30, t:'self', offUp:1, regen:[0.1,3] },
    { n:'Blazing Combo', el:'fire', pow:30, s:45, t:'foe', hits:3, exposeCh:0.25 }],
  water_monk:     [{ n:'Flowing Palm', el:'water', pow:50, s:35, t:'foe', cleanseTeam:true },
    { n:'Tide Turner', el:'water', pow:60, s:40, t:'foe', dispel:true, teamSta:0.15 },
    { n:'Tsunami Palm', el:'water', pow:120, s:65, t:'foe', stun:0.3 },
    { n:'Ripple Palm', el:'water', pow:45, s:20, t:'foe', slow:1 },
    { n:'Still Water', el:'water', pow:0, s:25, t:'self', veil:1, regen:[0.1,3] },
    { n:'Healing Current', el:'water', pow:0, s:45, t:'allies', healPow:60, regen:[0.1,3] }],
  life_monk:      [{ n:'Vital Palm', el:'life', pow:50, s:35, t:'foe', teamSta:0.15 },
    { n:'Bloom Strike', el:'life', pow:60, s:40, t:'foe', mendAlly:0.3, cleanseTeam:true },
    { n:'Gaia Palm', el:'life', pow:110, s:65, t:'foe', leech:0.4, teamHeal:0.15 },
    { n:'Vine Kick', el:'life', pow:45, s:20, t:'foe', poison:0.5, critBonus:0.15 },
    { n:'Lifeforce', el:'life', pow:0, s:30, t:'ally', healPow:80, regen:[0.1,3] },
    { n:'Thorned Flurry', el:'life', pow:25, s:45, t:'foe', hits:4, slowCh:0.25 }],
  lightning_monk: [{ n:'Thunder Kick', el:'lightning', pow:30, s:35, t:'foe', hits:2, para:0.4, selfHaste:1 },
    { n:'Volt Combo', el:'lightning', pow:30, s:40, t:'foe', hits:3, staDrain:10 },
    { n:"Raijin's Fury", el:'lightning', pow:25, s:70, t:'foe', hits:6, slowCh:0.2 },
    { n:'Static Jab', el:'lightning', pow:40, s:15, t:'foe', critBonus:0.25, selfHaste:1 },
    { n:'Lightning Reflex', el:'lightning', pow:0, s:30, t:'self', haste:2, veil:1 },
    { n:'Thunder Palm', el:'lightning', pow:70, s:40, t:'foe', stun:0.3, mendAlly:0.3 }],
  earth_monk:     [{ n:'Mountain Palm',   el:'earth',     pow:65, s:40, t:'foe', stun:0.3, selfArmor:1 },
    { n:'Earthshaker Kick', el:'earth', pow:45, s:40, t:'foes', slow:1 },
    { n:"Mountain's Wrath", el:'earth', pow:130, s:65, t:'foe', pierce:true, expose:1 },
    { n:'Stone Palm', el:'earth', pow:50, s:20, t:'foe', slow:1 },
    { n:'Iron Body', el:'earth', pow:0, s:30, t:'self', armor:2, taunt:2 },
    { n:'Boulder Fist', el:'earth', pow:80, s:45, t:'foe', splash:25 }],
  light_monk:     [{ n:'Dawn Palm',       el:'light',     pow:50, s:35, t:'foe', blind:0.4, mendAlly:0.4 },
    { n:'Halo Kick', el:'light', pow:60, s:40, t:'foe', teamShield:0.15 },
    { n:'Sun Palm', el:'light', pow:120, s:65, t:'foe', teamHeal:0.22 },
    { n:'Radiant Jab', el:'light', pow:45, s:20, t:'foe', expose:1 },
    { n:'Serenity', el:'light', pow:0, s:30, t:'allies', shieldPct:0.12, cleanse:true },
    { n:'Purifying Strike', el:'light', pow:70, s:40, t:'foe', dispel:true, critBonus:0.15 }],
  dark_monk:      [{ n:'Shadow Fist',     el:'dark',      pow:30, s:35, t:'foe', hits:2, mendAlly:0.4 },
    { n:'Soul Strike', el:'dark', pow:60, s:40, t:'foe', steal:true },
    { n:'Death Touch', el:'dark', pow:130, s:65, t:'foe', execute:true, staDrain:30 },
    { n:'Shadow Jab', el:'dark', pow:45, s:20, t:'foe', blind:0.3, critBonus:0.15 },
    { n:'Dark Communion', el:'dark', pow:0, s:35, t:'allies', healPow:45, hpCost:0.15 },
    { n:'Nightmare Fists', el:'dark', pow:25, s:45, t:'foe', hits:4, exposeCh:0.2, teamLeech:0.15 }],
  psychic_monk:   [{ n:'Psychic Palm', el:'psychic', pow:50, s:35, t:'foe', confuse:0.4, dispel:true },
    { n:'Psi Barrage', el:'psychic', pow:30, s:40, t:'foe', hits:3, staDrain:10 },
    { n:'Enlightenment', el:'psychic', pow:120, s:65, t:'foe', weaken:1, teamSta:0.2 },
    { n:'Mind Jab', el:'psychic', pow:40, s:15, t:'foe', slow:1 },
    { n:'Clear Mind', el:'psychic', pow:0, s:15, t:'self', veil:1, regen:[0.1,3] },
    { n:'Mind Over Body', el:'psychic', pow:0, s:40, t:'allies', veil:1, shieldPct:0.1 }],
  fire_bulwark: [{ n:'Molten Hammer', el:'fire', pow:55, s:35, t:'foe', burn:0.5 },
    { n:'Flame Bulwark', el:'fire', pow:0, s:45, t:'allies', shieldPct:0.12, offUp:1 },
    { n:'Volcano Slam', el:'fire', pow:90, s:70, t:'foes', expose:1 },
    { n:'Searing Shield', el:'fire', pow:0, s:30, t:'self', shieldPct:0.2, offUp:1 },
    { n:'Blazing Sweep', el:'fire', pow:35, s:35, t:'foes', burn:0.3 },
    { n:'Magma Crush', el:'fire', pow:85, s:45, t:'foe', expose:1 }],
  water_bulwark: [{ n:'Tidal Shield', el:'water', pow:0, s:30, t:'self', shieldPct:0.3, regen:[0.1,3] },
    { n:'Tidal Wall', el:'water', pow:0, s:45, t:'allies', shieldPct:0.15 },
    { n:"Ocean's Bulwark", el:'water', pow:0, s:50, t:'self', taunt:3, cleanse:true, staGain:30 },
    { n:'Undertow Hammer', el:'water', pow:55, s:30, t:'foe', slow:1 },
    { n:'Wave Guard', el:'water', pow:0, s:30, t:'ally', guard:3, healPow:65 },
    { n:'Riptide Slam', el:'water', pow:50, s:45, t:'foes', weaken:1 }],
  life_bulwark: [{ n:'Thornhide', el:'life', pow:0, s:30, t:'self', regen:[0.1,3], shieldPct:0.15 },
    { n:'Sap Smash', el:'life', pow:65, s:40, t:'foe', leech:0.4 },
    { n:'Gaia Hammer', el:'life', pow:80, s:70, t:'foes', poison:0.6, teamLeech:0.2 },
    { n:'Briar Hammer', el:'life', pow:55, s:30, t:'foe', poison:0.5 },
    { n:'Root Guard', el:'life', pow:0, s:30, t:'ally', guard:3, cleanse:true },
    { n:'Overgrown Bastion', el:'life', pow:0, s:45, t:'allies', regen:[0.15,3] }],
  lightning_bulwark: [{ n:'Static Shield', el:'lightning', pow:0, s:30, t:'self', shieldPct:0.25, haste:1 },
    { n:'Thunder Wall', el:'lightning', pow:0, s:50, t:'allies', shieldPct:0.1, haste:1 },
    { n:'Storm Anvil', el:'lightning', pow:110, s:60, t:'foe', staDrain:30 },
    { n:'Shock Hammer', el:'lightning', pow:55, s:30, t:'foe', para:0.4 },
    { n:'Charged Guard', el:'lightning', pow:0, s:30, t:'ally', guard:3, staGain:25 },
    { n:'Arc Slam', el:'lightning', pow:50, s:45, t:'foes', para:0.3 }],
  earth_bulwark: [{ n:'Granite Rest', el:'earth', pow:0, s:35, t:'self', healPct:0.3, armor:1 },
    { n:'Quake Hammer', el:'earth', pow:60, s:50, t:'foes', expose:1 },
    { n:'Tectonic Crush', el:'earth', pow:140, s:70, t:'foe', pierce:true, selfStun:true, stun:0.2, stunP:true },
    { n:'Boulder Hammer', el:'earth', pow:60, s:30, t:'foe', expose:1 },
    { n:'Tremor Stomp', el:'earth', pow:40, s:35, t:'foes', slow:1 },
    { n:'Living Fortress', el:'earth', pow:0, s:45, t:'allies', armor:1, selfTaunt:2 }],
  light_bulwark: [{ n:'Holy Aegis', el:'light', pow:0, s:30, t:'ally', shieldPct:0.25, cleanse:true },
    { n:'Divine Bulwark', el:'light', pow:0, s:40, t:'self', taunt:3, regen:[0.1,3] },
    { n:'Judgment Slam', el:'light', pow:85, s:70, t:'foes', blind:0.4, teamShield:0.1 },
    { n:'Radiant Hammer', el:'light', pow:55, s:30, t:'foe', blind:0.4 },
    { n:'Consecrate', el:'light', pow:0, s:40, t:'allies', healPow:50 },
    { n:'Smiting Hammer', el:'light', pow:80, s:45, t:'foe', mendAlly:0.4 }],
  dark_bulwark: [{ n:'Shadow Guard', el:'dark', pow:0, s:30, t:'ally', guard:3, veil:1 },
    { n:'Spite Wall', el:'dark', pow:0, s:35, t:'self', taunt:2, offUp:1 },
    { n:'Abyssal Hammer', el:'dark', pow:85, s:70, t:'foes', leech:0.3 },
    { n:'Draining Hammer', el:'dark', pow:55, s:30, t:'foe', leech:0.4 },
    { n:'Dread Presence', el:'dark', pow:0, s:30, t:'foes', weaken:1 },
    { n:'Soul Crush', el:'dark', pow:85, s:45, t:'foe', execute:true }],
  psychic_bulwark: [{ n:'Mind Shield', el:'psychic', pow:0, s:30, t:'self', shieldPct:0.25, staGain:25 },
    { n:'Brainquake', el:'psychic', pow:45, s:45, t:'foes', confuse:0.3 },
    { n:'Mental Fortress', el:'psychic', pow:0, s:60, t:'allies', shieldPct:0.15, staGain:20 },
    { n:'Concussive Hammer', el:'psychic', pow:55, s:30, t:'foe', confuse:0.5 },
    { n:'Psychic Guard', el:'psychic', pow:0, s:30, t:'ally', guard:3, cleanse:true },
    { n:'Neural Hammer', el:'psychic', pow:80, s:45, t:'foe', staDrain:30 }],
  fire_bard: [{ n:'Firebrand Anthem', el:'fire', pow:0, s:35, t:'allies', offUp:1, staGain:15 },
    { n:'Inferno Chorus', el:'fire', pow:55, s:50, t:'foes', burn:0.4 },
    { n:'Blazing Finale', el:'fire', pow:100, s:75, t:'foes', expose:1, selfStun:true },
    { n:'Scorching Note', el:'fire', pow:50, s:25, t:'foe', burn:0.6 },
    { n:'Bonfire Song', el:'fire', pow:0, s:40, t:'allies', healPow:50 },
    { n:'Fan the Flames', el:'fire', pow:0, s:30, t:'ally', offUp:2 }],
  water_bard: [{ n:'Soothing Melody', el:'water', pow:0, s:40, t:'allies', healPow:50, regen:[0.1,3] },
    { n:'Siren Song', el:'water', pow:0, s:40, t:'foes', confuse:0.5 },
    { n:"Ocean's Lullaby", el:'water', pow:50, s:70, t:'foes', stun:0.3 },
    { n:'Drowning Note', el:'water', pow:45, s:25, t:'foe', slow:1 },
    { n:'Tidal Hymn', el:'water', pow:0, s:40, t:'allies', shieldPct:0.12 },
    { n:'Rain Song', el:'water', pow:0, s:40, t:'allies', cleanse:true, staGain:20 }],
  life_bard: [{ n:'Song of Growth', el:'life', pow:0, s:40, t:'allies', regen:[0.1,3] },
    { n:'Bloom Chorus', el:'life', pow:0, s:50, t:'allies', healPow:60, cleanse:true },
    { n:'Symphony of Life', el:'life', pow:0, s:70, t:'fallen', revive:0.5 },
    { n:'Thorn Ballad', el:'life', pow:45, s:25, t:'foe', poison:0.6 },
    { n:'Pollen Waltz', el:'life', pow:0, s:35, t:'foes', poison:0.5 },
    { n:'Leeching Verse', el:'life', pow:70, s:40, t:'foe', teamLeech:0.3 }],
  lightning_bard: [{ n:'Electric Riff', el:'lightning', pow:0, s:30, t:'allies', staGain:20 },
    { n:'Thunder Chorus', el:'lightning', pow:45, s:45, t:'foes', para:0.35 },
    { n:'Storm Encore', el:'lightning', pow:0, s:60, t:'allies', shieldPct:0.12, haste:1 },
    { n:'Static Note', el:'lightning', pow:40, s:20, t:'foe', para:0.5 },
    { n:'Overdrive Solo', el:'lightning', pow:0, s:30, t:'ally', haste:2, offUp:1 },
    { n:'Power Chord', el:'lightning', pow:80, s:40, t:'foe', critBonus:0.2, staDrain:20 }],
  earth_bard: [{ n:'Drums of Stone', el:'earth', pow:0, s:35, t:'allies', armor:1 },
    { n:'Earthen Anthem', el:'earth', pow:0, s:45, t:'allies', shieldPct:0.12 },
    { n:'Mountain Hymn', el:'earth', pow:0, s:65, t:'allies', healPow:105, staGain:20 },
    { n:'Rumbling Note', el:'earth', pow:50, s:25, t:'foe', slow:1 },
    { n:'Tremor Beat', el:'earth', pow:35, s:35, t:'foes', stun:0.2 },
    { n:'Boulder Ballad', el:'earth', pow:85, s:45, t:'foe', expose:1 }],
  light_bard: [{ n:'Hymn of Dawn', el:'light', pow:0, s:40, t:'allies', healPow:60 },
    { n:'Blinding Fanfare', el:'light', pow:40, s:45, t:'foes', blind:0.35 },
    { n:'Choir of Heaven', el:'light', pow:0, s:75, t:'fallen', revive:0.6 },
    { n:'Dazzling Note', el:'light', pow:45, s:25, t:'foe', blind:0.5 },
    { n:'Radiant Chorus', el:'light', pow:0, s:45, t:'allies', shieldPct:0.1, cleanse:true },
    { n:'Sacred Duet', el:'light', pow:0, s:30, t:'ally', healPow:100, offUp:1 }],
  dark_bard: [{ n:'Dirge', el:'dark', pow:0, s:30, t:'foes', blind:0.4 },
    { n:'Shadow Waltz', el:'dark', pow:0, s:40, t:'allies', veil:1 },
    { n:'Death Knell', el:'dark', pow:130, s:65, t:'foe', execute:true },
    { n:'Haunting Note', el:'dark', pow:50, s:25, t:'foe', leech:0.4 },
    { n:'Requiem of Ruin', el:'dark', pow:0, s:30, t:'foe', expose:2 },
    { n:'Cursed Chorus', el:'dark', pow:45, s:50, t:'foes', teamLeech:0.2 }],
  psychic_bard: [{ n:'Hypnotic Tune', el:'psychic', pow:0, s:35, t:'foes', confuse:0.4 },
    { n:'Dissonance', el:'psychic', pow:40, s:45, t:'foes', slow:1, expose:1 },
    { n:'Madness Aria', el:'psychic', pow:70, s:70, t:'foes', dispel:true },
    { n:'Mind Note', el:'psychic', pow:45, s:20, t:'foe', staDrain:25 },
    { n:'Focus Melody', el:'psychic', pow:0, s:40, t:'allies', staGain:25, cleanse:true },
    { n:'Psychic Harmony', el:'psychic', pow:0, s:30, t:'ally', veil:1, offUp:1 }],
  fire_sorcerer: [{ n:'Hellbrand', el:'fire', pow:50, s:25, t:'foe', burn:0.6 },
    { n:'Infernal Bargain', el:'fire', pow:0, s:0, t:'self', hpCost:0.2, offUp:1, staGain:30 },
    { n:'Hellfire Covenant', el:'fire', pow:140, s:50, t:'foe', burn:1, burnP:true, recoil:0.15 },
    { ...INV('hellfire', 'Hellfire Blast', 'Invocation: each Eldritch Blast beam has a 25% chance to burn.', { burn:0.25 }) },
    { n:'Brimstone Hex', el:'fire', pow:0, s:25, t:'foe', hex:3, burn:0.7 },
    { n:'Searing Rite', el:'fire', pow:70, s:45, t:'foes', burn:0.4 }],
  water_sorcerer: [{ n:'Drowning Grasp', el:'water', pow:55, s:25, t:'foe', slow:1, staDrain:15 },
    { n:'Abyssal Chains', el:'water', pow:30, s:30, t:'foe', stun:0.45, slow:1 },
    { n:"Leviathan's Call", el:'water', pow:145, s:50, t:'foe', weaken:1, slow:1 },
    { ...INV('undertow', 'Undertow Blast', 'Invocation: each Eldritch Blast beam drains 8 STA from the target to the Warlock.', { staDrain:8 }) },
    { n:'Tidal Bargain', el:'water', pow:0, s:10, t:'self', staGain:40, regen:[0.08,3] },
    { n:'Black Tide', el:'water', pow:75, s:45, t:'foes', slow:1 }],
  life_sorcerer: [{ n:'Leech Seed', el:'life', pow:50, s:25, t:'foe', poison:0.7, leech:0.5 },
    { n:'Thornbound', el:'life', pow:0, s:30, t:'self', shieldPct:0.3, regen:[0.1,3] },
    { n:'Withering Curse', el:'life', pow:125, s:50, t:'foe', poison:1, poisonP:true, leech:0.3 },
    { ...INV('lifedrinker', 'Lifedrinker', 'Invocation: Eldritch Blast heals the Warlock for 25% of the damage it deals.', { leech:0.25 }) },
    { n:'Rot Hex', el:'life', pow:0, s:25, t:'foe', hex:3, poison:0.6 },
    { n:'Plague Bloom', el:'life', pow:65, s:45, t:'foes', poison:0.6 }],
  lightning_sorcerer: [{ n:'Arc Lash', el:'lightning', pow:55, s:25, t:'foe', para:0.5 },
    { n:"Stormcaller's Bargain", el:'lightning', pow:0, s:15, t:'self', haste:2, staGain:20 },
    { n:'Wrath of the Storm Lord', el:'lightning', pow:135, s:50, t:'foe', para:0.6, pierce:true },
    { ...INV('thunderblast', 'Thunder Blast', 'Invocation: each Eldritch Blast beam has a 20% chance to paralyze.', { para:0.2 }) },
    { n:'Static Hex', el:'lightning', pow:0, s:25, t:'foe', hex:3, para:0.6 },
    { n:'Chain Lightning', el:'lightning', pow:60, s:40, t:'foe', chain:3 }],
  earth_sorcerer: [{ n:'Gravebind', el:'earth', pow:60, s:25, t:'foe', stun:0.2 },
    { n:'Stoneskin Pact', el:'earth', pow:0, s:30, t:'self', armor:1, shieldPct:0.3 },
    { n:'Crushing Covenant', el:'earth', pow:145, s:50, t:'foe', stun:0.35, expose:1 },
    { ...INV('stoneblast', 'Grasp of Stone', 'Invocation: each Eldritch Blast beam has a 10% chance to stun.', { stun:0.1 }) },
    { n:'Petrify Hex', el:'earth', pow:0, s:25, t:'foe', hex:3, slow:2 },
    { n:'Tremor', el:'earth', pow:75, s:45, t:'foes', stun:0.15 }],
  light_sorcerer: [{ n:'Searing Gaze', el:'light', pow:60, s:25, t:'foe', blind:0.5 },
    { n:'Star Bargain', el:'light', pow:0, s:25, t:'self', offUp:1, veil:1 },
    { n:'Falling Star', el:'light', pow:140, s:50, t:'foe', blind:0.6, burn:0.4 },
    { ...INV('radiantblast', 'Radiant Blast', 'Invocation: Eldritch Blast heals the most hurt ally for 25% of the damage it deals.', { mendAlly:0.25 }) },
    { n:'Judgment Hex', el:'light', pow:0, s:25, t:'foe', hex:3, blind:0.6 },
    { n:'Radiant Ruin', el:'light', pow:70, s:45, t:'foes', blind:0.3 }],
  dark_sorcerer: [{ n:'Shadow Bolt', el:'dark', pow:55, s:25, t:'foe', weaken:1 },
    { n:'Soul Bargain', el:'dark', pow:0, s:0, t:'self', hpCost:0.15, staGain:40, offUp:1 },
    { n:'Doom', el:'dark', pow:140, s:50, t:'foe', execute:true },
    { ...INV('hexblast', 'Cursed Blast', 'Invocation: each Eldritch Blast beam has a 25% chance to poison, and blasts Hex their target for 1 round.', { poison:0.25, hex:1 }) },
    { n:'Creeping Dread', el:'dark', pow:0, s:35, t:'foes', poison:0.6, confuse:0.3 },
    { n:'Eclipse', el:'dark', pow:75, s:50, t:'foes', blind:0.4, confuse:0.3 }],
  psychic_sorcerer: [{ n:'Whisper', el:'psychic', pow:45, s:25, t:'foe', confuse:0.5 },
    { n:'Mind Bargain', el:'psychic', pow:0, s:10, t:'self', staGain:30, veil:1 },
    { n:'Madness', el:'psychic', pow:120, s:50, t:'foe', confuse:1, confuseP:true, weaken:1 },
    { ...INV('mindblast', 'Mind Blast', 'Invocation: each Eldritch Blast beam has a 20% chance to confuse.', { confuse:0.2 }) },
    { n:'Turncoat Whisper', el:'psychic', pow:0, s:25, t:'foe', confuse:0.8, hex:2 },
    { n:'Mindquake', el:'psychic', pow:65, s:45, t:'foes', confuse:0.4 }]
};
const clone = o => JSON.parse(JSON.stringify(o));
/* ---- move-slot passives: learned like a move (class one at Lv25, element one at Lv45), take a move slot, always on ---- */
const PASSIVE_MOVE_LV = { cls:25, el:45 };
const PM = (id, n, d) => ({ n, passive:id, d, el:'neutral', pow:0, s:0, t:'self' });
const CLASS_PMOVES = {
  fighter:  PM('hold', 'Hold the Line', 'Passive: takes 25% less damage while taunting.'),
  cleric:   PM('devotion', 'Devotion', 'Passive: healing a target also cures its ailments.'),
  rogue:    PM('evasion', 'Evasion', 'Passive: 25% chance to dodge single-target hits.'),
  mage:     PM('overflow', 'Overflow', 'Passive: damage left over after a KO spills onto another foe.'),
  ranger:   PM('eagleeye', 'Eagle Eye', 'Passive: stats it lowers drop one stage further.'),
  monk:     PM('ironbody', 'Iron Body', 'Passive: takes 25% less damage while above half HP.'),
  bulwark:  PM('retaliate', 'Retaliation', 'Passive: while taunting, hits back for 25% of the damage it takes.'),
  bard:     PM('encore', 'Encore', 'Passive: 25% chance for a song (support or debuff move) to play twice for free.'),
  sorcerer: PM('wellspring', 'Wellspring', 'Passive: regains 10 STA at the end of every round.')
};
const ELEM_PMOVES = {
  fire:      PM('kindling', 'Kindling', 'Passive: burns it inflicts last 1 turn longer.'),
  water:     PM('ebb', 'Ebb and Flow', 'Passive: 25% of the healing it does or receives also restores its STA.'),
  earth:     PM('bedrock', 'Bedrock', 'Passive: +25% DEF and SpD, and it can\'t be stunned.'),
  life:      PM('photo', 'Photosynthesis', 'Passive: regenerates 5% max HP at the end of every round.'),
  lightning: PM('overcharge', 'Overcharge', 'Passive: +25% SPE until its first action of each fight.'),
  light:     PM('radiance', 'Radiance', 'Passive: every ally starts each fight with a shield worth 10% of its max HP.'),
  dark:      PM('nightfall', 'Nightfall', 'Passive: +25% damage to foes below half HP.'),
  psychic:   PM('foresight', 'Foresight', 'Passive: the first hit it takes each fight is halved, and it starts each fight with +25% SPE and +20 STA.')
};
// True if u has passive id, either as its class passive or as a learned move-slot passive.
const hasPas = (u, id) => !!u && (u.pas === id || (!!u.moves && u.moves.some(m => m.passive === id)));
// Element+class passives (a unique passive for that combo) and extra class passives, learned as move-slot passives.
// Bulwark is the passive-heavy class: its old Fortress (Lv17) and Last Stand (Lv38) slots are passives now.
const COMBO_PMOVE_LV = 17;
const COMBO_PMOVES = {
  fire_bulwark:      PM('kiln', 'Molten Core', 'Passive: anyone who hits it with a single-target attack has a 25% chance to be burned.'),
  water_bulwark:     PM('tidewall', 'Tidal Wall', 'Passive: regenerates 5% max HP at the end of each round while taunting.'),
  life_bulwark:      PM('bramble', 'Bramble Hide', 'Passive: attackers take 15% of the damage they deal to it back.'),
  lightning_bulwark: PM('staticbody', 'Static Body', 'Passive: anyone who hits it with a single-target attack has a 25% chance to be paralyzed.'),
  earth_bulwark:     PM('mountain', 'Mountain', 'Passive: takes 25% less damage from attacks that hit all foes.'),
  light_bulwark:     PM('sanctuary', 'Sanctuary', 'Passive: at the end of each round, heals the most hurt ally for 5% of their max HP.'),
  dark_bulwark:      PM('grudge', 'Grudge', 'Passive: deals 25% more damage while below half HP.'),
  psychic_bulwark:   PM('mindwall', 'Mind Wall', 'Passive: takes 25% less damage from special attacks.')
};
const CLASS_EXTRA_PMOVES = { bulwark:[{ lvl:38, m:PM('laststand', 'Last Stand', 'Passive: takes 25% less damage while below half HP.') }] };
function learnset(el, cls) {
  const out = [];
  if (COMBO_PMOVES[el + '_' + cls]) out.push({ lvl:COMBO_PMOVE_LV, m:{ ...COMBO_PMOVES[el + '_' + cls], tag:'Passive' } });
  (CLASS_EXTRA_PMOVES[cls] || []).forEach(x => out.push({ lvl:x.lvl, m:{ ...x.m, tag:'Passive' } }));
  if (CLASS_PMOVES[cls]) out.push({ lvl:PASSIVE_MOVE_LV.cls, m:{ ...CLASS_PMOVES[cls], tag:'Passive' } });
  if (ELEM_PMOVES[el]) out.push({ lvl:PASSIVE_MOVE_LV.el, m:{ ...ELEM_PMOVES[el], tag:'Passive' } });
  const cl = CLASS_LEARN[cls] || {}, combos = COMBO_MOVES[el + '_' + cls] || [];
  const full = combos.length >= comboLv(cls).length;   // only swap once that combo set is complete
  // Element moves are gone: slimes learn class moves + element/class combo moves only.
  (CLASS_MOVES[cls] || []).forEach((m, i) => { if (!(full && (cl.dropCls || []).includes(i))) out.push({ lvl:LEARN_LV.cls[i], m:tagCat({ ...m, el:m.el === 'self' ? el : m.el, tag:'Class' }, cls) }); });
  combos.forEach((m, i) => out.push({ lvl:(full ? comboLv(cls) : LEARN_LV.combo)[i], m:tagCat({ ...m, tag:'Combo' }, cls) }));
  const order = { Element:0, Class:1, Combo:2, Passive:3 };
  return out.sort((a, b) => a.lvl - b.lvl || order[a.m.tag] - order[b.m.tag]);
}
const REST = { n:'Rest', el:'neutral', pow:0, s:0, t:'self', rest:REST_PCT };

const pct = x => Math.round(x * 100) + '%';
const TNAME = { foe:'1 foe', foes:'all foes', self:'self', ally:'1 ally', allies:'all allies', fallen:'KO\'d ally' };
// Power color: green for light hits up to dark red for the biggest (multi-hit moves use their total).
const POW_COLORS = [[40,'#90be6d'],[55,'#c5d86d'],[70,'#f9c74f'],[85,'#f8961e'],[100,'#f3722c'],[Infinity,'#e01e37']];
const powColor = m => { const p = (m.pow || 0) * (m.hits || 1); return POW_COLORS.find(([t]) => p < t)[1]; };
// Stat stages (like Pokemon): each stage is 25%. Raises stack to +150% (6 stages), lowers to -75% (3 stages).
// They last the whole fight. 1 stage = raises/lowers, 2 = sharply, 3+ = drastically.
const ST_MIN = -3, ST_MAX = 6;
// Each stat stage is 25%; on bosses each LOWERED stage only counts 20% (a fully debuffed boss keeps 40%, not 25%).
const BOSS_DEBUFF_STEP = 0.2;
const stMul = (s, u) => 1 + (s < 0 && u && u.boss ? BOSS_DEBUFF_STEP : 0.25) * s;
const stN = (v, dflt) => v === true ? dflt : v;
const stWord = (n, what) => `${['', '', 'sharply ', 'drastically '][Math.min(3, Math.abs(n))]}${n > 0 ? 'raises' : 'lowers'} ${what} ${Math.abs(n) * 25}%`;
function mdesc(m) {
  if (m.passive) return m.d;
  const s = [];
  if (m.pow) s.push(`<span class="pw" style="color:${powColor(m)}">${m.hits > 1 ? `POW ${m.pow} x${m.hits}` : `POW ${m.pow}`}</span>`);
  if (m.bulk) s.push(`uses DEF for ${pct(m.bulk)} of its power`);
  const PL = k => m[k + 'P'] ? '+' : '';   // + versions: burn+/poison+ 12% a turn, para+ 50%, blind+ 55% miss, confuse+ 60%, stun+ 2 turns
  if (m.burn) s.push((m.burn >= 1 ? 'burns' : `${pct(m.burn)} burn`) + PL('burn'));
  if (m.poison) s.push((m.poison >= 1 ? 'poisons' : `${pct(m.poison)} poison`) + PL('poison'));
  if (m.stun) s.push(`${pct(Math.min(1, m.stun * STUN_MULT))} stun${m.stunP ? '+ (2 turns)' : ''}`);
  if (m.para) s.push((m.para >= 1 ? 'paralyzes' : `${pct(m.para)} paralyze`) + PL('para'));
  if (m.blind) s.push(`${pct(m.blind)} blind${PL('blind')}`);
  if (m.confuse) s.push(`${pct(m.confuse)} confuse${PL('confuse')}`);
  if (m.staDrain) s.push(`drain ${m.staDrain} STA`);
  if (m.mendAlly) s.push(`heals hurt ally ${pct(m.mendAlly)} of dmg`);
  if (m.leech) s.push(`drain ${pct(m.leech)}`);
  if (m.recoil) s.push(`${pct(m.recoil)} recoil`);
  if (m.execute) s.push('x1.5 vs low HP');
  if (m.healPct) s.push(`heal ${pct(m.healPct)}`);
  if (m.healPow) s.push(`heal POW ${m.healPow}${m.healHP ? ` (~${m.healHP} HP)` : ''}`);
  if (m.revive) s.push(`revive at ${pct(m.revive)}`);
  if (m.shieldPct) s.push(`shield ${pct(m.shieldPct)}`);
  if (m.regen) s.push(`regen${m.regen[0] >= 0.15 ? '+' : ''} ${pct(m.regen[0])}/turn x${m.regen[1]} (stacks)`);
  const tgt = m.t === 'foes' ? 'foes\' ' : m.t === 'foe' ? 'foe\'s ' : m.t === 'allies' ? 'team\'s ' : m.t === 'self' ? '' : 'ally\'s ';
  if (m.offUp) s.push(stWord(m.offUp, tgt + 'OFF'));
  if (m.weaken) s.push(stWord(-m.weaken, tgt + 'OFF'));
  const dw = m.exp === 's' ? 'SpD' : m.exp === 'b' ? 'DEF & SpD' : 'DEF';
  if (m.expose) s.push(stWord(-m.expose, tgt + dw));
  if (m.slow) s.push(stWord(-m.slow, tgt + 'SPE'));
  if (m.guard) s.push(`takes single-target hits for that ally (${m.guard} turns)`);
  if (m.bonusVs) s.push(`x1.5 damage vs ${{ burn:'burned', poison:'poisoned', para:'paralyzed', stun:'stunned', blind:'blinded', confuse:'confused' }[m.bonusVs]} foes`);
  if (m.weakenCh) s.push(`${pct(m.weakenCh)} per hit: lowers OFF 25%`);
  if (m.exposeCh) s.push(`${pct(m.exposeCh)} per hit: lowers ${dw} 25%`);
  if (m.slowCh) s.push(`${pct(m.slowCh)} per hit: lowers SPE 25%`);
  if (m.haste) s.push(stWord(m.haste, tgt + 'SPE'));
  if (m.veil) s.push('veil (30% dodge)');
  if (m.staGain) s.push(`+${m.staGain} STA`);
  if (m.armor) s.push(stWord(m.armor, tgt + 'DEF & SpD'));
  if (m.cleanse) s.push('cures bad statuses');
  if (m.critBonus) s.push('high crit');
  if (m.staCharge) s.push(`+${pct(m.staCharge)} STA`);
  if (m.splash) s.push(`POW ${m.splash} to other foes`);
  if (m.dispel) s.push('removes foe buffs');
  if (m.teamLeech) s.push(`team heals ${pct(m.teamLeech)} of dmg`);
  if (m.foeStaDrain) s.push(`foes -${pct(m.foeStaDrain)} STA`);
  if (m.teamSta) s.push(`team +${pct(m.teamSta)} STA`);
  if (m.teamShield) s.push(`team shield ${pct(m.teamShield)}`);
  if (m.teamHeal) s.push(`team heal ${pct(m.teamHeal)}`);
  if (m.cleanseTeam) s.push('cures team');
  if (m.selfOffUp) s.push(stWord(m.selfOffUp, 'own OFF'));
  if (m.selfHaste) s.push(stWord(stN(m.selfHaste, 2), 'own SPE'));
  if (m.selfArmor) s.push(stWord(stN(m.selfArmor, 1), 'own DEF & SpD'));
  if (m.selfVeil) s.push('self veil');
  if (m.taunt) s.push(`taunt ${m.taunt} turns`);
  if (m.selfTaunt) s.push(`taunts 2 turns (self)`.replace('2', m.selfTaunt));
  if (m.selfStun) s.push('stuns self');
  if (m.detonate) s.push('detonates burn/poison');
  if (m.spread) s.push('spreads its debuffs to all foes');
  if (m.chain) s.push(`bounces ${m.chain}x`);
  if (m.charge) s.push('next attack x2');
  if (m.counter) s.push(`counter POW ${m.counter.pow}`);
  if (m.steal) s.push('steals buffs');
  if (m.pierce) s.push('ignores shields, DEF boosts, resist');
  if (m.berserk) s.push('stronger at low HP');
  if (m.hpCost) s.push(`costs ${pct(m.hpCost)} HP`);
  if (m.mark) s.push(`next ${m.mark} hits on it crit`);
  if (m.shatter) s.push('breaks shields');
  if (m.extraTurn) s.push('extra turn at round end');
  if (m.allyTurn) s.push('gives an ally an extra turn');
  if (m.hex) s.push(`Hex: takes 25% more damage for ${m.hex} round${m.hex > 1 ? 's' : ''}`);
  if (m.blast) s.push(m.hits > 1 ? `${m.hits} beams` : 'more beams at Lv20 and Lv40');
  if (m.sure) s.push('never misses');
  if (m.noresist) s.push('resisted hits deal normal damage');
  if (m.overheal) s.push('overheal becomes shield');
  if (m.bomb) s.push(`bomb: POW ${m.bomb.pow} to all foes at end of round`);
  s.push(TNAME[m.t]);
  return s.join(' · ');
}

/* ================= worlds ================= */
const REALM_WORLDS = [[
  // Each base element shows up equally often across worlds (6 times each), so no starter is favored.
  { name:'Overworld',    bg:'#14121f', els:['water','fire','life','earth','lightning'] },
  { name:'Mountains',    bg:'#121826', els:['earth','lightning','water','fire','life'] },
  { name:'Cave',         bg:'#100e12', els:['earth','dark','water','life','lightning'] },
  { name:'Dungeon',      bg:'#170f1a', els:['dark','fire','earth','water','lightning'] },
  { name:"Dragon's Den", bg:'#1f0e10', els:['fire','fire','lightning','earth','light'] },
  { name:'Overworld 2',  bg:'#14121f', els:['water','fire','life','earth','lightning','light','dark'] },
  { name:'Feywild',      bg:'#0f1f18', els:['life','life','water','water','psychic','light'] },
  { name:"God's Planes", bg:'#1f1a0c', els:['light','dark','psychic','light','dark','psychic'] }
],
  // Realm 2: Genre Hop. Each world is a different kind of story, with a placeholder boss for now.
  [
    { name:'Space Station',   bg:'#0b1030', els:['lightning','psychic','light','water','dark'] },
    { name:'Wild West',       bg:'#2a1a10', els:['earth','fire','lightning','life','dark'] },
    { name:'Pirate Seas',     bg:'#0c2038', els:['water','water','lightning','earth','dark','fire'] },
    { name:'Haunted Mansion', bg:'#1a1226', els:['dark','psychic','dark','life','light'] },
    { name:'Cyber City',      bg:'#08181c', els:['lightning','psychic','light','fire','water'] },
    { name:'Candy Kingdom',   bg:'#2a1424', els:['life','light','water','fire','earth','psychic'] },
    { name:'Wasteland',       bg:'#241810', els:['fire','earth','dark','lightning','life'] },
    { name:'The Fourth Wall', bg:'#12121a', els:['light','dark','psychic','light','dark','psychic'] }
  ],
  // Realm 3: World Domination. The slimes take over the Earth, one place at a time, then the Moon.
  // The Moon has no normal fights: a full heal, the Elite 4 back to back, one heal, then the Sun (see MOON_W).
  [
    { name:'Japan',            bg:'#1c1020', els:['earth','water','fire','psychic','lightning'] },
    { name:'United Kingdom',   bg:'#141a22', els:['water','dark','earth','light','life'] },
    { name:'Africa',           bg:'#24180c', els:['earth','fire','life','lightning','light'] },
    { name:'Australia',        bg:'#2a140c', els:['fire','earth','dark','life','water'] },
    { name:'Antarctica',       bg:'#0e1c2a', els:['water','water','light','earth','psychic'] },
    { name:'Tropical Forests', bg:'#0c2014', els:['life','life','water','psychic','lightning','dark'] },
    { name:'USA',              bg:'#10142a', els:['lightning','fire','earth','light','water'] },
    { name:'The Moon',         bg:'#0a0a14', els:['light','dark','psychic'] }
  ],
  // Realm 4: Lights Out. With the Sun gone dark, the slimes leave a ruined Earth and take the whole solar system.
  // Every planet bends one combat rule (PLANET_RULES in realm4.js). Neptune ends with two bosses back to back.
  [
    { name:'Ruined Earth', bg:'#1c1612', els:['earth','dark','fire','life','lightning'] },
    { name:'Mercury',      bg:'#2a1608', els:['fire','lightning','light','earth','psychic'] },
    { name:'Venus',        bg:'#1e2a10', els:['life','dark','fire','psychic','water'] },
    { name:'Mars',         bg:'#2a0e0a', els:['earth','fire','dark','lightning','light'] },
    { name:'Jupiter',      bg:'#2a1c10', els:['lightning','lightning','water','psychic','earth'] },
    { name:'Saturn',       bg:'#221a10', els:['psychic','light','dark','earth','water'] },
    { name:'Uranus',       bg:'#0c2226', els:['water','water','light','psychic','lightning'] },
    { name:'Neptune',      bg:'#0a1230', els:['water','dark','psychic','light','earth','life'] }
  ]];
// The realm you are playing: WORLDS and BOSS_INFO point at it (see setRealm). Realm 2 needs Realm 1 cleared.
const REALM_DEF = [
  { name:'Realm 1: The Classic Quest', blurb:'Eight worlds of fantasy heroes.', foeHp:1, foeOff:1 },
  { name:'Realm 2: Genre Hop',         blurb:'Eight worlds, one for every kind of story.', foeHp:1.5, foeOff:1.22 },
  { name:'Realm 3: World Domination',  blurb:'The slimes take over the Earth... then the Moon.', foeHp:1.6, foeOff:1.31 },
  { name:'Realm 4: Lights Out',        blurb:'The Sun is gone. Take the whole solar system.', foeHp:1.74, foeOff:1.42 }
];
const MOON_W = 7;   // Realm 3's last world: the gauntlet (see genMap and the Moon bosses)
const isMoon = (w = 0) => REALM === 2 && w === MOON_W;
let REALM = 0, WORLDS = REALM_WORLDS[0];
const FLOORS = 9;   // rows per world, matching MAP_ROWS (the last row is the boss)
// Enemy level for a world + floor. Matches the party's pace with fixed level rewards
// (boss 4, elite 2, fight 1): about 8 levels per world.
const LV_PER_WORLD = 8.2, LV_PER_FLOOR = 0.6;
const lvlOf = (w, f) => Math.min(LVL_MAX, 1 + Math.round(w * LV_PER_WORLD + f * LV_PER_FLOOR));

const ROLES = { fighter:'Squire', rogue:'Thief', cleric:'Acolyte', barb:'Brute', goblin:'Goblin' };
const ADJ = { fire:'Ember', water:'Tide', life:'Moss', earth:'Stone', lightning:'Spark', light:'Holy', dark:'Shade', psychic:'Mind' };
const E_MOVE = {
  fire:{n:'Torch Swing',el:'fire',pow:50,s:25,t:'foe',burn:0.25}, water:{n:'Splash',el:'water',pow:55,s:25,t:'foe'},
  life:{n:'Vine Lash',el:'life',pow:45,s:25,t:'foe',leech:0.5}, earth:{n:'Rock Toss',el:'earth',pow:60,s:25,t:'foe'},
  lightning:{n:'Zap',el:'lightning',pow:50,s:25,t:'foe',stun:0.15}, light:{n:'Holy Smite',el:'light',pow:55,s:25,t:'foe'},
  dark:{n:'Shadow Claw',el:'dark',pow:50,s:25,t:'foe',poison:0.3}, psychic:{n:'Mind Blast',el:'psychic',pow:50,s:25,t:'foe',stun:0.2}
};
// Heavier element moves that normal enemies pick up from world 3 on (elites always have one).
const E_HEAVY = {
  fire:{n:'Firestorm',el:'fire',pow:45,s:40,t:'foes',burn:0.3}, water:{n:'Crashing Wave',el:'water',pow:75,s:40,t:'foe',weaken:1},
  life:{n:'Strangle Vine',el:'life',pow:70,s:40,t:'foe',poison:0.5}, earth:{n:'Rockslide',el:'earth',pow:45,s:40,t:'foes'},
  lightning:{n:'Thunderbolt',el:'lightning',pow:75,s:40,t:'foe',stun:0.25}, light:{n:'Judgment',el:'light',pow:70,s:45,t:'foe'},
  dark:{n:'Grave Strike',el:'dark',pow:70,s:45,t:'foe',poison:0.4}, psychic:{n:'Psyshock',el:'psychic',pow:70,s:45,t:'foe',stun:0.25}
};
const STRIKE = { n:'Strike', el:'neutral', cat:'p', pow:40, s:BASIC_COST, t:'foe', staCharge:BASIC_CHARGE };

/* ================= items ================= */
// use: consumables kept in the bag (used on the map, never in battle). hold: one per slime, swap freely.
const ITEMS = {
  booster: { n:'Move Booster',       kind:'use',  desc:'Upgrade one move: more power or a stronger effect.' },
  potion:  { n:'Level Potion',       kind:'use',  desc:'Give one slime +2 levels.' },
  revive:  { n:'Revive',             kind:'use',  desc:'Fully heal one slime and give it +1 level.' },
  cloak:   { n:'Warding Cloak',      kind:'hold', desc:'SpD +50%, but your OFF is 15% lower.' },
  sword:   { n:"King Slime's Sword", kind:'hold', desc:'Move power +25%.' },
  armor:   { n:'Heavy Duty Armor',   kind:'hold', desc:'DEF +50%. Stun, paralyze, confuse and blind land 25% less often on you. Always moves last.' },
  hat:     { n:'Choice Hat',         kind:'hold', desc:'OFF +50%, but locked into the first move you use each battle.' },
  badge:   { n:'Choice Badge',       kind:'hold', desc:'SPE +50%, but locked into the first move you use each battle.' },
  book:    { n:'Alchemy Book',       kind:'hold', desc:'Your status effects are 25% more likely to land.' },
  clover:  { n:'Lucky Clover',       kind:'hold', desc:'Crit chance +15%.' },
  fang:    { n:'Vampire Fang',       kind:'hold', desc:'Heal 15% of the damage you deal.' },
  thorns:  { n:'Thorn Mail',         kind:'hold', desc:'Attackers take 15% of the damage they deal to you.' },
  feather: { n:'Swift Feather',      kind:'hold', desc:'Start every battle with SPE +25%.' },
  plume:   { n:'Phoenix Plume',      kind:'hold', desc:'Once per battle, survive a knockout with 1 HP.' },
  moss:    { n:'Healing Moss',       kind:'hold', desc:'Heal 6% HP at the end of every round.' },
  ring:    { n:'Energy Ring',        kind:'hold', desc:'Regain 10 extra stamina every round.' }
};
const USE_ITEMS = Object.keys(ITEMS).filter(k => ITEMS[k].kind === 'use');
const HOLD_ITEMS = Object.keys(ITEMS).filter(k => ITEMS[k].kind === 'hold');
const ITEM_CHOICES = 3;

/* ================= bosses (story text) ================= */
const REALM1_BOSSES = [
  { name:'The Protagonist', spr:'b_hero', intro:'THE PROTAGONIST appears! Spiky hair. Sword bigger than his body. "I fight for my friends!" His party of tropes strikes a pose behind him.',
    outro:'"This isn\'t over! I still have three more forms!" The Protagonist flees dramatically.' },
  { name:'Cantmiss', spr:'b_archer', intro:'CANTMISS draws her bow. "I volunteer... to end you." Her arrows never miss, and they freeze on impact.',
    outro:'Cantmiss lowers her bow. "...I missed." She vanishes into the mountains.' },
  { name:'Jimmy the Miner', spr:'b_miner', intro:'JIMMY THE MINER cracks his knuckles. "Been diggin\' for forty years. You slimes are just dirt with feelings." The angrier he gets, the harder he swings.',
    outro:'Jimmy sits down. "Alright... break time." He pulls out a pickled egg and waves you through.' },
  { name:'Grimm Edgelord', spr:'b_edgelord', intro:'GRIMM EDGELORD steps from the shadows. "My backstory is too dark for you." He always strikes first, at your strongest slime, with a fistful of D4s.',
    outro:'"You... understand me." Grimm Edgelord vanishes in a puff of smoke he brought from home.' },
  { name:'Dracona Dragonslayer', spr:'b_knight', intro:'DRACONA DRAGONSLAYER lowers her visor. "I have slain forty dragons. Slimes are just wet dragons." Her two squires ready their blades.',
    outro:'Dracona kneels. "Worthy foes. I will tell the Order you fight with honor... and goo."' },
  { name:'Claire Rick', spr:'b_healer', intro:'CLAIRE RICK smiles sweetly. "Don\'t mind me, I\'m just the healer!" She keeps her tank alive while her mage blasts you. Leave her alone and see what happens.',
    outro:'Claire Rick drops her staff. "Okay. You win. Please don\'t tell the party I lost."' },
  { name:'Monkey D. Monk', spr:'b_monkey', intro:'MONKEY D. MONK stretches way too far. "I\'m gonna be King of the Slimes!" He\'s blindingly fast, always strikes first, and every punch scrambles your thoughts.',
    outro:'Monkey D. Monk laughs. "You\'re strong! Join my crew!" Then he bounces off to look for meat.' },
  { name:'Ascended Protagonist', spr:'b_ascended', intro:'The Protagonist RETURNS, glowing, winged, with a new theme song. "I have ascended beyond plot itself." His friends are with him, and at half HP the power of friendship kicks in: they get back up and he starts acting twice a turn.',
    outro:'The Ascended Protagonist falls. "Impossible... I had... plot armor..."' }
];
// Realm 2 placeholder: the Protagonist stands in until each world's real boss exists.
const REALM2_BOSSES = [
  { name:'Lance Skydancer', spr:'b_lance',    els:['psychic', 'light'],           intro:'LANCE SKYDANCER drops in from orbit, crystal blade humming. "I have a good feeling about this fight."', outro:'Lance flickers out. "That went... better in the simulation."' },
  { name:'High Noon',       spr:'b_noon',     els:['fire', 'earth'],              intro:'HIGH NOON squares up in the dust, the sun right behind him. "Draw."', outro:'High Noon tips his hat. "Reckon it\'s past noon."' },
  { name:'Piper Ratty',     spr:'b_piper',    els:['life', 'water'],              intro:'PIPER RATTY strikes up a sea shanty, and her rat crew swarms the deck. "Dance, ye scurvy lot!"', outro:'Piper bows. "The rats vote for a rematch."' },
  { name:'Matilda',         spr:'b_matilda',  els:['dark', 'water'],              intro:'MATILDA glides down the stairs with her husband\'s head in hand. "He says you\'re not invited."', outro:'Matilda sighs. "Back to the crypt, dear."' },
  { name:'Soldier 67',      spr:'b_soldier',  els:['lightning', 'light'],         intro:'SOLDIER 67 racks his pulse rifle. "I\'m too old for this city."', outro:'Soldier 67 lowers the rifle. "Fine. I\'ll retire. Again."' },
  { name:'Roxxane Candy',   spr:'b_roxxane',  els:['earth', 'psychic'],           intro:'ROXXANE CANDY slams a power chord and the sugar rains down. "Hope you brought earplugs!"', outro:'Roxxane grins. "Encore? No? Rude."' },
  { name:'The Janitor',     spr:'b_janitor',  els:['life', 'earth'],              intro:'THE JANITOR leans on a very alive mop. "Somebody has to clean up this mess. Looks like it\'s you."', outro:'The Janitor shrugs. "Another spill. Story of my life."' },
  { name:'The Narrator',    spr:'b_narrator', els:['light', 'psychic', 'dark'],   intro:'THE NARRATOR clears his throat. "And so, the heroes arrived at the final page. Sadly, it was not theirs."', outro:'The Narrator closes the book. "...Well. That was not in the script."' }
];
// Realm 3: one boss per country; the Moon's entry (index 7) is the Sun, and the Elite 4 come before it.
const REALM3_BOSSES = [
  { name:'The Protagonist?', spr:'b_hero_fallen', els:['earth'], intro:'Is that... THE PROTAGONIST? He\'s put on weight. His armor won\'t close. He slurps his ramen and sighs. "I used to be the main character, you know."',
    outro:'The Protagonist puts down his chopsticks. "...Maybe I should start training again." He waddles off toward a gym.' },
  { name:'The Queen', spr:'b_queen', els:['light'], intro:'THE QUEEN rests a sword taller than she is on her shoulder. Two demon corgis growl at her feet. "One does not surrender one\'s kingdom to puddings."',
    outro:'The Queen lowers her sword. "Fine. Have it. One is late for tea anyway." The corgis keep growling.' },
  { name:'The Lion King', spr:'b_lionking', els:['light', 'earth'], intro:'THE LION KING raises his shield as his clerics begin to chant. "Everything the light touches is MINE. Including you."',
    outro:'The Lion King kneels. "The circle of life... has a slime in it now."' },
  { name:'Boomer Rang', spr:'b_boomer', els:['fire'], intro:'BOOMER RANG twirls a boomerang the size of a canoe. "G\'day! Mind the dynamite, mate. And duck. Always duck."',
    outro:'Boomer Rang throws his boomerang one last time. It doesn\'t come back. "...Strewth."' },
  { name:'Frost Queen', spr:'b_frostqueen', els:['water'], intro:'The FROST QUEEN steps out of the blizzard, her Snow Monster looming behind her. "Nothing moves here unless I allow it."',
    outro:'The Frost Queen shivers for the first time in centuries. "...Is it warm in here?"' },
  { name:'Arabella Rain-bow', spr:'b_arabella', els:['life'], intro:'ARABELLA RAIN-BOW draws a bow made of pure rainbow. "Every color, every arrow. One of them is just for you."',
    outro:'Arabella unstrings her bow. "A pot of gold? No. A pot of slime." She smiles and fades into the canopy.' },
  { name:'Mr. President', spr:'b_president', els:['lightning', 'light'], intro:'MR. PRESIDENT steps up to the podium, Secret Service at his side. "My fellow Earthlings. I have signed an executive order: no slimes."',
    outro:'Mr. President shakes your gooey hand. "Congratulations. You are now the President. Good luck with the paperwork."' },
  { name:'The Sun', spr:'b_sun', els:['fire', 'light'], intro:'Beyond the Moon, THE SUN turns its burning face toward you. "SMALL THINGS. YOU HAVE TAKEN THE EARTH. YOU WILL NOT TAKE THE SKY."',
    outro:'The Sun dims... and for the first time in five billion years, it sets on its own. The slimes rule everything, from the Earth to the stars.' }
];
// The Moon's Elite 4, fought back to back before the Sun.
const MOON_ELITE = [
  { name:'Nellie Strongarms', spr:'b_nellie', els:['light'], intro:'NELLIE STRONGARMS cracks her knuckles in zero gravity. "Moon gravity is one sixth. My punches are not."',
    outro:'Nellie floats away, laughing. "Good workout! Next one\'s tougher, though."' },
  { name:'The Protagonist', spr:'b_hero_redeemed', els:['earth', 'light'], intro:'THE PROTAGONIST is back: lean, shredded, sword blazing. Claire Rick and Cantmiss stand beside him. "I found myself again. And I brought my friends."',
    outro:'The Protagonist smiles. "You were the main characters all along." His friends help him up.' },
  { name:'Glorb', spr:'b_glorb', els:['psychic', 'dark'], intro:'GLORB lands his saucer and raises a raygun. "GLORB COME IN PEACE. GLORB LEAVE IN PIECES. YOURS."',
    outro:'Glorb climbs back into his saucer. "GLORB WILL TELL THE MOTHERSHIP. MOTHERSHIP WILL NOT BELIEVE GLORB."' },
  { name:'Dark Saber', spr:'b_darksaber', els:['dark'], intro:'DARK SABER breathes heavily through a bucket. "I am your... hold on." He checks a note card. "I am your FATHER. Probably."',
    outro:'Dark Saber\'s bucket falls off. "Don\'t look at me!" He runs away, cape catching on everything.' }
];
// Realm 4 bosses (all humanoid). Index 7 is the Dwarf Planet; Mother Earth (R4_FINALE) waits right after him.
const REALM4_BOSSES = [
  { name:'Max Wreckage', spr:'b4_max', els:['earth', 'dark'], stand:['fighter', 'earth'], intro:'MAX WRECKAGE revs a buggy made of three other buggies. "The Sun went out and the world went with it. Everything out here is mine now, blobs. Including your goo."',
    outro:'Max Wreckage climbs out of the wreck. "Fine. Take the stars. Earth\'s got nothing left anyway."' },
  { name:'Quicksilver', spr:'b4_quick', els:['lightning'], stand:['rogue', 'lightning'], intro:'A silver blur stops in front of you. QUICKSILVER taps the winged helmet. "Mercury is the fastest planet. I am the fastest thing ON it. Try to keep up."',
    outro:'Quicksilver is, for once, standing still. "...Rematch. Later. Much, much later."' },
  { name:'Venus the Vain', spr:'b4_venus', els:['life', 'dark'], stand:['bard', 'life'], intro:'VENUS THE VAIN admires herself in a hand mirror as acid rain sizzles around her. "Ugh. Slimes. Let me fix that." She uncorks a perfume that melts the air.',
    outro:'Venus checks her mirror. A single hair is out of place. She shrieks and flees into the clouds.' },
  { name:'Commander Ares', spr:'b4_ares', els:['fire'], stand:['fighter', 'fire'], intro:'COMMANDER ARES plants his spear in the red dust. His soldiers lock shields. "Mars has never lost a war. Today is not a good day to start."',
    outro:'Commander Ares salutes. "Mars... surrenders. Do not write that down."' },
  { name:'Storm King Jove', spr:'b4_jove', els:['lightning', 'light'], stand:['sorcerer', 'lightning'], intro:'The Great Red Spot parts and STORM KING JOVE rises, lightning in his fist. "I AM THE LARGEST THING IN THIS SYSTEM. YOU ARE PUDDING."',
    outro:'Storm King Jove sits on a cloud. "Largest planet. Smallest win. Fine."' },
  { name:'The Ringmaster', spr:'b4_ring', els:['psychic', 'light'], stand:['bard', 'psychic'], intro:'THE RINGMASTER cracks her whip and Saturn\'s rings light up like a circus. "Laaadies and slimes! Tonight\'s main event: YOU, versus the greatest show in the galaxy!"',
    outro:'The Ringmaster tips her hat. "What a show! You\'re hired. No? Fine. Take a bow."' },
  { name:'Sir Tilt', spr:'b4_tilt', els:['water'], stand:['bulwark', 'water'], intro:'SIR TILT stands perfectly sideways, lance raised. "Uranus spins on its side. So do I. Nobody has ever hit me straight on."',
    outro:'Sir Tilt finally falls over. Fully. "...Huh. So this is what upright feels like."' },
  { name:'The Dwarf Planet', spr:'b4_dwarf', els:['earth', 'water'], stand:['fighter', 'earth'], intro:'A stout, heavily armored dwarf drags a huge axe across Neptune\'s ice, a tiny moon circling his head. THE DWARF PLANET: "Demoted. DEMOTED! I was a PLANET! Somebody is paying for this, and it is YOU."',
    outro:'The Dwarf Planet drops his axe. "...Still a planet in my heart." Then the ice starts to shake.' }
];
// Neptune's true final boss, fought straight after the Dwarf Planet.
const R4_FINALE = { name:'Mother Earth', spr:'b4_mother', els:['life', 'earth', 'water'], stand:['cleric', 'life'],
  intro:'The ice cracks open and MOTHER EARTH rises, vast and green and furious, oceans in her hair. "Children. You put out my Sun. You froze my home. You will go no further."',
  outro:'Mother Earth kneels... and smiles. "You did not destroy the world. You are what grew in the dark." She lights a new sun in her hands and gives it to you. The slimes rule the solar system.' };
let BOSS_INFO = REALM1_BOSSES;
function setRealm(r) { REALM = r; WORLDS = REALM_WORLDS[r]; BOSS_INFO = [REALM1_BOSSES, REALM2_BOSSES, REALM3_BOSSES, REALM4_BOSSES][r]; }
const isR4Finale = (w, node) => REALM === 3 && w === 7 && !!node && node.gi === 1;
// Which boss a boss tile holds: the Moon's tiles carry an Elite 4 index (gi 0..3); every other boss tile is the world's boss.
const bossInfoOf = (w, node) => isR4Finale(w, node) ? R4_FINALE : isMoon(w) && node && node.gi != null && node.gi < MOON_ELITE.length ? MOON_ELITE[node.gi] : BOSS_INFO[w];

