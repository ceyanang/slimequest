/* ================= sound (synthesized, no files) ================= */
const SFX = (() => {
  let ctx = null, muted = false;
  try { muted = localStorage.getItem('sq-muted') === '1'; } catch (e) {}
  function ac() {
    if (typeof window === 'undefined') return null;
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  function tone(freq, dur, type = 'square', vol = 0.07, slide = 0, delay = 0) {
    const c = ac(); if (!c || muted) return;
    const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  let nbuf = null;
  function noise(dur, vol = 0.1, freq = 1200, delay = 0, q = 1) {
    const c = ac(); if (!c || muted) return;
    if (!nbuf) { nbuf = c.createBuffer(1, c.sampleRate, c.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const t = c.currentTime + delay, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = nbuf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(c.destination); src.start(t, Math.random() * 0.5); src.stop(t + dur);
  }
  const lib = {
    select:   () => tone(880, 0.05, 'square', 0.035),
    hit:      () => { noise(0.12, 0.2, 900); tone(170, 0.12, 'square', 0.06, 0.5); },
    crit:     () => { noise(0.16, 0.25, 1500); tone(230, 0.1, 'square', 0.07, 0.4); tone(1320, 0.08, 'square', 0.05, 1, 0.06); },
    super:    () => { tone(523, 0.07, 'square', 0.05, 1, 0.05); tone(784, 0.1, 'square', 0.05, 1, 0.12); },
    weak:     () => tone(140, 0.16, 'triangle', 0.08, 0.7),
    fire:     () => { noise(0.28, 0.12, 2600, 0, 0.6); noise(0.22, 0.09, 600, 0.05); },
    water:    () => { tone(950, 0.18, 'sine', 0.1, 0.35); tone(620, 0.12, 'sine', 0.06, 0.5, 0.08); },
    life:     () => { tone(660, 0.06, 'triangle', 0.06); tone(880, 0.06, 'triangle', 0.06, 1, 0.06); tone(990, 0.08, 'triangle', 0.05, 1, 0.12); },
    neutral:  () => noise(0.08, 0.12, 3200),
    earth:    () => { noise(0.22, 0.22, 240); tone(90, 0.2, 'square', 0.06, 0.6); },
    lightning:() => { tone(1800, 0.05, 'sawtooth', 0.05, 0.3); noise(0.12, 0.13, 4200, 0.03); tone(1500, 0.05, 'sawtooth', 0.04, 0.3, 0.08); },
    light:    () => { tone(1046, 0.12, 'sine', 0.06); tone(1568, 0.16, 'sine', 0.05, 1, 0.05); },
    dark:     () => { tone(110, 0.28, 'sawtooth', 0.05, 0.6); noise(0.2, 0.06, 300); },
    psychic:  () => { tone(500, 0.28, 'sine', 0.06, 2); tone(507, 0.28, 'sine', 0.05, 2); },
    heal:     () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.09, 'triangle', 0.06, 1, i * 0.06)),
    shield:   () => { tone(700, 0.22, 'sine', 0.07, 1.4); tone(1050, 0.22, 'sine', 0.04, 1.4, 0.03); },
    buff:     () => [392, 523, 659, 784].forEach((f, i) => tone(f, 0.07, 'square', 0.045, 1, i * 0.05)),
    status:   () => tone(300, 0.22, 'triangle', 0.06, 1.6),
    ko:       () => { tone(440, 0.35, 'square', 0.06, 0.25); noise(0.2, 0.1, 500, 0.05); },
    rest:     () => { tone(330, 0.25, 'triangle', 0.05, 0.8); tone(262, 0.3, 'triangle', 0.04, 0.8, 0.15); },
    win:      () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, 0.13, 'square', 0.055, 1, i * 0.1)),
    lose:     () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.22, 'triangle', 0.08, 1, i * 0.18)),
    level:    () => [659, 784, 988, 1318].forEach((f, i) => tone(f, 0.08, 'square', 0.045, 1, i * 0.07)),
    map:      () => { tone(523, 0.06, 'square', 0.04); tone(659, 0.08, 'square', 0.04, 1, 0.06); }
  };
  return {
    play: k => { if (lib[k]) try { lib[k](); } catch (e) {} },
    unlock: () => ac(),
    ctx: () => ac(),
    toggle: () => { muted = !muted; try { localStorage.setItem('sq-muted', muted ? '1' : '0'); } catch (e) {} return muted; },
    get muted() { return muted; }
  };
})();


