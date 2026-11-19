'use strict';
/* ================================================================
   core.js — math, RNG, noise, geometry, input
   ================================================================ */
const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(rnd(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const dist2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function angDiff(a, b) { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }

/* Seeded RNG (xorshift32) */
function RNG(seed) {
  let s = (seed >>> 0) || 1;
  const f = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  f.range = (a, b) => a + f() * (b - a);
  f.int = (a, b) => Math.floor(a + f() * (b - a + 1));
  f.pick = a => a[Math.floor(f() * a.length)];
  f.chance = p => f() < p;
  return f;
}

/* Value noise / fbm (optionally tileable with period p) */
function hash2(x, y, seed) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y, seed, p) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const w = p ? (i => ((i % p) + p) % p) : (i => i);
  const a = hash2(w(xi), w(yi), seed), b = hash2(w(xi + 1), w(yi), seed), c = hash2(w(xi), w(yi + 1), seed), d = hash2(w(xi + 1), w(yi + 1), seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, seed, oct, p) {
  let s = 0, a = .5, f = 1, n = 0;
  for (let i = 0; i < (oct || 4); i++) { s += a * vnoise(x * f, y * f, seed + i * 31, p ? p * f : 0); n += a; f *= 2; a *= .5; }
  return s / n;
}

/* ---------------- geometry ---------------- */
// Catmull-Rom spline through points [[x,y],...]; returns dense polyline
function spline(pts, step, closed) {
  step = step || 18;
  const out = [], n = pts.length;
  const P = i => closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)];
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const k = Math.max(2, Math.ceil(len / step));
    for (let j = 0; j < k; j++) {
      const t = j / k, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => .5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  if (!closed) out.push(pts[n - 1].slice());
  return out;
}
function polyLen(pl) { let l = 0; for (let i = 1; i < pl.length; i++) l += Math.hypot(pl[i][0] - pl[i - 1][0], pl[i][1] - pl[i - 1][1]); return l; }
// resample polyline at even spacing
function resample(pl, step) {
  const out = [pl[0].slice()]; let acc = 0;
  for (let i = 1; i < pl.length; i++) {
    let ax = pl[i - 1][0], ay = pl[i - 1][1]; const bx = pl[i][0], by = pl[i][1];
    let seg = Math.hypot(bx - ax, by - ay);
    while (acc + seg >= step) {
      const t = (step - acc) / seg; ax = ax + (bx - ax) * t; ay = ay + (by - ay) * t;
      out.push([ax, ay]); seg = Math.hypot(bx - ax, by - ay); acc = 0;
    }
    acc += seg;
  }
  const L = pl[pl.length - 1], O = out[out.length - 1];
  if (Math.hypot(L[0] - O[0], L[1] - O[1]) > step * .3) out.push(L.slice()); else out[out.length - 1] = L.slice();
  return out;
}
function offsetPolyline(pl, d) {
  const out = [];
  for (let i = 0; i < pl.length; i++) {
    const a = pl[Math.max(0, i - 1)], b = pl[Math.min(pl.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    out.push([pl[i][0] - dy / l * d, pl[i][1] + dx / l * d]);
  }
  return out;
}
function pointInPoly(x, y, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c;
  }
  return c;
}
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0; t = clamp(t, 0, 1);
  return Math.hypot(px - ax - dx * t, py - ay - dy * t);
}
function polylineDist(px, py, pl) {
  let best = 1e9;
  for (let i = 1; i < pl.length; i++) { const d = segDist(px, py, pl[i - 1][0], pl[i - 1][1], pl[i][0], pl[i][1]); if (d < best) best = d; }
  return best;
}
function bboxOf(pts, pad) {
  pad = pad || 0; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of pts) { if (p[0] < x0) x0 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[0] > x1) x1 = p[0]; if (p[1] > y1) y1 = p[1]; }
  return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
}
function polyCentroid(poly) { let x = 0, y = 0; for (const p of poly) { x += p[0]; y += p[1]; } return [x / poly.length, y / poly.length]; }
// shrink convex-ish polygon towards centroid by d units (approximate inset)
function insetPoly(poly, d) {
  const n = poly.length, out = [];
  for (let i = 0; i < n; i++) {
    const p0 = poly[(i - 1 + n) % n], p1 = poly[i], p2 = poly[(i + 1) % n];
    const e1x = p1[0] - p0[0], e1y = p1[1] - p0[1], l1 = Math.hypot(e1x, e1y) || 1;
    const e2x = p2[0] - p1[0], e2y = p2[1] - p1[1], l2 = Math.hypot(e2x, e2y) || 1;
    // inward normals (assume clockwise in screen coords => use orientation sign)
    let n1x = -e1y / l1, n1y = e1x / l1, n2x = -e2y / l2, n2y = e2x / l2;
    let bx = n1x + n2x, by = n1y + n2y; const bl = Math.hypot(bx, by) || 1; bx /= bl; by /= bl;
    const cosh = Math.max(.35, bx * n1x + by * n1y);
    out.push([p1[0] + bx * d / cosh, p1[1] + by * d / cosh]);
  }
  // ensure we moved inward: if area grew, flip
  if (Math.abs(polyArea(out)) > Math.abs(polyArea(poly))) return insetPoly(poly.slice().reverse(), d);
  return out;
}
function polyArea(poly) { let a = 0; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1]); return a / 2; }
function blobPoly(cx, cy, rx, ry, n, jit, rng, rot) {
  const out = []; rot = rot || 0;
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU, r = 1 + (rng() * 2 - 1) * jit;
    const x = Math.cos(a) * rx * r, y = Math.sin(a) * ry * r;
    out.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  return out;
}
function rectPoly(cx, cy, hw, hh, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
}
// oriented-rect overlap (SAT) for {x,y,hw,hh,ang}
function obbOverlap(a, b, m) {
  m = m || 0;
  const A = rectPoly(a.x, a.y, a.hw + m, a.hh + m, a.ang), B = rectPoly(b.x, b.y, b.hw + m, b.hh + m, b.ang);
  for (const poly of [A, B]) for (let i = 0; i < 4; i++) {
    const p = poly[i], q = poly[(i + 1) % 4], nx = -(q[1] - p[1]), ny = q[0] - p[0];
    let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
    for (const v of A) { const d = v[0] * nx + v[1] * ny; a0 = Math.min(a0, d); a1 = Math.max(a1, d); }
    for (const v of B) { const d = v[0] * nx + v[1] * ny; b0 = Math.min(b0, d); b1 = Math.max(b1, d); }
    if (a1 < b0 || b1 < a0) return false;
  }
  return true;
}

