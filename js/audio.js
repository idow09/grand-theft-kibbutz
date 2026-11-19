'use strict';
/* ================================================================
   audio.js — WebAudio: SFX, engine hum, ambience, 6 radio stations
   Everything is synthesized; no external assets.
   ================================================================ */
const Audio2 = (() => {
  let ac = null, master, sfxBus, musicBus, ambBus, noiseBuf, distCurve;
  const vol = { master: .75, music: .38, sfx: .8 };
  let engine = null, rain = null, wind = null;

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = vol.master;
      const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
      master.connect(comp); comp.connect(ac.destination);
      sfxBus = ac.createGain(); sfxBus.gain.value = vol.sfx; sfxBus.connect(master);
      // radio chain: warm low-pass + a small generated room reverb, so the synths sound less like raw MIDI
      musicBus = ac.createGain(); musicBus.gain.value = 0;
      const warm = ac.createBiquadFilter(); warm.type = 'lowpass'; warm.frequency.value = 3200; warm.Q.value = .5;
      const rv = ac.createConvolver(), rl = Math.floor(ac.sampleRate * 1.6), ir = ac.createBuffer(2, rl, ac.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const dd = ir.getChannelData(ch); for (let i = 0; i < rl; i++) dd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / rl, 3.2); }
      rv.buffer = ir; const wet = ac.createGain(); wet.gain.value = .22; const dry = ac.createGain(); dry.gain.value = .85;
      musicBus.connect(warm); warm.connect(dry); warm.connect(rv); rv.connect(wet); dry.connect(master); wet.connect(master);
      ambBus = ac.createGain(); ambBus.gain.value = .7; ambBus.connect(master);
      const n = ac.sampleRate * 2; noiseBuf = ac.createBuffer(1, n, ac.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      distCurve = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; distCurve[i] = Math.tanh(x * 4); }
      startAmbience();
    } catch (e) { ac = null; }
  }
  const now = () => ac ? ac.currentTime : 0;

  /* ---------- primitives ---------- */
  function tone(f, t, dur, o) {
    o = o || {}; if (!ac) return;
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.type = o.type || 'square'; osc.frequency.setValueAtTime(f, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t + dur);
    if (o.detune) osc.detune.value = o.detune;
    let node = osc;
    if (o.vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = o.vib; lg.gain.value = f * (o.vibAmt || .012); l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + dur + .05); }
    if (o.lp) { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(o.lp, t); fl.Q.value = o.q || 1;
      if (o.lpEnd) fl.frequency.exponentialRampToValueAtTime(o.lpEnd, t + dur); node.connect(fl); node = fl; }
    if (o.dist) { const ws = ac.createWaveShaper(); ws.curve = distCurve; node.connect(ws); node = ws; }
    const pk = o.vol || .1, a = o.a || .005;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(pk, t + a);
    if (o.sus) { g.gain.setValueAtTime(pk, t + dur * .7); }
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    node.connect(g);
    if (o.pan !== undefined && ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = o.pan; g.connect(p); p.connect(o.bus || sfxBus); }
    else g.connect(o.bus || sfxBus);
    osc.start(t); osc.stop(t + dur + .05);
  }
  function noise(t, dur, o) {
    o = o || {}; if (!ac) return;
    const s = ac.createBufferSource(); s.buffer = noiseBuf; s.playbackRate.value = o.rate || 1;
    const f = ac.createBiquadFilter(); f.type = o.ft || 'lowpass'; f.frequency.setValueAtTime(o.f || 2000, t); f.Q.value = o.q || .8;
    if (o.fEnd) f.frequency.exponentialRampToValueAtTime(o.fEnd, t + dur);
    const g = ac.createGain(); const pk = o.vol || .2;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(pk, t + (o.a || .003)); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(o.bus || sfxBus); s.start(t, Math.random() * 1.5); s.stop(t + dur + .05);
  }

  /* ---------- SFX ---------- */
  let listenerX = 0, listenerY = 0;
  function setListener(x, y) { listenerX = x; listenerY = y; }
  function sfx(name, x, y) {
    if (!ac) return;
    let v = 1, pan = 0;
    if (x !== undefined) { const d = dist(x, y, listenerX, listenerY); v = clamp(1 - d / 900, 0, 1); if (v < .04) return; pan = clamp((x - listenerX) / 600, -.8, .8); }
    const t = now(), o = (extra) => Object.assign({ pan }, extra);
    switch (name) {
      case 'punch': noise(t, .12, o({ f: 900, vol: .45 * v })); tone(150, t, .1, o({ slide: 55, vol: .18 * v })); break;
      case 'whoosh': noise(t, .15, o({ ft: 'bandpass', f: 600, fEnd: 2400, vol: .12 * v })); break;
      case 'toto': tone(1200, t, .1, o({ type: 'triangle', slide: 400, vol: .14 * v })); noise(t, .05, o({ ft: 'highpass', f: 4000, vol: .1 * v })); break;
      case 'soak': noise(t, .09, o({ ft: 'bandpass', f: 2600, vol: .09 * v })); break;
      case 'puff': noise(t, .3, o({ ft: 'bandpass', f: 1200, vol: .18 * v })); break;
      case 'coin': tone(988, t, .07, o({ vol: .07 * v })); tone(1319, t + .07, .14, o({ vol: .07 * v })); break;
      case 'cash': [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, t + i * .05, .12, o({ type: 'triangle', vol: .08 * v }))); break;
      case 'crash': noise(t, .35, o({ f: 800, vol: .55 * v })); tone(80, t, .25, o({ type: 'sawtooth', slide: 35, vol: .2 * v })); noise(t + .04, .2, o({ ft: 'highpass', f: 3000, vol: .1 * v })); break;
      case 'thud': noise(t, .15, o({ f: 400, vol: .4 * v })); break;
      case 'break': noise(t, .2, o({ f: 2600, vol: .3 * v })); tone(300, t, .08, o({ type: 'square', slide: 120, vol: .06 * v })); break;
      case 'wood': noise(t, .18, o({ ft: 'bandpass', f: 700, q: 3, vol: .4 * v })); tone(180, t, .12, o({ type: 'triangle', slide: 90, vol: .15 * v })); break;
      case 'glass': for (let i = 0; i < 6; i++) tone(2500 + Math.random() * 3000, t + i * .03, .2, o({ type: 'sine', vol: .05 * v })); noise(t, .3, o({ ft: 'highpass', f: 5000, vol: .2 * v })); break;
      case 'splash': noise(t, .45, o({ ft: 'bandpass', f: 1800, fEnd: 600, vol: .35 * v })); break;
      case 'moo': tone(140, t, .8, o({ type: 'sawtooth', slide: 95, lp: 700, vol: .16 * v, a: .08 })); break;
      case 'cluck': tone(820, t, .05, o({ vol: .06 * v, slide: 560 })); tone(700, t + .08, .06, o({ vol: .06 * v, slide: 500 })); break;
      case 'bark': noise(t, .1, o({ ft: 'bandpass', f: 900, q: 4, vol: .4 * v })); tone(420, t, .09, o({ type: 'sawtooth', slide: 250, lp: 1200, vol: .18 * v })); break;
      case 'bell': tone(2350, t, .35, o({ type: 'sine', vol: .12 * v })); tone(2350 * 1.5, t + .02, .3, o({ type: 'sine', vol: .05 * v })); break;
      case 'beep': tone(780, t, .22, o({ type: 'square', lp: 2000, vol: .09 * v })); tone(980, t + .25, .22, o({ type: 'square', lp: 2000, vol: .09 * v })); break;
      case 'horn': tone(415, t, .35, o({ type: 'sawtooth', lp: 1600, vol: .14 * v })); tone(523, t, .35, o({ type: 'sawtooth', lp: 1600, vol: .11 * v })); break;
      case 'hornBig': tone(155, t, .7, o({ type: 'sawtooth', lp: 900, vol: .2 * v })); tone(196, t, .7, o({ type: 'sawtooth', lp: 900, vol: .15 * v })); break;
      case 'hurt': tone(320, t, .16, o({ type: 'sawtooth', slide: 130, lp: 1500, vol: .14 * v })); break;
      case 'win': [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, t + i * .09, .25, o({ type: 'square', lp: 3000, vol: .07 }))); break;
      case 'lose': [440, 370, 311, 220].forEach((f, i) => tone(f, t + i * .14, .3, o({ type: 'sawtooth', lp: 1500, vol: .08 }))); break;
      case 'alert': tone(880, t, .12, o({ vol: .08 })); tone(1175, t + .14, .14, o({ vol: .08 })); break;
      case 'pickup': tone(660, t, .08, o({ type: 'triangle', vol: .1 })); tone(990, t + .07, .12, o({ type: 'triangle', vol: .1 })); break;
      case 'megaphone': for (let i = 0; i < 5; i++) tone(260 + Math.random() * 180, t + i * .07, .07, o({ type: 'square', lp: 1400, dist: true, vol: .07 * v })); break;
      case 'siren': for (let i = 0; i < 2; i++) { tone(700, t + i * .5, .25, o({ type: 'triangle', vol: .06 * v })); tone(900, t + i * .5 + .25, .25, o({ type: 'triangle', vol: .06 * v })); } break;
      case 'static': noise(t, .35, { ft: 'bandpass', f: 3000, q: .5, vol: .15 }); break;
      case 'thunder': noise(t, 2.8, { f: 260, fEnd: 60, vol: .7, a: .05, rate: .5 }); noise(t, .4, { f: 900, vol: .3 }); break;
      case 'click': tone(1500, t, .03, { type: 'square', vol: .05 }); break;
      case 'clop': noise(t, .045, o({ ft: 'bandpass', f: 1300, q: 6, vol: .22 * v })); noise(t + .09, .04, o({ ft: 'bandpass', f: 1050, q: 6, vol: .16 * v })); break;
      case 'neigh': tone(620, t, .55, o({ type: 'sawtooth', slide: 900, lp: 2200, vol: .09 * v, a: .03 })); tone(880, t + .1, .5, o({ type: 'sawtooth', slide: 420, lp: 2000, vol: .07 * v })); for (let i = 0; i < 6; i++) tone(700 - i * 40, t + .55 + i * .06, .06, o({ type: 'sawtooth', lp: 1800, vol: .05 * v })); break;
      case 'harvest': noise(t, .25, o({ ft: 'bandpass', f: 500, q: 1.5, vol: .3 * v })); tone(95, t, .2, o({ type: 'square', lp: 500, vol: .08 * v })); break;
      case 'buy': tone(1046, t, .06, { vol: .07 }); tone(1568, t + .06, .1, { vol: .07 }); break;
    }
  }

  /* ---------- engine hum for the player's vehicle ---------- */
  function setEngine(kind, speed01) {
    if (!ac) return;
    if (!engine) {
      const o1 = ac.createOscillator(), o2 = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
      o1.type = 'sawtooth'; o2.type = 'triangle'; f.type = 'lowpass'; f.frequency.value = 300; g.gain.value = 0;
      lfo.frequency.value = 9; lg.gain.value = 0; lfo.connect(lg); lg.connect(g.gain);
      o1.connect(f); o2.connect(f); f.connect(g); g.connect(sfxBus); o1.start(); o2.start(); lfo.start();
      engine = { o1, o2, f, g, lfo, lg };
    }
    const e = engine, t = now();
    const P = { none: [0, 0, 0, 0], electric: [220, 900, .025, 0], moped: [70, 260, .05, 12], car: [45, 160, .05, 0], diesel: [28, 70, .08, 7], truck: [32, 90, .08, 5], plane: [55, 150, .085, 26] }[kind] || [0, 0, 0, 0];
    speed01 = Math.min(1.3, speed01);
    const f0 = P[0] + (P[1] - P[0]) * speed01;
    e.o1.frequency.setTargetAtTime(Math.max(20, f0), t, .08); e.o2.frequency.setTargetAtTime(Math.max(20, f0 * .5), t, .08);
    e.f.frequency.setTargetAtTime(kind === 'electric' ? 1400 : 200 + speed01 * 520, t, .1);
    e.g.gain.setTargetAtTime(P[2] * .55 * (kind === 'none' ? 0 : .55 + speed01 * .45), t, .1);
    e.lfo.frequency.setTargetAtTime(P[3] ? P[3] + speed01 * 10 : 1, t, .1); e.lg.gain.setTargetAtTime(P[3] ? P[2] * .5 : 0, t, .1);
    if (kind === 'electric') e.o1.type = 'sine'; else e.o1.type = 'sawtooth';
  }

  /* ---------- ambience: rain, wind, birds, crickets ---------- */
  function loopNoise(ft, f, q) {
    const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const fl = ac.createBiquadFilter(); fl.type = ft; fl.frequency.value = f; fl.Q.value = q || .7;
    const g = ac.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(ambBus); s.start();
    return { s, fl, g };
  }
  function startAmbience() { rain = loopNoise('lowpass', 3200); wind = loopNoise('bandpass', 380, 1.4); }
  let chirpT = 0;
  function ambience(dt, env) { // env: {rain, wind, night, inside}
    if (!ac) return;
    const t = now();
    rain.g.gain.setTargetAtTime(env.rain * .18, t, .5);
    wind.g.gain.setTargetAtTime(env.wind * .22 + .015, t, .5);
    wind.fl.frequency.setTargetAtTime(300 + Math.sin(t * .4) * 120 + env.wind * 200, t, .3);
    chirpT -= dt;
    if (chirpT <= 0 && env.rain < .3) {
      chirpT = rnd(.4, 2.2);
      if (env.night > .6) { // crickets
        const f = rnd(4200, 4800); for (let i = 0; i < 3; i++) tone(f, t + i * .06, .04, { type: 'sine', vol: .012, bus: ambBus, pan: rnd(-.8, .8) });
      } else if (env.night < .4 && env.outdoorsGreen) { // birds
        const f = rnd(2200, 3600), n = rint(2, 5), pan = rnd(-.9, .9);
        for (let i = 0; i < n; i++) tone(f * rnd(.9, 1.15), t + i * .09, .07, { type: 'sine', slide: f * rnd(.7, 1.4), vol: .018, bus: ambBus, pan });
      }
    }
  }

  /* ================================================================
     RADIO — procedural stations
     ================================================================ */
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  const SCALES = {
    harmMinor: [0, 2, 3, 5, 7, 8, 11], dorian: [0, 2, 3, 5, 7, 9, 10], hijaz: [0, 1, 4, 5, 7, 8, 10],
    minPent: [0, 3, 5, 7, 10], phryg: [0, 1, 3, 5, 7, 8, 10], major: [0, 2, 4, 5, 7, 9, 11]
  };
  // drum hits
  function kick(t, v) { tone(150, t, .22, { type: 'sine', slide: 42, vol: .5 * v, bus: musicBus }); }
  function snare(t, v) { noise(t, .16, { ft: 'bandpass', f: 1900, q: .7, vol: .3 * v, bus: musicBus }); tone(210, t, .08, { type: 'triangle', slide: 150, vol: .1 * v, bus: musicBus }); }
  function hat(t, v, open) { noise(t, open ? .18 : .045, { ft: 'highpass', f: 7500, vol: .09 * v, bus: musicBus }); }
  function clap(t, v) { for (let i = 0; i < 3; i++) noise(t + i * .012, .09, { ft: 'bandpass', f: 1300, q: 1.2, vol: .18 * v, bus: musicBus }); }
  function doum(t, v) { tone(105, t, .3, { type: 'sine', slide: 72, vol: .45 * v, bus: musicBus }); }
  function tek(t, v) { noise(t, .05, { ft: 'bandpass', f: 3200, q: 2, vol: .22 * v, bus: musicBus }); tone(900, t, .03, { type: 'triangle', vol: .05 * v, bus: musicBus }); }
  function tamb(t, v) { noise(t, .09, { ft: 'highpass', f: 9000, vol: .07 * v, bus: musicBus }); }

  // instruments: play(note midi, t, durSec, vel)
  const INST = {
    accordion: (n, t, d, v) => { tone(midi(n), t, d, { type: 'square', lp: 2600, vol: .045 * v, vib: 6, vibAmt: .004, sus: 1, a: .02, bus: musicBus, detune: -6 }); tone(midi(n), t, d, { type: 'sawtooth', lp: 2200, vol: .035 * v, sus: 1, a: .02, bus: musicBus, detune: 7 }); },
    oomBass: (n, t, d, v) => tone(midi(n), t, d * .8, { type: 'triangle', vol: .2 * v, bus: musicBus }),
    clav: (n, t, d, v) => tone(midi(n), t, Math.min(d, .16), { type: 'square', lp: 3000, lpEnd: 700, q: 4, vol: .06 * v, bus: musicBus }),
    slap: (n, t, d, v) => { tone(midi(n), t, Math.min(d, .25), { type: 'sawtooth', lp: 1400, lpEnd: 200, q: 6, vol: .2 * v, bus: musicBus }); },
    strings: (n, t, d, v) => { tone(midi(n), t, d, { type: 'sawtooth', lp: 1800, vol: .025 * v, a: .12, sus: 1, bus: musicBus, detune: 8 }); tone(midi(n), t, d, { type: 'sawtooth', lp: 1800, vol: .025 * v, a: .12, sus: 1, bus: musicBus, detune: -8 }); },
    oud: (n, t, d, v) => { tone(midi(n), t, Math.min(d * 1.4, .6), { type: 'sawtooth', lp: 2400, lpEnd: 500, q: 2, vol: .09 * v, bus: musicBus }); },
    qanun: (n, t, d, v) => { tone(midi(n), t, .35, { type: 'triangle', vol: .07 * v, bus: musicBus }); tone(midi(n + 12), t, .2, { type: 'sine', vol: .03 * v, bus: musicBus }); },
    subBass: (n, t, d, v) => tone(midi(n), t, d * .95, { type: 'sine', vol: .26 * v, sus: 1, bus: musicBus }),
    powerChord: (n, t, d, v) => { [0, 7, 12].forEach(i => tone(midi(n + i), t, d * .95, { type: 'sawtooth', lp: 3200, dist: true, vol: .04 * v, sus: 1, bus: musicBus, detune: rnd(-8, 8) })); },
    leadGtr: (n, t, d, v) => tone(midi(n), t, d * 1.1, { type: 'sawtooth', lp: 3500, dist: true, vol: .05 * v, vib: 5.5, vibAmt: .008, sus: 1, a: .01, bus: musicBus }),
    rockBass: (n, t, d, v) => tone(midi(n), t, d * .9, { type: 'square', lp: 700, vol: .14 * v, bus: musicBus }),
    acid: (n, t, d, v, ph) => tone(midi(n), t, d * .9, { type: 'sawtooth', lp: 300 + 2600 * (.5 + .5 * Math.sin(ph || 0)), lpEnd: 250, q: 14, vol: .07 * v, bus: musicBus }),
    rollBass: (n, t, d, v) => tone(midi(n), t, d * .8, { type: 'sawtooth', lp: 600, lpEnd: 150, q: 3, vol: .16 * v, bus: musicBus }),
    pad: (n, t, d, v) => tone(midi(n), t, d, { type: 'triangle', vol: .05 * v, a: .4, sus: 1, bus: musicBus }),
    bells: (n, t, d, v) => { tone(midi(n), t, .8, { type: 'sine', vol: .07 * v, bus: musicBus }); tone(midi(n) * 2.76, t, .4, { type: 'sine', vol: .02 * v, bus: musicBus }); },
  };

  // melody generator: returns array of {s:step, n:note, l:len} over `bars` bars of 16 steps
  function genMelody(rng, scale, root, chordsDeg, bars, density, range) {
    const notes = []; const deg2n = d => { const o = Math.floor(d / scale.length); return root + scale[((d % scale.length) + scale.length) % scale.length] + 12 * o; };
    let d = rng.int(0, 4);
    for (let b = 0; b < bars; b++) {
      const chord = chordsDeg[b % chordsDeg.length];
      for (let s = 0; s < 16;) {
        const strong = s % 4 === 0;
        if (rng() < (strong ? density + .2 : density)) {
          if (strong && rng() < .6) { const ct = [0, 2, 4][rng.int(0, 2)] + chord; d = ct + 7 * Math.round((d - ct) / 7); }
          else d += rng.pick([-2, -1, -1, 1, 1, 2, 3, -3]);
          d = clamp(d, -2, range || 9);
          const l = rng.pick(strong ? [2, 2, 4, 3] : [1, 2, 2]);
          notes.push({ s: b * 16 + s, n: deg2n(d), l }); s += l;
        } else s += rng.pick([1, 2]);
      }
    }
    return notes;
  }
  const deg = (scale, root, d) => { const o = Math.floor(d / scale.length); return root + scale[((d % scale.length) + scale.length) % scale.length] + 12 * o; };

  const STATIONS = [
    { id: 'hora', name: 'רדיו הורה FM', tag: 'מעגלים, אקורדיון, וגעגועים', col: '#ffcf5a', bpm: 150, scale: 'harmMinor', root: 57, prog: [0, 0, 3, 4, 0, 0, 4, 0], density: .55,
      drums: (s, t, v) => { if (s % 4 === 0) doum(t, v * .6); if (s % 8 === 4) tek(t, v); if (s % 2 === 1) tamb(t, v * .6); },
      bass: (s, ch, t, d, R, S) => { if (s % 4 === 0) INST.oomBass(deg(S, R - 12, ch), t, d * 2, 1); if (s % 4 === 2) INST.oomBass(deg(S, R - 12, ch + 4), t, d * 2, .8); },
      chords: (s, ch, t, d, R, S) => { if (s % 4 === 2) [0, 2, 4].forEach(i => INST.accordion(deg(S, R, ch + i), t, d * 1.5, .35)); },
      lead: 'accordion' },
    { id: 'funk', name: 'גלגלי הקיבוץ 88.8', tag: 'פאנק מהשבעים, ישר מהמקלט', col: '#ff8fd0', bpm: 112, scale: 'dorian', root: 52, prog: [0, 0, 3, 3, 0, 0, 4, 3], density: .5,
      drums: (s, t, v) => { if (s % 4 === 0) kick(t, v); if (s % 8 === 4) snare(t, v); if (s % 4 === 2) hat(t, v, true); else hat(t, v * .5); if (s === 14) kick(t, v * .7); },
      bass: (s, ch, t, d, R, S) => { const pat = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1]; if (pat[s]) INST.slap(deg(S, R - 12, ch) + (s % 8 === 6 ? 12 : 0), t, d * 2, 1); },
      chords: (s, ch, t, d, R, S) => { if ([2, 5, 10, 13].includes(s)) [0, 2, 4, 6].forEach(i => INST.clav(deg(S, R + 12, ch + i), t, d, .5)); },
      lead: 'strings' },
    { id: 'mizrahi', name: 'רדיו ים-תיכוני', tag: 'מזרחית בלי הפסקה', col: '#5fd3c8', bpm: 98, scale: 'hijaz', root: 62, prog: [0, 0, 6, 0, 3, 0, 6, 0], density: .7,
      drums: (s, t, v) => { const D = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0], T = [0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0]; if (D[s] || s === 8) doum(t, v); if (T[s]) tek(t, v); if (s % 2) tek(t, v * .25); },
      bass: (s, ch, t, d, R, S) => { if (s === 0 || s === 6 || s === 8) INST.oomBass(deg(S, R - 24, ch), t, d * 3, 1); },
      chords: (s, ch, t, d, R, S) => { if (s % 8 === 0) INST.strings(deg(S, R - 12, ch), t, d * 8, .8); },
      lead: 'oud' },
    { id: 'rock', name: 'רוק עברי 103', tag: 'גיטרות, זיעה, ומעגל מתופפים', col: '#ff6b4a', bpm: 132, scale: 'minPent', root: 52, prog: [0, 0, 3, 2, 0, 0, 4, 3], density: .45,
      drums: (s, t, v) => { if (s === 0 || s === 8 || s === 10) kick(t, v); if (s === 4 || s === 12) snare(t, v * 1.1); if (s % 2 === 0) hat(t, v * .6); },
      bass: (s, ch, t, d, R, S) => { if (s % 2 === 0) INST.rockBass(deg(S, R - 12, ch), t, d * 2, 1); },
      chords: (s, ch, t, d, R, S) => { if (s === 0 || s === 6 || s === 12) INST.powerChord(deg(S, R - 12, ch), t, d * (s === 12 ? 4 : 6), .9); },
      lead: 'leadGtr' },
    { id: 'trance', name: 'פסיכדלי FM', tag: 'גואה מגיעה לרפת', col: '#b07bff', bpm: 142, scale: 'phryg', root: 45, prog: [0, 0, 0, 0, 1, 1, 0, 6], density: .4,
      drums: (s, t, v) => { if (s % 4 === 0) kick(t, v * 1.2); if (s % 4 === 2) hat(t, v, true); if (s % 8 === 4) clap(t, v * .7); if (s % 2) hat(t, v * .3); },
      bass: (s, ch, t, d, R, S) => { if (s % 4 !== 0) INST.rollBass(deg(S, R - 12, ch), t, d, 1); },
      chords: (s, ch, t, d, R, S, bar) => { if (s % 2 === 0 && bar % 4 >= 2) INST.acid(deg(S, R + 12, ch + [0, 2, 4, 7, 4, 2, 0, 1][(s / 2) % 8]), t, d * 1.6, .9, (bar * 16 + s) / 12); },
      lead: 'acid' },
    { id: 'talk', name: 'קול העלון', tag: 'חדשות ופרסומות מהמזכירות, באהבה', col: '#9fd8ff', bpm: 84, scale: 'major', root: 60, prog: [0, 3, 4, 0], density: .2, talk: true,
      drums: () => { }, bass: (s, ch, t, d, R, S) => { if (s === 0) INST.pad(deg(S, R - 12, ch), t, d * 16, .6); },
      chords: (s, ch, t, d, R, S) => { if (s === 0) [0, 2, 4].forEach(i => INST.pad(deg(S, R, ch + i), t, d * 16, .4)); }, lead: 'bells' },
  ];
  const TALK = [
    'הודעה מהמזכירות: מי שלקח את הקלנועית של רחל מול חדר האוכל, נא להחזיר. היא רואה הכל.',
    'מזג האוויר: חם. מחר: חם. בשבוע הבא: גם כן חם, אבל עם שרב.',
    'פרסומת: צרכניית הקיבוץ! מבצע על קוטג׳, רק לחברים ותיקים, ורק עד שמונה בבוקר.',
    'ועדת תרבות מזכירה: ערב שירה בציבור ביום חמישי. נא להביא כיסא. וסבלנות.',
    'דיווח תנועה: טרקטור איטי בכביש הגישה. וגם מהיר. תלוי מי נוהג.',
    'חדשות הרפת: הפרה שוש הניבה שמונה ושלושים ליטר. כל הכבוד שוש!',
    'הודעה דחופה: מישהו נסע שוב על הדשא הגדול. האסיפה תדון בזה ביום ראשון.',
    'פרסומת: מוסך שלומי. אנחנו לא שואלים שאלות. גם לא עונים.',
    'הודעה מהמטבח: היום שניצל. מחר שניצל. יום שישי? הפתעה. שניצל.',
    'הנוער מזמין את כולם למסיבה במקלט. ההורים פחות מוזמנים.',
    'חדשות הלול: שש תרנגולות נמלטו הבוקר. החשודות עדיין בחופש.',
    'ועד הקיבוץ מבקש להזכיר: ההגה של הקלנועית הוא לא צעצוע. גם לא הצופר.',
    'האקונומית מבקשת: מי שנכנס אתמול דרך החלון, לפחות תסגור אחריך.',
    'סידור העבודה למחר: גיוס אבוקדו. כולם. כן, גם אתה.',
    'הקומונה: מכנסיים עם מספר כביסה 214 הגיעו לחדר הלא נכון. שוב.',
    'ועדת תרבות: ערב שירה בציבור. נא להביא כיסא, פרודוקטים וסבלנות.',
    'חדשות הרפת: הפרה שוש נבחרה לוועדת ביקורת.',
    'ועדת קליטה מזכירה: מועמדים, אסור לכם לנסוע על הדשא. גם לחברים אסור, אבל להם לא אומרים.',
    'מהמנחת: מטוס הריסוס יעבור מחר מעל השדות המזרחיים. מי שתולה כביסה, שיכניס.',
    'מהאורווה: הסוס הלבן שוב ברח לדשא הגדול. הנויניק כבר יודע.',
  ];

  let station = 0, radioOn = true, nextStep = 0, step = 0, song = null, talkQueue = 0, subtitle = null, subT = 0;
  let heVoice = null, voicesChecked = false;
  function findVoice() {
    if (voicesChecked || !window.speechSynthesis) return; const vs = speechSynthesis.getVoices(); if (!vs.length) return;
    voicesChecked = true; heVoice = vs.find(v => /he/i.test(v.lang)) || null;
  }
  function newSong() {
    const st = STATIONS[station]; const rng = RNG((Math.random() * 1e9) | 0); const S = SCALES[st.scale];
    const A = genMelody(rng, S, st.root, st.prog, 4, st.density, 9), B = genMelody(rng, S, st.root + (st.id === 'trance' ? 12 : 0), st.prog.slice(4).concat(st.prog.slice(0, 4)), 4, st.density + .1, 10);
    song = { A, B, form: ['A', 'A', 'B', 'A'], S, transpose: 0 };
  }
  function setStation(i) { station = (i + STATIONS.length) % STATIONS.length; step = 0; nextStep = now() + .1; newSong(); sfx('static'); talkQueue = 2; if (window.speechSynthesis) speechSynthesis.cancel(); }
  function radioTick(inVehicle) {
    if (!ac) return; findVoice();
    const on = inVehicle && radioOn;
    musicBus.gain.setTargetAtTime(on ? vol.music : 0, now(), .25);
    if (!on) { if (window.speechSynthesis && speechSynthesis.speaking) speechSynthesis.cancel(); return; }
    if (!song) newSong();
    const st = STATIONS[station], sd = 60 / st.bpm / 4, S = song.S;
    if (nextStep < now() - .2) nextStep = now() + .05;
    while (nextStep < now() + .2) {
      const bar = Math.floor(step / 16), s = step % 16, sec = song.form[Math.floor(bar / 4) % 4], phr = sec === 'A' ? song.A : song.B;
      const ch = st.prog[bar % st.prog.length], t = nextStep, v = 1;
      st.drums(s, t, v); st.bass(s, ch, t, sd, st.root, S); st.chords(s, ch, t, sd, st.root, S, bar);
      if (!st.talk || bar % 8 >= 6) {
        const local = (bar % 4) * 16 + s;
        for (const nt of phr) if (nt.s === local) INST[st.lead](nt.n + (st.id === 'mizrahi' && Math.random() < .1 ? 1 : 0), t, nt.l * sd, .9, step / 10);
        if (st.id === 'mizrahi' && s % 4 === 3 && Math.random() < .3) INST.qanun(deg(S, st.root + 12, ch + rint(0, 4)), t, sd, .6);
      }
      if (st.talk && s === 0 && bar % 8 === 0) speak();
      step++; nextStep += sd * (s % 2 === 1 ? .94 : 1.06) * (st.id === 'funk' ? 1 : 1) ; // light swing
      if (step % (16 * 16) === 0) newSong();
    }
    if (subtitle) { subT -= 1 / 60; if (subT <= 0) subtitle = null; }
  }
  function speak() {
    const line = pick(TALK); subtitle = line; subT = 9;
    INST.bells(84, now(), .3, 1); INST.bells(88, now() + .15, .3, 1); INST.bells(91, now() + .3, .3, 1);
    if (window.speechSynthesis && heVoice) {
      const u = new SpeechSynthesisUtterance(line); u.voice = heVoice; u.lang = heVoice.lang; u.rate = 1.05; u.pitch = .9; u.volume = vol.music;
      setTimeout(() => { if (radioOn) speechSynthesis.speak(u); }, 700);
    }
  }

  return {
    init, sfx, setListener, setEngine, ambience, radioTick, setStation,
    get ready() { return !!ac; },
    get station() { return STATIONS[station]; }, get stationIndex() { return station; }, STATIONS,
    toggleRadio() { radioOn = !radioOn; return radioOn; }, get radioOn() { return radioOn; },
    get subtitle() { return STATIONS[station].talk && radioOn ? subtitle : null; },
    vol, applyVol() { if (!ac) return; master.gain.value = vol.master; sfxBus.gain.value = vol.sfx; },
  };
})();
