/* ================= world map art =================
   Each world gets a procedurally drawn pixel-art backdrop behind the map.
   Drawn small (80x96) and scaled up crisp. Same world = same picture (seeded). */
const WORLD_ART = {};
function worldArt(w) {
  if (WORLD_ART[w]) return WORLD_ART[w];
  const Wd = 80, Ht = 96, cv = document.createElement('canvas'); cv.width = Wd; cv.height = Ht;
  const g = cv.getContext('2d');
  let seed = 1234 + w * 977;
  const R = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const ri = n => Math.floor(R() * n);
  const px = (x, y, c) => { g.fillStyle = c; g.fillRect(x | 0, y | 0, 1, 1); };
  const rect = (x, y, w2, h, c) => { g.fillStyle = c; g.fillRect(x | 0, y | 0, w2, h); };
  const fill = c => rect(0, 0, Wd, Ht, c);
  const speckle = (cols, n) => { for (let i = 0; i < n; i++) px(ri(Wd), ri(Ht), cols[ri(cols.length)]); };
  const blob = (cx, cy, r, c) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) px(cx + x, cy + y, c); };
  const tree = (x, y, leaf, dark, trunk = '#5a3a22') => { rect(x, y + 2, 1, 2, trunk); blob(x, y, 2, dark); blob(x, y - 1, 1, leaf); };
  const pine = (x, y, c, d) => { for (let i = 0; i < 4; i++) rect(x - i, y + i, i * 2 + 1, 1, i % 2 ? d : c); rect(x, y + 4, 1, 1, '#4a3020'); };
  const river = (c, edge, x0, wob) => { let x = x0; for (let y = 0; y < Ht; y++) { x += (R() - 0.5) * wob; x = Math.max(6, Math.min(Wd - 10, x)); rect(x - 1, y, 6, 1, edge); rect(x, y, 4, 1, c); } };
  const path = c => { let x = Wd / 2; for (let y = Ht - 1; y >= 0; y--) { x += (R() - 0.5) * 1.6; x = Math.max(20, Math.min(Wd - 20, x)); rect(x - 2, y, 4, 1, c); } };

  if (w === 0 || w === 5) {                      // Overworld (day) / Overworld 2 (autumn dusk)
    const day = w === 0;
    fill(day ? '#3f7a3a' : '#5a5a2e');
    speckle(day ? ['#4c8a44', '#356a31', '#5a9a4e'] : ['#6b6a32', '#4c4a26', '#7a6a2e'], 900);
    river(day ? '#3a7bd5' : '#3a5a8a', day ? '#2a5a9a' : '#2a3a5a', 8 + ri(10), 1.2);
    path(day ? '#b39a62' : '#8a6a42');
    for (let i = 0; i < 26; i++) { const x = ri(Wd), y = ri(Ht); day ? tree(x, y, '#5fb04a', '#2e6a2a') : tree(x, y, ['#e07a2a', '#c94f1f', '#e0b02a'][ri(3)], '#7a3a1a'); }
    for (let i = 0; i < 30; i++) px(ri(Wd), ri(Ht), day ? ['#f9c74f', '#ff7aa8', '#ffffff'][ri(3)] : '#d0a050');
    if (!day) for (let i = 0; i < 4; i++) { const x = 8 + ri(Wd - 16), y = 10 + ri(Ht - 20); rect(x, y, 4, 3, '#6a6a72'); rect(x + 1, y - 2, 1, 2, '#6a6a72'); }   // ruins
  } else if (w === 1) {                          // Mountains
    fill('#59606e'); speckle(['#6a7180', '#4a505c', '#7a8090'], 900);
    for (let i = 0; i < 14; i++) { const x = ri(Wd), y = ri(Ht), h = 6 + ri(7);
      for (let k = 0; k < h; k++) { rect(x - k, y + k, k * 2 + 1, 1, k < 3 ? '#eef2f8' : (k % 2 ? '#7b8494' : '#6a7282')); rect(x + 1, y + k, k, 1, k < 3 ? '#c8d0dc' : '#4e5562'); } }
    for (let i = 0; i < 20; i++) pine(ri(Wd), ri(Ht), '#2f6a4a', '#24533a');
    for (let i = 0; i < 40; i++) px(ri(Wd), ri(Ht), '#eef2f8');
  } else if (w === 2) {                          // Cave
    fill('#2a2328'); speckle(['#352c32', '#211b1f', '#3d3338'], 1100);
    for (let i = 0; i < 6; i++) blob(ri(Wd), ri(Ht), 3 + ri(3), '#1e3a4e');               // puddles
    for (let i = 0; i < 24; i++) { const x = ri(Wd), y = ri(Ht); rect(x, y, 2, 3, '#4a3e44'); px(x, y, '#5e5058'); }  // stalagmites
    for (let i = 0; i < 18; i++) { const x = ri(Wd), y = ri(Ht), c = ['#4cc9f0', '#b388ff', '#7cd67c'][ri(3)]; px(x, y, c); px(x + 1, y + 1, c); px(x - 1, y + 1, c); px(x, y - 1, '#ffffff'); }  // crystals
  } else if (w === 3) {                          // Dungeon
    fill('#302838');
    for (let y = 0; y < Ht; y += 4) for (let x = (y / 4) % 2 ? 0 : 3; x < Wd; x += 6) { rect(x, y, 5, 3, ['#3e3448', '#382f42', '#443a4e'][ri(3)]); }
    for (let i = 0; i < 10; i++) { const x = ri(Wd), y = ri(Ht); rect(x, y, 1, 3, '#5a3a22'); px(x, y - 1, '#f9c74f'); px(x, y - 2, '#ff8c42'); }  // torches
    for (let i = 0; i < 12; i++) { const x = ri(Wd), y = ri(Ht); rect(x, y, 3, 1, '#d8d0c0'); px(x + 3, y - 1, '#d8d0c0'); }   // bones
    for (let i = 0; i < 6; i++) { const x = ri(Wd), y = ri(Ht); rect(x, y, 6, 6, '#1c1622'); rect(x + 1, y + 1, 4, 4, '#2a2232'); }  // pits
  } else if (w === 4) {                          // Dragon's Den
    fill('#3a1c1a'); speckle(['#4a2420', '#2c1412', '#552a24'], 1000);
    river('#ff8c42', '#e0401f', 10 + ri(20), 2); river('#f9c74f', '#ff5a1f', 40 + ri(20), 2);
    for (let y = 0; y < 18; y++) for (let x = 10; x < Wd - 10; x++) if (R() < 0.35 - y * 0.018) px(x, y, ['#f9c74f', '#e0b02a', '#fff3a0'][ri(3)]);  // hoard at the top
    for (let i = 0; i < 14; i++) { const x = ri(Wd), y = 20 + ri(Ht - 20); rect(x, y, 3, 1, '#d8d0c0'); px(x + 1, y - 1, '#d8d0c0'); }
  } else if (w === 6) {                          // Feywild
    fill('#1f5a4e'); speckle(['#2a6e5e', '#184a40', '#3a7e6a', '#4a3a7a'], 1000);
    river('#7ad8e8', '#4aa8c8', 30 + ri(15), 1.5);
    for (let i = 0; i < 16; i++) { const x = ri(Wd), y = ri(Ht), c = ['#e0457a', '#b388ff', '#ff8c42'][ri(3)];
      rect(x - 2, y, 5, 2, c); px(x - 1, y, '#ffffff'); px(x + 1, y + 1, '#ffffff'); rect(x, y + 2, 1, 2, '#f0e8d0'); }   // mushrooms
    for (let i = 0; i < 60; i++) px(ri(Wd), ri(Ht), ['#fff3a0', '#c8f0ff', '#ffb0e0'][ri(3)]);   // sparkles
  } else if (w >= 8) {                           // Realm 2: Genre Hop (one look per genre)
    const k = w - 8;
    if (k === 0) {                               // Space Station
      fill('#0b1030'); speckle(['#ffffff', '#a8c8ff', '#ffe9a8'], 170); blob(58, 22, 9, '#7a5cff'); blob(55, 19, 6, '#9a80ff');
      for (let i = 0; i < 4; i++) { const y = 56 + i * 9; rect(0, y, Wd, 3, '#2a3550'); for (let x = 2; x < Wd; x += 6) px(x, y + 1, R() < 0.5 ? '#ffd24a' : '#59e0ff'); }
    } else if (k === 1) {                        // Wild West
      fill('#d9a05a'); speckle(['#c8904a', '#e8b878', '#b07a3a'], 700); rect(0, 0, Wd, 28, '#f2c27a'); blob(62, 14, 7, '#fff0b0');
      for (let i = 0; i < 3; i++) { const x = 8 + i * 26, h = 10 + ri(8); rect(x, 28, 16, h, '#a85a2a'); rect(x + 2, 28 - 3, 12, 3, '#b8683a'); }
      for (let i = 0; i < 9; i++) { const x = ri(Wd), y = 40 + ri(Ht - 44); rect(x, y, 2, 7, '#3a7a3a'); rect(x - 2, y + 2, 2, 1, '#3a7a3a'); rect(x - 2, y + 1, 1, 2, '#3a7a3a'); rect(x + 2, y + 3, 2, 1, '#3a7a3a'); }
    } else if (k === 2) {                        // Pirate Seas
      fill('#1f5a9a'); speckle(['#2a6aaa', '#184a80', '#4a8ad0'], 700);
      for (let y = 4; y < Ht; y += 6) for (let x = ri(6); x < Wd; x += 8) { px(x, y, '#8ac8ff'); px(x + 1, y - 1, '#bfe4ff'); px(x + 2, y, '#8ac8ff'); }
      for (let i = 0; i < 2; i++) { const x = 14 + ri(Wd - 34), y = 20 + ri(Ht - 50); rect(x, y + 6, 14, 4, '#6a3a1a'); rect(x + 6, y - 4, 1, 10, '#3a2010'); rect(x + 7, y - 3, 6, 6, '#f0e8d0'); }
    } else if (k === 3) {                        // Haunted Mansion
      fill('#2a1f3a'); speckle(['#352a48', '#201830'], 600); rect(10, 34, 60, 52, '#3a2a4a'); for (let i = 0; i < 5; i++) rect(10 + i * 12, 28 - (i % 2) * 6, 12, 8, '#3a2a4a');
      for (let r2 = 0; r2 < 3; r2++) for (let c2 = 0; c2 < 4; c2++) rect(16 + c2 * 14, 40 + r2 * 14, 5, 7, R() < 0.45 ? '#ffd24a' : '#150f20');
      for (let i = 0; i < 12; i++) blob(ri(Wd), 70 + ri(24), 4, 'rgba(200,190,230,0.25)');
    } else if (k === 4) {                        // Cyber City
      fill('#06161a'); for (let x = 0; x < Wd; x += 8) rect(x, 0, 1, Ht, '#0e3a42'); for (let y = 0; y < Ht; y += 8) rect(0, y, Wd, 1, '#0e3a42');
      for (let i = 0; i < 9; i++) { const x = ri(Wd - 8), h = 14 + ri(40); rect(x, Ht - h, 7, h, '#0c2a30'); for (let y = Ht - h + 2; y < Ht; y += 4) px(x + 1 + ri(5), y, ['#ff3df0', '#3dffe8', '#fff23d'][ri(3)]); }
    } else if (k === 5) {                        // Candy Kingdom
      fill('#f2a3c8'); speckle(['#f8b8d6', '#e88ab4', '#ffffff'], 600);
      for (let i = 0; i < 16; i++) { const x = ri(Wd), y = ri(Ht); blob(x, y, 2, ['#ff6a9a', '#7ad8ff', '#ffe05a', '#a0f0a0'][ri(4)]); px(x, y, '#ffffff'); }
      for (let i = 0; i < 5; i++) { const x = 6 + ri(Wd - 12), y = 10 + ri(Ht - 30); for (let j = 0; j < 9; j++) px(x, y + j, j % 2 ? '#ffffff' : '#e8344a'); px(x + 1, y, '#e8344a'); px(x + 2, y + 1, '#e8344a'); }
    } else if (k === 6) {                        // Wasteland
      fill('#6a4a32'); speckle(['#5a3e2a', '#7a5a3e', '#4a3222'], 800); rect(0, 0, Wd, 24, '#a8502a'); blob(18, 14, 8, '#ffb060');
      for (let i = 0; i < 14; i++) { const x = ri(Wd), y = 30 + ri(Ht - 34); rect(x, y, 2 + ri(5), 2 + ri(4), ['#3a3a40', '#5a4a40', '#2a2a30'][ri(3)]); }
      for (let i = 0; i < 4; i++) { const x = 6 + ri(Wd - 16), y = 34 + ri(Ht - 50); rect(x, y, 1, 10, '#2a2a30'); rect(x - 3, y + 4, 7, 1, '#2a2a30'); }
    } else {                                     // The Fourth Wall
      fill('#101018'); for (let i = 0; i < 40; i++) rect(ri(Wd), ri(Ht), 2 + ri(14), 1 + ri(3), ['#ffffff', '#ff3df0', '#3dffe8', '#2a2a3a'][ri(4)]);
      for (let i = 0; i < 6; i++) { const x = ri(Wd - 12), y = ri(Ht - 12); rect(x, y, 12, 1, '#ffffff'); rect(x, y + 11, 12, 1, '#ffffff'); rect(x, y, 1, 12, '#ffffff'); rect(x + 11, y, 1, 12, '#ffffff'); }
    }
  } else {                                       // God's Planes
    fill('#4a3a6a');
    for (let y = 0; y < Ht; y++) rect(0, y, Wd, 1, y < Ht / 2 ? '#5a4a7a' : '#6a5a8a');
    for (let i = 0; i < 70; i++) px(ri(Wd), ri(Ht), '#fff3a0');
    for (let i = 0; i < 20; i++) { const x = ri(Wd), y = ri(Ht); blob(x, y, 3, '#e8e0f8'); blob(x + 3, y + 1, 2, '#ffffff'); blob(x - 3, y + 1, 2, '#d0c8e8'); }   // clouds
    for (let i = 0; i < 8; i++) { const x = 4 + ri(Wd - 8), y = ri(Ht - 10); rect(x, y, 3, 9, '#f0e6c8'); rect(x - 1, y, 5, 1, '#fff3c0'); rect(x - 1, y + 9, 5, 1, '#fff3c0'); px(x + 1, y + 2, '#d8c890'); }  // pillars
    for (let i = 0; i < 5; i++) { const x = ri(Wd); for (let y = 0; y < Ht; y += 2) if (R() < 0.5) px(x + (y / 12 | 0), y, 'rgba(255,243,160,0.6)'); }  // light rays
  }
  return WORLD_ART[w] = cv.toDataURL();
}
