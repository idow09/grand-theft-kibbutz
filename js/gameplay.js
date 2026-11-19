'use strict';
/* ================================================================
   gameplay.js — game state, player, combat, wanted level & chasers,
   shops, garages, pickups, rampages, save/load
   ================================================================ */
const G = {
  state: 'loading', time: 0, money: 0, heat: 0, level: 0, unseen: 0, grab: 0, combo: 0, comboT: 0, shake: 0,
  destroyed: 0, kos: 0, respect: { cow: 0, youth: 0, kitchen: 0 }, done: {}, eggs: {}, rampDone: {}, msgs: [], banner: null, phoneCall: null,
  district: '', districtT: 0, vehToast: null, mission: null, rampage: null, interact: null, spawnT: 0, tips: {}, saveT: 60, shopMenu: null, bustedMsg: '',
  msg(t, col) { this.msgs.push({ t, col: col || '#fff', life: 5 }); if (this.msgs.length > 4) this.msgs.shift(); },
  bigBanner(t, sub, col, life) { this.banner = { t, sub: sub || '', col: col || '#ffe14a', life: life || 3.4 }; },
  tip(id, t) { if (this.tips[id]) return; this.tips[id] = 1; this.msg(t, '#cfe9ff'); },
  get mult() { return 1 + Math.min(4, Math.floor(this.combo / 5)); },
  addScore(base, x, y, noCombo) {
    if (!noCombo) { this.combo++; this.comboT = 5; }
    const val = Math.round(base * (noCombo ? 1 : this.mult) * (this.rampage && this.rampage.double ? 2 : 1));
    this.money += val; if (val > 0) FX.floater(x, y, '+' + val); return val;
  },
  crime(h, x, y) {
    if (Player.out > 0) return false; x = x ?? Player.x; y = y ?? Player.y;
    let seen = false;
    for (const p of peds) {
      if (p.state === 'ko' || !(p.type === 'elder' || p.type === 'guard' || p.state === 'chase')) continue;
      if (Math.abs(p.x - x) > 330 || Math.abs(p.y - y) > 330) continue;
      seen = true; if (p.sayL <= 0 && Math.random() < .2) say(p, pick(LINES.elderAngry), 1.7);
    }
    for (const v of actV) if (v.ai === 'chase' && dist(v.x, v.y, x, y) < 420) seen = true;
    if (seen) { this.heat = Math.min(16, this.heat + h); this.unseen = 0; }
    return seen;
  },
  onDestroy(o) {
    this.destroyed++; this.addScore(o.val, o.x, o.y);
    if (MAP.isKibbutz(o.x, o.y)) this.crime(o.need >= 3 ? .55 : .25, o.x, o.y);
    if (Math.random() < .3 && o.val >= 15) Pickups.coin(o.x, o.y, o.val >= 40 ? 10 : 5);
    if (this.mission && this.mission.onDestroy) this.mission.onDestroy(o);
    if (this.rampage && this.rampage.onDestroy) this.rampage.onDestroy(o);
  },
};

/* ================================================================ PLAYER */
const Player = {
  x: 0, y: 0, a: Math.PI / 2, vx: 0, vy: 0, hp: 100, armor: 0, veh: null, wp: 'fist', cd: 0, out: 0, outKind: '', flash: 0, punch: 0, walk: 0, swim: false,
  inv: { fist: 1, toto: 0, soaker: 0, balloon: 0, ext: 0 }, sayT: '', sayL: 0, _att: false,
  hurt(d, fx, fy) {
    if (this.out > 0 || this.flash > 0) return;
    if (this.armor > 0) { const ab = Math.min(this.armor, d * .6); this.armor -= ab; d -= ab; }
    this.hp -= d; this.flash = .35; G.shake = Math.min(9, G.shake + 2 + d * .2); Audio2.sfx('hurt');
    if (fx !== undefined && !this.veh) { const l = dist(this.x, this.y, fx, fy) || 1; this.vx += (this.x - fx) / l * 150; this.vy += (this.y - fy) / l * 150; }
    if (this.hp <= 0) faint();
  },
  fallOff(sp) {
    const v = this.veh; if (!v) return; this.exit(true);
    this.vx = v.vx * .6; this.vy = v.vy * .6; this.hurt(Math.min(18, sp * .08)); this.stumble = .7; G.msg('!נפלת מה' + v.d.name, '#ffb36b');
  },
  enter(v) {
    if (v.dead) { G.msg('...ה' + v.d.name + ' הזה כבר לא יזוז', '#ffb36b'); return; }
    if (v.driver && v.driver !== 'player') {
      const d = v.driver; ejectDriver(v); Combat.koPed(d, true, 4.5, 'pulled');
      say(d, d.type === 'elder' ? '!גנב! הקלנועית שלי' : '!היי! זה שלי', 2.2);
      if (v.ai !== 'chase') G.crime(1.4, v.x, v.y);
    }
    v.ai = null; v.driver = 'player'; this.veh = v; pressed.KeyE = pressed.Enter = false;
    Audio2.sfx(v.d.horn === 'bell' ? 'bell' : 'click', v.x, v.y);
    G.vehToast = { t: v.d.name, life: 2.5 };
    if (v.frenzy && !G.rampage) { v.frenzy = false; Rampage.start('tractor', v); }
    if (G.mission && G.mission.onEnter) G.mission.onEnter(v);
    G.tip('radio', 'R = החלפת תחנת רדיו · H = צופר · Space = בלם יד');
  },
  exit(force) {
    const v = this.veh; if (!v) return;
    if (!force && Math.hypot(v.vx, v.vy) > 160) return;
    for (const sd of [1, -1, 2, -2]) {
      const ang = v.a + (Math.abs(sd) === 2 ? (sd > 0 ? Math.PI : 0) : sd * Math.PI / 2), off = (Math.abs(sd) === 2 ? v.d.L : v.d.W) / 2 + 9;
      const x = v.x + Math.cos(ang) * off, y = v.y + Math.sin(ang) * off;
      if (!solidAt(x, y, 7)) { this.x = x; this.y = y; break; }
      this.x = v.x + Math.cos(ang) * (off + 12); this.y = v.y + Math.sin(ang) * (off + 12);
    }
    v.driver = null; this.veh = null; this.vx = this.vy = 0; pressed.KeyE = pressed.Enter = false;
    Audio2.setEngine('none', 0);
  },
};

