'use strict';
/* ================================================================
   textures.js — procedural tileable ground textures -> CanvasPatterns
   Each texture is 256px and covers 128 world units (2 texels/unit).
   ================================================================ */
const TEX = {};
const TEX_PX = 256, TEX_WORLD = 128;
function hexRGB(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function mixRGB(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

function noiseTex(seed, freq, fn) {
  const S = TEX_PX, c = mkCanvas(S, S), g = c.getContext('2d'), id = g.createImageData(S, S), d = id.data;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = x / S * freq, v = y / S * freq;
    const n = fbm(u, v, seed, 3, freq), w = hash2(x, y, seed + 7);
    const col = fn(n, w, x, y); const i = (y * S + x) * 4;
    d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
  }
  g.putImageData(id, 0, 0); return c;
}
// draw something wrapped around tile edges
function wrapDraw(g, x, y, r, fn) {
  const S = TEX_PX;
  for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
    const X = x + ox, Y = y + oy; if (X < -r || X > S + r || Y < -r || Y > S + r) continue; fn(X, Y);
  }
}
function scatter(c, seed, n, fn) { const g = c.getContext('2d'), r = RNG(seed); for (let i = 0; i < n; i++) { const x = r() * TEX_PX, y = r() * TEX_PX; wrapDraw(g, x, y, 12, (X, Y) => fn(g, X, Y, r)); } }

