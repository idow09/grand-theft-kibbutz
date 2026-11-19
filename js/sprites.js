'use strict';
/* ================================================================
   sprites.js — procedural, supersampled sprite art:
   vehicles, people & animals (animated sheets), trees, props,
   roofs, HUD icons. Everything cached on first use.
   ================================================================ */
const SPR = (() => {
  const SS = 3;
  const cache = new Map();
  const memo = (k, fn) => { let v = cache.get(k); if (!v) { v = fn(); cache.set(k, v); } return v; };
  // canvas centred on origin; w,h in world units
  function C(w, h, fn, ss) {
    ss = ss || SS; const cv = mkCanvas(w * ss, h * ss), g = cv.getContext('2d');
    g.scale(ss, ss); g.translate(w / 2, h / 2); g.lineJoin = 'round'; g.lineCap = 'round'; fn(g);
    return { cv, w, h };
  }
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
  const circ = (g, x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, TAU); };
  const ell = (g, x, y, rx, ry, a) => { g.beginPath(); g.ellipse(x, y, rx, ry, a || 0, 0, TAU); };
  function bodyGrad(g, col, h) {
    const gr = g.createLinearGradient(0, -h / 2, 0, h / 2);
    gr.addColorStop(0, shade(col, -.38)); gr.addColorStop(.16, shade(col, .1)); gr.addColorStop(.42, shade(col, .3)); gr.addColorStop(.78, col); gr.addColorStop(1, shade(col, -.5));
    return gr;
  }
  function glassGrad(g, x0, x1) { const gr = g.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, '#1d2a35'); gr.addColorStop(.6, '#3b5568'); gr.addColorStop(1, '#6f8ea3'); return gr; }
  const outline = (g, a) => { g.strokeStyle = `rgba(0,0,0,${a || .55})`; g.lineWidth = .7; g.stroke(); };
  function wheel(g, x, y, w, h, tread) {
    g.fillStyle = '#161616'; rr(g, x - w / 2, y - h / 2, w, h, Math.min(w, h) * .35); g.fill();
    if (tread) { g.fillStyle = '#3a3a3a'; for (let i = -w / 2 + 1.5; i < w / 2; i += 2.6) g.fillRect(x + i, y - h / 2 + .6, 1.2, h - 1.2); }
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x - w / 2 + 1, y - h / 2 + .5, w - 2, 1);
  }
  const lights = (g, L, W, inset) => { inset = inset || 2; g.fillStyle = '#fffbe0'; rr(g, L / 2 - 3, -W / 2 + inset, 2.6, 4, 1); g.fill(); rr(g, L / 2 - 3, W / 2 - inset - 4, 2.6, 4, 1); g.fill(); g.fillStyle = '#c62f28'; g.fillRect(-L / 2 + .4, -W / 2 + inset, 1.8, 3.6); g.fillRect(-L / 2 + .4, W / 2 - inset - 3.6, 1.8, 3.6); };

  /* ---------------- vehicles ---------------- */
  const VDRAW = {
    car(g, c, L, W) {
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) wheel(g, sx * (L / 2 - 11), sy * (W / 2 - 2), 10, 5);
      rr(g, -L / 2, -W / 2 + 1, L, W - 2, 7); g.fillStyle = bodyGrad(g, c, W); g.fill(); outline(g);
      g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = .6; g.beginPath(); g.moveTo(L * .28, -W / 2 + 6); g.lineTo(L / 2 - 3, -W / 2 + 7); g.moveTo(L * .28, W / 2 - 6); g.lineTo(L / 2 - 3, W / 2 - 7); g.stroke();
      g.beginPath(); g.moveTo(L * .3, -W / 2 + 3); g.lineTo(L * .13, -W / 2 + 4); g.lineTo(L * .13, W / 2 - 4); g.lineTo(L * .3, W / 2 - 3); g.closePath(); g.fillStyle = glassGrad(g, L * .13, L * .3); g.fill();
      rr(g, -L * .23, -W / 2 + 4, L * .36, W - 8, 3); g.fillStyle = shade(c, .12); g.fill(); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(-L * .2, -W / 2 + 5, L * .3, 2.5);
      g.beginPath(); g.moveTo(-L * .23, -W / 2 + 4); g.lineTo(-L * .35, -W / 2 + 4.5); g.lineTo(-L * .35, W / 2 - 4.5); g.lineTo(-L * .23, W / 2 - 4); g.closePath(); g.fillStyle = glassGrad(g, -L * .23, -L * .35); g.fill();
      g.fillStyle = '#2a3a46'; g.fillRect(-L * .22, -W / 2 + 2.2, L * .34, 1.6); g.fillRect(-L * .22, W / 2 - 3.8, L * .34, 1.6);
      g.fillStyle = shade(c, -.3); g.fillRect(L * .12, -W / 2 - .5, 2, 1.6); g.fillRect(L * .12, W / 2 - 1.1, 2, 1.6);
      lights(g, L, W, 3);
    },
    van(g, c, L, W) {
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) wheel(g, sx * (L / 2 - 11), sy * (W / 2 - 2), 11, 5);
      rr(g, -L / 2, -W / 2 + 1, L, W - 2, 5); g.fillStyle = bodyGrad(g, c, W); g.fill(); outline(g);
      g.beginPath(); g.moveTo(L / 2 - 6, -W / 2 + 3); g.lineTo(L / 2 - 14, -W / 2 + 3.5); g.lineTo(L / 2 - 14, W / 2 - 3.5); g.lineTo(L / 2 - 6, W / 2 - 3); g.closePath(); g.fillStyle = glassGrad(g, L / 2 - 14, L / 2 - 6); g.fill();
      rr(g, -L / 2 + 3, -W / 2 + 3.5, L - 18, W - 7, 2); g.fillStyle = shade(c, .16); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = .6; for (let x = -L / 2 + 10; x < L / 2 - 16; x += 8) { g.beginPath(); g.moveTo(x, -W / 2 + 4); g.lineTo(x, W / 2 - 4); g.stroke(); }
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(-L / 2 + .2, -.4, 2, .8);
      lights(g, L, W, 3);
    },
    pickup(g, c, L, W) {
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) wheel(g, sx * (L / 2 - 12), sy * (W / 2 - 2), 11, 5.5);
      rr(g, -L / 2, -W / 2 + 1, L, W - 2, 5); g.fillStyle = bodyGrad(g, c, W); g.fill(); outline(g);
      rr(g, -L / 2 + 2.5, -W / 2 + 3.5, L * .48, W - 7, 1.5); g.fillStyle = shade(c, -.45); g.fill();
      g.strokeStyle = shade(c, -.25); g.lineWidth = 1; for (let x = -L / 2 + 7; x < -L / 2 + L * .48; x += 5) { g.beginPath(); g.moveTo(x, -W / 2 + 4); g.lineTo(x, W / 2 - 4); g.stroke(); }
      g.beginPath(); g.moveTo(L * .22, -W / 2 + 3); g.lineTo(L * .08, -W / 2 + 4); g.lineTo(L * .08, W / 2 - 4); g.lineTo(L * .22, W / 2 - 3); g.closePath(); g.fillStyle = glassGrad(g, L * .08, L * .22); g.fill();
      rr(g, -L * .03, -W / 2 + 4, L * .12, W - 8, 2); g.fillStyle = shade(c, .15); g.fill();
      g.fillStyle = glassGrad(g, 0, -4); g.fillRect(-L * .045, -W / 2 + 4.5, 2.4, W - 9);
      lights(g, L, W, 3);
    },
    milktruck(g, c, L, W) {
      for (const x of [L / 2 - 14, -L / 2 + 14, -L / 2 + 26]) for (const sy of [-1, 1]) wheel(g, x, sy * (W / 2 - 2), 11, 6, 1);
      rr(g, L / 2 - 24, -W / 2 + 1, 24, W - 2, 4); g.fillStyle = bodyGrad(g, '#f2f2f2', W); g.fill(); outline(g);
      g.fillStyle = glassGrad(g, L / 2 - 10, L / 2 - 3); g.fillRect(L / 2 - 9, -W / 2 + 4, 5, W - 8);
      g.fillStyle = '#2a63b0'; g.fillRect(L / 2 - 23, -W / 2 + 2, 3, W - 4);
      const gr = g.createLinearGradient(0, -W / 2, 0, W / 2); gr.addColorStop(0, '#7d858c'); gr.addColorStop(.25, '#e9eef2'); gr.addColorStop(.45, '#ffffff'); gr.addColorStop(.75, '#b9c1c8'); gr.addColorStop(1, '#5e666d');
      rr(g, -L / 2 + 1, -W / 2 + 2, L - 27, W - 4, W / 2 - 3); g.fillStyle = gr; g.fill(); outline(g, .4);
      g.strokeStyle = 'rgba(80,90,100,.5)'; g.lineWidth = .8; for (let x = -L / 2 + 14; x < L / 2 - 28; x += 16) { g.beginPath(); g.moveTo(x, -W / 2 + 3); g.lineTo(x, W / 2 - 3); g.stroke(); }
      for (const x of [-20, 6]) { circ(g, x, 0, 3.4); g.fillStyle = '#9aa3aa'; g.fill(); outline(g, .4); }
      g.save(); g.scale(1, 1); g.fillStyle = '#2a63b0'; g.font = 'bold 9px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('חלב', -6, W / 2 - 6.5); g.restore();
      lights(g, L, W, 3);
    },
    forklift(g, c, L, W) {
      g.fillStyle = '#888'; g.fillRect(L / 2 - 4, -W / 2 + 3, 3, W - 6); g.fillStyle = '#6a6a6a'; g.fillRect(L / 2 - 2, -W / 2 + 5, 13, 2.2); g.fillRect(L / 2 - 2, W / 2 - 7.2, 13, 2.2);
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) wheel(g, sx * (L / 2 - 8), sy * (W / 2 - 2), 8, 5);
      rr(g, -L / 2, -W / 2 + 1.5, L - 4, W - 3, 4); g.fillStyle = bodyGrad(g, c, W); g.fill(); outline(g);
      rr(g, -L / 2, -W / 2 + 1.5, 9, W - 3, 4); g.fillStyle = shade(c, -.3); g.fill();
      g.strokeStyle = '#2b2b2b'; g.lineWidth = 1.4; rr(g, -L / 2 + 8, -W / 2 + 3, L - 18, W - 6, 1); g.stroke();
      g.beginPath(); g.moveTo(-L / 2 + 8, 0); g.lineTo(L / 2 - 10, 0); g.moveTo(0, -W / 2 + 3); g.lineTo(0, W / 2 - 3); g.stroke();
      g.fillStyle = '#ff8a1a'; circ(g, -L / 2 + 10, 0, 1.6); g.fill();
    },
    tractor(g, c, L, W) {
      for (const sy of [-1, 1]) { wheel(g, -12, sy * (W / 2 - 6), 24, 12, 1); wheel(g, 20, sy * (W / 2 - 7), 13, 7, 1); }
      for (const sy of [-1, 1]) { g.beginPath(); g.ellipse(-12, sy * (W / 2 - 6), 13, 7, 0, sy > 0 ? 0 : Math.PI, sy > 0 ? Math.PI : TAU); g.fillStyle = shade(c, -.15); g.fill(); }
      rr(g, -6, -8, 36, 16, 4); g.fillStyle = bodyGrad(g, c, 16); g.fill(); outline(g);
      g.fillStyle = 'rgba(0,0,0,.35)'; for (let x = 4; x < 26; x += 3.2) g.fillRect(x, -7, 1.2, 2.2), g.fillRect(x, 4.8, 1.2, 2.2);
      g.fillStyle = '#ffd23f'; g.fillRect(27, -7, 3, 14); g.fillStyle = '#333'; g.fillRect(30, -5, 2, 10);
      circ(g, 14, -4.5, 2.2); g.fillStyle = '#222'; g.fill(); circ(g, 14, -4.5, 1.2); g.fillStyle = '#555'; g.fill();
      rr(g, -26, -13, 22, 26, 3); g.fillStyle = shade(c, -.2); g.fill();
      const gr = g.createLinearGradient(-26, -13, -4, 13); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#c8ccd0');
      rr(g, -27, -14, 24, 28, 4); g.fillStyle = gr; g.fill(); outline(g, .5);
      g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(-27, 6, 24, 8);
      g.fillStyle = '#ff8a1a'; circ(g, -24, -11, 1.5); g.fill();
    },
    combine(g, c, L, W) {
      for (const sy of [-1, 1]) { wheel(g, 18, sy * (W / 2 - 16), 26, 14, 1); wheel(g, -40, sy * (W / 2 - 18), 14, 8, 1); }
      rr(g, 40, -W / 2, 15, W, 2); g.fillStyle = '#e0b52a'; g.fill(); outline(g);
      g.strokeStyle = '#b9541c'; g.lineWidth = 1.6; for (let y = -W / 2 + 3; y < W / 2; y += 5) { g.beginPath(); g.moveTo(42, y); g.lineTo(53, y + 2); g.stroke(); }
      g.fillStyle = '#9a9a9a'; for (let y = -W / 2 + 2; y < W / 2; y += 4) g.fillRect(55, y, 3, 1.2);
      rr(g, -54, -21, 96, 42, 6); g.fillStyle = bodyGrad(g, c, 42); g.fill(); outline(g);
      rr(g, -30, -17, 42, 30, 3); g.fillStyle = shade(c, .2); g.fill(); rr(g, -26, -13, 34, 22, 2); g.fillStyle = '#d6b55a'; g.fill();
      g.fillStyle = 'rgba(120,80,20,.4)'; for (let i = 0; i < 40; i++) g.fillRect(-26 + (i * 7.3) % 34, -13 + (i * 5.1) % 22, 1.2, 1.2);
      rr(g, 20, -12, 18, 24, 3); g.fillStyle = glassGrad(g, 20, 38); g.fill(); rr(g, 22, -10, 13, 20, 2); g.fillStyle = '#f2f2f2'; g.fill();
      g.fillStyle = '#9aa0a5'; rr(g, -20, -W / 2 + 4, 60, 4, 2); g.fill(); outline(g, .4);
      g.fillStyle = '#ff8a1a'; circ(g, 33, -14, 1.8); g.fill(); circ(g, 33, 14, 1.8); g.fill();
    },
    kalnoit(g, c, L, W) {
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) wheel(g, sx * (L / 2 - 6), sy * (W / 2 - 2), 7, 4);
      rr(g, -L / 2 + 1, -W / 2 + 2, L - 2, W - 4, 6); g.fillStyle = bodyGrad(g, c, W); g.fill(); outline(g);
      rr(g, -L / 2 + 3, -6.5, 13, 13, 3); g.fillStyle = '#2e2e2e'; g.fill(); rr(g, -L / 2 + 2, -6.5, 4, 13, 2); g.fillStyle = '#1f1f1f'; g.fill();
      g.strokeStyle = '#555'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(L / 2 - 9, 0); g.lineTo(L / 2 - 4, 0); g.stroke(); g.beginPath(); g.moveTo(L / 2 - 6, -5); g.lineTo(L / 2 - 6, 5); g.stroke();
      rr(g, L / 2 - 4, -5, 6, 10, 1); g.fillStyle = 'rgba(200,200,200,.4)'; g.fill(); g.strokeStyle = '#999'; g.lineWidth = .5; for (let y = -4; y < 5; y += 2) { g.beginPath(); g.moveTo(L / 2 - 4, y); g.lineTo(L / 2 + 2, y); g.stroke(); }
      g.fillStyle = '#fffbe0'; circ(g, L / 2 - 1, 0, 1.4); g.fill();
      g.strokeStyle = '#ccc'; g.lineWidth = .6; g.beginPath(); g.moveTo(-L / 2 + 2, 5); g.lineTo(-L / 2 - 3, 7); g.stroke();
      g.fillStyle = '#ff7a1a'; g.beginPath(); g.moveTo(-L / 2 - 3, 7); g.lineTo(-L / 2 - 9, 6); g.lineTo(-L / 2 - 4, 9.5); g.closePath(); g.fill();
    },
    atv(g, c, L, W) {
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) wheel(g, sx * (L / 2 - 6), sy * (W / 2 - 3.5), 10, 7, 1);
      rr(g, -L / 2 + 4, -W / 2 + 4, L - 8, W - 8, 5); g.fillStyle = bodyGrad(g, c, W - 8); g.fill(); outline(g);
      for (const sx of [-1, 1]) { rr(g, sx * (L / 2 - 6) - 7, -W / 2 + 1, 14, W - 2, 5); g.fillStyle = shade(c, sx > 0 ? .1 : -.1); g.fill(); outline(g, .4); }
      rr(g, -7, -4, 12, 8, 3); g.fillStyle = '#1e1e1e'; g.fill();
      g.strokeStyle = '#333'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(8, -8); g.lineTo(8, 8); g.stroke();
      g.fillStyle = '#fffbe0'; g.fillRect(L / 2 - 3, -4, 2, 2.5); g.fillRect(L / 2 - 3, 1.5, 2, 2.5);
    },
    cart(g, c, L, W) {
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) wheel(g, sx * (L / 2 - 8), sy * (W / 2 - 2), 8, 4.5);
      rr(g, -L / 2, -W / 2 + 1.5, L, W - 3, 6); g.fillStyle = bodyGrad(g, c, W); g.fill(); outline(g);
      rr(g, -L / 2 + 1, -7, 9, 14, 1.5); g.fillStyle = '#8a6a3a'; g.fill(); g.strokeStyle = '#6a4a22'; g.lineWidth = .6; g.strokeRect(-L / 2 + 1, -7, 9, 14);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-L / 2 + 10, -W / 2 + 2, 3, W - 4);
      rr(g, -L / 2 + 10, -W / 2 + .5, 27, W - 1, 3); const gr = g.createLinearGradient(0, -W / 2, 0, W / 2); gr.addColorStop(0, '#d8d8d8'); gr.addColorStop(.4, '#ffffff'); gr.addColorStop(1, '#b8b8b8'); g.fillStyle = gr; g.fill(); outline(g, .45);
      g.fillStyle = 'rgba(150,200,230,.6)'; g.fillRect(L / 2 - 7, -W / 2 + 3, 2.5, W - 6);
      g.fillStyle = '#fffbe0'; g.fillRect(L / 2 - 2, -W / 2 + 3, 1.6, 3); g.fillRect(L / 2 - 2, W / 2 - 6, 1.6, 3);
    },
    scooter(g, c, L, W) {
      wheel(g, L / 2 - 5, 0, 8, 3); wheel(g, -L / 2 + 5, 0, 8, 3.4);
      rr(g, -L / 2 + 2, -W / 2 + 1, L - 8, W - 2, 4); g.fillStyle = bodyGrad(g, c, W); g.fill(); outline(g);
      rr(g, -L / 2 + 3, -3, 11, 6, 2.5); g.fillStyle = '#222'; g.fill();
      g.strokeStyle = '#bbb'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(L / 2 - 8, -W / 2 - 1); g.lineTo(L / 2 - 8, W / 2 + 1); g.stroke();
      rr(g, L / 2 - 10, -3.5, 4, 7, 2); g.fillStyle = shade(c, .25); g.fill();
      g.fillStyle = '#fffbe0'; circ(g, L / 2 - 4.5, 0, 1.3); g.fill(); g.fillStyle = '#c62f28'; g.fillRect(-L / 2 + 1.5, -1, 1.2, 2);
    },
    bike(g, c, L, W) {
      g.fillStyle = '#191919'; rr(g, L / 2 - 10, -1, 10, 2, 1); g.fill(); rr(g, -L / 2, -1, 10, 2, 1); g.fill();
      g.strokeStyle = c; g.lineWidth = 1.8; g.beginPath(); g.moveTo(-L / 2 + 5, 0); g.lineTo(L / 2 - 6, 0); g.stroke();
      g.strokeStyle = '#aaa'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(L / 2 - 6, -W / 2 + .5); g.lineTo(L / 2 - 6, W / 2 - .5); g.stroke();
      g.fillStyle = '#222'; rr(g, -4, -1.6, 5, 3.2, 1.2); g.fill();
      g.fillStyle = '#999'; g.fillRect(-L / 2 + 2, -1.8, 6, 3.6);
    },
  };
  const VSIZE = { bike: [26, 9], scooter: [30, 11], kalnoit: [34, 20], atv: [34, 22], cart: [42, 24], car: [52, 26], van: [60, 28], pickup: [60, 28], milktruck: [92, 32], forklift: [36, 22], tractor: [62, 36], combine: [110, 70] };
  const VKIND = { car: 'car', van: 'van', pickup: 'pickup', milktruck: 'milktruck', forklift: 'forklift', tractor: 'tractor', combine: 'combine', kalnoit: 'kalnoit', atv: 'atv', cart: 'cart', scooter: 'scooter', bike: 'bike' };
  function vehicle(type, col, wrecked) {
    return memo('v' + type + col + (wrecked ? 'x' : ''), () => {
      const [L, W] = VSIZE[type];
      const s = C(L + 26, W + 22, g => VDRAW[VKIND[type]](g, col, L, W));
      if (wrecked) { const g = s.cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(25,22,20,.62)'; g.fillRect(0, 0, s.cv.width, s.cv.height); const r = RNG(type.length * 7 + col.length); for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(0,0,0,${.2 + r() * .3})`; g.beginPath(); g.arc(r() * s.cv.width, r() * s.cv.height, 6 + r() * 18, 0, TAU); g.fill(); } }
      return s;
    });
  }

  /* ---------------- people ---------------- */
  // look: {shirt,pants,skin,hair,hs(hairstyle),hat,extra,age:'adult'|'kid'|'teen'|'elder', shoes}
  function drawPerson(g, L, f) {
    // f: {phase, mode:'walk'|'idle'|'punch'|'sit'|'ko'|'swim'|'throw'}
    const elder = L.age === 'elder', st = Math.sin(f.phase || 0), mode = f.mode || 'walk';
    if (mode === 'ko') {
      g.fillStyle = L.pants; rr(g, -13, -3.4, 8, 3, 1.5); g.fill(); rr(g, -13, .6, 8, 3, 1.5); g.fill();
      g.fillStyle = L.shoes; circ(g, -13.5, -1.9, 1.6); g.fill(); circ(g, -13.5, 2.1, 1.6); g.fill();
      ell(g, -1, 0, 7, 4.8); g.fillStyle = L.shirt; g.fill(); outline(g, .35);
      g.fillStyle = L.skin; circ(g, -3, -8, 1.8); g.fill(); circ(g, 2, 8, 1.8); g.fill();
      g.strokeStyle = L.shirt; g.lineWidth = 2.4; g.beginPath(); g.moveTo(-1, -4); g.lineTo(-3, -7.5); g.moveTo(1, 4); g.lineTo(2, 7.5); g.stroke();
      circ(g, 8.5, 0, 3.7); g.fillStyle = L.skin; g.fill(); outline(g, .3); hair(g, L, 8.5, 0, true);
      return;
    }
    if (mode === 'swim') { ell(g, 0, 0, 7, 6); g.fillStyle = 'rgba(255,255,255,.35)'; g.fill(); circ(g, .5, 0, 3.6); g.fillStyle = L.skin; g.fill(); hair(g, L, .5, 0); return; }
    const lean = elder ? 1 : 0;
    if (mode !== 'sit') {
      const sx = mode === 'walk' ? st * 4.2 : 0;
      g.fillStyle = L.pants; rr(g, -2 + sx * .5, -4, 4 + Math.abs(sx) * .2, 3, 1.4); g.fill(); rr(g, -2 - sx * .5, 1, 4 + Math.abs(sx) * .2, 3, 1.4); g.fill();
      g.fillStyle = L.shoes; ell(g, 2.4 + sx, -2.5, 2.3, 1.5); g.fill(); ell(g, 2.4 - sx, 2.5, 2.3, 1.5); g.fill();
    }
    if (L.extra === 'backpack') { rr(g, -6.5, -4, 4, 8, 1.5); g.fillStyle = '#c0392b'; g.fill(); outline(g, .4); }
    // arms
    const as = mode === 'walk' ? -st * 3 : 0;
    let lh = [1.5 + as, -6.8], rh = [1.5 - as, 6.8];
    if (mode === 'punch') rh = [10, 3.5];
    if (mode === 'throw') rh = [-5, 7.5];
    if (mode === 'sit') { lh = [7, -4]; rh = [7, 4]; }
    if (L.extra === 'cane' && mode === 'walk') rh = [4, 7.2];
    g.strokeStyle = L.shirt; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -5); g.lineTo(lh[0] * .6, lh[1] * .95); g.moveTo(0, 5); g.lineTo(rh[0] * .6, rh[1] * .95); g.stroke();
    g.fillStyle = L.skin; circ(g, lh[0], lh[1], 1.6); g.fill(); circ(g, rh[0], rh[1], 1.6); g.fill();
    if (L.extra === 'cane') { g.strokeStyle = '#6b4a2a'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(rh[0], rh[1]); g.lineTo(rh[0] + 6, rh[1] + .5); g.stroke(); }
    if (L.extra === 'phone') { g.fillStyle = '#9fe7ff'; g.fillRect(lh[0] + .5, lh[1] - 1, 2.2, 1.8); }
    if (L.extra === 'bag') { rr(g, -2, 6.5, 6, 3.5, 1); g.fillStyle = '#7a4b24'; g.fill(); }
    // torso
    const gr = g.createLinearGradient(-4, -7, 3, 7); gr.addColorStop(0, shade(L.shirt, .22)); gr.addColorStop(1, shade(L.shirt, -.28));
    ell(g, lean * .6, 0, 3.8, 6.8); g.fillStyle = gr; g.fill(); outline(g, .35);
    if (L.extra === 'apron') { ell(g, 1.5 + lean, 0, 2.2, 5); g.fillStyle = '#f4f4f4'; g.fill(); }
    // head
    const hx = .8 + lean * 1.4;
    circ(g, hx, 0, 3.7); g.fillStyle = L.skin; g.fill(); outline(g, .3);
    hair(g, L, hx, 0);
  }
  function hair(g, L, hx, hy, lying) {
    const hc = L.hair;
    switch (L.hat) {
      case 'tembel': circ(g, hx - .2, hy, 5.4); g.fillStyle = '#e6dcb4'; g.fill(); outline(g, .3); circ(g, hx - .2, hy, 3.4); g.fillStyle = '#d4c896'; g.fill(); return;
      case 'cap': ell(g, hx + 3, hy, 2.6, 2.8); g.fillStyle = shade(L.capCol || '#2a6ab8', -.2); g.fill(); circ(g, hx - .3, hy, 3.9); g.fillStyle = L.capCol || '#2a6ab8'; g.fill(); outline(g, .3); return;
      case 'sunhat': circ(g, hx - .2, hy, 6.4); g.fillStyle = '#e8cf8a'; g.fill(); outline(g, .25); circ(g, hx - .2, hy, 3.6); g.fillStyle = '#d9b968'; g.fill(); g.strokeStyle = '#b5524a'; g.lineWidth = .9; circ(g, hx - .2, hy, 3.8); g.stroke(); return;
      case 'scarf': circ(g, hx - .3, hy, 4); g.fillStyle = L.scarfCol || '#8e44ad'; g.fill(); outline(g, .3); circ(g, hx - 3.6, hy, 1.3); g.fill(); return;
      case 'helmet': circ(g, hx - .2, hy, 4.2); g.fillStyle = '#ffd23f'; g.fill(); outline(g, .4); g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(hx - 2, hy - 2.5, 2, 1.2); return;
    }
    g.fillStyle = hc;
    switch (L.hs) {
      case 'bald': g.beginPath(); g.arc(hx, hy, 3.8, Math.PI * .6, Math.PI * .9); g.arc(hx, hy, 2.6, Math.PI * .9, Math.PI * .6, true); g.fill(); g.beginPath(); g.arc(hx, hy, 3.8, Math.PI * 1.1, Math.PI * 1.4); g.arc(hx, hy, 2.6, Math.PI * 1.4, Math.PI * 1.1, true); g.fill(); break;
      case 'long': ell(g, hx - 2.2, hy, 3.6, 4.4); g.fill(); g.beginPath(); g.arc(hx, hy, 3.8, Math.PI * .45, Math.PI * 1.55); g.fill(); break;
      case 'bun': g.beginPath(); g.arc(hx, hy, 3.9, Math.PI * .45, Math.PI * 1.55); g.fill(); circ(g, hx - 4.2, hy, 1.9); g.fill(); break;
      case 'curly': for (let i = 0; i < 9; i++) { const a = Math.PI * .4 + i / 8 * Math.PI * 1.2; circ(g, hx + Math.cos(a) * 3, hy + Math.sin(a) * 3, 1.7); g.fill(); } break;
      default: g.beginPath(); g.arc(hx, hy, 3.95, Math.PI * .5, Math.PI * 1.5); g.arc(hx + .8, hy, 2.4, Math.PI * 1.5, Math.PI * .5, true); g.fill();
    }
  }
  const PFRAMES = 8;
  function personSheet(L) {
    return memo('p' + JSON.stringify(L), () => {
      const S = 34, sc = L.age === 'kid' ? .72 : L.age === 'teen' ? .9 : 1;
      const mk = f => C(S, S, g => { g.scale(sc, sc); drawPerson(g, L, f); }).cv;
      const walk = []; for (let i = 0; i < PFRAMES; i++) walk.push(mk({ phase: i / PFRAMES * TAU, mode: 'walk' }));
      return { S, walk, idle: mk({ mode: 'idle' }), punch: mk({ mode: 'punch' }), throw: mk({ mode: 'throw' }), sit: mk({ mode: 'sit' }), ko: mk({ mode: 'ko' }), swim: mk({ mode: 'swim' }) };
    });
  }

  /* ---------------- animals ---------------- */
  function drawAnimal(g, t, v, ph, mode) {
    const st = Math.sin(ph);
    const legs = (pts, col, len) => { g.strokeStyle = col; g.lineWidth = 1.6; g.beginPath(); pts.forEach(([x, y], i) => { const o = (i % 2 ? st : -st) * len; g.moveTo(x, y); g.lineTo(x + o, y + Math.sign(y) * 1.5); }); g.stroke(); };
    switch (t) {
      case 'dog': { const col = ['#8a5a2b', '#222', '#e8dcc4', '#c49a5a'][v % 4];
        legs([[5, -3], [5, 3], [-5, -3], [-5, 3]], shade(col, -.3), 2);
        g.strokeStyle = col; g.lineWidth = 1.8; g.beginPath(); g.moveTo(-8, 0); g.quadraticCurveTo(-12, st * 3, -13, -2 + st * 2); g.stroke();
        ell(g, 0, 0, 8.5, 4.2); g.fillStyle = col; g.fill(); outline(g, .35);
        circ(g, 9, 0, 3.5); g.fill(); outline(g, .3); ell(g, 12.3, 0, 1.8, 1.4); g.fillStyle = shade(col, -.2); g.fill(); g.fillStyle = '#111'; circ(g, 13.8, 0, .7); g.fill();
        g.fillStyle = shade(col, -.35); ell(g, 8, -3, 1.6, 1, .4); g.fill(); ell(g, 8, 3, 1.6, 1, -.4); g.fill(); break; }
      case 'cat': { const col = ['#e08a3a', '#555', '#eee', '#222'][v % 4];
        legs([[3.5, -2], [3.5, 2], [-3.5, -2], [-3.5, 2]], shade(col, -.3), 1.6);
        g.strokeStyle = col; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-5, 0); g.bezierCurveTo(-9, 2, -10, -3 + st, -12, -1); g.stroke();
        ell(g, 0, 0, 5.5, 2.8); g.fillStyle = col; g.fill(); circ(g, 6, 0, 2.5); g.fill(); g.beginPath(); g.moveTo(5.5, -2); g.lineTo(7, -3.6); g.lineTo(7.4, -1.5); g.moveTo(5.5, 2); g.lineTo(7, 3.6); g.lineTo(7.4, 1.5); g.fill(); break; }
      case 'cow': {
        legs([[9, -6], [9, 6], [-9, -6], [-9, 6]], '#3a3a3a', 2.5);
        g.strokeStyle = '#555'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(-17, 0); g.lineTo(-21, st * 3); g.stroke();
        ell(g, 0, 0, 17, 9.5); g.fillStyle = '#f6f2ea'; g.fill(); outline(g, .4);
        g.save(); ell(g, 0, 0, 17, 9.5); g.clip(); const r = RNG(v * 13 + 1); g.fillStyle = '#262626'; for (let i = 0; i < 5; i++) { ell(g, r.range(-14, 12), r.range(-8, 8), r.range(3, 7), r.range(2.5, 5), r() * 3); g.fill(); } g.restore();
        ell(g, 18.5, 0, 6, 5); g.fillStyle = '#f6f2ea'; g.fill(); outline(g, .35); ell(g, 23, 0, 2.8, 3.4); g.fillStyle = '#e8a6a0'; g.fill();
        g.fillStyle = '#e9e4d8'; g.beginPath(); g.moveTo(16, -4); g.lineTo(15, -8); g.lineTo(18, -5); g.moveTo(16, 4); g.lineTo(15, 8); g.lineTo(18, 5); g.fill();
        g.fillStyle = '#ddd'; ell(g, 15, -5.5, 2.4, 1.3, .5); g.fill(); ell(g, 15, 5.5, 2.4, 1.3, -.5); g.fill(); break; }
      case 'chicken': { const col = v % 3 === 0 ? '#b5651d' : '#f4efe6';
        g.fillStyle = '#f5a623'; g.fillRect(-1 + st, -2, 1, 1); g.fillRect(-1 - st, 1, 1, 1);
        ell(g, 0, 0, 4.8, 3.6); g.fillStyle = col; g.fill(); outline(g, .3);
        g.fillStyle = shade(col, -.2); g.beginPath(); g.moveTo(-4, -2); g.lineTo(-7, -1); g.lineTo(-7, 1.5); g.lineTo(-4, 2); g.fill();
        circ(g, 4.2, 0, 2.1); g.fillStyle = col; g.fill(); g.fillStyle = '#e33'; circ(g, 4.4, 0, 1.1); g.fill(); g.fillStyle = '#f5a623'; g.beginPath(); g.moveTo(6, -.6); g.lineTo(7.8, 0); g.lineTo(6, .6); g.fill(); break; }
      case 'goat': { const col = v % 2 ? '#f0ece4' : '#8a6a4a';
        legs([[5, -3.5], [5, 3.5], [-5, -3.5], [-5, 3.5]], '#444', 2);
        ell(g, 0, 0, 9, 5); g.fillStyle = col; g.fill(); outline(g, .35);
        circ(g, 10, 0, 3.2); g.fill(); g.strokeStyle = '#6a5a4a'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(9, -2); g.quadraticCurveTo(6, -5, 5, -3); g.moveTo(9, 2); g.quadraticCurveTo(6, 5, 5, 3); g.stroke();
        g.fillStyle = '#ddd'; g.fillRect(12.5, -.6, 2, 1.2); break; }
      case 'peacock': {
        if (mode === 'display') { for (let i = 0; i < 13; i++) { const a = Math.PI * .55 + i / 12 * Math.PI * .9; g.strokeStyle = '#2f8a56'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(-2, 0); g.lineTo(-2 + Math.cos(a) * 15, Math.sin(a) * 15); g.stroke(); g.fillStyle = '#1b4fa0'; circ(g, -2 + Math.cos(a) * 14, Math.sin(a) * 14, 1.8); g.fill(); g.fillStyle = '#ffd23f'; circ(g, -2 + Math.cos(a) * 14, Math.sin(a) * 14, .8); g.fill(); } }
        else { g.fillStyle = '#2f8a56'; g.beginPath(); g.moveTo(-3, -2); g.lineTo(-16, -1.5); g.lineTo(-16, 1.5); g.lineTo(-3, 2); g.fill(); g.fillStyle = '#1b4fa0'; for (let x = -14; x < -4; x += 3) { circ(g, x, 0, .9); g.fill(); } }
        ell(g, 0, 0, 4.4, 3); g.fillStyle = '#1f5fbf'; g.fill(); circ(g, 4.4, 0, 1.8); g.fill(); g.fillStyle = '#e9c46a'; g.fillRect(5.8, -.4, 1.6, .8); g.strokeStyle = '#1f5fbf'; g.lineWidth = .5; g.beginPath(); g.moveTo(4, 0); g.lineTo(3, -2.5); g.moveTo(4, 0); g.lineTo(3.4, -2.8); g.stroke(); break; }
      case 'heron': {
        if (mode === 'fly') { g.fillStyle = '#d9dde0'; g.beginPath(); g.moveTo(0, 0); g.lineTo(-4, -16 * (.6 + .4 * st)); g.lineTo(-9, -15 * (.6 + .4 * st)); g.lineTo(-5, 0); g.lineTo(-9, 15 * (.6 + .4 * st)); g.lineTo(-4, 16 * (.6 + .4 * st)); g.closePath(); g.fill(); outline(g, .3); }
        ell(g, 0, 0, 6, 3); g.fillStyle = '#e8ecef'; g.fill(); outline(g, .3); g.strokeStyle = '#e8ecef'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(5, 0); g.lineTo(9, 0); g.stroke(); circ(g, 9.5, 0, 1.6); g.fillStyle = '#e8ecef'; g.fill(); g.fillStyle = '#e8b13a'; g.fillRect(10.5, -.5, 5, 1); break; }
    }
  }
  function animalSheet(t, v) {
    return memo('a' + t + v, () => {
      const S = t === 'cow' ? 56 : t === 'heron' ? 40 : t === 'peacock' ? 38 : 30;
      const walk = []; for (let i = 0; i < 6; i++) walk.push(C(S, S, g => drawAnimal(g, t, v, i / 6 * TAU, 'walk')).cv);
      const extra = t === 'peacock' ? C(S, S, g => drawAnimal(g, t, v, 0, 'display')).cv : t === 'heron' ? [0, 1, 2, 3].map(i => C(S, S, g => drawAnimal(g, t, v, i / 4 * TAU, 'fly')).cv) : null;
      return { S, walk, extra };
    });
  }

  /* ---------------- trees ---------------- */
  const TREE = {
    euc: { r: 27, cols: ['#5d7a54', '#7a9a6a', '#9db78a'], n: 16, leaf: 'rgba(200,220,180,.5)' },
    ficus: { r: 30, cols: ['#1f5a26', '#2f7a32', '#4c9a3f'], n: 22, leaf: 'rgba(140,200,110,.5)' },
    pine: { r: 23, cols: ['#21492e', '#2f6a3d', '#4a8a52'], n: 0 },
    cypress: { r: 9, cols: ['#1d4426', '#2d5e34', '#447a46'], n: 6 },
    citrus: { r: 13, cols: ['#245e24', '#347a2e', '#56a040'], n: 10, fruit: '#ffa21a' },
    avocado: { r: 16, cols: ['#173f1c', '#25592a', '#3b7a38'], n: 11 },
    olive: { r: 13, cols: ['#5f7158', '#7d9070', '#a7b896'], n: 12, leaf: 'rgba(230,235,220,.5)' },
    palm: { r: 25, cols: ['#3e7a26', '#5a9a32', '#8bc34a'], n: 0 },
    tamarisk: { r: 13, cols: ['#7a8f6a', '#93a684', '#b5c3a2'], n: 12 },
    parasol: { r: 14, cols: [], n: 0 },
  };
  function tree(t, v) {
    return memo('t' + t + v, () => {
      const d = TREE[t], R = d.r, r = RNG(v * 977 + t.length * 31);
      return C(R * 2 + 6, R * 2 + 6, g => {
        if (t === 'palm') {
          const n = 11 + v % 3;
          for (let i = 0; i < n; i++) { const a = i / n * TAU + r() * .3, L = R * r.range(.78, 1); g.save(); g.rotate(a);
            g.fillStyle = d.cols[i % 2]; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(L * .5, -4, L, 0); g.quadraticCurveTo(L * .5, 4, 0, 0); g.fill();
            g.strokeStyle = d.cols[2]; g.lineWidth = .6; for (let k = 3; k < L; k += 2.4) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 2, -3.2); g.moveTo(k, 0); g.lineTo(k + 2, 3.2); g.stroke(); }
            g.strokeStyle = shade(d.cols[0], -.3); g.lineWidth = .8; g.beginPath(); g.moveTo(0, 0); g.lineTo(L, 0); g.stroke(); g.restore(); }
          g.fillStyle = '#9a6a2a'; for (let i = 0; i < 6; i++) { circ(g, Math.cos(i) * 2.5, Math.sin(i * 1.7) * 2.5, 1.6); g.fill(); }
          return;
        }
        if (t === 'parasol') { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#fff' : (v % 2 ? '#ff6b4a' : '#2a8fd8'); g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R, i / 8 * TAU, (i + 1) / 8 * TAU); g.closePath(); g.fill(); } outline(g, .35); circ(g, 0, 0, 1.4); g.fillStyle = '#666'; g.fill(); return; }
        if (t === 'pine') {
          circ(g, 0, 0, R); g.fillStyle = d.cols[0]; g.fill();
          for (let ring = 0; ring < 3; ring++) { const rr2 = R * (1 - ring * .28); g.strokeStyle = d.cols[Math.min(2, ring)]; g.lineWidth = 1.4; for (let i = 0; i < 26; i++) { const a = i / 26 * TAU + ring * .3 + r() * .2; g.beginPath(); g.moveTo(Math.cos(a) * rr2 * .25, Math.sin(a) * rr2 * .25); g.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); g.stroke(); } }
          g.fillStyle = 'rgba(255,255,255,.08)'; circ(g, -R * .3, -R * .3, R * .5); g.fill(); return;
        }
        const blobs = [];
        for (let i = 0; i < d.n; i++) { const a = r() * TAU, rd = Math.sqrt(r()) * R * .55, br = R * r.range(.32, .5); blobs.push([Math.cos(a) * rd, Math.sin(a) * rd, br]); }
        blobs.push([0, 0, R * .55]);
        g.fillStyle = d.cols[0]; for (const [x, y, b] of blobs) { circ(g, x, y, b); g.fill(); }
        g.fillStyle = d.cols[1]; for (const [x, y, b] of blobs) { circ(g, x - b * .18, y - b * .2, b * .78); g.fill(); }
        g.fillStyle = d.cols[2]; for (const [x, y, b] of blobs) { circ(g, x - b * .35, y - b * .38, b * .42); g.fill(); }
        if (d.leaf) { g.fillStyle = d.leaf; for (let i = 0; i < R * 3; i++) { const a = r() * TAU, rd = r() * R * .9; g.fillRect(Math.cos(a) * rd, Math.sin(a) * rd, 1.2, 1.2); } }
        if (d.fruit) { g.fillStyle = d.fruit; for (let i = 0; i < 9; i++) { const a = r() * TAU, rd = r() * R * .75; circ(g, Math.cos(a) * rd, Math.sin(a) * rd, 1.4); g.fill(); } }
        g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = .8; for (const [x, y, b] of blobs) { g.beginPath(); g.arc(x, y, b, .2, 2.2); g.stroke(); }
      }, 2);
    });
  }

  /* ---------------- props ---------------- */
  function propDraw(g, p, t, v, broken) {
    const d = PT[t], hw = p.hw || d.hw, hh = p.hh || d.hh, r = p.r || d.r;
    if (broken) {
      const rg = RNG(v * 1000 + 7); const cols = d.burst || ['#777'];
      for (let i = 0; i < 9; i++) { g.fillStyle = cols[i % cols.length]; g.save(); g.translate(rg.range(-1, 1) * (hw || r) * 1.2, rg.range(-1, 1) * (hh || r) * 1.2); g.rotate(rg() * 3); g.fillRect(-2, -1, rg.range(2, 6), rg.range(1, 2.5)); g.restore(); }
      if (t === 'greenhouse' || t === 'solar') { g.strokeStyle = t === 'solar' ? '#555' : '#ddd'; g.lineWidth = 1; g.strokeRect(-hw, -hh, hw * 2, hh * 2); }
      if (t === 'fence' || t === 'cfence') { g.fillStyle = cols[0]; g.fillRect(-hw, -1, 5, 2); g.fillRect(hw - 5, -1, 5, 2); }
      if (t === 'lamp' || t === 'sign' || t === 'flag') { g.fillStyle = '#555'; g.fillRect(0, -1, 16, 2); }
      return;
    }
    switch (t) {
      case 'bush': { const rg = RNG(v * 99); g.fillStyle = '#2a6a2c'; for (let i = 0; i < 6; i++) { circ(g, rg.range(-4, 4), rg.range(-4, 4), r * .6); g.fill(); } g.fillStyle = '#3f8f3a'; for (let i = 0; i < 6; i++) { circ(g, rg.range(-4, 3), rg.range(-4, 3), r * .4); g.fill(); } g.fillStyle = '#6cbf55'; for (let i = 0; i < 5; i++) { circ(g, rg.range(-5, 1), rg.range(-5, 1), r * .2); g.fill(); } break; }
      case 'flowers': { ell(g, 0, 0, r, r * .8); g.fillStyle = '#5a3e26'; g.fill(); const rg = RNG(v * 55); const cs = ['#ff6b9a', '#ffd23f', '#fff', '#c58bd6', '#ff8a3a']; for (let i = 0; i < 14; i++) { g.fillStyle = '#3c7a2a'; circ(g, rg.range(-r + 2, r - 2), rg.range(-r * .6, r * .6), 1.8); g.fill(); g.fillStyle = cs[(i + v) % 5]; circ(g, rg.range(-r + 2, r - 2), rg.range(-r * .6, r * .6), 1.3); g.fill(); } break; }
      case 'hedge': { rr(g, -hw, -hh, hw * 2, hh * 2, hh); g.fillStyle = '#25602a'; g.fill(); g.fillStyle = '#3a8a36'; for (let x = -hw + 3; x < hw; x += 5) { circ(g, x, -1, hh * .8); g.fill(); } g.fillStyle = '#5aa84a'; for (let x = -hw + 4; x < hw; x += 6) { circ(g, x - 1, -2, hh * .35); g.fill(); } break; }
      case 'mailbox': rr(g, -3.5, -2.5, 7, 5, 1.5); g.fillStyle = '#c0392b'; g.fill(); outline(g); g.fillStyle = '#eee'; g.fillRect(-1, -2.5, 2, 5); break;
      case 'bin': circ(g, 0, 0, r); g.fillStyle = '#2f6e3a'; g.fill(); outline(g); circ(g, 0, 0, r * .7); g.fillStyle = '#3d8a4a'; g.fill(); g.fillStyle = '#ddd'; g.fillRect(-1, -r + 1, 2, 2); break;
      case 'dumpster': rr(g, -hw, -hh, hw * 2, hh * 2, 2); g.fillStyle = '#2e6b3a'; g.fill(); outline(g); g.fillStyle = '#245a2e'; g.fillRect(-hw + 2, -hh + 2, hw - 3, hh * 2 - 4); g.fillStyle = '#3a7d48'; g.fillRect(1, -hh + 2, hw - 3, hh * 2 - 4); g.fillStyle = '#ddd'; g.fillRect(-2, -hh, 4, 1.5); break;
      case 'gnome': circ(g, 0, 0, 3.5); g.fillStyle = '#2a8a4a'; g.fill(); circ(g, .5, 0, 2.3); g.fillStyle = '#fdc'; g.fill(); circ(g, -.3, 0, 2.2); g.fillStyle = '#d33'; g.fill(); g.fillStyle = '#fff'; g.fillRect(1.5, -1, 1.5, 2); break;
      case 'laundry': { g.strokeStyle = '#777'; g.lineWidth = .8; g.beginPath(); g.moveTo(-hw, 0); g.lineTo(hw, 0); g.stroke(); g.fillStyle = '#666'; circ(g, -hw, 0, 1.4); g.fill(); circ(g, hw, 0, 1.4); g.fill(); const cs = ['#fff', '#8ec9ff', '#ffbf80', '#ee8a8a', '#a8e0a0', '#f7e27a']; for (let i = 0; i < 6; i++) { g.fillStyle = cs[(i + v) % 6]; g.fillRect(-hw + 3 + i * 7, -1, 5.5, 4 + (i % 2) * 2); } break; }
      case 'fence': { g.fillStyle = '#f0e6cf'; g.fillRect(-hw, -1.2, hw * 2, 2.4); g.fillStyle = '#c9bb9d'; for (let x = -hw + 1; x < hw; x += 4) g.fillRect(x, -2, 1.8, 4); break; }
      case 'cfence': { g.fillStyle = '#7d8590'; for (let x = -hw; x <= hw; x += 10) { circ(g, x, 0, 1.3); g.fill(); } g.strokeStyle = 'rgba(160,170,180,.85)'; g.lineWidth = .9; g.beginPath(); g.moveTo(-hw, 0); g.lineTo(hw, 0); g.stroke(); g.strokeStyle = 'rgba(160,170,180,.45)'; g.lineWidth = .5; for (let x = -hw; x < hw; x += 2) { g.beginPath(); g.moveTo(x, -1); g.lineTo(x + 2, 1); g.stroke(); } break; }
      case 'lamp': circ(g, 0, 0, 2.6); g.fillStyle = '#555'; g.fill(); circ(g, 0, 0, 1.4); g.fillStyle = '#777'; g.fill(); break;
      case 'bench': rr(g, -hw, -hh, hw * 2, hh * 2, 1); g.fillStyle = '#8a5a2b'; g.fill(); outline(g, .4); g.fillStyle = '#6a4220'; for (let y = -hh + 1.2; y < hh; y += 2.4) g.fillRect(-hw + .5, y, hw * 2 - 1, .7); break;
      case 'table': { rr(g, -9, -5, 18, 10, 1); g.fillStyle = '#9a6a3a'; g.fill(); outline(g, .4); g.fillStyle = '#7a4a22'; g.fillRect(-9, -9, 18, 3); g.fillRect(-9, 6, 18, 3); break; }
      case 'hay': { circ(g, 0, 0, r); g.fillStyle = '#d4b64a'; g.fill(); outline(g, .4); g.strokeStyle = '#a98a2a'; g.lineWidth = 1; for (let k = 3; k < r; k += 3) { g.beginPath(); g.arc(0, 0, k, 0, TAU); g.stroke(); } g.fillStyle = 'rgba(255,255,255,.18)'; circ(g, -r * .3, -r * .3, r * .4); g.fill(); break; }
      case 'haysq': rr(g, -hw, -hh, hw * 2, hh * 2, 1.5); g.fillStyle = '#e1c35a'; g.fill(); outline(g, .4); g.strokeStyle = '#b8962e'; g.lineWidth = .8; for (let x = -hw + 2; x < hw; x += 2.5) { g.beginPath(); g.moveTo(x, -hh); g.lineTo(x, hh); g.stroke(); } g.strokeStyle = '#8a5a2b'; g.beginPath(); g.moveTo(-hw, -hh * .4); g.lineTo(hw, -hh * .4); g.moveTo(-hw, hh * .4); g.lineTo(hw, hh * .4); g.stroke(); break;
      case 'scarecrow': g.strokeStyle = '#8d6e3f'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(-11, 0); g.lineTo(11, 0); g.stroke(); g.fillStyle = '#c33'; rr(g, -4, -5, 8, 10, 2); g.fill(); g.fillStyle = '#e9cf6a'; circ(g, 0, 0, 3); g.fill(); circ(g, 0, 0, 5.5); g.strokeStyle = '#8d5a2b'; g.lineWidth = 1.2; g.stroke(); g.fillStyle = '#e9cf6a'; g.fillRect(-12, -1.5, 2, 3); g.fillRect(10, -1.5, 2, 3); break;
      case 'greenhouse': { g.fillStyle = '#d6eef6'; g.fillRect(-hw, -hh, hw * 2, hh * 2); const gr = g.createLinearGradient(0, -hh, 0, hh); gr.addColorStop(0, 'rgba(255,255,255,.7)'); gr.addColorStop(.5, 'rgba(255,255,255,.1)'); gr.addColorStop(1, 'rgba(120,160,170,.4)'); g.fillStyle = gr; g.fillRect(-hw, -hh, hw * 2, hh * 2); g.fillStyle = 'rgba(70,130,60,.45)'; for (let x = -hw + 6; x < hw - 4; x += 9) g.fillRect(x, -hh + 4, 5, hh * 2 - 8); g.strokeStyle = '#f8f8f8'; g.lineWidth = 1; for (let x = -hw; x <= hw; x += 11) { g.beginPath(); g.moveTo(x, -hh); g.lineTo(x, hh); g.stroke(); } g.beginPath(); g.moveTo(-hw, 0); g.lineTo(hw, 0); g.stroke(); g.strokeStyle = '#9aa'; g.strokeRect(-hw, -hh, hw * 2, hh * 2); break; }
      case 'solar': { g.fillStyle = '#1d3c6e'; g.fillRect(-hw, -hh, hw * 2, hh * 2); const gr = g.createLinearGradient(-hw, -hh, hw, hh); gr.addColorStop(0, 'rgba(180,210,255,.45)'); gr.addColorStop(.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(120,160,230,.3)'); g.fillStyle = gr; g.fillRect(-hw, -hh, hw * 2, hh * 2); g.strokeStyle = 'rgba(200,220,255,.5)'; g.lineWidth = .5; for (let x = -hw; x <= hw; x += 5) { g.beginPath(); g.moveTo(x, -hh); g.lineTo(x, hh); g.stroke(); } g.beginPath(); g.moveTo(-hw, 0); g.lineTo(hw, 0); g.stroke(); g.strokeStyle = '#ccc'; g.lineWidth = .8; g.strokeRect(-hw, -hh, hw * 2, hh * 2); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(-hw, hh, hw * 2, 2); break; }
      case 'container': { const cs = ['#b5452e', '#2f6fa8', '#3d8a52', '#c98a2a', '#7a7a7a']; const c = cs[v % 5]; g.fillStyle = c; g.fillRect(-hw, -hh, hw * 2, hh * 2); g.strokeStyle = shade(c, -.3); g.lineWidth = .8; for (let x = -hw + 2; x < hw; x += 2.5) { g.beginPath(); g.moveTo(x, -hh); g.lineTo(x, hh); g.stroke(); } g.strokeStyle = 'rgba(0,0,0,.5)'; g.strokeRect(-hw, -hh, hw * 2, hh * 2); g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(-hw, -hh, hw * 2, 3); break; }
      case 'pallet': g.fillStyle = '#c9a36a'; for (let y = -hh; y < hh; y += 3.5) g.fillRect(-hw, y, hw * 2, 2.4); g.fillStyle = '#a07a4a'; g.fillRect(-hw, -hh, 2, hh * 2); g.fillRect(hw - 2, -hh, 2, hh * 2); g.fillRect(-1, -hh, 2, hh * 2); break;
      case 'barrel': circ(g, 0, 0, r); g.fillStyle = v % 2 ? '#2f5fa8' : '#c0392b'; g.fill(); outline(g); circ(g, 0, 0, r * .7); g.strokeStyle = 'rgba(0,0,0,.3)'; g.stroke(); g.fillStyle = '#ddd'; circ(g, r * .35, 0, .9); g.fill(); break;
      case 'tires': for (const [x, y] of [[-3, -3], [3, -2], [0, 3]]) { circ(g, x, y, 4.5); g.fillStyle = '#1e1e1e'; g.fill(); circ(g, x, y, 2); g.fillStyle = '#555'; g.fill(); } break;
      case 'sprinkler': circ(g, 0, 0, 2.2); g.fillStyle = '#666'; g.fill(); g.fillStyle = '#ffd23f'; g.fillRect(-.5, -2, 1, 1.2); break;
      case 'pump': rr(g, -hw, -hh, hw * 2, hh * 2, 1.5); g.fillStyle = '#e8e8e8'; g.fill(); outline(g); g.fillStyle = '#d33'; g.fillRect(-hw, -hh, hw * 2, 4); g.fillStyle = '#222'; g.fillRect(-2.5, -1, 5, 4); g.strokeStyle = '#222'; g.lineWidth = .8; g.beginPath(); g.moveTo(hw, 2); g.quadraticCurveTo(hw + 5, 6, hw + 2, 9); g.stroke(); break;
      case 'barrier': { for (let x = -hw; x < hw; x += 6) { g.fillStyle = ((x + hw) / 6) % 2 < 1 ? '#e33' : '#fff'; g.fillRect(x, -1.6, 6, 3.2); } outline(g, .3); g.fillStyle = '#666'; circ(g, -hw, 0, 2.5); g.fill(); break; }
      case 'sign': circ(g, 0, 0, 1.4); g.fillStyle = '#777'; g.fill(); rr(g, -5, -3, 10, 6, 1); g.fillStyle = '#2a6ab8'; g.fill(); outline(g); g.fillStyle = '#fff'; g.fillRect(-3, -.5, 6, 1); break;
      case 'rock': { const rg = RNG(v * 31); g.beginPath(); for (let i = 0; i < 9; i++) { const a = i / 9 * TAU, rd = r * rg.range(.75, 1.05); i ? g.lineTo(Math.cos(a) * rd, Math.sin(a) * rd) : g.moveTo(Math.cos(a) * rd, Math.sin(a) * rd); } g.closePath(); const gr = g.createLinearGradient(-r, -r, r, r); gr.addColorStop(0, '#c9bfae'); gr.addColorStop(1, '#7d7266'); g.fillStyle = gr; g.fill(); outline(g, .4); break; }
      case 'aerator': { g.fillStyle = 'rgba(255,255,255,.6)'; circ(g, 0, 0, r + 3); g.fill(); circ(g, 0, 0, 3); g.fillStyle = '#f0b030'; g.fill(); break; }
      case 'goal': g.strokeStyle = '#fff'; g.lineWidth = 1.6; g.strokeRect(-hw, -hh, hw * 2, hh * 2); g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = .4; for (let y = -hh; y < hh; y += 2) { g.beginPath(); g.moveTo(-hw, y); g.lineTo(hw, y); g.stroke(); } break;
      case 'swing': g.strokeStyle = '#3b82c4'; g.lineWidth = 2; g.strokeRect(-hw, -hh, hw * 2, hh * 2); g.fillStyle = '#e04a4a'; g.fillRect(-8, -2, 5, 4); g.fillRect(3, -2, 5, 4); break;
      case 'slide': rr(g, -hw, -hh, hw * 2, hh * 2, 3); g.fillStyle = '#e8c547'; g.fill(); outline(g); g.fillStyle = '#e04a4a'; g.fillRect(-hw, -hh, hw * 2, 6); break;
      case 'trough': rr(g, -hw, -hh, hw * 2, hh * 2, 2); g.fillStyle = '#8a8f94'; g.fill(); outline(g); g.fillStyle = '#5fa0c8'; g.fillRect(-hw + 2, -hh + 1.5, hw * 2 - 4, hh * 2 - 3); break;
      case 'lounger': rr(g, -hw, -hh, hw * 2, hh * 2, 2); g.fillStyle = '#fff'; g.fill(); outline(g, .3); g.fillStyle = '#4db8f0'; for (let y = -hh + 2; y < hh; y += 3) g.fillRect(-hw + 1, y, hw * 2 - 2, 1.2); break;
      case 'parasol': circ(g, 0, 0, 1.4); g.fillStyle = '#555'; g.fill(); break;
      case 'flag': circ(g, 0, 0, 1.8); g.fillStyle = '#aaa'; g.fill(); break;
      case 'hydrant': circ(g, 0, 0, r); g.fillStyle = '#d33'; g.fill(); outline(g); circ(g, 0, 0, 1.4); g.fillStyle = '#aaa'; g.fill(); break;
      case 'tamarisk': break;
      case 'beehive': rr(g, -hw, -hh, hw * 2, hh * 2, 1); g.fillStyle = ['#f3d27a', '#fff', '#9fd0f0'][v % 3]; g.fill(); outline(g, .4); g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(-hw, -1, hw * 2, 2); break;
      case 'cones': g.fillStyle = '#ff7a1a'; circ(g, 0, 0, 3.6); g.fill(); g.fillStyle = '#fff'; circ(g, 0, 0, 2); g.fill(); g.fillStyle = '#ff7a1a'; circ(g, 0, 0, 1); g.fill(); break;
      case 'phone': rr(g, -4, -4, 8, 8, 2); g.fillStyle = '#ffd23f'; g.fill(); outline(g); g.fillStyle = '#222'; g.fillRect(-2.5, -2.5, 5, 3); break;
      default: if (r) { circ(g, 0, 0, r); g.fillStyle = '#777'; g.fill(); }
    }
  }
  function prop(p) {
    const vv = Math.floor(p.v * 4), k = 'pr' + p.t + vv + (p.broken ? 'b' : '') + (p.hw ? p.hw + 'x' + p.hh : p.r);
    return memo(k, () => { const d = PT[p.t], hw = p.hw || d.hw || 0, hh = p.hh || d.hh || 0, r = p.r || d.r || 0; const ext = Math.max(hw, hh, r) * 2 + (p.broken ? 16 : 10); return C(ext + (p.t === 'scarecrow' ? 8 : 0), ext, g => propDraw(g, p, p.t, vv, p.broken)); });
  }

  /* ---------------- roofs ---------------- */
  const RS = 2;
  const TXT = (g, txt, size, col, y) => { g.save(); g.font = `bold ${size}px Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl'; g.lineWidth = size / 5; g.strokeStyle = 'rgba(0,0,0,.35)'; g.strokeText(txt, 0, y || 0); g.fillStyle = col; g.fillText(txt, 0, y || 0); g.restore(); };
  function solarHeater(g, x, y, a) { g.save(); g.translate(x, y); g.rotate(a || 0); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-7, -4, 16, 12); g.fillStyle = '#26415e'; g.fillRect(-8, -5, 16, 10); g.strokeStyle = 'rgba(160,200,255,.5)'; g.lineWidth = .5; for (let i = -6; i < 8; i += 3) { g.beginPath(); g.moveTo(i, -5); g.lineTo(i, 5); g.stroke(); } const gr = g.createLinearGradient(0, -9, 0, -5); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#aab'); g.fillStyle = gr; rr(g, -8, -9.5, 16, 4.5, 2.2); g.fill(); g.strokeStyle = 'rgba(0,0,0,.4)'; g.stroke(); g.restore(); }
  function acUnit(g, x, y) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x - 3, y - 2, 8, 7); g.fillStyle = '#d8d8d8'; g.fillRect(x - 4, y - 3, 8, 6); g.strokeStyle = '#999'; g.lineWidth = .5; g.strokeRect(x - 4, y - 3, 8, 6); g.beginPath(); g.arc(x, y, 2, 0, TAU); g.stroke(); }
  function roof(b) {
    return memo('r' + b.id, () => {
      if (b.shape === 'circle') return C(b.r * 2 + 4, b.r * 2 + 4, g => roofCircle(g, b), RS);
      const E = b.kind === 'house' ? 3 : 1, W2 = b.hw + E, H2 = b.hh + E;
      return C(W2 * 2, H2 * 2, g => roofRect(g, b, W2, H2), RS);
    });
  }
  function roofCircle(g, b) {
    const r = b.r;
    if (b.kind === 'silo') { const gr = g.createRadialGradient(-r * .3, -r * .3, 1, 0, 0, r); gr.addColorStop(0, '#f4f6f8'); gr.addColorStop(.7, '#aeb6bd'); gr.addColorStop(1, '#78828a'); circ(g, 0, 0, r); g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(60,70,80,.35)'; g.lineWidth = .6; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); g.stroke(); } circ(g, 0, 0, 3); g.fillStyle = '#666'; g.fill(); outline(g, .6); }
    else if (b.kind === 'tank') { circ(g, 0, 0, r); g.fillStyle = '#c0392b'; g.fill(); outline(g); circ(g, 0, 0, r * .6); g.strokeStyle = 'rgba(255,255,255,.4)'; g.stroke(); g.fillStyle = '#fff'; g.font = 'bold 7px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('סולר', 0, 0); }
    else { const gr = g.createRadialGradient(-r * .3, -r * .3, 1, 0, 0, r); gr.addColorStop(0, '#e8e2d4'); gr.addColorStop(1, '#a49c8c'); circ(g, 0, 0, r); g.fillStyle = gr; g.fill(); outline(g, .5); circ(g, 0, 0, r * .75); g.strokeStyle = 'rgba(0,0,0,.2)'; g.stroke(); g.fillStyle = '#c33'; circ(g, 0, 0, 2.5); g.fill(); g.strokeStyle = '#777'; g.lineWidth = .7; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -r * .9); g.stroke(); }
  }
  function roofRect(g, b, W2, H2) {
    const r = RNG(b.id * 131 + 7), k = b.kind, style = b.style;
    const flat = (col, parapet) => { g.fillStyle = col; g.fillRect(-W2, -H2, W2 * 2, H2 * 2); for (let i = 0; i < (W2 * H2) / 60; i++) { g.fillStyle = `rgba(0,0,0,${r() * .06})`; g.fillRect(r.range(-W2, W2), r.range(-H2, H2), r.range(3, 12), r.range(3, 10)); } if (parapet) { g.strokeStyle = shade(col, -.25); g.lineWidth = 2.2; g.strokeRect(-W2 + 1.1, -H2 + 1.1, W2 * 2 - 2.2, H2 * 2 - 2.2); g.strokeStyle = shade(col, .2); g.lineWidth = .7; g.strokeRect(-W2 + 2.4, -H2 + 2.4, W2 * 2 - 4.8, H2 * 2 - 4.8); } };
    if (k === 'house' && (style === 'tile' || style === 'villa')) {
      const c = b.roofCol;
      if (style === 'villa') {
        const ins = Math.min(W2, H2) * .9;
        const tri = (pts, f) => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fillStyle = shade(c, f); g.fill(); };
        tri([[-W2, -H2], [W2, -H2], [W2 - ins, 0], [-W2 + ins, 0]], .12); tri([[-W2, H2], [W2, H2], [W2 - ins, 0], [-W2 + ins, 0]], -.18);
        tri([[-W2, -H2], [-W2 + ins, 0], [-W2, H2]], .02); tri([[W2, -H2], [W2 - ins, 0], [W2, H2]], -.08);
        g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = .6; for (let y = -H2 + 3; y < H2; y += 3.2) { g.beginPath(); g.moveTo(-W2, y); g.lineTo(W2, y); g.stroke(); }
        g.strokeStyle = shade(c, -.4); g.lineWidth = 1.4; g.beginPath(); g.moveTo(-W2, -H2); g.lineTo(-W2 + ins, 0); g.lineTo(W2 - ins, 0); g.lineTo(W2, -H2); g.moveTo(-W2 + ins, 0); g.lineTo(-W2, H2); g.moveTo(W2 - ins, 0); g.lineTo(W2, H2); g.stroke();
      } else {
        g.fillStyle = shade(c, .12); g.fillRect(-W2, -H2, W2 * 2, H2); g.fillStyle = shade(c, -.16); g.fillRect(-W2, 0, W2 * 2, H2);
        for (let y = -H2 + 1.5; y < H2; y += 3.2) { g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(-W2, y, W2 * 2, .7); for (let x = -W2 + ((y * 7) % 4); x < W2; x += 4) { g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(x, y - 1.5, 2, 1.4); } }
        g.fillStyle = shade(c, -.35); g.fillRect(-W2, -1, W2 * 2, 2); g.fillStyle = shade(c, .25); g.fillRect(-W2, -1, W2 * 2, .6);
      }
      g.strokeStyle = 'rgba(40,20,10,.55)'; g.lineWidth = 1; g.strokeRect(-W2, -H2, W2 * 2, H2 * 2);
      if (r() < .75) solarHeater(g, r.range(-W2 + 10, W2 - 10), H2 * .45, 0);
      if (r() < .4) acUnit(g, r.range(-W2 + 6, W2 - 6), -H2 * .5);
      if (r() < .3) { g.strokeStyle = '#555'; g.lineWidth = .6; const x = r.range(-W2 * .6, W2 * .6); g.beginPath(); g.moveTo(x, -4); g.lineTo(x + 6, -8); g.moveTo(x + 2, -5); g.lineTo(x + 4, -2); g.stroke(); }
      return;
    }
    if (k === 'house' && style === 'rows') {
      flat(b.roofCol, true); const n = Math.max(2, Math.round(W2 / 16)); g.strokeStyle = shade(b.roofCol, -.3); g.lineWidth = 1.2;
      for (let i = 1; i < n; i++) { const x = -W2 + i * W2 * 2 / n; g.beginPath(); g.moveTo(x, -H2); g.lineTo(x, H2); g.stroke(); }
      for (let i = 0; i < n; i++) if (r() < .8) solarHeater(g, -W2 + (i + .5) * W2 * 2 / n, H2 * .25, 0);
      return;
    }
    if (k === 'house') { flat('#cfcac0', true); solarHeater(g, r.range(-W2 + 10, W2 - 10), 2, 0); if (r() < .6) acUnit(g, -W2 + 7, -H2 + 6); return; }
    switch (k) {
      case 'dining': flat('#d9d3c4', true); g.fillStyle = 'rgba(150,200,230,.75)'; for (let x = -W2 + 20; x < W2 - 15; x += 30) for (const y of [-H2 * .45, H2 * .2]) { rr(g, x, y, 18, 10, 2); g.fill(); g.strokeStyle = '#999'; g.stroke(); } for (let i = 0; i < 4; i++) acUnit(g, -W2 + 12 + i * 10, H2 - 8); TXT(g, b.label, 16, '#7a3b2e', H2 * .62); break;
      case 'office': case 'club': case 'hall': case 'laundry': case 'school': case 'shop': case 'kiosk': case 'shop2':
        flat({ office: '#b8c4cc', club: '#d9c9a8', hall: '#c9b8a0', laundry: '#c9d6dc', school: '#e2cfa0', shop: '#d9b38a', kiosk: '#e9d9b8', shop2: '#f0f0f0' }[k], true);
        if (k === 'shop2') { g.fillStyle = '#d33'; g.fillRect(-W2, -H2, W2 * 2, 4); }
        for (let i = 0; i < Math.floor(W2 / 18); i++) acUnit(g, -W2 + 10 + i * 14, -H2 + 7);
        if (W2 > 30) solarHeater(g, W2 - 14, H2 - 10, 0);
        TXT(g, b.label, Math.min(13, W2 / 3.4), '#2a2018', 3); break;
      case 'clinic': flat('#f4f4f4', true); g.fillStyle = '#d33'; g.fillRect(-4, -12, 8, 24); g.fillRect(-12, -4, 24, 8); break;
      case 'gan': { const cs = ['#e74c3c', '#f39c12', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6']; for (let i = 0; i < 6; i++) { g.fillStyle = cs[i]; g.fillRect(-W2 + i * W2 / 3, -H2, W2 / 3 + .5, H2 * 2); } g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(-W2, -H2, W2 * 2, H2); TXT(g, b.label, 10, '#fff', 0); break; }
      case 'shelter': { g.fillStyle = '#5f8f45'; g.fillRect(-W2, -H2, W2 * 2, H2 * 2); g.fillStyle = 'rgba(30,60,20,.3)'; for (let i = 0; i < 40; i++) g.fillRect(r.range(-W2, W2), r.range(-H2, H2), 2, 2); g.fillStyle = '#9a9a9a'; g.fillRect(-W2, -H2, W2 * 2, 3); for (const x of [-W2 * .5, W2 * .4]) { circ(g, x, 0, 2.8); g.fillStyle = '#777'; g.fill(); } g.fillStyle = '#ff4fb0'; g.font = 'bold 9px Arial'; g.textAlign = 'center'; g.direction = 'rtl'; g.fillText('פאב', 0, H2 - 5); break; }
      case 'cowshed': { g.fillStyle = '#9aa3a8'; g.fillRect(-W2, -H2, W2 * 2, H2 * 2); g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = .8; for (let x = -W2; x < W2; x += 3) { g.beginPath(); g.moveTo(x, -H2); g.lineTo(x, H2); g.stroke(); } g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(-W2, -H2, W2 * 2, H2 * .9); g.fillStyle = '#6b757b'; g.fillRect(-W2, -2, W2 * 2, 4); for (let x = -W2 + 10; x < W2; x += 22) { g.fillStyle = 'rgba(160,140,90,.4)'; g.fillRect(x, -H2 + 2, 8, 4); } if (b.label) TXT(g, b.label, 12, '#2a2a2a', H2 * .55); break; }
      case 'metal': case 'garage': { const c = b.roofCol || (k === 'garage' ? '#7d8790' : '#a9b0b4'); g.fillStyle = c; g.fillRect(-W2, -H2, W2 * 2, H2 * 2); g.strokeStyle = 'rgba(0,0,0,.16)'; g.lineWidth = .9; for (let y = -H2; y < H2; y += 3) { g.beginPath(); g.moveTo(-W2, y); g.lineTo(W2, y); g.stroke(); } g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(-W2, -H2, W2 * 2, H2); g.fillStyle = 'rgba(150,80,40,.25)'; for (let i = 0; i < 6; i++) { ell(g, r.range(-W2, W2), r.range(-H2, H2), r.range(4, 12), r.range(2, 5)); g.fill(); } g.fillStyle = 'rgba(180,220,240,.6)'; for (let x = -W2 + 15; x < W2 - 10; x += 36) g.fillRect(x, -H2 + 6, 10, H2 * 2 - 12); if (k === 'garage') { g.fillStyle = '#ffd23f'; for (let x = -W2; x < W2; x += 10) g.fillRect(x, H2 - 4, 5, 4); } if (b.label) TXT(g, b.label, Math.min(14, W2 / 4), k === 'garage' ? '#ffd23f' : '#333', 0); break; }
      case 'coop': { g.fillStyle = '#e8ecef'; g.fillRect(-W2, -H2, W2 * 2, H2 * 2); g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = .7; for (let x = -W2; x < W2; x += 3) { g.beginPath(); g.moveTo(x, -H2); g.lineTo(x, H2); g.stroke(); } g.fillStyle = '#c9cfd3'; g.fillRect(-W2, -1, W2 * 2, 2); for (const x of [-W2 + 6, W2 - 6]) { circ(g, x, -H2 * .45, 3.4); g.fillStyle = '#777'; g.fill(); circ(g, x, H2 * .45, 3.4); g.fill(); } if (b.label) TXT(g, b.label, 11, '#555', 0); break; }
      case 'factory': { const c = '#8e979c'; g.fillStyle = c; g.fillRect(-W2, -H2, W2 * 2, H2 * 2); for (let x = -W2; x < W2; x += 16) { const gr = g.createLinearGradient(x, 0, x + 16, 0); gr.addColorStop(0, '#6d757a'); gr.addColorStop(.7, '#b8c0c5'); gr.addColorStop(.72, '#7fb2d4'); gr.addColorStop(1, '#a8d4ee'); g.fillStyle = gr; g.fillRect(x, -H2, 16, H2 * 2); } g.strokeStyle = 'rgba(0,0,0,.3)'; g.strokeRect(-W2, -H2, W2 * 2, H2 * 2); for (let i = 0; i < 4; i++) acUnit(g, -W2 + 20 + i * 22, H2 - 8); circ(g, W2 - 18, -H2 + 18, 8); g.fillStyle = '#5a5a5a'; g.fill(); circ(g, W2 - 18, -H2 + 18, 5); g.fillStyle = '#2a2a2a'; g.fill(); TXT(g, b.label, 14, '#fff', 0); break; }
      case 'tower': { flat('#9fa6ab', true); g.fillStyle = '#c33'; circ(g, 0, 0, 14); g.lineWidth = 2; g.strokeStyle = '#fff'; g.stroke(); g.fillStyle = '#fff'; g.font = 'bold 14px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('H', 0, 1); for (let i = 0; i < 4; i++) acUnit(g, -W2 + 12, -H2 + 12 + i * 12); g.strokeStyle = '#555'; g.lineWidth = .8; g.beginPath(); g.moveTo(W2 - 12, -H2 + 10); g.lineTo(W2 - 12, -H2 + 26); g.stroke(); break; }
      case 'canopy': { g.fillStyle = b.roofCol || '#eee'; g.fillRect(-W2, -H2, W2 * 2, H2 * 2); g.fillStyle = '#d33'; g.fillRect(-W2, -H2, W2 * 2, 4); g.fillRect(-W2, H2 - 4, W2 * 2, 4); g.fillStyle = 'rgba(0,0,0,.08)'; for (let x = -W2 + 10; x < W2; x += 20) g.fillRect(x, -H2 + 4, 1, H2 * 2 - 8); if (b.label) TXT(g, b.label, 15, '#c22', 0); g.strokeStyle = 'rgba(0,0,0,.3)'; g.strokeRect(-W2, -H2, W2 * 2, H2 * 2); break; }
      case 'busstop': g.fillStyle = b.roofCol || '#4a7fb5'; g.fillRect(-W2, -H2, W2 * 2, H2 * 2); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(-W2, -H2, W2 * 2, H2); outline(g); break;
      case 'booth': flat('#e8e8e8', true); g.fillStyle = '#d33'; g.fillRect(-W2, -H2, W2 * 2, 2); break;
      case 'caravan': flat('#e6e2d6', false); g.strokeStyle = 'rgba(0,0,0,.15)'; for (let x = -W2; x < W2; x += 3) { g.beginPath(); g.moveTo(x, -H2); g.lineTo(x, H2); g.stroke(); } TXT(g, b.label, 7, '#444', 0); break;
      case 'shed': g.fillStyle = '#8a5a3a'; g.fillRect(-W2, -H2, W2 * 2, H2 * 2); g.strokeStyle = 'rgba(0,0,0,.25)'; for (let x = -W2; x < W2; x += 3) { g.beginPath(); g.moveTo(x, -H2); g.lineTo(x, H2); g.stroke(); } break;
      default: flat('#c8c2b4', true); if (b.label) TXT(g, b.label, 11, '#333', 0);
    }
  }

  /* ---------------- HUD / pickup icons ---------------- */
  function icon(name) {
    return memo('i' + name, () => C(24, 24, g => {
      switch (name) {
        case 'fist': g.fillStyle = '#f1c9a0'; rr(g, -7, -5, 13, 11, 4); g.fill(); outline(g); g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = .8; for (let i = -3; i <= 3; i += 3) { g.beginPath(); g.moveTo(-2, i); g.lineTo(5, i); g.stroke(); } rr(g, -9, -2, 5, 6, 2); g.fill(); g.stroke(); break;
        case 'toto': g.save(); g.rotate(-.2); rr(g, -9, -3, 16, 6, 2); g.fillStyle = '#ff8a1a'; g.fill(); outline(g); rr(g, -8, 2, 5, 8, 2); g.fillStyle = '#d96a10'; g.fill(); outline(g); g.fillStyle = '#ffd23f'; g.fillRect(6, -2, 4, 4); g.fillStyle = '#fff'; g.fillRect(-2, -2, 6, 2); g.restore(); break;
        case 'soaker': rr(g, -10, -3, 18, 6, 3); g.fillStyle = '#3ab0f0'; g.fill(); outline(g); circ(g, -3, -6, 4.5); g.fillStyle = '#ff9f1a'; g.fill(); outline(g); rr(g, -8, 2, 4, 7, 2); g.fillStyle = '#ffd23f'; g.fill(); outline(g); g.fillStyle = '#ffd23f'; g.fillRect(8, -1.5, 3, 3); break;
        case 'balloon': ell(g, 0, -1, 6.5, 7.5); const gr = g.createRadialGradient(-2, -4, 1, 0, 0, 8); gr.addColorStop(0, '#bfe8ff'); gr.addColorStop(1, '#2a8fd8'); g.fillStyle = gr; g.fill(); outline(g); g.fillStyle = '#2a8fd8'; g.beginPath(); g.moveTo(-1.5, 6.5); g.lineTo(1.5, 6.5); g.lineTo(0, 8.5); g.fill(); break;
        case 'extinguisher': rr(g, -4, -8, 8, 17, 3); g.fillStyle = '#d32f2f'; g.fill(); outline(g); g.fillStyle = '#222'; g.fillRect(-2, -10, 4, 3); g.strokeStyle = '#222'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(2, -9); g.quadraticCurveTo(8, -9, 7, -2); g.stroke(); g.fillStyle = '#fff'; g.fillRect(-3, -2, 6, 4); break;
        case 'health': rr(g, -9, -6, 18, 12, 6); g.fillStyle = '#e9c88a'; g.fill(); outline(g); g.fillStyle = '#c99a4a'; rr(g, -7, -4, 14, 8, 4); g.fill(); g.fillStyle = '#6aa84f'; for (let i = -5; i < 6; i += 3) { circ(g, i, -1, 1.6); g.fill(); } g.fillStyle = '#b5371f'; for (let i = -4; i < 6; i += 4) { circ(g, i, 2, 1.4); g.fill(); } break;
        case 'armor': circ(g, 0, 0, 9); g.fillStyle = '#e6dcb4'; g.fill(); outline(g); circ(g, 0, 0, 5.5); g.fillStyle = '#d4c896'; g.fill(); outline(g, .3); break;
        case 'egg': ell(g, 0, 0, 6, 8); const g2 = g.createRadialGradient(-2, -3, 1, 0, 0, 9); g2.addColorStop(0, '#fff6b0'); g2.addColorStop(.5, '#ffd23f'); g2.addColorStop(1, '#c48a10'); g.fillStyle = g2; g.fill(); outline(g); break;
        case 'rampage': circ(g, 0, 0, 10); g.fillStyle = '#7a1fa2'; g.fill(); outline(g); g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(-6, -3); g.lineTo(2, -6); g.lineTo(2, 6); g.lineTo(-6, 3); g.closePath(); g.fill(); g.fillRect(2, -3, 4, 6); g.strokeStyle = '#ffd23f'; g.lineWidth = 1.2; g.beginPath(); g.arc(4, 0, 6, -.7, .7); g.stroke(); break;
        case 'phone': rr(g, -8, -8, 16, 16, 3); g.fillStyle = '#ffd23f'; g.fill(); outline(g); g.fillStyle = '#222'; g.font = 'bold 13px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('☎', 0, 1); break;
        case 'coin': circ(g, 0, 0, 7); g.fillStyle = '#d9a400'; g.fill(); circ(g, 0, 0, 5.4); g.fillStyle = '#ffd23f'; g.fill(); g.fillStyle = '#b8860b'; g.font = 'bold 8px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('₪', 0, .5); break;
      }
    }));
  }
  return { vehicle, personSheet, animalSheet, tree, TREE, prop, roof, icon, VSIZE, PFRAMES };
})();
