/* ================= Realm 4: Lights Out =================
   The solar system, starting from a ruined Earth. Every planet bends one combat rule (PLANET_RULES),
   each has three native creatures, and Neptune ends with the Dwarf Planet and then Mother Earth back to back. */

// ---- Planet Rules: one twist per world, shown on the map and in battle ----
const PLANET_RULES = [
  { n:'Radiation', d:'Everyone loses 3% HP at the end of each round, but all healing is 25% stronger.', tick:0.03, healMul:1.25 },
  { n:'Scorching Day', d:'Fire attacks deal 25% more damage, and everyone loses 5 STA each round.', fireMul:1.25, staTick:5 },
  { n:'Acid Rain', d:'Everyone, on both sides, starts each fight poisoned.', startPoison:true },
  { n:'Dust Storms', d:'Every attack has an extra 10% chance to miss.', miss:0.1 },
  { n:'Heavy Gravity', d:'Everyone starts each fight slowed, and multi-hit attacks deal 25% less damage.', startSlow:1, multiMul:0.75 },
  { n:'Ring Shields', d:'Everyone, on both sides, starts each fight with a 15% shield.', startShield:0.15 },
  { n:'Sideways Spin', d:'Turn order is reversed: the slowest units act first.', reverse:true },
  { n:'Frozen Winds', d:'Stamina regenerates at half speed.', staRegenMul:0.5 }
];
const planetRule = () => REALM === 3 ? PLANET_RULES[LV_WORLD] || null : null;
function planetStart(team, foes) {
  const R = planetRule(); if (!R) return;
  [...alive(team), ...alive(foes)].forEach(u => {
    if (R.startPoison && !u.poison) { u.poison = 4; u.poisonP = false; }
    if (R.startShield) u.shield += Math.round(u.max * R.startShield);
    if (R.startSlow) stage(u, 'sSpd', -R.startSlow);
  });
}
function planetRound(x) {   // per unit, end of round
  const R = planetRule(); if (!R || x.hp <= 0) return;
  if (R.tick) { const v = Math.max(1, Math.round(x.max * R.tick)); x.hp = Math.max(x.hp > v ? 1 : 0, x.hp - v); x.hit = true; fx({ u:x, k:'dmg', v, el:'dark', small:true, ko:x.hp <= 0 }); }
  if (R.staTick) x.sta = Math.max(0, x.sta - R.staTick);
}
const planetDmgMul = (a, m) => { const R = planetRule(); if (!R) return 1; let v = 1; if (R.fireMul && m.el === 'fire') v *= R.fireMul; if (R.multiMul && (m.hits || 1) > 1) v *= R.multiMul; return v; };