/* ================================================================ COMBAT */
const Combat = (() => {
  const shots = [], balloons = [], tomatoes = [];
  function koPed(p, byPlayer, t, kind) {
    if (p.state === 'ko' || p.veh) return;
    if (p.animal) { animalHit(p, 0, 0); return; }
    p.state = 'ko'; p.timer = t || (p.type === 'elder' ? 5 : 6.5); p.sayL = 0; p.umbrella = false;
    FX.burst(p.x, p.y, ['#fff', '#ffe14a'], 6, 60, 2.4);
    if (byPlayer) {
      G.kos++; G.addScore(p.type === 'elder' ? 8 : 12, p.x, p.y);
      if (kind !== 'pulled') { const n = rint(1, 3); for (let i = 0; i < n; i++) Pickups.coin(p.x + rnd(-14, 14), p.y + rnd(-14, 14), pick([5, 5, 10])); }
      G.crime(p.type === 'elder' ? 2.2 : 1.2, p.x, p.y);
      if (G.mission && G.mission.onKO) G.mission.onKO(p, kind);
      if (G.rampage && G.rampage.onKO) G.rampage.onKO(p, kind);
    }
  }
  function animalHit(p, kx, ky) {
    switch (p.type) {
      case 'chicken': p.state = 'flee'; p.timer = 2.5; Audio2.sfx('cluck', p.x, p.y); FX.burst(p.x, p.y, ['#fff', '#eee'], 5, 50, 2); break;
      case 'cow': Audio2.sfx('moo', p.x, p.y); say(p, '!מוווו', 1.4); p.vx += kx * 50; p.vy += ky * 50; break;
      case 'dog': case 'cat': p.state = 'flee'; p.timer = 4; Audio2.sfx(p.type === 'dog' ? 'bark' : 'cluck', p.x, p.y); break;
      case 'heron': p.state = 'fly'; p.timer = 5; p.fx = kx || 1; p.fy = ky || 0; break;
      default: p.state = 'flee'; p.timer = 2;
    }
  }
  function hitPed(p, dmg, kx, ky, byPlayer, kind) {
    if (p.state === 'ko' || p.veh) return;
    if (p.animal) { animalHit(p, kx, ky); return; }
    p.hp -= dmg; p.vx = kx * 160; p.vy = ky * 160; FX.burst(p.x, p.y, ['#fff', '#ffe14a'], 4, 70, 2.4);
    if (p.hp <= 0) { koPed(p, byPlayer, undefined, kind); return; }
    if (p.state === 'chase') return;
    if (p.brawl && byPlayer && kind === 'punch') { p.state = 'fight'; p.timer = 8; say(p, pick(['!מה אתה רוצה ממני', '!בוא נראה אותך']), 1.5); }
    else { p.state = 'flee'; p.timer = 4; say(p, pick(LINES.hurt), 1.3); }
    if (byPlayer) G.crime(kind === 'punch' ? .5 : .35, p.x, p.y);
  }
  function vehicleHitsPed(v, p, sp) {
    if (p.animal) { if (p.type === 'cow') { p.vx += v.vx * .25; p.vy += v.vy * .25; v.vx *= .75; v.vy *= .75; Audio2.sfx('moo', p.x, p.y); say(p, '!מוווו', 1.4); } else animalHit(p, v.vx / sp, v.vy / sp); return; }
    const dx = p.x - v.x, dy = p.y - v.y, d = Math.hypot(dx, dy) || 1;
    p.vx = v.vx * 1.2 + dx / d * 60; p.vy = v.vy * 1.2 + dy / d * 60;
    const byP = v.driver === 'player';
    koPed(p, byP, p.type === 'elder' ? 5 : 7, 'car');
    Audio2.sfx('punch', p.x, p.y);
    if (byP) { G.addScore(5, p.x, p.y); if (v.d.mass < 3) { v.vx *= .6; v.vy *= .6; } }
  }
  function fireFrom(x, y, a, inVeh) {
    const P = Player, fx = Math.cos(a), fy = Math.sin(a);
    if (P.wp === 'toto' && P.inv.toto > 0) {
      P.inv.toto--; P.cd = inVeh ? .3 : .22; Audio2.sfx('toto', x, y);
      shots.push({ x: x + fx * 12, y: y + fy * 12, vx: fx * 560 + (inVeh ? inVeh.vx : 0), vy: fy * 560 + (inVeh ? inVeh.vy : 0), life: .6, a, k: 'toto' });
      G.crime(.45); if (P.inv.toto <= 0) { G.msg('נגמרו קופוני הטוטו', '#ffd'); cycleWeapon(); }
      return true;
    }
    if ((P.wp === 'soaker' && P.inv.soaker > 0) || (P.wp === 'ext' && P.inv.ext > 0)) return 'stream';
    return false;
  }
  function stream(dt, x, y, a, kind) {
    const P = Player, fx = Math.cos(a), fy = Math.sin(a), ext = kind === 'ext';
    P.inv[kind] = Math.max(0, P.inv[kind] - dt);
    for (let i = 0; i < (ext ? 4 : 3); i++) {
      const sp = ext ? rnd(130, 220) : rnd(300, 380), j = ext ? .5 : .12, aa = a + rnd(-j, j);
      if (ext) FX.parts.push({ x: x + fx * 10, y: y + fy * 10, z: 6, vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp, vz: 6, life: .7, max: .7, col: 'rgba(245,245,245,', sz: rnd(3, 6), k: 'smoke' });
      else FX.spray(x + fx * 12, y + fy * 12, Math.cos(aa) * sp, Math.sin(aa) * sp, null, .38);
    }
    if (Math.random() < .25) Audio2.sfx(ext ? 'puff' : 'soak', x, y);
    const range = ext ? 85 : 140, cone = ext ? .6 : .28;
    for (const p of peds) {
      if (p.veh || p.state === 'ko' || p.flying) continue;
      const dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy); if (d > range || d < 1) continue;
      if (Math.abs(angDiff(a, Math.atan2(dy, dx))) > cone) continue;
      if (p.animal) { if (Math.random() < .1) animalHit(p, fx, fy); continue; }
      p.wet += dt * (ext ? 2.2 : 1.3); p.vx += fx * 140 * dt; p.vy += fy * 140 * dt;
      if (p.state !== 'chase' && p.state !== 'fight') { p.state = 'flee'; p.timer = 2; }
      if (p.wet > 1) { koPed(p, true, 3.6, kind); p.wet = 0; }
    }
    for (const v of actV) { if (v === P.veh || !v.driver || v.driver === 'player') continue; if (dist(v.x, v.y, x + fx * range * .6, y + fy * range * .6) < range * .5) { v.stun = Math.max(v.stun, ext ? 1.4 : .6); if (Math.random() < .05) say(v.driver, ext ? '!אני לא רואה כלום' : '!רטוב לי', 1.3); } }
    if (ext && Math.random() < .2) Ground.addDecal({ k: 'powder', x: x + fx * rnd(20, 70), y: y + fy * rnd(20, 70), r: rnd(6, 12) });
    if (Math.random() < dt * 2) G.crime(.25);
    if (P.inv[kind] <= 0) { G.msg(ext ? 'המטף התרוקן' : 'נגמרו המים', '#ffd'); cycleWeapon(); }
  }
  function playerAttack(dt, pressedNow, held) {
    const P = Player; if (P.cd > 0 || P.out > 0) return;
    const fx = Math.cos(P.a), fy = Math.sin(P.a);
    if (P.wp === 'fist') {
      if (!pressedNow) return;
      P.cd = .33; P.punch = .16; Audio2.sfx('whoosh', P.x, P.y);
      const hx = P.x + fx * 15, hy = P.y + fy * 15; let hit = false;
      for (const q of peds) { if (q.state === 'ko' || q.veh || q.flying) continue; if (dist(q.x, q.y, hx, hy) < q.r + 9) { hitPed(q, 1.5, fx, fy, true, 'punch'); hit = true; } }
      pgrid.query(hx - 12, hy - 12, hx + 12, hy + 12, _gq);
      for (const o of _gq) if (!o.broken && o.need === 0 && dist(o.x, o.y, hx, hy) < (o.r || 10) + 8) { breakProp(o, null, 0); hit = true; }
      for (const v of actV) if (v.driver && v.driver !== 'player' && dist(v.x, v.y, hx, hy) < v.d.W / 2 + 10 && Math.hypot(v.vx, v.vy) < 60) { v.stun = 1.6; say(v.driver, '!היי', 1.3); G.crime(.8, v.x, v.y); hit = true; }
      if (hit) Audio2.sfx('punch', P.x, P.y);
    } else if (P.wp === 'toto' && pressedNow) fireFrom(P.x, P.y, P.a);
    else if (P.wp === 'balloon' && pressedNow && P.inv.balloon > 0) {
      P.inv.balloon--; P.cd = .45; P.throwT = .25; Audio2.sfx('whoosh', P.x, P.y);
      let tx = P.x + fx * 150, ty = P.y + fy * 150;
      let best = null, bd = 1e9; for (const q of peds) { if (q.state === 'ko' || q.veh || q.animal) continue; const dx = q.x - P.x, dy = q.y - P.y, d = Math.hypot(dx, dy); if (d < 60 || d > 230) continue; if (Math.abs(angDiff(P.a, Math.atan2(dy, dx))) < .35 && d < bd) { bd = d; best = q; } }
      if (best) { tx = best.x; ty = best.y; }
      balloons.push({ x0: P.x, y0: P.y, x1: tx, y1: ty, t: 0, T: .6, x: P.x, y: P.y });
      if (P.inv.balloon <= 0) cycleWeapon();
    } else if ((P.wp === 'soaker' || P.wp === 'ext') && held && P.inv[P.wp] > 0) stream(dt, P.x, P.y, P.a, P.wp);
  }
  function balloonLand(b) {
    Audio2.sfx('splash', b.x1, b.y1); FX.burst(b.x1, b.y1, ['#7fd0ff', '#bfe8ff', '#fff'], 24, 130, 3.5);
    Ground.addDecal({ k: 'splat', x: b.x1, y: b.y1, r: 9, col: 'rgba(60,110,140,.22)' });
    for (const q of peds) if (q.state !== 'ko' && !q.veh && dist(q.x, q.y, b.x1, b.y1) < 56) { if (q.animal) animalHit(q, 0, 0); else koPed(q, true, 3.4, 'balloon'); }
    for (const v of actV) if (v !== Player.veh && dist(v.x, v.y, b.x1, b.y1) < 50) { v.stun = 2; if (v.driver && v.driver !== 'player') { say(v.driver, '!הקרציה הזו', 1.5); G.crime(.6, v.x, v.y); } }
  }
  const _gq = [];
  function tick(dt) {
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i]; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; let hit = false;
      if (Math.random() < .5) FX.parts.push({ x: s.x, y: s.y, z: 4, vx: 0, vy: 0, vz: 0, life: .15, max: .15, col: '#fff', sz: 1.2, k: 'drop' });
      if (buildingAt(s.x, s.y)) hit = true;
      if (!hit) for (const q of peds) { if (q.veh || q.state === 'ko' || q.flying) continue; if (Math.abs(q.x - s.x) < 10 && Math.abs(q.y - s.y) < 10 && dist(q.x, q.y, s.x, s.y) < q.r + 3) { hitPed(q, 1.6, s.vx / 560, s.vy / 560, true, 'toto'); hit = true; break; } }
      if (!hit) for (const v of actV) { if (v === Player.veh) continue; if (dist(v.x, v.y, s.x, s.y) < v.d.W / 2 + 4) { if (v.driver && v.driver !== 'player') { v.stun = 2.2; say(v.driver, '!אוי! הטוטו', 1.4); G.crime(.7, v.x, v.y); if (G.rampage && G.rampage.onVehShot) G.rampage.onVehShot(v); } hit = true; break; } }
      if (!hit) { pgrid.query(s.x - 6, s.y - 6, s.x + 6, s.y + 6, _gq); for (const o of _gq) { if (o.broken) continue; if (o.need === 0 && shapePush(o, s.x, s.y, 2)) { breakProp(o, null, 0); hit = true; break; } if (o.solid && shapePush(o, s.x, s.y, 1)) { hit = true; break; } } }
      if (hit || s.life <= 0) { FX.burst(s.x, s.y, ['#fff', '#ffe14a'], 4, 60, 2); shots.splice(i, 1); }
    }
    for (let i = balloons.length - 1; i >= 0; i--) { const b = balloons[i]; b.t += dt; const k = Math.min(1, b.t / b.T); b.x = lerp(b.x0, b.x1, k); b.y = lerp(b.y0, b.y1, k); b.h = Math.sin(k * Math.PI) * 26; if (k >= 1) { balloonLand(b); balloons.splice(i, 1); } }
    for (let i = tomatoes.length - 1; i >= 0; i--) { const b = tomatoes[i]; b.t += dt; const k = Math.min(1, b.t / b.T); b.x = lerp(b.x0, b.x1, k); b.y = lerp(b.y0, b.y1, k); b.h = Math.sin(k * Math.PI) * 18;
      if (k >= 1) { tomatoes.splice(i, 1); Audio2.sfx('splash', b.x1, b.y1); Ground.addDecal({ k: 'splat', x: b.x1, y: b.y1, r: 4, col: 'rgba(200,40,30,.6)' }); FX.burst(b.x1, b.y1, ['#d32', '#e54'], 8, 60, 2.5); if (!Player.veh && dist(Player.x, Player.y, b.x1, b.y1) < 14) Player.hurt(3); } }
  }
  function throwTomato(p) { const tx = (Player.veh || Player).x + rnd(-8, 8), ty = (Player.veh || Player).y + rnd(-8, 8); tomatoes.push({ x0: p.x, y0: p.y, x1: tx, y1: ty, t: 0, T: dist(p.x, p.y, tx, ty) / 260, x: p.x, y: p.y }); }
  return { shots, balloons, tomatoes, koPed, hitPed, vehicleHitsPed, playerAttack, fireFrom, stream, tick, throwTomato };
})();
const W_ORDER = ['fist', 'toto', 'soaker', 'balloon', 'ext'];
const W_NAME = { fist: 'אגרופים', toto: 'אקדח טוטו', soaker: 'רובה מים', balloon: 'בלוני מים', ext: 'מטף' };
function cycleWeapon(dir) {
  dir = dir || 1; const P = Player; let i = W_ORDER.indexOf(P.wp);
  for (let k = 1; k <= 5; k++) { const w = W_ORDER[(i + k * dir + 10) % 5]; if (P.inv[w] > 0) { P.wp = w; return; } }
}

