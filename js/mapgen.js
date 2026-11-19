'use strict';
/* ================================================================
   mapgen.js — hand-designed macro layout + procedural detail.
   Kibbutz (ring road, winding inner paths, cul-de-sacs), expansion
   neighbourhood, farm, industrial zone, wadi, grove, highway junction,
   jittered field grid with dirt tracks, fish ponds, orchards, solar.
   ================================================================ */
const MAP = { spawns: { parked: [], animals: [], tractorSpots: [], combine: null }, sprays: [], phones: [], shops: [], res: [], pois: [] };

function genMap(seed) {
  const R = RNG(seed || 1910);
  const S = MAP.spawns;
  const W = WORLD_W, H = WORLD_H;
  const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
  const plAt = (pl, t) => pl[clamp(Math.round(t * (pl.length - 1)), 0, pl.length - 1)];
  const plTan = (pl, i) => { const a = pl[Math.max(0, i - 1)], b = pl[Math.min(pl.length - 1, i + 1)]; return Math.atan2(b[1] - a[1], b[0] - a[0]); };
  const nearestIdx = (pl, x, y) => { let b = 0, bd = 1e18; for (let i = 0; i < pl.length; i++) { const d = dist2(pl[i][0], pl[i][1], x, y); if (d < bd) { bd = d; b = i; } } return b; };
  const poi = (name, x, y, kind) => { const p = { name, x, y, kind: kind || 'place' }; MAP.pois.push(p); POI[name] = p; return p; };
  const reserve = (x, y, r) => MAP.res.push({ x, y, r });
  const inRes = (x, y, m) => MAP.res.some(c => dist(c.x, c.y, x, y) < c.r + (m || 0));
  const disk = (x, y, r, m, layer) => { addFeature({ type: 'disk', x, y, r, mat: m, layer, pass: 0, bbox: [x - r - 6, y - r - 6, x + r + 6, y + r + 6] }); addFeature({ type: 'disk', x, y, r, mat: m, layer: layer + .1, pass: 1, bbox: [x - r - 6, y - r - 6, x + r + 6, y + r + 6] }); };
  const deco = (bbox, layer, draw, rasterPoly, m) => addFeature({ type: 'deco', bbox, layer, draw, poly: rasterPoly, mat: m });
  const park = (type, x, y, a, col) => S.parked.push({ type, x, y, a, col });
  const ROOF_TILE = ['#b4553c', '#c0643f', '#a84a3c', '#c97a4a', '#9b4b43', '#b86a52'];

  /* ---------------- highway ---------------- */
  const hwPl = spline([[-80, 4400], [700, 4430], [1500, 4360], [2300, 4310], [3000, 4335], [3700, 4290], [4500, 4240], [5300, 4300], [6100, 4232], [6480, 4212]], 20);
  MAP.highway = addRoad(hwPl, 'highway', 76, { name: 'כביש 99' });
  const J1 = hwPl[nearestIdx(hwPl, 3330, 4300)], J2 = hwPl[nearestIdx(hwPl, 1300, 4360)];
  // verge
  addArea(offsetPolyline(hwPl, 70).concat(offsetPolyline(hwPl, -70).reverse()), M.GRAVEL, 6, { soft: 1 });

  /* ---------------- kibbutz ring ---------------- */
  const KC = [3150, 2250]; MAP.KC = KC;
  const ringCtl = [];
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, rr = R.range(.9, 1.07); ringCtl.push([KC[0] + Math.cos(a) * 880 * rr, KC[1] + Math.sin(a) * 740 * rr]); }
  const scaleCtl = (ctl, f) => ctl.map(p => [KC[0] + (p[0] - KC[0]) * f, KC[1] + (p[1] - KC[1]) * f]);
  const ringPl = spline(ringCtl, 20, true); MAP.ringPl = ringPl;
  const fencePl = spline(scaleCtl(ringCtl, 1.13), 20, true); MAP.fencePl = fencePl;
  addArea(spline(scaleCtl(ringCtl, 1.16), 24, true), M.GRASS, 12, { edge: 'rgba(60,90,30,.25)' });
  MAP.ring = addRoad(ringPl, 'asphalt', 30, { closed: true, name: 'הכביש ההיקפי' });
  ZONES.kibbutz = fencePl;
  const ringAt = deg => { const a = deg * Math.PI / 180; let best = 0, bd = 1e9; for (let i = 0; i < ringPl.length; i++) { const d = Math.abs(angDiff(Math.atan2(ringPl[i][1] - KC[1], ringPl[i][0] - KC[0]), a)); if (d < bd) { bd = d; best = i; } } return ringPl[best]; };
  const ringRadius = deg => { const p = ringAt(deg); return dist(p[0], p[1], KC[0], KC[1]); };
  const Sg = ringAt(90), Ng = ringAt(-90), Wg = ringAt(180), Eg = ringAt(0);
  const insideRing = (x, y, m) => pointInPoly(x, y, ringPl) && polylineDist(x, y, ringPl) > (m || 0);

  /* ---------------- access road + gate ---------------- */
  const accPl = spline([Sg, [Sg[0] - 40, Sg[1] + 240], [Sg[0] + 110, Sg[1] + 560], [lerp(Sg[0], J1[0], .6) - 80, lerp(Sg[1], J1[1], .72)], [J1[0] + 10, J1[1] - 140], J1], 20);
  MAP.access = addRoad(accPl, 'asphalt', 30, { name: 'כביש הגישה' });
  // gate: guard booth + raised barrier + kibbutz sign
  { const i = nearestIdx(accPl, Sg[0], Sg[1] + 90), p = accPl[i], a = plTan(accPl, i), n = [-Math.sin(a), Math.cos(a)];
    addBuilding({ x: p[0] + n[0] * 34, y: p[1] + n[1] * 34, hw: 12, hh: 10, ang: a, h: 26, kind: 'booth', label: 'ש.ג' });
    addProp('barrier', p[0] + n[0] * 30 + Math.cos(a) * 30, p[1] + n[1] * 30 + Math.sin(a) * 30, { ang: a, hw: 22 });
    poi('השער', p[0], p[1]);
    // car park outside the gate
    const c = [p[0] - n[0] * 150 + Math.cos(a) * 60, p[1] - n[1] * 150 + Math.sin(a) * 60];
    const lot = rectPoly(c[0], c[1], 110, 58, a);
    addArea(lot, M.ROAD, 40.15, { edge: '#9a958a', edgeW: 4 });
    deco(bboxOf(lot, 4), 40.3, g => { g.save(); g.translate(c[0], c[1]); g.rotate(a); g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1.6; for (let x = -100; x <= 100; x += 25) { g.beginPath(); g.moveTo(x, -58); g.lineTo(x, -18); g.moveTo(x, 18); g.lineTo(x, 58); g.stroke(); } g.restore(); });
    addRoad([[p[0] - n[0] * 15, p[1] - n[1] * 15], [c[0] + n[0] * 20 - Math.cos(a) * 40, c[1] + n[1] * 20 - Math.sin(a) * 40]], 'asphalt', 22);
    for (let x = -88; x <= 88; x += 25) for (const yy of [-38, 38]) if (R() < .7) { const q = rot(x, yy, a); park(R() < .25 ? 'van' : 'car', c[0] + q[0], c[1] + q[1], a + Math.PI / 2 + (R() < .5 ? Math.PI : 0)); }
    poi('החניון', c[0], c[1]);
    // cypress avenue along the access road
    for (let k = 4; k < accPl.length * .35; k += 3) { const q = accPl[k], ta = plTan(accPl, k), nn = [-Math.sin(ta), Math.cos(ta)]; for (const sd of [-1, 1]) { const x = q[0] + nn[0] * 32 * sd, y = q[1] + nn[1] * 32 * sd; if (!nearRoad(x, y, 6) && !pointInPoly(x, y, lot)) addProp('cypress', x, y); } }
  }

  /* ---------------- wadi ---------------- */
  const wPl = spline([[-100, 3330], [600, 3470], [1300, 3390], [2000, 3560], [2700, 3480], [3250, 3620], [3900, 3540], [4600, 3700], [5300, 3590], [6000, 3730], [6500, 3640]], 20);
  const wHW = wPl.map((p, i) => 72 + 46 * fbm(i * .045, 3.3, 77, 3));
  const off = (pl, ws, f) => pl.map((p, i) => { const a = pl[Math.max(0, i - 1)], b = pl[Math.min(pl.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [p[0] - dy / l * ws[i] * f, p[1] + dx / l * ws[i] * f]; });
  const wPoly = off(wPl, wHW, 1).concat(off(wPl, wHW, -1).reverse());
  addArea(wPoly, M.SAND, 8, { edge: 'rgba(120,95,60,.35)', edgeW: 10 });
  addArea(off(wPl, wHW.map(w => w * .32), 1).concat(off(wPl, wHW.map(w => w * .28), -1).reverse()), M.ROCK, 9);
  MAP.wadiPl = wPl; ZONES.wadi = wPoly;
  for (let i = 2; i < wPl.length; i += 2) {
    const p = wPl[i], a = plTan(wPl, i), nn = [-Math.sin(a), Math.cos(a)];
    if (R() < .7) { const s = R() < .5 ? 1 : -1, d = wHW[i] * R.range(.75, 1.15); addProp('tamarisk', p[0] + nn[0] * d * s, p[1] + nn[1] * d * s); }
    if (R() < .35) { const d = wHW[i] * R.range(-.5, .5); addProp('rock', p[0] + nn[0] * d, p[1] + nn[1] * d, { r: R.range(6, 13) }); }
  }

  /* ---------------- farm complex (north) ---------------- */
  const FC = [3120, 950], fa = .08; MAP.FC = FC;
  const fw = (x, y) => { const q = rot(x, y, fa); return [FC[0] + q[0], FC[1] + q[1]]; };
  const yard = blobPoly(FC[0], FC[1], 560, 330, 16, .1, R, fa); ZONES.farm = yard;
  addArea(yard, M.YARD, 14, { edge: 'rgba(90,70,40,.35)', edgeW: 8 });
  const farmRoad = addRoad(spline([Ng, [Ng[0] + 70, Ng[1] - 180], [FC[0] + 60, FC[1] + 360], fw(0, 200)], 20), 'asphalt', 26, { endKey: 'farmHub', name: 'דרך המשק' });
  const fb = (lx, ly, hw, hh, o) => { const p = fw(lx, ly); return addBuilding(Object.assign({ x: p[0], y: p[1], hw, hh, ang: fa }, o)); };
  fb(-300, -95, 175, 32, { h: 30, kind: 'cowshed', label: 'הרפת' });
  fb(-300, 8, 175, 32, { h: 30, kind: 'cowshed' });
  fb(-30, -60, 55, 38, { h: 28, kind: 'metal', label: 'מכון חליבה', roofCol: '#c9ced2' });
  for (let i = 0; i < 3; i++) { const p = fw(60 + i * 56, -215); addBuilding({ shape: 'circle', x: p[0], y: p[1], r: 23, h: 112, kind: 'silo' }); }
  fb(130, -95, 78, 44, { h: 38, kind: 'canopy', roofOnly: true, label: 'מתבן', roofCol: '#8e9aa2' });
  for (let i = 0; i < 9; i++) { const p = fw(80 + (i % 3) * 34, -120 + Math.floor(i / 3) * 22); addProp('haysq', p[0], p[1], { ang: fa }); }
  for (let i = 0; i < 3; i++) fb(390, -215 + i * 78, 140, 22, { h: 22, kind: 'coop', label: i === 1 ? 'הלול' : '' });
  const garage1 = fb(330, 150, 95, 52, { h: 40, kind: 'garage', label: 'מוסך שלומי' });
  { const p = fw(330, 232); MAP.sprays.push({ x: p[0], y: p[1], r: 38, name: 'מוסך שלומי' }); poi('מוסך שלומי', p[0], p[1]); }
  { const p = fw(160, 175); addBuilding({ shape: 'circle', x: p[0], y: p[1], r: 14, h: 34, kind: 'tank' }); }
  fb(-70, 160, 40, 18, { h: 22, kind: 'caravan', label: 'מזכירות המשק' });
  { const p = fw(-70, 205); MAP.phones.push({ x: p[0], y: p[1], f: 'cow' }); }
  // cow pen
  { const pc = fw(-300, 130); const pen = rectPoly(pc[0], pc[1], 175, 62, fa); addArea(pen, M.MUD, 15);
    for (let x = -165; x <= 165; x += 36) { for (const y of [-62, 62]) { if (y < 0 && Math.abs(x) < 40) continue; const q = fw(-300 + x, 130 + y); addProp('fence', q[0], q[1], { ang: fa }); } }
    for (let y = -44; y <= 44; y += 36) for (const x of [-175, 175]) { const q = fw(-300 + x, 130 + y); addProp('fence', q[0], q[1], { ang: fa + Math.PI / 2 }); }
    for (let i = 0; i < 9; i++) { const q = fw(-300 + R.range(-150, 150), 130 + R.range(-40, 40)); S.animals.push({ type: 'cow', x: q[0], y: q[1], pen: pen }); }
    for (let i = 0; i < 3; i++) { const q = fw(-380 + i * 90, 85); addProp('trough', q[0], q[1], { ang: fa }); }
    MAP.pen = { poly: pen, x: pc[0], y: pc[1] }; poi('הרפת', fw(-300, 60)[0], fw(-300, 60)[1]); }
  for (let i = 0; i < 14; i++) { const q = fw(390 + R.range(-140, 140), -255 + R.range(0, 200)); if (!solidAt(q[0], q[1], 6)) S.animals.push({ type: 'chicken', x: q[0], y: q[1] }); }
  [[230, 200], [420, 225], [470, 120]].forEach(([x, y]) => { const p = fw(x, y); park('tractor', p[0], p[1], fa + R.range(-.3, .3)); });
  { const p = fw(-140, 215); park('pickup', p[0], p[1], fa); }
  { const p = fw(-20, 35); park('milktruck', p[0], p[1], fa); }
  { const p = fw(60, 230); park('atv', p[0], p[1], fa + 1.2); }
  for (let i = 0; i < 8; i++) { const p = fw(R.range(-500, 520), R.range(-280, 280)); if (!solidAt(p[0], p[1], 14)) addProp(pick(['hay', 'tires', 'barrel', 'barrel', 'pallet']), p[0], p[1], { ang: R() * 3 }); }
  for (let i = 0; i < 5; i++) { const p = fw(-480 + i * 20, -230); addProp('beehive', p[0], p[1]); }
  poi('הלול', fw(390, -30)[0], fw(390, -30)[1]); poi('הסילו', fw(120, -170)[0], fw(120, -170)[1]);
  // yard exits (dirt) towards the fields
  MAP.farmExits = [fw(-560, -40), fw(0, -330), fw(560, 40), fw(-430, 260)];

  /* ---------------- industrial zone (west) ---------------- */
  const IC = [1480, 2380], ia = -.2; MAP.IC = IC;
  const iw = (x, y) => { const q = rot(x, y, ia); return [IC[0] + q[0], IC[1] + q[1]]; };
  const indPoly = rectPoly(IC[0], IC[1], 650, 390, ia); ZONES.industry = indPoly;
  addArea(indPoly, M.CONCRETE, 14, { edge: 'rgba(60,60,60,.4)', edgeW: 6 });
  addRoad([iw(-600, 0), iw(0, 0), iw(600, 0)], 'asphalt', 28, { startKey: 'indW', endKey: 'indE', name: 'רחוב המלאכה' });
  addRoad([iw(-180, -340), iw(-180, 0)], 'asphalt', 24, { endKey: 'indXA' }); addRoad([iw(-180, 0), iw(-180, 340)], 'asphalt', 24, { startKey: 'indXA', endKey: 'indXAs' });
  addRoad([iw(260, -340), iw(260, 0)], 'asphalt', 24); addRoad([iw(260, 0), iw(260, 300)], 'asphalt', 24);
  addRoad(spline([Wg, [Wg[0] - 240, Wg[1] + 60], [iw(820, 40)[0], iw(820, 40)[1]], iw(600, 0)], 20), 'asphalt', 28, { endKey: 'indE', name: 'דרך התעשייה' });
  { const s = iw(-180, 340); addRoad(spline([s, [s[0] - 70, s[1] + 300], [1250, 3420], [1310, 3900], J2], 20), 'asphalt', 28, { startKey: 'indXAs', name: 'דרך המעבר' }); }
  const ib = (lx, ly, hw, hh, o) => { const p = iw(lx, ly); return addBuilding(Object.assign({ x: p[0], y: p[1], hw, hh, ang: ia }, o)); };
  ib(-400, -185, 140, 95, { h: 56, kind: 'factory', label: 'פלסטו-קיבוץ' });
  ib(40, -190, 160, 80, { h: 46, kind: 'metal', label: 'מחסן לוגיסטי', roofCol: '#a9b0b4' });
  ib(440, -185, 72, 72, { h: 98, kind: 'tower', label: 'בית המשרדים' });
  ib(-400, 185, 125, 85, { h: 44, kind: 'metal', roofCol: '#8f9aa0', label: 'מחסן קירור' });
  ib(40, 195, 150, 80, { h: 52, kind: 'factory', label: 'מפעל השימורים' });
  ib(440, 190, 70, 58, { h: 34, kind: 'garage', label: 'מוסך המפעל' });
  { const p = iw(440, 110); MAP.sprays.push({ x: p[0], y: p[1], r: 34, name: 'מוסך המפעל' }); }
  poi('מפעל פלסטו-קיבוץ', iw(-400, -60)[0], iw(-400, -60)[1]); poi('בית המשרדים', iw(440, -90)[0], iw(440, -90)[1]); poi('מפעל השימורים', iw(40, 90)[0], iw(40, 90)[1]);
  for (let i = 0; i < 6; i++) { const p = iw(-610 + (i % 2) * 0, -330 + i * 28); addProp('container', p[0] + 40, p[1], { ang: ia }); }
  for (let i = 0; i < 4; i++) { const p = iw(-590, 120 + i * 28); addProp('container', p[0], p[1], { ang: ia }); }
  for (let i = 0; i < 18; i++) { const p = iw(R.range(-560, 560), R.pick([-110, 110, -300, 300]) + R.range(-15, 15)); if (!solidAt(p[0], p[1], 10) && !nearRoad(p[0], p[1], 4)) addProp(R.pick(['pallet', 'pallet', 'barrel', 'cones', 'dumpster']), p[0], p[1], { ang: ia }); }
  [[-500, 34], [-80, -34], [100, 34], [380, -34], [520, 34], [-300, -34]].forEach(([x, y]) => { const p = iw(x, y); park(R() < .5 ? 'car' : 'van', p[0], p[1], ia + (y > 0 ? 0 : Math.PI)); });
  [[-230, -95], [-90, 105], [180, -100]].forEach(([x, y]) => { const p = iw(x, y); park('forklift', p[0], p[1], ia + R.range(0, 3)); });
  for (let x = -640; x <= 640; x += 40) for (const y of [-390, 390]) { const p = iw(x, y); if (!nearRoad(p[0], p[1], 10)) addProp('cfence', p[0], p[1], { ang: ia }); }
  for (let y = -370; y <= 370; y += 40) for (const x of [-650, 650]) { const p = iw(x, y); if (!nearRoad(p[0], p[1], 10)) addProp('cfence', p[0], p[1], { ang: ia + Math.PI / 2 }); }

  /* ---------------- expansion neighbourhood (east) ---------------- */
  const EC = [4560, 2260]; MAP.EC = EC;
  const expBlob = blobPoly(EC[0], EC[1] + 10, 700, 470, 14, .1, R); ZONES.expansion = expBlob;
  addArea(spline(expBlob, 24, true), M.GRASS, 12);
  const spine = spline([Eg, [Eg[0] + 180, Eg[1] + 20], [4420, 2200], [4700, 2310], [4980, 2230], [5150, 2270]], 20);
  addRoad(spine, 'asphalt', 26, { name: 'רחוב הגפן' });
  { const e = spine[spine.length - 1]; disk(e[0], e[1], 46, M.ROAD, 40); }
  const expStreets = [spine];
  [.26, .47, .66, .85].forEach((t, k) => {
    const i = Math.round(t * (spine.length - 1)), p = spine[i], a = plTan(spine, i), nn = [-Math.sin(a), Math.cos(a)], tg = [Math.cos(a), Math.sin(a)];
    const sides = k % 2 ? [-1, 1] : [R() < .5 ? -1 : 1];
    for (const sd of sides) {
      const L = R.range(230, 330), b1 = R.range(-60, 60), b2 = R.range(-110, 110);
      const pl = spline([p, [p[0] + nn[0] * sd * L * .5 + tg[0] * b1, p[1] + nn[1] * sd * L * .5 + tg[1] * b1], [p[0] + nn[0] * sd * L + tg[0] * b2, p[1] + nn[1] * sd * L + tg[1] * b2]], 20);
      addRoad(pl, 'asphalt', 22, { name: ['רחוב התאנה', 'רחוב הרימון', 'רחוב הזית', 'סמטת התמר', 'רחוב השקד'][(k * 2 + (sd > 0 ? 1 : 0)) % 5] });
      const e = pl[pl.length - 1]; disk(e[0], e[1], 40, M.ROAD, 40);
      expStreets.push(pl);
    }
  });
  poi('ההרחבה', spine[Math.floor(spine.length * .6)][0], spine[Math.floor(spine.length * .6)][1]);
  for (const pl of expStreets) {
    const rs = resample(pl, 84);
    for (let i = 1; i < rs.length; i++) {
      const p = rs[i], j = nearestIdx(pl, p[0], p[1]), a = plTan(pl, j), nn = [-Math.sin(a), Math.cos(a)];
      for (const sd of [-1, 1]) {
        const hw = R.range(32, 40), hh = R.range(24, 29), off = 13 + 30 + hh;
        const b = { x: p[0] + nn[0] * sd * off, y: p[1] + nn[1] * sd * off, hw, hh, ang: a };
        if (!pointInPoly(b.x, b.y, expBlob) || rectNearRoad(b, 10) || buildingOverlap(b, 18) || polylineDist(b.x, b.y, ringPl) < 140) continue;
        const two = R() < .45;
        addBuilding(Object.assign(b, { h: two ? 46 : 30, kind: 'house', style: two ? 'villa' : 'tile', roofCol: R.pick(ROOF_TILE), wallCol: R.pick(['#efe6d6', '#e9dcc4', '#f4efe6', '#ddd2bf']) }));
        // driveway + car
        const dx = p[0] + nn[0] * sd * (13 + 15), dy = p[1] + nn[1] * sd * (13 + 15), ds = sd * (R() < .5 ? 1 : -1);
        const dw = [dx + Math.cos(a) * hw * .55 * ds, dy + Math.sin(a) * hw * .55 * ds];
        addArea(rectPoly(dw[0], dw[1], 13, 17, a + Math.PI / 2), M.PAVERS, 33);
        if (R() < .65) park(R() < .2 ? 'van' : 'car', dw[0], dw[1], a + Math.PI / 2 * sd + (R() < .5 ? Math.PI : 0));
        const back = (q) => [b.x + nn[0] * sd * q, b.y + nn[1] * sd * q];
        if (R() < .32) { const c = back(hh + 34); const pb = { x: c[0], y: c[1], hw: 26, hh: 13, ang: a };
          if (!buildingOverlap(pb, 4) && !rectNearRoad(pb, 6)) { addArea(rectPoly(c[0], c[1], 32, 19, a), M.PAVERS, 15); addArea(rectPoly(c[0], c[1], 24, 11, a), M.POOL, 16, { edge: '#e8f4f8', edgeW: 3 }); addProp('parasol', c[0] + Math.cos(a) * 34, c[1] + Math.sin(a) * 34); } }
        else if (R() < .6) { const c = back(hh + R.range(20, 40)); addProp(R.pick(['citrus', 'olive', 'palm', 'ficus']), c[0] + Math.cos(a) * R.range(-20, 20), c[1] + Math.sin(a) * R.range(-20, 20)); }
        for (let f = -1; f <= 1; f += 2) { const c = back(hh + 50); const q = [c[0] + Math.cos(a) * f * 18, c[1] + Math.sin(a) * f * 18]; if (!solidAt(q[0], q[1], 4)) addProp('hedge', q[0], q[1], { ang: a, hw: 18 }); }
        if (R() < .4) { const c = back(-hh - 8); addProp('mailbox', c[0] - Math.cos(a) * hw * .6 * ds, c[1] - Math.sin(a) * hw * .6 * ds); }
        if (R() < .3) { const c = back(hh + 16); addProp(R.pick(['gnome', 'laundry', 'bin', 'flowers']), c[0], c[1], { ang: a }); }
      }
    }
    // street lamps
    const ls = resample(pl, 150);
    for (let i = 1; i < ls.length; i++) { const p = ls[i], j = nearestIdx(pl, p[0], p[1]), a = plTan(pl, j); const s = i % 2 ? 1 : -1; const x = p[0] - Math.sin(a) * 18 * s, y = p[1] + Math.cos(a) * 18 * s; if (!solidAt(x, y, 4)) addProp('lamp', x, y); }
  }

  /* ---------------- kibbutz interior ---------------- */
  const Hb = [KC[0], KC[1] - 30]; MAP.hub = Hb;
  const dAng = R.range(-.06, .06);
  addArea(rectPoly(Hb[0], Hb[1] - 60, 185, 120, dAng), M.PAVERS, 14, { edge: '#8f8676', edgeW: 3 });
  const dining = addBuilding({ x: Hb[0], y: Hb[1] - 70, hw: 122, hh: 62, ang: dAng, h: 42, kind: 'dining', label: 'חדר האוכל' });
  reserve(Hb[0], Hb[1] - 40, 200);
  poi('חדר האוכל', Hb[0] + Math.sin(-dAng) * 0, Hb[1] + 4);
  MAP.shops.push({ x: Hb[0] - 50, y: Hb[1] + 2, kind: 'food', name: 'חדר האוכל' });
  MAP.phones.push({ x: Hb[0] + 150, y: Hb[1] - 150, f: 'kitchen' });
  for (let i = 0; i < 7; i++) { const a = Math.PI * .15 + i / 6 * Math.PI * .7; addProp('ficus', Hb[0] + Math.cos(a) * 200, Hb[1] + 100 + Math.sin(a) * 110); }
  for (const s of [-1, 1]) addProp('flag', Hb[0] + s * 40, Hb[1] + 50);
  for (let i = 0; i < 5; i++) addProp('sprinkler', Hb[0] + R.range(-150, 150), Hb[1] + R.range(130, 230));
  // facilities around the hub
  const FAC = [
    { deg: 205, kind: 'office', label: 'המזכירות', hw: 56, hh: 38, h: 30 },
    { deg: 160, kind: 'club', label: 'מועדון לחבר', hw: 60, hh: 40, h: 28 },
    { deg: 330, kind: 'shop', label: 'הצרכנייה', hw: 60, hh: 40, h: 30 },
    { deg: 20, kind: 'clinic', label: 'המרפאה', hw: 50, hh: 38, h: 26 },
    { deg: 250, kind: 'laundry', label: 'המכבסה', hw: 46, hh: 32, h: 26 },
    { deg: 290, kind: 'hall', label: 'בית העם', hw: 72, hh: 46, h: 40 },
  ];
  for (const f of FAC) {
    const a = f.deg * Math.PI / 180, x = Hb[0] + Math.cos(a) * 320, y = Hb[1] + Math.sin(a) * 270;
    const ang = a + Math.PI / 2;
    const b = addBuilding({ x, y, hw: f.hw, hh: f.hh, ang, h: f.h, kind: f.kind, label: f.label });
    reserve(x, y, Math.max(f.hw, f.hh) + 22);
    const door = [x - Math.cos(a) * (f.hh + 12), y - Math.sin(a) * (f.hh + 12)];
    f.door = door; poi(f.label, door[0], door[1]);
    const pe = [Hb[0] + Math.cos(a) * 150, Hb[1] + Math.sin(a) * 110];
    addRoad(spline([door, [lerp(door[0], pe[0], .5) + R.range(-20, 20), lerp(door[1], pe[1], .5) + R.range(-20, 20)], pe], 16), 'path', 14);
    if (f.kind === 'shop') MAP.shops.push({ x: door[0], y: door[1], kind: 'shop', name: 'הצרכנייה' });
    if (f.kind === 'clinic') { MAP.shops.push({ x: door[0], y: door[1], kind: 'clinic', name: 'המרפאה' }); MAP.clinic = door; }
    if (f.kind === 'office') MAP.office = door;
  }
  // hub plaza ring path
  addRoad(spline(blobPoly(Hb[0], Hb[1] + 10, 150, 112, 10, .05, R), 16, true), 'path', 16, { closed: true, mat: M.PAVERS });
  // pool complex
  { const pc = [KC[0] + 405, KC[1] + 335], pa = .35; MAP.poolC = pc;
    addArea(rectPoly(pc[0], pc[1], 112, 72, pa), M.PAVERS, 14, { edge: '#8f8676', edgeW: 3 });
    addArea(rectPoly(pc[0] - 10, pc[1], 64, 30, pa), M.POOL, 16, { edge: '#f2f7f9', edgeW: 5, lanes: 1, angle: pa });
    const k = rot(80, -40, pa); addBuilding({ x: pc[0] + k[0], y: pc[1] + k[1], hw: 24, hh: 18, ang: pa, h: 22, kind: 'kiosk', label: 'קיוסק' });
    MAP.shops.push({ x: pc[0] + rot(80, -10, pa)[0], y: pc[1] + rot(80, -10, pa)[1], kind: 'kiosk', name: 'קיוסק הבריכה' });
    for (let i = 0; i < 5; i++) { const q = rot(-70 + i * 26, 50, pa); addProp('lounger', pc[0] + q[0], pc[1] + q[1], { ang: pa }); if (i % 2 === 0) addProp('parasol', pc[0] + q[0] + 6, pc[1] + q[1] - 4); }
    for (let x = -110; x <= 110; x += 40) for (const y of [-72, 72]) { if (y > 0 && Math.abs(x + 30) < 30) continue; const q = rot(x, y, pa); addProp('cfence', pc[0] + q[0], pc[1] + q[1], { ang: pa }); }
    for (const x of [-112, 112]) for (let y = -52; y <= 52; y += 40) { const q = rot(x, y, pa); addProp('cfence', pc[0] + q[0], pc[1] + q[1], { ang: pa + Math.PI / 2 }); }
    reserve(pc[0], pc[1], 150); poi('הבריכה', pc[0] + rot(-30, 95, pa)[0], pc[1] + rot(-30, 95, pa)[1]);
  }
  // basketball court
  { const cc = [KC[0] - 190, KC[1] + 520], ca = -.1; const cp = rectPoly(cc[0], cc[1], 62, 36, ca); addArea(cp, M.COURT, 14, { edge: '#ddd', edgeW: 2 });
    deco(bboxOf(cp, 4), 14.5, g => { g.save(); g.translate(cc[0], cc[1]); g.rotate(ca); g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 1.6; g.strokeRect(-58, -32, 116, 64); g.beginPath(); g.moveTo(0, -32); g.lineTo(0, 32); g.stroke(); g.beginPath(); g.arc(0, 0, 10, 0, TAU); g.stroke(); for (const s of [-1, 1]) { g.beginPath(); g.arc(58 * s, 0, 22, Math.PI / 2 + (s > 0 ? 0 : Math.PI), Math.PI * 1.5 + (s > 0 ? 0 : Math.PI)); g.stroke(); } g.restore(); });
    reserve(cc[0], cc[1], 90); poi('מגרש הכדורסל', cc[0], cc[1]); }
  // children area: gan, school, playground
  { const gc = [KC[0] - 440, KC[1] + 300];
    addBuilding({ x: gc[0], y: gc[1], hw: 50, hh: 34, ang: .5, h: 24, kind: 'gan', label: 'גן "רימון"' });
    addBuilding({ x: gc[0] - 140, y: gc[1] - 140, hw: 80, hh: 38, ang: .7, h: 32, kind: 'school', label: 'בית הספר' });
    const sb = blobPoly(gc[0] + 95, gc[1] + 60, 48, 36, 10, .1, R); addArea(sb, M.SANDBOX, 14, { edge: '#a88' });
    addProp('swing', gc[0] + 80, gc[1] + 45, { ang: .5 }); addProp('slide', gc[0] + 115, gc[1] + 75, { ang: .5 });
    reserve(gc[0] - 60, gc[1] - 60, 150); poi('גן הילדים', gc[0] + 40, gc[1] - 50); }
  // water tower
  { const t = [KC[0] - 560, KC[1] - 270]; addBuilding({ shape: 'circle', x: t[0], y: t[1], r: 26, h: 128, kind: 'watertower', label: '' }); reserve(t[0], t[1], 70); poi('מגדל המים', t[0] + 40, t[1] + 30); }
  // youth pub in the shelter
  { const t = [KC[0] + 430, KC[1] - 380]; addBuilding({ x: t[0], y: t[1], hw: 38, hh: 26, ang: -.4, h: 10, kind: 'shelter', label: 'המקלט' });
    MAP.phones.push({ x: t[0] - 30, y: t[1] + 40, f: 'youth' }); reserve(t[0], t[1], 90); poi('המקלט', t[0] - 10, t[1] + 44); }
  // petting zoo
  { const z = [KC[0] - 120, KC[1] - 470]; addArea(blobPoly(z[0], z[1], 70, 55, 10, .1, R), M.YARD, 15);
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; if (i === 4) continue; addProp('fence', z[0] + Math.cos(a) * 74, z[1] + Math.sin(a) * 58, { ang: a + Math.PI / 2, hw: 15 }); }
    addBuilding({ x: z[0] - 30, y: z[1] - 25, hw: 18, hh: 14, h: 18, kind: 'shed', ang: .2 });
    for (let i = 0; i < 3; i++) S.animals.push({ type: 'goat', x: z[0] + R.range(-30, 40), y: z[1] + R.range(-10, 30), zone: { x: z[0], y: z[1], r: 55 } });
    S.animals.push({ type: 'peacock', x: z[0] + 20, y: z[1] + 10, zone: { x: z[0], y: z[1], r: 55 } });
    reserve(z[0], z[1], 100); poi('פינת החי', z[0], z[1] + 70); }

  // spokes from hub to ring, avoiding facilities
  const interiorPaths = [];
  for (const deg of [90, 50, 126, 182, 228, 310, 355]) {
    const a = deg * Math.PI / 180, s = [Hb[0] + Math.cos(a) * 150, Hb[1] + Math.sin(a) * 112], e0 = ringAt(deg), e = [lerp(e0[0], KC[0], .005), lerp(e0[1], KC[1], .005)];
    let ctl = null;
    for (let tr = 0; tr < 8; tr++) {
      const c = [s];
      for (const t of [.3, .55, .8]) { const x = lerp(s[0], e[0], t), y = lerp(s[1], e[1], t), j = (tr < 6 ? R.range(-60, 60) : 0); c.push([x - Math.sin(a) * j, y + Math.cos(a) * j]); }
      c.push(e);
      if (c.slice(1, 4).every(p => !inRes(p[0], p[1], 20)) || tr === 7) { ctl = c; break; }
    }
    const pl = spline(ctl, 18);
    addRoad(pl, 'path', deg === 90 ? 22 : 16, { mat: deg === 90 ? M.PAVERS : M.PATH });
    interiorPaths.push(pl);
    if (deg === 90) MAP.boulevard = pl;
  }
  // inner loop
  { const ctl = [];
    for (let i = 0; i < 11; i++) {
      const deg = i / 11 * 360 + 8, a = deg * Math.PI / 180, rr = ringRadius(deg) * .6;
      let x = KC[0] + Math.cos(a) * rr + R.range(-30, 30), y = KC[1] + Math.sin(a) * rr + R.range(-30, 30);
      for (let k = 0; k < 8; k++) { const c = MAP.res.find(c => dist(c.x, c.y, x, y) < c.r + 18); if (!c) break; const d = dist(c.x, c.y, KC[0], KC[1]), dd = dist(x, y, KC[0], KC[1]); const f = dd > d ? 1 : -1; x += Math.cos(a) * 30 * f; y += Math.sin(a) * 30 * f; }
      ctl.push([x, y]);
    }
    const pl = spline(ctl, 18, true); addRoad(pl, 'path', 14, { closed: true }); interiorPaths.push(pl.concat([pl[0]]));
  }
  // cul-de-sac branches
  let made = 0;
  for (let tries = 0; tries < 260 && made < 22; tries++) {
    const par = R.pick(interiorPaths), i = R.int(3, par.length - 4), p = par[i], a = plTan(par, i), sd = R() < .5 ? 1 : -1;
    if (dist(p[0], p[1], Hb[0], Hb[1]) < 260) continue;
    const da = a + sd * Math.PI / 2 + R.range(-.45, .45), L = R.range(120, 250), bend = R.range(-50, 50);
    const m = [p[0] + Math.cos(da) * L * .5 - Math.sin(da) * bend, p[1] + Math.sin(da) * L * .5 + Math.cos(da) * bend], e = [p[0] + Math.cos(da) * L, p[1] + Math.sin(da) * L];
    if (!insideRing(e[0], e[1], 80) || inRes(e[0], e[1], 30) || inRes(m[0], m[1], 20) || nearRoad(e[0], e[1], 44) || nearRoad(m[0], m[1], 26)) continue;
    const pl = spline([p, m, e], 16); addRoad(pl, 'path', 12); disk(e[0], e[1], 16, M.PATH, 30); interiorPaths.push(pl); made++;
  }
  // houses along interior paths
  const sector = (x, y) => { const d = (Math.atan2(y - KC[1], x - KC[0]) * 180 / Math.PI + 360) % 360; return d >= 180 && d < 270 ? 'rows' : d >= 270 ? 'small' : 'mid'; };
  for (const pl of interiorPaths) {
    const rs = resample(pl, R.range(64, 74));
    for (let i = 1; i < rs.length; i++) {
      const p = rs[i]; if (dist(p[0], p[1], Hb[0], Hb[1]) < 240) continue;
      const j = nearestIdx(pl, p[0], p[1]), a = plTan(pl, j), nn = [-Math.sin(a), Math.cos(a)];
      for (const [sd, row] of [[-1, 0], [1, 0], [-1, 1], [1, 1]]) {
        if (row && R() < .35) continue;
        const st = sector(p[0], p[1]);
        const hw = st === 'rows' ? R.range(56, 66) : st === 'small' ? R.range(28, 33) : R.range(32, 38);
        const hh = st === 'rows' ? R.range(18, 21) : R.range(22, 27);
        const off = 9 + 20 + hh + row * (2 * hh + 40), b = { x: p[0] + nn[0] * sd * off, y: p[1] + nn[1] * sd * off, hw, hh, ang: a + R.range(-.05, .05) };
        if (!insideRing(b.x, b.y, hw + 26) || inRes(b.x, b.y, Math.max(hw, hh) + 4) || rectNearRoad(b, 9) || buildingOverlap(b, 15)) continue;
        addBuilding(Object.assign(b, {
          h: st === 'rows' ? 22 : R.range(25, 30), kind: 'house', style: st === 'rows' ? 'rows' : (R() < .25 ? 'flat' : 'tile'),
          roofCol: st === 'rows' ? R.pick(['#c9c1ae', '#b9b2a2', '#d0c6b0']) : R.pick(ROOF_TILE), wallCol: R.pick(['#efe6d6', '#e8dfcc', '#f2ece0', '#e6d8bf'])
        }));
        const front = [p[0] + nn[0] * sd * (9 + 8), p[1] + nn[1] * sd * (9 + 8)], back = q => [b.x + nn[0] * sd * q, b.y + nn[1] * sd * q];
        const along = (pt, d) => [pt[0] + Math.cos(a) * d, pt[1] + Math.sin(a) * d];
        const rv = R();
        if (rv < .3) { const q = along(front, R.range(-hw * .7, hw * .7)); park('bike', q[0], q[1], a + Math.PI / 2 * sd + R.range(-.3, .3)); }
        else if (rv < .42) { const q = along(front, R.range(-hw * .6, hw * .6)); park('kalnoit', q[0], q[1], a + (R() < .5 ? 0 : Math.PI)); }
        if (R() < .55) { const q = along(back(hh + R.range(16, 30)), R.range(-hw, hw)); if (!solidAt(q[0], q[1], 8)) addProp(st === 'small' ? R.pick(['ficus', 'citrus', 'pine']) : R.pick(['ficus', 'citrus', 'olive', 'pine', 'palm']), q[0], q[1]); }
        if (R() < .25) { const q = along(back(hh + 14), R.range(-hw * .5, hw * .5)); addProp('laundry', q[0], q[1], { ang: a }); }
        if (R() < .45) { const q = along(back(-hh - 6), (R() < .5 ? -1 : 1) * (hw + 8)); if (!nearRoad(q[0], q[1], 2)) addProp(R.pick(['bush', 'bush', 'flowers', 'gnome', 'bin', 'mailbox']), q[0], q[1]); }
        if (R() < .06) for (let c = 0; c < 3; c++) { const q = along(back(hh + 20), R.range(-30, 30)); S.animals.push({ type: 'chicken', x: q[0], y: q[1] }); }
      }
    }
    const ls = resample(pl, 170);
    for (let i = 1; i < ls.length - 1; i++) { const p = ls[i], j = nearestIdx(pl, p[0], p[1]), a = plTan(pl, j), s = i % 2 ? 1 : -1; const x = p[0] - Math.sin(a) * 13 * s, y = p[1] + Math.cos(a) * 13 * s; if (!solidAt(x, y, 4)) addProp(R() < .7 ? 'lamp' : 'bench', x, y, { ang: a }); }
  }
  // fill pass: houses on free lawn, aligned to the nearest path
  { const sq = [];
    for (let k = 0; k < 5000; k++) {
      const a0 = R() * TAU, rr = Math.sqrt(R()) * 900, x = KC[0] + Math.cos(a0) * rr, y = KC[1] + Math.sin(a0) * rr * .85;
      if (!insideRing(x, y, 50) || dist(x, y, Hb[0], Hb[1]) < 230 || inRes(x, y, 20)) continue;
      roadSegGrid.query(x - 160, y - 160, x + 160, y + 160, sq);
      let best = null, bd = 1e9; for (const s of sq) { const d = segDist(x, y, s.a[0], s.a[1], s.b[0], s.b[1]); if (d < bd) { bd = d; best = s; } }
      if (!best || bd > 150) continue;
      const st = sector(x, y), a = Math.atan2(best.b[1] - best.a[1], best.b[0] - best.a[0]) + (R() < .15 ? Math.PI / 2 : 0);
      const hw = st === 'rows' ? R.range(54, 64) : st === 'small' ? R.range(26, 31) : R.range(30, 35), hh = st === 'rows' ? R.range(17, 20) : R.range(21, 25);
      const b = { x, y, hw, hh, ang: a + R.range(-.06, .06) };
      if (!insideRing(x, y, Math.max(hw, hh) + 26) || inRes(x, y, Math.max(hw, hh) + 2) || rectNearRoad(b, 8) || buildingOverlap(b, 14)) continue;
      addBuilding(Object.assign(b, { h: st === 'rows' ? 22 : R.range(25, 30), kind: 'house', style: st === 'rows' ? 'rows' : (R() < .25 ? 'flat' : 'tile'), roofCol: st === 'rows' ? R.pick(['#c9c1ae', '#b9b2a2', '#d0c6b0']) : R.pick(ROOF_TILE), wallCol: R.pick(['#efe6d6', '#e8dfcc', '#f2ece0', '#e6d8bf']) }));
      const nn = [-Math.sin(a), Math.cos(a)], sd = ((x - best.a[0]) * nn[0] + (y - best.a[1]) * nn[1]) > 0 ? -1 : 1; // side facing the path
      const fr = [x + nn[0] * sd * (hh + 12), y + nn[1] * sd * (hh + 12)], bk = [x - nn[0] * sd * (hh + 22), y - nn[1] * sd * (hh + 22)];
      if (R() < .3 && !solidAt(fr[0], fr[1], 8)) park(R() < .7 ? 'bike' : 'kalnoit', fr[0] + Math.cos(a) * R.range(-hw, hw) * .6, fr[1] + Math.sin(a) * R.range(-hw, hw) * .6, a + R.range(-.4, .4));
      if (R() < .5 && !solidAt(bk[0], bk[1], 10)) addProp(R.pick(['ficus', 'citrus', 'olive', 'pine', 'palm', 'bush']), bk[0] + Math.cos(a) * R.range(-hw, hw), bk[1] + Math.sin(a) * R.range(-hw, hw));
      if (R() < .2) addProp('laundry', bk[0], bk[1], { ang: a });
      if (R() < .3) { const q = [fr[0] + Math.cos(a) * (hw + 6), fr[1] + Math.sin(a) * (hw + 6)]; if (!nearRoad(q[0], q[1], 3)) addProp(R.pick(['flowers', 'gnome', 'bin', 'mailbox', 'bush']), q[0], q[1]); }
    } }
  // ring road lamps + fence
  { const ls = resample(ringPl.concat([ringPl[0]]), 150); for (const p of ls) { const dx = p[0] - KC[0], dy = p[1] - KC[1], l = Math.hypot(dx, dy); const x = p[0] + dx / l * 22, y = p[1] + dy / l * 22; if (!nearRoad(x, y, 3) && !solidAt(x, y, 4)) addProp('lamp', x, y); } }
  { const fs = resample(fencePl.concat([fencePl[0]]), 38); for (let i = 1; i < fs.length; i++) { const a = fs[i - 1], b = fs[i], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; if (nearRoad(m[0], m[1], 14) || solidAt(m[0], m[1], 6)) continue; addProp('cfence', m[0], m[1], { ang: Math.atan2(b[1] - a[1], b[0] - a[0]), hw: 19.5 }); } }
  // dogs & cats roam the kibbutz
  for (let i = 0; i < 7; i++) { const a = R() * TAU, rr = R.range(250, 600); const x = KC[0] + Math.cos(a) * rr, y = KC[1] + Math.sin(a) * rr * .8; if (!solidAt(x, y, 8)) S.animals.push({ type: i < 4 ? 'dog' : 'cat', x, y }); }

  /* ---------------- soccer field ---------------- */
  { const sc = [KC[0] - 960, KC[1] + 660], sa = .18; const sp = rectPoly(sc[0], sc[1], 130, 80, sa);
    addArea(rectPoly(sc[0], sc[1], 146, 94, sa), M.DRY, 13); addArea(sp, M.TURF, 14, { angle: sa });
    deco(bboxOf(sp, 6), 14.5, g => { g.save(); g.translate(sc[0], sc[1]); g.rotate(sa); g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2; g.strokeRect(-124, -74, 248, 148); g.beginPath(); g.moveTo(0, -74); g.lineTo(0, 74); g.stroke(); g.beginPath(); g.arc(0, 0, 22, 0, TAU); g.stroke(); g.strokeRect(-124, -34, 30, 68); g.strokeRect(94, -34, 30, 68); g.restore(); });
    for (const s of [-1, 1]) { const q = rot(s * 128, 0, sa); addProp('goal', sc[0] + q[0], sc[1] + q[1], { ang: sa }); }
    for (const [x, y] of [[-140, -90], [140, -90], [-140, 90], [140, 90]]) { const q = rot(x, y, sa); addProp('lamp', sc[0] + q[0], sc[1] + q[1]); }
    ZONES.soccer = sp; poi('מגרש הכדורגל', sc[0], sc[1] + 100); MAP.soccer = sc; }

  /* ---------------- eucalyptus grove ---------------- */
  const groves = [];
  { const i = Math.floor(accPl.length * .38), p = accPl[i], a = plTan(accPl, i), nn = [-Math.sin(a), Math.cos(a)];
    for (const sd of [-1, 1]) { const c = [p[0] + nn[0] * sd * 270, p[1] + nn[1] * sd * 270]; const g = blobPoly(c[0], c[1], 250, 190, 12, .18, R, a); groves.push(g); addArea(g, M.ORCH, 11, { soft: 1 }); }
    ZONES.grove = groves;
    poi('החורשה', p[0] - nn[0] * 200, p[1] - nn[1] * 200);
    const trail = spline([[p[0] - nn[0] * 20, p[1] - nn[1] * 20], [p[0] - nn[0] * 170 + Math.cos(a) * 60, p[1] - nn[1] * 170 + Math.sin(a) * 60], [p[0] - nn[0] * 330 - Math.cos(a) * 40, p[1] - nn[1] * 330 - Math.sin(a) * 40]], 16);
    addRoad(trail, 'dirt', 12);
    for (let k = 0; k < 4; k++) { const q = trail[Math.floor(trail.length * (k + .5) / 4)]; addProp('table', q[0] + 26, q[1] + 18); }
  }
  for (const g of groves) { const bb = bboxOf(g); for (let k = 0; k < 160; k++) { const x = R.range(bb[0], bb[2]), y = R.range(bb[1], bb[3]); if (!pointInPoly(x, y, g) || nearRoad(x, y, 12)) continue; const q = []; pgrid.query(x - 30, y - 30, x + 30, y + 30, q); if (q.some(o => o.t === 'euc' && dist(o.x, o.y, x, y) < 30)) continue; addProp(R() < .85 ? 'euc' : 'pine', x, y); } }

  /* ---------------- gas station at the junction ---------------- */
  { const i = nearestIdx(hwPl, J1[0] + 190, J1[1]), p = hwPl[i], a = plTan(hwPl, i), nn = [-Math.sin(a), Math.cos(a)];
    const gc = [p[0] - nn[0] * 120, p[1] - nn[1] * 120]; MAP.gas = gc;
    const ap = rectPoly(gc[0], gc[1] + 6, 165, 82, a); addArea(ap, M.CONCRETE, 41, { edge: '#777', edgeW: 3 });
    addBuilding({ x: gc[0] - 20, y: gc[1], hw: 78, hh: 34, ang: a, h: 34, kind: 'canopy', roofOnly: true, label: 'דלק הצומת', roofCol: '#e8e8e8' });
    for (const x of [-55, -20, 15, 50]) { const q = rot(x - 20, 0, a); addProp('pump', gc[0] + q[0], gc[1] + q[1], { ang: a }); }
    const sh = rot(115, -35, a); addBuilding({ x: gc[0] + sh[0], y: gc[1] + sh[1], hw: 42, hh: 28, ang: a, h: 26, kind: 'shop2', label: 'מרכול הצומת' });
    MAP.shops.push({ x: gc[0] + rot(115, 2, a)[0], y: gc[1] + rot(115, 2, a)[1], kind: 'shop2', name: 'מרכול הצומת' });
    poi('תחנת הדלק', gc[0], gc[1] + 50);
    park('car', gc[0] + rot(-60, 55, a)[0], gc[1] + rot(-60, 55, a)[1], a);
    // bus stop on the far side
    const bs = [p[0] + nn[0] * 56 - Math.cos(a) * 260, p[1] + nn[1] * 56 - Math.sin(a) * 260];
    addBuilding({ x: bs[0] + nn[0] * 10, y: bs[1] + nn[1] * 10, hw: 24, hh: 7, ang: a, h: 26, kind: 'busstop', roofOnly: true, roofCol: '#4a7fb5' });
    addProp('bench', bs[0] + nn[0] * 8, bs[1] + nn[1] * 8, { ang: a }); addProp('sign', bs[0] + Math.cos(a) * 34, bs[1] + Math.sin(a) * 34);
    poi('תחנת האוטובוס', bs[0], bs[1]);
  }

  /* ---------------- fields: jittered grid with dirt tracks ---------------- */
  const ga = .07, CW = 290, CHt = 245, O = [-420, -340];
  const NI = Math.ceil((W + 900) / CW), NJ = Math.ceil((H + 800) / CHt);
  const V = [];
  for (let i = 0; i <= NI; i++) { V.push([]); for (let j = 0; j <= NJ; j++) { const q = rot(i * CW, j * CHt, ga); V[i].push([O[0] + q[0] + R.range(-62, 62), O[1] + q[1] + R.range(-50, 50)]); } }
  const devRing = spline(scaleCtl(ringCtl, 1.22), 40, true), devFarm = blobPoly(FC[0], FC[1], 650, 410, 16, 0, () => .5, fa), devExp = blobPoly(EC[0], EC[1] + 10, 790, 560, 14, 0, () => .5);
  const developed = (x, y) => {
    if (x < 30 || y < 30 || x > W - 30 || y > H - 30) return true;
    if (pointInPoly(x, y, devRing)) return true;
    if (pointInPoly(x, y, devFarm)) return true;
    { const dx = x - IC[0], dy = y - IC[1], lx = dx * Math.cos(-ia) - dy * Math.sin(-ia), ly = dx * Math.sin(-ia) + dy * Math.cos(-ia); if (Math.abs(lx) < 760 && Math.abs(ly) < 500) return true; }
    if (pointInPoly(x, y, devExp)) return true;
    if (dist(x, y, MAP.soccer[0], MAP.soccer[1]) < 230) return true;
    for (const g of groves) if (pointInPoly(x, y, g)) return true;
    if (dist(x, y, MAP.gas[0], MAP.gas[1]) < 280) return true;
    if (polylineDist(x, y, wPl) < 150) return true;
    if (nearRoad(x, y, 22, RK.highway | RK.asphalt)) return true;
    return false;
  };
  const devCache = new Map();
  const devPt = (x, y) => { const k = Math.round(x) * 10000 + Math.round(y); if (!devCache.has(k)) devCache.set(k, developed(x, y)); return devCache.get(k); };
  const cellPoly = (i, j) => [V[i][j], V[i + 1][j], V[i + 1][j + 1], V[i][j + 1]];
  const valid = [];
  for (let i = 0; i < NI; i++) { valid.push([]); for (let j = 0; j < NJ; j++) {
    const q = cellPoly(i, j); const pts = q.slice(); for (let k = 0; k < 4; k++) { const a = q[k], b = q[(k + 1) % 4]; pts.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]); } pts.push(polyCentroid(q));
    for (let k = 0; k < 4; k++) pts.push([(q[k][0] * 3 + pts[8][0]) / 4, (q[k][1] * 3 + pts[8][1]) / 4]);
    valid[i].push(pts.every(p => !devPt(p[0], p[1])));
  } }
  const region = (x, y) => (x > 5250 && y > 1450 && y < 3150) ? 'ponds' : y < 1650 && x < 2500 ? 'nw' : y < 1650 ? 'ne' : y > 3100 ? 's' : x < 1000 ? 'w' : 'mid';
  const CROPS = {
    nw: [['avocado', 22], ['citrus', 18], ['olive', 10], ['palm', 10], ['vine', 14], ['alfalfa', 10], ['wheat', 16]],
    ne: [['wheat', 34], ['cotton', 18], ['sunfl', 14], ['plowed', 10], ['alfalfa', 10], ['greenhouse', 9], ['stubble', 5]],
    s: [['wheat', 26], ['sunfl', 16], ['plowed', 14], ['solar', 10], ['stubble', 14], ['cotton', 10], ['fallow', 10]],
    w: [['plowed', 22], ['wheat', 24], ['alfalfa', 16], ['palm', 14], ['fallow', 12], ['stubble', 12]],
    mid: [['wheat', 30], ['alfalfa', 20], ['plowed', 20], ['sunfl', 15], ['fallow', 15]],
  };
  const wpick = list => { let t = 0; for (const [, w] of list) t += w; let r = R() * t; for (const [k, w] of list) { r -= w; if (r <= 0) return k; } return list[0][0]; };
  const merged = new Set(); const fields = [];
  let reservoirDone = false, combineDone = false;
  for (let j = 0; j < NJ; j++) for (let i = 0; i < NI; i++) {
    if (!valid[i][j] || merged.has(i + ',' + j)) continue;
    const c0 = polyCentroid(cellPoly(i, j)), reg = region(c0[0], c0[1]);
    let poly = cellPoly(i, j), mergeR = false;
    if (reg !== 'ponds' && i + 1 < NI && valid[i + 1][j] && region(...polyCentroid(cellPoly(i + 1, j))) === reg && R() < .3) {
      mergeR = true; merged.add((i + 1) + ',' + j); poly = [V[i][j], V[i + 1][j], V[i + 2][j], V[i + 2][j + 1], V[i + 1][j + 1], V[i][j + 1]];
    }
    fields.push({ i, j, poly, reg, mergeR, crop: reg === 'ponds' ? 'ponds' : wpick(CROPS[reg]) });
  }
  // reservoir: north-east cell closest to (5350, 800)
  { let best = null, bd = 1e12; for (const f of fields) { if (f.reg !== 'ne' || f.mergeR) continue; const c = polyCentroid(f.poly), d = dist2(c[0], c[1], 5350, 800); if (d < bd) { bd = d; best = f; } } if (best) best.crop = 'reservoir'; }
  for (const f of fields) {
    const c = polyCentroid(f.poly), fp = insetPoly(f.poly, 14), ang = ga + (R() < .35 ? Math.PI / 2 : 0);
    f.c = c; f.inner = fp;
    const rowsOf = (sp1, sp2, fn, inset) => { const ip = insetPoly(f.poly, inset || 26); const bb = bboxOf(ip); const L = Math.hypot(bb[2] - bb[0], bb[3] - bb[1]) / 2 + 20;
      for (let u = -L; u <= L; u += sp1) for (let v = -L; v <= L; v += sp2) { const q = rot(u, v, ga); const x = c[0] + q[0], y = c[1] + q[1]; if (pointInPoly(x, y, ip)) fn(x, y); } };
    switch (f.crop) {
      case 'wheat': addArea(fp, M.WHEAT, 10, { angle: ang, edge: 'rgba(120,90,30,.35)', edgeW: 3 }); if (R() < .25) for (let k = 0; k < 4; k++) addProp('hay', c[0] + R.range(-90, 90), c[1] + R.range(-70, 70));
        if (!combineDone && f.reg === 'ne' && c[0] > 4300) { combineDone = true; S.combine = { x: c[0], y: c[1], a: ga }; poi('הקומביין', c[0], c[1]); } break;
      case 'cotton': addArea(fp, M.COTTON, 10, { angle: ang, edge: 'rgba(40,70,30,.35)', edgeW: 3 }); break;
      case 'alfalfa': addArea(fp, M.ALFALFA, 10, { angle: ang, edge: 'rgba(40,70,30,.35)', edgeW: 3 }); if (R() < .3) addProp('scarecrow', c[0], c[1]); break;
      case 'sunfl': addArea(fp, M.SUNFL, 10, { angle: ang, edge: 'rgba(60,70,20,.4)', edgeW: 3 }); if (R() < .4) addProp('scarecrow', c[0] + R.range(-40, 40), c[1]); break;
      case 'plowed': addArea(fp, M.PLOWED, 10, { angle: ang, edge: 'rgba(60,40,20,.35)', edgeW: 3 }); break;
      case 'stubble': addArea(fp, M.STUBBLE, 10, { angle: ang, edge: 'rgba(100,80,40,.35)', edgeW: 3 }); for (let k = 0; k < R.int(5, 10); k++) { const x = c[0] + R.range(-110, 110), y = c[1] + R.range(-90, 90); if (pointInPoly(x, y, fp)) addProp('hay', x, y); } break;
      case 'vine': addArea(fp, M.VINE, 10, { angle: ga, edge: 'rgba(60,60,30,.35)', edgeW: 3 }); break;
      case 'fallow': break;
      case 'avocado': case 'citrus': case 'olive': case 'palm':
        addArea(fp, M.ORCH, 10, { edge: 'rgba(80,70,40,.3)', edgeW: 3 });
        rowsOf(f.crop === 'palm' ? 44 : 34, f.crop === 'palm' ? 40 : 30, (x, y) => addProp(f.crop, x + R.range(-2, 2), y + R.range(-2, 2)));
        if (f.crop === 'avocado' && R() < .5) for (let k = 0; k < 4; k++) addProp('beehive', c[0] + k * 14, c[1] + 60);
        break;
      case 'greenhouse': addArea(fp, M.DIRT, 10); rowsOf(150, 50, (x, y) => addProp('greenhouse', x, y, { ang: ga }), 40); break;
      case 'solar': addArea(fp, M.GRAVEL, 10, { edge: 'rgba(80,80,80,.3)', edgeW: 3 }); rowsOf(62, 30, (x, y) => addProp('solar', x, y, { ang: ga }), 30); poi('השדה הסולארי', c[0], c[1]); break;
      case 'ponds': {
        addArea(insetPoly(f.poly, 9), M.DIRT, 9);
        const q = f.poly, bl = (u, v) => [lerp(lerp(q[0][0], q[1][0], u), lerp(q[3][0], q[2][0], u), v), lerp(lerp(q[0][1], q[1][1], u), lerp(q[3][1], q[2][1], u), v)];
        for (const [u0, v0] of [[0, 0], [.5, 0], [0, .5], [.5, .5]]) { const sub = [bl(u0, v0), bl(u0 + .5, v0), bl(u0 + .5, v0 + .5), bl(u0, v0 + .5)]; const wp = insetPoly(sub, 16); addArea(wp, M.WATER, 16, { edge: 'rgba(110,90,60,.6)', edgeW: 5 }); const cc = polyCentroid(wp); if (R() < .45) addProp('aerator', cc[0], cc[1]); if (R() < .35) S.animals.push({ type: 'heron', x: wp[0][0] + 6, y: wp[0][1] + 6 }); }
        break; }
      case 'reservoir': { addArea(insetPoly(f.poly, 9), M.DIRT, 9); const wb = blobPoly(c[0], c[1], CW * .36, CHt * .34, 12, .12, R); addArea(wb, M.WATER, 16, { edge: 'rgba(130,110,80,.7)', edgeW: 8 }); poi('המאגר', c[0], c[1] + CHt * .42); ZONES.reservoir = wb; break; }
    }
  }
  const isFieldCell = (i, j) => i >= 0 && j >= 0 && i < NI && j < NJ && valid[i][j];
  const vkey = (i, j) => 'v' + i + ',' + j;
  const usedV = new Set();
  const track = (i0, j0, i1, j1) => {
    const a = V[i0][j0], b = V[i1][j1], m = [(a[0] + b[0]) / 2 + R.range(-12, 12), (a[1] + b[1]) / 2 + R.range(-12, 12)];
    addRoad(spline([a, m, b], 22), 'track', 20, { startKey: vkey(i0, j0), endKey: vkey(i1, j1) }); usedV.add(i0 + ',' + j0); usedV.add(i1 + ',' + j1);
  };
  for (let i = 0; i <= NI; i++) for (let j = 0; j <= NJ; j++) {
    if (i < NI) { const up = isFieldCell(i, j - 1), dn = isFieldCell(i, j); if (up || dn) track(i, j, i + 1, j); }
    if (j < NJ) { const lf = isFieldCell(i - 1, j), rt = isFieldCell(i, j); const internal = lf && rt && merged.has(i + ',' + j); if ((lf || rt) && !internal) track(i, j, i, j + 1); }
  }
  // connectors from places to the track network
  const nearestV = (x, y, maxD) => { let best = null, bd = maxD * maxD; for (const k of usedV) { const [i, j] = k.split(',').map(Number); const d = dist2(V[i][j][0], V[i][j][1], x, y); if (d < bd) { bd = d; best = [i, j]; } } return best; };
  const connect = (from, startKey) => { const v = nearestV(from[0], from[1], 700); if (!v) return; const to = V[v[0]][v[1]]; const m = [(from[0] + to[0]) / 2 + R.range(-40, 40), (from[1] + to[1]) / 2 + R.range(-40, 40)]; addRoad(spline([from, m, to], 20), 'dirt', 22, { startKey, endKey: vkey(v[0], v[1]) }); };
  for (const e of MAP.farmExits) addRoad(spline([fw(0, 200), [lerp(FC[0], e[0], .5), lerp(FC[1], e[1], .5)], e], 20), 'dirt', 22, { startKey: 'farmHub', endKey: 'fx' + e[0] }), connect(e, 'fx' + e[0]);
  for (const x of [500, 2100, 4300, 5600]) { const p = hwPl[nearestIdx(hwPl, x, 4300)]; connect([p[0], p[1] - 36]); }
  connect(iw(-600, 0), 'indW'); connect(spine[spine.length - 1]); connect(plAt(accPl, .62)); connect(Ng);
  { const p = ringAt(135); connect([p[0] - 20, p[1] + 10]); } { const p = ringAt(-40); connect(p); } { const p = ringAt(220); connect(p); }

  // tractor spots: random field edges
  const fl = fields.filter(f => ['wheat', 'plowed', 'stubble', 'sunfl', 'alfalfa', 'cotton'].includes(f.crop));
  for (let k = 0; k < 9 && fl.length; k++) { const f = fl.splice(R.int(0, fl.length - 1), 1)[0]; S.tractorSpots.push({ x: f.c[0] + R.range(-60, 60), y: f.c[1] + R.range(-50, 50), a: ga + R.range(-1, 1) }); }
  MAP.fields = fields;

  /* ---------------- bridges over the wadi ---------------- */
  for (const r of roads) {
    if (!(r.k & (RK.asphalt | RK.highway))) continue;
    let run = [];
    const flush = () => { if (run.length >= 3) { const pl = run.slice(), w = r.w; addFeature({ type: 'bridge', pl, w, layer: 47, bbox: bboxOf(pl, w) }); } run = []; };
    for (const p of r.pl) { if (pointInPoly(p[0], p[1], wPoly)) run.push(p); else { if (run.length) run.push(p); flush(); } }
    flush();
  }

  /* ---------------- districts ---------------- */
  MAP.district = (x, y) => {
    if (dist(x, y, MAP.gas[0], MAP.gas[1]) < 300) return 'צומת הקיבוץ';
    if (polylineDist(x, y, hwPl) < 90) return 'כביש 99';
    if (pointInPoly(x, y, fencePl)) {
      if (dist(x, y, Hb[0], Hb[1]) < 360) return 'לב הקיבוץ';
      const d = (Math.atan2(y - KC[1], x - KC[0]) * 180 / Math.PI + 360) % 360;
      return d >= 180 && d < 270 ? 'שכונת הוותיקים' : d >= 270 ? 'שכונת הגבעה' : d < 70 ? 'הבריכה והמקלט' : 'שכונת הצעירים';
    }
    if (pointInPoly(x, y, yard)) return 'המשק — רפת ולול';
    if (pointInPoly(x, y, indPoly)) return 'אזור התעשייה';
    if (pointInPoly(x, y, expBlob)) return 'ההרחבה';
    if (groves.some(g => pointInPoly(x, y, g))) return 'חורשת האקליפטוסים';
    if (pointInPoly(x, y, wPoly)) return 'ואדי הצבאים';
    const rg = region(x, y);
    return { ponds: 'בריכות הדגים', nw: 'המטעים', ne: 'שדות הצפון', s: 'שדות הדרום', w: 'השדות המערביים', mid: 'שדות הבר' }[rg];
  };
  MAP.isKibbutz = (x, y) => pointInPoly(x, y, fencePl) || pointInPoly(x, y, expBlob);
}

