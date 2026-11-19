'use strict';
/* ================================================================
   hud.js — HUD, radar, full map, menus, title screen
   ================================================================ */
const FONT = "'Rubik', 'Segoe UI', Arial, sans-serif";
function T(s, x, y, size, col, al, opts) {
  opts = opts || {}; ctx.font = `${opts.w || 700} ${size}px ${FONT}`; ctx.direction = opts.dir || 'rtl'; ctx.textAlign = al || 'center'; ctx.textBaseline = opts.base || 'middle';
  if (opts.stroke !== false) { ctx.lineWidth = Math.max(2.5, size / 5); ctx.strokeStyle = opts.sc || 'rgba(0,0,0,.85)'; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
  ctx.fillStyle = col || '#fff'; ctx.fillText(s, x, y);
}
function panel(x, y, w, h, a, r) { ctx.fillStyle = `rgba(12,16,22,${a ?? .62})`; ctx.beginPath(); ctx.roundRect(x, y, w, h, r ?? 10); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1; ctx.stroke(); }
function wrap(s, maxW, size) { ctx.font = `500 ${size}px ${FONT}`; const words = s.split(' '), lines = []; let cur = ''; for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; } if (cur) lines.push(cur); return lines; }
function star(x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 1.2; ctx.stroke(); }

function drawHUD(dt) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const pad = 16, small = VW < 700;
  // ---- money / health / wanted (top-right) ----
  T(`${G.money.toLocaleString('en-US')} ₪`, VW - pad, 30, small ? 26 : 34, '#ffd84a', 'right');
  if (G.comboT > 0 && G.mult > 1) T(`x${G.mult} קומבו`, VW - pad, 60, 16, '#ff9b4a', 'right');
  const bw = 180, bx = VW - pad - bw; let by = 74;
  panel(bx - 4, by - 4, bw + 8, Player.armor > 0 ? 30 : 20, .55, 6);
  ctx.fillStyle = '#3a1414'; ctx.fillRect(bx, by, bw, 12); ctx.fillStyle = Player.hp > 35 ? '#56d06e' : '#ff4a4a'; ctx.fillRect(bx, by, bw * clamp(Player.hp / 100, 0, 1), 12);
  ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(bx, by, bw * clamp(Player.hp / 100, 0, 1), 4);
  if (Player.armor > 0) { ctx.fillStyle = '#2e2a1a'; ctx.fillRect(bx, by + 15, bw, 6); ctx.fillStyle = '#e6dcb4'; ctx.fillRect(bx, by + 15, bw * Player.armor / 100, 6); }
  by += Player.armor > 0 ? 44 : 34;
  for (let i = 0; i < 5; i++) { const on = i < G.level, fl = on && G.level >= 3 && Math.floor(G.time * 5) % 2; star(VW - pad - 12 - i * 28, by, 11, on ? (fl ? '#ff3b2f' : '#ff9b2f') : 'rgba(255,255,255,.16)'); }
  if (G.level > 0) T('רמת רוגז', VW - pad - 152, by, 12, '#ffb38a', 'right');
  if (G.grab > 0) { by += 20; panel(bx - 4, by - 2, bw + 8, 16, .7, 5); ctx.fillStyle = '#ff3b3b'; ctx.fillRect(bx, by + 2, bw * G.grab, 8); T('עוצרים אותך!', bx + bw / 2, by + 6, 11, '#fff', 'center'); }
  // ---- clock & weather (top-left) ----
  panel(pad - 6, 12, 150, 44, .5, 8);
  T(clockStr(), pad + 40, 34, 20, ENV.night > .5 ? '#9fb8ff' : '#fff', 'center', { dir: 'ltr' });
  T(WEATHERS[ENV.weather].name, pad + 108, 28, 11, '#cfe3ff', 'center'); T('יום ' + ENV.day, pad + 108, 44, 11, '#aab', 'center');
  // respect bars
  let ry = 70;
  for (const k in FACT) { const r = G.respect[k]; T(FACT[k].n, pad + 140, ry, 11, FACT[k].c, 'right', { w: 600 }); ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(pad, ry - 3, 60, 6); ctx.fillStyle = r >= 0 ? FACT[k].c : '#ff4a4a'; ctx.fillRect(pad + 30, ry - 3, 30 * r / 100, 6); ry += 16; }
  T(`ביצי זהב ${Object.keys(G.eggs).length}/12`, pad + 140, ry + 2, 11, '#ffd84a', 'right', { w: 600 });
  // ---- weapon / vehicle (bottom-right) ----
  const wy = VH - pad - 30;
  panel(VW - pad - 190, wy - 26, 190, 52, .55, 10);
  if (Player.veh) {
    const v = Player.veh; T(v.d.name, VW - pad - 12, wy - 8, 18, '#fff', 'right');
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(VW - pad - 178, wy + 8, 120, 7); ctx.fillStyle = v.dead ? '#888' : v.hp / v.d.hp > .4 ? '#9be26b' : '#ff7a4a'; ctx.fillRect(VW - pad - 178, wy + 8, 120 * clamp(v.hp / v.d.hp, 0, 1), 7);
    T(v.dead ? 'מקולקל' : 'מצב', VW - pad - 12, wy + 12, 11, '#aaa', 'right', { stroke: false });
    if (Player.wp !== 'fist') { const ic = SPR.icon(Player.wp); ctx.drawImage(ic.cv, VW - pad - 186, wy - 22, 22, 22); }
  } else {
    const ic = SPR.icon(Player.wp); ctx.drawImage(ic.cv, VW - pad - 180, wy - 20, 40, 40);
    T(W_NAME[Player.wp], VW - pad - 12, wy - 8, 18, '#fff', 'right');
    const am = { fist: '', toto: `×${Player.inv.toto}`, soaker: `${Player.inv.soaker.toFixed(1)} ש'`, balloon: `×${Player.inv.balloon}`, ext: `${Player.inv.ext.toFixed(1)} ש'` }[Player.wp];
    T(am, VW - pad - 12, wy + 13, 13, '#ffd84a', 'right');
  }
  // ---- radar (bottom-left) ----
  drawRadar(pad + 92, VH - pad - 92, 86);
  if (G.districtT > 0) { ctx.globalAlpha = Math.min(1, G.districtT); T(G.district, pad + 92, VH - pad - 196, 18, '#fff', 'center'); ctx.globalAlpha = 1; }
  // ---- mission / rampage (top-center) ----
  let topY = 14;
  if (G.mission) {
    const m = G.mission, w = Math.min(460, VW - 40);
    panel(VW / 2 - w / 2, topY, w, 58, .66, 10); ctx.fillStyle = FACT[m.fac].c; ctx.fillRect(VW / 2 + w / 2 - 5, topY + 8, 3, 42);
    T(m.title, VW / 2 + w / 2 - 16, topY + 19, 17, FACT[m.fac].c, 'right'); T(m.hud(), VW / 2 + w / 2 - 16, topY + 41, 13, '#fff', 'right', { w: 500, stroke: false });
    T(Math.max(0, Math.ceil(m.t)) + '', VW / 2 - w / 2 + 34, topY + 24, 24, m.t < 15 ? '#ff6b6b' : '#fff', 'center', { dir: 'ltr' });
    T(m.reward + ' ₪', VW / 2 - w / 2 + 34, topY + 46, 12, '#ffd84a', 'center', { stroke: false });
    topY += 66;
  }
  if (G.rampage) { const R = G.rampage; panel(VW / 2 - 150, topY, 300, 40, .66, 10); T(`${R.d.title}  ${Math.ceil(R.t)}`, VW / 2, topY + 13, 15, '#c98bff', 'center'); T(`${Math.floor(R.n)}/${R.need}`, VW / 2, topY + 30, 13, '#fff', 'center'); topY += 48; }
  // ---- messages ----
  let my = topY + 16;
  for (const m of G.msgs) { ctx.globalAlpha = Math.min(1, m.life); T(m.t, VW / 2, my, 15, m.col, 'center', { w: 600 }); ctx.globalAlpha = 1; my += 23; }
  // ---- radio card ----
  if (G.radioCard > 0 && Player.veh) { const st = Audio2.station; ctx.globalAlpha = Math.min(1, G.radioCard); panel(VW / 2 - 160, VH - 120, 320, 54, .7, 12); T('📻 ' + st.name, VW / 2, VH - 102, 18, st.col, 'center'); T(st.tag, VW / 2, VH - 80, 12, '#ccc', 'center', { stroke: false, w: 500 }); ctx.globalAlpha = 1; }
  // ---- talk radio subtitles ----
  const sub = Player.veh && Audio2.subtitle; if (sub) { const lines = wrap(sub, Math.min(600, VW - 60), 15); const h = lines.length * 20 + 14; panel(VW / 2 - Math.min(320, VW / 2 - 20), VH - 170 - h, Math.min(640, VW - 40), h, .6, 8); lines.forEach((l, i) => T(l, VW / 2, VH - 170 - h + 17 + i * 20, 15, '#9fd8ff', 'center', { w: 500, stroke: false })); }
  // ---- vehicle toast ----
  if (G.vehToast) { ctx.globalAlpha = Math.min(1, G.vehToast.life); T(G.vehToast.t, VW / 2, VH * .72, 26, '#fff', 'center'); ctx.globalAlpha = 1; }
  // ---- banner ----
  if (G.banner) { const b = G.banner, a = Math.min(1, b.life * 1.5); ctx.globalAlpha = a; T(b.t, VW / 2, VH * .3, small ? 30 : 46, b.col, 'center', { w: 800 }); if (b.sub) T(b.sub, VW / 2, VH * .3 + (small ? 34 : 44), small ? 14 : 18, '#fff', 'center', { w: 500 }); ctx.globalAlpha = 1; }
  // ---- phone call ----
  if (G.phoneCall) {
    const c = G.phoneCall, w = Math.min(560, VW - 30), lines = wrap(c.text, w - 90, 15), h = 44 + lines.length * 21;
    const x = VW / 2 - w / 2, y = VH - h - 140; ctx.globalAlpha = Math.min(1, c.life * 2);
    panel(x, y, w, h, .82, 12); ctx.fillStyle = c.col; ctx.fillRect(x + w - 6, y + 10, 3, h - 20);
    const ic = SPR.icon('phone'); ctx.drawImage(ic.cv, x + 14, y + 12, 34, 34);
    T(c.who, x + w - 18, y + 22, 16, c.col, 'right'); lines.forEach((l, i) => T(l, x + w - 18, y + 46 + i * 21, 15, '#f0f0f0', 'right', { w: 500, stroke: false }));
    T('[Enter] סגירה', x + 60, y + h - 14, 11, '#888', 'center', { stroke: false }); ctx.globalAlpha = 1;
  }
  // ---- shop menu ----
  if (G.shopMenu) {
    const list = SHOP_ITEMS[G.shopMenu.kind] || [], w = 300, h = 40 + list.length * 26, x = VW / 2 - w / 2, y = VH * .58;
    panel(x, y, w, h, .82, 12); T(G.shopMenu.name, x + w - 16, y + 20, 16, '#9be26b', 'right');
    list.forEach(([n, c], i) => { const afford = G.money >= c; T(`[${i + 1}]`, x + 26, y + 46 + i * 26, 13, '#ffd84a', 'center', { dir: 'ltr', stroke: false }); T(n, x + w - 16, y + 46 + i * 26, 14, afford ? '#fff' : '#777', 'right', { w: 500, stroke: false }); T(c ? c + ' ₪' : 'חינם', x + 80, y + 46 + i * 26, 13, afford ? '#ffd84a' : '#775', 'center', { stroke: false }); });
  }
  // ---- faint/bust fade ----
  if (Player.out > 0) { ctx.fillStyle = `rgba(0,0,0,${Math.min(.85, (3.6 - Player.out) * .6)})`; ctx.fillRect(0, 0, VW, VH); if (G.banner) { const b = G.banner; T(b.t, VW / 2, VH * .3, 46, b.col, 'center'); T(b.sub, VW / 2, VH * .3 + 44, 18, '#fff', 'center', { w: 500 }); } }
  if (Player.hp < 30 && Player.out <= 0) { const gr = ctx.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * .3, VW / 2, VH / 2, Math.max(VW, VH) * .7); gr.addColorStop(0, 'rgba(255,0,0,0)'); gr.addColorStop(1, `rgba(200,0,0,${.25 + .12 * Math.sin(G.time * 6)})`); ctx.fillStyle = gr; ctx.fillRect(0, 0, VW, VH); }
}
function drawRadar(cx, cy, R) {
  const P0 = Player.veh || Player, sc = .16;
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fillStyle = '#1d2418'; ctx.fill(); ctx.clip();
  const mi = Ground.mini; if (mi) { ctx.imageSmoothingEnabled = true; ctx.globalAlpha = .92; ctx.drawImage(mi, cx - P0.x * sc, cy - P0.y * sc, WORLD_W * sc, WORLD_H * sc); ctx.globalAlpha = 1; }
  if (ENV.night > .3) { ctx.fillStyle = `rgba(0,10,40,${ENV.night * .35})`; ctx.fillRect(cx - R, cy - R, R * 2, R * 2); }
  const dot = (x, y, c, s, edge) => { let X = (x - P0.x) * sc, Y = (y - P0.y) * sc; const d = Math.hypot(X, Y); if (d > R - 6) { if (!edge) return; X *= (R - 6) / d; Y *= (R - 6) / d; } ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx + X, cy + Y, s, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1; ctx.stroke(); };
  for (const s of MAP.sprays) dot(s.x, s.y, '#ffd23f', 3.5);
  if (!G.mission) for (const ph of MAP.phones) dot(ph.x, ph.y, FACT[ph.f].c, 4.5, true);
  for (const it of Pickups.items) if (it.alive && it.t === 'rampage') dot(it.x, it.y, '#c98bff', 3.5);
  for (const p of peds) if (p.state === 'chase') dot(p.x, p.y, '#ff3b3b', 2.5);
  for (const v of vehicles) if (v.ai === 'chase') dot(v.x, v.y, Math.floor(G.time * 5) % 2 ? '#ff3b3b' : '#ffd23f', 3.5);
  if (G.mission) for (const m of G.mission.markers()) if (m) dot(m.x, m.y, m.dim ? '#a89a40' : '#ffe14a', 5, true);
  ctx.restore();
  ctx.save(); ctx.translate(cx, cy); ctx.rotate((Player.veh ? Player.veh.a : Player.a) + Math.PI / 2); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 5); ctx.lineTo(0, 2); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#000'; ctx.stroke(); ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
  T('צ', cx, cy - R + 10, 11, '#fff', 'center');
}
function drawBigMap() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.fillStyle = 'rgba(10,12,16,.92)'; ctx.fillRect(0, 0, VW, VH);
  const s = Math.min((VW - 60) / WORLD_W, (VH - 90) / WORLD_H), ox = (VW - WORLD_W * s) / 2, oy = (VH - WORLD_H * s) / 2 + 16;
  ctx.drawImage(Ground.mini, ox, oy, WORLD_W * s, WORLD_H * s); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(ox, oy, WORLD_W * s, WORLD_H * s);
  const at = (x, y) => [ox + x * s, oy + y * s];
  const lbl = (n, x, y, size, c) => { const [X, Y] = at(x, y); T(n, X, Y, size || 12, c || '#fff', 'center'); };
  lbl('הקיבוץ', MAP.KC[0], MAP.KC[1] - 200, 16); lbl('המשק', MAP.FC[0], MAP.FC[1]); lbl('אזור התעשייה', MAP.IC[0], MAP.IC[1]); lbl('ההרחבה', MAP.EC[0], MAP.EC[1] - 120); lbl('הוואדי', 900, 3420, 12, '#e9d7a8'); lbl('כביש 99', 5200, 4380, 12, '#ccc'); lbl('בריכות הדגים', 5800, 2300, 12, '#9cf'); lbl('המטעים', 1100, 700); lbl('שדות הצפון', 5000, 800);
  for (const s2 of MAP.sprays) { const [X, Y] = at(s2.x, s2.y); ctx.fillStyle = '#ffd23f'; ctx.fillRect(X - 4, Y - 4, 8, 8); }
  for (const ph of MAP.phones) { const [X, Y] = at(ph.x, ph.y); ctx.fillStyle = FACT[ph.f].c; ctx.beginPath(); ctx.arc(X, Y, 6, 0, TAU); ctx.fill(); ctx.strokeStyle = '#000'; ctx.stroke(); }
  for (const sh of MAP.shops) { const [X, Y] = at(sh.x, sh.y); T('₪', X, Y, 11, '#9be26b', 'center'); }
  for (const it of Pickups.items) if (it.alive && it.t === 'rampage') { const [X, Y] = at(it.x, it.y); ctx.fillStyle = '#c98bff'; ctx.beginPath(); ctx.arc(X, Y, 4, 0, TAU); ctx.fill(); }
  if (G.mission) for (const m of G.mission.markers()) if (m) { const [X, Y] = at(m.x, m.y); ctx.strokeStyle = '#ffe14a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X, Y, 8 + Math.sin(G.time * 5) * 2, 0, TAU); ctx.stroke(); }
  const P0 = Player.veh || Player, [X, Y] = at(P0.x, P0.y); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(X, Y, 6, 0, TAU); ctx.fill(); ctx.fillStyle = '#2f6fd0'; ctx.beginPath(); ctx.arc(X, Y, 4, 0, TAU); ctx.fill();
  T('מפת הקיבוץ', VW / 2, 24, 22, '#ffd84a', 'center');
  T('● טלפון משימות   ■ מוסך (מחיקת רוגז)   ₪ חנות   ● בלגן', VW / 2, VH - 16, 13, '#ccc', 'center', { w: 500 });
}

