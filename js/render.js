'use strict';
/* ================================================================
   render.js — camera, GTA2-style pseudo-3D buildings & trees,
   shadows, entities, night lighting, weather overlays
   ================================================================ */
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
let VW = 0, VH = 0, DPR = 1;
function resize() { DPR = Math.min(2, window.devicePixelRatio || 1); VW = innerWidth; VH = innerHeight; cv.width = VW * DPR; cv.height = VH * DPR; shadowCv = null; lightCv = null; }
addEventListener('resize', resize);
const CAM = { x: 3150, y: 2250, z: 1, hw: 600, hh: 400, mouse: null, sx: 0, sy: 0 };
let shadowCv = null, lightCv = null, mouseScreen = null;
addEventListener('mousemove', e => { mouseScreen = { x: e.clientX, y: e.clientY }; });

function camTick(dt) {
  const v = Player.veh, tx = v ? v.x + v.vx * .42 : Player.x + Player.vx * .15, ty = v ? v.y + v.vy * .42 : Player.y + Player.vy * .15;
  CAM.x += (tx - CAM.x) * Math.min(1, dt * 4.5); CAM.y += (ty - CAM.y) * Math.min(1, dt * 4.5);
  const sp = v ? Math.hypot(v.vx, v.vy) : 0;
  const base = clamp(Math.min(VW, VH * 1.45) / 1050, .62, 1.5);
  const tz = (v ? 1.02 - Math.min(.36, sp / 650) - (v.d.L > 70 ? .12 : 0) : 1.16) * base * (G.mapZoom || 1);
  CAM.z += (tz - CAM.z) * Math.min(1, dt * 1.8);
  CAM.hw = VW / 2 / CAM.z; CAM.hh = VH / 2 / CAM.z;
  CAM.sx = (Math.random() - .5) * G.shake; CAM.sy = (Math.random() - .5) * G.shake; G.shake *= Math.exp(-7 * dt);
  if (mouseScreen) CAM.mouse = { x: CAM.x + (mouseScreen.x - VW / 2) / CAM.z, y: CAM.y + (mouseScreen.y - VH / 2) / CAM.z };
  Audio2.setListener(CAM.x, CAM.y);
}
const worldT = (g, s) => { s = s || DPR; g.setTransform(s * CAM.z, 0, 0, s * CAM.z, s * (VW / 2 - CAM.x * CAM.z + CAM.sx), s * (VH / 2 - CAM.y * CAM.z + CAM.sy)); };
const PKz = () => .00125 * Math.min(1.2, CAM.z);
function proj(x, y, h) { const k = 1 + h * PKz(); return [CAM.x + (x - CAM.x) * k, CAM.y + (y - CAM.y) * k, k]; }
const inView = (x, y, m) => Math.abs(x - CAM.x) < CAM.hw + m && Math.abs(y - CAM.y) < CAM.hh + m;

