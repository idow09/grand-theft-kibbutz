'use strict';
/* ================================================================
   main.js — boot sequence, state machine, main loop
   ================================================================ */
const BOOT = [
  ['מסדרים את סידור העבודה', () => buildTextures()],
  ['שותלים את הקיבוץ', () => genMap(1910)],
  ['סופרים קולות באסיפה', () => rasterizeMaterials()],
  ['מפזרים שיחים', () => genWild()],
  ['סוללים שבילים', () => buildGraph()],
  ['מגהצים את הקרקע', () => { Ground.init(); Ground.buildMini(); }],
  ['מעירים את שומרת הלילה', () => spawnWorld()],
  ['מקפלים בקומונה', () => Pickups.init()],
  ['מכינים קפה בחדר האוכל', () => { placePlayerStart(); Ground.prebake(CAM.x, CAM.y, 900); }],
];
let bootI = 0;
function placePlayerStart() {
  const p = POI['חדר האוכל']; Player.x = p.x + 20; Player.y = p.y + 40; Player.a = Math.PI / 2;
  CAM.x = Player.x; CAM.y = Player.y;
  // a bike waiting next to the player
  const b = mkVeh('bike', Player.x + 34, Player.y + 6, 0, '#c0392b'); b.persistent = true;
}
function drawLoading() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const gr = ctx.createLinearGradient(0, 0, 0, VH); gr.addColorStop(0, '#1d3b2a'); gr.addColorStop(1, '#0d1610'); ctx.fillStyle = gr; ctx.fillRect(0, 0, VW, VH);
  if (LOGO.complete && LOGO.naturalWidth) drawLogo(VW / 2, VH * .06, VW * .9, VH * .6);
  else T('GRAND THEFT KIBBUTZ', VW / 2, VH * .4, Math.min(52, VW / 14), '#ffd84a', 'center', { dir: 'ltr', w: 900 });
  const w = Math.min(420, VW - 60), x = VW / 2 - w / 2, y = VH * .74;
  ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(x, y, w, 8); ctx.fillStyle = '#9be26b'; ctx.fillRect(x, y, w * bootI / BOOT.length, 8);
  if (bootI < BOOT.length) T(BOOT[bootI][0] + '...', VW / 2, y + 32, 16, '#cfe', 'center', { w: 500, stroke: false });
}
function newGame() {
  Save.wipe();
  // after any play the world itself is dirty (broken props, ploughed fields, loose cows, chasers):
  // rebuild it from scratch by reloading straight into a fresh game
  if (G.played) { try { sessionStorage.setItem('gtk-fresh', '1'); } catch (e) { } G.state = 'reloading'; location.reload(); return; }
  G.played = true;
  Object.assign(G, { money: 60, heat: 0, level: 0, respect: { cow: 0, youth: 0, kitchen: 0 }, done: {}, eggs: {}, rampDone: {}, tips: {}, mission: null, rampage: null, combo: 0 });
  Player.inv = { fist: 1, toto: 0, soaker: 0, balloon: 0, ext: 0 }; Player.wp = 'fist'; Player.hp = 100; Player.armor = 0; Player.out = 0;
  if (Player.veh) Player.exit(true);
  Missions.loadChain({ cow: 0, youth: 0, kitchen: 0 });
  ENV.time = 8.5; ENV.day = 1; setWeather('clear', true);
  const p = POI['חדר האוכל']; Player.x = p.x + 20; Player.y = p.y + 40; CAM.x = Player.x; CAM.y = Player.y;
  startPlay(true);
}
function continueGame() { G.played = true; Save.load(); const p = POI['חדר האוכל']; Player.x = p.x + 20; Player.y = p.y + 40; CAM.x = Player.x; CAM.y = Player.y; startPlay(false); }
const INTRO_TIPS = [[1.5, 'WASD / חיצים לתנועה · Shift לריצה'], [6, 'לחץ E ליד האופניים כדי לעלות עליהם'], [12, 'טלפונים צבעוניים = משימות · M = מפה'], [19, 'בשדות שמחוץ לקיבוץ מחכים טרקטורים... 🚜'], [27, 'זהירות מהדשא — הזקנים רואים הכל']];
let introT = -1;
function startPlay(fresh) {
  G.state = 'play'; Audio2.init(); G.time = G.time || 0;
  G.bigBanner(fresh ? 'חזרת מהצבא' : 'חזרת לקיבוץ', fresh ? 'סידור העבודה כבר מחכה' : 'הוועד עדיין זוכר', '#ffd84a');
  introT = fresh ? 0 : -1; G.radioCard = 0;
}

