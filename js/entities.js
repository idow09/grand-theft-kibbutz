'use strict';
/* ================================================================
   entities.js — vehicles, people, animals: physics, AI, population
   ================================================================ */
const VT = {
  bike:      { name: 'אופניים', maxF: 190, acc: 260, brake: 380, turn: 2.8, grip: 7, mass: 1.2, hp: 60, power: 0, off: .35, eng: 'none', radio: 0, rider: 1, horn: 'bell', lights: 0 },
  scooter:   { name: 'טוסטוס', maxF: 285, acc: 300, brake: 420, turn: 2.5, grip: 6, mass: 2.2, hp: 80, power: 1, off: .2, eng: 'moped', radio: 1, rider: 1, horn: 'beep', lights: 1 },
  kalnoit:   { name: 'קלנועית', maxF: 135, acc: 130, brake: 300, turn: 2.0, grip: 9, mass: 3, hp: 100, power: 0, off: .25, eng: 'electric', radio: 1, rider: 1, horn: 'beep', lights: 1 },
  atv:       { name: 'טרקטורון', maxF: 235, acc: 290, brake: 400, turn: 2.4, grip: 7.5, mass: 4, hp: 150, power: 1, off: .92, eng: 'moped', radio: 1, rider: 1, horn: 'beep', lights: 1 },
  cart:      { name: 'רכב גולף', maxF: 175, acc: 200, brake: 380, turn: 2.1, grip: 8, mass: 4.5, hp: 120, power: 1, off: .4, eng: 'electric', radio: 1, rider: 0, horn: 'beep', lights: 1 },
  car:       { name: 'מכונית', maxF: 345, acc: 270, brake: 470, turn: 1.95, grip: 8.5, mass: 8, hp: 200, power: 2, off: .1, eng: 'car', radio: 1, rider: 0, horn: 'horn', lights: 1 },
  van:       { name: 'טרנזיט', maxF: 290, acc: 220, brake: 420, turn: 1.7, grip: 8, mass: 10, hp: 240, power: 2, off: .12, eng: 'car', radio: 1, rider: 0, horn: 'horn', lights: 1 },
  pickup:    { name: 'טנדר', maxF: 320, acc: 260, brake: 440, turn: 1.8, grip: 8, mass: 9, hp: 260, power: 2, off: .55, eng: 'car', radio: 1, rider: 0, horn: 'horn', lights: 1 },
  milktruck: { name: 'מכלית חלב', maxF: 230, acc: 150, brake: 300, turn: 1.3, grip: 9, mass: 20, hp: 420, power: 3, off: .2, eng: 'truck', radio: 1, rider: 0, horn: 'hornBig', lights: 1 },
  forklift:  { name: 'מלגזה', maxF: 120, acc: 180, brake: 400, turn: 2.7, grip: 10, mass: 7, hp: 220, power: 2, off: .2, eng: 'electric', radio: 0, rider: 0, horn: 'beep', lights: 1 },
  tractor:   { name: 'טרקטור', maxF: 178, acc: 150, brake: 320, turn: 1.6, grip: 12, mass: 22, hp: 520, power: 4, off: 1, eng: 'diesel', radio: 1, rider: 0, horn: 'hornBig', lights: 1 },
  combine:   { name: 'קומביין', maxF: 125, acc: 95, brake: 260, turn: 1.15, grip: 14, mass: 40, hp: 900, power: 5, off: 1, eng: 'diesel', radio: 1, rider: 0, horn: 'hornBig', lights: 1 },
};
for (const k in VT) { const [L, W] = SPR.VSIZE[k]; const d = VT[k]; d.L = L; d.W = W; d.n = Math.max(2, Math.round(L / W)); d.type = k; }
const KCOLS = { car: ['#c0392b', '#2c6fb5', '#f2f2f2', '#2b2b2b', '#8e9aa4', '#3d8a52', '#d9b44a', '#7b4aa8'], van: ['#f2f2f2', '#d9d9d9', '#2c6fb5', '#b5452e'], pickup: ['#f2f2f2', '#3a7a4a', '#8a2a22', '#c8b48a', '#2c3e50'], kalnoit: ['#d9d9de', '#e8c547', '#c0392b', '#3b82c4', '#4aa86a', '#c58bd6'], cart: ['#f2f2f2', '#2f8a56'], scooter: ['#ff5a3a', '#2a6ab8', '#ffd23f', '#222'], bike: ['#c0392b', '#2a6ab8', '#ffd23f', '#3d8a52', '#222', '#ff7ab8'], atv: ['#c0392b', '#3d8a52', '#2a6ab8'], tractor: ['#2f8f3a', '#c8352b', '#2f6fc8'], combine: ['#3a8a3a', '#c8352b'], forklift: ['#f0b52a'], milktruck: ['#f2f2f2'] };

const vehicles = [], peds = [];
let actV = [];

