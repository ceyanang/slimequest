/* ================= attack animations =================
   Every move gets an effect that fits its name: slashes for blades, arrows that fly, bolts from the sky,
   rocks that fall, notes for songs, and so on. Drawn as chunky pixels on an overlay canvas. */
const ANIM = (() => {
  const PX = 3;                       // one "pixel" = 3 screen px, to match the pixel art
  let cv = null, g = null, parts = [], running = false;
  const EC = {                        // element palettes: [main, light, dark]
    fire:['#ff6b35', '#ffd23f', '#c1121f'], water:['#4cc9f0', '#caf0f8', '#1d6fa3'], life:['#7cd67c', '#d8f3a0', '#2d6a4f'],
    lightning:['#ffe94a', '#ffffff', '#c9a227'], earth:['#a0763c', '#d9b77a', '#5c3d1e'], light:['#fff3b0', '#ffffff', '#f4c430'],
    dark:['#6c4a8c', '#b892d6', '#1b1028'], psychic:['#ff7ad9', '#ffd6f5', '#9d4edd'], neutral:['#e8e8f0', '#ffffff', '#8a8aa0']
  };
  function ensure() {
    if (cv && document.body.contains(cv)) return;
    cv = document.createElement('canvas'); cv.className = 'anim-layer';
    document.body.appendChild(cv); g = cv.getContext('2d');
    resize(); window.addEventListener('resize', resize);
  }
  function resize() { if (!cv) return; cv.width = Math.ceil(innerWidth / PX); cv.height = Math.ceil(innerHeight / PX); g.imageSmoothingEnabled = false; }
  // Card center in canvas pixels.
  function pos(u, dy = 0) {
    const c = typeof cardOf === 'function' && cardOf(u); if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x:(r.left + r.width / 2) / PX, y:(r.top + r.height * 0.38) / PX + dy, w:r.width / PX, h:r.height / PX, card:c };
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  // Particle: { x, y, vx, vy, life, max, c, s, g(gravity), delay, draw? }
  const add = p => parts.push({ vx:0, vy:0, s:1, gr:0, delay:0, fade:true, ...p, max:p.life });
  function loop() {
    g.clearRect(0, 0, cv.width, cv.height);
    parts = parts.filter(p => p.life > 0);
    for (const p of parts) {
      if (p.delay > 0) { p.delay -= 16; continue; }
      p.life -= 16; p.x += p.vx; p.y += p.vy; p.vy += p.gr;
      g.globalAlpha = p.fade ? Math.max(0, Math.min(1, p.life / p.max * 1.6)) : 1;
      if (p.draw) p.draw(g, p); else { g.fillStyle = p.c; g.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s); }
    }
    g.globalAlpha = 1;
    if (parts.length) requestAnimationFrame(loop); else running = false;
  }
  function go() { if (!running) { running = true; requestAnimationFrame(loop); } }
  const line = (x0, y0, x1, y1, c, s = 1, life = 260, delay = 0) => {
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0)));
    for (let i = 0; i <= n; i += 1) add({ x:x0 + (x1 - x0) * i / n, y:y0 + (y1 - y0) * i / n, c, s, life, delay:delay + i * 3 });
  };
  const shake = (card, ms = 280) => { if (!card) return; card.classList.remove('anim-shake'); void card.offsetWidth; card.classList.add('anim-shake'); setTimeout(() => card.classList.remove('anim-shake'), ms); };
  const flash = (card, col) => { if (!card) return; card.style.setProperty('--fl', col); card.classList.remove('anim-flash'); void card.offsetWidth; card.classList.add('anim-flash'); };

  /* ---------- effect pieces ---------- */
  const FX = {
    slash(t, C, d = 0, flip = false) {          // a blade arc across the target
      const s = flip ? -1 : 1;
      for (let k = 0; k < 3; k++) for (let i = -9; i <= 9; i++) {
        const x = t.x + i * s * 1.1, y = t.y + i * 0.9 - (i * i) / 14 + k - 1;
        add({ x, y, c:k === 1 ? '#ffffff' : C[0], s:k === 1 ? 2 : 1, life:220, delay:d + (i + 9) * 6 });
      }
      for (let i = 0; i < 6; i++) add({ x:t.x, y:t.y, vx:rnd(-1.2, 1.2), vy:rnd(-1.2, 0.6), c:C[1], life:260, delay:d + 100 });
    },
    impact(t, C, d = 0, big = false) {          // a heavy blow: square shockwave + debris + shake
      const R = big ? 14 : 10;
      for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2;
        add({ x:t.x, y:t.y, vx:Math.cos(a) * R / 9, vy:Math.sin(a) * R / 9, c:i % 2 ? '#ffffff' : C[0], s:2, life:240, delay:d }); }
      for (let i = 0; i < 10; i++) add({ x:t.x + rnd(-3, 3), y:t.y, vx:rnd(-1.5, 1.5), vy:rnd(-2.2, -0.6), gr:0.12, c:C[2], s:2, life:420, delay:d + 40 });
      setTimeout(() => shake(t.card, big ? 420 : 280), d + 60);
    },
    arrow(a, t, C, d = 0) {                     // an arrow sprite flying in an arc
      const n = 18, dx = t.x - a.x, dy = t.y - a.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
      for (let i = 0; i <= n; i++) { const f = i / n, x = a.x + dx * f, y = a.y + dy * f - Math.sin(f * Math.PI) * 8;
        add({ x, y, c:C[0], life:48, delay:d + i * 16, fade:false, draw:(g, p) => {
          const X = Math.round(p.x), Y = Math.round(p.y);
          for (let k = 0; k < 8; k++) { g.fillStyle = k < 2 ? '#ffffff' : '#c8a060'; g.fillRect(Math.round(X - ux * k), Math.round(Y - uy * k), 1, 1); }
          g.fillStyle = p.c; g.fillRect(Math.round(X - ux * 8) - 1, Math.round(Y - uy * 8) - 1, 2, 2); g.fillRect(X - 1, Y - 1, 3, 3); } });
        add({ x:x - ux * 9, y:y - uy * 9, c:C[1], life:160, delay:d + i * 16 }); }
      FX.spark(t, C, d + n * 16, 12); setTimeout(() => shake(t.card, 200), d + n * 16);
    },
    orb(a, t, C, d = 0, size = 3) {             // a glowing ball of energy with a trail, then a burst
      const n = 16;
      for (let i = 0; i <= n; i++) { const f = i / n, x = a.x + (t.x - a.x) * f, y = a.y + (t.y - a.y) * f;
        add({ x:x - size / 2, y:y - size / 2, c:C[1], s:size, life:50, delay:d + i * 13, fade:false });
        add({ x:x - size / 2 - 1, y:y - size / 2 - 1, c:C[0], s:size + 2, life:40, delay:d + i * 13, fade:false });
        for (let k = 0; k < 2; k++) add({ x:x + rnd(-2, 2), y:y + rnd(-2, 2), vx:rnd(-0.3, 0.3), vy:rnd(-0.3, 0.3), c:C[k], life:200, delay:d + i * 13 }); }
      FX.burstRing(t, C, d + n * 13, 18);
    },
    burstRing(t, C, d = 0, n = 16) {
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, v = rnd(0.8, 1.8);
        add({ x:t.x, y:t.y, vx:Math.cos(a) * v, vy:Math.sin(a) * v, c:C[i % 3], s:2, life:300, delay:d }); }
    },
    spark(t, C, d = 0, n = 10) { for (let i = 0; i < n; i++) add({ x:t.x, y:t.y, vx:rnd(-1.6, 1.6), vy:rnd(-1.6, 1.6), c:C[i % 2], life:220, delay:d }); },
    bolt(t, C, d = 0) {                         // lightning from the sky, flickering
      for (let f = 0; f < 3; f++) { let x = t.x + rnd(-6, 6), y = t.y - 60;
        while (y < t.y) { const nx = x + rnd(-4, 4), ny = y + rnd(4, 8); line(x, y, nx, Math.min(ny, t.y), f === 1 ? '#ffffff' : C[0], f === 1 ? 2 : 1, 120, d + f * 70); x = nx; y = ny; } }
      FX.spark(t, C, d + 120, 12); setTimeout(() => flash(t.card, C[0]), d + 100);
    },
    flames(t, C, d = 0, n = 26) {               // fire licking up from below
      for (let i = 0; i < n; i++) add({ x:t.x + rnd(-t.w / 3, t.w / 3), y:t.y + 8, vx:rnd(-0.2, 0.2), vy:rnd(-1.4, -0.6), c:C[i % 3], s:i % 4 ? 1 : 2, life:rnd(250, 500), delay:d + rnd(0, 200) });
    },
    wave(t, C, d = 0) {                         // a wave washing over sideways
      for (let k = 0; k < 3; k++) for (let i = 0; i < 30; i++) { const x = t.x - t.w / 2 + i * t.w / 30;
        add({ x, y:t.y + 6 - Math.sin(i / 3 + k) * 4 - k * 3, vy:-0.2, c:C[k % 3], s:2, life:260, delay:d + i * 7 + k * 40 }); }
      for (let i = 0; i < 10; i++) add({ x:t.x + rnd(-6, 6), y:t.y, vx:rnd(-1, 1), vy:rnd(-2, -1), gr:0.12, c:C[1], life:380, delay:d + 160 });
    },
    rocks(t, C, d = 0, n = 8) {                 // boulders dropping in, then dust
      for (let i = 0; i < n; i++) { const x = t.x + rnd(-10, 10), s = 3 + (i % 3);
        add({ x, y:t.y - 55 - i * 4, vy:2.6, c:i % 2 ? C[0] : C[2], s, life:360, delay:d + i * 40, fade:false,
          draw:(g, p) => { if (p.y > t.y + 4) return; g.fillStyle = '#1b1020'; g.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, p.s + 2, p.s + 2); g.fillStyle = p.c; g.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s); g.fillStyle = C[1]; g.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); } }); }
      for (let i = 0; i < 20; i++) add({ x:t.x + rnd(-10, 10), y:t.y + 4, vx:rnd(-1.2, 1.2), vy:rnd(-0.9, -0.1), c:C[1], s:2, life:420, delay:d + 280 + rnd(0, 120) });
      setTimeout(() => shake(t.card, 360), d + 280);
    },
    beam(t, C, d = 0) {                         // a pillar of light from above
      for (let y = t.y - 60; y <= t.y + 6; y += 1) { add({ x:t.x - 3, y, c:C[2], s:1, life:360, delay:d }); add({ x:t.x - 2, y, c:C[0], s:4, life:360, delay:d }); add({ x:t.x - 1, y, c:'#ffffff', s:2, life:300, delay:d + 40 }); }
      for (let i = 0; i < 14; i++) add({ x:t.x + rnd(-6, 6), y:t.y + rnd(-4, 6), vy:rnd(-1, -0.3), c:C[1], life:420, delay:d + 120 });
      setTimeout(() => flash(t.card, C[0]), d + 60);
    },
    shadow(t, C, d = 0) {                       // dark tendrils curling in
      for (let k = 0; k < 5; k++) { const a0 = k / 5 * Math.PI * 2;
        for (let i = 0; i < 18; i++) { const r = 18 - i, a = a0 + i * 0.22; add({ x:t.x + Math.cos(a) * r, y:t.y + Math.sin(a) * r * 0.7, c:i % 3 ? C[0] : C[2], s:2, life:200, delay:d + i * 12 }); } }
      for (let i = 0; i < 12; i++) add({ x:t.x + rnd(-6, 6), y:t.y + rnd(-4, 4), vy:-0.4, c:C[2], s:3, life:500, delay:d + 200 });
    },
    rings(t, C, d = 0, n = 3) {                 // psychic ripples
      for (let k = 0; k < n; k++) for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2;
        add({ x:t.x, y:t.y, vx:Math.cos(a) * 0.9, vy:Math.sin(a) * 0.6, c:C[k % 2 ? 2 : 0], life:340, delay:d + k * 110 }); }
    },
    nature(t, C, d = 0, poison = false) {       // leaves / thorns spiralling, or toxic bubbles
      for (let i = 0; i < 18; i++) { const a = rnd(0, 6.28), r = rnd(14, 22);
        add({ x:t.x + Math.cos(a) * r, y:t.y + Math.sin(a) * r * 0.7, vx:-Math.cos(a) * r / 22, vy:-Math.sin(a) * r / 30, c:poison ? (i % 2 ? '#a64ac9' : '#7cd67c') : C[i % 3], s:2, life:360, delay:d + i * 10 }); }
      if (poison) for (let i = 0; i < 10; i++) add({ x:t.x + rnd(-6, 6), y:t.y + 6, vy:rnd(-0.9, -0.4), c:'#b14fd8', s:2, life:500, delay:d + 200 + i * 20,
        draw:(g, p) => { g.fillStyle = p.c; g.fillRect(Math.round(p.x), Math.round(p.y), 2, 2); g.fillStyle = '#ffffff'; g.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); } });
    },
    notes(a, t, C, d = 0) {                     // music notes drifting from the singer to the target
      const n = 5;
      for (let k = 0; k < n; k++) { const sx = a.x + rnd(-4, 4), sy = a.y + rnd(-4, 4), steps = 22;
        for (let i = 0; i <= steps; i++) { const f = i / steps, x = sx + (t.x - sx) * f, y = sy + (t.y - sy) * f - Math.sin(f * Math.PI * 2 + k) * 5;
          add({ x, y, c:C[k % 2], life:46, delay:d + k * 60 + i * 14, fade:false,
            draw:(g, p) => { g.fillStyle = p.c; g.fillRect(Math.round(p.x), Math.round(p.y), 2, 2); g.fillRect(Math.round(p.x) + 1, Math.round(p.y) - 4, 1, 4); g.fillRect(Math.round(p.x) + 2, Math.round(p.y) - 4, 2, 1); } }); } }
    },
    heal(t, C, d = 0) {                         // rising pluses and sparkles
      for (let i = 0; i < 9; i++) add({ x:t.x + rnd(-8, 8), y:t.y + rnd(0, 8), vy:rnd(-0.8, -0.4), c:i % 2 ? '#7cd67c' : '#ffffff', life:620, delay:d + i * 40,
        draw:(g, p) => { g.fillStyle = p.c; const x = Math.round(p.x), y = Math.round(p.y); g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); } });
      for (let i = 0; i < 12; i++) add({ x:t.x + rnd(-8, 8), y:t.y + rnd(-4, 8), vy:rnd(-0.6, -0.2), c:C[1], life:500, delay:d + rnd(0, 300) });
    },
    shield(t, C, d = 0) {                       // a pixel barrier frame
      const w = t.w * 0.42, h = 14;
      for (let i = -w; i <= w; i += 1) { add({ x:t.x + i, y:t.y - h, c:C[0], s:1, life:420, delay:d }); add({ x:t.x + i, y:t.y + h, c:C[0], s:1, life:420, delay:d }); }
      for (let j = -h; j <= h; j += 1) { add({ x:t.x - w, y:t.y + j, c:C[1], s:1, life:420, delay:d }); add({ x:t.x + w, y:t.y + j, c:C[1], s:1, life:420, delay:d }); }
      setTimeout(() => flash(t.card, C[0]), d);
    },
    arrows(t, up, d = 0) {                      // stat change arrows
      const c = up ? '#7cd67c' : '#ff6b6b';
      for (let i = 0; i < 4; i++) add({ x:t.x - 9 + i * 6, y:t.y + (up ? 8 : -10), vy:up ? -0.5 : 0.5, c, life:520, delay:d + i * 50,
        draw:(g, p) => { g.fillStyle = p.c; const x = Math.round(p.x), y = Math.round(p.y), s = up ? 1 : -1; g.fillRect(x, y - 2 * s, 1, 5); g.fillRect(x - 1, y - s, 3, 1); g.fillRect(x - 2, y, 5, 1); } });
    },
    smoke(t, C, d = 0) { for (let i = 0; i < 16; i++) add({ x:t.x + rnd(-10, 10), y:t.y + rnd(-2, 8), vx:rnd(-0.3, 0.3), vy:rnd(-0.5, -0.1), c:i % 2 ? '#8a8aa0' : '#5a5a70', s:3, life:600, delay:d + i * 15 }); },
    hammer(t, C, d = 0) {                       // a hammer head swinging down
      for (let i = 0; i < 8; i++) { const a = -1.4 + i * 0.2, x = t.x + Math.cos(a) * 14 - 4, y = t.y - 12 + Math.sin(a) * 8 + i * 2;
        add({ x, y, c:'#c8c8d8', s:4, life:60, delay:d + i * 22, fade:false }); add({ x:x + 1, y:y + 1, c:C[0], s:2, life:60, delay:d + i * 22, fade:false }); }
      FX.impact(t, C, d + 180, true);
    },
    fists(t, C, d = 0, n = 3) {                 // a flurry of punches/kicks from alternating sides, each with a pow star
      for (let k = 0; k < n; k++) { const s = k % 2 ? 1 : -1, y = t.y + rnd(-6, 6), hit = d + k * 110 + 90;
        for (let i = 0; i < 6; i++) add({ x:t.x + s * (18 - i * 2.6), y, c:C[0], life:40, delay:d + k * 110 + i * 15, fade:false,
          draw:(g, p) => { const X = Math.round(p.x) - 2, Y = Math.round(p.y) - 2; g.fillStyle = '#1b1020'; g.fillRect(X - 1, Y - 1, 6, 6); g.fillStyle = p.c; g.fillRect(X, Y, 4, 4); g.fillStyle = '#ffffff'; g.fillRect(X, Y, 2, 1); } });
        add({ x:t.x, y, c:'#ffffff', life:160, delay:hit, draw:(g, p) => { const X = Math.round(p.x), Y = Math.round(p.y), r = 5 - Math.round(p.life / 40);
          g.fillStyle = '#ffe94a'; g.fillRect(X - r, Y, r * 2 + 1, 1); g.fillRect(X, Y - r, 1, r * 2 + 1); g.fillStyle = '#ffffff'; g.fillRect(X - 1, Y - 1, 3, 3); } });
        FX.spark({ ...t, y }, C, hit, 6); setTimeout(() => shake(t.card, 160), hit); }
    },
    dagger(t, C, d = 0, n = 2) {                // quick stabs
      for (let k = 0; k < n; k++) { const ang = rnd(-0.6, 0.6), dx = Math.cos(ang), dy = Math.sin(ang);
        line(t.x - dx * 14, t.y - dy * 10, t.x + dx * 4, t.y + dy * 3, k % 2 ? '#ffffff' : C[0], 1, 140, d + k * 80);
        FX.spark(t, C, d + k * 80 + 60, 4); }
    }
  };

  /* ---------- pick an effect from the move's name, element and type ---------- */
  const has = (n, words) => words.some(w => n.includes(w));
  function plan(m, a) {
    const n = (m.n || '').toLowerCase(), el = m.el && EC[m.el] ? m.el : (a.el || 'neutral');
    const elementFx = { fire:'flames', water:'wave', lightning:'bolt', earth:'rocks', light:'beam', dark:'shadow', psychic:'rings', life:'nature' }[el];
    if (!(m.pow > 0)) {                       // support / status moves
      if (has(n, ['song', 'hymn', 'melody', 'anthem', 'ballad', 'chorus', 'riff', 'lullaby', 'tune', 'waltz', 'dirge', 'requiem', 'aria', 'solo', 'drum', 'note', 'duet', 'encore', 'chord', 'rally', 'tempo', 'inspire', 'shriek', 'siren'])) return 'notes';
      if (m.revive || m.healPct || m.regen) return 'heal';
      if (m.shieldPct || m.guard || m.armor || m.taunt || m.selfTaunt || m.veil) return 'shield';
      if (m.offUp || m.haste || m.staGain) return 'buff';
      if (m.t === 'foe' || m.t === 'foes') return elementFx === 'flames' ? 'smoke' : elementFx;   // hexes look like their element
      return 'buff';
    }
    if (has(n, ['song', 'note', 'chorus', 'hymn', 'shriek', 'chord', 'finale', 'aria', 'fanfare', 'dissonance', 'knell', 'verse', 'ballad', 'beat', 'lute', 'riff'])) return 'notes';
    if (has(n, ['arrow', 'shot', 'volley', 'dart', 'snipe', 'trap', 'net'])) return 'arrow';
    if (has(n, ['hammer', 'anvil', 'bonk'])) return 'hammer';
    if (has(n, ['fist', 'palm', 'kick', 'punch', 'jab', 'flurry of blows', 'hundred fists', 'combo', 'barrage'])) return 'fists';
    if (has(n, ['thunder', 'lightning', 'bolt', 'volt', 'shock', 'zap', 'static', 'storm', 'spark', 'arc', 'jolt', 'emp', 'raijin'])) return el === 'lightning' ? 'bolt' : 'orb';
    if (has(n, ['meteor', 'boulder', 'rock', 'stone', 'quake', 'tremor', 'landslide', 'avalanche', 'tectonic', 'seismic', 'earth', 'pebble', 'sand', 'mountain'])) return 'rocks';
    if (has(n, ['fireball', 'orb', 'blast', 'ray', 'beam', 'lance', 'jet', 'missile', 'bolt'])) return el === 'light' ? 'beam' : 'orb';
    if (has(n, ['holy', 'divine', 'radiant', 'sun', 'dawn', 'judgment', 'judgement', 'smite', 'heaven', 'solar', 'star'])) return 'beam';
    if (has(n, ['dagger', 'stab', 'backstab', 'shiv', 'assassin', 'cut', 'fang', 'execution', 'end', 'knell'])) return 'dagger';
    if (has(n, ['slash', 'blade', 'edge', 'cleave', 'sword', 'strike', 'swing', 'dash', 'flurry', 'dance'])) return 'slash';
    if (has(n, ['slam', 'smash', 'crush', 'bash', 'brand', 'charge', 'stomp', 'wrath', 'down'])) return 'impact';
    if (has(n, ['flame', 'fire', 'burn', 'inferno', 'blaze', 'ember', 'magma', 'volcan', 'scorch', 'heat', 'pyro', 'combust', 'cinder', 'immolate', 'nova', 'phoenix', 'searing'])) return el === 'fire' ? 'flames' : elementFx;
    if (has(n, ['wave', 'tide', 'tsunami', 'flood', 'deluge', 'torrent', 'water', 'rain', 'whirlpool', 'riptide', 'undertow', 'abyssal', 'drown', 'splash', 'ocean'])) return 'wave';
    if (has(n, ['poison', 'venom', 'toxic', 'spore', 'bloom', 'thorn', 'vine', 'bramble', 'nettle', 'briar', 'leech', 'sap', 'gaia', 'hydra', 'plague', 'life drain', 'deathbloom', 'pollen'])) return 'nature';
    if (has(n, ['shadow', 'dark', 'night', 'void', 'curse', 'soul', 'death', 'hex', 'oblivion', 'eclipse', 'dread', 'blasphemy', 'nightmare', 'gloom', 'abyss', 'bleed'])) return 'shadow';
    if (has(n, ['mind', 'psy', 'psi', 'brain', 'mental', 'hypno', 'madness', 'neural', 'enlighten', 'focus', 'mana'])) return 'rings';
    // Fallback: physical hits by fighting style, special hits as element energy.
    if (m.cat === 's') return el === 'neutral' ? 'orb' : elementFx === 'flames' ? 'orb' : elementFx;
    return { fighter:'slash', rogue:'dagger', monk:'fists', ranger:'arrow', bulwark:'hammer' }[a.cls] || 'impact';
  }

  // Play the effect for one move.
  function play(m, a, tgs) {
    if (typeof document === 'undefined') return;
    ensure();
    const A = pos(a); if (!A) return;
    const T = (tgs || []).map(u => pos(u)).filter(Boolean); if (!T.length) T.push(A);
    const el = m.el && EC[m.el] ? m.el : (a.el || 'neutral'), C = EC[el] || EC.neutral;
    const kind = plan(m, a), hits = m.hits || 1, follow = { fire:'flames', water:'wave', lightning:'spark', earth:'rocks', life:'nature', light:'spark', dark:'smoke', psychic:'rings' }[el];
    T.forEach((t, i) => {
      const d = i * 70;
      switch (kind) {
        case 'arrow': for (let h = 0; h < hits; h++) FX.arrow(A, t, C, d + h * 120); break;
        case 'orb': FX.orb(A, t, C, d); if (follow && follow !== 'spark') FX[follow](t, C, d + 220); break;
        case 'notes': FX.notes(A, t, C, d); if (m.pow > 0) FX.burstRing(t, C, d + 330, 12); break;
        case 'slash': for (let h = 0; h < hits; h++) FX.slash(t, C, d + h * 120, h % 2 === 1); if (el !== 'neutral' && m.el !== 'neutral') FX[follow](t, C, d + 120); break;
        case 'dagger': FX.dagger(t, C, d, Math.max(2, hits)); break;
        case 'fists': FX.fists(t, C, d, Math.max(hits, 2)); break;
        case 'hammer': FX.hammer(t, C, d); if (m.el !== 'neutral') FX[follow](t, C, d + 200); break;
        case 'impact': FX.impact(t, C, d, m.pow >= 90); if (m.el !== 'neutral') FX[follow](t, C, d + 120); break;
        case 'bolt': FX.bolt(t, C, d); break;
        case 'rocks': FX.rocks(t, C, d); break;
        case 'beam': FX.beam(t, C, d); break;
        case 'flames': FX.flames(t, C, d); FX.burstRing(t, C, d + 120, 10); break;
        case 'wave': FX.wave(t, C, d); break;
        case 'shadow': FX.shadow(t, C, d); break;
        case 'rings': FX.rings(t, C, d); break;
        case 'nature': FX.nature(t, C, d, !!(m.poison || /venom|toxic|poison|spore|plague/i.test(m.n))); break;
        case 'smoke': FX.smoke(t, C, d); break;
        case 'heal': FX.heal(t, C, d); break;
        case 'shield': FX.shield(t, C, d); break;
        case 'buff': FX.arrows(t, true, d); FX.spark(t, C, d, 6); break;
      }
      if (!(m.pow > 0) && (m.t === 'foe' || m.t === 'foes') && (m.weaken || m.expose || m.slow)) FX.arrows(t, false, d + 200);
    });
    go();
  }
  return { play, plan };
})();