/* ---------------- buildings ---------------- */
const WALLCOL = { house: '#efe6d6', dining: '#d8cfbc', office: '#cfd8de', club: '#e6d8bc', shop: '#e8c9a0', clinic: '#f4f4f4', laundry: '#dfe8ec', hall: '#ddd0b8', kiosk: '#f0e2c4', gan: '#ffe9a8', school: '#f0dfb0', shelter: '#a9a9a0', cowshed: '#b9b4a8', metal: '#b9c0c4', garage: '#9aa2a8', coop: '#f0f2f2', factory: '#a9b0b4', tower: '#c9d2d8', canopy: '#ddd', busstop: '#9cc', booth: '#eee', caravan: '#e6e2d6', shed: '#9a6a4a', shop2: '#f4f4f4', silo: '#c8ced2', tank: '#c0392b', watertower: '#d8d0c0' };
function wallShade(col, nx, ny) { return shade(col, (-nx * .55 - ny * .75) * .22 - .1); }
function drawBuilding(g, b, night) {
  const pk = PKz(), k = 1 + b.h * pk;
  const P = (x, y) => [CAM.x + (x - CAM.x) * k, CAM.y + (y - CAM.y) * k];
  const wc = b.wallCol || WALLCOL[b.kind] || '#ddd';
  if (b.shape === 'circle') {
    const c0 = [b.x, b.y], c1 = P(b.x, b.y), r1 = b.r * k, dx = c1[0] - c0[0], dy = c1[1] - c0[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    const gr = g.createLinearGradient(c0[0] + nx * b.r, c0[1] + ny * b.r, c0[0] - nx * b.r, c0[1] - ny * b.r);
    gr.addColorStop(0, shade(wc, .25)); gr.addColorStop(.45, shade(wc, -.05)); gr.addColorStop(1, shade(wc, -.45));
    g.fillStyle = gr; g.beginPath(); g.arc(c0[0], c0[1], b.r, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(c0[0] + nx * b.r, c0[1] + ny * b.r); g.lineTo(c1[0] + nx * r1, c1[1] + ny * r1); g.lineTo(c1[0] - nx * r1, c1[1] - ny * r1); g.lineTo(c0[0] - nx * b.r, c0[1] - ny * b.r); g.closePath(); g.fill();
    if (b.kind === 'silo' || b.kind === 'watertower') { g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = .8; for (let t = .2; t < 1; t += .2) { const cx = lerp(c0[0], c1[0], t), cy = lerp(c0[1], c1[1], t), rr = lerp(b.r, r1, t); g.beginPath(); g.moveTo(cx + nx * rr, cy + ny * rr); g.lineTo(cx - nx * rr, cy - ny * rr); g.stroke(); } }
    const s = SPR.roof(b); g.drawImage(s.cv, c1[0] - s.w / 2 * k, c1[1] - s.h / 2 * k, s.w * k, s.h * k);
    return;
  }
  const base = b.poly, top = base.map(p => P(p[0], p[1]));
  if (b.roofOnly) {
    g.fillStyle = '#8a8a8a';
    for (let i = 0; i < 4; i++) { const p = base[i], q = [lerp(p[0], b.x, .12), lerp(p[1], b.y, .12)], t = P(q[0], q[1]); g.beginPath(); g.moveTo(q[0] - 2, q[1]); g.lineTo(q[0] + 2, q[1]); g.lineTo(t[0] + 2.5, t[1]); g.lineTo(t[0] - 2.5, t[1]); g.closePath(); g.fill(); }
  } else {
    const floors = Math.max(1, Math.round(b.h / 26));
    for (let i = 0; i < 4; i++) {
      const a = base[i], c = base[(i + 1) % 4], mx = (a[0] + c[0]) / 2, my = (a[1] + c[1]) / 2;
      let nx = mx - b.x, ny = my - b.y; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
      if (nx * (CAM.x - mx) + ny * (CAM.y - my) <= 0) continue;
      const A = a, B = c, A2 = top[i], B2 = top[(i + 1) % 4];
      g.fillStyle = wallShade(b.kind === 'cowshed' ? '#5a5248' : wc, nx, ny);
      g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.lineTo(B2[0], B2[1]); g.lineTo(A2[0], A2[1]); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = .7; g.stroke();
      // windows
      const L = Math.hypot(c[0] - a[0], c[1] - a[1]);
      const Q = (u, v) => [lerp(lerp(A[0], B[0], u), lerp(A2[0], B2[0], u), v), lerp(lerp(A[1], B[1], u), lerp(A2[1], B2[1], u), v)];
      const quad = (u0, u1, v0, v1) => { const p1 = Q(u0, v0), p2 = Q(u1, v0), p3 = Q(u1, v1), p4 = Q(u0, v1); g.beginPath(); g.moveTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]); g.lineTo(p3[0], p3[1]); g.lineTo(p4[0], p4[1]); g.closePath(); g.fill(); };
      if (b.kind === 'cowshed') { g.fillStyle = '#7a6e5e'; for (let u = 0; u <= 1; u += 1 / Math.round(L / 30)) quad(u - .006, u + .006, 0, 1); continue; }
      if (b.kind === 'shelter') continue;
      const step = b.kind === 'factory' || b.kind === 'metal' || b.kind === 'coop' ? 40 : b.kind === 'tower' ? 15 : 22;
      const n = Math.max(1, Math.floor(L / step)), ww = Math.min(.38, 8 / L * (b.kind === 'tower' ? 1 : 1.1)) * (b.kind === 'factory' || b.kind === 'metal' ? 2.4 : 1);
      for (let f = 0; f < floors; f++) {
        const v0 = (f + .3) / floors, v1 = (f + .72) / floors;
        for (let j = 0; j < n; j++) {
          const u = (j + .5) / n; const lit = night > .2 && ((b.id * 7 + i * 13 + j * 5 + f * 3) % 5) < 2;
          if (b.kind === 'coop') { g.fillStyle = '#555'; quad(u - ww / 2, u + ww / 2, v0 + .1, v1 - .1); continue; }
          g.fillStyle = lit ? `rgba(255,214,120,${.55 + .45 * night})` : (b.kind === 'factory' || b.kind === 'metal' ? '#6c8496' : '#4a6274');
          quad(u - ww / 2, u + ww / 2, v0, v1);
          if (!lit && b.kind === 'house') { g.fillStyle = 'rgba(255,255,255,.25)'; quad(u - ww / 2, u - ww / 4, v0 + (v1 - v0) * .5, v1); }
        }
      }
      if (b.kind === 'house' && i === 2 % 4) { g.fillStyle = '#6a4a2a'; quad(.44, .56, 0, .62 / floors); }
      if (b.kind === 'garage' || (b.kind === 'metal' && i % 2 === 0)) { g.fillStyle = '#5a6066'; quad(.3, .7, 0, .7 / floors); g.strokeStyle = 'rgba(0,0,0,.25)'; }
    }
  }
  // roof
  const s = SPR.roof(b);
  g.save(); g.translate(CAM.x, CAM.y); g.scale(k, k); g.translate(-CAM.x, -CAM.y); g.translate(b.x, b.y); g.rotate(b.ang);
  if (b.roofOnly && Player.out <= 0 && shapePush(b, Player.x, Player.y, 4)) g.globalAlpha = .45;
  g.drawImage(s.cv, -s.w / 2, -s.h / 2, s.w, s.h); g.globalAlpha = 1;
  g.restore();
}
function drawTree(g, o, night) {
  const d = SPR.TREE[o.t]; if (!d) return;
  let h = o.h, bx = o.x, by = o.y;
  if (o.broken) { const f = FX.falling.find(f => f.o === o); if (!f || f.t >= 1) return; const t = f.t * f.t; bx = o.x + Math.cos(f.a) * h * .55 * t; by = o.y + Math.sin(f.a) * h * .55 * t; h = h * (1 - t); }
  const [cx, cy, k] = proj(bx, by, h);
  if (o.t !== 'parasol') { g.strokeStyle = o.t === 'palm' ? '#8a6a3a' : o.t === 'euc' ? '#c9b8a0' : '#6d4c2a'; g.lineWidth = (o.t === 'palm' ? 3 : o.t === 'euc' ? 3.4 : 2.6) * k; g.beginPath(); g.moveTo(o.x, o.y); g.lineTo(cx, cy); g.stroke(); }
  const s = SPR.tree(o.t, Math.floor(o.v * 3)), under = !Player.veh && Player.out <= 0 && dist(Player.x, Player.y, o.x, o.y) < d.r * .8;
  if (under) g.globalAlpha = .5;
  const sway = Math.sin(G.time * (1.2 + o.v) + o.id) * .03 * (1 + ENV.wind * 2);
  g.save(); g.translate(cx, cy); g.rotate(sway + o.v * 6); g.drawImage(s.cv, -s.w / 2 * k, -s.h / 2 * k, s.w * k, s.h * k); g.restore();
  if (night > .1) { g.fillStyle = `rgba(10,15,40,${night * .25})`; g.beginPath(); g.arc(cx, cy, d.r * k * .9, 0, TAU); g.fill(); }
  g.globalAlpha = 1;
}
function drawFallenTree(g, o) {
  const d = SPR.TREE[o.t]; if (!d) return; const f = FX.falling.find(f => f.o === o); if (f && f.t < 1) return;
  const a = o.fallA ?? (o.fallA = o.v * TAU), L = o.h * .55;
  g.strokeStyle = o.t === 'euc' ? '#c9b8a0' : '#6d4c2a'; g.lineWidth = 4; g.beginPath(); g.moveTo(o.x, o.y); g.lineTo(o.x + Math.cos(a) * L, o.y + Math.sin(a) * L); g.stroke();
  g.fillStyle = '#5a3a1a'; g.beginPath(); g.arc(o.x, o.y, 4, 0, TAU); g.fill();
  const s = SPR.tree(o.t, Math.floor(o.v * 3)); g.save(); g.translate(o.x + Math.cos(a) * (L + d.r * .4), o.y + Math.sin(a) * (L + d.r * .4)); g.rotate(a); g.scale(1, .7); g.drawImage(s.cv, -s.w / 2, -s.h / 2, s.w, s.h); g.restore();
}