/* ---------------- people looks ---------------- */
const SKINS = ['#f3d2b0', '#e8b98e', '#d49a6a', '#b07a50', '#8a5a3a', '#f6dcc4'];
const HAIRS = ['#2a1a10', '#3d2616', '#6b4423', '#a0703a', '#d8b45a', '#111', '#8a3a1a'];
function makeLook(type, r) {
  r = r || Math.random;
  const P = a => a[Math.floor(r() * a.length)];
  const L = { age: 'adult', skin: P(SKINS), hair: P(HAIRS), hs: P(['short', 'short', 'long', 'bun', 'curly']), hat: null, extra: null, shoes: P(['#3a2a1a', '#222', '#6b4a2a', '#ddd']), pants: P(['#3b4a6b', '#6b5a3a', '#4a4a4a', '#2f3e5a', '#7a6a4a']), shirt: P(['#3a6fb0', '#3a6fb0', '#e45a4a', '#f2c14e', '#4ab08a', '#eee', '#8bc34a', '#a0522d', '#6a7fdb']) };
  switch (type) {
    case 'kid': L.age = 'kid'; L.shirt = P(['#ff5a5a', '#ffd23f', '#4dc3ff', '#7ee07e', '#ff8ad8', '#ff9f43', '#fff']); L.pants = P(['#3b5bdb', '#555', '#c0392b', '#2b8a3e']); if (r() < .25) { L.hat = 'cap'; L.capCol = P(['#e74c3c', '#2a6ab8', '#ffd23f']); } if (r() < .3) L.extra = 'backpack'; break;
    case 'teen': L.age = 'teen'; L.shirt = P(['#222', '#7b4aa8', '#e45a4a', '#fff', '#2c3e50', '#16a085']); if (r() < .5) L.extra = 'phone'; if (r() < .3) { L.hat = 'cap'; L.capCol = P(['#111', '#c0392b', '#fff']); } break;
    case 'elder': L.age = 'elder'; L.hair = P(['#ddd', '#eee', '#bbb', '#ccc']); L.hs = P(['bald', 'short', 'bun', 'bald']); L.shirt = P(['#3a6fb0', '#a8b8c8', '#c8b8a0', '#eee', '#8a9a7a', '#d9a0a0']); L.pants = P(['#6b6b6b', '#7a6a4a', '#4a5a6b']); if (r() < .35) L.hat = 'sunhat'; else if (r() < .2) { L.hat = 'scarf'; L.scarfCol = P(['#8e44ad', '#2c3e50', '#c0392b', '#16a085']); } else if (r() < .2) L.hat = 'tembel'; if (r() < .45) L.extra = 'cane'; break;
    case 'volunteer': L.hair = P(['#e6c76a', '#d8b45a', '#b5482a', '#f0d890']); L.skin = P(['#f6dcc4', '#f3d2b0']); L.shirt = P(['#f1948a', '#85c1e9', '#f7dc6f', '#fff']); L.extra = r() < .6 ? 'backpack' : null; break;
    case 'worker': L.shirt = P(['#2f5f9a', '#3d6b3a', '#7a5a3a']); L.pants = P(['#2f3e5a', '#4a4a3a']); L.hat = r() < .5 ? 'cap' : 'tembel'; L.capCol = '#2a4a2a'; L.shoes = '#2a1a0a'; break;
    case 'cook': L.shirt = '#f4f4f4'; L.extra = 'apron'; L.hat = 'scarf'; L.scarfCol = '#fff'; break;
    case 'guard': L.shirt = '#7a7a4a'; L.pants = '#4a4a3a'; L.hat = 'cap'; L.capCol = '#333'; break;
    default: if (r() < .16) L.hat = 'tembel'; else if (r() < .14) { L.hat = 'cap'; L.capCol = P(['#2a6ab8', '#c0392b', '#2a4a2a', '#eee']); } if (r() < .08) L.extra = 'bag';
  }
  return L;
}
const LOOKS = {};
function initLooks() {
  const r = RNG(99);
  for (const [t, n] of [['adult', 14], ['kid', 8], ['teen', 6], ['elder', 10], ['volunteer', 4], ['worker', 5], ['cook', 2], ['guard', 2]]) { LOOKS[t] = []; for (let i = 0; i < n; i++) LOOKS[t].push(makeLook(t, r)); }
}
const PLAYER_LOOK = { age: 'adult', skin: '#f1c9a0', hair: '#3a2a1a', hs: 'short', hat: 'tembel', shirt: '#2f6fd0', pants: '#8a6a3a', shoes: '#6b4a2a', extra: null };

/* ---------------- factories ---------------- */
const ANIMALS = { dog: { r: 5, spd: 70, hp: 3 }, cat: { r: 3.5, spd: 60, hp: 2 }, cow: { r: 15, spd: 16, hp: 99 }, chicken: { r: 3.5, spd: 0, hp: 1 }, goat: { r: 6, spd: 26, hp: 4 }, peacock: { r: 5, spd: 22, hp: 3 }, heron: { r: 5, spd: 0, hp: 2 } };
let nid = 1;
function mkVeh(type, x, y, a, col) {
  const d = VT[type];
  const v = { id: nid++, type, d, x, y, a: a || 0, vx: 0, vy: 0, vf: 0, hp: d.hp, col: col || pick(KCOLS[type] || ['#888']), driver: null, ai: null, stun: 0, steer: 0, dead: false, node: null, prev: null, tgt: null, blocked: 0, stuckT: 0, rev: 0, flood: 0, skidT: 0, ctrl: { thr: 0, steer: 0, hb: false }, sayT: '', sayL: 0, horn: 0, persistent: false };
  vehicles.push(v); return v;
}
function mkPed(type, x, y, look) {
  const an = ANIMALS[type];
  const p = { id: nid++, type, animal: !!an, x, y, vx: 0, vy: 0, a: Math.random() * TAU, walk: Math.random() * 6, state: 'walk', timer: 0, veh: null, sayT: '', sayL: 0, node: null, prev: null, tgt: null, side: Math.random() < .5 ? 1 : -1, laneOff: 0, lx: x, ly: y, lt: 0, cd: 0, wet: 0, persistent: false, v: (Math.random() * 4) | 0 };
  if (an) { p.r = an.r; p.spd = an.spd; p.hp = an.hp; p.state = type === 'cow' || type === 'goat' || type === 'peacock' ? 'graze' : type === 'heron' ? 'stand' : 'wander'; }
  else {
    p.look = look || pick(LOOKS[type] || LOOKS.adult);
    p.r = type === 'kid' ? 4.8 : 6.2; p.spd = type === 'elder' ? 33 : type === 'kid' ? 62 : 48 + Math.random() * 8;
    p.hp = type === 'elder' ? 3 : type === 'kid' ? 2 : 3; p.brawl = (type === 'adult' || type === 'worker' || type === 'teen') && Math.random() < .3;
  }
  p.maxhp = p.hp; peds.push(p); return p;
}
function removeVeh(v) { const i = vehicles.indexOf(v); if (i >= 0) vehicles.splice(i, 1); if (v.driver && v.driver !== 'player') removePed(v.driver); }
function removePed(p) { const i = peds.indexOf(p); if (i >= 0) peds.splice(i, 1); }
function say(e, t, life) { if (!e || e === 'player') return; e.sayT = t; e.sayL = life || 2.2; }