/* ================= music (chiptune sequencer) ================= */
const TRACKS = {
  map: { bpm:112, lead:'square', bass:'triangle',
    lead_: 'C5 E5 G5 E5 F5 A5 G5 . E5 G5 C6 G5 A5 G5 E5 . D5 F5 A5 F5 G5 F5 E5 D5 C5 E5 G5 E5 C5 . . . ' +
           'A4 C5 E5 C5 F5 E5 D5 C5 B4 D5 G5 D5 E5 D5 C5 B4 A4 C5 E5 A5 G5 E5 D5 C5 D5 . G4 . C5 . . .',
    bass_: 'C3 . G2 . C3 . G2 . F2 . C3 . F2 . C3 . G2 . D3 . G2 . D3 . C3 . G2 . C3 . . . ' +
           'A2 . E3 . A2 . E3 . G2 . D3 . G2 . D3 . F2 . C3 . F2 . C3 . G2 . D3 . G2 . B2 .',
    drum: 'k.h.s.h.k.h.s.h.k.h.s.h.k.h.shhh' },
  battle: { bpm:150, lead:'square', bass:'triangle',
    lead_: 'A4 . C5 E5 A5 . G5 E5 F5 . E5 D5 C5 . B4 . A4 . C5 E5 A5 . B5 C6 B5 . G5 . E5 . . . ' +
           'F5 . E5 D5 C5 . D5 E5 D5 . C5 B4 A4 . G#4 . A4 . E5 . A5 . E5 . F5 E5 D5 C5 B4 . G#4 .',
    bass_: 'A2 A2 A3 A2 A2 A2 A3 A2 F2 F2 F3 F2 F2 F2 F3 F2 C3 C3 C4 C3 C3 C3 C4 C3 G2 G2 G3 G2 G2 G2 G3 G2 ' +
           'D3 D3 D4 D3 D3 D3 D4 D3 A2 A2 A3 A2 A2 A2 A3 A2 F2 F2 F3 F2 F2 F2 F3 F2 E2 E2 E3 E2 E2 E2 E3 E2',
    drum: 'k.h.s.h.kkh.s.h.' },
  boss: { bpm:168, lead:'sawtooth', bass:'square',
    lead_: 'D5 . D5 F5 A5 . G5 F5 E5 . C5 . D5 . . . D5 . D5 F5 A5 . C6 A5 Bb5 . A5 G5 A5 . . . ' +
           'G5 . F5 E5 F5 . E5 D5 C#5 . E5 . A4 . . . Bb4 . D5 F5 Bb5 . A5 G5 A5 . C#5 . E5 . A5 .',
    bass_: 'D2 D3 D2 D3 D2 D3 D2 D3 Bb1 Bb2 Bb1 Bb2 C2 C3 C2 C3 D2 D3 D2 D3 D2 D3 D2 D3 Bb1 Bb2 Bb1 Bb2 A1 A2 A1 A2 ' +
           'G1 G2 G1 G2 G1 G2 A1 A2 Bb1 Bb2 Bb1 Bb2 A1 A2 A1 A2 G1 G2 G1 G2 Bb1 Bb2 C2 C3 A1 A2 A1 A2 A1 A2 C#2 C#3',
    drum: 'k.hsk.hskkhsk.hs' }
};
const WORLD_KEY = [0, 2, -3, -5, 1, 0, 4, 7]; // map theme shifts key each world
const NOTE_IDX = { C:0, 'C#':1, Db:1, D:2, 'D#':3, Eb:3, E:4, F:5, 'F#':6, Gb:6, G:7, 'G#':8, Ab:8, A:9, 'A#':10, Bb:10, B:11 };
function noteFreq(n, tr) {
  const m = /^([A-G][#b]?)(\d)$/.exec(n); if (!m) return 0;
  return 440 * Math.pow(2, (12 * (+m[2] + 1) + NOTE_IDX[m[1]] + tr - 69) / 12);
}
Object.values(TRACKS).forEach(t => { t.L = t.lead_.trim().split(/\s+/); t.Bs = t.bass_.trim().split(/\s+/); });

const MUSIC = (() => {
  let master = null, timer = null, cur = null, tr = 0, step = 0, nextT = 0, muted = false, ctx = null;
  try { muted = localStorage.getItem('sq-music') === '0'; } catch (e) {}
  function ensure() {
    ctx = SFX.ctx(); if (!ctx) return false;
    if (!master) { master = ctx.createGain(); master.gain.value = muted ? 0 : 0.55; master.connect(ctx.destination); }
    return true;
  }
  function voice(freq, t, dur, type, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.setValueAtTime(vol, t + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  let nb = null;
  function drum(kind, t) {
    if (kind === 'k') {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
      g.gain.setValueAtTime(0.22, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      o.connect(g).connect(master); o.start(t); o.stop(t + 0.15); return;
    }
    if (!nb) { nb = ctx.createBuffer(1, ctx.sampleRate / 2, ctx.sampleRate); const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), dur = kind === 's' ? 0.12 : 0.04;
    s.buffer = nb; f.type = kind === 's' ? 'bandpass' : 'highpass'; f.frequency.value = kind === 's' ? 1800 : 7000;
    g.gain.setValueAtTime(kind === 's' ? 0.12 : 0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + dur);
  }
  function tick() {
    if (!cur || !ensure() || ctx.state !== 'running') return;
    const T = TRACKS[cur], sd = 60 / T.bpm / 2;
    if (nextT < ctx.currentTime) nextT = ctx.currentTime + 0.05;
    while (nextT < ctx.currentTime + 0.2) {
      const ln = T.L[step % T.L.length], bn = T.Bs[step % T.Bs.length], dn = T.drum[step % T.drum.length];
      if (ln !== '.') voice(noteFreq(ln, tr), nextT, sd * 0.95, T.lead, 0.045);
      if (bn !== '.') voice(noteFreq(bn, tr), nextT, sd * 0.9, T.bass, 0.07);
      if (dn !== '.') drum(dn, nextT);
      nextT += sd; step = (step + 1) % (T.L.length * 4);
    }
  }
  return {
    play(name, transpose = 0) {
      if (cur === name && tr === transpose) return;
      cur = name; tr = transpose; step = 0; nextT = 0;
      if (!timer && typeof setInterval !== 'undefined' && typeof window !== 'undefined') timer = setInterval(tick, 50);
    },
    stop() { cur = null; },
    toggle() { muted = !muted; try { localStorage.setItem('sq-music', muted ? '0' : '1'); } catch (e) {} if (ensure()) master.gain.value = muted ? 0 : 0.55; return muted; },
    get muted() { return muted; }
  };
})();