/* ---------------- entities ---------------- */
function drawShadowBlob(g, x, y, rx, ry, a) { g.fillStyle = `rgba(0,0,0,${.22 * (1 - ENV.night * .6)})`; g.beginPath(); g.ellipse(x + ENV.sunX * 2, y - ENV.sunY * 2 + 1, rx, ry, a || 0, 0, TAU); g.fill(); }
function pedFrame(p, sheet) {
  if (p.state === 'ko') return sheet.ko;
  if (p.veh) return sheet.sit;
  if (p.swim) return sheet.swim;
  if (p.punch > 0) return sheet.punch;
  const sp = Math.hypot(p.vx, p.vy); if (sp < 6) return sheet.idle;
  return sheet.walk[Math.floor(p.walk) % SPR.PFRAMES];
}
function drawPerson(g, x, y, a, look, frameFn, ko, scale) {
  const sh = SPR.personSheet(look), fr = frameFn(sh);
  if (!ko) drawShadowBlob(g, x, y, 6, 4.5);
  g.save(); g.translate(x, y); g.rotate(a); const S = sh.S * (scale || 1); g.drawImage(fr, -S / 2, -S / 2, S, S); g.restore();
}
function drawPed(g, p) {
  if (p.animal) {
    const sh = SPR.animalSheet(p.type, p.v % 4), sp = Math.hypot(p.vx, p.vy);
    let fr = sh.walk[sp > 4 ? Math.floor(p.walk) % 6 : 0];
    if (p.type === 'peacock' && p.display > 0) fr = sh.extra;
    if (p.flying && sh.extra) { fr = sh.extra[Math.floor(p.walk) % 4]; drawShadowBlob(g, p.x + 20, p.y + 20, 8, 4); g.save(); const [x, y, k] = proj(p.x, p.y, 40); g.translate(x, y); g.rotate(p.a); g.drawImage(fr, -sh.S / 2 * k, -sh.S / 2 * k, sh.S * k, sh.S * k); g.restore(); return; }
    drawShadowBlob(g, p.x, p.y, p.r * 1.1, p.r * .7, p.a);
    g.save(); g.translate(p.x, p.y); g.rotate(p.a); if (p.state === 'ko') g.scale(1, -1); g.drawImage(fr, -sh.S / 2, -sh.S / 2, sh.S, sh.S); g.restore();
    return;
  }
  drawPerson(g, p.x, p.y, p.state === 'ko' ? p.id % 6 : p.a, p.look, sh => pedFrame(p, sh), p.state === 'ko');
  if (p.state === 'ko') drawStars(g, p.x, p.y - 10, p.id);
}
function drawStars(g, x, y, id) { const t = G.time * 5 + id; for (let i = 0; i < 3; i++) { const a = t + i * 2.09; g.fillStyle = i % 2 ? '#ffe14a' : '#fff'; g.save(); g.translate(x + Math.cos(a) * 8, y + Math.sin(a) * 3); g.rotate(t); g.fillRect(-1.6, -1.6, 3.2, 3.2); g.restore(); } }
function drawUmbrella(g, x, y, col) { g.save(); g.translate(x, y - 2); for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? shade(col, -.25) : col; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 10, i / 8 * TAU, (i + 1) / 8 * TAU); g.closePath(); g.fill(); } g.restore(); }
function drawVehicle(g, v) {
  const d = v.d, s = SPR.vehicle(v.type, v.col, v.dead);
  g.fillStyle = `rgba(0,0,0,${.28 * (1 - ENV.night * .5)})`; g.save(); g.translate(v.x + ENV.sunX * 3, v.y - ENV.sunY * 3 + 2); g.rotate(v.a); g.beginPath(); g.roundRect(-d.L / 2, -d.W / 2, d.L, d.W, 5); g.fill(); g.restore();
  g.save(); g.translate(v.x, v.y); g.rotate(v.a);
  g.drawImage(s.cv, -s.w / 2, -s.h / 2, s.w, s.h);
  if (d.rider && v.driver) { const lk = v.driver === 'player' ? PLAYER_LOOK : v.driver.look; const sh = SPR.personSheet(lk); const ox = v.type === 'kalnoit' ? -6 : v.type === 'atv' ? -2 : v.type === 'bike' ? -1 : -3; g.drawImage(sh.sit, ox - sh.S / 2, -sh.S / 2, sh.S, sh.S); }
  if (v.ctrl.thr < 0 && v.vf > 5 && v.driver && !v.dead) { g.fillStyle = 'rgba(255,40,30,.85)'; g.fillRect(-d.L / 2 - 1, -d.W / 2 + 2, 2, 4); g.fillRect(-d.L / 2 - 1, d.W / 2 - 6, 2, 4); }
  if (v.beacon) { const on = Math.floor(G.time * 6) % 2; g.fillStyle = on ? v.beacon : shade(v.beacon, -.5); g.beginPath(); g.arc(-d.L * .15, 0, 3, 0, TAU); g.fill(); }
  g.restore();
  if (v.stun > 0) drawStars(g, v.x, v.y - d.W / 2 - 6, v.id);
}

