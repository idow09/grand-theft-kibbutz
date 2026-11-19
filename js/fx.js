'use strict';
/* ================================================================
   fx.js — particles, smoke, water fountains, falling trees, floaters
   ================================================================ */
const FX = (() => {
  const parts = [], floaters = [], fountains = [], falling = [];
  function burst(x, y, cols, n, spd, sz) {
    for (let i = 0; i < n && parts.length < 900; i++) { const a = Math.random() * TAU, s = rnd(.3, 1) * (spd || 90);
      parts.push({ x, y, z: rnd(0, 6), vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: rnd(40, 140), life: rnd(.5, 1.1), max: 1, col: pick(cols), sz: rnd(1.4, sz || 3.5), rot: Math.random() * 6, k: 'chip' }); }
  }
  function smoke(x, y, col) { if (parts.length > 880) return; parts.push({ x, y, z: 4, vx: rnd(-8, 8) + ENV.windX * 20, vy: rnd(-8, 8) + ENV.windY * 20, vz: 18, life: 1.6, max: 1.6, col: col || 'rgba(190,190,190,', sz: rnd(4, 7), k: 'smoke' }); }
  function dust(x, y, col) { if (parts.length > 880) return; parts.push({ x, y, z: 1, vx: rnd(-10, 10), vy: rnd(-10, 10), vz: 4, life: .8, max: .8, col: col || 'rgba(170,140,100,', sz: rnd(3, 6), k: 'smoke' }); }
  function spray(x, y, vx, vy, col, life) { if (parts.length > 880) return; parts.push({ x, y, z: 4, vx, vy, vz: rnd(10, 40), life: life || .45, max: life || .45, col: col || pick(['#7fd0ff', '#bfe8ff', '#fff']), sz: rnd(1.6, 3.2), k: 'drop' }); }
  function fountain(x, y, t) { fountains.push({ x, y, t }); }
  function fallTree(o, a) { falling.push({ o, a, t: 0 }); }
  function floater(x, y, text, col) { floaters.push({ x, y, text, col: col || '#ffe14a', life: 1.2 }); }
  function tick(dt) {
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.k === 'chip' || p.k === 'drop') { p.z += p.vz * dt; p.vz -= 420 * dt; if (p.z < 0) { p.z = 0; p.vz *= -.3; p.vx *= .6; p.vy *= .6; } p.vx *= Math.exp(-1.2 * dt); p.vy *= Math.exp(-1.2 * dt); }
      else { p.z += p.vz * dt; p.sz += dt * 6; p.vx *= Math.exp(-.8 * dt); p.vy *= Math.exp(-.8 * dt); }
      if (p.life <= 0) parts.splice(i, 1); }
    for (let i = fountains.length - 1; i >= 0; i--) { const f = fountains[i]; f.t -= dt; for (let k = 0; k < 3; k++) { const a = Math.random() * TAU, s = rnd(10, 50); parts.push({ x: f.x, y: f.y, z: 2, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: rnd(120, 200), life: .9, max: .9, col: pick(['#bfe8ff', '#fff', '#7fd0ff']), sz: rnd(1.6, 3), k: 'drop' }); } if (f.t <= 0) fountains.splice(i, 1); }
    for (let i = floaters.length - 1; i >= 0; i--) { const f = floaters[i]; f.y -= 26 * dt; f.life -= dt; if (f.life <= 0) floaters.splice(i, 1); }
    for (let i = falling.length - 1; i >= 0; i--) { const f = falling[i]; f.t += dt * 1.6; if (f.t >= 1) { f.t = 1; if (!f.thud) { f.thud = 1; Audio2.sfx('thud', f.o.x, f.o.y); burst(f.o.x + Math.cos(f.a) * 40, f.o.y + Math.sin(f.a) * 40, PT[f.o.t].burst, 10, 60, 3); } } }
  }
  return { parts, floaters, falling, burst, smoke, dust, spray, fountain, fallTree, floater, tick };
})();
