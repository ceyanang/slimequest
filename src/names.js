/* ================= slime names: random given names with rare titles ================= */
const NAMES_ANY = ('Bloop Gloop Squish Squelch Jellybean Pudge Wobbles Gelatin Blobert Globby Mochi Pudding Dumpling Noodle Biscuit Waffles Pickles Muffin Nugget Pebble Sprout ' +
  'Gerald Doug Brenda Kevin Linda Gary Susan Todd Marge Dale Carl Janet Barry Wanda Nigel Mabel Chester Dolores Winston Priscilla ' +
  'Zorp Blip Fizz Glimmer Snort Wiggle Boing Plop Splat Drip Ooze Slurp Gurgle Burble Squirt Dollop Gloopy Blorb Jiggles Squidge ' +
  'Percy Gus Fern Olive Basil Pepper Clover Juniper Hazel Moss Poppy Rufus Ziggy Waldo Otis Ozzy Milo Luna Nova Pixel Cosmo').split(' ')
  .concat(['Sir Wobbleton', 'Lady Jellington', 'Count Blobula', 'Duke Gloop', 'Baron Squish', 'Professor Goo', 'Captain Plop', 'Doctor Drip', 'Admiral Ooze', 'Mayor Muffin']);
const NAMES_CLS = {
  fighter:  'Brutus Maximus Rocco Duke Bruno Tank Clobber Ironhide Thorin Gunnar Bjorn Valiant Spartacus Axel Brick Rex',
  cleric:   'Benedict Gabriel Mercy Grace Hope Faith Sunny Halo Seraph Clementine Blessing Amen Pious Patience Cherub Anselm',
  rogue:    'Shade Dagger Whisper Nimble Swipe Sly Vex Pickpocket Snicker Slink Rascal Bandit Sneak Jinx Fingers Nyx',
  mage:     'Merlin Gandalf Zephyr Arcane Wizzle Spellbound Mystic Rune Hex Sorcha Alakazam Thaumas Quill Abra Pip Wanda',
  ranger:   'Robin Hawkeye Artemis Quiver Ash Scout Bramble Fletcher Tracker Willow Arrow Legolas Sable Thistle Hunter Dart',
  monk:     'Zen Koan Lotus Bodhi Chi Tao Sensei Karma Mantra Om Kai Ren Haiku Serenity Mochizuki Fist',
  bulwark:  'Bastion Rampart Aegis Bulwark Fort Granite Barricade Anvil Wallace Buttress Garrison Shields Moat Keep Boulder Atlas',
  bard:     'Lyric Ballad Harmony Melody Jazz Sonnet Vivaldi Chorus Fiddle Bongo Ditty Lute Encore Sonata Riff Tango',
  sorcerer: 'Blaze Tempest Cinder Zap Surge Pyra Maelstrom Mystra Arcana Conjure Voltra Dusk Havoc Ember Cascade Inferno'
};
const NAMES_EL = {
  fire:      'Ash Scorch Toasty Smoky Sparky Flare Char Kindle',
  water:     'Drizzle Puddle Splash Misty Brook Dewdrop Tide Bubbles',
  life:      'Leafy Petal Bloom Sprig Clover Mossy Acorn Thorn',
  lightning: 'Zappy Static Bolt Sparkle Volt Thunder Flicker Jolt',
  earth:     'Pebbles Rocky Clay Dusty Cobble Mud Gravel Terra',
  light:     'Beam Halo Gleam Dawn Radiant Shimmer Glow Aurora',
  dark:      'Gloom Shadow Dusk Murk Eclipse Midnight Raven Void',
  psychic:   'Mindy Trance Aura Dream Enigma Omen Echo Riddle'
};
const NAME_TITLES = ['Jr.', 'Sr.', 'the First', 'the Second', 'the Third', 'III', 'the Great', 'the Squishy', 'the Wobbly', 'the Brave'];
const TITLE_CHANCE = 0.1;
const nameList = s => s.split(/\s+/).filter(Boolean);
const nameWords = Object.fromEntries(Object.entries(NAMES_CLS).map(([k, v]) => [k, nameList(v)]));
const nameElWords = Object.fromEntries(Object.entries(NAMES_EL).map(([k, v]) => [k, nameList(v)]));

// 35% a class-flavored name, 20% an element-flavored one, otherwise anything. Names already on your team are skipped.
function randomSlimeName(el, cls, taken = []) {
  const used = new Set(taken);
  for (let tries = 0; tries < 30; tries++) {
    const r = Math.random();
    const pool = r < 0.35 && nameWords[cls] ? nameWords[cls] : r < 0.55 && nameElWords[el] ? nameElWords[el] : NAMES_ANY;
    const base = pool[Math.floor(Math.random() * pool.length)];
    const nm = Math.random() < TITLE_CHANCE ? `${base} ${NAME_TITLES[Math.floor(Math.random() * NAME_TITLES.length)]}` : base;
    if (!used.has(nm)) return nm;
  }
  return NAMES_ANY[Math.floor(Math.random() * NAMES_ANY.length)];
}
// Gives a slime a given name; its element and class title lives on as p.kind.
function giveName(p, team = []) {
  p.kind = p.kind || p.name;
  p.name = randomSlimeName(p.el, p.cls, team.map(t => t.name));
  return p;
}