/* ---------------- ground-level props ---------------- */
function drawPropFlat(g, o) {
  if (o.h > 20 && !o.broken) { // tree base
    if (o.t === 'parasol') { const s = SPR.prop(o); g.drawImage(s.cv, o.x - s.w / 2, o.y - s.h / 2, s.w, s.h); return; }
    g.fillStyle = 'rgba(40,30,20,.5)'; g.beginPath(); g.arc(o.x, o.y, (o.r || 6) * .55, 0, TAU); g.fill(); return;
  }
  if (o.h > 20 && o.broken) { if (SPR.TREE[o.t]) drawFallenTree(g, o); return; }
  if (o.t === 'tamarisk' && !o.broken) { const s = SPR.tree('tamarisk', Math.floor(o.v * 3)); g.drawImage(s.cv, o.x - s.w / 2, o.y - s.h / 2, s.w, s.h); return; }
  const s = SPR.prop(o);
  g.save(); g.translate(o.x, o.y); if (o.ang) g.rotate(o.ang); g.drawImage(s.cv, -s.w / 2, -s.h / 2, s.w, s.h); g.restore();
  if (o.t === 'aerator') { g.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 4; i++) { const a = G.time * 3 + i * 1.57; g.beginPath(); g.arc(o.x + Math.cos(a) * 9, o.y + Math.sin(a) * 9, 2, 0, TAU); g.fill(); } }
  if (o.t === 'sprinkler' && !o.broken && !ENV.rain && ENV.time > 5 && ENV.time < 9) { const a = G.time * 2 + o.id; for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(200,235,255,.5)'; g.beginPath(); g.arc(o.x + Math.cos(a + i * .08) * i * 7, o.y + Math.sin(a + i * .08) * i * 7, 1.4, 0, TAU); g.fill(); } }
}

