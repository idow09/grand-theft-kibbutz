'use strict';
/* ================================================================
   world.js — world containers, materials, prop types, collisions
   ================================================================ */
const WORLD_W = 6400, WORLD_H = 4800;
const MCELL = 8, MGW = WORLD_W / MCELL, MGH = WORLD_H / MCELL;
const mat = new Uint8Array(MGW * MGH);

const M = { DRY: 0, GRASS: 1, ROAD: 2, PATH: 3, DIRT: 4, SAND: 5, WATER: 6, POOL: 7, WHEAT: 8, COTTON: 9, ALFALFA: 10, SUNFL: 11, PLOWED: 12, STUBBLE: 13, ORCH: 14, PAVERS: 15, CONCRETE: 16, HIGHWAY: 17, MUD: 18, ROCK: 19, YARD: 20, VINE: 21, COURT: 22, TURF: 23, GRAVEL: 24, SANDBOX: 25 };
const MINFO = [];
(function () {
  const d = (m, tex, o) => MINFO[m] = Object.assign({ tex, grip: 1, drag: 1, lawn: false, crop: false, water: false, road: false, col: '#888' }, o);
  d(M.DRY, 'dry', { drag: .82, grip: .85, col: '#b3a663' });
  d(M.GRASS, 'grass', { drag: .86, grip: .8, lawn: true, col: '#62a845' });
  d(M.ROAD, 'asphalt', { road: true, col: '#4c4e52' });
  d(M.PATH, 'path', { road: true, col: '#c5bfae' });
  d(M.DIRT, 'dirt', { drag: .93, grip: .85, col: '#a07e55' });
  d(M.SAND, 'sand', { drag: .55, grip: .6, col: '#d9c59a' });
  d(M.WATER, 'water', { drag: .25, grip: .4, water: true, col: '#3b7f99' });
  d(M.POOL, 'pool', { drag: .25, grip: .4, water: true, col: '#55d0ea' });
  d(M.WHEAT, 'wheat', { drag: .72, grip: .75, crop: true, col: '#d8b04e' });
  d(M.COTTON, 'cotton', { drag: .72, grip: .75, crop: true, col: '#6d955a' });
  d(M.ALFALFA, 'alfalfa', { drag: .75, grip: .75, crop: true, col: '#66a43f' });
  d(M.SUNFL, 'sunflower', { drag: .7, grip: .75, crop: true, col: '#b4a52c' });
  d(M.PLOWED, 'plowed', { drag: .62, grip: .7, col: '#7c5a38' });
  d(M.STUBBLE, 'stubble', { drag: .85, grip: .8, col: '#b69a5e' });
  d(M.ORCH, 'orchardGround', { drag: .85, grip: .8, col: '#9a8a55' });
  d(M.PAVERS, 'pavers', { road: true, col: '#bdb6a6' });
  d(M.CONCRETE, 'concrete', { road: true, col: '#a4a4a0' });
  d(M.HIGHWAY, 'highway', { road: true, col: '#3d3f42' });
  d(M.MUD, 'mud', { drag: .7, grip: .55, col: '#5e4129' });
  d(M.ROCK, 'rock', { drag: .6, grip: .7, col: '#968a7a' });
  d(M.YARD, 'yard', { drag: .95, grip: .9, col: '#9a8260' });
  d(M.VINE, 'vineyard', { drag: .7, grip: .8, crop: true, col: '#6f7a45' });
  d(M.COURT, 'court', { road: true, col: '#bf6142' });
  d(M.TURF, 'turf', { drag: .9, grip: .85, col: '#56a23e' });
  d(M.GRAVEL, 'gravel', { drag: .9, grip: .8, col: '#9a958a' });
  d(M.SANDBOX, 'sandbox', { drag: .6, grip: .6, col: '#ead79f' });
})();
function matAt(x, y) { const cx = (x / MCELL) | 0, cy = (y / MCELL) | 0; if (cx < 0 || cy < 0 || cx >= MGW || cy >= MGH) return M.DRY; return mat[cy * MGW + cx]; }
function matIdx(x, y) { const cx = (x / MCELL) | 0, cy = (y / MCELL) | 0; if (cx < 0 || cy < 0 || cx >= MGW || cy >= MGH) return -1; return cy * MGW + cx; }

