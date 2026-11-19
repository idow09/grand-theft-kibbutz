'use strict';
/* ================================================================
   touch.js — mobile controls. Everything here is inert until the
   first touch event: desktop (keyboard + mouse) is untouched.
   - floating joystick on the left half (walk / drive toward the stick)
   - context buttons on the right (attack, E-action, handbrake, weapon)
   - tap radar → map, ⏸ → pause, 📻 → next station
   - menus, shop rows, phone box and big map are tappable
   ================================================================ */
const TOUCH = {
  on: false,               // touch UI active (switches off on any keyboard use)
  stick: null,             // {id, ox, oy, x, y}
  dx: 0, dy: 0, mag: 0,    // normalised stick vector
  att: false, hb: false,
  btns: [],                // rebuilt every frame by drawTouch: {id, x, y, r, ...}
  held: {},                // touchId → button id
  shopRows: [], phoneBox: null,
};
const isCoarse = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
if (isCoarse) TOUCH.on = true;

function touchFullscreen() {
  const el = document.documentElement;
  if (document.fullscreenElement || !el.requestFullscreen) return;
  el.requestFullscreen({ navigationUI: 'hide' }).then(() => { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => { }); }).catch(() => { });
}
function touchBtnAt(x, y) {
  for (const b of TOUCH.btns) if (Math.hypot(x - b.x, y - b.y) < b.r + 10) return b;
  return null;
}
function touchPress(b) {
  switch (b.id) {
    case 'att': TOUCH.att = true; break;
    case 'hb': TOUCH.hb = true; break;
    case 'act': pressed.KeyE = true; break;
    case 'wp': pressed.KeyQ = true; break;
    case 'pause': pressed.Escape = true; break;
    case 'map': pressed.KeyM = true; break;
    case 'radio': pressed.KeyR = true; break;
    case 'horn': pressed.KeyH = true; break;
    case 'hitch': pressed.KeyG = true; break;
    case 'pto': pressed.KeyT = true; break;
  }
  if (navigator.vibrate) try { navigator.vibrate(8); } catch (e) { }
}
function touchRelease(id) { if (id === 'att') TOUCH.att = false; if (id === 'hb') TOUCH.hb = false; }

cv.addEventListener('touchstart', e => {
  e.preventDefault();
  if (!TOUCH.on) { TOUCH.on = true; resize(); }
  if (window.Audio2) Audio2.init();
  touchFullscreen();
  for (const t of e.changedTouches) {
    const x = t.clientX, y = t.clientY;
    if (G.state !== 'play') {           // menus / map / title: act like a mouse click
      mouseScreen = { x, y }; mouseClicked = true;
      if (G.state === 'map') pressed.KeyM = true;
      continue;
    }
    if (VH > VW) continue;              // portrait: rotate overlay is up
    const row = TOUCH.shopRows.find(r => x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1);
    if (row) { pressed['Digit' + row.n] = true; continue; }
    if (TOUCH.phoneBox) { const p = TOUCH.phoneBox; if (x > p.x && x < p.x + p.w && y > p.y && y < p.y + p.h) { G.phoneCall = null; continue; } }
    const b = touchBtnAt(x, y);
    if (b) { TOUCH.held[t.identifier] = b.id; touchPress(b); continue; }
    if (x < VW * .5 && !TOUCH.stick) { TOUCH.stick = { id: t.identifier, ox: x, oy: y, x, y }; continue; }
    if (x >= VW * .5) { TOUCH.held[t.identifier] = 'att'; TOUCH.att = true; } // free right-side tap = attack
  }
}, { passive: false });
cv.addEventListener('touchmove', e => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    const s = TOUCH.stick;
    if (s && s.id === t.identifier) {
      s.x = t.clientX; s.y = t.clientY;
      const R = 56; let dx = s.x - s.ox, dy = s.y - s.oy; const d = Math.hypot(dx, dy);
      if (d > R) { s.ox = s.x - dx / d * R; s.oy = s.y - dy / d * R; dx = s.x - s.ox; dy = s.y - s.oy; } // base follows the thumb
      const m = Math.min(1, Math.hypot(dx, dy) / R);
      TOUCH.mag = m < .15 ? 0 : m; TOUCH.dx = d ? dx / Math.hypot(dx, dy) : 0; TOUCH.dy = d ? dy / Math.hypot(dx, dy) : 0;
    }
    if (G.state !== 'play') mouseScreen = { x: t.clientX, y: t.clientY };
  }
}, { passive: false });
function touchEnd(e) {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (TOUCH.stick && TOUCH.stick.id === t.identifier) { TOUCH.stick = null; TOUCH.mag = 0; }
    const id = TOUCH.held[t.identifier]; if (id) { delete TOUCH.held[t.identifier]; if (!Object.values(TOUCH.held).includes(id)) touchRelease(id); }
  }
}
cv.addEventListener('touchend', touchEnd, { passive: false });
// iOS only unlocks Web Audio from touchend (touchstart doesn't count as a user gesture there)
if (IS_IOS) cv.addEventListener('touchend', () => { if (window.Audio2) Audio2.init(); });
cv.addEventListener('touchcancel', touchEnd, { passive: false });
addEventListener('keydown', () => { if (TOUCH.on && !isCoarse) { TOUCH.on = false; TOUCH.stick = null; TOUCH.att = TOUCH.hb = false; resize(); } });

