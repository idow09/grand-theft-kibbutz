'use strict';
/* ================================================================
   farm.js — farm machinery & country extras:
   hitch + towed wagons/plough (G), PTO "פרטיקוף" (T) for the combine
   and plough, crop-duster flight and spraying, the yellow gate,
   cows breaking out of the pen
   ================================================================ */
const Farm = (() => {
  const hitchPt = v => [v.x - Math.cos(v.a) * (v.d.L / 2 + 2), v.y - Math.sin(v.a) * (v.d.L / 2 + 2)];
  const tonguePt = t => [t.x + Math.cos(t.a) * (t.d.L / 2 + 6), t.y + Math.sin(t.a) * (t.d.L / 2 + 6)];
  const cellSet = (x, y, to, tex) => {
    const i = matIdx(x, y); if (i < 0) return -1; const was = mat[i]; if (was === to) return -1;
    mat[i] = to; Ground.addDecal({ k: 'crop', x: (i % MGW) * MCELL + 4, y: Math.floor(i / MGW) * MCELL + 4, tex, ang: .07 }); return was;
  };

  /* ---------------- hitch (G) ---------------- */
  function hitchKey(v) {
    if (v.type !== 'tractor') { G.msg(v.d.plane ? 'למטוס אין וו גרירה' : 'אין ל' + v.d.name + ' וו גרירה. רק לטרקטור', '#ccc'); return; }
    if (v.hitch) { const t = v.hitch; t.towedBy = null; t.pto = false; t.vx = t.vy = 0; v.hitch = null; G.msg(t.d.name + ' נותקה', '#cfe9ff'); Audio2.sfx('thud', v.x, v.y); return; }
    const h = hitchPt(v); let best = null, bd = 26;
    for (const t of vehicles) { if (!t.d.towed || t.towedBy || t.dead) continue; const q = tonguePt(t), d = dist(q[0], q[1], h[0], h[1]); if (d < bd) { bd = d; best = t; } }
    if (!best) { G.msg('תיסע ברוורס עד שהוו נוגע במוט של העגלה, ואז G', '#cfe9ff'); return; }
    best.towedBy = v; v.hitch = best; Audio2.sfx('thud', v.x, v.y);
    G.msg(best.type === 'plow' ? 'המחרשה חוברה! T = פרטיקוף (הורדת המחרשה)' : 'העגלה חוברה! עכשיו נראה אותך ברוורס', '#9be26b');
    if (G.mission && G.mission.onHitch) G.mission.onHitch(best);
  }
  /* ---------------- PTO (T) ---------------- */
  function ptoKey(v) {
    if (v.type === 'combine') { v.pto = !v.pto; Audio2.sfx(v.pto ? 'harvest' : 'click', v.x, v.y); G.msg(v.pto ? 'פרטיקוף מופעל! הקומביין קוצר כל מה שלפניו' : 'פרטיקוף כבוי', v.pto ? '#ffb35a' : '#ccc'); return; }
    if (v.type === 'tractor') {
      if (v.hitch && v.hitch.type === 'plow') { const p = v.hitch; p.pto = !p.pto; Audio2.sfx('thud', v.x, v.y); G.msg(p.pto ? 'פרטיקוף: המחרשה למטה. חורשים!' : 'המחרשה הורמה', p.pto ? '#ffb35a' : '#ccc'); return; }
      G.msg(v.hitch ? 'לעגלה אין פרטיקוף. תחבר מחרשה' : 'אין כלום על הפרטיקוף. תחבר מחרשה עם G', '#ccc'); return;
    }
    G.msg('פרטיקוף? ב' + v.d.name + '? יש רק בטרקטור ובקומביין', '#ccc');
  }

  /* ---------------- towing ---------------- */
  const _tq = [];
  function towTick(dt) {
    for (const v of vehicles) {
      const t = v.hitch; if (!t) continue;
      const h = hitchPt(v), L2 = t.d.L / 2 + 6;
      let ang = Math.atan2(h[1] - t.y, h[0] - t.x);
      const rel = angDiff(v.a, ang), lim = 1.65;
      if (Math.abs(rel) > lim) {
        ang = v.a + Math.sign(rel) * lim;
        if (v.vf < -8) { v.vx *= Math.exp(-5 * dt); v.vy *= Math.exp(-5 * dt); if (v.driver === 'player' && !(v._jk > 0)) { v._jk = 4; G.msg("ג'קנייף! סע קצת קדימה ליישר", '#ffb36b'); Audio2.sfx('thud', v.x, v.y); } }
      }
      if (v._jk > 0) v._jk -= dt;
      const nx = h[0] - Math.cos(ang) * L2, ny = h[1] - Math.sin(ang) * L2;
      t.vx = (nx - t.x) / Math.max(dt, 1e-3); t.vy = (ny - t.y) / Math.max(dt, 1e-3); t.x = nx; t.y = ny; t.a = ang;
      t.vf = t.vx * Math.cos(ang) + t.vy * Math.sin(ang);
      const sp = Math.hypot(t.vx, t.vy);
      // the towed implement knocks over light stuff
      if (sp > 20) for (const c of vehCircles(t)) { pgrid.query(c.x - c.r, c.y - c.r, c.x + c.r, c.y + c.r, _tq); for (const o of _tq) if (!o.broken && !o.open && o.need <= 3 && shapePush(o, c.x, c.y, c.r)) breakProp(o, v, sp); }
      // plough at work
      if (t.type === 'plow' && t.pto && sp > 12) plowWork(t, v);
    }
  }
  function plowWork(t, v) {
    const c = Math.cos(t.a), s = Math.sin(t.a);
    for (let k = -2; k <= 2; k++) {
      const x = t.x - c * 6 - s * k * 9, y = t.y - s * 6 + c * k * 9, m = MINFO[matAt(x, y)];
      if (m.road || m.water || matAt(x, y) === M.PLOWED || matAt(x, y) === M.MUD) continue;
      if (m.lawn) { cellSet(x, y, M.MUD, 'mud'); if (v.driver === 'player') { G.crime(.06, x, y); if (Math.random() < .1) G.addScore(3, x, y, true); } continue; }
      const was = cellSet(x, y, M.PLOWED, 'plowed');
      if (was >= 0 && v.driver === 'player' && Math.random() < .12) G.addScore(2, x, y, true);
      if (Math.random() < .12) FX.dust(x, y, 'rgba(110,80,50,');
    }
    t.workT = 3; MAP.plowing = t;
  }
  /* cattle egrets follow the plough for the worms, as they do in every Israeli field */
  const egrets = [];
  function egretTick(dt) {
    const t = MAP.plowing;
    if (t) { t.workT -= dt; if (t.workT <= 0 || t.dead || !t.towedBy) MAP.plowing = null; }
    if (MAP.plowing) {
      if (egrets.length < 8 && Math.random() < dt * 1.5) { const a = Math.random() * TAU, e = mkPed('heron', t.x + Math.cos(a) * 260, t.y + Math.sin(a) * 260); e.state = 'held'; e.persistent = true; e.slot = egrets.length; e.side = Math.random() < .5 ? -1 : 1; egrets.push(e); }
      const c = Math.cos(t.a), s = Math.sin(t.a);
      for (const e of egrets) {
        const back = 26 + (e.slot % 4) * 16, side = e.side * (8 + (e.slot % 3) * 12);
        const tx = t.x - c * back - s * side, ty = t.y - s * back + c * side, dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1;
        const sp = d > 45 ? 170 : Math.min(60, d * 2.5);
        e.flying = d > 45; e.x += dx / d * sp * dt; e.y += dy / d * sp * dt; if (d > 3) e.a += angDiff(e.a, Math.atan2(dy, dx)) * Math.min(1, dt * 6); e.walk += dt * (e.flying ? 9 : sp * .15); e.vx = dx / d * sp; e.vy = dy / d * sp;
      }
    } else if (egrets.length) {
      for (const e of egrets) { e.state = 'fly'; e.timer = 5; const a = Math.random() * TAU; e.fx = Math.cos(a); e.fy = Math.sin(a); e.persistent = false; }
      egrets.length = 0;
    }
  }

  /* ---------------- combine with the PTO on ---------------- */
  const _cq = [];
  let harvestSnd = 0;
  function combineTick(v, dt) {
    const c = Math.cos(v.a), s = Math.sin(v.a), fx = v.x + c * (v.d.L / 2 + 6), fy = v.y + s * (v.d.L / 2 + 6), byP = v.driver === 'player';
    const pts = []; for (let k = -3; k <= 3; k++) pts.push([fx - s * k * 10.5, fy + c * k * 10.5]);
    // crops become stubble; the grain tank fills and round bales drop out the back
    let cut = 0;
    for (const [x, y] of pts) { const i = matIdx(x, y); if (i >= 0 && MINFO[mat[i]].crop) { cellSet(x, y, M.STUBBLE, 'stubble'); cut++; G.destroyed += .05; if (byP && Math.random() < .25) G.addScore(2, x, y, true); } }
    if (cut && byP) { G.harvest = (G.harvest || 0) + cut * .012; v.baleAcc = (v.baleAcc || 0) + cut; G.harvestT = 3; }
    if (v.baleAcc > 120) { v.baleAcc = 0; const q = [v.x - c * (v.d.L / 2 + 14), v.y - s * (v.d.L / 2 + 14)]; if (!solidAt(q[0], q[1], 10)) { addProp('hay', q[0], q[1]); Audio2.sfx('thud', q[0], q[1]); FX.burst(q[0], q[1], ['#e9cf6a', '#d4b64a'], 10, 60, 3); } }
    // everything in front of the header goes
    pgrid.query(fx - 45, fy - 45, fx + 45, fy + 45, _cq);
    for (const o of _cq) { if (o.broken || o.need > 8 || o.open) continue; if (pts.some(p => dist(p[0], p[1], o.x, o.y) < (o.r || Math.max(o.hw, o.hh) || 6) + 8)) breakProp(o, v, 300); }
    for (const p of peds) {
      if (p.veh || p.flying || Math.abs(p.x - fx) > 50 || Math.abs(p.y - fy) > 50) continue;
      if (!pts.some(q => dist(q[0], q[1], p.x, p.y) < p.r + 9)) continue;
      if (p.animal) { if (p.type === 'cow') { p.vx += c * 140; p.vy += s * 140; Audio2.sfx('moo', p.x, p.y); } else Combat.hitPed(p, 1, c, s, byP); continue; }
      if (p.state !== 'ko') { Combat.koPed(p, byP, 6, 'combine'); p.vx = c * 220 + rnd(-40, 40); p.vy = s * 220 + rnd(-40, 40); FX.burst(p.x, p.y, ['#e9cf6a', '#d4b64a', '#fff'], 12, 120, 3); say(p, pick(['אאאא!', 'הקומביין!!', 'עצור את המכונה!']), 1.5); }
    }
    for (const o of actV) { if (o === v || o.towedBy || o.alt > .05) continue; if (dist(o.x, o.y, fx, fy) < o.d.W / 2 + 34) { o.hp -= 140 * dt; o.stun = Math.max(o.stun, .4); o.vx += c * 90 * dt; o.vy += s * 90 * dt; if (Math.random() < .3) FX.burst(o.x, o.y, ['#ccc', '#888', '#ffb35a'], 3, 80, 2); if (o.hp <= 0) killVeh(o); if (byP) G.crime(.3 * dt, o.x, o.y); } }
    // straw out the back, noise, and the kibbutz notices
    const bx = v.x - c * v.d.L / 2, by = v.y - s * v.d.L / 2;
    if (Math.random() < .6) FX.parts.push({ x: bx + rnd(-10, 10), y: by + rnd(-10, 10), z: 14, vx: -c * 40 + rnd(-15, 15), vy: -s * 40 + rnd(-15, 15), vz: 12, life: 1.6, max: 1.6, col: 'rgba(222,196,120,', sz: rnd(5, 9), k: 'smoke' });
    for (let i = 0; i < 2; i++) FX.parts.push({ x: bx + rnd(-8, 8), y: by + rnd(-8, 8), z: 10, vx: -c * rnd(30, 70) + rnd(-20, 20), vy: -s * rnd(30, 70) + rnd(-20, 20), vz: rnd(20, 60), life: rnd(.6, 1.1), max: 1, col: pick(['#e9cf6a', '#d4b64a', '#c9a650']), sz: rnd(1.4, 2.6), k: 'chip' });
    harvestSnd -= dt; if (harvestSnd <= 0) { harvestSnd = .28; Audio2.sfx('harvest', v.x, v.y); }
    if (byP) { G.shake = Math.max(G.shake, 1.2); if (MAP.isKibbutz(v.x, v.y)) G.crime(.5 * dt); }
  }

  /* ---------------- crop duster ---------------- */
  function planePhysics(v, dt) {
    const d = v.d, ctrl = (v.dead || !v.driver) ? NOCTRL : v.ctrl;
    v.alt = v.alt || 0;
    const c = Math.cos(v.a), s = Math.sin(v.a); let vf = v.vx * c + v.vy * s, vl = -v.vx * s + v.vy * c;
    if (v.alt <= 0) {
      const m = MINFO[matAt(v.x, v.y)], drag = m.road ? 1 : m.water ? .3 : Math.max(.5, m.drag * .95);
      if (ctrl.thr > 0 && !ctrl.hb) vf += d.acc * ctrl.thr * dt * Math.max(0, 1 - vf / (300 * drag));
      else if (ctrl.thr < 0 || ctrl.hb) { if (vf > 5) vf -= d.brake * dt; else if (ctrl.thr < 0) vf = Math.max(-35, vf - 60 * dt); }
      else vf *= Math.exp(-(v.driver ? .35 : 2.5) * dt);
      vl *= Math.exp(-14 * dt);
      v.steer += (ctrl.steer - v.steer) * Math.min(1, dt * 8);
      v.a += v.steer * 1.8 * dt * clamp(vf / 45, -1, 1);
      if (vf > 235 && ctrl.thr > 0) { v.alt = .02; if (v.driver === 'player') { G.msg('המראה!', '#cfe9ff'); Audio2.sfx('whoosh', v.x, v.y); } }
      if (m.water) { v.flood += dt; if (v.flood > 1 && !v.dead) killVeh(v, 'flood'); } else v.flood = 0;
    } else {
      const target = ctrl.hb || ctrl.thr < 0 ? 150 : ctrl.thr > 0 ? 440 : 290;
      vf += (target - vf) * Math.min(1, dt * .45);
      vl *= Math.exp(-6 * dt);
      v.steer += (ctrl.steer - v.steer) * Math.min(1, dt * 4);
      v.a += v.steer * d.turn * dt;
      if (vf > 215) v.alt = Math.min(1, v.alt + .5 * dt); else v.alt -= ((215 - vf) / 215 * 1.4 + .12) * dt;
      if (v.alt <= 0) { v.alt = 0; vf = touchdown(v, vf); }
    }
    v.bank = (v.bank || 0) + ((v.alt > 0 ? v.steer : 0) - (v.bank || 0)) * Math.min(1, dt * 5);
    v.prop = (v.prop || 0) + dt * (v.driver && !v.dead ? 40 + Math.abs(vf) * .15 : 0);
    const c2 = Math.cos(v.a), s2 = Math.sin(v.a);
    v.vx = vf * c2 - vl * s2; v.vy = vf * s2 + vl * c2; v.x += v.vx * dt; v.y += v.vy * dt; v.vf = vf; v.vl = vl;
    if (v.alt > 0) { v.x = clamp(v.x, 40, WORLD_W - 40); v.y = clamp(v.y, 40, WORLD_H - 40); }
  }
  function touchdown(v, vf) {
    const m = MINFO[matAt(v.x, v.y)], byP = v.driver === 'player';
    if (m.water) { killVeh(v, 'flood'); return vf * .3; }
    if (buildingAt(v.x, v.y) || vf > 300) {
      v.hp -= 90 + Math.max(0, vf - 220) * 1.2; Audio2.sfx('crash', v.x, v.y); FX.burst(v.x, v.y, ['#f2c230', '#888', '#fff'], 22, 120, 4);
      if (byP) { G.shake = 9; G.msg('נחיתה קשה!', '#ff9b6b'); }
      if (v.hp <= 0) killVeh(v); return vf * .35;
    }
    Audio2.sfx('thud', v.x, v.y);
    if (byP) G.msg(m.road ? 'נחיתה רכה. כמו פעם' : 'נחיתת שטח. הרכז לא יאהב את זה', '#cfe9ff');
    return vf;
  }
  let sprayT = 0;
  function sprayTick(v, dt) {
    const c = Math.cos(v.a), s = Math.sin(v.a);
    for (let i = 0; i < 3; i++) { const o = rnd(-34, 34); FX.parts.push({ x: v.x - c * 6 - s * o, y: v.y - s * 6 + c * o, z: v.alt * 40, vx: -c * 60 + rnd(-15, 15), vy: -s * 60 + rnd(-15, 15), vz: -25, life: 1.8, max: 1.8, col: 'rgba(214,232,196,', sz: rnd(4, 7), k: 'smoke' }); }
    sprayT -= dt; if (sprayT > 0) return; sprayT = .14;
    if (Math.random() < .5) Audio2.sfx('puff', v.x, v.y);
    const bx = v.x - c * 50, by = v.y - s * 50, R = 46 + v.alt * 14;
    for (const p of peds) {
      if (p.veh || p.flying || p.state === 'ko' || Math.abs(p.x - bx) > R || Math.abs(p.y - by) > R || dist(p.x, p.y, bx, by) > R) continue;
      if ((p.sprayed || 0) > G.time) continue; p.sprayed = G.time + 2.5;
      if (p.animal) { if (p.type !== 'cow') { p.state = 'flee'; p.timer = 3; } continue; }
      if (Math.random() < .4) Combat.koPed(p, true, 3.5, 'spray');
      else { p.state = 'flee'; p.timer = 3.5; p.fx = bx; p.fy = by; G.crime(.15, p.x, p.y); }
      say(p, pick(['כחח! ריסוס!', 'מה זה הריח הזה?!', 'סגרו חלונות!', 'מי הזמין ריסוס?!', 'הכביסה שלי!']), 1.8);
    }
    if (MAP.isKibbutz(bx, by)) G.crime(.08, bx, by);
  }

  /* ---------------- the yellow gate ---------------- */
  let gateWas = true;
  function gateTick(dt) {
    const o = MAP.gate; if (!o || o.broken) return;
    const want = ENV.night < .55 && G.level < 2;
    o.openK += ((want ? 1 : 0) - o.openK) * Math.min(1, dt * 1.6);
    o.open = o.openK > .5; o.solid = !o.open;
    if (gateWas && !want) {
      const P0 = Player.veh || Player, near = dist(P0.x, P0.y, o.x, o.y) < 1600;
      if (near) { G.msg(G.level >= 2 ? 'השער הצהוב נסגר! הקב"ט נעל את הקיבוץ' : 'השער הצהוב נסגר ללילה', '#ffd23f'); Audio2.sfx('thud', o.x, o.y); }
    }
    gateWas = want;
  }

  /* ---------------- cows ---------------- */
  function penBroken(o) {
    if (!MAP.pen) return;
    const first = !MAP.pen.open; MAP.pen.open = true;
    // a cow-sized gap: the neighbouring panels give way too
    for (const q of props) if (q.pen && !q.broken && q !== o && dist(q.x, q.y, o.x, o.y) < 40) { q.broken = true; q.solid = false; FX.burst(q.x, q.y, PT.fence.burst, 6, 80, 3); }
    const dx = o.x - MAP.pen.x, dy = o.y - MAP.pen.y, l = Math.hypot(dx, dy) || 1, ox = dx / l, oy = dy / l;
    let n = 0;
    for (const p of peds) {
      if (p.type !== 'cow' || p.free || p.mission || !p.pen) continue;
      p.pen = null; p.free = true; p.state = 'escape'; p.timer = 30 + n * 2; n++;
      p.hole = { x: o.x - ox * 22, y: o.y - oy * 22 }; p.hole2 = { x: o.x + ox * 30, y: o.y + oy * 30 };
      p.tx = o.x + ox * rnd(120, 420) + rnd(-90, 90); p.ty = o.y + oy * rnd(120, 420) + rnd(-90, 90);
    }
    if (first && n) { G.msg('הגדר של הרפת נשברה! הפרות בורחות!', '#ffb35a'); Audio2.sfx('moo', o.x, o.y); G.addScore(40, o.x, o.y, true); }
  }
  let cowT = 0;
  function cowTick(dt) {
    cowT -= dt; if (cowT > 0) return; cowT = .9;
    for (const p of peds) {
      if (p.type !== 'cow' || !p.free) continue;
      if (p.state === 'roam' && MINFO[matAt(p.x + p.fx * 24, p.y + p.fy * 24)].water) { p.fx = -p.fx; p.fy = -p.fy; }
      if (Math.random() < .08) { Audio2.sfx('moo', p.x, p.y); say(p, pick(['מוווו!', 'מו?', 'מוווו... (חופש!)']), 1.4); }
      if (MAP.isKibbutz(p.x, p.y) && Math.random() < .35) for (const q of peds) {
        if (q.animal || q.veh || q.state === 'ko' || q.sayL > 0 || dist(q.x, q.y, p.x, p.y) > 140) continue;
        say(q, pick(['פרה על הדשא!', 'מי פתח את הרפת?!', 'שאולי! הפרות שלך!', 'היא אוכלת לי את הגינה!', 'זה עולה באסיפה!']), 2); break;
      }
    }
  }

  function tick(dt) {
    towTick(dt); gateTick(dt); cowTick(dt); egretTick(dt);
    if (G.harvestT > 0) G.harvestT -= dt;
    for (const v of actV) {
      if (v.type === 'combine' && v.pto && !v.dead) { if (v.driver === 'player') combineTick(v, dt); else v.pto = false; }
      if (v.d.plane && v.sprayOn && v.driver === 'player') sprayTick(v, dt);
    }
  }
  return { tick, hitchKey, ptoKey, planePhysics, penBroken, hitchPt, tonguePt };
})();