/* ---------- containers ---------- */
const features = [];          // ground drawing features
const roads = [];             // logical roads (graph + AI)
const buildings = [], bgrid = new SpatialGrid(160);
const props = [], pgrid = new SpatialGrid(128);
const roadSegGrid = new SpatialGrid(128);
const POI = {};               // named points
const ZONES = {};             // named shapes for districts
let graphNodes = [], nodeGrid = new SpatialGrid(200);

function addFeature(f) { f.bbox = f.bbox || (f.poly ? bboxOf(f.poly) : f.pl ? bboxOf(f.pl, (f.w || 0) / 2 + 12) : [0, 0, WORLD_W, WORLD_H]); f.order = features.length; features.push(f); return f; }
function addArea(poly, m, layer, o) { return addFeature(Object.assign({ type: 'poly', poly, mat: m, layer }, o || {})); }

/* road kinds */
const RK = { highway: 1, asphalt: 2, path: 4, dirt: 8, track: 16 };
function addRoad(pl, kind, w, o) {
  o = o || {};
  const pts = resample(pl, 22);
  const r = { pl: pts, kind, w, k: RK[kind], startKey: o.startKey, endKey: o.endKey, name: o.name, closed: !!o.closed, noGraph: !!o.noGraph };
  roads.push(r);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const seg = { a, b, w, road: r };
    roadSegGrid.add(seg, Math.min(a[0], b[0]) - w, Math.min(a[1], b[1]) - w, Math.max(a[0], b[0]) + w, Math.max(a[1], b[1]) + w);
  }
  const m = { highway: M.HIGHWAY, asphalt: M.ROAD, path: o.mat || M.PATH, dirt: M.DIRT, track: M.DIRT }[kind];
  const base = { highway: 46, asphalt: 40, path: 30, dirt: 20, track: 18 }[kind];
  addFeature({ type: 'road', pass: 0, pl: pts, w, kind, mat: m, layer: base, closed: r.closed, style: o.style });
  addFeature({ type: 'road', pass: 1, pl: pts, w, kind, mat: m, layer: base + .1, closed: r.closed, style: o.style });
  if (kind !== 'path') addFeature({ type: 'road', pass: 2, pl: pts, w, kind, mat: m, layer: base + .2, closed: r.closed, style: o.style });
  return r;
}
const _rq = [];
function nearRoad(x, y, margin, kinds) {
  roadSegGrid.query(x - 60, y - 60, x + 60, y + 60, _rq);
  for (const s of _rq) { if (kinds && !(s.road.k & kinds)) continue; if (segDist(x, y, s.a[0], s.a[1], s.b[0], s.b[1]) < s.w / 2 + margin) return true; }
  return false;
}
function rectNearRoad(b, margin) {
  const pts = rectPoly(b.x, b.y, b.hw, b.hh, b.ang);
  pts.push([b.x, b.y]);
  for (let i = 0; i < 4; i++) { const p = pts[i], q = pts[(i + 1) % 4]; pts.push([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]); }
  for (const p of pts) if (nearRoad(p[0], p[1], margin)) return true;
  // denser check along long edges
  const L = Math.max(b.hw, b.hh); if (L > 40) for (let i = 0; i < 4; i++) { const p = pts[i], q = pts[(i + 1) % 4]; for (let t = .25; t < 1; t += .25) if (nearRoad(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, margin)) return true; }
  return false;
}

