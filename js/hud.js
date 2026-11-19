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
  const pad = 16, small = VW < 700, tch = TOUCH.on; TOUCH.phoneBox = null;
  // ---- money / health / wanted (top-right) ----
  T(`${G.money.toLocaleString('en-US')} ₪`, VW - pad, 30, small ? 26 : 34, '#ffd84a', 'right');
  { const mw = ctx.measureText(`${G.money.toLocaleString('en-US')} ₪`).width; T('תקציב', VW - pad - mw - 8, 33, 12, '#d8c890', 'right', { w: 600 }); }
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
  let ry = tch ? TOUCH_RADAR.y + TOUCH_RADAR.r + 18 : 70;
  for (const k in FACT) { const r = G.respect[k]; T(FACT[k].n, pad + 140, ry, 11, FACT[k].c, 'right', { w: 600 }); ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(pad, ry - 3, 60, 6); ctx.fillStyle = r >= 0 ? FACT[k].c : '#ff4a4a'; ctx.fillRect(pad + 30, ry - 3, 30 * r / 100, 6); ry += 16; }
  T(`מספרי כביסה ${Object.keys(G.eggs).length}/12`, pad + 140, ry + 2, 11, '#ffd84a', 'right', { w: 600 });
  // ---- weapon / vehicle (bottom-right) ----
  const wy = VH - pad - 30;
  if (!tch) panel(VW - pad - 190, wy - 26, 190, 52, .55, 10);
  if (tch) { if (Player.veh) { const v = Player.veh; ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(VW / 2 - 50, VH - 12, 100, 5); ctx.fillStyle = v.dead ? '#888' : v.hp / v.d.hp > .4 ? '#9be26b' : '#ff7a4a'; ctx.fillRect(VW / 2 - 50, VH - 12, 100 * clamp(v.hp / v.d.hp, 0, 1), 5); } }
  else if (Player.veh) {
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
  if (tch) { drawRadar(TOUCH_RADAR.x, TOUCH_RADAR.y, TOUCH_RADAR.r); if (G.districtT > 0) { ctx.globalAlpha = Math.min(1, G.districtT); T(G.district, VW / 2, VH - 40, 16, '#fff', 'center'); ctx.globalAlpha = 1; } }
  else { drawRadar(pad + 92, VH - pad - 92, 86);
  if (G.districtT > 0) { ctx.globalAlpha = Math.min(1, G.districtT); T(G.district, pad + 92, VH - pad - 196, 18, '#fff', 'center'); ctx.globalAlpha = 1; } }
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
  // ---- harvest counter (combine with the PTO on) ----
  if (G.harvestT > 0) { ctx.globalAlpha = Math.min(1, G.harvestT); panel(VW / 2 - 90, VH - (TOUCH.on ? 96 : 150), 180, 34, .6, 10); T(`קציר: ${(G.harvest || 0).toFixed(1)} טון`, VW / 2, VH - (TOUCH.on ? 79 : 133), 17, '#ffd36a', 'center'); ctx.globalAlpha = 1; }
  // ---- vehicle toast ----
  if (G.vehToast) { ctx.globalAlpha = Math.min(1, G.vehToast.life); T(G.vehToast.t, VW / 2, VH * .72, 26, '#fff', 'center'); ctx.globalAlpha = 1; }
  // ---- banner ----
  if (G.banner) { const b = G.banner, a = Math.min(1, b.life * 1.5); ctx.globalAlpha = a; T(b.t, VW / 2, VH * .3, small ? 30 : 46, b.col, 'center', { w: 800 }); if (b.sub) T(b.sub, VW / 2, VH * .3 + (small ? 34 : 44), small ? 14 : 18, '#fff', 'center', { w: 500 }); ctx.globalAlpha = 1; }
  // ---- phone call ----
  if (G.phoneCall) {
    const c = G.phoneCall, w = Math.min(560, VW - 30), lines = wrap(c.text, w - 90, 15), h = 44 + lines.length * 21;
    const x = VW / 2 - w / 2, y = tch ? Math.max(70, VH - h - 110) : VH - h - 140; ctx.globalAlpha = Math.min(1, c.life * 2);
    if (tch) TOUCH.phoneBox = { x, y, w, h };
    panel(x, y, w, h, .82, 12); ctx.fillStyle = c.col; ctx.fillRect(x + w - 6, y + 10, 3, h - 20);
    const ic = SPR.icon('phone'); ctx.drawImage(ic.cv, x + 14, y + 12, 34, 34);
    T(c.who, x + w - 18, y + 22, 16, c.col, 'right'); lines.forEach((l, i) => T(l, x + w - 18, y + 46 + i * 21, 15, '#f0f0f0', 'right', { w: 500, stroke: false }));
    T(tch ? 'נגיעה לסגירה' : '[Enter] סגירה', x + 60, y + h - 14, 11, '#888', 'center', { stroke: false }); ctx.globalAlpha = 1;
  }
  // ---- shop menu ----
  if (G.shopMenu) {
    const list = SHOP_ITEMS[G.shopMenu.kind] || [], rh = tch ? 34 : 26, w = 300, h = 40 + list.length * rh, x = VW / 2 - w / 2, y = tch ? touchShopY(list.length) : VH * .58;
    panel(x, y, w, h, .82, 12); T(G.shopMenu.name, x + w - 16, y + 20, 16, '#9be26b', 'right');
    list.forEach(([n, c], i) => {
      const afford = G.money >= c, ry2 = y + 46 + i * rh;
      if (tch) { ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.beginPath(); ctx.roundRect(x + 8, ry2 - 14, w - 16, 28, 8); ctx.fill(); } else T(`[${i + 1}]`, x + 26, ry2, 13, '#ffd84a', 'center', { dir: 'ltr', stroke: false });
      T(n, x + w - 16, ry2, 14, afford ? '#fff' : '#777', 'right', { w: 500, stroke: false }); T(c ? c + ' ₪' : 'חינם', x + (tch ? 50 : 80), ry2, 13, afford ? '#ffd84a' : '#775', 'center', { stroke: false });
    });
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
  if (!G.mission) for (const ph of MAP.phones) dot(ph.x, ph.y, phoneFact(ph.f).c, 4.5, true);
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
  for (const ph of MAP.phones) { const [X, Y] = at(ph.x, ph.y); ctx.fillStyle = phoneFact(ph.f).c; ctx.beginPath(); ctx.arc(X, Y, 6, 0, TAU); ctx.fill(); ctx.strokeStyle = '#000'; ctx.stroke(); }
  for (const sh of MAP.shops) { const [X, Y] = at(sh.x, sh.y); T('₪', X, Y, 11, '#9be26b', 'center'); }
  for (const it of Pickups.items) if (it.alive && it.t === 'rampage') { const [X, Y] = at(it.x, it.y); ctx.fillStyle = '#c98bff'; ctx.beginPath(); ctx.arc(X, Y, 4, 0, TAU); ctx.fill(); }
  if (G.mission) for (const m of G.mission.markers()) if (m) { const [X, Y] = at(m.x, m.y); ctx.strokeStyle = '#ffe14a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X, Y, 8 + Math.sin(G.time * 5) * 2, 0, TAU); ctx.stroke(); }
  const P0 = Player.veh || Player, [X, Y] = at(P0.x, P0.y); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(X, Y, 6, 0, TAU); ctx.fill(); ctx.fillStyle = '#2f6fd0'; ctx.beginPath(); ctx.arc(X, Y, 4, 0, TAU); ctx.fill();
  { const [hx, hy] = at(MAP.hub[0], MAP.hub[1]); ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hx, hy, 7, 0, TAU); ctx.stroke(); T('חדר האוכל', hx, hy - 15, 11, '#ffd84a', 'center'); }
  T('מפת הקיבוץ', VW / 2, 24, 22, '#ffd84a', 'center');
  T('כל הדרכים מובילות לחדר האוכל', VW / 2, 46, 13, '#cfe9ff', 'center', { stroke: false });
  T('● טלפון משימות   ■ מוסך (מחיקת רוגז)   ₪ חנות   ● בלגן', VW / 2, VH - 16, 13, '#ccc', 'center', { w: 500 });
}

/* ---------------- logo ---------------- */
const LOGO = new Image(); LOGO.src = 'img/logo.webp';
// fit the sticker logo inside a box whose top-center is (cx, top); gentle bob so the title feels alive
function drawLogo(cx, top, maxW, maxH) {
  const r = LOGO.naturalWidth / LOGO.naturalHeight, h = Math.min(maxH, maxW / r), w = h * r;
  const t = performance.now() / 1000, bob = Math.sin(t * 1.3) * h * .008;
  ctx.save(); ctx.translate(cx, top + h / 2 + bob); ctx.rotate(Math.sin(t * .7) * .012);
  ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
  ctx.drawImage(LOGO, -w / 2, -h / 2, w, h);
  ctx.restore();
  return h;
}
/* ---------------- menus ---------------- */
const MENU = { sel: 0, items: [], mode: 'title', anim: 0, links: [] };
function menuItems() {
  const disc = [`⭐ שווה לנסות (${Discover.count()}/${Discover.FEATS.length})`, 'discover'], share = ['📤 שלחו לחבר', 'share'];
  if (MENU.mode === 'title') return [Save.has() ? ['המשך', 'continue'] : null, ['משחק חדש', 'new'], disc, ['איך משחקים', 'controls'], share, ['אודות', 'credits']].filter(Boolean);
  if (MENU.mode === 'pause') return [['חזרה למשחק', 'resume'], ['מפה', 'map'], disc, [`מוזיקה: ${Math.round(Audio2.vol.music * 10)}`, 'music'], [`צלילים: ${Math.round(Audio2.vol.sfx * 10)}`, 'sfx'], ['איך משחקים', 'controls'], share, ['אודות', 'credits'], ['משחק חדש', 'new']];
  if (MENU.mode === 'share') return [['וואטסאפ', 'wa'], ['העתקת קישור', 'copy'], ['חזרה', 'back']];
  return [['חזרה', 'back']];
}
/* ---------------- sharing ---------------- */
const SHARE_TEXT = 'גרנד תאפט קיבוץ 🚜 GTA על קיבוץ, ישר בדפדפן. גונבים טרקטור, מעצבנים את הוותיקים ובורחים מהשער הצהוב';
const shareUrl = () => location.origin + location.pathname;
function startShare() {
  // phones get the native share sheet (WhatsApp, Telegram, SMS...), desktops a small page
  if (TOUCH.on && navigator.share) { track('share-native'); navigator.share({ title: 'Grand Theft Kibbutz', text: SHARE_TEXT, url: shareUrl() }).catch(() => { }); return; }
  MENU.mode = 'share'; MENU.sel = 0;
}
function shareAct(r) {
  track(r === 'wa' ? 'share-whatsapp' : 'share-copy');
  if (r === 'wa') openLink('https://wa.me/?text=' + encodeURIComponent(SHARE_TEXT + '\n' + shareUrl()));
  if (r === 'copy') {
    const ok = () => { MENU.flash = { t: 'הקישור הועתק! עכשיו להדביק לחברים', life: 2.5 }; Audio2.sfx('cash'); };
    try { navigator.clipboard.writeText(SHARE_TEXT + '\n' + shareUrl()).then(ok, () => { MENU.flash = { t: shareUrl(), life: 6 }; }); } catch (e) { MENU.flash = { t: shareUrl(), life: 6 }; }
  }
}
// sub-pages shared by the title and pause menus; returns true when it handled r
const SUBPAGES = ['controls', 'credits', 'discover', 'share'];
function menuNav(r) {
  if (r === 'controls' || r === 'credits' || r === 'discover') { MENU.mode = r; MENU.sel = 0; return true; }
  if (r === 'share') { startShare(); return true; }
  if (r === 'wa' || r === 'copy') { shareAct(r); return true; }
  if (r === 'back') { MENU.mode = G.state === 'pause' ? 'pause' : 'title'; MENU.sel = 0; return true; }
  return false;
}
function menuInput() {
  const items = menuItems();
  if (mouseClicked && mouseScreen) for (const l of MENU.links) if (mouseScreen.x > l.x && mouseScreen.x < l.x + l.w && mouseScreen.y > l.y && mouseScreen.y < l.y + l.h) { openLink(l.url); return null; }
  if (P('ArrowDown', 'KeyS')) { MENU.sel = (MENU.sel + 1) % items.length; Audio2.sfx('click'); }
  if (P('ArrowUp', 'KeyW')) { MENU.sel = (MENU.sel - 1 + items.length) % items.length; Audio2.sfx('click'); }
  MENU.sel = Math.min(MENU.sel, items.length - 1);
  const it = items[MENU.sel];
  if ((P('ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD')) && (it[1] === 'music' || it[1] === 'sfx')) { const d = P('ArrowRight', 'KeyD') ? -.1 : .1; Audio2.vol[it[1]] = clamp(Math.round((Audio2.vol[it[1]] + d) * 10) / 10, 0, 1); Audio2.applyVol(); Audio2.sfx('click'); }
  if (P('Enter', 'Space') || (mouseClicked && MENU.hover !== undefined)) { if (mouseClicked && MENU.hover !== undefined) MENU.sel = MENU.hover; return menuItems()[MENU.sel][1]; }
  if (P('Escape') && MENU.mode !== 'title') return SUBPAGES.includes(MENU.mode) ? 'back' : 'resume';
  return null;
}
function drawMenu() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); MENU.links = [];
  const title = MENU.mode === 'title';
  const gr = ctx.createLinearGradient(0, 0, 0, VH); gr.addColorStop(0, 'rgba(10,12,20,.72)'); gr.addColorStop(.5, 'rgba(10,12,20,.35)'); gr.addColorStop(1, 'rgba(10,12,20,.85)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, VW, VH);
  const tz = Math.min(1, VW / 820, VH / 620);
  const pauseShort = MENU.mode === 'pause' && VH < 560;
  if (pauseShort) { /* short screens: the pause list needs the room more than the logo does */ }
  else if ((title || MENU.mode === 'pause') && LOGO.complete && LOGO.naturalWidth) {
    drawLogo(VW / 2, VH * .025, VW * .92, VH * (VH < 560 ? .41 : .46));
  } else if (title || MENU.mode === 'pause') {
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
  if (MENU.mode === 'credits') { drawCredits(); }
  if (MENU.mode === 'discover') { Discover.drawPage(); }
  if (MENU.mode === 'share') {
    const w = Math.min(440, VW - 24), h = 118, y = Math.max(10, VH * .5 - 150);
    panel(VW / 2 - w / 2, y, w, h, .86, 14);
    T('📤 שלחו לחבר', VW / 2, y + 28, 22, '#ffd84a', 'center');
    T('מי מהחברים שלך גדל בקיבוץ? שיראה מה הוא מפספס', VW / 2, y + 60, 14, '#eef3f6', 'center', { stroke: false });
    T(shareUrl().replace(/^https?:\/\//, ''), VW / 2, y + 90, 14, '#9fd8ff', 'center', { dir: 'ltr', stroke: false });
  }
  if (MENU.flash) { MENU.flash.life -= 1 / 60; const f = MENU.flash; ctx.globalAlpha = Math.min(1, f.life); T(f.t, VW / 2, VH - 44, 15, '#9be26b', 'center', { dir: f.t.startsWith('http') ? 'ltr' : 'rtl' }); ctx.globalAlpha = 1; if (f.life <= 0) MENU.flash = null; }
  const items = menuItems(), y0 = MENU.mode === 'controls' || MENU.mode === 'credits' || MENU.mode === 'discover' ? VH - 70 : MENU.mode === 'share' ? VH * .5 + 4 : pauseShort ? VH * .1 : VH * (VH < 560 ? .45 : .52);
  const reserve = title && TOUCH.on ? (VH < 500 ? 60 : 76) : 30;   // keep the play-on-a-computer note clear
  const step = Math.max(26, Math.min(46, (VH - reserve - y0) / Math.max(1, items.length - 1 || 1)));
  MENU.hover = undefined;
  items.forEach(([n], i) => {
    const y = y0 + i * step, sel = i === MENU.sel, w = 280;
    if (mouseScreen && Math.abs(mouseScreen.x - VW / 2) < w / 2 && Math.abs(mouseScreen.y - y) < step / 2) { MENU.hover = i; if (MENU.sel !== i) { MENU.sel = i; } }
    if (sel) { panel(VW / 2 - w / 2, y - 20, w, 40, .6, 20); ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.roundRect(VW / 2 + w / 2 - 8, y - 12, 4, 24, 2); ctx.fill(); }
    T(n, VW / 2, y, sel ? 24 : 20, sel ? '#ffd84a' : '#ddd', 'center');
  });
  if (title && TOUCH.on) {
    // phones work, but the game is built for a keyboard and a big screen: say so up front
    const short = VH < 500, w = Math.min(VW - 24, 340), h = short ? 36 : 50, y = VH - h / 2 - (short ? 4 : 14);
    panel(VW / 2 - w / 2, y - h / 2, w, h, .8, 12);
    T('💻 מומלץ לשחק במחשב', VW / 2, y - (short ? 8 : 10), short ? 14 : 16, '#ffd84a', 'center', { stroke: false });
    T('עם מקלדת ומסך גדול. בטלפון זה עובד, אבל פחות נוח', VW / 2, y + (short ? 9 : 12), short ? 11 : 12, '#dde6ea', 'center', { stroke: false });
  } else if (title) T(`חיצים + Enter · או עכבר · ${GAME_VERSION}`, VW / 2, VH - 18, 12, '#888', 'center', { stroke: false, w: 400 });
}
function drawCredits() {
  const w = Math.min(600, VW - 32), x = VW / 2 - w / 2, short = VH < 560, y = short ? 14 : VH * .14;
  const bio = 'עדו וייס, קיבוצניק (כמעט) מלידה, אבל עד היום מרגיש סוג ב׳, כי ההורים היו תושבים, אז שילמתי על שירותים וכלליות בחדר האוכל. היום חבר קיבוץ גאה ואבא לשלוש קיבוצניקיות קטנות שנולדו פה, בקיבוץ סעד.';
  const lines = wrap(bio, w - 56, short ? 15 : 17), lh = short ? 21 : 26;
  const h = (short ? 186 : 246) + lines.length * lh;
  panel(x, y, w, h, .86, 16);
  T('GRAND THEFT KIBBUTZ', VW / 2, y + (short ? 26 : 36), short ? 17 : 21, '#9be26b', 'center', { dir: 'ltr', w: 800 });
  let yy = y + (short ? 58 : 76);
  for (const l of lines) { T(l, VW / 2, yy, short ? 15 : 17, '#eef3f6', 'center', { w: 500, stroke: false }); yy += lh; }
  yy += short ? 6 : 10; menuLink('✉️ hello@gtkibbutz.com', 'mailto:hello@gtkibbutz.com', VW / 2, yy, short ? 14 : 16);
  yy += short ? 24 : 32; T('קוד, גרפיקה וסאונד: Claude (Anthropic)', VW / 2, yy, short ? 12 : 13, '#8a96a0', 'center', { w: 500, stroke: false });
  yy += short ? 26 : 36; menuLink('⭐ קוד פתוח ב-GitHub', GITHUB_URL, VW / 2, yy, short ? 14 : 16);
  yy += short ? 24 : 32; T('פרודיה של מעריצים. אין קשר ל-Rockstar Games או ל-Grand Theft Auto.', VW / 2, yy, short ? 11 : 12, '#8a96a0', 'center', { w: 500, stroke: false });
  yy += short ? 16 : 19; T('הקיבוץ והדמויות בדיוניים. כל דמיון לוותיק שאתם מכירים מקרי בהחלט.', VW / 2, yy, short ? 11 : 12, '#8a96a0', 'center', { w: 500, stroke: false });
  yy += short ? 18 : 24; T(GAME_VERSION, VW / 2, yy, short ? 11 : 12, '#5d6a74', 'center', { dir: 'ltr', stroke: false });
}
const GITHUB_URL = 'https://github.com/idow09/grand-theft-kibbutz';
// the build stamp tools/bump.js puts on the script URLs (?v=YYYYMMDDHHMM) doubles as the version shown to players
const GAME_VERSION = (() => {
  const s = document.querySelector('script[src*="hud.js"]'), m = s && /v=(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)/.exec(s.src);
  return m ? `v${m[1]}.${m[2]}.${m[3]}-${m[4]}${m[5]}` : "dev";
})();
// a clickable / tappable line of text in a menu page
function menuLink(text, url, cx, cy, fs) {
  ctx.font = `600 ${fs}px ${FONT}`; const w = ctx.measureText(text).width + 24, h = fs + 14;
  const hov = mouseScreen && Math.abs(mouseScreen.x - cx) < w / 2 && Math.abs(mouseScreen.y - cy) < h / 2;
  ctx.fillStyle = hov ? 'rgba(155,226,107,.22)' : 'rgba(155,226,107,.1)'; ctx.beginPath(); ctx.roundRect(cx - w / 2, cy - h / 2, w, h, h / 2); ctx.fill();
  T(text, cx, cy, fs, hov ? '#c8f5a8' : '#9be26b', 'center', { stroke: false });
  MENU.links.push({ x: cx - w / 2, y: cy - h / 2, w, h, url });
}
function openLink(url) {
  if (url.startsWith('mailto:')) { location.href = url; return; }   // hands off to the mail app, the game stays put
  // noopener makes window.open return null even on success, so only fall back when the popup was really blocked
  const w = window.open(url, '_blank'); if (w) w.opener = null; else location.href = url;
}
function drawControls() {
  const L = TOUCH.on ? [
    ['תנועה / נהיגה', 'ג׳ויסטיק משמאל'], ['ריצה', 'ג׳ויסטיק עד הסוף'], ['כניסה / יציאה / טלפון', 'כפתור ירוק'], ['תקיפה / ירי', 'כפתור אדום'], ['החלפת נשק', '⇄'],
    ['בלם יד / צופר', 'בלם / 📯'], ['וו גרירה / פרטיקוף', 'וו / PTO'], ['תחנת רדיו', '📻'], ['קנייה בחנות', 'נגיעה בפריט'], ['מפה', 'נגיעה במכ״ם'], ['השהיה', '❚❚'],
  ] : [
    ['תנועה / נהיגה', 'WASD או חיצים'], ['ריצה', 'Shift'], ['כניסה / יציאה מרכב, טלפון', 'E'], ['תקיפה / ירי / ריסוס', IS_MAC ? 'F · J · עכבר' : 'F · J · Ctrl · עכבר'], ['וו גרירה (עגלה / מחרשה)', 'G'], ['פרטיקוף (קומביין / מחרשה)', 'T'], ['החלפת נשק', 'Q / Tab'],
    ['בלם יד', 'Space'], ['צופר', 'H'], ['תחנת רדיו', 'R'], ['קנייה בחנות', '1 / 2 / 3'], ['מפה', 'M'], ['השהיה', 'Esc / P'],
  ];
  const short = VH < 520, rh = short ? 21 : 26, top = short ? 50 : 70;
  const w = Math.min(560, VW - 40), x = VW / 2 - w / 2, y = short ? 8 : VH * .14, h = top + L.length * rh + (short ? 10 : 120);
  panel(x, y, w, h, .82, 14);
  T('איך משחקים', VW / 2, y + (short ? 24 : 30), short ? 20 : 24, '#ffd84a', 'center');
  L.forEach(([a, b], i) => { T(a, x + w - 24, y + top + i * rh, 15, '#fff', 'right', { w: 500, stroke: false }); T(b, x + 24, y + top + i * rh, 14, '#9fd8ff', 'left', { dir: TOUCH.on ? 'rtl' : 'ltr', stroke: false }); });
  if (short) return;
  const tips = ['נסיעה על הדשא, מכות ובלגן מעצבנים את הזקנים. כל כוכב מביא רודפים רציניים יותר.', 'במוסכים (ריבוע צהוב במפה) מוחקים את הרוגז ומתקנים את הרכב.', 'טלפונים צבעוניים = משימות של שלוש הקבוצות. בסמלים הסגולים יש "בלגן" נגד השעון.'];
  let ty = y + 70 + L.length * 26 + 14;
  for (const t of tips) for (const l of wrap(t, w - 48, 13)) { T(l, x + w - 24, ty, 13, '#cfcfcf', 'right', { w: 500, stroke: false }); ty += 19; }
}