/* ================================================================ WANTED / CHASERS */
const LEVEL_AT = [0, .6, 3, 5.5, 8.5, 12];
function heatLevel() { let l = 0; for (let i = 1; i < 6; i++) if (G.heat >= LEVEL_AT[i]) l = i; return l; }
function spawnChaser(lvl) {
  const P0 = Player.veh || Player, r = Math.random();
  let kind = 'foot';
  if (lvl === 2) kind = r < .5 ? 'foot' : 'kalnoit';
  else if (lvl === 3) kind = r < .3 ? 'foot' : r < .7 ? 'kalnoit' : 'cart';
  else if (lvl === 4) kind = r < .35 ? 'kalnoit' : r < .6 ? 'cart' : 'pickup';
  else if (lvl >= 5) kind = r < .25 ? 'cart' : r < .6 ? 'pickup' : r < .82 ? 'tractor' : 'kalnoit';
  const mask = kind === 'foot' ? MASK_PED : kind === 'pickup' || kind === 'tractor' ? MASK_CAR : MASK_SMALL;
  for (let t = 0; t < 10; t++) {
    const a = Math.random() * TAU, R = rnd(520, 880), n = nearestNode(P0.x + Math.cos(a) * R, P0.y + Math.sin(a) * R, mask, 400);
    if (!n || !offscreen(n.x, n.y, 30) || dist(n.x, n.y, P0.x, P0.y) < 420) continue;
    if (kind === 'foot') { const e = mkPed(lvl >= 4 && Math.random() < .5 ? 'guard' : 'elder', n.x, n.y); e.state = 'chase'; e.chaser = true; return; }
    const v = mkVeh(kind, n.x, n.y, Math.atan2(P0.y - n.y, P0.x - n.x), kind === 'kalnoit' ? pick(['#e8c547', '#d9d9de', '#c0392b']) : kind === 'tractor' ? '#c8352b' : kind === 'pickup' ? '#f2f2f2' : '#f2f2f2');
    const dr = mkPed(kind === 'pickup' ? 'guard' : 'elder', n.x, n.y); dr.veh = v; dr.state = 'drive'; v.driver = dr; v.ai = 'chase'; v.chaser = true;
    v.beacon = kind === 'pickup' ? '#ffd23f' : kind === 'cart' ? '#ff8a1a' : kind === 'tractor' ? '#ff3b3b' : null;
    say(dr, kind === 'cart' ? '!ועד הקיבוץ! עצור' : kind === 'pickup' ? '!קב"ט! לעצור בצד' : kind === 'tractor' ? '!רכז המשק בדרך' : '!עצור', 2.2);
    if (kind === 'cart') Audio2.sfx('megaphone', v.x, v.y);
    return;
  }
}
function wantedTick(dt) {
  const P0 = Player.veh || Player;
  let near = false;
  for (const p of peds) if (p.state === 'chase' && dist(p.x, p.y, P0.x, P0.y) < 430) { near = true; break; }
  if (!near) for (const v of actV) if (v.ai === 'chase' && dist(v.x, v.y, P0.x, P0.y) < 480) { near = true; break; }
  if (!near) { G.unseen += dt; if (G.unseen > 3 && G.heat > 0) G.heat = Math.max(0, G.heat - (.3 + .12 * G.level) * dt); }
  else G.unseen = Math.min(G.unseen, 1);
  const lvl = heatLevel();
  if (lvl > G.level) { G.msg(['', '!סבתא ראתה אותך', '!הזקנים יוצאים לקלנועיות', '!ועד הקיבוץ התכנס', '!הקב"ט בדרך', '!רכז המשק עלה על הטרקטור'][lvl], '#ff9b6b'); Audio2.sfx('alert'); }
  else if (lvl < G.level && lvl === 0) { G.msg('הוועד שכח ממך... בינתיים', '#9be26b'); releaseChasers(); }
  G.level = lvl;
  if (G.level > 0 && Player.out <= 0) {
    for (const q of peds) if ((q.type === 'elder' || q.type === 'guard') && (q.state === 'walk' || q.state === 'idle' || q.state === 'flee') && !q.veh && dist(q.x, q.y, P0.x, P0.y) < 330) { q.state = 'chase'; say(q, pick(LINES.elderAngry), 1.6); }
    G.spawnT -= dt;
    const want = [0, 2, 3, 5, 6, 8][G.level]; let cnt = 0;
    for (const q of peds) if (q.state === 'chase') cnt++; for (const v of vehicles) if (v.ai === 'chase') cnt++;
    if (G.spawnT <= 0 && cnt < want) { G.spawnT = 2.4 - G.level * .25; spawnChaser(G.level); }
    for (const v of actV) if (v.beacon && Math.random() < dt * .3) Audio2.sfx(v.type === 'cart' ? 'megaphone' : 'siren', v.x, v.y);
  }
  // grab / bust
  let grabbing = 0; const psp = Player.veh ? Math.hypot(Player.veh.vx, Player.veh.vy) : Math.hypot(Player.vx, Player.vy);
  if (G.level > 0 && Player.out <= 0 && psp < 55) {
    for (const q of peds) if (q.state === 'chase' && dist(q.x, q.y, P0.x, P0.y) < (Player.veh ? Player.veh.d.L / 2 + 14 : 22)) grabbing++;
    for (const v of actV) if (v.ai === 'chase' && dist(v.x, v.y, P0.x, P0.y) < v.d.L / 2 + (Player.veh ? Player.veh.d.L / 2 : 0) + 18) grabbing++;
  }
  if (grabbing > 0) G.grab += dt * .7 * Math.min(grabbing, 3); else G.grab = Math.max(0, G.grab - dt * 1.4);
  if (G.grab >= 1) { G.grab = 0; busted(); }
}
function releaseChasers() {
  for (const q of peds) if (q.state === 'chase') { q.state = 'walk'; q.node = null; pedPickTarget(q); }
  for (const v of vehicles) if (v.ai === 'chase') { v.ai = 'release'; v.beacon = null; }
}
function resetWanted() { G.heat = 0; G.level = 0; G.grab = 0; releaseChasers(); }