/* ---------------- vehicle physics ---------------- */
function vehCircles(v) {
  const d = v.d, n = d.n;
  if (!v._cs) { v._cs = []; for (let i = 0; i < n; i++) v._cs.push({ x: 0, y: 0, r: d.W / 2 }); }
  const c = Math.cos(v.a), s = Math.sin(v.a), half = d.L / 2 - d.W / 2;
  for (let i = 0; i < n; i++) { const o = -half + 2 * half * i / (n - 1); v._cs[i].x = v.x + c * o; v._cs[i].y = v.y + s * o; }
  return v._cs;
}
const NOCTRL = { thr: 0, steer: 0, hb: false };
function vehPhysics(v, dt) {
  const d = v.d; let ctrl = v.ctrl;
  if (v.dead || v.stun > 0 || (!v.driver)) ctrl = NOCTRL;
  const m = MINFO[matAt(v.x, v.y)];
  const drag = lerp(m.drag, 1, d.off), grip = d.grip * lerp(m.grip, 1, d.off * .8) * (ENV.wet ? .72 : 1);
  const maxF = d.maxF * drag;
  const c = Math.cos(v.a), s = Math.sin(v.a); let vf = v.vx * c + v.vy * s, vl = -v.vx * s + v.vy * c;
  if (ctrl.thr > 0) { if (vf < -5) vf += d.brake * dt; else vf += d.acc * dt * ctrl.thr * Math.max(0, 1 - Math.max(0, vf) / maxF); }
  else if (ctrl.thr < 0) { if (vf > 5) vf -= d.brake * dt * -ctrl.thr; else vf -= d.acc * .6 * dt * Math.max(0, 1 - Math.max(0, -vf) / (maxF * .4)); }
  else vf *= Math.exp(-(v.driver ? .8 : 3) * dt);
  if (Math.abs(vf) > maxF) vf *= Math.exp(-(1 - drag + .4) * 3 * dt);
  if (ctrl.hb) vf *= Math.exp(-2.2 * dt);
  vl *= Math.exp(-grip * (ctrl.hb ? .18 : 1) * dt);
  v.steer += (ctrl.steer - v.steer) * Math.min(1, dt * 9);
  v.a += v.steer * d.turn * dt * clamp(vf / 70, -1, 1) / (1 + Math.abs(vf) / d.maxF * .55) * (ctrl.hb ? 1.5 : 1);
  const c2 = Math.cos(v.a), s2 = Math.sin(v.a);
  v.vx = vf * c2 - vl * s2; v.vy = vf * s2 + vl * c2; v.x += v.vx * dt; v.y += v.vy * dt; v.vf = vf; v.vl = vl;
  // water
  if (m.water && d.off < 1.5) { v.flood += dt; if (v.flood > 1.2 && !v.dead) { killVeh(v, 'flood'); } } else v.flood = Math.max(0, v.flood - dt);
  // skid marks & tracks
  v.skidT -= dt;
  if (v.skidT <= 0) {
    v.skidT = .045;
    const sideSlip = Math.abs(vl) > 55 && Math.abs(vf) > 50, hardBrake = ctrl.thr < 0 && vf > 120 && m.road;
    const rx = v.x - c2 * d.L * .32, ry = v.y - s2 * d.L * .32;
    if ((sideSlip || hardBrake || ctrl.hb && Math.abs(vf) > 60) && d.type !== 'bike') {
      for (const o of [-1, 1]) { const wx = rx - s2 * o * d.W * .38, wy = ry + c2 * o * d.W * .38; if (v._lw && v._lw[o]) Ground.addDecal({ k: 'skid', x: v._lw[o][0], y: v._lw[o][1], x2: wx, y2: wy, w: d.W > 30 ? 4 : 2.6 }); (v._lw = v._lw || {})[o] = [wx, wy]; }
      if (v.driver === 'player' && Math.random() < .3) Audio2.sfx('soak', v.x, v.y);
    } else v._lw = null;
  }
}
function killVeh(v, why) {
  if (v.dead) return; v.dead = true; v.hp = 0;
  if (v.driver && v.driver !== 'player') { const d = v.driver; ejectDriver(v); d.state = 'flee'; d.timer = 4; say(d, why === 'flood' ? 'המנוע הוצף!' : 'הרכב שלי!', 2); }
  if (v.driver === 'player') G.msg(why === 'flood' ? 'המנוע הוצף! (E ליציאה)' : 'הרכב התקלקל! (E ליציאה)', '#ffb36b');
  FX.burst(v.x, v.y, why === 'flood' ? ['#bfe8ff', '#fff'] : ['#ddd', '#aaa', '#fff'], 18, 70, 5);
  Audio2.sfx(why === 'flood' ? 'splash' : 'crash', v.x, v.y);
}
function ejectDriver(v) {
  const d = v.driver; if (!d || d === 'player') return; v.driver = null; d.veh = null;
  for (const sd of [1, -1, 2]) { const ang = v.a + (sd === 2 ? Math.PI : sd * Math.PI / 2), off = (sd === 2 ? v.d.L : v.d.W) / 2 + 9; const x = v.x + Math.cos(ang) * off, y = v.y + Math.sin(ang) * off; if (!solidAt(x, y, 6)) { d.x = x; d.y = y; return; } }
  d.x = v.x + 20; d.y = v.y;
}
function impact(v, sp) {
  if (sp < 55) return;
  if (sp > 80) v.hp -= (sp - 80) * .09 * (v.d.hp > 400 ? .3 : 1);
  Audio2.sfx(sp > 120 ? 'crash' : 'thud', v.x, v.y);
  if (v.driver === 'player') { G.shake = Math.min(9, G.shake + sp / 40); if (v.d.type === 'bike' || v.d.type === 'scooter') { if (sp > 150) { Player.fallOff(sp); } } }
  if (v.hp <= 0) killVeh(v);
}
const _q1 = [], _q2 = [];
function vehStatic(v) {
  const cs = vehCircles(v); let nxs = 0, nys = 0; const sp = Math.hypot(v.vx, v.vy);
  for (const c of cs) {
    bgrid.query(c.x - c.r, c.y - c.r, c.x + c.r, c.y + c.r, _q1);
    for (const b of _q1) { if (b.roofOnly) continue; const k = shapePush(b, c.x, c.y, c.r); if (k) { v.x += k.nx * k.pen; v.y += k.ny * k.pen; c.x += k.nx * k.pen; c.y += k.ny * k.pen; nxs += k.nx; nys += k.ny; } }
    pgrid.query(c.x - c.r - 4, c.y - c.r - 4, c.x + c.r + 4, c.y + c.r + 4, _q2);
    for (const o of _q2) {
      if (o.broken) continue; const k = shapePush(o, c.x, c.y, c.r); if (!k) continue;
      if (o.need <= v.d.power && sp > (o.t === 'fence' || o.t === 'cfence' ? 45 : 18)) breakProp(o, v, sp);
      else if (o.solid) { v.x += k.nx * k.pen; v.y += k.ny * k.pen; c.x += k.nx * k.pen; c.y += k.ny * k.pen; nxs += k.nx; nys += k.ny; }
    }
  }
  v.x = clamp(v.x, 12, WORLD_W - 12); v.y = clamp(v.y, 12, WORLD_H - 12);
  if (nxs || nys) { const n = Math.hypot(nxs, nys) || 1, nx = nxs / n, ny = nys / n, vn = v.vx * nx + v.vy * ny; if (vn < 0) { v.vx -= vn * nx * 1.3; v.vy -= vn * ny * 1.3; impact(v, -vn); } }
}
function breakProp(o, v, sp) {
  if (o.broken || o.need > 8) return; o.broken = true;
  const d = PT[o.t];
  FX.burst(o.x, o.y, d.burst || ['#888'], o.t === 'greenhouse' ? 34 : o.h > 20 ? 18 : 10, 110, o.t === 'greenhouse' ? 5 : 4);
  Audio2.sfx(d.snd || 'break', o.x, o.y);
  if (o.t === 'sprinkler' || o.t === 'hydrant') FX.fountain(o.x, o.y, o.t === 'hydrant' ? 10 : 6);
  if (o.h > 20) FX.fallTree(o, v ? Math.atan2(v.vy, v.vx) : Math.random() * TAU);
  if (v) { const f = o.h > 20 || o.t === 'greenhouse' ? .88 : .985; v.vx *= f; v.vy *= f; if (v.d.power < 3 && o.solid) v.hp -= 2; }
  const byP = !v || v.driver === 'player';
  if (byP) G.onDestroy(o);
}
function vehVsVeh(list) {
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j]; if (Math.abs(a.x - b.x) > 90 || Math.abs(a.y - b.y) > 90) continue;
    if (dist(a.x, a.y, b.x, b.y) > (a.d.L + b.d.L) / 2 + 6) continue;
    const ca = vehCircles(a), cb = vehCircles(b); let done = false;
    for (const x of ca) { if (done) break; for (const y of cb) {
      const dx = x.x - y.x, dy = x.y - y.y, d = Math.hypot(dx, dy), rr = x.r + y.r; if (d >= rr) continue;
      const nx = d ? dx / d : 1, ny = d ? dy / d : 0, pen = rr - d, ma = a.d.mass, mb = b.d.mass, wa = mb / (ma + mb);
      a.x += nx * pen * wa; a.y += ny * pen * wa; b.x -= nx * pen * (1 - wa); b.y -= ny * pen * (1 - wa);
      const rv = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      if (rv < 0) {
        const j2 = -1.3 * rv / (1 / ma + 1 / mb); a.vx += nx * j2 / ma; a.vy += ny * j2 / ma; b.vx -= nx * j2 / mb; b.vy -= ny * j2 / mb;
        const is = -rv; if (is > 65) { a.hp -= (is - 65) * .08 * mb / (ma + mb) * 1.7; b.hp -= (is - 65) * .08 * ma / (ma + mb) * 1.7; Audio2.sfx('crash', a.x, a.y);
          if (a.hp <= 0) killVeh(a); if (b.hp <= 0) killVeh(b);
          if (a.driver === 'player' || b.driver === 'player') { G.shake = Math.min(9, G.shake + is / 45); const o = a.driver === 'player' ? b : a; if (o.driver && o.driver !== 'player') { say(o.driver, pick(['אידיוט!', 'תסתכל לאן אתה נוסע!', 'הביטוח של המשק לא מכסה את זה!']), 2); G.crime(o.ai === 'chase' ? .2 : .6, o.x, o.y); if (o.ai === 'wander' && o.driver.brawl && o.d.mass < 15) { o.ai = 'angry'; } } } }
      }
      done = true; break;
    } }
  }
}