function buildTextures() {
  const C = hexRGB;
  // --- lush irrigated lawn ---
  let c = noiseTex(11, 6, (n, w) => { const a = C('#4f9a37'), b = C('#78bd4c'); const k = mixRGB(a, b, n); const j = (w - .5) * 22; return [k[0] + j, k[1] + j, k[2] + j * .6]; });
  scatter(c, 3, 900, (g, x, y, r) => { g.strokeStyle = r() < .5 ? 'rgba(40,90,25,.5)' : 'rgba(160,215,110,.45)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + r() * 2 - 1, y - 3 - r() * 3); g.stroke(); });
  scatter(c, 4, 22, (g, x, y, r) => { g.fillStyle = r() < .5 ? '#fff6c8' : '#f7e04a'; g.fillRect(x, y, 2, 2); });
  TEX.grass = c;
  // --- dry wild grass (Israeli summer) ---
  c = noiseTex(21, 5, (n, w) => { const a = C('#9c9550'), b = C('#c9b56d'); const k = mixRGB(a, b, n); const j = (w - .5) * 26; return [k[0] + j, k[1] + j, k[2] + j * .7]; });
  scatter(c, 5, 700, (g, x, y, r) => { g.strokeStyle = r() < .6 ? 'rgba(110,95,40,.45)' : 'rgba(230,215,150,.5)'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + r() * 6 - 3, y - 2 - r() * 4); g.stroke(); });
  scatter(c, 6, 30, (g, x, y, r) => { g.fillStyle = 'rgba(90,110,50,.6)'; g.beginPath(); g.arc(x, y, 2 + r() * 3, 0, TAU); g.fill(); });
  TEX.dry = c;
  // --- dirt ---
  c = noiseTex(31, 7, (n, w) => { const k = mixRGB(C('#8c6a45'), C('#b38b5c'), n); const j = (w - .5) * 24; return [k[0] + j, k[1] + j, k[2] + j]; });
  scatter(c, 7, 160, (g, x, y, r) => { const s = 1 + r() * 2.5; g.fillStyle = r() < .5 ? 'rgba(70,50,30,.5)' : 'rgba(210,185,150,.55)'; g.beginPath(); g.ellipse(x, y, s, s * .7, r() * 3, 0, TAU); g.fill(); });
  TEX.dirt = c;
  // --- farm yard (packed dirt + straw) ---
  c = noiseTex(33, 6, (n, w) => { const k = mixRGB(C('#8f7653'), C('#a89068'), n); const j = (w - .5) * 18; return [k[0] + j, k[1] + j, k[2] + j]; });
  scatter(c, 8, 260, (g, x, y, r) => { g.strokeStyle = 'rgba(230,200,110,.55)'; g.beginPath(); g.moveTo(x, y); const a = r() * TAU; g.lineTo(x + Math.cos(a) * 5, y + Math.sin(a) * 5); g.stroke(); });
  TEX.yard = c;
  // --- sand (wadi) ---
  c = noiseTex(41, 4, (n, w, x, y) => { const rip = Math.sin((x + n * 40) / TEX_PX * TAU * 9) * .5 + .5; const k = mixRGB(C('#cdb589'), C('#e6d4a8'), n * .6 + rip * .4); const j = (w - .5) * 16; return [k[0] + j, k[1] + j, k[2] + j]; });
  scatter(c, 9, 70, (g, x, y, r) => { const s = 1.5 + r() * 4; g.fillStyle = r() < .5 ? '#a99577' : '#8f8070'; g.beginPath(); g.ellipse(x, y, s, s * .75, r() * 3, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.ellipse(x - s * .3, y - s * .3, s * .4, s * .3, 0, 0, TAU); g.fill(); });
  TEX.sand = c;
  // --- asphalt ---
  c = noiseTex(51, 8, (n, w) => { const v = 66 + n * 18 + (w - .5) * 30; return [v, v + 1, v + 4]; });
  scatter(c, 10, 400, (g, x, y, r) => { g.fillStyle = r() < .5 ? 'rgba(20,20,22,.5)' : 'rgba(150,150,150,.35)'; g.fillRect(x, y, 1.5, 1.5); });
  scatter(c, 11, 3, (g, x, y, r) => { g.strokeStyle = 'rgba(25,25,28,.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); for (let i = 0; i < 6; i++) g.lineTo(x += r() * 14 - 7, y += r() * 14 - 4); g.stroke(); });
  TEX.asphalt = c;
  c = noiseTex(52, 8, (n, w) => { const v = 52 + n * 14 + (w - .5) * 24; return [v, v + 1, v + 3]; });
  TEX.highway = c;
  // --- concrete path (kibbutz shvilim) ---
  c = noiseTex(61, 6, (n, w) => { const v = 186 + n * 22 + (w - .5) * 18; return [v, v - 3, v - 12]; });
  scatter(c, 12, 60, (g, x, y, r) => { g.fillStyle = 'rgba(120,110,95,.35)'; g.fillRect(x, y, 2, 2); });
  TEX.path = c;
  // --- interlocking pavers (mishtalvot) ---
  c = mkCanvas(TEX_PX, TEX_PX); { const g = c.getContext('2d'), r = RNG(71); const bw = 32, bh = 16;
    for (let y = 0; y < TEX_PX; y += bh) for (let x = -bw; x < TEX_PX; x += bw) {
      const ox = ((y / bh) % 2) * bw / 2, base = r() < .12 ? [168, 92, 78] : [185 + r() * 18, 180 + r() * 14, 168 + r() * 10];
      g.fillStyle = `rgb(${base[0] | 0},${base[1] | 0},${base[2] | 0})`; g.fillRect(x + ox + 1, y + 1, bw - 2, bh - 2);
      g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x + ox + 1, y + 1, bw - 2, 2);
    }
    g.globalCompositeOperation = 'destination-over'; g.fillStyle = '#857c6c'; g.fillRect(0, 0, TEX_PX, TEX_PX); }
  TEX.pavers = c;
  // --- concrete slabs (industrial / farm) ---
  c = noiseTex(81, 6, (n, w) => { const v = 160 + n * 24 + (w - .5) * 14; return [v, v, v - 4]; });
  { const g = c.getContext('2d'); g.strokeStyle = 'rgba(80,80,80,.45)'; g.lineWidth = 1.5; for (let i = 0; i <= TEX_PX; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, TEX_PX); g.moveTo(0, i); g.lineTo(TEX_PX, i); g.stroke(); }
    scatter(c, 13, 25, (g2, x, y, r) => { g2.fillStyle = 'rgba(60,50,40,.18)'; g2.beginPath(); g2.ellipse(x, y, 6 + r() * 14, 4 + r() * 8, r() * 3, 0, TAU); g2.fill(); }); }
  TEX.concrete = c;
  // --- water (ponds / reservoir) ---
  c = noiseTex(91, 4, (n, w, x, y) => { const k = mixRGB(C('#2f6f8a'), C('#4a97ad'), n); return k; });
  scatter(c, 14, 50, (g, x, y, r) => { g.strokeStyle = 'rgba(200,240,255,.28)'; g.lineWidth = 1.2; g.beginPath(); g.arc(x, y, 6 + r() * 8, .2, 1.4); g.stroke(); });
  TEX.water = c;
  // --- pool water ---
  c = noiseTex(92, 5, (n) => mixRGB(C('#3cc0e0'), C('#7fe0f2'), n));
  { const g = c.getContext('2d'); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.2;
    for (let i = 0; i < 26; i++) { const r = RNG(i); g.beginPath(); let x = r() * TEX_PX, y = r() * TEX_PX; g.moveTo(x, y); for (let k = 0; k < 4; k++) g.lineTo(x += r() * 30 - 15, y += r() * 30 - 15); g.stroke(); } }
  TEX.pool = c;
  // --- crops: rows along x axis ---
  const rows = (seed, bg1, bg2, rowCol, period, fn) => {
    const cc = noiseTex(seed, 5, (n, w, x, y) => { const row = (Math.sin(y / period * TAU) * .5 + .5); const k = mixRGB(C(bg1), C(bg2), n * .5 + row * .5); const j = (w - .5) * 20; return [k[0] + j, k[1] + j, k[2] + j]; });
    if (fn) fn(cc.getContext('2d')); return cc;
  };
  TEX.wheat = rows(101, '#c49a3a', '#e6c460', null, 8, g => { const r = RNG(5); for (let i = 0; i < 1500; i++) { const x = r() * TEX_PX, y = Math.round(r() * TEX_PX / 8) * 8 + r() * 4 - 2; g.fillStyle = r() < .5 ? 'rgba(250,225,130,.7)' : 'rgba(150,105,30,.5)'; g.fillRect(x, y, 1, 3); } });
  TEX.stubble = rows(102, '#a98a4f', '#c3a76a', null, 8, g => { const r = RNG(6); for (let i = 0; i < 400; i++) { g.fillStyle = 'rgba(90,70,30,.4)'; g.fillRect(r() * TEX_PX, r() * TEX_PX, 2, 1); } });
  TEX.cotton = rows(103, '#3f6e2e', '#64923e', null, 16, g => { const r = RNG(7); for (let i = 0; i < 700; i++) { const x = r() * TEX_PX, y = Math.round(r() * TEX_PX / 16) * 16 + r() * 4 - 2; g.fillStyle = '#f7f7f2'; g.beginPath(); g.arc(x, y, 1.3 + r(), 0, TAU); g.fill(); } });
  TEX.alfalfa = rows(104, '#4c8f32', '#7cb84a', null, 8, g => { const r = RNG(8); for (let i = 0; i < 300; i++) { g.fillStyle = r() < .5 ? 'rgba(170,120,220,.5)' : 'rgba(40,90,25,.5)'; g.fillRect(r() * TEX_PX, r() * TEX_PX, 2, 2); } });
  TEX.sunflower = rows(105, '#3d6a2a', '#5b8a36', null, 16, g => { const r = RNG(9); for (let y = 8; y < TEX_PX; y += 16) for (let x = 4; x < TEX_PX; x += 8) { const xx = x + r() * 3, yy = y + r() * 3 - 1.5; g.fillStyle = '#f6c21c'; g.beginPath(); g.arc(xx, yy, 3.4, 0, TAU); g.fill(); g.fillStyle = '#5a3a12'; g.beginPath(); g.arc(xx, yy, 1.5, 0, TAU); g.fill(); } });
  TEX.plowed = rows(106, '#6b4a2e', '#8e6842', null, 8, g => { const r = RNG(10); for (let i = 0; i < 300; i++) { g.fillStyle = 'rgba(40,25,15,.4)'; g.fillRect(r() * TEX_PX, r() * TEX_PX, 3, 1); } });
  TEX.vineyard = rows(107, '#7a6a40', '#93804e', null, 16, g => { const r = RNG(11); for (let y = 8; y < TEX_PX; y += 16) for (let x = 0; x < TEX_PX; x += 4) { g.fillStyle = r() < .5 ? '#3e6b28' : '#5a8a35'; g.beginPath(); g.arc(x + r() * 2, y + r() * 3 - 1.5, 2.6 + r() * 1.5, 0, TAU); g.fill(); } });
  TEX.orchardGround = noiseTex(108, 5, (n, w) => { const k = mixRGB(C('#8a7a4a'), C('#a8995e'), n); const j = (w - .5) * 20; return [k[0] + j, k[1] + j, k[2] + j]; });
  TEX.mud = noiseTex(109, 6, (n, w) => { const k = mixRGB(C('#4e3622'), C('#6e4c30'), n); const j = (w - .5) * 16; return [k[0] + j, k[1] + j, k[2] + j]; });
  TEX.rock = noiseTex(110, 5, (n, w) => { const v = 130 + n * 50 + (w - .5) * 20; return [v + 10, v, v - 15]; });
  scatter(TEX.rock, 15, 60, (g, x, y, r) => { const s = 3 + r() * 6; g.fillStyle = r() < .5 ? '#9b8f80' : '#7d7266'; g.beginPath(); g.ellipse(x, y, s, s * .7, r() * 3, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.2)'; g.beginPath(); g.ellipse(x - s * .3, y - s * .3, s * .4, s * .3, 0, 0, TAU); g.fill(); });
  TEX.court = noiseTex(111, 6, (n) => mixRGB(C('#b85a3c'), C('#c86848'), n));
  TEX.turf = noiseTex(112, 5, (n, w, x, y) => { const stripe = Math.floor(x / 32) % 2 ? 1 : .88; const k = mixRGB(C('#4c9a3a'), C('#62b046'), n); return [k[0] * stripe, k[1] * stripe, k[2] * stripe]; });
  TEX.gravel = noiseTex(113, 9, (n, w) => { const v = 150 + n * 30 + (w - .5) * 60; return [v, v - 5, v - 14]; });
  TEX.sandbox = noiseTex(114, 7, (n, w) => { const k = mixRGB(C('#e3cf96'), C('#f2e2b0'), n); const j = (w - .5) * 20; return [k[0] + j, k[1] + j, k[2] + j]; });

  const pc = mkCanvas(2, 2).getContext('2d');
  for (const k in TEX) { const cv = TEX[k]; TEX[k] = { cv, pat: pc.createPattern(cv, 'repeat') }; }
}
const _patM = new DOMMatrix();
function texPattern(name, angle) {
  const t = TEX[name]; if (!t) return '#f0f';
  const m = new DOMMatrix(); if (angle) m.rotateSelf(angle * 180 / Math.PI); m.scaleSelf(TEX_WORLD / TEX_PX, TEX_WORLD / TEX_PX);
  t.pat.setTransform(m); return t.pat;
}