let last = performance.now();
function update(dt) {
  G.time += dt;
  envTick(dt);
  if (introT >= 0) { introT += dt; for (const [t, s] of TOUCH.on ? TOUCH_INTRO : INTRO_TIPS) if (introT - dt < t && introT >= t) G.msg(s, '#cfe9ff'); if (introT > 40) introT = -1; }
  interactTick();
  playerTick(dt);
  entitiesTick(dt);
  Farm.tick(dt);
  Combat.tick(dt); FX.tick(dt); Pickups.tick(dt);
  wantedTick(dt); garageTick(dt);
  Missions.tick(dt); Missions.hostileTick(dt); Rampage.tick(dt);
  camTick(dt);
  // UI timers
  const P0 = Player.veh || Player, dn = MAP.district(P0.x, P0.y);
  if (dn !== G.district) { G.district = dn; G.districtT = 3.2; } else G.districtT -= dt;
  if (G.comboT > 0) { G.comboT -= dt; if (G.comboT <= 0) G.combo = 0; }
  if (G.banner) { G.banner.life -= dt; if (G.banner.life <= 0) G.banner = null; }
  for (let i = G.msgs.length - 1; i >= 0; i--) { G.msgs[i].life -= dt; if (G.msgs[i].life <= 0) G.msgs.splice(i, 1); }
  if (G.phoneCall) { G.phoneCall.life -= dt; if (G.phoneCall.life <= 0 || P('Enter')) G.phoneCall = null; }
  if (G.vehToast) { G.vehToast.life -= dt; if (G.vehToast.life <= 0) G.vehToast = null; }
  if (G.radioCard > 0) G.radioCard -= dt;
  Audio2.radioTick(!!(Player.veh && Player.veh.d.radio && !Player.veh.dead));
  const mm = MINFO[matAt(P0.x, P0.y)];
  Audio2.ambience(dt, { rain: ENV.rain, wind: ENV.hamsin + ENV.rain * .3, night: ENV.night, outdoorsGreen: !mm.road });
  G.saveT -= dt; if (G.saveT <= 0) { G.saveT = 60; Save.save(); }
}
function titleTick(dt) {
  G.time += dt; envTick(dt * 3);
  const a = G.time * .04, K0 = MAP.KC;
  Player.x = K0[0] + Math.cos(a) * 700; Player.y = K0[1] + Math.sin(a * 1.3) * 450; Player.out = 0;
  entitiesTick(dt); FX.tick(dt);
  CAM.x += (Player.x - CAM.x) * Math.min(1, dt * 2); CAM.y += (Player.y - CAM.y) * Math.min(1, dt * 2);
  CAM.z = clamp(Math.min(VW, VH * 1.45) / 1050, .62, 1.5) * .95; CAM.hw = VW / 2 / CAM.z; CAM.hh = VH / 2 / CAM.z; CAM.sx = CAM.sy = 0;
}
function frame(now) {
  let dt = (now - last) / 1000; last = now; dt = clamp(dt, 0, .05);
  try {
    if (G.state === 'loading') {
      drawLoading();
      if (bootI < BOOT.length) { BOOT[bootI][1](); bootI++; }
      else {
        let fresh = false; try { fresh = sessionStorage.getItem('gtk-fresh') === '1'; sessionStorage.removeItem('gtk-fresh'); } catch (e) { }
        if (fresh) newGame(); else { G.state = 'title'; MENU.mode = 'title'; MENU.sel = 0; setWeather('clear', true); ENV.time = 17.6; }
      }
    } else if (G.state === 'title') {
      titleTick(dt); draw(dt); drawMenu();
      const r = menuInput();
      if (r === 'new') newGame(); else if (r === 'continue') continueGame(); else if (r === 'controls' || r === 'credits') { MENU.mode = r; MENU.sel = 0; } else if (r === 'back') { MENU.mode = 'title'; MENU.sel = 0; }
    } else if (G.state === 'play') {
      const rot = TOUCH.on && VH > VW;   // phone held upright: freeze until rotated
      if (P('Escape', 'KeyP')) { G.state = 'pause'; MENU.mode = 'pause'; MENU.sel = 0; }
      else if (P('KeyM')) { G.state = 'map'; }
      else if (!rot) update(dt);
      draw(rot ? 0 : dt); drawHUD(dt); drawTouch();
      if (rot) { G.time += dt; drawRotate(); }
    } else if (G.state === 'pause') {
      draw(0); drawHUD(0); drawMenu();
      if (MENU.mode === 'controls' || MENU.mode === 'credits') { const r = menuInput(); if (r) { MENU.mode = 'pause'; MENU.sel = 0; } }
      else { const r = menuInput(); if (r === 'resume') G.state = 'play'; else if (r === 'map') G.state = 'map';
        else if (r === 'music' || r === 'sfx') { Audio2.vol[r] = Audio2.vol[r] >= .95 ? 0 : Math.round(Audio2.vol[r] * 10 + 2) / 10; Audio2.vol[r] = Math.min(1, Audio2.vol[r]); Audio2.applyVol(); Audio2.sfx('click'); } else if (r === 'controls' || r === 'credits') { MENU.mode = r; MENU.sel = 0; } else if (r === 'new') newGame(); }
      Audio2.radioTick(false);
    } else if (G.state === 'map') {
      draw(0); drawBigMap(); if (P('KeyM', 'Escape', 'Enter')) G.state = 'play'; Audio2.radioTick(false);
    }
  } catch (e) { console.error(e); if (!window.__errShown) { window.__errShown = 1; } }
  // touch devices: drop render resolution once if frames are consistently slow
  if (TOUCH.on && G.state === 'play' && !QUALITY.low) { QUALITY.acc += dt; QUALITY.n++; if (QUALITY.n >= 180) { if (QUALITY.acc / QUALITY.n > 1 / 40) { QUALITY.low = true; resize(); } QUALITY.acc = 0; QUALITY.n = 0; } }
  clearPressed();
  requestAnimationFrame(frame);
}
resize();
if (document.fonts && document.fonts.load) document.fonts.load(`700 20px Rubik`).catch(() => { });
requestAnimationFrame(frame);