/* ---------------- AI: driving ---------------- */
const MASK_CAR = RK.highway | RK.asphalt | RK.dirt | RK.track, MASK_SMALL = RK.asphalt | RK.path | RK.dirt | RK.track, MASK_PED = RK.asphalt | RK.path | RK.dirt | RK.track;
const vMask = v => ({ bike: MASK_SMALL, kalnoit: MASK_SMALL, cart: MASK_SMALL, scooter: MASK_SMALL | RK.highway, atv: MASK_SMALL })[v.type] || MASK_CAR;
function pickNext(n, prev, mask, a) {
  let opts = n.nb.filter(e => (e.r.k & mask) && e.n !== prev);
  if (!opts.length) opts = n.nb.filter(e => e.r.k & mask);
  if (!opts.length) return null;
  if (opts.length === 1) return opts[0];
  // prefer going roughly straight
  const w = opts.map(e => { const da = Math.abs(angDiff(a, Math.atan2(e.n.y - n.y, e.n.x - n.x))); return Math.max(.08, 1.4 - da) + Math.random() * .6; });
  let best = 0; for (let i = 1; i < opts.length; i++) if (w[i] > w[best]) best = i; return opts[best];
}
function aiWander(v, dt) {
  const ctrl = v.ctrl, mask = vMask(v);
  if (!v.node || v.ai === 'release') { v.node = nearestNode(v.x, v.y, mask, 800); v.prev = null; v.ai = 'wander'; if (!v.node) { ctrl.thr = 0; return; } v.tgt = { x: v.node.x, y: v.node.y }; v.road = v.node.nb[0] && v.node.nb[0].r; }
  if (dist(v.x, v.y, v.tgt.x, v.tgt.y) < Math.max(18, v.d.L * .45)) {
    const n = v.node, e = pickNext(n, v.prev, mask, v.a);
    if (!e) { v.prev = null; return; }
    v.prev = n; v.node = e.n; v.road = e.r;
    const dx = e.n.x - n.x, dy = e.n.y - n.y, l = Math.hypot(dx, dy) || 1, off = e.r.kind === 'path' ? 0 : e.r.w * (e.r.kind === 'highway' ? .26 : .25);
    v.tgt = { x: e.n.x - dy / l * off, y: e.n.y + dx / l * off };
  }
  const desired = Math.atan2(v.tgt.y - v.y, v.tgt.x - v.x), diff = angDiff(v.a, desired);
  ctrl.steer = clamp(diff * 2.6, -1, 1);
  const rk = v.road ? v.road.kind : 'asphalt';
  const cruise = Math.min(v.d.maxF * .8, { highway: 300, asphalt: 150, path: 95, dirt: 120, track: 110 }[rk] || 120) * (ENV.wet ? .8 : 1);
  ctrl.thr = Math.abs(diff) > 1 ? (v.vf > 40 ? -.4 : .5) : (v.vf < cruise ? 1 : v.vf > cruise * 1.15 ? -.3 : 0);
  ctrl.hb = false;
  // obstacle ahead
  const fx = Math.cos(v.a), fy = Math.sin(v.a), la = v.d.L / 2 + 12 + Math.max(0, v.vf) * .25, px = v.x + fx * la, py = v.y + fy * la;
  let blocked = false;
  for (const o of actV) { if (o === v || Math.abs(o.x - px) > 70 || Math.abs(o.y - py) > 70) continue; if (dist(px, py, o.x, o.y) < o.d.W / 2 + v.d.W / 2 + 4) { blocked = true; break; } }
  if (!blocked) for (const p of peds) { if (p.veh || Math.abs(p.x - px) > 50 || Math.abs(p.y - py) > 50) continue; if (dist(px, py, p.x, p.y) < v.d.W / 2 + p.r + 8) { blocked = true; if (p.state === 'walk' && Math.random() < .02 && v.d.horn) { Audio2.sfx(v.d.horn, v.x, v.y); } break; } }
  if (!blocked && !Player.veh && dist(px, py, Player.x, Player.y) < v.d.W / 2 + 14) { blocked = true; if (Math.random() < .02) { Audio2.sfx(v.d.horn || 'horn', v.x, v.y); say(v.driver, pick(['זוז!', 'נו כבר!', 'יש פה כביש!']), 1.5); } }
  if (blocked) { ctrl.thr = v.vf > 10 ? -1 : 0; v.blocked += dt; } else v.blocked = Math.max(0, v.blocked - dt);
  if (v.blocked > 3.5) { v.rev = 1.1; v.blocked = 0; }
  if (v.rev > 0) { v.rev -= dt; ctrl.thr = -.8; ctrl.steer = -ctrl.steer; }
  if (Math.abs(v.vf) < 6 && !blocked && v.rev <= 0) { v.stuckT += dt; if (v.stuckT > 2.2) { v.rev = 1; v.stuckT = 0; v.prev = null; } } else v.stuckT = 0;
}
function aiChase(v, dt, tx, ty) {
  const ctrl = v.ctrl;
  let desired = Math.atan2(ty - v.y, tx - v.x);
  const probe = ang => solidAt(v.x + Math.cos(ang) * (v.d.L / 2 + 22), v.y + Math.sin(ang) * (v.d.L / 2 + 22), 8);
  if (probe(v.a)) { const l = probe(v.a - .7), r = probe(v.a + .7); desired = v.a + (l && !r ? 1.2 : !l && r ? -1.2 : (v.id % 2 ? 1.2 : -1.2)); }
  const diff = angDiff(v.a, desired); ctrl.steer = clamp(diff * 2.8, -1, 1); ctrl.hb = Math.abs(diff) > 1.3 && v.vf > 120;
  const d = dist(v.x, v.y, tx, ty);
  if (v.rev > 0) { v.rev -= dt; ctrl.thr = -1; ctrl.steer = -ctrl.steer; return; }
  ctrl.thr = 1; if (d < 70 && !Player.veh && v.vf > 50) ctrl.thr = -.5;
  if (Math.abs(diff) > 1.8 && d < 160) ctrl.thr = -.6;
  if (Math.abs(v.vf) < 8) { v.stuckT += dt; if (v.stuckT > 1.3) { v.rev = .9; v.stuckT = 0; } } else v.stuckT = 0;
}