/* ---- rasterize ground features into the material grid ---- */
function rasterizeMaterials() {
  const sorted = features.slice().sort((a, b) => a.layer - b.layer || a.order - b.order);
  const setPoly = (poly, m) => {
    const bb = bboxOf(poly); const y0 = Math.max(0, Math.floor(bb[1] / MCELL)), y1 = Math.min(MGH - 1, Math.ceil(bb[3] / MCELL));
    const xs = [];
    for (let cy = y0; cy <= y1; cy++) {
      const y = cy * MCELL + MCELL / 2; xs.length = 0;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const yi = poly[i][1], yj = poly[j][1];
        if ((yi > y) !== (yj > y)) xs.push(poly[i][0] + (y - yi) / (yj - yi) * (poly[j][0] - poly[i][0]));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const a = Math.max(0, Math.ceil(xs[k] / MCELL - .5)), b = Math.min(MGW - 1, Math.floor(xs[k + 1] / MCELL - .5));
        for (let cx = a; cx <= b; cx++) mat[cy * MGW + cx] = m;
      }
    }
  };
  const setLine = (pl, w, m, closed) => {
    const n = pl.length, segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const a = pl[i], b = pl[(i + 1) % n], r = w / 2;
      const x0 = Math.max(0, Math.floor((Math.min(a[0], b[0]) - r) / MCELL)), x1 = Math.min(MGW - 1, Math.ceil((Math.max(a[0], b[0]) + r) / MCELL));
      const y0 = Math.max(0, Math.floor((Math.min(a[1], b[1]) - r) / MCELL)), y1 = Math.min(MGH - 1, Math.ceil((Math.max(a[1], b[1]) + r) / MCELL));
      for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) if (segDist(cx * MCELL + 4, cy * MCELL + 4, a[0], a[1], b[0], b[1]) <= r) mat[cy * MGW + cx] = m;
    }
  };
  for (const f of sorted) {
    if (f.type === 'poly') setPoly(f.poly, f.mat);
    else if (f.type === 'road' && f.pass === 1) setLine(f.pl, f.w, f.mat, f.closed);
    else if (f.type === 'disk' && f.pass === 1) setPoly(blobPoly(f.x, f.y, f.r, f.r, 16, 0, () => .5), f.mat);
    else if (f.type === 'deco' && f.poly) setPoly(f.poly, f.mat);
  }
}

/* called after rasterizeMaterials(): scatter scrub on open dry land */
function genWild() {
  const R = RNG(4242);
  /* ---------------- wild vegetation on open land ---------------- */
  for (let k = 0; k < 1400; k++) {
    const x = R.range(40, WORLD_W - 40), y = R.range(40, WORLD_H - 40);
    if (matAt(x, y) !== M.DRY || nearRoad(x, y, 14) || pointInPoly(x, y, MAP.fencePl) || solidAt(x, y, 14)) continue;
    const r = R();
    addProp(r < .35 ? 'tamarisk' : r < .55 ? 'bush' : r < .72 ? 'rock' : r < .88 ? 'olive' : r < .95 ? 'euc' : 'pine', x, y, r >= .55 && r < .72 ? { r: R.range(5, 11) } : undefined);
  }

}
