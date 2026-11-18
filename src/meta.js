/* ================= progress: stars, milestones, saved run ================= */
// Stars are earned per element+class combo. Each combo can hold STAR_STEP points per unlocked star, up to 10 in any one stat.
// Points come from one-time milestones (own points) and from first-time boss kills (a shared pool you spend on any combo).
const REALMS = 3;                       // realms that exist so far; each first-time realm clear unlocks one more star
const MILESTONES = [                    // boss kills that credit every combo in your party, once each
  { w:2, pts:2, label:'World 3 boss' }, { w:4, pts:3, label:'World 5 boss' }, { w:7, pts:5, label:'Clear the realm' }];
const comboKey = (el, cls) => el + '_' + cls;

let META = { firstBoss:{}, combos:{}, stars:{}, shared:{}, cleared:[] };
let SAVED = null;                       // one saved run (consumed when you resume it)
let STAMP = 0;                          // last time progress changed (newest copy wins between this browser and the cloud copy)

/* ---- storage: the browser first (instant), mirrored to the artifact's private per-person database when it's there ---- */
const SK = 'slimequest_progress_v1';
const memStore = {};
function lsRead() { try { return window.localStorage.getItem(SK); } catch (e) { return memStore[SK] || null; } }
function lsWrite(s) { try { window.localStorage.setItem(SK, s); } catch (e) { memStore[SK] = s; } }
function adopt(d) { META = { firstBoss:{}, combos:{}, stars:{}, shared:{}, cleared:[], ...(d.meta || {}) }; SAVED = d.run || null; STAMP = d.t || 0; }
function loadProgress() { try { const s = lsRead(); if (s) adopt(JSON.parse(s)); } catch (e) { /* start fresh */ } }
const allData = () => ({ t:STAMP, meta:META, run:SAVED });
let cloudDoc = null, cloudBusy = false, cloudTimer = null;
function persist() {
  STAMP = Date.now();
  lsWrite(JSON.stringify(allData()));
  if (!cloudDoc) return;
  clearTimeout(cloudTimer); cloudTimer = setTimeout(flushCloud, 900);
}
async function flushCloud() {
  if (cloudBusy || !cloudDoc) return;
  cloudBusy = true;
  try { await cloudDoc.set(JSON.parse(JSON.stringify(allData()))); } catch (e) { /* best effort */ }
  cloudBusy = false;
}
async function cloudInit() {
  try {
    const c = window.claude; if (!c || !c.use) return;
    const [db, user] = await Promise.all([c.use('db'), c.use('user')]);
    if (!db || !user) return;
    const id = await user.id(); if (!id) return;
    const ref = db.doc('data/users/' + id + '/profile');
    const snap = await ref.get();
    cloudDoc = ref;
    const d = snap.exists ? snap.data() : null;
    if (d && (d.t || 0) > STAMP) { adopt(d); lsWrite(JSON.stringify(allData())); if (TITLE_UP) renderPick(); }
    else if (STAMP) flushCloud();
  } catch (e) { /* offline or signed out: the browser copy still works */ }
}