/* ---------------- AI: people & animals ---------------- */
const LINES = {
  elderAngry: ['בושה!', 'תרד מהדשא!', 'בזמני לא היה ככה!', 'מי אישר את זה?', 'אני מדבר עם המזכיר!', 'נו באמת!', 'חוצפה!', 'זה לא תקין!', 'האסיפה תשמע על זה!'],
  elderMumble: ['הדשא היה ירוק יותר פעם', 'אין כבוד לוועד', 'איפה הנוער של היום', 'בחדר האוכל נגמרו הגזרים', 'פעם היינו קוטפים כותנה ידנית', 'מי שם פה את הקלנועית?', 'ביום שישי יש שירה בציבור'],
  kid: ['תפוס אותי!', 'איפה הכדור?', 'אמא!', 'יש לי חופש!', 'טוטו!'],
  teen: ['אחי...', 'מה קורה?', 'יש מסיבה במקלט', 'יש לך סיגריה... סתם?', 'אין פה קליטה'],
  volunteer: ['Shalom!', 'Where is the dining hall?', 'Sababa!', 'Is this the kibbutz?', 'I love falafel!'],
  adult: ['מה נשמע?', 'צריך לתקן את ההשקיה', 'מי ראה את המפתחות של הטנדר?', 'יש תורנות מטבח היום', 'עוד שעה סידור עבודה'],
  hurt: ['אוי!', 'עזרה!', 'מה פתאום!', 'איי!', 'הצילו!'],
};
function pedPickTarget(p, keep) {
  if (!p.node) { p.node = nearestNode(p.x, p.y, MASK_PED, 600); p.prev = null; if (!p.node) { p.tgt = { x: p.x + rnd(-50, 50), y: p.y + rnd(-50, 50) }; return; } }
  if (!keep) { const e = pickNext(p.node, p.prev, MASK_PED, p.a); if (!e) { p.tgt = { x: p.x, y: p.y }; return; } p.prev = p.node; p.node = e.n; p.road = e.r; }
  const a = p.prev || p.node, b = p.node, dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
  const r = p.road || (b.nb[0] && b.nb[0].r);
  const off = !r ? 0 : r.kind === 'path' ? p.laneOff * r.w * .3 : r.kind === 'asphalt' ? p.side * (r.w / 2 + 5) : p.side * r.w * .3;
  p.tgt = { x: b.x - dy / l * off, y: b.y + dx / l * off };
}
function updatePed(p, dt) {
  if (p.veh) { p.x = p.veh.x; p.y = p.veh.y; p.a = p.veh.a; if (p.sayL > 0) p.sayL -= dt; return; }
  if (p.sayL > 0) p.sayL -= dt; if (p.cd > 0) p.cd -= dt;
  p.vx *= Math.exp(-6 * dt); p.vy *= Math.exp(-6 * dt);
  let mx = 0, my = 0, spd = p.spd;
  const px = Player.x, py = Player.y, d2p = dist(p.x, p.y, px, py);
  if (p.animal) { animalAI(p, dt, d2p); }
  else switch (p.state) {
    case 'ko': p.timer -= dt; if (p.timer <= 0) {
      p.hp = p.maxhp; p.wet = 0;
      if (p.type === 'elder') { p.state = G.level > 0 ? 'chase' : 'walk'; say(p, pick(['הו הו, מה זה היה...', 'אני מתלונן בוועד!', 'הגב שלי!', 'חוצפן!']), 2); G.crime(.6, p.x, p.y); }
      else if (p.brawl && Math.random() < .6) { p.state = 'fight'; p.timer = 7; say(p, 'עכשיו תקבל!', 1.6); }
      else { p.state = 'flee'; p.timer = 3; }
      p.node = null; pedPickTarget(p);
    } break;
    case 'flee': { p.timer -= dt; let dx = p.x - (p.fx ?? px), dy = p.y - (p.fy ?? py); const l = Math.hypot(dx, dy) || 1; mx = dx / l; my = dy / l; spd = p.spd * (p.type === 'elder' ? 1.4 : 2.1);
      if (p.timer <= 0) { p.state = 'walk'; p.fx = p.fy = undefined; p.node = null; pedPickTarget(p); } break; }
    case 'fight': { p.timer -= dt; const tx = Player.veh ? Player.veh.x : px, ty = Player.veh ? Player.veh.y : py, dx = tx - p.x, dy = ty - p.y, l = Math.hypot(dx, dy) || 1; spd = p.spd * 1.8; mx = dx / l; my = dy / l;
      if (l < 17 && p.cd <= 0 && !Player.veh && Player.out <= 0) { p.cd = .9; p.punch = .2; Player.hurt(6, p.x, p.y); say(p, pick(['טפח!', 'הנה!', 'קח!']), .8); Audio2.sfx('punch', p.x, p.y); }
      if (p.timer <= 0 || l > 420) { p.state = 'walk'; p.node = null; pedPickTarget(p); } break; }
    case 'chase': { const tx = Player.veh ? Player.veh.x : px, ty = Player.veh ? Player.veh.y : py, dx = tx - p.x, dy = ty - p.y, l = Math.hypot(dx, dy) || 1; spd = p.type === 'elder' ? 82 : 95; mx = dx / l; my = dy / l;
      if (l < 17 && p.cd <= 0 && !Player.veh && Player.out <= 0) { p.cd = 1.1; p.punch = .2; Player.hurt(p.type === 'guard' ? 7 : 4, p.x, p.y); say(p, pick(['הנה לך מקל!', 'עצור!', 'תפסתי אותך!']), .9); Audio2.sfx('punch', p.x, p.y); }
      if (Math.random() < .004) say(p, pick(LINES.elderAngry), 1.6); break; }
    case 'idle': p.timer -= dt; if (p.timer <= 0) { p.state = 'walk'; } break;
    case 'swim': break;
    case 'walk': default: {
      if (!p.tgt) pedPickTarget(p);
      const dx = p.tgt.x - p.x, dy = p.tgt.y - p.y, l = Math.hypot(dx, dy);
      if (l < 10) { if (Math.random() < .08) { p.state = 'idle'; p.timer = rnd(1, 4); } pedPickTarget(p); } else { mx = dx / l; my = dy / l; }
      p.lt += dt; if (p.lt > 1.3) { if (dist(p.x, p.y, p.lx, p.ly) < 5 && p.state === 'walk') { const t = p.node; p.node = p.prev || t; p.prev = t; p.side = -p.side; pedPickTarget(p, true); } p.lx = p.x; p.ly = p.y; p.lt = 0; }
      if (d2p < 170 && p.sayL <= 0 && Math.random() < .0025) say(p, pick(LINES[p.type === 'elder' ? 'elderMumble' : p.type] || LINES.adult), 2.6);
      // dodge fast vehicles heading at us
      if (Math.random() < .25) for (const v of actV) { const sp = Math.hypot(v.vx, v.vy); if (sp < 90 || Math.abs(v.x - p.x) > 90 || Math.abs(v.y - p.y) > 90) continue; const rx = p.x - v.x, ry = p.y - v.y, ahead = (rx * v.vx + ry * v.vy) / sp; if (ahead > 0 && ahead < 70 && Math.abs((rx * v.vy - ry * v.vx) / sp) < 16) { const s = (rx * v.vy - ry * v.vx) > 0 ? 1 : -1; p.vx += v.vy / sp * s * 220; p.vy += -v.vx / sp * s * 220; if (Math.random() < .5) say(p, pick(['אוי!', 'היי!']), 1); break; } }
    }
  }
  if (p.punch > 0) p.punch -= dt;
  if (mx || my) { p.vx += (mx * spd - p.vx) * Math.min(1, dt * 10); p.vy += (my * spd - p.vy) * Math.min(1, dt * 10); p.a += angDiff(p.a, Math.atan2(my, mx)) * Math.min(1, dt * 10); p.walk += dt * spd * .11; }
  if (ENV.rain > .4 && !p.animal) p.umbrella = p.umbrella ?? (Math.random() < .55); else if (ENV.rain < .1) p.umbrella = undefined;
  const m = MINFO[matAt(p.x, p.y)]; p.swim = m.water;
  const sm = p.swim ? .45 : 1;
  p.x += p.vx * dt * sm; p.y += p.vy * dt * sm;
  collideStatic(p, p.r);
}
function animalAI(p, dt, d2p) {
  const t = p.type;
  let mx = 0, my = 0, spd = p.spd;
  const near = Player.veh ? 110 : 70;
  switch (p.state) {
    case 'graze': p.timer -= dt; if (p.timer <= 0) { p.state = 'roam'; p.timer = rnd(1, 3); p.fx = rnd(-1, 1); p.fy = rnd(-1, 1); if (t === 'cow' && Math.random() < .25) Audio2.sfx('moo', p.x, p.y); if (t === 'peacock' && Math.random() < .3) { p.display = 3; } } if (p.display > 0) p.display -= dt; break;
    case 'roam': p.timer -= dt; mx = p.fx; my = p.fy; if (p.timer <= 0) { p.state = 'graze'; p.timer = rnd(2, 6); }
      if (p.pen && !pointInPoly(p.x + mx * 20, p.y + my * 20, p.pen)) { p.fx = -p.fx; p.fy = -p.fy; }
      if (p.zone && dist(p.x, p.y, p.zone.x, p.zone.y) > p.zone.r) { p.fx = p.zone.x - p.x; p.fy = p.zone.y - p.y; const l = Math.hypot(p.fx, p.fy); p.fx /= l; p.fy /= l; } break;
    case 'wander': p.timer -= dt; if (p.timer <= 0) { p.timer = rnd(.6, 2.5); p.fx = Math.random() < .3 ? 0 : rnd(-1, 1); p.fy = rnd(-1, 1); } mx = p.fx; my = p.fy; spd = t === 'chicken' ? 24 : t === 'dog' ? 36 : 28;
      if (p.home && dist(p.x, p.y, p.home.x, p.home.y) > 260) { p.fx = p.home.x - p.x; p.fy = p.home.y - p.y; const l = Math.hypot(p.fx, p.fy); p.fx /= l; p.fy /= l; }
      if ((t === 'chicken' || t === 'cat') && d2p < near) { p.state = 'flee'; p.timer = 1.6; if (t === 'chicken') Audio2.sfx('cluck', p.x, p.y); }
      if (t === 'dog' && Player.veh && ['bike', 'kalnoit', 'scooter', 'atv'].includes(Player.veh.type) && d2p < 170 && Math.hypot(Player.veh.vx, Player.veh.vy) > 40) { p.state = 'chase'; p.timer = 6; }
      break;
    case 'flee': p.timer -= dt; { const dx = p.x - Player.x, dy = p.y - Player.y, l = Math.hypot(dx, dy) || 1; mx = dx / l + Math.sin(G.time * 9 + p.id) * .5; my = dy / l + Math.cos(G.time * 7 + p.id) * .5; spd = t === 'chicken' ? 115 : t === 'cat' ? 140 : 90; } if (p.timer <= 0) p.state = p.animal && ANIMALS[t].spd < 30 && t !== 'chicken' && t !== 'cat' ? 'graze' : 'wander'; break;
    case 'chase': p.timer -= dt; { const tx = Player.veh ? Player.veh.x : Player.x, ty = Player.veh ? Player.veh.y : Player.y, dx = tx - p.x, dy = ty - p.y, l = Math.hypot(dx, dy) || 1; mx = dx / l; my = dy / l; spd = 150;
        if (Math.random() < .05) Audio2.sfx('bark', p.x, p.y); if (l < 18 && p.cd <= 0) { p.cd = 1; if (!Player.veh) Player.hurt(3, p.x, p.y); else if (['bike', 'scooter'].includes(Player.veh.type) && Math.random() < .25) Player.fallOff(120); } if (p.timer <= 0 || l > 400) p.state = 'wander'; } break;
    case 'stand': if (d2p < (Player.veh ? 180 : 110)) { p.state = 'fly'; p.timer = 6; p.fx = p.x - Player.x; p.fy = p.y - Player.y; const l = Math.hypot(p.fx, p.fy) || 1; p.fx /= l; p.fy /= l; } break;
    case 'fly': p.timer -= dt; p.x += p.fx * 160 * dt; p.y += p.fy * 160 * dt; p.a = Math.atan2(p.fy, p.fx); p.walk += dt * 9; p.flying = true; if (p.timer <= 0) { p.flying = false; p.state = 'stand'; if (MINFO[matAt(p.x, p.y)].water || solidAt(p.x, p.y, 4)) { p.state = 'fly'; p.timer = 2; } } return;
    case 'ko': p.timer -= dt; if (p.timer <= 0) { p.state = t === 'dog' || t === 'cat' ? 'flee' : 'wander'; p.timer = 3; p.hp = p.maxhp; } break;
    case 'held': return;
  }
  if (mx || my) { const l = Math.hypot(mx, my) || 1; mx /= l; my /= l; p.vx += (mx * spd - p.vx) * Math.min(1, dt * 8); p.vy += (my * spd - p.vy) * Math.min(1, dt * 8); p.a += angDiff(p.a, Math.atan2(my, mx)) * Math.min(1, dt * 8); p.walk += dt * spd * .14; }
  p.x += p.vx * dt; p.y += p.vy * dt; collideStatic(p, p.r);
}

