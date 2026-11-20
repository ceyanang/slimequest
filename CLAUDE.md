# Slime Quest - notes for Claude

Mobile-first pixel-art roguelike. Single-file HTML game, published as a Claude artifact.

## Build & test
- Source lives in `shell.html` (HTML/CSS), `sprites.js` (pixel sprites), `src/*.js`. **Never edit index.html directly**: run `sh build.sh` to rebuild it (order of files matters, see build.sh).
- After changes: `sh build.sh`, then `node tools/smoke.js` (expect `errors []`). For balance: `node tools/sim.js 400 mixed` (run 3x and average; noise is about +/-0.2).
- Test at phone size (390x844).

## Owner preferences
- The owner's "1" key is broken: they write "one" ("one.2" = 1.2). Typos are common; flag ambiguous requests briefly instead of guessing silently.
- After each change, say what changed in a few sentences.
- After each finished change (build + smoke test pass): publish index.html to the existing artifact https://claude.ai/artifact/XHXb7JJCAydMq8uya7ybPk (same URL keeps cloud saves; keep its db/user capabilities), then open a PR and merge it into main. No need to ask first.

## Design rules
- Every element+class combo moveset should have its own niche. No element-only moves.
- No strictly-better moves unless they have a real downside.
- Passive / stat percentage boosts use 25% steps (shields are exempt).
- Don't rebalance speed moves for now.
- Dual/multi-element units MULTIPLY type multipliers (x1.5 * x0.67 = neutral).

## Map of the code
- `src/data.js`: elements (EL_STATS, type chart CYC/SPC, effMult/effVs), classes, moves & learnsets, passives (PASSIVES, CLASS_PMOVES Lv25, ELEM_PMOVES Lv45), worlds per realm (REALM_WORLDS, REALM_DEF difficulty), boss story text.
- `src/engine.js`: units, damage (calcDmg), act/endRound, AI (scoreMove, planFor with 1-round lookahead), enemies, Realm 1 bosses (BOSSES), Realm 2 bosses (BOSSES2), Realm 3 bosses (BOSSES3, Moon Elite 4 MOON_FIGHTS, moonMap), fusion (fuseSlimes, multiclass names MULTICLASS, element names ELEMENT_COMBO), map generation.
- `src/meta.js`: saved progress (stars, shared points, realm clears), save/resume run.
- `src/ui.js`: every screen (starter pick, map, battle, recruit, shrine, bag/pocket, inspect popup).
- Battle text: Pokemon-style dialogue box (`setDlg`/`dlgWait`/`typeInto` in ui.js) replaces the move panel while actions play; pre-boss cutscene `showBossIntro` pages the intro and waits for CONTINUE.
- Speed modes: AUTO and QUICK toggle from the map and the battle bar (saved with the run). QUICK = auto + 4x speed (`SPEED()` 4.4), no move panel/battle text, and level-up moves are learned by `smartLearn` (replaces the weakest move if better, counting party gaps: heal, hit-all, protect). On 2x the dialogue stays up longer than other waits (1.4x shorter, not 2.2x).
- `src/realm4.js` (loaded after engine.js): Realm 4 Planet Rules (`PLANET_RULES`, hooks planetStart/planetRound/planetDmgMul + heal, miss, turn order, STA regen), natives (`R4_NATIVE`), bosses (`BOSSES4`, `motherEarth`), native sprites; `R4_STANDIN` is only a fallback now. `src/bossart4.js`: Realm 4 boss art (source PNGs in `art/realm4/`).
- `src/bossart.js`: Realm 2 boss art (base64 PNG). `src/bossart3.js`: Realm 3 boss art (source PNGs in `art/realm3/`).