function faint() {
  if (Player.out > 0) return; Player.out = 3.4; Player.outKind = 'faint'; G.combo = 0;
  if (Player.veh) Player.exit(true);
  const loss = Math.floor(G.money * .12); G.money -= loss;
  G.bigBanner('!התעלפת', `התעוררת במרפאה. הטיפול עלה ${loss} ₪`, '#ff8a8a'); Audio2.sfx('lose');
  Missions.fail('התעלפת באמצע המשימה'); Rampage.stop(false);
}
function busted() {
  if (Player.out > 0) return; Player.out = 3.8; Player.outKind = 'bust'; G.combo = 0;
  if (Player.veh) Player.exit(true);
  const loss = Math.min(G.money, 80 + G.level * 60); G.money -= loss;
  Player.inv = { fist: 1, toto: 0, soaker: 0, balloon: 0, ext: 0 }; Player.wp = 'fist';
  G.bigBanner('!נתפסת', pick(['הוחזרת לאסיפה כללית. היא נמשכה 4 שעות', 'נשלחת לתורנות כלים בחדר האוכל', 'הוועד החליט: שבוע בלי קלנועית']) + ` · קנס: ${loss} ₪`, '#ffcf6b'); Audio2.sfx('lose');
  Missions.fail('נתפסת על ידי הוועד'); Rampage.stop(false);
}
function respawnPlayer() {
  const p = Player.outKind === 'faint' ? MAP.clinic : MAP.office;
  Player.x = p[0]; Player.y = p[1] + 6; Player.hp = 100; Player.out = 0; Player.flash = 1.2; Player.vx = Player.vy = 0; resetWanted();
  CAM.x = Player.x; CAM.y = Player.y;
}