// ---- Natives: three one-element creatures per planet ----
Object.assign(CREATURES, {
  mrat:     { n:'Mutant Rat', el:'dark', cat:'p', hp:0.6, off:1.0, spd:8, pack:true, q:'Glows faintly. Comes in packs.', moves:[ { n:'Rabid Bite', el:'dark', cat:'p', pow:35, s:20, t:'foe', poison:0.4 }, { n:'Swarm', el:'dark', cat:'p', pow:18, hits:3, s:25, t:'foe' } ] },
  sdrone:   { n:'Scrap Drone', el:'lightning', cat:'s', hp:0.8, off:1.05, spd:7, q:'Zaps and paralyzes.', moves:[ { n:'Taser', el:'lightning', cat:'s', pow:40, s:25, t:'foe', para:0.3 }, { n:'Spark Spray', el:'lightning', cat:'s', pow:25, s:30, t:'foes' } ] },
  roach:    { n:'Wasteland Roach', el:'earth', cat:'p', d:[1.3, 1], hp:1.5, off:0.9, spd:3, q:'Survives anything. Very tanky.', moves:[ { n:'Crunch', el:'earth', cat:'p', pow:45, s:25, t:'foe' }, { n:'Endure', el:'earth', pow:0, s:25, t:'self', healPct:0.15 } ] },
  imp:      { n:'Magma Imp', el:'fire', cat:'s', hp:0.7, off:1.15, spd:8, q:'Burns everything it touches.', moves:[ { n:'Magma Spit', el:'fire', cat:'s', pow:45, s:25, t:'foe', burn:0.4 }, { n:'Flare Up', el:'fire', cat:'s', pow:25, s:30, t:'foes', burn:0.2 } ] },
  wisp:     { n:'Solar Wisp', el:'light', cat:'s', hp:0.6, off:1.0, spd:10, q:'Blinds you, then heals its friends.', moves:[ { n:'Glare', el:'light', cat:'s', pow:30, s:25, t:'foes', blind:0.35 }, { n:'Warm Glow', el:'light', pow:0, s:30, t:'allies', healPct:0.12 } ] },
  qlizard:  { n:'Quick Lizard', el:'lightning', cat:'p', hp:0.7, off:1.05, spd:11, extra:{ first:true }, q:'Always strikes first.', moves:[ { n:'Dart Bite', el:'lightning', cat:'p', pow:40, s:20, t:'foe' }, { n:'Tail Whip', el:'lightning', cat:'p', pow:20, hits:2, s:25, t:'foe', para:0.15 } ] },
  aslug:    { n:'Acid Slug', el:'life', cat:'s', hp:1.1, off:0.9, spd:2, item:'thorns', q:'Acidic slime: hitting it hurts.', moves:[ { n:'Acid Trail', el:'life', cat:'s', pow:35, s:25, t:'foes', poison:0.4 }, { n:'Corrode', el:'life', cat:'s', pow:45, s:25, t:'foe', expose:1 } ] },
  siren:    { n:'Cloud Siren', el:'psychic', cat:'s', hp:0.7, off:1.05, spd:8, q:'Her song confuses.', moves:[ { n:'Lure Song', el:'psychic', cat:'s', pow:25, s:30, t:'foes', confuse:0.35 }, { n:'Shriek', el:'psychic', cat:'s', pow:50, s:25, t:'foe' } ] },
  ltoad:    { n:'Lava Toad', el:'fire', cat:'p', hp:1.0, off:1.05, spd:5, q:'Heavy, hot and hard to move.', moves:[ { n:'Lava Belly Flop', el:'fire', cat:'p', pow:55, s:30, t:'foe', burn:0.3 }, { n:'Croak Quake', el:'fire', cat:'p', pow:30, s:30, t:'foes' } ] },
  martian:  { n:'Little Green Man', el:'psychic', cat:'s', hp:0.6, off:1.05, spd:8, pack:true, q:'Arrives in groups, with ray guns.', moves:[ { n:'Ray Gun', el:'psychic', cat:'s', pow:40, s:20, t:'foe' }, { n:'Probe', el:'psychic', cat:'s', pow:25, s:25, t:'foe', confuse:0.3 } ] },
  dworm:    { n:'Dust Worm', el:'earth', cat:'p', hp:1.3, off:1.05, spd:3, q:'Bursts out of the sand.', moves:[ { n:'Burrow Strike', el:'earth', cat:'p', pow:55, s:30, t:'foe', stun:0.15 }, { n:'Sandblast', el:'earth', cat:'p', pow:25, s:30, t:'foes', blind:0.25 } ] },
  rover:    { n:'Rogue Rover', el:'lightning', cat:'s', d:[1.2, 1.1], hp:1.1, off:0.95, spd:4, q:'Armored. Drains your stamina.', moves:[ { n:'Laser Drill', el:'lightning', cat:'s', pow:45, s:25, t:'foe', staDrain:20 }, { n:'Solar Panel', el:'lightning', pow:0, s:25, t:'self', shieldPct:0.2 } ] },
  ssprite:  { n:'Storm Sprite', el:'lightning', cat:'s', hp:0.6, off:1.1, spd:10, q:'Fast and shocking.', moves:[ { n:'Chain Zap', el:'lightning', cat:'s', pow:35, s:25, t:'foes', para:0.2 }, { n:'Bolt', el:'lightning', cat:'s', pow:50, s:25, t:'foe' } ] },
  jelly:    { n:'Gas Jelly', el:'water', cat:'s', hp:1.1, off:0.95, spd:4, q:'Floats, stings, and drains.', moves:[ { n:'Sting', el:'water', cat:'s', pow:40, s:25, t:'foe', poison:0.3 }, { n:'Absorb', el:'water', cat:'s', pow:40, s:25, t:'foe', leech:0.5 } ] },
  iogolem:  { n:'Io Golem', el:'fire', cat:'p', d:[1.25, 1], hp:1.4, off:1.0, spd:2, q:'A walking volcano from Jupiter\'s moon.', moves:[ { n:'Eruption Punch', el:'fire', cat:'p', pow:60, s:30, t:'foe', burn:0.3 }, { n:'Magma Shell', el:'fire', pow:0, s:30, t:'self', shieldPct:0.25 } ] },
  clown:    { n:'Space Clown', el:'psychic', cat:'s', hp:0.8, off:1.0, spd:7, q:'Honk. Confuses everyone.', moves:[ { n:'Pie in the Face', el:'psychic', cat:'s', pow:40, s:25, t:'foe', blind:0.4 }, { n:'Honk Honk', el:'psychic', cat:'s', pow:20, s:30, t:'foes', confuse:0.3 } ] },
  rgolem:   { n:'Ring Golem', el:'earth', cat:'p', d:[1.3, 1.1], hp:1.5, off:0.9, spd:2, q:'Made of ring ice and rock. Taunts.', moves:[ { n:'Ring Slam', el:'earth', cat:'p', pow:55, s:30, t:'foe' }, { n:'Stand Firm', el:'earth', pow:0, s:30, t:'self', selfTaunt:2, armor:1 } ] },
  moth:     { n:'Titan Moth', el:'light', cat:'s', hp:0.8, off:1.05, spd:8, q:'Its dust blinds and heals moths.', moves:[ { n:'Dust Wings', el:'light', cat:'s', pow:30, s:25, t:'foes', blind:0.3 }, { n:'Moonbeam', el:'light', cat:'s', pow:50, s:25, t:'foe', leech:0.3 } ] },
  iwraith:  { n:'Ice Wraith', el:'water', cat:'s', hp:0.8, off:1.1, spd:7, q:'Its touch freezes.', moves:[ { n:'Frost Touch', el:'water', cat:'s', pow:45, s:25, t:'foe', stun:0.2 }, { n:'Chill Wind', el:'water', cat:'s', pow:25, s:30, t:'foes', slow:1 } ] },
  beetle:   { n:'Frost Beetle', el:'water', cat:'p', d:[1.35, 1], hp:1.3, off:0.95, spd:3, q:'An ice-armored tank.', moves:[ { n:'Horn Ram', el:'water', cat:'p', pow:55, s:30, t:'foe' }, { n:'Ice Shell', el:'water', pow:0, s:30, t:'self', shieldPct:0.25 } ] },
  afox:     { n:'Aurora Fox', el:'light', cat:'s', hp:0.7, off:1.1, spd:10, crit:0.15, q:'Fast, lucky, crits often.', moves:[ { n:'Aurora Bite', el:'light', cat:'s', pow:50, s:25, t:'foe', critBonus:0.15 }, { n:'Shimmer', el:'light', pow:0, s:25, t:'self', veil:1 } ] },
  squid:    { n:'Abyss Squid', el:'water', cat:'s', hp:1.0, off:1.05, spd:6, q:'Ink blinds, tentacles grab.', moves:[ { n:'Ink Cloud', el:'water', cat:'s', pow:25, s:30, t:'foes', blind:0.4 }, { n:'Tentacle Grab', el:'water', cat:'s', pow:45, s:25, t:'foe', stun:0.2 } ] },
  veel:     { n:'Void Eel', el:'dark', cat:'s', hp:0.8, off:1.15, spd:9, q:'Drains life from the dark.', moves:[ { n:'Void Shock', el:'dark', cat:'s', pow:50, s:25, t:'foe', leech:0.3 }, { n:'Dark Current', el:'dark', cat:'s', pow:25, s:30, t:'foes', weaken:1 } ] },
  comet:    { n:'Comet Sprite', el:'psychic', cat:'s', hp:0.6, off:1.15, spd:11, extra:{ first:true }, q:'Streaks in first, hits hard.', moves:[ { n:'Comet Tail', el:'psychic', cat:'s', pow:55, s:30, t:'foe' }, { n:'Stardust', el:'psychic', cat:'s', pow:20, s:25, t:'foes', confuse:0.25 } ] }
});
const R4_NATIVE = [['mrat', 'sdrone', 'roach'], ['imp', 'wisp', 'qlizard'], ['aslug', 'siren', 'ltoad'], ['martian', 'dworm', 'rover'],
                   ['ssprite', 'jelly', 'iogolem'], ['clown', 'rgolem', 'moth'], ['iwraith', 'beetle', 'afox'], ['squid', 'veel', 'comet']];

