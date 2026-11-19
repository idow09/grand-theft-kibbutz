'use strict';
/* ================================================================
   ground.js — lazily baked 2x-resolution ground chunks + decals,
   minimap image.
   ================================================================ */
const Ground = (() => {
  const CS = 256, GS = 2, MAXC = 140;
  const cache = new Map(), chunkFeat = new Map(), decals = new Map();
  let frame = 0;
  const key = (cx, cy) => cx * 1000 + cy;

  function init() {
    const sorted = features.slice().sort((a, b) => a.layer - b.layer || a.order - b.order);
    for (const f of sorted) {
      const b = f.bbox;
      for (let cx = Math.floor(b[0] / CS); cx <= Math.floor(b[2] / CS); cx++)
        for (let cy = Math.floor(b[1] / CS); cy <= Math.floor(b[3] / CS); cy++) {
          const k = key(cx, cy); let a = chunkFeat.get(k); if (!a) { a = []; chunkFeat.set(k, a); } a.push(f);
        }
    }
  }
  const tracePl = (g, pl, closed) => { g.beginPath(); g.moveTo(pl[0][0], pl[0][1]); for (let i = 1; i < pl.length; i++) g.lineTo(pl[i][0], pl[i][1]); if (closed) g.closePath(); };
  const EDGE = { asphalt: ['#a9a395', 12], highway: ['#8e897b', 10], path: ['rgba(110,100,80,.55)', 4], dirt: ['rgba(110,85,55,.45)', 10], track: ['rgba(110,85,55,.4)', 8] };

  function drawFeature(g, f) {
    switch (f.type) {
      case 'poly': {
        tracePl(g, f.poly, true);
        if (f.soft) g.globalAlpha = .55;
        g.fillStyle = texPattern(MINFO[f.mat].tex, f.angle || 0); g.fill();
        g.globalAlpha = 1;
        if (f.lanes) { g.save(); g.clip(); const c = polyCentroid(f.poly); g.translate(c[0], c[1]); g.rotate(f.angle || 0); g.strokeStyle = 'rgba(20,70,140,.45)'; g.lineWidth = 1.5; for (let y = -40; y <= 40; y += 12) { g.beginPath(); g.moveTo(-80, y); g.lineTo(80, y); g.stroke(); } g.restore(); }
        if (f.edge) { g.strokeStyle = f.edge; g.lineWidth = f.edgeW || 2; g.lineJoin = 'round'; g.stroke(); }
        break;
      }
      case 'road': {
        g.lineCap = 'round'; g.lineJoin = 'round';
        if (f.pass === 0) { const e = EDGE[f.kind]; tracePl(g, f.pl, f.closed); g.strokeStyle = e[0]; g.lineWidth = f.w + e[1]; g.stroke(); }
        else if (f.pass === 1) { tracePl(g, f.pl, f.closed); g.strokeStyle = texPattern(MINFO[f.mat].tex, 0); g.lineWidth = f.w; g.stroke(); }
        else {
          if (f.kind === 'asphalt' && f.w >= 24) { tracePl(g, f.pl, f.closed); g.setLineDash([16, 18]); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.8; g.lineCap = 'butt'; g.stroke(); g.setLineDash([]); }
          else if (f.kind === 'highway') {
            g.lineCap = 'butt';
            for (const s of [-1, 1]) { tracePl(g, offsetPolyline(f.pl, s * (f.w / 2 - 6)), false); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 2; g.stroke(); }
            for (const s of [-1, 1]) { tracePl(g, offsetPolyline(f.pl, s * 2.5), false); g.strokeStyle = 'rgba(240,200,40,.85)'; g.lineWidth = 1.8; g.stroke(); }
            for (const s of [-1, 1]) { tracePl(g, offsetPolyline(f.pl, s * f.w / 4), false); g.setLineDash([18, 22]); g.strokeStyle = 'rgba(255,255,255,.65)'; g.lineWidth = 1.6; g.stroke(); g.setLineDash([]); }
          } else if (f.kind === 'dirt' || f.kind === 'track') {
            for (const s of [-1, 1]) { tracePl(g, offsetPolyline(f.pl, s * f.w * .22), false); g.strokeStyle = 'rgba(70,50,30,.32)'; g.lineWidth = 3; g.stroke(); }
            tracePl(g, f.pl, false); g.strokeStyle = 'rgba(150,140,80,.35)'; g.lineWidth = 2; g.stroke();
          }
        }
        break;
      }
      case 'disk': {
        g.beginPath(); g.arc(f.x, f.y, f.r + (f.pass === 0 ? 6 : 0), 0, TAU);
        if (f.pass === 0) { g.fillStyle = f.mat === M.ROAD ? '#a9a395' : 'rgba(110,100,80,.55)'; g.fill(); }
        else { g.fillStyle = texPattern(MINFO[f.mat].tex, 0); g.fill(); if (f.mat === M.ROAD) { g.beginPath(); g.arc(f.x, f.y, f.r * .38, 0, TAU); g.fillStyle = texPattern('grass', 0); g.fill(); g.strokeStyle = '#bbb'; g.lineWidth = 2; g.stroke(); } }
        break;
      }
      case 'deco': f.draw(g); break;
      case 'bridge': {
        g.lineCap = 'butt';
        for (const s of [-1, 1]) {
          const pl = offsetPolyline(f.pl, s * (f.w / 2 + 3));
          tracePl(g, offsetPolyline(f.pl, s * (f.w / 2 + 9)), false); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 8; g.stroke();
          tracePl(g, pl, false); g.strokeStyle = '#8d8d8d'; g.lineWidth = 5; g.stroke();
          tracePl(g, pl, false); g.strokeStyle = '#cfcfcf'; g.lineWidth = 2; g.stroke();
          for (const p of pl) { g.fillStyle = '#6d6d6d'; g.fillRect(p[0] - 2, p[1] - 2, 4, 4); }
        }
        break;
      }
    }
  }
  function drawDecal(g, d) {
    switch (d.k) {
      case 'skid': g.strokeStyle = 'rgba(20,20,20,.22)'; g.lineWidth = d.w || 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(d.x, d.y); g.lineTo(d.x2, d.y2); g.stroke(); break;
      case 'mud': g.save(); g.translate(d.x, d.y); g.rotate(d.a || 0); g.globalAlpha = .85; g.fillStyle = texPattern('mud', 0); g.fillRect(-d.w / 2, -d.h / 2, d.w, d.h); g.fillStyle = 'rgba(30,20,10,.25)'; for (let i = -d.w / 2; i < d.w / 2; i += 4) g.fillRect(i, -d.h / 2, 1.5, d.h); g.restore(); g.globalAlpha = 1; break;
      case 'crop': g.fillStyle = texPattern(d.tex || 'stubble', d.ang || 0); g.fillRect(d.x - 4.5, d.y - 4.5, 9, 9); break;
      case 'tread': g.save(); g.translate(d.x, d.y); g.rotate(d.a); g.fillStyle = 'rgba(60,40,20,.35)'; for (let i = -d.w / 2; i < d.w / 2; i += 3) g.fillRect(-2, i, 4, 1.5); g.restore(); break;
      case 'splat': g.fillStyle = d.col || 'rgba(200,40,30,.6)'; g.beginPath(); g.arc(d.x, d.y, d.r, 0, TAU); g.fill(); for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(d.x + Math.cos(i * 1.3) * d.r * 1.3, d.y + Math.sin(i * 2.1) * d.r * 1.3, d.r * .3, 0, TAU); g.fill(); } break;
      case 'powder': g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(d.x, d.y, d.r, 0, TAU); g.fill(); break;
    }
  }
  function bake(cx, cy) {
    const cv = mkCanvas(CS * GS, CS * GS), g = cv.getContext('2d');
    g.setTransform(GS, 0, 0, GS, -cx * CS * GS, -cy * CS * GS);
    g.fillStyle = texPattern('dry', 0); g.fillRect(cx * CS, cy * CS, CS, CS);
    const fs = chunkFeat.get(key(cx, cy));
    if (fs) for (const f of fs) drawFeature(g, f);
    const ds = decals.get(key(cx, cy)); if (ds) for (const d of ds) drawDecal(g, d);
    const c = { cv, g, used: frame }; cache.set(key(cx, cy), c);
    if (cache.size > MAXC) { let old = null, ok = 0; for (const [k, v] of cache) if (!old || v.used < old.used) { old = v; ok = k; } cache.delete(ok); }
    return c;
  }
  function addDecal(d, r) {
    r = r || 12;
    for (let cx = Math.floor((Math.min(d.x, d.x2 ?? d.x) - r) / CS); cx <= Math.floor((Math.max(d.x, d.x2 ?? d.x) + r) / CS); cx++)
      for (let cy = Math.floor((Math.min(d.y, d.y2 ?? d.y) - r) / CS); cy <= Math.floor((Math.max(d.y, d.y2 ?? d.y) + r) / CS); cy++) {
        const k = key(cx, cy); let a = decals.get(k); if (!a) { a = []; decals.set(k, a); }
        a.push(d); if (a.length > 900) a.splice(0, 100);
        const c = cache.get(k); if (c) { c.g.save(); drawDecal(c.g, d); c.g.restore(); c.mips = null; }
      }
  }
  // canvas drawImage has no mipmaps: shrinking the fine crop rows a lot (plane altitude, small screens)
  // makes them crawl and moiré. Keep box-filtered half/quarter copies and draw the one closest to 1:1.
  function mip(c, lv) {
    if (!c.mips) c.mips = [c.cv];
    for (let i = c.mips.length; i <= lv; i++) {
      const src = c.mips[i - 1], n = src.width >> 1, cv = mkCanvas(n, n), g = cv.getContext('2d');
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, n, n); c.mips.push(cv);
    }
    return c.mips[lv];
  }
  function draw(g, x0, y0, x1, y1, budget, scale) {
    frame++;
    let baked = 0;
    const tx = (scale || GS) / GS, lv = tx < .3 ? 2 : tx < .6 ? 1 : 0; // device pixels per baked texel
    for (let cx = Math.floor(x0 / CS); cx <= Math.floor(x1 / CS); cx++) for (let cy = Math.floor(y0 / CS); cy <= Math.floor(y1 / CS); cy++) {
      if (cx < 0 || cy < 0 || cx * CS >= WORLD_W || cy * CS >= WORLD_H) continue;
      let c = cache.get(key(cx, cy));
      if (!c) { if (baked < budget) { c = bake(cx, cy); baked++; } else { g.fillStyle = '#a49a63'; g.fillRect(cx * CS, cy * CS, CS, CS); continue; } }
      c.used = frame;
      g.drawImage(lv ? mip(c, lv) : c.cv, cx * CS, cy * CS, CS + .5, CS + .5);
    }
  }
  function prebake(x, y, r) { for (let cx = Math.floor((x - r) / CS); cx <= Math.floor((x + r) / CS); cx++) for (let cy = Math.floor((y - r) / CS); cy <= Math.floor((y + r) / CS); cy++) if (cx >= 0 && cy >= 0 && !cache.has(key(cx, cy))) bake(cx, cy); }

  /* minimap image: 1px = 8 world units */
  let mini = null;
  function buildMini() {
    const S = 1 / 8; mini = mkCanvas(WORLD_W * S, WORLD_H * S); const g = mini.getContext('2d');
    g.scale(S, S); g.fillStyle = MINFO[M.DRY].col; g.fillRect(0, 0, WORLD_W, WORLD_H);
    const sorted = features.slice().sort((a, b) => a.layer - b.layer || a.order - b.order);
    for (const f of sorted) {
      if (f.type === 'poly' || (f.type === 'deco' && f.poly)) { tracePl(g, f.poly, true); g.fillStyle = MINFO[f.mat].col; g.globalAlpha = f.soft ? .5 : 1; g.fill(); g.globalAlpha = 1; }
      else if (f.type === 'road' && f.pass === 1) { tracePl(g, f.pl, f.closed); g.strokeStyle = f.kind === 'path' ? '#e8e2d0' : f.kind === 'dirt' || f.kind === 'track' ? '#b8956a' : '#3a3c40'; g.lineWidth = Math.max(f.w, f.kind === 'path' ? 18 : 22); g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); }
      else if (f.type === 'disk' && f.pass === 1) { g.beginPath(); g.arc(f.x, f.y, f.r, 0, TAU); g.fillStyle = '#3a3c40'; g.fill(); }
    }
    for (const b of buildings) {
      g.fillStyle = b.roofOnly ? '#cfcfcf' : b.kind === 'house' ? '#c97a5a' : '#d9d2c2';
      if (b.shape === 'circle') { g.beginPath(); g.arc(b.x, b.y, b.r, 0, TAU); g.fill(); }
      else { tracePl(g, b.poly, true); g.fill(); }
    }
    for (const p of props) if (p.h > 25) { g.fillStyle = '#4f7a3a'; g.beginPath(); g.arc(p.x, p.y, 14, 0, TAU); g.fill(); }
  }
  return { init, draw, addDecal, prebake, buildMini, get mini() { return mini; }, CS };
})();