/* ---------- buildings ---------- */
function addBuilding(o) {
  const b = Object.assign({ shape: 'rect', ang: 0, h: 28, kind: 'house', label: '', roofOnly: false, id: buildings.length }, o);
  b.c = Math.cos(b.ang); b.s = Math.sin(b.ang);
  if (b.shape === 'rect') { b.poly = rectPoly(b.x, b.y, b.hw, b.hh, b.ang); b.bbox = bboxOf(b.poly); b.rad = Math.hypot(b.hw, b.hh); }
  else { b.bbox = [b.x - b.r, b.y - b.r, b.x + b.r, b.y + b.r]; b.rad = b.r; }
  buildings.push(b); bgrid.add(b, b.bbox[0], b.bbox[1], b.bbox[2], b.bbox[3]);
  return b;
}
const _bq = [];
function buildingOverlap(b, m) {
  bgrid.query(b.x - b.hw - 80, b.y - b.hh - 80, b.x + b.hw + 80, b.y + b.hh + 80, _bq);
  for (const o of _bq) {
    if (o.shape === 'circle') { if (dist(o.x, o.y, b.x, b.y) < o.r + Math.max(b.hw, b.hh) + m) return true; continue; }
    if (obbOverlap(b, o, m / 2)) return true;
  }
  return false;
}