/* ---------------- main draw ---------------- */
const _vq = [], _vq2 = [];
const rainDrops = [], dustMotes = [];
function draw(dt) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.fillStyle = '#9a9060'; ctx.fillRect(0, 0, VW, VH);
  worldT(ctx); ctx.imageSmoothingEnabled = true;
  const m = 80, x0 = CAM.x - CAM.hw - m, y0 = CAM.y - CAM.hh - m, x1 = CAM.x + CAM.hw + m, y1 = CAM.y + CAM.hh + m;
  Ground.draw(ctx, CAM.x - CAM.hw - 10, CAM.y - CAM.hh - 10, CAM.x + CAM.hw + 10, CAM.y + CAM.hh + 10, G.state === 'play' ? 4 : 10);
  const night = ENV.night;
  pgrid.query(x0, y0, x1, y1, _vq2);
  // ---- shadows ----
  drawShadows(x0, y0, x1, y1);
  worldT(ctx);
  // ---- ground-level props ----
  const elevated = [];
  for (const o of _vq2) { drawPropFlat(ctx, o); if (o.h > 20) elevated.push(o); }
  // pickups / markers
  drawGroundMarkers(ctx);
  // ko peds then vehicles then peds
  for (const p of peds) if (p.state === 'ko' && !p.veh && inView(p.x, p.y, 30)) drawPed(ctx, p);
  for (const v of vehicles) if (!v.driver && inView(v.x, v.y, 70)) drawVehicle(ctx, v);
  for (const v of vehicles) if (v.driver && inView(v.x, v.y, 70)) drawVehicle(ctx, v);
  for (const p of peds) if (p.state !== 'ko' && !p.veh && !p.flying && inView(p.x, p.y, 30)) drawPed(ctx, p);
  if (!Player.veh && G.state !== 'title') {
    const pl = Player; const ko = pl.out > 0;
    if (!(pl.flash > 0 && Math.floor(G.time * 20) % 2)) drawPerson(ctx, pl.x, pl.y, ko ? 1 : pl.a, PLAYER_LOOK, sh => ko ? sh.ko : pl.swim ? sh.swim : pl.punch > 0 ? sh.punch : pl.throwT > 0 ? sh.throw : Math.hypot(pl.vx, pl.vy) < 6 ? sh.idle : sh.walk[Math.floor(pl.walk) % SPR.PFRAMES], ko);
    if (!ko && pl.wp !== 'fist') { const ic = SPR.icon(pl.wp); ctx.save(); ctx.translate(pl.x + Math.cos(pl.a) * 6 + Math.cos(pl.a + 1.57) * 6, pl.y + Math.sin(pl.a) * 6 + Math.sin(pl.a + 1.57) * 6); ctx.rotate(pl.a); ctx.drawImage(ic.cv, -5, -5, 10, 10); ctx.restore(); }
  }
  for (const p of peds) if (p.umbrella && p.state !== 'ko' && !p.veh && inView(p.x, p.y, 20)) drawUmbrella(ctx, p.x, p.y, ['#c0392b', '#2a6ab8', '#16a085', '#8e44ad'][p.id % 4]);
  // projectiles
  for (const s of Combat.shots) { ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a + G.time * 25); ctx.fillStyle = '#fff'; ctx.fillRect(-4, -3, 8, 6); ctx.fillStyle = '#e33'; ctx.fillRect(-3, -2, 2, 1.4); ctx.fillRect(0, 0, 2, 1.4); ctx.fillStyle = '#ff8a1a'; ctx.fillRect(2, -2, 1.5, 1.4); ctx.restore(); }
  for (const b of Combat.balloons) { ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(b.x, b.y, 4, 2.5, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#4db8f0'; ctx.beginPath(); ctx.arc(b.x, b.y - b.h, 5, 0, TAU); ctx.fill(); ctx.fillStyle = '#d6f2ff'; ctx.fillRect(b.x - 2, b.y - b.h - 3, 2, 2); }
  for (const b of Combat.tomatoes) { ctx.fillStyle = '#d32'; ctx.beginPath(); ctx.arc(b.x, b.y - b.h, 3, 0, TAU); ctx.fill(); }
  // ground particles
  for (const p of FX.parts) { if (p.k === 'smoke' || !inView(p.x, p.y, 10)) continue; ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.col; ctx.fillRect(p.x - p.sz / 2, p.y - p.z * .6 - p.sz / 2, p.sz, p.sz); }
  ctx.globalAlpha = 1;
  // ---- elevated: buildings & canopies sorted far -> near ----
  bgrid.query(x0 - 150, y0 - 150, x1 + 150, y1 + 150, _vq);
  for (const b of _vq) elevated.push(b);
  for (const e of elevated) e._d = -dist2(e.x, e.y, CAM.x, CAM.y) - (e.h || 0) * 30;
  elevated.sort((a, b) => a._d - b._d);
  for (const e of elevated) { if (e.kind !== undefined) drawBuilding(ctx, e, night); else if (!e.broken || FX.falling.length) drawTree(ctx, e, night); }
  // flying birds above
  for (const p of peds) if (p.flying && inView(p.x, p.y, 60)) drawPed(ctx, p);
  // smoke & rain splashes
  for (const p of FX.parts) { if (p.k !== 'smoke' || !inView(p.x, p.y, 20)) continue; const a = Math.min(.6, p.life / p.max * .6); ctx.fillStyle = p.col + a + ')'; ctx.beginPath(); ctx.arc(p.x, p.y - p.z, p.sz, 0, TAU); ctx.fill(); }
  if (ENV.rain > .05) rainSplashes(dt);
  // ---- lighting / weather ----
  drawLighting(night);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  drawWeather(dt);
  // ---- world-space labels on top ----
  worldT(ctx);
  drawWorldText(ctx);
}
function drawShadows(x0, y0, x1, y1) {
  if (ENV.shadowA < .02 && ENV.clouds < .05) return;
  const S = .5;
  if (!shadowCv) { shadowCv = mkCanvas(VW * S * DPR, VH * S * DPR); }
  const g = shadowCv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, shadowCv.width, shadowCv.height);
  worldT(g, S * DPR);
  const sx = ENV.sunX * ENV.shadowLen, sy = ENV.sunY * ENV.shadowLen * -1;
  g.fillStyle = '#000';
  if (ENV.shadowA > .02) {
    bgrid.query(x0 - 200, y0 - 200, x1 + 200, y1 + 200, _vq);
    for (const b of _vq) {
      const ox = sx * b.h, oy = sy * b.h;
      if (b.shape === 'circle') { g.beginPath(); g.arc(b.x, b.y, b.r, 0, TAU); g.arc(b.x + ox, b.y + oy, b.r, 0, TAU); g.fill(); const l = Math.hypot(ox, oy) || 1, nx = -oy / l * b.r, ny = ox / l * b.r; g.beginPath(); g.moveTo(b.x + nx, b.y + ny); g.lineTo(b.x + ox + nx, b.y + oy + ny); g.lineTo(b.x + ox - nx, b.y + oy - ny); g.lineTo(b.x - nx, b.y - ny); g.fill(); continue; }
      const P = b.poly;
      if (b.roofOnly) { g.beginPath(); P.forEach((p, i) => i ? g.lineTo(p[0] + ox, p[1] + oy) : g.moveTo(p[0] + ox, p[1] + oy)); g.closePath(); g.fill(); continue; }
      for (let i = 0; i < 4; i++) { const a = P[i], c = P[(i + 1) % 4]; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(c[0], c[1]); g.lineTo(c[0] + ox, c[1] + oy); g.lineTo(a[0] + ox, a[1] + oy); g.closePath(); g.fill(); }
      g.beginPath(); P.forEach((p, i) => i ? g.lineTo(p[0] + ox, p[1] + oy) : g.moveTo(p[0] + ox, p[1] + oy)); g.closePath(); g.fill();
    }
    for (const o of _vq2) { if (o.h <= 20 || o.broken) continue; const d = SPR.TREE[o.t]; if (!d) continue; g.beginPath(); g.ellipse(o.x + sx * o.h * .8, o.y + sy * o.h * .8, d.r * .85, d.r * .75, 0, 0, TAU); g.fill(); g.lineWidth = 3; g.strokeStyle = '#000'; g.beginPath(); g.moveTo(o.x, o.y); g.lineTo(o.x + sx * o.h * .8, o.y + sy * o.h * .8); g.stroke(); }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = ENV.shadowA; ctx.drawImage(shadowCv, 0, 0, cv.width, cv.height); ctx.globalAlpha = 1;
  // cloud shadows (soft)
  if (ENV.clouds > .05 && ENV.night < .9) {
    worldT(ctx);
    for (const c of ENV.cloudList) { if (!inView(c.x, c.y, c.r)) continue; const gr = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r); gr.addColorStop(0, `rgba(0,0,20,${.16 * c.s * (1 - ENV.night)})`); gr.addColorStop(1, 'rgba(0,0,20,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(c.x, c.y, c.r, c.r * .7, 0, 0, TAU); ctx.fill(); }
  }
}
function drawGroundMarkers(g) {
  const t = G.time;
  for (const c of Pickups.coins) { if (!inView(c.x, c.y, 10)) continue; const s = SPR.icon('coin'), b = Math.abs(Math.sin(t * 4 + c.ph)) * 2; g.drawImage(s.cv, c.x - 5, c.y - 5 - b, 10, 10); }
  for (const it of Pickups.items) { if (!it.alive || !inView(it.x, it.y, 20)) continue; const ic = it.t === 'balloon' ? 'balloon' : it.t; const s = SPR.icon(ic), b = Math.sin(t * 3 + it.ph) * 2.5;
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(it.x, it.y + 8, 8, 3, 0, 0, TAU); g.fill();
    if (it.t === 'rampage' || it.t === 'egg') { g.fillStyle = it.t === 'egg' ? 'rgba(255,215,0,.25)' : 'rgba(180,90,255,.3)'; g.beginPath(); g.arc(it.x, it.y, 14 + Math.sin(t * 5) * 3, 0, TAU); g.fill(); }
    g.save(); g.translate(it.x, it.y + b); if (it.t === 'rampage') g.rotate(Math.sin(t * 2) * .3); g.drawImage(s.cv, -9, -9, 18, 18); g.restore(); }
  if (!G.mission) for (const ph of MAP.phones) { if (!inView(ph.x, ph.y, 30)) continue; const s = SPR.icon('phone'); g.fillStyle = rgba(FACT[ph.f].c, .25 + .2 * Math.sin(t * 4)); g.beginPath(); g.arc(ph.x, ph.y, 18, 0, TAU); g.fill(); g.drawImage(s.cv, ph.x - 8, ph.y - 8, 16, 16); }
  for (const s of MAP.sprays) { if (!inView(s.x, s.y, 50)) continue; g.strokeStyle = 'rgba(255,210,60,.8)'; g.lineWidth = 3; g.setLineDash([10, 8]); g.lineDashOffset = -t * 20; g.beginPath(); g.arc(s.x, s.y, s.r, 0, TAU); g.stroke(); g.setLineDash([]); if (G.sprayProg > 0) { g.strokeStyle = '#9be26b'; g.lineWidth = 5; g.beginPath(); g.arc(s.x, s.y, s.r - 6, -Math.PI / 2, -Math.PI / 2 + G.sprayProg * TAU); g.stroke(); } }
  for (const s of MAP.shops) { if (!inView(s.x, s.y, 20)) continue; g.fillStyle = 'rgba(155,226,107,.25)'; g.beginPath(); g.arc(s.x, s.y, 12 + Math.sin(t * 3) * 2, 0, TAU); g.fill(); g.fillStyle = '#9be26b'; g.font = 'bold 12px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('₪', s.x, s.y); }
  if (G.mission) for (const mk of G.mission.markers()) { if (!mk) continue; const r = 20 + Math.sin(t * 5) * 3, col = mk.dim ? 'rgba(255,225,74,.35)' : '#ffe14a'; g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.arc(mk.x, mk.y, r, 0, TAU); g.stroke(); g.fillStyle = mk.dim ? 'rgba(255,225,74,.08)' : 'rgba(255,225,74,.18)'; g.fill(); }
}
function rainSplashes(dt) {
  for (let i = 0; i < 30 * ENV.rain; i++) { const x = CAM.x + rnd(-CAM.hw, CAM.hw), y = CAM.y + rnd(-CAM.hh, CAM.hh); ctx.strokeStyle = 'rgba(210,225,240,.45)'; ctx.lineWidth = .8; ctx.beginPath(); ctx.ellipse(x, y, rnd(1.5, 4), rnd(1, 2.5), 0, 0, TAU); ctx.stroke(); }
}
function drawLighting(night) {
  const dark = night * .78 + ENV.rain * .12 * (1 - night) + ENV.hamsin * .05;
  if (dark < .03) return;
  const S = .5;
  if (!lightCv) lightCv = mkCanvas(VW * S, VH * S);
  const g = lightCv.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, lightCv.width, lightCv.height);
  g.fillStyle = `rgba(${8 + ENV.hamsin * 40 | 0},${12 + ENV.hamsin * 20 | 0},${36 - ENV.hamsin * 20 | 0},${dark})`; g.fillRect(0, 0, lightCv.width, lightCv.height);
  if (night > .15) {
    g.setTransform(S * CAM.z, 0, 0, S * CAM.z, S * (VW / 2 - CAM.x * CAM.z), S * (VH / 2 - CAM.y * CAM.z));
    g.globalCompositeOperation = 'destination-out';
    const glow = (x, y, r, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
    for (const o of _vq2) if (o.t === 'lamp' && !o.broken) glow(o.x, o.y, 120, .9);
    for (const b of _vq) if (!b.roofOnly && b.id % 3 !== 0) glow(b.x, b.y, b.rad * 1.15 + 20, .35); else if (b.roofOnly && b.kind === 'canopy') glow(b.x, b.y, 220, 1);
    for (const v of vehicles) {
      if (!inView(v.x, v.y, 200) || !v.driver || v.dead || !v.d.lights) continue;
      const c = Math.cos(v.a), s = Math.sin(v.a), fx = v.x + c * v.d.L / 2, fy = v.y + s * v.d.L / 2;
      g.save(); g.beginPath(); g.moveTo(fx, fy); g.arc(fx, fy, 230, v.a - .42, v.a + .42); g.closePath(); g.clip();
      const gr = g.createRadialGradient(fx, fy, 0, fx, fy, 230); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(fx - 240, fy - 240, 480, 480); g.restore();
      glow(v.x, v.y, v.d.L * .8, .5);
    }
    glow(Player.x, Player.y, 70, .55);
    g.globalCompositeOperation = 'source-over';
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(lightCv, 0, 0, cv.width, cv.height);
  if (night > .15) { // additive glow bulbs
    worldT(ctx); ctx.globalCompositeOperation = 'lighter';
    for (const o of _vq2) if (o.t === 'lamp' && !o.broken) { const [x, y] = proj(o.x, o.y, 30); const gr = ctx.createRadialGradient(x, y, 0, x, y, 26); gr.addColorStop(0, `rgba(255,220,140,${.7 * night})`); gr.addColorStop(1, 'rgba(255,200,100,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, 26, 0, TAU); ctx.fill(); ctx.strokeStyle = `rgba(80,80,80,${night * .5})`; }
    for (const v of vehicles) { if (!inView(v.x, v.y, 60) || !v.driver || v.dead || !v.d.lights) continue; const c = Math.cos(v.a), s = Math.sin(v.a); for (const o of [-1, 1]) { const x = v.x + c * v.d.L / 2 - s * o * v.d.W * .32, y = v.y + s * v.d.L / 2 + c * o * v.d.W * .32; const gr = ctx.createRadialGradient(x, y, 0, x, y, 12); gr.addColorStop(0, `rgba(255,250,220,${.8 * night})`); gr.addColorStop(1, 'rgba(255,250,220,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, 12, 0, TAU); ctx.fill(); } }
    for (const v of vehicles) if (v.beacon && inView(v.x, v.y, 60) && Math.floor(G.time * 6) % 2) { const gr = ctx.createRadialGradient(v.x, v.y, 0, v.x, v.y, 60); gr.addColorStop(0, rgba(v.beacon, .6)); gr.addColorStop(1, rgba(v.beacon, 0)); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(v.x, v.y, 60, 0, TAU); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over';
  }
}
function drawWeather(dt) {
  const t = ENV.time;
  const dusk = Math.max(0, 1 - Math.abs(t - 19) / 1.6), dawn = Math.max(0, 1 - Math.abs(t - 6) / 1.4);
  if (dusk + dawn > .01) { ctx.fillStyle = `rgba(255,${dusk ? 120 : 170},70,${.17 * Math.max(dusk, dawn)})`; ctx.fillRect(0, 0, VW, VH); }
  if (ENV.rain > .02) {
    ctx.fillStyle = `rgba(50,65,85,${.2 * ENV.rain})`; ctx.fillRect(0, 0, VW, VH);
    while (rainDrops.length < 320 * ENV.rain) rainDrops.push({ x: Math.random() * VW, y: Math.random() * VH, s: rnd(.7, 1.3) });
    if (rainDrops.length > 320 * ENV.rain + 5) rainDrops.length = Math.floor(320 * ENV.rain);
    ctx.strokeStyle = 'rgba(190,210,235,.45)'; ctx.lineWidth = 1; ctx.beginPath();
    for (const d of rainDrops) { d.x += (ENV.windX * 160 - 60) * dt * d.s; d.y += 900 * dt * d.s; if (d.y > VH) { d.y = -10; d.x = Math.random() * VW; } if (d.x < -20) d.x = VW + 10; if (d.x > VW + 20) d.x = -10; ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - (ENV.windX * 160 - 60) * .02, d.y - 16 * d.s); }
    ctx.stroke();
  }
  if (ENV.hamsin > .02) {
    ctx.fillStyle = `rgba(214,160,90,${.3 * ENV.hamsin})`; ctx.fillRect(0, 0, VW, VH);
    while (dustMotes.length < 160 * ENV.hamsin) dustMotes.push({ x: Math.random() * VW, y: Math.random() * VH, s: rnd(.5, 1.5) });
    ctx.fillStyle = `rgba(235,200,140,${.5 * ENV.hamsin})`;
    for (const d of dustMotes) { d.x += 380 * dt * d.s; d.y += Math.sin(G.time * 2 + d.s * 9) * 20 * dt; if (d.x > VW) { d.x = -5; d.y = Math.random() * VH; } ctx.fillRect(d.x, d.y, 3 * d.s, 1.2); }
    const gr = ctx.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * .25, VW / 2, VH / 2, Math.max(VW, VH) * .7); gr.addColorStop(0, 'rgba(180,120,60,0)'); gr.addColorStop(1, `rgba(150,95,45,${.55 * ENV.hamsin})`); ctx.fillStyle = gr; ctx.fillRect(0, 0, VW, VH);
  }
  if (ENV.fog > .02) { const gr = ctx.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * .15, VW / 2, VH / 2, Math.max(VW, VH) * .65); gr.addColorStop(0, `rgba(235,238,242,${.12 * ENV.fog})`); gr.addColorStop(1, `rgba(235,238,242,${.75 * ENV.fog})`); ctx.fillStyle = gr; ctx.fillRect(0, 0, VW, VH); }
  if (ENV.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${ENV.flash * .55})`; ctx.fillRect(0, 0, VW, VH); }
}
function drawWorldText(g) {
  const bub = (x, y, txt) => { g.font = 'bold 11px Arial'; g.direction = 'rtl'; const w = g.measureText(txt).width + 10; g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.roundRect(x - w / 2, y - 8, w, 16, 6); g.fill(); g.beginPath(); g.moveTo(x - 4, y + 7); g.lineTo(x + 2, y + 13); g.lineTo(x + 4, y + 7); g.fill(); g.fillStyle = '#1a1a1a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, x, y); };
  for (const p of peds) if (p.sayL > 0 && p.sayT && inView(p.x, p.y, 40)) bub(p.x, p.y - (p.veh ? 26 : 20), p.sayT);
  for (const f of FX.floaters) { if (!inView(f.x, f.y, 30)) continue; g.globalAlpha = Math.min(1, f.life * 2); textOut(g, f.text, f.x, f.y, 13, f.col, 'center', 'ltr'); g.globalAlpha = 1; }
  if (G.interact && !G.shopMenu) textOut(g, G.interact.t, Player.x, Player.y - 26, 12, '#fff', 'center', 'rtl');
}
function textOut(g, s, x, y, size, col, al, dir, bold) {
  g.font = `${bold === false ? '' : 'bold '}${size}px Arial, sans-serif`; g.direction = dir || 'rtl'; g.textAlign = al || 'center'; g.textBaseline = 'middle';
  g.lineWidth = Math.max(2, size / 4.5); g.strokeStyle = 'rgba(0,0,0,.8)'; g.lineJoin = 'round'; g.strokeText(s, x, y); g.fillStyle = col || '#fff'; g.fillText(s, x, y);
}