/* ---- stars ---- */
const starPts = (el, cls, k) => ((META.stars[comboKey(el, cls)] || {})[k]) || 0;
// Milestones count once per realm (Realm 1 keys are 0,1,2; Realm 2 keys are r2_0, r2_1, r2_2).
const comboPts = key => { const t = (META.combos[key] && META.combos[key].tiers) || {}; let s = 0; for (let r = 0; r < REALMS; r++) MILESTONES.forEach((m, i) => { if (t[r ? `r${r + 1}_${i}` : i]) s += m.pts; }); return s; };
const starAlloc = key => STAT_KEYS.reduce((s, k) => s + (((META.stars[key] || {})[k]) || 0), 0);
// One star (10 points) per slime to start, plus one more for each realm cleared; any single stat still tops out at 10.
const starsUnlocked = () => 1 + Math.min(META.cleared.length, REALMS);
const starCap = () => STAR_STEP * starsUnlocked();
const sharedTotal = () => Object.keys(META.firstBoss).length;
// Shared (universal) points are spent first and refunded first; a slime's own points only cover what the pool can't.
const sharedOf = key => Math.min(starAlloc(key), META.shared[key] !== undefined ? META.shared[key] : Math.max(0, starAlloc(key) - comboPts(key)));
const sharedUsed = () => Object.keys(META.stars).reduce((s, key) => s + sharedOf(key), 0);
const ownLeft = key => Math.max(0, comboPts(key) - (starAlloc(key) - sharedOf(key)));
const sharedAvail = () => sharedTotal() - sharedUsed();
// Points this combo could still take right now (own points first, then the shared pool), within its cap.
function starRoom(key) { return Math.max(0, Math.min(starCap() - starAlloc(key), ownLeft(key) + Math.max(0, sharedAvail()))); }
function canAddStar(key, k) { return starRoom(key) > 0 && (((META.stars[key] || {})[k]) || 0) < STAR_STAT_MAX; }
function changeStar(key, k, d) {
  const s = META.stars[key] = META.stars[key] || {};
  const cur = s[k] || 0;
  if (d > 0 && !canAddStar(key, k)) return false;
  if (d < 0 && cur <= 0) return false;
  const sh = sharedOf(key);
  // A slime's own points are spent first; the shared pool only covers what they can't, and is refunded first.
  if (d > 0) { if (ownLeft(key) <= 0) META.shared[key] = sh + 1; }
  else META.shared[key] = Math.max(0, sh - 1);
  s[k] = cur + d; if (!s[k]) delete s[k];
  persist(); return true;
}

/* ---- awards: called when a boss falls ---- */
function awardBoss(w, team) {
  const out = { shared:0, combos:[], realm:false };
  const fk = (REALM + 1) + ':' + w;
  if (!META.firstBoss[fk]) { META.firstBoss[fk] = 1; out.shared = 1; }
  const seen = new Set();
  team.forEach(p => {
    // A fused slime earns milestone points for both of its parent combos.
    (p.parents ? p.parents.map(([e, c]) => comboKey(e, c)) : [comboKey(p.el, p.cls)]).forEach(key => {
      if (seen.has(key)) return; seen.add(key);
      const c = META.combos[key] = META.combos[key] || { tiers:{} };
      MILESTONES.forEach((m, i) => { const tk = REALM ? `r${REALM + 1}_${i}` : i; if (m.w === w && !c.tiers[tk]) { c.tiers[tk] = 1; out.combos.push({ name:p.name, pts:m.pts, label:m.label }); } });
    });
  });
  if (w === WORLDS.length - 1 && !META.cleared.includes(REALM + 1)) { META.cleared.push(REALM + 1); out.realm = REALM + 1; }
  persist();
  return out;
}

/* ---- save / resume a run (saved from the map, so no battle is mid-flight) ---- */
const clean = p => JSON.parse(JSON.stringify(p, (k, v) => (k === 'guardBy' || k === 'bomb' || k === 'counter' || k === 'teamRef' || k === 'phase') ? undefined : v));
function snapshotRun() {
  const map = G.map.map(row => row.map(n => { const o = {}; for (const k in n) if (k !== 'next') o[k] = n[k]; o.next = n.next.map(m => [m.f, m.c]); return clean(o); }));
  return { realm:REALM, w:G.w, party:party.map(clean), bag:G.bag.slice(), essence:G.essence ? clean(G.essence) : null, map, pos:G.pos ? [G.pos.f, G.pos.c] : null, node:G.node ? [G.node.f, G.node.c] : null, fast:!!G.fast, auto:!!G.auto, quick:!!G.quick, ultraSeen:!!G.ultraSeen };
}
function restoreRun(s) {
  setRealm(s.realm || 0);
  const map = s.map.map(row => row.map(o => ({ ...o, next:[] })));
  s.map.forEach((row, f) => row.forEach((o, c) => { map[f][c].next = o.next.map(([f2, c2]) => map[f2][c2]); }));
  party = s.party.map(p => { resetStatus(p); return p; });
  G = { w:s.w, map, pos:s.pos ? map[s.pos[0]][s.pos[1]] : null, node:s.node ? map[s.node[0]][s.node[1]] : null, learnQ:[], auto:false, fast:s.fast, auto:!!s.auto, quick:!!s.quick, ultraSeen:!!s.ultraSeen, bag:s.bag.slice(), essence:s.essence || null };
}