/* ---------- props ---------- */
const PT = {
  euc: { s: 'c', r: 9, solid: 1, need: 4, val: 40, h: 74, snd: 'wood', burst: ['#6c8a5a', '#8aa676', '#7a5a3a'] },
  ficus: { s: 'c', r: 12, solid: 1, need: 4, val: 45, h: 56, snd: 'wood', burst: ['#2f6f2a', '#4b8f3a', '#6d4c2a'] },
  pine: { s: 'c', r: 8, solid: 1, need: 4, val: 35, h: 62, snd: 'wood', burst: ['#2d5a3a', '#3f7a4a', '#6d4c2a'] },
  cypress: { s: 'c', r: 5, solid: 1, need: 3, val: 25, h: 52, snd: 'wood', burst: ['#26502e', '#386a3c'] },
  citrus: { s: 'c', r: 6, solid: 1, need: 3, val: 20, h: 30, snd: 'wood', burst: ['#2f7a2f', '#ffa21a', '#ffd23f'] },
  avocado: { s: 'c', r: 7, solid: 1, need: 3, val: 22, h: 38, snd: 'wood', burst: ['#1f5a26', '#3c7a2e', '#5a7a2a'] },
  olive: { s: 'c', r: 6, solid: 1, need: 3, val: 22, h: 30, snd: 'wood', burst: ['#7d9070', '#5a6b4c'] },
  palm: { s: 'c', r: 5, solid: 1, need: 4, val: 40, h: 64, snd: 'wood', burst: ['#4f8a2e', '#a8752e'] },
  tamarisk: { s: 'c', r: 10, solid: 0, need: 1, val: 10, h: 14, snd: 'wood', burst: ['#8aa07a', '#a7b392'] },
  bush: { s: 'c', r: 10, solid: 0, need: 0, val: 5, snd: 'wood', burst: ['#3f8f3a', '#2f7a32', '#5fb24a'] },
  flowers: { s: 'c', r: 9, solid: 0, need: 0, val: 5, snd: 'wood', burst: ['#ff6b9a', '#ffd23f', '#fff', '#c58bd6'] },
  hedge: { s: 'r', hw: 22, hh: 5, solid: 1, need: 1, val: 10, snd: 'wood', burst: ['#2f7a32', '#3f8f3a'] },
  mailbox: { s: 'c', r: 4, solid: 0, need: 0, val: 10, snd: 'break', burst: ['#c0392b', '#ddd'] },
  bin: { s: 'c', r: 6, solid: 0, need: 0, val: 10, snd: 'break', burst: ['#3a7d44', '#999', '#cde'] },
  dumpster: { s: 'r', hw: 13, hh: 9, solid: 1, need: 2, val: 25, snd: 'crash', burst: ['#2e6b3a', '#ddd', '#a85'] },
  gnome: { s: 'c', r: 4, solid: 0, need: 0, val: 15, snd: 'break', burst: ['#d33', '#2a6', '#fdc'] },
  laundry: { s: 'r', hw: 22, hh: 4, solid: 0, need: 0, val: 15, snd: 'wood', burst: ['#fff', '#9cf', '#fc9', '#e99'] },
  fence: { s: 'r', hw: 18, hh: 2, solid: 1, need: 1, val: 8, snd: 'wood', burst: ['#e8dcc2', '#cbbd9e'] },
  cfence: { s: 'r', hw: 20, hh: 1.5, solid: 1, need: 2, val: 8, snd: 'break', burst: ['#aab', '#889'] },
  lamp: { s: 'c', r: 3.5, solid: 1, need: 2, val: 20, snd: 'glass', burst: ['#666', '#ffe58a'], light: 1 },
  bench: { s: 'r', hw: 10, hh: 4, solid: 0, need: 0, val: 10, snd: 'wood', burst: ['#8a5a2b', '#555'] },
  table: { s: 'c', r: 10, solid: 1, need: 1, val: 15, snd: 'wood', burst: ['#8a5a2b', '#a87a4a'] },
  hay: { s: 'c', r: 12, solid: 1, need: 2, val: 20, snd: 'wood', burst: ['#e9cf6a', '#d4b64a'] },
  haysq: { s: 'r', hw: 10, hh: 7, solid: 1, need: 2, val: 15, snd: 'wood', burst: ['#e9cf6a', '#d4b64a'] },
  scarecrow: { s: 'c', r: 6, solid: 0, need: 0, val: 30, snd: 'wood', burst: ['#8d6e3f', '#c33', '#e9cf6a'] },
  greenhouse: { s: 'r', hw: 66, hh: 20, solid: 1, need: 3, val: 120, snd: 'glass', burst: ['#d8f0f8', '#fff', '#9cc'] },
  solar: { s: 'r', hw: 28, hh: 7, solid: 1, need: 2, val: 40, snd: 'glass', burst: ['#1d3c6e', '#9cf', '#ddd'] },
  container: { s: 'r', hw: 30, hh: 12, solid: 1, need: 9, val: 0, snd: 'crash' },
  pallet: { s: 'r', hw: 7, hh: 7, solid: 0, need: 0, val: 5, snd: 'wood', burst: ['#c9a36a', '#a07a4a'] },
  barrel: { s: 'c', r: 5.5, solid: 1, need: 1, val: 12, snd: 'crash', burst: ['#2f5fa8', '#c33'] },
  tires: { s: 'c', r: 8, solid: 0, need: 0, val: 8, snd: 'thud', burst: ['#222', '#333'] },
  sprinkler: { s: 'c', r: 3, solid: 0, need: 0, val: 15, snd: 'break', burst: ['#888', '#7fd0ff'] },
  pump: { s: 'r', hw: 5, hh: 9, solid: 1, need: 2, val: 50, snd: 'crash', burst: ['#e33', '#fff', '#ffd23f'] },
  barrier: { s: 'r', hw: 26, hh: 2, solid: 1, need: 1, val: 30, snd: 'wood', burst: ['#e33', '#fff'] },
  sign: { s: 'c', r: 3, solid: 1, need: 1, val: 15, snd: 'break', burst: ['#2a6ab8', '#fff'] },
  rock: { s: 'c', r: 10, solid: 1, need: 9, val: 0, snd: 'thud' },
  aerator: { s: 'c', r: 6, solid: 0, need: 9, val: 0 },
  goal: { s: 'r', hw: 3, hh: 20, solid: 1, need: 2, val: 25, snd: 'break', burst: ['#fff', '#ddd'] },
  swing: { s: 'r', hw: 16, hh: 7, solid: 1, need: 2, val: 25, snd: 'break', burst: ['#e04a4a', '#3b82c4', '#e8c547'] },
  slide: { s: 'r', hw: 6, hh: 16, solid: 1, need: 2, val: 25, snd: 'break', burst: ['#e04a4a', '#e8c547'] },
  trough: { s: 'r', hw: 26, hh: 5, solid: 1, need: 2, val: 15, snd: 'thud', burst: ['#888', '#9cf'] },
  parasol: { s: 'c', r: 3, solid: 0, need: 0, val: 10, h: 22, snd: 'wood', burst: ['#ff6b4a', '#fff'] },
  lounger: { s: 'r', hw: 5, hh: 11, solid: 0, need: 0, val: 8, snd: 'wood', burst: ['#fff', '#4db8f0'] },
  flag: { s: 'c', r: 3, solid: 1, need: 2, val: 20, snd: 'break', burst: ['#fff', '#2a6ab8'] },
  hydrant: { s: 'c', r: 3.5, solid: 1, need: 2, val: 25, snd: 'break', burst: ['#d33', '#7fd0ff'] },
  phone: { s: 'c', r: 5, solid: 1, need: 99, val: 0 },
  beehive: { s: 'r', hw: 6, hh: 5, solid: 0, need: 0, val: 15, snd: 'wood', burst: ['#f3d27a', '#fff'] },
  cones: { s: 'c', r: 4, solid: 0, need: 0, val: 5, snd: 'thud', burst: ['#ff7a1a', '#fff'] },
};
function addProp(t, x, y, o) {
  const d = PT[t]; if (!d) throw new Error('prop ' + t);
  const p = Object.assign({ t, x, y, ang: 0, broken: false, solid: !!d.solid, need: d.need, val: d.val, h: d.h || 0, v: Math.random(), id: props.length }, o || {});
  if (d.s === 'c') { p.r = p.r || d.r; }
  else { p.hw = p.hw || d.hw; p.hh = p.hh || d.hh; }
  p.c = Math.cos(p.ang); p.s = Math.sin(p.ang);
  const R = p.r || Math.hypot(p.hw, p.hh);
  p.rad = R; props.push(p); pgrid.add(p, x - R, y - R, x + R, y + R);
  return p;
}