## Systems in short
- Realms: Realm 1 (Classic Quest), Realm 2 (Genre Hop, unlocked by clearing Realm 1; +50% enemy HP, +22% OFF), Realm 3 (World Domination, unlocked by clearing Realm 2; +60% HP, +31% OFF), Realm 4 (Lights Out, unlocked by clearing Realm 3; +80% HP, +45% OFF).
- Realm 3 target: clearable by a 2-star team or a 3-star carry (sim: `R=2 SB=1.2 node tools/sim.js 300 mixed` about 25% clear, same as Realm 2 at 2 stars).
- The Moon (Realm 3 world 8): full heal on arrival, Elite 4 back to back (tiles carry `gi` 0-3), one camp, then the Sun (gi 4). Only the usual after-fight revive/15% heal between Elite fights.
- Realm 3 natives: each country (not the Moon) has 3 one-element creatures (`CREATURES`, `R3_NATIVE` in engine.js, 16x16 sprites `cr_*` in bossart3.js); about half of ordinary foes are natives (`NATIVE_RATE`), hyenas/penguins come in packs, natives never fuse.
- Realm 3 boss tricks: `rang` (boomerang returns at round end), `rainbow` (move cycles elements), `abduct` (target can't act or be hit), `decree` (Executive Order), `fizzle` (move may fail), `heat` (Sun burns your side more each round), `art`/`small` (sidekick art size).
- Bulwark: slowest class (SPE 2.5, HP 72), tank with real damage; aim to keep it about +0.3 worlds above average (`ONLY=_bulwark node tools/sim.js 300 combo`). `bulk` moves (Hammer Down, Shield Slam) use DEF for part of their power; Earthbreaker's area stun is tiny (plus some paralysis). It's the passive-heavy class: a unique element+Bulwark passive at Lv17 (`COMBO_PMOVES`) and Last Stand at Lv38 (`CLASS_EXTRA_PMOVES`), on top of the Lv25 class and Lv45 element passives.
- Warlock (internal id `sorcerer`, shown as Warlock): STA 50, spells cost 20-50, free Eldritch Blast basic (`blast:true`, own element, 30% STA charge; 2 beams at Lv20, 3 at Lv40 via `blastOf`/`effMove`). Invocations are move-slot passives built with `INV(id,n,d,inv)` whose `inv` flags merge into the blast (`powMul` scales it): class ones (Agonizing, Repelling, Eldritch Spear) plus one per element in its combo kit (Lv8). Hex (`hex` status): target takes +25% damage from everything for 3 rounds. A fusion with a Warlock always keeps Eldritch Blast; fused starters pick which parent's basic hit to keep (`choice.fzb`, `fuseSlimes(a,b,order)`). Class average about 5.7 worlds (`R=1 SB=1.2`, mid-pack).
- Team heals use heal POW (`healPow` on ally/allies moves): heals POW x healer OFF / 55 (`HEAL_DIV`, `healAmt`), i.e. what an attack of that POW deals to an average-defense target; no defense or target HP involved. Converted from the old % at x260. Cards show `heal POW X (~Y HP)`. Self-heals and boss/creature heals keep `healPct` (% of max HP); regen, revives and `teamHeal` riders are unchanged. Healer passive: heals 25% stronger. Clerics have low OFF (9.3) and higher-POW attacks to compensate.
- Sim bot values passive moves (`moveValue` 70), so it learns them like a player would.
- Soft defense: in calcDmg the raw DEF/SpD stat counts as DEF^0.7 against an average DEF for that level (`DEF_EXP` 0.7, `DEF_REF` 11 x level mult); armor/Bedrock/stages still apply in full. Tanks take ~78% of average damage (not ~70%), glass cannons ~127% (not ~140%).
- Bosses resist debuffs: each lowered stat stage is 20% on a boss instead of 25% (`BOSS_DEBUFF_STEP`; floor 40% instead of 25%). Sidekicks take full debuffs. Pass the unit to `stMul(stage, unit)`.
- Stuns: land at 1.5x a move's listed chance (`STUN_MULT`, descriptions show the boosted %); a unit that loses a turn to a stun is Dazed and can't be stunned again until it gets a turn.
- + statuses (move flags `burnP`, `poisonP`, `paraP`, `blindP`, `confuseP`, `stunP`): burn+/poison+ 12% a turn (normal 8%), para+ 50% skip (30%), blind+ 55% miss (35%), confuse+ 60% self-hit (40%), stun+ skips 2 turns (very rare: risky moves and bosses). Regen+ = regen of 15%+ a turn. Mostly on boss signature moves plus a few player moves.
- Boss sidekicks (`side()`) get `SIDE_HP` 1.4x HP (not damage) so bosses can play off them.
- Move upgrades (`boostMove` / `boostPlan`) are deterministic per move, picked from its role: damage moves +POW (+5% to any status chance), weak status-built hits +10% chance (+5 POW), pure status moves +10% chance (guaranteed status -> its + version, never stun+), pure debuffs +1 stage, support moves their main effect (heal/shield/regen/STA given grow x1.25 each upgrade; revive +10%, OFF +1 stage), bombs/counters +10 power, else -5 STA. `FULL_BOOST` moves (Dissonance, Fire Bard's Firebrand Anthem / Fan the Flames / Bonfire Song) keep the all-in-one upgrade.
- Ultra forms: rare map tile (`ULTRA_ODDS` 0.5% per tile; `ensureUltra` guarantees one by World 7, tracked in `G.ultraSeen`). One slime becomes Ultra for the run: +25% HP/OFF/DEF/SpD/SPE (`makeUltra`), gold-trimmed gear + baked elemental aura (`ultraURL`, CSS `ultraglow`), and a hand-made perk per element+class (`ULTRA_PERKS`, 72; hooks ultraStart/ultraRound/ultraHit/ultraHurt/ultraKill/ultraDmgMul). Fused slimes pick one parent's perk (`ultraChoices`). Sim routes to a crystal when a map has one (`NOULTRA=1` to disable).
- Realm 4 target: clearable by a 3-star team or a 4-star carry (sim: `R=3 SB=1.3 NOULTRA=1 node tools/sim.js 300 mixed` about 25% clear). Neptune (world 8): the Dwarf Planet (boss tile `gi` 0, no award) then Mother Earth (`gi` 1, `R4_FINALE`, realm clear) back to back. All Realm 4 bosses are humanoid.
- Realm targets are measured without Ultra (`NOULTRA=1`); a found Ultra slime raises clear rates well above them.
- Stars: 10 points per star per slime, +1 star per realm cleared, max 10 points in one stat; a slime's own points spend first, shared pool last (refunded first).
- Fusion (Realm 2+, starters after clearing Realm 2): multiclass with both elements and classes, averaged stats, random base parent gives moves, the other parent's moves are offered to learn. Pocket holds one slime essence for fusing.
