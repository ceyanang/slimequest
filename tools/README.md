# Test tools (Node.js)

Build first: `sh build.sh` (writes index.html).

- `node tools/smoke.js` - opens the game in headless Chrome (needs `npm i playwright`) and runs ~200 battles. Should print `errors []`.
  Set `CHROME=/path/to/chrome` if Playwright's own browser isn't installed.
- `node tools/sim.js 400 starter` - solo starter that recruits along the way (SB boosts only the starter: a carry).
- `node tools/sim.js 400 mixed` - bot plays 400 full runs with random 3-slime parties and prints win impact per element and class
  ("effect/member" = extra worlds reached per party member of that type; differences under about 0.2 are noise).
  Env: `R=1` plays Realm 2, `R=2` Realm 3 (Moon gauntlet included), `SBS=1.3,1,1` sets the boost per party slot (e.g. a 3-star carry), `SB=1.25` multiplies starting stats (rough stand-in for star boosts).