/* ---------- collision helpers ---------- */
// circle (cx,cy,r) vs shape o (circle via o.r, or oriented rect via hw/hh/c/s). returns {nx,ny,pen}
function shapePush(o, cx, cy, r) {
  if (o.hw === undefined) {
    const dx = cx - o.x, dy = cy - o.y, rr = r + o.r, d2 = dx * dx + dy * dy; if (d2 >= rr * rr) return null;
    const d = Math.sqrt(d2) || .001; return { nx: dx / d, ny: dy / d, pen: rr - d };
  }
  const dx = cx - o.x, dy = cy - o.y, lx = dx * o.c + dy * o.s, ly = -dx * o.s + dy * o.c;
  const px = clamp(lx, -o.hw, o.hw), py = clamp(ly, -o.hh, o.hh); let ex = lx - px, ey = ly - py; const d2 = ex * ex + ey * ey;
  let nx, ny, pen;
  if (d2 >= r * r) return null;
  if (d2 < 1e-6) { const ox = o.hw - Math.abs(lx), oy = o.hh - Math.abs(ly); if (ox < oy) { nx = lx < 0 ? -1 : 1; ny = 0; pen = ox + r; } else { nx = 0; ny = ly < 0 ? -1 : 1; pen = oy + r; } }
  else { const d = Math.sqrt(d2); nx = ex / d; ny = ey / d; pen = r - d; }
  return { nx: nx * o.c - ny * o.s, ny: nx * o.s + ny * o.c, pen };
}
const _cq = [], _cq2 = [];
function collideStatic(e, r, opts) {
  let hit = false;
  bgrid.query(e.x - r, e.y - r, e.x + r, e.y + r, _cq);
  for (const b of _cq) { if (b.roofOnly) continue; const c = shapePush(b, e.x, e.y, r); if (c) { e.x += c.nx * c.pen; e.y += c.ny * c.pen; hit = true; } }
  pgrid.query(e.x - r, e.y - r, e.x + r, e.y + r, _cq2);
  for (const p of _cq2) { if (p.broken || !p.solid) continue; const c = shapePush(p, e.x, e.y, r); if (c) { e.x += c.nx * c.pen; e.y += c.ny * c.pen; hit = true; } }
  e.x = clamp(e.x, r, WORLD_W - r); e.y = clamp(e.y, r, WORLD_H - r);
  return hit;
}
function solidAt(x, y, r) {
  bgrid.query(x - r, y - r, x + r, y + r, _cq);
  for (const b of _cq) if (!b.roofOnly && shapePush(b, x, y, r)) return true;
  pgrid.query(x - r, y - r, x + r, y + r, _cq2);
  for (const p of _cq2) if (!p.broken && p.solid && shapePush(p, x, y, r)) return true;
  return x < 0 || y < 0 || x > WORLD_W || y > WORLD_H;
}
function buildingAt(x, y) {
  bgrid.query(x - 1, y - 1, x + 1, y + 1, _cq);
  for (const b of _cq) if (!b.roofOnly && shapePush(b, x, y, .5)) return b;
  return null;
}