// ---- Bosses (all humanoid). Stand-in art until the real sprites arrive: a big version of their class sprite. ----
function boss4(w, L, info, o) { const u = bossUnit(w, L, { name:info.name, el:info.els[0], spr:info.spr, ...o }); u.el2 = info.els[1]; u.el3 = info.els[2]; return u; }
const BOSSES4 = [
  // 1. Ruined Earth: Max Wreckage and two raiders. Bleeding poison, ramming hits, and a nitro phase.
  (w, L) => { const h = boss4(w, L, REALM4_BOSSES[0], { cls:'fighter', dmul:[1.1, 1], k:{ hp:2.8, off:1.08, def:1.1, spd:6 }, basic:{ n:'Tire Iron', cat:'p' },
      script:['Chain Whip', 'Rust Bleed', 'Ram Raid', 'Scrap Armor'],
      phase:{ at:0.5, title:'FULL THROTTLE', shield:0.15, offUp:1, script:['Nitro Crash', 'Ram Raid', 'Chain Whip', 'Rust Bleed'], say:'Max Wreckage slams the nitro. The buggy screams.',
              addMoves:[ { n:'Nitro Crash', el:'fire', cat:'p', pow:55, s:45, t:'foes', burn:0.3 } ] },
      moves:[ { n:'Chain Whip', el:'earth', cat:'p', pow:30, s:30, t:'foes' },
              { n:'Rust Bleed', el:'dark', cat:'p', pow:45, s:30, t:'foe', poison:0.6 },
              { n:'Ram Raid', el:'earth', cat:'p', pow:70, s:35, t:'foe', stun:0.2 },
              { n:'Scrap Armor', el:'earth', pow:0, s:30, t:'self', shieldPct:0.2 } ] });
    const team = [h, named(side(w, L, 'dark', 'rogue', 0.4), 'Wasteland Raider'), named(side(w, L, 'fire', 'ranger', 0.4), 'Wasteland Raider')]; h.teamRef = team; return team; },
  // 2. Mercury: Quicksilver. Always first; acts twice once hurt.
  (w, L) => { const h = boss4(w, L, REALM4_BOSSES[1], { cls:'rogue', dmul:[0.95, 1], k:{ hp:2.4, off:1.08, def:0.95, spd:12, crit:0.15 }, basic:{ n:'Flash Jab', cat:'p' }, extra:{ first:true },
      script:['Blur Combo', 'Mercury Rising', 'Afterimage', 'Blur Combo'],
      phase:{ at:0.5, title:'TOP SPEED', shield:0.1, extra:{ twice:true }, script:['Mercury Rising', 'Blur Combo', 'Afterimage', 'Blur Combo'], say:'Quicksilver vanishes. Then there are two of them. No, just one, moving very fast.' },
      moves:[ { n:'Blur Combo', el:'lightning', cat:'p', pow:18, hits:4, s:30, t:'foe' },
              { n:'Mercury Rising', el:'lightning', cat:'p', pow:60, s:35, t:'foe', para:0.3 },
              { n:'Afterimage', el:'lightning', pow:0, s:25, t:'self', veil:1 } ] });
    return [h]; },
  // 3. Venus: Venus the Vain and two admirers. Poison+ perfume, charm (confusion), vanity buffs.
  (w, L) => { const h = boss4(w, L, REALM4_BOSSES[2], { cls:'bard', dmul:[1, 1.1], k:{ hp:2.7, off:1.05, def:1, spd:7, sta:150 }, basic:{ n:'Fan Slap', cat:'s' },
      script:['Toxic Perfume', 'Charm', 'Vanity', 'Toxic Perfume'],
      phase:{ at:0.5, title:'NOT MY GOOD SIDE', shield:0.15, offUp:1, script:['Acid Glare', 'Toxic Perfume', 'Charm', 'Acid Glare'], say:'Venus sees her reflection with a scratch on it. Her eyes go acid green.',
              addMoves:[ { n:'Acid Glare', el:'dark', cat:'s', pow:60, s:35, t:'foe', blind:0.4 } ] },
      moves:[ { n:'Toxic Perfume', el:'dark', cat:'s', pow:30, s:35, t:'foes', poison:0.5, poisonP:true },
              { n:'Charm', el:'life', pow:0, s:30, t:'foes', confuse:0.45 },
              { n:'Vanity', el:'life', pow:0, s:30, t:'allies', offUp:1 } ] });
    const ad = () => { const c = named(side(w, L, 'life', 'cleric', 0.4), 'Admirer'); c.favor = 'bard'; return c; };
    const team = [h, ad(), ad()]; h.teamRef = team; return team; },
  // 4. Mars: Commander Ares and two legionnaires. War cries, shield walls and an orbital strike.
  (w, L) => { const h = boss4(w, L, REALM4_BOSSES[3], { cls:'fighter', dmul:[1.15, 1], k:{ hp:2.3, off:1.08, def:1.1, spd:6 }, basic:{ n:'Spear Butt', cat:'p' },
      script:['War Cry', 'Ray Spear', 'Orbital Strike', 'Phalanx'],
      phase:{ at:0.5, title:'TOTAL WAR', shield:0.15, offUp:1, script:['Ray Spear', 'Orbital Strike', 'War Cry', 'Ray Spear'], say:'Commander Ares raises his spear. Every Martian on the planet roars.' },
      moves:[ { n:'Ray Spear', el:'fire', cat:'p', pow:65, s:30, t:'foe' },
              { n:'War Cry', el:'fire', pow:0, s:30, t:'allies', offUp:1 },
              { n:'Phalanx', el:'earth', pow:0, s:35, t:'allies', shieldPct:0.1 },
              { n:'Orbital Strike', el:'fire', pow:0, s:45, t:'foe', bomb:{ pow:75, burn:0.4 } } ] });
    const lg = () => named(side(w, L, 'fire', 'bulwark', 0.36), 'Martian Legionnaire');
    const team = [h, lg(), lg()]; h.teamRef = team; return team; },
  // 5. Jupiter: Storm King Jove. Huge hits, paralysis+, and a storm phase.
  (w, L) => { const h = boss4(w, L, REALM4_BOSSES[4], { cls:'sorcerer', dmul:[1.05, 1.15], k:{ hp:3.3, off:1.08, def:1.1, spd:5, sta:170 }, basic:{ n:'Static Palm', cat:'s' },
      script:['Storm Front', 'Thunderbolt', 'Great Red Storm', 'Divine Right'],
      phase:{ at:0.5, title:'KING OF THE GODS', shield:0.2, offUp:1, script:['Gigabolt', 'Thunderbolt', 'Great Red Storm', 'Storm Front'], say:'Storm King Jove grows twice as large. The whole planet thunders.',
              addMoves:[ { n:'Gigabolt', el:'lightning', cat:'s', pow:55, s:45, t:'foes', stun:0.15 } ] },
      moves:[ { n:'Thunderbolt', el:'lightning', cat:'s', pow:70, s:35, t:'foe', para:0.4, paraP:true },
              { n:'Storm Front', el:'lightning', cat:'s', pow:40, s:35, t:'foes', para:0.2 },
              { n:'Divine Right', el:'light', pow:0, s:30, t:'self', shieldPct:0.2, offUp:1 },
              { n:'Great Red Storm', el:'lightning', pow:0, s:50, t:'foe', bomb:{ pow:85, stun:0.25 } } ] });
    return [h]; },
  // 6. Saturn: The Ringmaster, a clown and a strongman. Ring shields, crowd-pleasing encores, a revive finale.
  (w, L) => { const h = boss4(w, L, REALM4_BOSSES[5], { cls:'bard', dmul:[1, 1.1], k:{ hp:3.2, off:1.12, def:1.05, spd:8, sta:150 }, basic:{ n:'Cane Tap', cat:'p' },
      script:['Showstopper', 'Whip Crack', 'Ring of Fire', 'Encore!'],
      phase:{ at:0.5, title:'GRAND FINALE', shield:0.15, offUp:1, revive:0.4, script:['Ring of Fire', 'Whip Crack', 'Encore!', 'Ring of Fire'], say:'The Ringmaster: "And now... the GRAND FINALE!" Her fallen performers take a bow and get back up.' },
      moves:[ { n:'Whip Crack', el:'psychic', cat:'p', pow:45, s:30, t:'foe', confuse:0.3 },
              { n:'Ring of Fire', el:'light', cat:'s', pow:35, s:35, t:'foes', burn:0.3 },
              { n:'Showstopper', el:'light', pow:0, s:35, t:'allies', shieldPct:0.15 },
              { n:'Encore!', el:'psychic', pow:0, s:30, t:'allies', offUp:1, haste:1 } ] });
    const team = [h, pet(w, L, 'psychic', 'rogue', 0.4, 'Space Clown', 'cr_clown', [ { n:'Pie in the Face', el:'psychic', cat:'s', pow:40, s:25, t:'foe', blind:0.4 }, { n:'Honk Honk', el:'psychic', cat:'s', pow:20, s:30, t:'foes', confuse:0.3 } ]),
      named(side(w, L, 'earth', 'fighter', 0.42), 'Strongman')]; h.teamRef = team; return team; },
  // 7. Uranus: Sir Tilt. Counters, freezes, sideways charges and an ice squire.
  (w, L) => { const h = boss4(w, L, REALM4_BOSSES[6], { cls:'bulwark', dmul:[1.2, 1.05], k:{ hp:3.8, off:1.12, def:1.2, spd:4 }, basic:{ n:'Shield Bash', cat:'p' },
      script:['Ice Shield', 'Frozen Lance', 'Sideways Charge', 'Glacial Wall'],
      phase:{ at:0.5, title:'FULL TILT', shield:0.15, offUp:1, script:['Frozen Lance', 'Sideways Charge', 'Ice Shield', 'Frozen Lance'], say:'Sir Tilt spins completely upside down. Somehow this is worse.' },
      moves:[ { n:'Frozen Lance', el:'water', cat:'p', pow:65, s:30, t:'foe', stun:0.25 },
              { n:'Ice Shield', el:'water', pow:0, s:30, t:'self', counter:{ pow:55 } },
              { n:'Sideways Charge', el:'water', cat:'p', pow:40, s:35, t:'foes', slow:1 },
              { n:'Glacial Wall', el:'water', pow:0, s:30, t:'self', shieldPct:0.25, selfTaunt:2 } ] });
    const team = [h, named(side(w, L, 'water', 'cleric', 0.4), 'Ice Squire')]; h.teamRef = team; return team; },
  // 8. Neptune, part 1: The Dwarf Planet. A huge axe, a thrown moon, and a grudge.
  (w, L) => { const h = boss4(w, L, REALM4_BOSSES[7], { cls:'fighter', dmul:[1.2, 1.1], k:{ hp:4.0, off:1.2, def:1.15, spd:4, crit:0.12 }, basic:{ n:'Beard Headbutt', cat:'p' },
      script:['Cleave', 'Axe of Demotion', 'Moon Toss', 'Grudge'],
      phase:{ at:0.4, title:'STILL A PLANET', shield:0.2, offUp:1, script:['Planetary Smash', 'Axe of Demotion', 'Moon Toss', 'Axe of Demotion'], say:'The Dwarf Planet roars: "I HAVE A MOON! PLANETS HAVE MOONS!"',
              addMoves:[ { n:'Planetary Smash', el:'earth', cat:'p', pow:60, s:45, t:'foes', stun:0.15 } ] },
      moves:[ { n:'Axe of Demotion', el:'earth', cat:'p', pow:85, s:35, t:'foe', execute:true },
              { n:'Cleave', el:'earth', cat:'p', pow:45, s:30, t:'foes' },
              { n:'Moon Toss', el:'water', pow:0, s:45, t:'foe', bomb:{ pow:70, stun:0.3 } },
              { n:'Grudge', el:'earth', pow:0, s:30, t:'self', offUp:1, healPct:0.1 } ] });
    return [h]; }
];
// Neptune, part 2: Mother Earth, the true final boss (three elements, three-phase-feeling fight).
function motherEarth(w, L) {
  const h = boss4(w, L, R4_FINALE, { cls:'sorcerer', dmul:[1.1, 1.15], k:{ hp:4.6, off:1.12, def:1.15, spd:5, sta:180 }, basic:{ n:'Vine Lash', cat:'s' },
    script:['Overgrowth', 'Tidal Wrath', 'Earthquake', "Gaia's Embrace", 'Volcanic Rage'],
    phase:{ at:0.5, title:'THE PLANET REMEMBERS', shield:0.2, offUp:1, script:['Extinction Event', 'Tidal Wrath', 'Volcanic Rage', 'Overgrowth', "Gaia's Embrace"], say:'Mother Earth: "I have ended worlds before." Continents rise behind her.',
            addMoves:[ { n:'Extinction Event', el:'earth', cat:'s', pow:65, s:50, t:'foes' } ] },
    moves:[ { n:'Earthquake', el:'earth', cat:'s', pow:45, s:35, t:'foes', stun:0.1 },
            { n:'Tidal Wrath', el:'water', cat:'s', pow:65, s:35, t:'foe' },
            { n:'Overgrowth', el:'life', cat:'s', pow:35, s:35, t:'foes', poison:0.5 },
            { n:"Gaia's Embrace", el:'life', pow:0, s:35, t:'self', healPct:0.1, regen:[0.08, 3] },
            { n:'Volcanic Rage', el:'earth', pow:0, s:50, t:'foe', bomb:{ pow:85, burn:0.5, burnP:true } } ] });
  h.art = true;
  return [h];
}
const R4_FINALE_LV = 3;   // Mother Earth sits a few levels above the Dwarf Planet