/* ================================================================ PICKUPS, SHOPS, GARAGES */
const Pickups = (() => {
  const items = [], coins = [];
  function coin(x, y, v) { coins.push({ x, y, v, life: 30, ph: Math.random() * 6 }); }
  function add(t, x, y, o) { items.push(Object.assign({ t, x, y, alive: true, ph: Math.random() * 6, respawn: 0 }, o || {})); }
  function init() {
    const R = RNG(31);
    const near = (p, d) => { for (let i = 0; i < 20; i++) { const x = p.x + R.range(-d, d), y = p.y + R.range(-d, d); if (!solidAt(x, y, 10) && !MINFO[matAt(x, y)].water) return [x, y]; } return [p.x, p.y]; };
    const P = MAP.pois;
    const types = ['health', 'health', 'health', 'toto', 'toto', 'balloon', 'balloon', 'soaker', 'armor', 'ext', 'health', 'toto', 'balloon', 'armor', 'soaker'];
    for (let i = 0; i < types.length; i++) { const p = P[(i * 7 + 3) % P.length]; const q = near(p, 70); add(types[i], q[0], q[1]); }
    // golden eggs: odd corners of the world
    const eggSpots = [];
    const sp = (x, y) => { for (let i = 0; i < 30; i++) { const xx = x + R.range(-60, 60), yy = y + R.range(-60, 60); if (!solidAt(xx, yy, 10) && !MINFO[matAt(xx, yy)].water) { eggSpots.push([xx, yy]); return; } } };
    sp(120, 120); sp(6280, 140); sp(150, 4650); sp(6250, 4650);
    const w = MAP.wadiPl; sp(w[Math.floor(w.length * .2)][0], w[Math.floor(w.length * .2)][1]); sp(w[Math.floor(w.length * .8)][0], w[Math.floor(w.length * .8)][1]);
    for (const n of ['הסילו', 'המאגר', 'פינת החי', 'מגדל המים', 'מגרש הכדורגל', 'השדה הסולארי']) if (POI[n]) sp(POI[n].x + 60, POI[n].y + 40);
    eggSpots.forEach((e, i) => add('egg', e[0], e[1], { id: i }));
    // rampage tokens
    const rp = ['החורשה', 'אזור התעשייה', 'שדות', 'ההרחבה', 'הלול', 'בית המשרדים'];
    const rs = [POI['החורשה'], POI['מפעל השימורים'], POI['השדה הסולארי'] || POI['המאגר'], POI['ההרחבה'], POI['הלול'], POI['תחנת הדלק']].filter(Boolean);
    rs.forEach((p, i) => { const q = near(p, 60); add('rampage', q[0], q[1], { id: i, kind: ['balloon', 'toto', 'trample', 'derby', 'chickens', 'trample'][i] }); });
  }
  function tick(dt) {
    const P = Player; if (P.out > 0) return;
    const px = P.veh ? P.veh.x : P.x, py = P.veh ? P.veh.y : P.y, pr = P.veh ? P.veh.d.L / 2 : 14;
    for (let i = coins.length - 1; i >= 0; i--) { const c = coins[i]; c.life -= dt; if (c.life <= 0) { coins.splice(i, 1); continue; }
      const d = dist(c.x, c.y, px, py); if (d < 50) { c.x += (px - c.x) * Math.min(1, dt * 9); c.y += (py - c.y) * Math.min(1, dt * 9); }
      if (d < pr) { G.money += c.v; Audio2.sfx('coin'); FX.floater(c.x, c.y, '+' + c.v); coins.splice(i, 1); } }
    for (const t of items) {
      if (!t.alive) { if (t.respawn > 0) { t.respawn -= dt; if (t.respawn <= 0) t.alive = true; } continue; }
      if (t.t === 'egg' && G.eggs[t.id]) { t.alive = false; continue; }
      if (t.t === 'rampage' && G.rampDone[t.id]) { t.alive = false; continue; }
      if (dist(t.x, t.y, px, py) > pr + 6) continue;
      if (t.t !== 'rampage' && t.t !== 'egg' && P.veh) continue;
      switch (t.t) {
        case 'health': if (P.hp >= 100) continue; P.hp = Math.min(100, P.hp + 40); G.msg('פיתה עם חומוס! +40', '#9be26b'); break;
        case 'armor': P.armor = Math.min(100, P.armor + 50); G.msg('כובע טמבל מחוזק! הגנה +50', '#e6dcb4'); break;
        case 'toto': P.inv.toto += 12; if (P.wp === 'fist') P.wp = 'toto'; G.msg('אקדח טוטו! +12 קופונים', '#ffb35a'); G.tip('weap', 'Q / Tab = החלפת נשק · J / Ctrl / עכבר = ירי'); break;
        case 'balloon': P.inv.balloon += 6; if (P.wp === 'fist') P.wp = 'balloon'; G.msg('בלוני מים! +6', '#7fd0ff'); break;
        case 'soaker': P.inv.soaker += 15; if (P.wp === 'fist') P.wp = 'soaker'; G.msg('רובה מים! 15 שניות', '#7fd0ff'); break;
        case 'ext': P.inv.ext += 12; if (P.wp === 'fist') P.wp = 'ext'; G.msg('מטף! 12 שניות של אבקה', '#fff'); break;
        case 'egg': G.eggs[t.id] = 1; const n = Object.keys(G.eggs).length; G.money += 500; G.bigBanner('!ביצת זהב', `${n}/12 · +500 ₪`, '#ffd84a', 2.5); Audio2.sfx('cash');
          if (n === 12) { G.money += 5000; G.bigBanner('!כל ביצי הזהב', 'בונוס ענק: 5000 ₪', '#ffd84a'); } Save.save(); break;
        case 'rampage': if (G.rampage || G.mission) continue; Rampage.start(t.kind, null, t.id); break;
      }
      Audio2.sfx('pickup'); t.alive = false; t.respawn = t.t === 'egg' || t.t === 'rampage' ? 0 : 60;
    }
  }
  return { items, coins, coin, add, init, tick };
})();

