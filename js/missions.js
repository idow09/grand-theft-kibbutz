'use strict';
/* ================================================================
   missions.js — three factions with story chains + repeatable jobs
   ================================================================ */
const FACT = {
  cow: { n: 'הרפתנים', boss: 'שאולי מהרפת', c: '#e0a95a', rival: 'youth' },
  youth: { n: 'הנוער', boss: 'עומרי מהמקלט', c: '#4db8f0', rival: 'kitchen' },
  kitchen: { n: 'צוות המטבח', boss: 'צביה מהמטבח', c: '#f26b95', rival: 'cow' },
};
const Missions = (() => {
  const chain = { cow: 0, youth: 0, kitchen: 0 };
  const pt = n => { const p = POI[n]; return p ? { x: p.x, y: p.y, n } : { x: MAP.hub[0], y: MAP.hub[1], n: 'חדר האוכל' }; };
  const P0 = () => Player.veh || Player;
  const near = (m, r) => dist(P0().x, P0().y, m.x, m.y) < (r || 40);
  const anyPOI = (not, from, minD) => { const ok = MAP.pois.filter(p => !/קומביין/.test(p.name) && (!not || !not.includes(p.name)) && (!from || dist(p.x, p.y, from.x, from.y) > (minD || 0))); const p = pick(ok.length ? ok : MAP.pois); return { x: p.x, y: p.y, n: p.name }; };

  /* ---------- generic builders ---------- */
  function deliver(o) {
    let stage = 0;
    return Object.assign({ time: o.time, reward: o.reward,
      markers: () => [stage === 0 ? o.from : o.to],
      hud: () => stage === 0 ? `לך ל${o.from.n} לאסוף: ${o.item}` : `הבא את ה${o.item} ל${o.to.n}`,
      update() {
        if (stage === 0 && near(o.from)) { stage = 1; G.msg(`אספת: ${o.item}. עכשיו ל${o.to.n}!`, '#ffe14a'); Audio2.sfx('pickup'); if (o.onPick) o.onPick(); }
        else if (stage === 1 && near(o.to)) return 'done';
      } }, o);
  }
  function race(o) {
    let i = 0;
    return Object.assign({
      markers: () => [o.pts[i], o.pts[i + 1]].filter(Boolean).map((p, k) => Object.assign({ dim: k > 0 }, p)),
      hud: () => `נקודה ${i + 1}/${o.pts.length}` + (o.veh && (!Player.veh || Player.veh.type !== o.veh) ? ` · צריך ${VT[o.veh].name}!` : ''),
      update() { if (o.veh && (!Player.veh || Player.veh.type !== o.veh)) return; if (near(o.pts[i], 46)) { i++; Audio2.sfx('coin'); if (i >= o.pts.length) return 'done'; } } }, o);
  }
  function chickens(o) {
    const cs = [];
    for (let k = 0; k < o.n; k++) { const a = Math.random() * TAU, r = rnd(250, 700); const x = MAP.KC[0] + Math.cos(a) * r, y = MAP.KC[1] + Math.sin(a) * r * .8; if (solidAt(x, y, 6)) { k--; continue; } const c = mkPed('chicken', x, y); c.mission = true; c.persistent = true; c.v = 0; cs.push(c); }
    let caught = 0;
    return Object.assign({ markers: () => cs.filter(c => !c.caught), hud: () => `נתפסו: ${caught}/${o.n}`,
      update() { for (const c of cs) { if (c.caught) continue; const r = Player.veh ? Player.veh.d.L / 2 + 4 : 13; if (dist(c.x, c.y, P0().x, P0().y) < r) { c.caught = true; caught++; Audio2.sfx('cluck', c.x, c.y); FX.burst(c.x, c.y, ['#fff', '#eee'], 10, 70, 3); removePed(c); G.addScore(15, c.x, c.y, true); } }
        if (caught >= o.n) return 'done'; },
      cleanup() { for (const c of cs) removePed(c); } }, o);
  }
  function koCount(o) {
    let n = 0;
    return Object.assign({ markers: () => [], hud: () => `${o.what}: ${n}/${o.n}`, onKO(p, how) { if (!o.how || o.how.includes(how)) n++; }, update() { if (n >= o.n) return 'done'; },
      start() { if (o.give) for (const k in o.give) Player.inv[k] += o.give[k]; if (o.wp) Player.wp = o.wp; } }, o);
  }
  function destroyCount(o) {
    let n = 0;
    return Object.assign({ markers: () => o.where ? [o.where] : [], hud: () => `${o.what}: ${n}/${o.n}`, onDestroy(p) { if (!o.filter || o.filter(p)) n++; }, update() { if (n >= o.n) return 'done'; } }, o);
  }
  function escape(o) {
    let stage = 0;
    return Object.assign({ markers: () => [], hud: () => stage === 0 ? `עצבן את הזקנים עד רמת רוגז ${o.lvl}` : 'עכשיו תתחמק! הרוגז צריך לרדת ל-0',
      update() { if (stage === 0 && G.level >= o.lvl) { stage = 1; G.msg('עכשיו תתחמק מהם!', '#ffe14a'); Audio2.sfx('alert'); } if (stage === 1 && G.level === 0) return 'done'; } }, o);
  }
  function stealBring(o) {
    const v = o.spawn(); v.mission = true; v.persistent = true; let got = false;
    return Object.assign({ markers: () => [got && Player.veh === v ? o.to : Object.assign({ x: v.x, y: v.y, n: o.what }, {})],
      hud: () => !got ? `מצא את ${o.what}` : Player.veh === v ? `הבא את ${o.what} ל${o.to.n}` : `חזור ל${o.what}!`,
      onEnter(vv) { if (vv === v && !got) { got = true; if (o.onSteal) o.onSteal(v); } },
      update() { if (v.dead) return 'fail:' + o.what + ' התקלקל'; if (got && Player.veh === v && near(o.to, 50)) return 'done'; },
      cleanup() { v.mission = false; } }, o);
  }
  function herdCow(o) {
    let c = null;
    for (let t = 0; t < 40 && !c; t++) { const f = pick(MAP.fields.filter(f => f.reg === 'ne' || f.reg === 'nw')); const x = f.c[0], y = f.c[1]; if (dist(x, y, MAP.pen.x, MAP.pen.y) > 700 && dist(x, y, MAP.pen.x, MAP.pen.y) < 1500 && !solidAt(x, y, 18)) { c = mkPed('cow', x, y); } }
    if (!c) c = mkPed('cow', MAP.pen.x + 900, MAP.pen.y - 300);
    c.mission = true; c.persistent = true; c.state = 'held'; c.v = 2;
    return Object.assign({ markers: () => [c, { x: MAP.pen.x, y: MAP.pen.y, n: 'הרפת', dim: true }], hud: () => `הובל את שוש לרפת (${Math.round(dist(c.x, c.y, MAP.pen.x, MAP.pen.y))} מ')`,
      update(dt) {
        const p = P0(), d = dist(c.x, c.y, p.x, p.y), push = Player.veh ? 170 : 110;
        if (d < push) { const k = (push - d) / push, dx = c.x - p.x, dy = c.y - p.y, l = Math.hypot(dx, dy) || 1; c.vx += dx / l * 260 * k * dt; c.vy += dy / l * 260 * k * dt; if (Math.random() < dt * .6) { Audio2.sfx('moo', c.x, c.y); say(c, pick(['מוווו!', 'מו?!', 'מוווו...']), 1.2); } }
        else { c.vx += rnd(-20, 20) * dt; c.vy += rnd(-20, 20) * dt; }
        const sp = Math.hypot(c.vx, c.vy); if (sp > 75) { c.vx *= 75 / sp; c.vy *= 75 / sp; }
        c.vx *= Math.exp(-1.2 * dt); c.vy *= Math.exp(-1.2 * dt); c.x += c.vx * dt; c.y += c.vy * dt; if (sp > 3) c.a += angDiff(c.a, Math.atan2(c.vy, c.vx)) * Math.min(1, dt * 4); c.walk += sp * dt * .1;
        collideStatic(c, c.r);
        if (dist(c.x, c.y, MAP.pen.x, MAP.pen.y) < 150) { c.state = 'graze'; c.pen = MAP.pen.poly; c.mission = false; return 'done'; }
      } }, o);
  }

  /* ---------- story chains ---------- */
  const CH = {
    cow: [
      { title: 'הפרה שוש ברחה', brief: 'שוש שוב ברחה מהרפת! היא מסתובבת באחד השדות בצפון. תדחוף אותה חזרה לרפת — פרות בורחות ממך, אז תגיע מהצד הנכון.', make: () => herdCow({ time: 240, reward: 350 }) },
      { title: 'חלב לצומת', brief: 'המכלית צריכה להגיע לצומת לפני שהחלב מחמיץ. ותביא אותה שלמה — הקיבוץ לא יקנה עוד אחת.', make: () => { const mt = vehicles.find(v => v.type === 'milktruck' && !v.dead) || mkVeh('milktruck', POI['הרפת'].x + 60, POI['הרפת'].y + 80, 0); mt.persistent = true; let fail = null;
          return { time: 200, reward: 450, markers: () => [Player.veh === mt ? pt('תחנת הדלק') : { x: mt.x, y: mt.y, n: 'המכלית' }], hud: () => Player.veh === mt ? `סע לצומת · נזק ${Math.round(100 - mt.hp / mt.d.hp * 100)}% (מקסימום 40%)` : 'היכנס למכלית החלב', update() { if (mt.hp < mt.d.hp * .6) return 'fail:המכלית נפגעה יותר מדי'; if (Player.veh === mt && near(pt('תחנת הדלק'), 60)) return 'done'; } }; } },
      { title: 'מבצע קומביין', brief: 'הוועד השאיל את הקומביין שלנו לשדה הצפוני ולא החזיר. תביא אותו למוסך של שלומי. הוא איטי, אבל שום דבר לא עוצר אותו.', make: () => stealBring({ what: 'הקומביין', to: pt('מוסך שלומי'), time: 330, reward: 700, spawn: () => MAP.combineVeh && !MAP.combineVeh.dead ? MAP.combineVeh : mkVeh('combine', POI['הקומביין'].x, POI['הקומביין'].y, 0), onSteal: () => { G.heat = Math.max(G.heat, 3.2); G.msg('רכז המשק ראה אותך לוקח את הקומביין!', '#ff9b6b'); } }) },
      { title: 'הסולארי של הוועד', brief: 'הוועד שם פאנלים סולאריים בשדה שהיה מיועד להרחבת הרפת. אני לא אומר לך מה לעשות. אבל יש שם טרקטור.', make: () => destroyCount({ what: 'פאנלים שנשברו', n: 20, time: 180, reward: 900, filter: p => p.t === 'solar', where: pt('השדה הסולארי') }) },
    ],
    youth: [
      { title: 'רמקולים למסיבה', brief: 'אחי, הרמקולים בבית העם ואנחנו בבריכה. יש לך דקה וחצי לפני שהאווירה מתה.', make: () => deliver({ from: pt('בית העם'), to: pt('הבריכה'), item: 'רמקולים', time: 100, reward: 280 }) },
      { title: 'מלחמת מים', brief: 'מלחמת מים כמו פעם! הפל 8 אנשים עם מים — בלונים או רובה. הנה תחמושת.', make: () => koCount({ what: 'נרטבו', n: 8, how: ['balloon', 'soaker'], give: { balloon: 12, soaker: 20 }, wp: 'balloon', time: 100, reward: 380 }) },
      { title: 'בורחים מהקב"ט', brief: 'יש לנו הימור עם החבר\'ה מהקיבוץ השכן. תעצבן את הוועד עד שלוש דרגות רוגז — ותברח.', make: () => escape({ lvl: 3, time: 260, reward: 550 }) },
      { title: 'מרוץ טוסטוסים', brief: 'המרוץ השנתי! קח את הטוסטוס ליד המקלט ותעבור בכל הנקודות. דרך החורשה, דרך הוואדי. אל תתהפך.', make: () => { const s = pt('המקלט'); const sc = mkVeh('scooter', s.x + 20, s.y + 20, 0, '#ff5a3a'); sc.persistent = true; const names = ['החורשה', 'תחנת הדלק', 'השדה הסולארי', 'מגרש הכדורגל', 'מפעל השימורים', 'החניון', 'פינת החי', 'המקלט']; const pts = names.map(n => POI[n] ? pt(n) : null).filter(Boolean); return race({ pts, veh: 'scooter', time: 230, reward: 750 }); } },
    ],
    kitchen: [
      { title: 'שניצל חם', brief: 'סיר שניצלים להרחבה. אם הוא מגיע קר, אני יודעת מי אשם.', make: () => deliver({ from: pt('חדר האוכל'), to: pt('ההרחבה'), item: 'סיר שניצלים', time: 80, reward: 280 }) },
      { title: 'תרנגולות במנוסה', brief: 'מישהו השאיר את הלול פתוח. שש תרנגולות מסתובבות בקיבוץ. בלי ביצים אין שקשוקה!', make: () => chickens({ n: 6, time: 140, reward: 380 }) },
      { title: 'הקלנועית של שושנה', brief: 'שושנה מהבריכה חייבת לי כבר שנתיים. תביא לי את הקלנועית האדומה שלה לדלת האחורית של המטבח. היא תצעק. תתעלם.', make: () => { const pp = pt('הבריכה'); const ph = MAP.phones.find(p => p.f === 'kitchen'); return stealBring({ what: 'הקלנועית של שושנה', to: { x: ph.x, y: ph.y, n: 'דלת המטבח' }, time: 200, reward: 480, spawn: () => mkVeh('kalnoit', pp.x + 30, pp.y + 10, 0, '#c0392b'), onSteal: v => { const s = mkPed('elder', v.x + 20, v.y); s.state = 'chase'; say(s, 'זאת הקלנועית שלי!', 2.5); G.heat = Math.max(G.heat, 3.1); } }); } },
      { title: 'קוטג\' מהצומת', brief: 'הצרכנייה ריקה. יש קוטג\' במרכול בצומת. הוועד אסר על קניות מבחוץ, אז הם ירדפו אחריך. תביא את הארגזים לחדר האוכל.', make: () => deliver({ from: pt('תחנת הדלק'), to: pt('חדר האוכל'), item: 'ארגזי קוטג\'', time: 220, reward: 900, onPick: () => { G.heat = Math.max(G.heat, 5.6); } }) },
    ],
  };
  const REPEAT = [
    f => { const a = anyPOI(null, P0(), 300), b = anyPOI([a.n], a, 900); const T = { cow: ['ארגז חלב', 'משלוח חלב'], youth: ['ציוד למסיבה', 'משלוח דחוף'], kitchen: ['סיר מרק', 'אוכל חם'] }[f]; return deliver({ title: T[1], desc: `מ${a.n} ל${b.n}`, from: a, to: b, item: T[0], time: Math.round(dist(a.x, a.y, b.x, b.y) / 85 + dist(P0().x, P0().y, a.x, a.y) / 85 + 30), reward: 260 }); },
    f => { const pts = []; let last = P0(); for (let i = 0; i < 6; i++) { const p = anyPOI(pts.map(q => q.n), last, 350); pts.push(p); last = p; } let tot = 0, l = P0(); for (const p of pts) { tot += dist(p.x, p.y, l.x, l.y); l = p; } return race({ title: 'מרוץ נגד השעון', desc: 'עבור בכל הנקודות לפי הסדר', pts, time: Math.round(tot / 120 + 20), reward: 400 }); },
    f => chickens({ title: 'עוד תרנגולות ברחו', desc: 'תפוס 5 תרנגולות', n: 5, time: 110, reward: 320 }),
    f => destroyCount({ title: 'בלגן כללי', desc: 'שבור 25 דברים תוך 90 שניות', what: 'נשבר', n: 25, time: 90, reward: 400 }),
    f => escape({ title: 'תעשה רעש', desc: 'עצבן את הוועד עד 2 ותתחמק', lvl: 2, time: 200, reward: 350 }),
  ];
  function call(ph) {
    const f = ph.f, list = CH[f], i = chain[f];
    let def, story = true;
    if (G.respect[f] < -30) { G.phoneCall = { who: FACT[f].boss, text: 'אתה עוד מעז להתקשר? אחרי מה שעשית בשביל המתחרים? עזוב אותנו.', col: FACT[f].c, life: 6 }; return; }
    if (i < list.length) def = list[i]; else { story = false; const mk = pick(REPEAT); def = { title: null, brief: null, make: () => mk(f) }; }
    const rt = def.make(); rt.title = rt.title || def.title; rt.brief = def.brief || rt.desc; rt.fac = f; rt.story = story; rt.t = rt.time;
    if (rt.start) rt.start();
    G.mission = rt; G.phoneCall = { who: FACT[f].boss, text: rt.brief, col: FACT[f].c, life: 9 };
    G.bigBanner(rt.title, '', FACT[f].c, 2.2); Audio2.sfx('alert');
  }
  function end(ok, why) {
    const m = G.mission; if (!m) return; if (m.cleanup) m.cleanup(); G.mission = null;
    if (ok) {
      G.money += m.reward; G.respect[m.fac] = Math.min(100, G.respect[m.fac] + 20); const rv = FACT[m.fac].rival; G.respect[rv] = Math.max(-100, G.respect[rv] - 6);
      if (m.story) chain[m.fac]++;
      const allDone = Object.keys(CH).every(k => chain[k] >= CH[k].length);
      G.bigBanner('משימה הושלמה!', `+${m.reward} ₪ · כבוד אצל ${FACT[m.fac].n}` + (m.story && chain[m.fac] === CH[m.fac].length ? ' · הסיפור של ' + FACT[m.fac].n + ' הושלם!' : ''), '#9be26b');
      Audio2.sfx('win');
      if (allDone && !G.done.all) { G.done.all = 1; setTimeout(() => G.bigBanner('מלך הקיבוץ!', 'השלמת את כל הסיפורים. הוועד מכנס אסיפת חירום', '#ffd84a', 6), 3500); G.money += 5000; }
      Save.save();
    } else { G.respect[m.fac] = Math.max(-100, G.respect[m.fac] - 5); G.bigBanner('המשימה נכשלה', why || '', '#ff8a8a'); Audio2.sfx('lose'); }
  }
  function tick(dt) {
    const m = G.mission; if (!m || Player.out > 0) return;
    m.t -= dt; const r = m.update(dt);
    if (r === 'done') end(true); else if (r && r.startsWith('fail')) end(false, r.slice(5)); else if (m.t <= 0) end(false, 'נגמר הזמן');
  }
  function fail(why) { if (G.mission) end(false, why); }
  // hostile factions throw tomatoes
  let tomT = 0;
  function hostileTick(dt) {
    tomT -= dt; if (tomT > 0) return; tomT = .5;
    const typeFor = { cow: 'worker', youth: 'teen', kitchen: 'cook' };
    for (const f in FACT) { if (G.respect[f] > -25) continue; for (const p of peds) { if (p.type !== typeFor[f] || p.state === 'ko' || p.veh) continue; const d = dist(p.x, p.y, P0().x, P0().y); if (d < 200 && d > 40 && Math.random() < .35) { Combat.throwTomato(p); say(p, 'בוגד!', 1.2); } } }
  }
  return { call, tick, fail, hostileTick, CH, chainState: () => Object.assign({}, chain), loadChain(s) { if (s) Object.assign(chain, s); }, get chain() { return chain; } };
})();
