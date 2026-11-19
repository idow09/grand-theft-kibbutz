'use strict';
/* ================================================================
   env.js — day/night cycle and weather (clear, clouds, rain,
   hamsin dust storm, morning fog)
   ================================================================ */
const DAY_MINUTES = 16; // real minutes per game day
const ENV = { time: 8.5, day: 1, rain: 0, wet: false, wind: .2, windX: 1, windY: .2, hamsin: 0, fog: 0, clouds: .25, night: 0, sunX: 0, sunY: 0, shadowLen: 1, shadowA: .3, weather: 'clear', target: { rain: 0, hamsin: 0, fog: 0, clouds: .25 }, nextChange: 70, flash: 0, thunderT: 0, cloudList: [] };
const WEATHERS = {
  clear: { rain: 0, hamsin: 0, fog: 0, clouds: .15, name: 'בהיר' },
  cloudy: { rain: 0, hamsin: 0, fog: 0, clouds: .75, name: 'מעונן חלקית' },
  rain: { rain: 1, hamsin: 0, fog: .15, clouds: 1, name: 'גשם' },
  hamsin: { rain: 0, hamsin: 1, fog: 0, clouds: 0, name: 'שרב' },
  fog: { rain: 0, hamsin: 0, fog: 1, clouds: .3, name: 'ערפל בוקר' },
};
function setWeather(w, instant) {
  ENV.weather = w; ENV.target = Object.assign({}, WEATHERS[w]);
  if (instant) Object.assign(ENV, { rain: ENV.target.rain, hamsin: ENV.target.hamsin, fog: ENV.target.fog, clouds: ENV.target.clouds });
  if (window.G && G.msg && !instant) G.msg('מזג האוויר: ' + WEATHERS[w].name, '#bfe3ff');
}
function envTick(dt) {
  ENV.time += dt * 24 / (DAY_MINUTES * 60);
  if (ENV.time >= 24) { ENV.time -= 24; ENV.day++; }
  const t = ENV.time;
  ENV.night = t < 4.5 || t > 21 ? 1 : t < 6.5 ? 1 - smoothstep(4.5, 6.5, t) : t > 18.5 ? smoothstep(18.5, 21, t) : 0;
  const ang = (t - 6) / 12 * Math.PI, elev = Math.max(0, Math.sin(ang));
  ENV.sunX = -Math.cos(ang); ENV.sunY = -.45; // shadow direction (opposite the sun)
  ENV.shadowLen = clamp(.35 + (1 - elev) * 1.4, .35, 1.9);
  // weather transitions
  ENV.nextChange -= dt;
  if (ENV.nextChange <= 0) {
    ENV.nextChange = rnd(100, 200);
    const r = Math.random(); let w = r < .42 ? 'clear' : r < .66 ? 'cloudy' : r < .83 ? 'rain' : r < .95 ? 'hamsin' : 'fog';
    if (w === 'fog' && (t > 10 && t < 20)) w = 'cloudy';
    if (w !== ENV.weather) setWeather(w);
  }
  const k = Math.min(1, dt * .08);
  for (const key of ['rain', 'hamsin', 'fog', 'clouds']) ENV[key] += (ENV.target[key] - ENV[key]) * k;
  ENV.wet = ENV.rain > .35;
  ENV.wind = .2 + ENV.hamsin * .9 + ENV.rain * .4;
  const wa = Math.sin(G.time * .01) * .6 + .3; ENV.windX = Math.cos(wa); ENV.windY = Math.sin(wa) * .4;
  ENV.shadowA = .3 * (1 - ENV.night) * (1 - ENV.clouds * .45) * (1 - ENV.rain * .5) * (1 - ENV.hamsin * .5);
  // lightning
  if (ENV.rain > .7 && Math.random() < dt * .04) { ENV.flash = 1; ENV.thunderT = rnd(.4, 1.6); }
  if (ENV.thunderT > 0) { ENV.thunderT -= dt; if (ENV.thunderT <= 0) Audio2.sfx('thunder'); }
  ENV.flash = Math.max(0, ENV.flash - dt * 3);
  // cloud shadows drift over the world around the camera
  const cl = ENV.cloudList, want = Math.round(ENV.clouds * 14);
  while (cl.length < want) cl.push({ x: CAM.x + rnd(-1800, 1800), y: CAM.y + rnd(-1400, 1400), r: rnd(180, 420), s: rnd(.5, 1) });
  if (cl.length > want && Math.random() < dt) cl.shift();
  for (const c of cl) { c.x += ENV.windX * 22 * dt * (1 + ENV.wind); c.y += ENV.windY * 22 * dt; if (Math.abs(c.x - CAM.x) > 2200 || Math.abs(c.y - CAM.y) > 1800) { c.x = CAM.x - ENV.windX * 1900 + rnd(-300, 300); c.y = CAM.y + rnd(-1400, 1400); } }
}
function clockStr() { const h = Math.floor(ENV.time), m = Math.floor((ENV.time - h) * 60); return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m; }