/* ---------------- population management ---------------- */
const POP = { t: 0 };
function districtDensity(dname) {
  if (/קיבוץ|שכונת|הבריכה/.test(dname)) return { peds: 30, cars: 8 };
  if (/ההרחבה/.test(dname)) return { peds: 16, cars: 6 };
  if (/המשק/.test(dname)) return { peds: 10, cars: 4 };
  if (/התעשייה/.test(dname)) return { peds: 12, cars: 6 };
  if (/צומת|כביש/.test(dname)) return { peds: 6, cars: 9 };
  return { peds: 3, cars: 4 };
}
function pedTypeFor(x, y) {
  const d = MAP.district(x, y), r = Math.random();
  if (/המשק/.test(d)) return r < .7 ? 'worker' : r < .85 ? 'adult' : 'elder';
  if (/התעשייה/.test(d)) return r < .5 ? 'worker' : 'adult';
  if (/לב הקיבוץ/.test(d) && r < .1) return 'cook';
  if (/קיבוץ|שכונת|הבריכה|ההרחבה|לב/.test(d)) return r < .32 ? 'adult' : r < .55 ? 'kid' : r < .82 ? 'elder' : r < .93 ? 'teen' : 'volunteer';
  return r < .6 ? 'worker' : r < .85 ? 'adult' : 'volunteer';
}
function vehTypeFor(kind) {
  const r = Math.random();
  switch (kind) {
    case 'highway': return r < .55 ? 'car' : r < .75 ? 'van' : r < .9 ? 'pickup' : 'milktruck';
    case 'asphalt': return r < .35 ? 'car' : r < .52 ? 'pickup' : r < .62 ? 'van' : r < .75 ? 'scooter' : r < .88 ? 'kalnoit' : 'cart';
    case 'path': return r < .42 ? 'kalnoit' : r < .78 ? 'bike' : r < .92 ? 'cart' : 'scooter';
    default: return r < .35 ? 'tractor' : r < .62 ? 'pickup' : r < .88 ? 'atv' : 'bike';
  }
}
function driverFor(t) { return { kalnoit: 'elder', bike: pick(['kid', 'kid', 'teen', 'adult', 'volunteer']), scooter: pick(['teen', 'adult']), tractor: 'worker', atv: pick(['worker', 'teen']), forklift: 'worker', milktruck: 'worker', combine: 'worker' }[t] || pick(['adult', 'adult', 'worker', 'elder']); }
function offscreen(x, y, m) { return Math.abs(x - CAM.x) > CAM.hw + m || Math.abs(y - CAM.y) > CAM.hh + m; }
const _nq2 = [];
function spawnAmbientVehicle(n, e) {
  const r = e.r, type = vehTypeFor(r.kind), dx = e.n.x - n.x, dy = e.n.y - n.y, l = Math.hypot(dx, dy) || 1;
  if (!(vMask({ type }) & r.k)) return null;
  const off = r.kind === 'path' ? 0 : r.w * .25, x = n.x - dy / l * off, y = n.y + dx / l * off;
  if (solidAt(x, y, 10)) return null;
  for (const v of vehicles) if (Math.abs(v.x - x) < 50 && Math.abs(v.y - y) < 50) return null;
  const v = mkVeh(type, x, y, Math.atan2(dy, dx)); const p = mkPed(driverFor(type), x, y); p.veh = v; p.state = 'drive'; v.driver = p;
  v.ai = 'wander'; v.prev = n; v.node = e.n; v.road = r; v.tgt = { x: e.n.x - dy / l * off, y: e.n.y + dx / l * off };
  const sp = { highway: 220, asphalt: 90, path: 60 }[r.kind] || 60; v.vx = Math.cos(v.a) * sp; v.vy = Math.sin(v.a) * sp;
  return v;
}
function popTick(dt) {
  POP.t -= dt; if (POP.t > 0) return; POP.t = .4;
  const P0 = Player.veh || Player, dname = MAP.district(P0.x, P0.y), dens = districtDensity(dname);
  let np = 0, nc = 0;
  for (const p of peds) { if (p.animal || p.persistent || p.veh) continue; if (dist(p.x, p.y, P0.x, P0.y) < 1300) np++; else if (!p.mission && p.state !== 'chase') removePed(p); }
  for (const v of vehicles) { if (v.persistent || !v.driver || v.driver === 'player') continue; const d = dist(v.x, v.y, P0.x, P0.y); if (d < 1400) nc++; else if (v.ai !== 'chase' && !v.mission) removeVeh(v); }
  // also clear abandoned non-persistent cars far away
  for (const v of vehicles) if (!v.persistent && !v.driver && !v.mission && dist(v.x, v.y, P0.x, P0.y) > 2200) removeVeh(v);
  const tries = 6;
  for (let t = 0; t < tries && np < dens.peds; t++) {
    const a = Math.random() * TAU, R = rnd(620, 1050), x = P0.x + Math.cos(a) * R, y = P0.y + Math.sin(a) * R;
    if (!offscreen(x, y, 40)) continue;
    const n = nearestNode(x, y, MASK_PED, 300); if (!n || !offscreen(n.x, n.y, 40) || dist(n.x, n.y, P0.x, P0.y) < 550) continue;
    const ty = pedTypeFor(n.x, n.y); const p = mkPed(ty, n.x + rnd(-6, 6), n.y + rnd(-6, 6)); p.laneOff = rnd(-1, 1); p.node = n; p.prev = null; pedPickTarget(p); np++;
  }
  for (let t = 0; t < tries && nc < dens.cars; t++) {
    const a = Math.random() * TAU, R = rnd(700, 1150), x = P0.x + Math.cos(a) * R, y = P0.y + Math.sin(a) * R;
    const n = nearestNode(x, y, 0, 300); if (!n || !offscreen(n.x, n.y, 60) || dist(n.x, n.y, P0.x, P0.y) < 600 || !n.nb.length) continue;
    const e = pick(n.nb); if (spawnAmbientVehicle(n, e)) nc++;
  }
}
function spawnWorld() {
  initLooks();
  const S = MAP.spawns;
  for (const s of S.parked) { if (solidAt(s.x, s.y, 6)) continue; const v = mkVeh(s.type, s.x, s.y, s.a, s.col); v.persistent = true; }
  for (const s of S.tractorSpots) { const v = mkVeh('tractor', s.x, s.y, s.a); v.persistent = true; v.frenzy = true; }
  if (S.combine) { const v = mkVeh('combine', S.combine.x, S.combine.y, S.combine.a); v.persistent = true; v.frenzy = true; MAP.combineVeh = v; }
  for (const a of S.animals) { const p = mkPed(a.type, a.x, a.y); p.persistent = true; p.pen = a.pen; p.zone = a.zone; p.home = { x: a.x, y: a.y }; }
}