/* ---- input mapping, called from playerTick ---- */
function touchWalk() {           // → [mx, my, speedFactor] or null
  if (!TOUCH.on || TOUCH.mag <= 0) return null;
  return [TOUCH.dx, TOUCH.dy, TOUCH.mag > .82 ? 1.42 : .45 + TOUCH.mag * .6];
}
function touchDrive(v, c) {       // drive toward the stick direction (camera never rotates)
  if (!TOUCH.on) return false;
  c.hb = c.hb || TOUCH.hb;
  if (TOUCH.mag <= 0) return !!TOUCH.stick;
  const ta = Math.atan2(TOUCH.dy, TOUCH.dx), d = angDiff(v.a, ta);
  if (v.d.plane && v.alt > 0) { c.steer = clamp(d * 2.2, -1, 1); c.thr = TOUCH.mag; return true; } // in the air: point where to fly
  if (Math.abs(d) < 2.1 || v.vf > 60) {            // forward (or still rolling forward: steer while braking hard)
    c.steer = clamp(d * 2.6, -1, 1);
    c.thr = Math.abs(d) < 2.1 ? TOUCH.mag * (Math.abs(d) > 1.2 ? .6 : 1) : -1;
  } else {                                          // stick points behind → reverse, steering the tail
    const dr = angDiff(v.a, ta + Math.PI); c.steer = -clamp(dr * 2.6, -1, 1); c.thr = -TOUCH.mag;
  }
  return true;
}
function touchAimAssist(pl) {     // snap to a close target in front when attacking without a mouse
  if (!TOUCH.on) return;
  const range = pl.wp === 'fist' ? 40 : 230; let best = null, bs = 1e9;
  for (const q of peds) {
    if (q.state === 'ko' || q.veh || q === pl) continue;
    const dx = q.x - pl.x, dy = q.y - pl.y, d = Math.hypot(dx, dy); if (d > range || d < 4) continue;
    const da = Math.abs(angDiff(pl.a, Math.atan2(dy, dx))); if (da > .7) continue;
    const s = d * (1 + da * 2) * (q.chaser || q.state === 'chase' ? .6 : 1); if (s < bs) { bs = s; best = q; }
  }
  if (best) pl.a = Math.atan2(best.y - pl.y, best.x - pl.x);
}