/* ---------- road graph ---------- */
function buildGraph() {
  graphNodes = []; nodeGrid = new SpatialGrid(200);
  const keyed = new Map();
  const mk = (x, y, k) => { const n = { id: graphNodes.length, x, y, nb: [], k: 0 }; graphNodes.push(n); return n; };
  const link = (a, b, r) => { if (a === b || a.nb.some(e => e.n === b)) return; a.nb.push({ n: b, r }); b.nb.push({ n: a, r }); a.k |= r.k; b.k |= r.k; };
  for (const r of roads) {
    if (r.noGraph) continue;
    const pts = r.pl, nodes = [];
    for (let i = 0; i < pts.length; i++) {
      let n = null;
      const key = i === 0 ? r.startKey : i === pts.length - 1 ? r.endKey : null;
      if (key && keyed.has(key)) n = keyed.get(key);
      else { n = mk(pts[i][0], pts[i][1]); if (key) keyed.set(key, n); }
      nodes.push(n);
    }
    for (let i = 1; i < nodes.length; i++) link(nodes[i - 1], nodes[i], r);
    if (r.closed) link(nodes[nodes.length - 1], nodes[0], r);
    r.nodes = nodes;
  }
  for (const n of graphNodes) nodeGrid.add(n, n.x, n.y, n.x, n.y);
  // snap free endpoints onto other roads
  const q = [];
  for (const r of roads) {
    if (r.noGraph || r.closed) continue;
    for (const end of [0, r.nodes.length - 1]) {
      const n = r.nodes[end]; if (end === 0 ? r.startKey : r.endKey) continue;
      nodeGrid.query(n.x - 70, n.y - 70, n.x + 70, n.y + 70, q);
      let best = null, bd = 1e9;
      for (const m of q) { if (m === n || r.nodes.includes(m)) continue; const d = dist(n.x, n.y, m.x, m.y); if (d < bd) { bd = d; best = m; } }
      if (best && bd < 60) link(n, best, r);
    }
  }
}
const _nq = [];
function nearestNode(x, y, mask, maxR) {
  maxR = maxR || 600; let best = null, bd = 1e12;
  for (let R = 150; R <= maxR; R *= 2) {
    nodeGrid.query(x - R, y - R, x + R, y + R, _nq);
    for (const n of _nq) { if (mask && !(n.k & mask)) continue; const d = dist2(n.x, n.y, x, y); if (d < bd) { bd = d; best = n; } }
    if (best) return best;
  }
  return best;
}