// ---- Sprites: 16x16 natives and stand-in boss art ----
if (typeof SPR !== 'undefined') Object.assign(SPR, {
  cr_mrat:["................","................","................","...kk......k....",".keeek....kek...","kekeeekkkkeek...","keeeeeeeeeeek...","kewewNeeeeeek...",".kkeeeeeeeeeek..","..keeeeeeeeeeek.","..keekeeeeekeekk","..kek.kkkk.kek..","...k........k...","................","................","................"],
  cr_sdrone:["................","..k..........k..","..kk..kkkk..kk..","...kkkGGGGkkk...","....kGgggGGk....","...kGgykkygGk...","...kGgggggGGk...","....kGGGGGGk....","....kk.kk.kk....","...kyk.ky.kyk...","...k.........k..","................","................","................","................","................"],
  cr_roach:["................","................","....k......k....",".....k....k.....","....kNNNNNNk....","...kNnnnnnnNk...","..kNnNnnnnNnNk..","..kNnnnNNnnnNk..","..kNnNnnnnNnNk..","..kNnnnnnnnnNk..","...kNNNNNNNNk...","..k.k.k..k.k.k..","..k..k....k..k..","................","................","................"],
  cr_imp:["................","...kk....kk.....","..kok....kok....","..kooookooook...","..koywoowyook...","..kooooooooook..","...koRRRRook....","....koooook.....","..kkoooooookk...","..kokoooookok...","....koooook.....","....kok.kok.....","....kk...kk.....","................","................","................"],
  cr_wisp:["................","......kkkk......",".....kLLLLk.....","....kLuwwuLk....","...kLuwwwwuLk...","...kLuwkkwuLk...","...kLuwwwwuLk...","....kLuuuuLk....",".....kLLLLk.....","......kLLk......",".......kk.......","................","................","................","................","................"],
  cr_qlizard:["................","................","................","..kkk...........",".kyyyk..........","kyykyyk.........","kyyyyyykkkk.....",".kyyyyyyyyyk....","..kyYyyYyyyyk...","..kyyyyyyyyyykk.","...kYk..kYk..kyk","...kk....kk...k.","................","................","................","................"],
  cr_aslug:["................","................","................","..........k.k...","..........kek...","........kkeek...",".......keeeek...",".....kkeweeek...","...kkeeeeeeek...","..keeEeeEeeek...",".keeeeeeeeeek...","kmmmmmmmmmmmk...","kkkkkkkkkkkkk...","................","................","................"],
  cr_siren:["................","......kkkk......",".....kppppk.....","....kpsssspk....","....kpskskpk....","....kpsssspk....","...kpppssppp.k..","..kcck pppkcck..",".kcccckpppkcccck","..kcckpppppkcck.","....kpppppppk...",".....kpppppk....","......kpppk.....",".......kpk......","........k.......","................"],
  cr_ltoad:["................","................","....kk....kk....","...kwkk..kkwk...","...kkvvkkvvkk...","..kvvvvvvvvvvk..",".kvvvoovvvoovvk.",".kvvvvvvvvvvvvk.",".kvvkkkkkkkkvvk.","..kvvvvvvvvvvk..","..kvk.kkkk.kvk..","..kk........kk..","................","................","................","................"],
  cr_martian:["................","....k......k....",".....k....k.....","....kkkkkkkk....","...keeeeeeeek...","..keekkeekkeek..","..keekwkeekwek..","...keeeeeeeek...","....keekkeek....",".....keeeek.....","....kGGGGGGk....","...kGkGGGGkGk...","....kGGkkGGk....","....kek..kek....","................","................"],
  cr_dworm:["................","......kkkk......",".....kjjjjk.....","....kjkjjkjk....","....kjjRRjjk....","....kjRwwRjk....",".....kjRRjk.....",".....kjjjjk.....","....kjjjjjjk....","...kjjNjjNjjk...","..kNNNNNNNNNNk..",".kNnNnNnNnNnNnk.","kkkkkkkkkkkkkkkk","................","................","................"],
  cr_rover:["................",".......kk.......","......kbbk......",".....kkkkkk.....","..kkkGGGGGGkkk..","..kGGGGGGGGGGk..","..kGyGGGGGGyGk..","..kkkkkkkkkkkk..","..kgk.kgk.kgkk..",".kgggkgggkgggk..",".kgkgkgkgkgkgk..","..kkk.kkk.kkk...","................","................","................","................"],
  cr_ssprite:["................",".......k........","......kyk.......",".....kyLyk......","....kyLwLyk.....","...kyLwkwLyk....","..kyyLwwwLyyk...","...kyyLLLyyk....","....kyyyyyk.....",".....kyyyk......","......kyk.......","......k.........",".....k..........","................","................","................"],
  cr_jelly:["................","....kkkkkkk.....","...kbbbbbbbk....","..kbBbbbbbBbk...","..kbbwbbbwbbk...","..kbbbbbbbbbk...","...kkbkbkbkk....","....kb.b.bk.....","....k.b.b.k.....",".....kb.bk......",".....k.b.k......","................","................","................","................","................"],
  cr_iogolem:["................","....kkkkkkk.....","...kNoNNoNNk....","...kNNyNNyNk....","...kNNNNNNNk....","..kkNoNNNNoNkk..",".kNNkNNNNNNkNNk.",".kNokNNoNNNkoNk.",".kNNkNNNNNNkNNk.","..kk.kNNNNk.kk..","....kNNkkNNk....","....kNNk.kNNk...","....kkkk.kkkk...","................","................","................"],
  cr_clown:["......kkkk......",".....kpyRpk.....","....kpyRyRpk....","...kkkkkkkkkk...","...kwwwwwwwwk...","...kwkwwwwkwk...","...kwwwRRwwwk...","...kwRwwwwRwk...","....kwRRRRwk....","...kkpkkkkpkk...","..kpypypypypyk..","..kypypypypypk..","...kkpkkkkpkk...","....kRk..kRk....","....kkk..kkk....","................"],
  cr_rgolem:["................","....kkkkkkkk....","...kGGGIIGGGk...","...kGkGGGGkGk...","...kGGGGGGGGk...","kkkkGGIIIIGGkkkk","kZZkGGGGGGGGkZZk","kZZkGIGGGGIGkZZk","kkkkGGGGGGGGkkkk","....kGGGGGGk....","....kGGkkGGk....","...kGGGk.kGGGk..","...kkkkk.kkkkk..","................","................","................"],
  cr_moth:["................",".k............k.","..k..........k..","...kkk....kkk...","..kLLLk..kLLLk..",".kLuLLLkkLLLuLk.",".kLLLLkxxkLLLLk.",".kLuLLkxxkLLuLk.","..kLLLkxxkLLLk..","...kkkkxxkkkk...","......kxxk......","......kxxk......",".......kk.......","................","................","................"],
  cr_iwraith:["................",".....kkkkk......","....kZZZZZk.....","...kZZZZZZZk....","...kZkkZkkZk....","...kZbkZbkZk....","...kZZZZZZZk....","..kZZZkkkZZZk...","..kZZZZZZZZZk...","...kZZZZZZZk....","...kZkZkZkZk....","....k.k.k.k.....","................","................","................","................"],
  cr_beetle:["................","......k.........",".....kbk........","....kbBbk.......","...kkkkkkkkk....","..kbbBbbbBbbk...",".kbZbbbBbbbZbk..",".kbbbbbBbbbbbk..",".kbZbbbBbbbZbk..","..kbbbbBbbbbk...","...kkkkkkkkk....","..k.k.k..k.k.k..","................","................","................","................"],
  cr_afox:["................","..k.......k.....","..kk.....kk.....","..kxk...kxk.....","..kxxkkkxxk.....",".kxxxxxxxxxk....",".kxkxxxxkxxk....",".kxxxxkxxxxk...k","..kxxwwwxxk...kx","...kxxxxxxkk.kxk","..kxxxxxxxxxkxk.","..kxxxxxxxxxxk..","...kxk.kxxkxk...","...kk..kk.kk....","................","................"],
  cr_squid:["......kkkk......",".....kBBBBk.....","....kBBBBBBk....","...kBBBBBBBBk...","...kBBBBBBBBk...","...kBwkBBwkBk...","...kBBBBBBBBk...","....kBBBBBBk....","...kBkBkBkBkBk..","..kBk.kBk.kBk...","..kB..kB..kB....","..k..kB....kB...","....kB......k...","....k...........","................","................"],
  cr_veel:["................","................","..........kkk...",".........kdddk..","........kdwdDk..",".......kdddddk..","......kdDdddk...",".....kdddDdk....","....kddDddk.....","...kdddddk......","..kdDddk........",".kddkkk.........",".kkk............","................","................","................"],
  cr_comet:["................","................","..........kkk...",".........kpwpk..","........kpwwwpk.","........kpwwwpk.",".......kkpppppk.","......kp.kpppk..","....kpp...kkk...","..kpp...........",".kp.............","................","................","................","................","................"]
});
// Stand-in boss art until real sprites arrive: the boss's class sprite in its element colors.
const R4_STANDIN = {};
[...REALM4_BOSSES, R4_FINALE].forEach(b => { R4_STANDIN[b.spr] = b.stand; });