/* ---- drawing ---- */
function tBtn(id, x, y, r, opts) {
  TOUCH.btns.push({ id, x, y, r });
  const down = Object.values(TOUCH.held).includes(id);
  ctx.globalAlpha = opts.a ?? .85;
  ctx.fillStyle = down ? 'rgba(255,255,255,.35)' : (opts.bg || 'rgba(12,16,22,.55)');
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = opts.ring || 'rgba(255,255,255,.45)'; ctx.stroke();
  if (opts.icon) { const ic = SPR.icon(opts.icon); const s = r * 1.15; ctx.drawImage(ic.cv, x - s / 2, y - s / 2 - (opts.sub ? 5 : 0), s, s); }
  if (opts.t) T(opts.t, x, y + (opts.sub ? -6 : 0), opts.ts || 16, '#fff', 'center', { w: 700 });
  if (opts.sub) T(opts.sub, x, y + r * .55, 11, opts.subc || '#ffd84a', 'center', { w: 600 });
  ctx.globalAlpha = 1;
}
function drawTouch() {
  TOUCH.btns = []; TOUCH.shopRows = [];
  if (!TOUCH.on || G.state !== 'play') return;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const pl = Player, v = pl.veh, sc = clamp(Math.min(VW, VH * 1.8) / 760, .8, 1.25);
  // joystick
  const s = TOUCH.stick;
  if (s) {
    ctx.fillStyle = 'rgba(12,16,22,.35)'; ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(s.ox, s.oy, 56, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(s.ox + TOUCH.dx * TOUCH.mag * 56, s.oy + TOUCH.dy * TOUCH.mag * 56, 24, 0, TAU); ctx.fill();
  } else if (pl.out <= 0) {
    const x = 100 * sc, y = VH - 95 * sc;
    ctx.globalAlpha = .35; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 50, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(x, y, 20, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  }
  if (pl.out > 0) return;
  // right cluster
  const ax = VW - 78 * sc, ay = VH - 78 * sc;
  const ranged = pl.wp !== 'fist';
  if (v && v.d.plane) tBtn('att', ax, ay, 44 * sc, { t: 'ריסוס', ts: 14, bg: 'rgba(90,140,60,.6)', ring: '#d6f0c4' });
  else if (!v || ranged) tBtn('att', ax, ay, 44 * sc, { icon: pl.wp === 'fist' ? 'fist' : pl.wp, bg: 'rgba(160,40,30,.55)', ring: '#ffb3a8' });
  if (v && v.type === 'tractor') tBtn('hitch', ax - 200 * sc, ay - 55 * sc, 24 * sc, { t: 'וו', ts: 14, bg: 'rgba(60,60,60,.6)' });
  if (v && (v.type === 'combine' || (v.type === 'tractor' && v.hitch && v.hitch.type === 'plow'))) tBtn('pto', ax - 185 * sc, ay + 15 * sc, 24 * sc, { t: 'PTO', ts: 11, bg: (v.pto || (v.hitch && v.hitch.pto)) ? 'rgba(230,140,30,.75)' : 'rgba(60,60,60,.6)' });
  const am = { fist: '', toto: `×${pl.inv.toto}`, soaker: `${pl.inv.soaker.toFixed(0)}ש'`, balloon: `×${pl.inv.balloon}`, ext: `${pl.inv.ext.toFixed(0)}ש'` }[pl.wp];
  const nW = Object.keys(pl.inv).filter(k => pl.inv[k] > 0).length;
  if (nW > 1) tBtn('wp', ax - 92 * sc, ay + 22 * sc, 26 * sc, { t: '⇄', ts: 18, sub: am });
  else if (am) T(am, ax, ay + 56 * sc, 12, '#ffd84a', 'center');
  if (v) {
    // the plane always shows the spray button, so make room for it like a ranged weapon
    const att = ranged || v.d.plane;
    tBtn('act', ax - (att ? 18 : 0) * sc, ay - (att ? 100 : 30) * sc, 30 * sc, { t: 'יציאה', ts: 13 });
    tBtn('hb', ax - (att ? 100 : 110) * sc, ay - (att ? 50 : 10) * sc, 34 * sc, { t: 'בלם', ts: 14, bg: 'rgba(30,60,140,.55)' });
    tBtn('horn', ax - 150 * sc, ay - 110 * sc, 22 * sc, { t: '📯', ts: 15, a: .7 });
    if (v.d.radio) tBtn('radio', VW / 2 + 120, VH - 34, 22, { t: '📻', ts: 15, a: .75 });
  } else if (G.interact && G.interact.k !== 'shop') {
    const it = G.interact, lbl = it.k === 'veh' ? (it.v.driver ? 'להוציא!' : 'כניסה') : it.k === 'phone' ? (G.mission ? '' : 'לענות') : '';
    if (lbl) tBtn('act', ax - 18 * sc, ay - 100 * sc, 34 * sc, { t: lbl, ts: 13, bg: 'rgba(40,120,60,.6)', ring: '#b8f5c4' });
  }
  // top utility buttons (radar = map)
  tBtn('pause', 172, 34, 20, { t: '❚❚', ts: 13, a: .8 });
  TOUCH.btns.push({ id: 'map', x: TOUCH_RADAR.x, y: TOUCH_RADAR.y, r: TOUCH_RADAR.r });
  // shop rows (bigger hit areas, matching drawHUD's shop panel)
  if (G.shopMenu) {
    const list = SHOP_ITEMS[G.shopMenu.kind] || [], w = 300, x = VW / 2 - w / 2, y = touchShopY(list.length);
    list.forEach((_, i) => TOUCH.shopRows.push({ n: i + 1, x0: x, x1: x + w, y0: y + 46 + i * 34 - 17, y1: y + 46 + i * 34 + 17 }));
  }
}
const TOUCH_RADAR = { x: 66, y: 118, r: 50 };
const TOUCH_TIPS = {
  radio: '📻 = החלפת תחנה · 📯 = צופר · בלם = בלם יד',
  weap: '⇄ = החלפת נשק · הכפתור האדום = ירי',
};
const TOUCH_INTRO = [[1.5, 'ג׳ויסטיק משמאל לתנועה · עד הסוף = ריצה'], [6, 'גש לאופניים ולחץ על "כניסה"'], [12, 'טלפונים צבעוניים = משימות · נגיעה במכ"ם = מפה'], [19, 'בשדות שמחוץ לקיבוץ מחכים טרקטורים... 🚜'], [27, 'זהירות מהדשא — הזקנים רואים הכל']];
function touchShopY(n) { return Math.min(VH * .58, VH - (40 + n * 34) - 12); }
function drawRotate() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.fillStyle = 'rgba(8,12,10,.94)'; ctx.fillRect(0, 0, VW, VH);
  const t = G.time || 0; ctx.save(); ctx.translate(VW / 2, VH * .42); ctx.rotate(-Math.min(1, (t % 2.4) / 1.2) * Math.PI / 2);
  ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(-28, -48, 56, 96, 10); ctx.stroke(); ctx.restore();
  T('סובבו את הטלפון לרוחב', VW / 2, VH * .62, 22, '#fff', 'center');
  T('GTK משוחק בשכיבה, כמו ותיק על ערסל', VW / 2, VH * .62 + 32, 14, '#aab', 'center', { w: 500, stroke: false });
}