/* ---------------- menus ---------------- */
const MENU = { sel: 0, items: [], mode: 'title', anim: 0 };
function menuItems() {
  if (MENU.mode === 'title') return [Save.has() ? ['המשך', 'continue'] : null, ['משחק חדש', 'new'], ['איך משחקים', 'controls']].filter(Boolean);
  if (MENU.mode === 'pause') return [['חזרה למשחק', 'resume'], ['מפה', 'map'], [`מוזיקה: ${Math.round(Audio2.vol.music * 10)}`, 'music'], [`צלילים: ${Math.round(Audio2.vol.sfx * 10)}`, 'sfx'], ['איך משחקים', 'controls'], ['משחק חדש', 'new']];
  return [['חזרה', 'back']];
}
function menuInput() {
  const items = menuItems();
  if (P('ArrowDown', 'KeyS')) { MENU.sel = (MENU.sel + 1) % items.length; Audio2.sfx('click'); }
  if (P('ArrowUp', 'KeyW')) { MENU.sel = (MENU.sel - 1 + items.length) % items.length; Audio2.sfx('click'); }
  MENU.sel = Math.min(MENU.sel, items.length - 1);
  const it = items[MENU.sel];
  if ((P('ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD')) && (it[1] === 'music' || it[1] === 'sfx')) { const d = P('ArrowRight', 'KeyD') ? -.1 : .1; Audio2.vol[it[1]] = clamp(Math.round((Audio2.vol[it[1]] + d) * 10) / 10, 0, 1); Audio2.applyVol(); Audio2.sfx('click'); }
  if (P('Enter', 'Space') || (mouseClicked && MENU.hover !== undefined)) { if (mouseClicked && MENU.hover !== undefined) MENU.sel = MENU.hover; return menuItems()[MENU.sel][1]; }
  if (P('Escape') && MENU.mode !== 'title') return MENU.mode === 'controls' ? 'back' : 'resume';
  return null;
}
function drawMenu() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const title = MENU.mode === 'title';
  const gr = ctx.createLinearGradient(0, 0, 0, VH); gr.addColorStop(0, 'rgba(10,12,20,.72)'); gr.addColorStop(.5, 'rgba(10,12,20,.35)'); gr.addColorStop(1, 'rgba(10,12,20,.85)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, VW, VH);
  const tz = Math.min(1, VW / 820);
  if (title || MENU.mode === 'pause') {
    ctx.save(); ctx.translate(VW / 2, VH * .2); ctx.scale(tz, tz); ctx.rotate(-.025);
    ctx.font = `900 58px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = 'ltr';
    ctx.lineWidth = 10; ctx.strokeStyle = '#1a0e05'; ctx.strokeText('GRAND THEFT', 0, -40);
    let lg = ctx.createLinearGradient(0, -70, 0, -10); lg.addColorStop(0, '#fff3a0'); lg.addColorStop(1, '#f2a91a'); ctx.fillStyle = lg; ctx.fillText('GRAND THEFT', 0, -40);
    ctx.font = `900 96px ${FONT}`; ctx.lineWidth = 14; ctx.strokeText('KIBBUTZ', 0, 34);
    lg = ctx.createLinearGradient(0, -10, 0, 80); lg.addColorStop(0, '#9be26b'); lg.addColorStop(1, '#2f8a3a'); ctx.fillStyle = lg; ctx.fillText('KIBBUTZ', 0, 34);
    ctx.restore();
    T('גרנד תאפט קיבוץ', VW / 2, VH * .2 + 98 * tz, 30 * Math.max(.7, tz), '#fff', 'center', { w: 800 });
    if (title) T('"הדשא של השכן ירוק יותר. עד שעוברים עליו עם טרקטור"', VW / 2, VH * .2 + 136 * tz, 15, '#d8ecff', 'center', { w: 400, stroke: false });
  }
  if (MENU.mode === 'controls') { drawControls(); }
  const items = menuItems(), y0 = MENU.mode === 'controls' ? VH - 70 : VH * .52;
  MENU.hover = undefined;
  items.forEach(([n], i) => {
    const y = y0 + i * 46, sel = i === MENU.sel, w = 280;
    if (mouseScreen && Math.abs(mouseScreen.x - VW / 2) < w / 2 && Math.abs(mouseScreen.y - y) < 20) { MENU.hover = i; if (MENU.sel !== i) { MENU.sel = i; } }
    if (sel) { panel(VW / 2 - w / 2, y - 20, w, 40, .6, 20); ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.roundRect(VW / 2 + w / 2 - 8, y - 12, 4, 24, 2); ctx.fill(); }
    T(n, VW / 2, y, sel ? 24 : 20, sel ? '#ffd84a' : '#ddd', 'center');
  });
  if (title) T('v2 · חיצים + Enter · או עכבר', VW / 2, VH - 18, 12, '#888', 'center', { stroke: false, w: 400 });
}
function drawControls() {
  const L = [
    ['תנועה / נהיגה', 'WASD או חיצים'], ['ריצה', 'Shift'], ['כניסה / יציאה מרכב, טלפון', 'E'], ['תקיפה / ירי', 'J · Ctrl · עכבר'], ['החלפת נשק', 'Q / Tab'],
    ['בלם יד', 'Space'], ['צופר', 'H'], ['תחנת רדיו', 'R'], ['קנייה בחנות', '1 / 2 / 3'], ['מפה', 'M'], ['השהיה', 'Esc / P'],
  ];
  const w = Math.min(560, VW - 40), x = VW / 2 - w / 2, y = VH * .14, h = 70 + L.length * 26 + 120;
  panel(x, y, w, h, .82, 14);
  T('איך משחקים', VW / 2, y + 30, 24, '#ffd84a', 'center');
  L.forEach(([a, b], i) => { T(a, x + w - 24, y + 70 + i * 26, 15, '#fff', 'right', { w: 500, stroke: false }); T(b, x + 24, y + 70 + i * 26, 14, '#9fd8ff', 'left', { dir: 'ltr', stroke: false }); });
  const tips = ['נסיעה על הדשא, מכות ובלגן מעצבנים את הזקנים. כל כוכב מביא רודפים רציניים יותר.', 'במוסכים (ריבוע צהוב במפה) מוחקים את הרוגז ומתקנים את הרכב.', 'טלפונים צבעוניים = משימות של שלוש הקבוצות. בסמלים הסגולים יש "בלגן" נגד השעון.'];
  let ty = y + 70 + L.length * 26 + 14;
  for (const t of tips) for (const l of wrap(t, w - 48, 13)) { T(l, x + w - 24, ty, 13, '#cfcfcf', 'right', { w: 500, stroke: false }); ty += 19; }
}