const SHOP_ITEMS = {
  food: [['שניצל ופירה', 25, () => Player.hp = Math.min(100, Player.hp + 60)], ['קפה ועוגה', 10, () => Player.hp = Math.min(100, Player.hp + 22)]],
  shop: [['קופוני טוטו ×12', 40, () => { Player.inv.toto += 12; Player.wp = 'toto'; }], ['בלוני מים ×6', 30, () => { Player.inv.balloon += 6; Player.wp = 'balloon'; }], ['כובע טמבל (+50 הגנה)', 35, () => Player.armor = Math.min(100, Player.armor + 50)]],
  kiosk: [['ארטיק', 8, () => Player.hp = Math.min(100, Player.hp + 15)], ['רובה מים (20 ש\')', 60, () => { Player.inv.soaker += 20; Player.wp = 'soaker'; }], ['בלוני מים ×6', 30, () => { Player.inv.balloon += 6; Player.wp = 'balloon'; }]],
  shop2: [['מטף (12 ש\')', 70, () => { Player.inv.ext += 12; Player.wp = 'ext'; }], ['בורקס', 15, () => Player.hp = Math.min(100, Player.hp + 35)], ['קופוני טוטו ×12', 40, () => { Player.inv.toto += 12; Player.wp = 'toto'; }]],
  clinic: [['טיפול של האחות', 0, () => Player.hp = 100]],
};
let sprayT = 0;
function garageTick(dt) {
  const P = Player, v = P.veh, px = v ? v.x : P.x, py = v ? v.y : P.y;
  const g = MAP.sprays.find(s => dist(px, py, s.x, s.y) < s.r);
  const sp = v ? Math.hypot(v.vx, v.vy) : Math.hypot(P.vx, P.vy);
  if (g && P.out <= 0 && sp < 40 && (G.level > 0 || (v && v.hp < v.d.hp * .9))) {
    sprayT += dt; G.sprayProg = sprayT / 1.4;
    if (sprayT > 1.4) {
      const cost = Math.min(G.money, 60 + G.level * 30); G.money -= cost;
      if (v) { v.hp = v.d.hp; v.dead = false; v.col = pick(KCOLS[v.type] || ['#888']); v.flood = 0; }
      resetWanted(); sprayT = 0; G.sprayProg = 0;
      G.bigBanner(g.name, pick(['קצת צבע, קצת שמן — כולם שכחו אותך', 'שלומי לא שואל שאלות', 'כמו חדש. בערך']) + ` · ${cost} ₪`, '#9be26b'); Audio2.sfx('cash');
    }
  } else { sprayT = Math.max(0, sprayT - dt * 2); G.sprayProg = sprayT / 1.4; }
  if (g && !G.tips.spray) G.tip('spray', 'עצור כאן לרגע — שלומי ימחק לך את הרוגז');
}
function nearestInteract() {
  const P = Player; if (P.veh || P.out > 0) return null;
  let best = null, bd = 1e9;
  for (const v of actV) { const d = dist(P.x, P.y, v.x, v.y) - v.d.L / 2; if (d < 22 && d < bd) { bd = d; best = { k: 'veh', v, t: `[E] ${v.d.name}${v.dead ? ' (מקולקל)' : v.driver ? ' — להוציא את הנהג' : ''}` }; } }
  for (const s of MAP.shops) { const d = dist(P.x, P.y, s.x, s.y); if (d < 30 && d < bd + 10) { bd = d; best = { k: 'shop', s, t: s.name }; } }
  for (const ph of MAP.phones) { const d = dist(P.x, P.y, ph.x, ph.y); if (d < 30 && d < bd + 10) { bd = d; best = { k: 'phone', ph, t: G.mission ? 'יש לך כבר משימה' : `[E] הטלפון של ${FACT[ph.f].n}` }; } }
  return best;
}
function interactTick() {
  const it = nearestInteract(); G.interact = it;
  G.shopMenu = it && it.k === 'shop' ? it.s : null;
  if (G.shopMenu) {
    const list = SHOP_ITEMS[G.shopMenu.kind] || [];
    for (let i = 0; i < list.length; i++) if (P('Digit' + (i + 1), 'Numpad' + (i + 1)) || (i === 0 && P('KeyE'))) {
      const [n, c, fn] = list[i]; if (G.money >= c) { G.money -= c; fn(); Audio2.sfx('buy'); G.msg('קנית: ' + n, '#9be26b'); } else { G.msg('אין מספיק כסף', '#ff9b9b'); Audio2.sfx('click'); }
    }
    return;
  }
  if (P('KeyE') && it) { if (it.k === 'veh') Player.enter(it.v); else if (it.k === 'phone' && !G.mission) Missions.call(it.ph); }
}

