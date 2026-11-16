# Slime Quest - notes for Claude

Mobile-first pixel-art roguelike. Single-file HTML game, published as a Claude artifact.

## Build & test
- Source lives in `shell.html` (HTML/CSS), `sprites.js` (pixel sprites), `src/*.js`. **Never edit index.html directly**: run `sh build.sh` to rebuild it (order of files matters, see build.sh).
- After changes: `sh build.sh`, then `node tools/smoke.js` (expect `errors []`). For balance: `node tools/sim.js 400 mixed` (run 3x and average; noise is about +/-0.2).
- Test at phone size (390x844).

## Owner preferences
- The owner's "1" key is broken: they write "one" ("one.2" = 1.2). Typos are common; flag ambiguous requests briefly instead of guessing silently.
- After each change, say what changed in a few sentences.

## Design rules
- Every element+class combo moveset should have its own niche. No element-only moves.
- No strictly-better moves unless they have a real downside.
- Passive / stat percentage boosts use 25% steps (shields are exempt).
- Don't rebalance speed moves for now.
- Dual/multi-element units MULTIPLY type multipliers (x1.5 * x0.67 = neutral).

## Map of the code
- `src/data.js`: elements (EL_STATS, type chart CYC/SPC, effMult/effVs), classes, moves & learnsets, passives (PASSIVES, CLASS_PMOVES Lv25, ELEM_PMOVES Lv45), worlds per realm (REALM_WORLDS, REALM_DEF difficulty), boss story text.
- `src/engine.js`: units, damage (calcDmg), act/endRound, AI (scoreMove, planFor with 1-round lookahead), enemies, Realm 1 bosses (BOSSES) and Realm 2 bosses (BOSSES2), fusion (fuseSlimes, multiclass names MULTICLASS, element names ELEMENT_COMBO), map generation.
- `src/meta.js`: saved progress (stars, shared points, realm clears), save/resume run.
- `src/ui.js`: every screen (starter pick, map, battle, recruit, shrine, bag/pocket, inspect popup).
- `src/bossart.js`: Realm 2 boss art (base64 PNG).

## Systems in short
- Realms: Realm 1 (Classic Quest), Realm 2 (Genre Hop, unlocked by clearing Realm 1; +50% enemy HP, +30% OFF).
- Stars: 10 points per star per slime, +1 star per realm cleared, max 10 points in one stat; a slime's own points spend first, shared pool last (refunded first).
- Fusion (Realm 2+, starters after clearing Realm 2): multiclass with both elements and classes, averaged stats, random base parent gives moves, the other parent's moves are offered to learn. Pocket holds one slime essence for fusing.