/* ---------------- tick ---------------- */
function entitiesTick(dt) {
  const P0 = Player.veh || Player;
  actV = [];
  for (const v of vehicles) if (v === Player.veh || v.ai === 'chase' || dist(v.x, v.y, P0.x, P0.y) < 1150) actV.push(v);
  for (const v of actV) {
    if (v.stun > 0) v.stun -= dt; if (v.sayL > 0) v.sayL -= dt; if (v.horn > 0) v.horn -= dt;
    if (v.driver && v.driver !== 'player' && !v.dead) {
      if (v.ai === 'wander' || v.ai === 'release') aiWander(v, dt);
      else if (v.ai === 'chase' || v.ai === 'angry') { aiChase(v, dt, Player.veh ? Player.veh.x : Player.x, Player.veh ? Player.veh.y : Player.y); if (v.ai === 'angry' && (Math.random() < dt * .1 || dist(v.x, v.y, Player.x, Player.y) > 600)) v.ai = 'release'; }
    }
    vehPhysics(v, dt);
    vehStatic(v);
    if (v.dead && Math.random() < .25) FX.smoke(v.x + rnd(-6, 6), v.y + rnd(-6, 6));
    else if (v.hp < v.d.hp * .3 && Math.random() < .12) FX.smoke(v.x + Math.cos(v.a) * v.d.L * .35, v.y + Math.sin(v.a) * v.d.L * .35);
  }
  vehVsVeh(actV);
  // vehicles vs people
  for (const v of actV) {
    const sp = Math.hypot(v.vx, v.vy); if (sp < 4) continue;
    const cs = vehCircles(v);
    for (const p of peds) {
      if (p.veh || p.flying || Math.abs(p.x - v.x) > 70 || Math.abs(p.y - v.y) > 70) continue;
      for (const c of cs) { const dx = p.x - c.x, dy = p.y - c.y, d = Math.hypot(dx, dy), rr = c.r + p.r; if (d >= rr) continue;
        if (p.state === 'ko') { p.x += dx / (d || 1) * (rr - d); p.y += dy / (d || 1) * (rr - d); break; }
        if (sp > 45) Combat.vehicleHitsPed(v, p, sp); else if (d > 0) { p.x += dx / d * (rr - d); p.y += dy / d * (rr - d); }
        break; }
    }
    if (v !== Player.veh && !Player.veh && Player.out <= 0) for (const c of cs) { const dx = Player.x - c.x, dy = Player.y - c.y, d = Math.hypot(dx, dy), rr = c.r + 6.5; if (d >= rr) continue;
      if (sp > 50) { Player.hurt(Math.min(28, sp * .12), v.x, v.y); Player.vx += v.vx * .6; Player.vy += v.vy * .6; if (v.driver && v.driver !== 'player') say(v.driver, v.ai === 'chase' ? 'תפסתי אותך!' : 'סליחה!', 1.2); }
      else if (d > 0) { Player.x += dx / d * (rr - d); Player.y += dy / d * (rr - d); } break; }
  }
  for (const p of peds) { if (p.veh || p.state === 'fly' || p.mission || dist(p.x, p.y, P0.x, P0.y) < 1200) updatePed(p, dt); }
  popTick(dt);
}