/* ================================================================ RAMPAGES (בלגן) */
const Rampage = (() => {
  const DEF = {
    tractor: { title: '!בלגן בשדה', desc: 'שבור 25 דברים תוך 60 שניות — כל נזק שווה כפול', time: 60, need: 25, double: true, reward: 1200 },
    trample: { title: '!טרקטור משתולל', desc: 'שבור 30 דברים תוך 75 שניות', time: 75, need: 30, reward: 1000 },
    balloon: { title: '!מלחמת בלונים', desc: 'הפל 12 אנשים עם בלוני מים תוך 60 שניות', time: 60, need: 12, give: { balloon: 20 }, wp: 'balloon', reward: 1000 },
    toto: { title: '!טוטו אחד-אחד-איקס', desc: 'הפל 12 אנשים עם אקדח טוטו תוך 60 שניות', time: 60, need: 12, give: { toto: 60 }, wp: 'toto', reward: 1000 },
    derby: { title: '!דרבי קלנועיות', desc: 'קלקל 6 רכבים תוך 90 שניות', time: 90, need: 6, reward: 1200 },
    chickens: { title: '!מצעד הלול', desc: 'הפל 10 אנשים בכל דרך תוך 50 שניות', time: 50, need: 10, reward: 900 },
  };
  function start(kind, veh, id) {
    const d = DEF[kind]; let n = 0;
    const R = { kind, id, t: d.time, need: d.need, double: d.double, d, get n() { return n; },
      onDestroy() { if (kind === 'tractor' || kind === 'trample') n++; },
      onKO(p, how) { if ((kind === 'balloon' && how === 'balloon') || (kind === 'toto' && how === 'toto') || kind === 'chickens') n++; },
      tickVeh() { if (kind !== 'derby') return; let c = 0; for (const v of vehicles) if (v.dead && !v._counted && dist(v.x, v.y, Player.x, Player.y) < 900) { v._counted = 1; c++; } n += c; },
    };
    if (d.give) for (const k in d.give) Player.inv[k] += d.give[k]; if (d.wp) Player.wp = d.wp;
    G.rampage = R; G.bigBanner(d.title, d.desc, '#c98bff'); Audio2.sfx('alert');
  }
  function tick(dt) {
    const R = G.rampage; if (!R) return;
    R.tickVeh(); R.t -= dt;
    if (R.n >= R.need) { G.money += R.d.reward; if (R.id !== undefined) G.rampDone[R.id] = 1; G.rampage = null; G.bigBanner('!בלגן מושלם', `+${R.d.reward} ₪`, '#9be26b'); Audio2.sfx('win'); Save.save(); }
    else if (R.t <= 0) stop(true);
  }
  function stop(timeout) { const R = G.rampage; if (!R) return; G.rampage = null; if (timeout) { G.bigBanner('הבלגן נגמר', `${R.n}/${R.need}`, '#ccc', 2.5); Audio2.sfx('lose'); } }
  return { start, tick, stop };
})();

/* ================================================================ SAVE */
const Save = {
  key: 'gtk-save-v2',
  save() { try { localStorage.setItem(this.key, JSON.stringify({ money: G.money, respect: G.respect, done: G.done, eggs: G.eggs, rampDone: G.rampDone, inv: Player.inv, armor: Player.armor, day: ENV.day, time: ENV.time, tips: G.tips, chain: Missions.chainState() })); } catch (e) { } },
  load() { try { const s = JSON.parse(localStorage.getItem(this.key)); if (!s) return false; Object.assign(G, { money: s.money, respect: s.respect, done: s.done || {}, eggs: s.eggs || {}, rampDone: s.rampDone || {}, tips: s.tips || {} }); Object.assign(Player.inv, s.inv); Player.armor = s.armor || 0; ENV.day = s.day || 1; ENV.time = s.time || 9; Missions.loadChain(s.chain); return true; } catch (e) { return false; } },
  has() { try { return !!localStorage.getItem(this.key); } catch (e) { return false; } },
  wipe() { try { localStorage.removeItem(this.key); } catch (e) { } },
};

