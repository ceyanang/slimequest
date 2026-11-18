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
- `src/bossart.js`: Realm 2 boss art (base64 PNG). `src/bossart3.js`: Realm 3 boss art (source PNGs in `art/realm3/`).

## Systems in short
- Realms: Realm 1 (Classic Quest), Realm 2 (Genre Hop, unlocked by clearing Realm 1; +50% enemy HP, +30% OFF), Realm 3 (World Domination, unlocked by clearing Realm 2; +60% HP, +35% OFF).
- Realm 3 target: clearable by a 2-star team or a 3-star carry (sim: `R=2 SB=1.2 node tools/sim.js 300 mixed` about 25% clear, same as Realm 2 at 2 stars).
- The Moon (Realm 3 world 8): full heal on arrival, Elite 4 back to back (tiles carry `gi` 0-3), one camp, then the Sun (gi 4). Only the usual after-fight revive/15% heal between Elite fights.
- Realm 3 natives: each country (not the Moon) has 3 one-element creatures (`CREATURES`, `R3_NATIVE` in engine.js, 16x16 sprites `cr_*` in bossart3.js); about half of ordinary foes are natives (`NATIVE_RATE`), hyenas/penguins come in packs, natives never fuse.
- Realm 3 boss tricks: `rang` (boomerang returns at round end), `rainbow` (move cycles elements), `abduct` (target can't act or be hit), `decree` (Executive Order), `fizzle` (move may fail), `heat` (Sun burns your side more each round), `art`/`small` (sidekick art size).
- Bulwark: slowest class (SPE 2.5, HP 72), tank with real damage; aim to keep it about +0.3 worlds above average (`ONLY=_bulwark node tools/sim.js 300 combo`). `bulk` moves (Hammer Down, Shield Slam) use DEF for part of their power; Earthbreaker's area stun is tiny (plus some paralysis). It's the passive-heavy class: a unique element+Bulwark passive at Lv17 (`COMBO_PMOVES`) and Last Stand at Lv38 (`CLASS_EXTRA_PMOVES`), on top of the Lv25 class and Lv45 element passives.
- Sim bot values passive moves (`moveValue` 70), so it learns them like a player would.
- Bosses resist debuffs: each lowered stat stage is 20% on a boss instead of 25% (`BOSS_DEBUFF_STEP`; floor 40% instead of 25%). Sidekicks take full debuffs. Pass the unit to `stMul(stage, unit)`.
- Stuns: land at 1.5x a move's listed chance (`STUN_MULT`, descriptions show the boosted %); a unit that loses a turn to a stun is Dazed and can't be stunned again until it gets a turn.
- Stars: 10 points per star per slime, +1 star per realm cleared, max 10 points in one stat; a slime's own points spend first, shared pool last (refunded first).
- Fusion (Realm 2+, starters after clearing Realm 2): multiclass with both elements and classes, averaged stats, random base parent gives moves, the other parent's moves are offered to learn. Pocket holds one slime essence for fusing.