/* ---------------- spatial hash ---------------- */
class SpatialGrid {
  constructor(cell) { this.cell = cell; this.map = new Map(); this.stamp = 0; }
  key(cx, cy) { return cx * 65536 + cy; }
  add(o, x0, y0, x1, y1) {
    const c = this.cell;
    for (let cx = Math.floor(x0 / c); cx <= Math.floor(x1 / c); cx++)
      for (let cy = Math.floor(y0 / c); cy <= Math.floor(y1 / c); cy++) {
        const k = this.key(cx, cy); let a = this.map.get(k); if (!a) { a = []; this.map.set(k, a); } a.push(o);
      }
  }
  remove(o) { for (const a of this.map.values()) { const i = a.indexOf(o); if (i >= 0) a.splice(i, 1); } }
  query(x0, y0, x1, y1, out) {
    out.length = 0; const st = ++this.stamp, c = this.cell;
    for (let cx = Math.floor(x0 / c); cx <= Math.floor(x1 / c); cx++)
      for (let cy = Math.floor(y0 / c); cy <= Math.floor(y1 / c); cy++) {
        const a = this.map.get(this.key(cx, cy));
        if (a) for (const o of a) if (o._gs !== st) { o._gs = st; out.push(o); }
      }
    return out;
  }
}

/* ---------------- input ---------------- */
const keys = {}, pressed = {}; let mouseDown = false, mouseClicked = false;
const GAME_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'];
addEventListener('keydown', e => {
  if (GAME_KEYS.includes(e.code)) e.preventDefault();
  if (!keys[e.code]) pressed[e.code] = true;
  keys[e.code] = true;
  if (window.Audio2) Audio2.init();
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('mousedown', e => { if (e.button === 0) { mouseDown = true; mouseClicked = true; } if (window.Audio2) Audio2.init(); });
addEventListener('mouseup', () => { mouseDown = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouseDown = false; });
addEventListener('contextmenu', e => e.preventDefault());
const K = (...c) => c.some(x => keys[x]);
const P = (...c) => c.some(x => pressed[x]);
function clearPressed() { for (const k in pressed) pressed[k] = false; mouseClicked = false; }

/* tiny offscreen canvas helper */
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
function shade(hex, f) { // f in [-1,1]: darken/lighten
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (f < 0) { r *= 1 + f; g *= 1 + f; b *= 1 + f; } else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
  return '#' + ((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).slice(1);
}
function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