/* ================================================================ PLAYER TICK */
function playerTick(dt) {
  const pl = Player;
  if (pl.out > 0) { pl.out -= dt; if (pl.out <= 0) respawnPlayer(); return; }
  if (pl.flash > 0) pl.flash -= dt; if (pl.punch > 0) pl.punch -= dt; if (pl.cd > 0) pl.cd -= dt; if (pl.throwT > 0) pl.throwT -= dt; if (pl.stumble > 0) pl.stumble -= dt;
  if (P('KeyQ', 'Tab')) cycleWeapon(K('ShiftLeft', 'ShiftRight') ? -1 : 1);
  const att = K('KeyJ', 'ControlLeft', 'ControlRight') || mouseDown;
  if (pl.veh) {
    const v = pl.veh, c = v.ctrl;
    c.thr = (K('KeyW', 'ArrowUp') ? 1 : 0) - (K('KeyS', 'ArrowDown') ? 1 : 0);
    c.steer = (K('KeyD', 'ArrowRight') ? 1 : 0) - (K('KeyA', 'ArrowLeft') ? 1 : 0); c.hb = K('Space');
    if (P('KeyH') && v.horn <= 0) {
      v.horn = .45; Audio2.sfx(v.d.horn || 'horn', v.x, v.y);
      for (const q of peds) if (!q.veh && q.state !== 'ko' && !q.animal && dist(q.x, q.y, v.x, v.y) < 120 && (q.state === 'walk' || q.state === 'idle')) { q.state = 'flee'; q.timer = 1.5; say(q, '!היי', 1); }
      for (const q of peds) if (q.type === 'chicken' && dist(q.x, q.y, v.x, v.y) < 140) { q.state = 'flee'; q.timer = 2; }
    }
    // drive-by with toto / soaker, firing forward
    if (att && pl.cd <= 0 && (pl.wp === 'toto' || pl.wp === 'soaker' || pl.wp === 'ext')) { const r = Combat.fireFrom(v.x + Math.cos(v.a) * v.d.L / 2, v.y + Math.sin(v.a) * v.d.L / 2, v.a, v); if (r === 'stream') Combat.stream(dt, v.x + Math.cos(v.a) * v.d.L / 2, v.y + Math.sin(v.a) * v.d.L / 2, v.a, pl.wp); }
    if (P('KeyE', 'Enter')) pl.exit();
    pl.x = v.x; pl.y = v.y; pl.a = v.a;
    const sp = Math.hypot(v.vx, v.vy);
    Audio2.setEngine(v.dead ? 'none' : v.d.eng, clamp(sp / v.d.maxF, 0, 1) * (c.thr ? 1 : .7));
    // lawn offence
    const m = matAt(v.x, v.y);
    if (MINFO[m].lawn && sp > 20) { if (G.crime(.32 * dt * (v.d.mass > 15 ? 1.8 : 1))) G.tip('lawn', '!אסור לנסוע על הדשא — הזקנים רואים הכל'); }
    // crops & mud
    if ((MINFO[m].crop || MINFO[m].lawn) && sp > 25) trample(v);
    if (P('KeyR')) { if (!v.d.radio) G.msg('אין רדיו ב' + v.d.name, '#ccc'); else { Audio2.setStation(Audio2.stationIndex + 1); G.radioCard = 3; } }
  } else {
    let mx = (K('KeyD', 'ArrowRight') ? 1 : 0) - (K('KeyA', 'ArrowLeft') ? 1 : 0), my = (K('KeyS', 'ArrowDown') ? 1 : 0) - (K('KeyW', 'ArrowUp') ? 1 : 0);
    const m = Math.hypot(mx, my); pl.swim = MINFO[matAt(pl.x, pl.y)].water;
    const sp = (K('ShiftLeft', 'ShiftRight') ? 142 : 100) * (pl.swim ? .45 : 1) * (pl.stumble > 0 ? .3 : 1);
    if (m > 0) { mx /= m; my /= m; pl.vx += (mx * sp - pl.vx) * Math.min(1, dt * 12); pl.vy += (my * sp - pl.vy) * Math.min(1, dt * 12); if (!(att && (pl.wp === 'soaker' || pl.wp === 'ext'))) pl.a += angDiff(pl.a, Math.atan2(my, mx)) * Math.min(1, dt * 14); pl.walk += dt * sp * .11; }
    else { pl.vx *= Math.exp(-12 * dt); pl.vy *= Math.exp(-12 * dt); }
    if (mouseDown && CAM.mouse) pl.a = Math.atan2(CAM.mouse.y - pl.y, CAM.mouse.x - pl.x);
    pl.x += pl.vx * dt; pl.y += pl.vy * dt; collideStatic(P, 6.5);
    for (const v of actV) { if (Math.abs(v.x - pl.x) > 70 || Math.abs(v.y - pl.y) > 70) continue; for (const c of vehCircles(v)) { const dx = pl.x - c.x, dy = pl.y - c.y, d = Math.hypot(dx, dy), rr = c.r + 6.5; if (d < rr && d > 0) { pl.x += dx / d * (rr - d); pl.y += dy / d * (rr - d); } } }
    Combat.playerAttack(dt, att && !pl._att, att);
    Audio2.setEngine('none', 0);
  }
  pl._att = att;
}
function trample(v) {
  const c = Math.cos(v.a), s = Math.sin(v.a), heavy = v.d.mass >= 15, wide = v.type === 'combine' ? 30 : v.d.W * .4;
  for (const o of heavy ? [-1, -.33, .33, 1] : [-1, 1]) {
    const wx = v.x - c * v.d.L * .25 - s * o * wide, wy = v.y - s * v.d.L * .25 + c * o * wide;
    const i = matIdx(wx, wy); if (i < 0) continue; const m = mat[i];
    if (MINFO[m].crop) {
      if (!heavy && Math.random() < .7) continue;
      mat[i] = M.STUBBLE; const cx = (i % MGW) * MCELL + 4, cy = Math.floor(i / MGW) * MCELL + 4;
      Ground.addDecal({ k: 'crop', x: cx, y: cy, tex: m === M.ALFALFA || m === M.VINE ? 'mud' : 'stubble', ang: .07 });
      G.destroyed += heavy ? .25 : .1; if (Math.random() < .35) G.addScore(2, wx, wy, true);
      if (Math.random() < .25) FX.burst(wx, wy, [MINFO[m].col, '#e9cf6a'], 3, 50, 2);
      if (G.rampage && G.rampage.kind !== 'derby' && Math.random() < .08) G.rampage.onDestroy && G.rampage.onDestroy();
    } else if (MINFO[m].lawn && heavy) {
      mat[i] = M.MUD; Ground.addDecal({ k: 'mud', x: wx, y: wy, a: v.a, w: 12, h: 9 });
      if (Math.random() < .5) G.addScore(2, wx, wy, true); G.crime(.1, wx, wy);
    }
  }
}
