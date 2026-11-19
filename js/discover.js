'use strict';
/* ================================================================
   discover.js — make sure players find the good stuff.
   - every feature is ticked off the first time the player actually uses it
   - while things are calm, an occasional tip suggests one untried feature,
     with an arrow and distance to where it is
   - the "שווה לנסות" menu page lists everything with ✓ marks
   Progress lives in localStorage and survives "new game" (it's about the player, not the save).
   ================================================================ */
const Discover = (() => {
  const near = f => { let b = null, bd = 1e9; for (const o of f()) { const d = dist(Player.x, Player.y, o.x, o.y); if (d < bd) { bd = d; b = o; } } return b; };
  const vehOf = t => () => vehicles.filter(v => !v.dead && t(v));
  // id, icon, short name, tip (keyboard), tip (touch), where it is, has the player done it
  const FEATS = [
    { id: 'plane', ic: '✈️', n: 'לטוס במטוס הריסוס', tip: 'במנחת מחכה מטוס ריסוס. גז עד הסוף על המסלול כדי להמריא, F לרסס', tt: 'במנחת מחכה מטוס ריסוס. גז עד הסוף על המסלול כדי להמריא, אדום = ריסוס', at: vehOf(v => v.d.plane), done: v => v && v.d.plane && v.alt > .3 },
    { id: 'combine', ic: '🌾', n: 'לקצור עם הקומביין', tip: 'בשדות עומד קומביין. T מפעיל את הפרטיקוף והוא קוצר הכל, כולל חבילות קש', tt: 'בשדות עומד קומביין. כפתור PTO מפעיל את הפרטיקוף והוא קוצר הכל', at: vehOf(v => v.type === 'combine'), done: v => v && v.type === 'combine' && v.pto },
    { id: 'horse', ic: '🐎', n: 'לרכוב על סוס', tip: 'באורווה יש סוסים. אפשר לרכוב, רק לא על הדשא', tt: 'באורווה יש סוסים. אפשר לרכוב, רק לא על הדשא', at: vehOf(v => v.d.horse && !v.driver), done: v => v && v.d.horse },
    { id: 'reverse', ic: '🚜', n: 'רוורס עם עגלה', tip: 'טרקטור + G מחבר עגלה. עכשיו נסו להיכנס איתה ברוורס. בהצלחה', tt: 'טרקטור + כפתור וו מחבר עגלה. עכשיו נסו להיכנס איתה ברוורס. בהצלחה', at: vehOf(v => v.type === 'trailer'), done: (v, s) => s.revT > 2 },
    { id: 'plow', ic: '🪶', n: 'לחרוש עם אנפות', tip: 'טרקטור + מחרשה (G), ואז T להוריד אותה. תראו מי מגיע לאכול תולעים', tt: 'טרקטור + מחרשה (וו), ואז PTO להוריד אותה. תראו מי מגיע לאכול תולעים', at: vehOf(v => v.type === 'plow'), done: v => v && MAP.plowing && MAP.plowing.towedBy === v },
    { id: 'radio', ic: '📻', n: 'להאזין לקול העלון', tip: 'ברכב, R מחליף תחנה. נסו את "קול העלון", החדשות של המזכירות', tt: 'ברכב, 📻 מחליף תחנה. נסו את "קול העלון", החדשות של המזכירות', at: null, done: v => v && v.d.radio && Audio2.station.talk },
    { id: 'phone', ic: '☎️', n: 'לקחת משימה מטלפון', tip: 'הטלפונים הצבעוניים במפה הם משימות. כל קבוצה בקיבוץ רוצה ממך משהו', tt: 'הטלפונים הצבעוניים במפה הם משימות. כל קבוצה בקיבוץ רוצה ממך משהו', at: () => MAP.phones, done: () => !!G.mission },
    { id: 'cows', ic: '🐄', n: 'לשחרר את הפרות', tip: 'הגדר של המכלאה ברפת לא כזאת חזקה. הפרות רק מחכות להזדמנות', tt: 'הגדר של המכלאה ברפת לא כזאת חזקה. הפרות רק מחכות להזדמנות', at: () => MAP.pen ? [MAP.pen] : [], done: () => MAP.pen && MAP.pen.open },
    { id: 'rampage', ic: '💥', n: 'בלגן נגד השעון', tip: 'הסמלים הסגולים הם "בלגן": משימת הרס קצרה נגד השעון', tt: 'הסמלים הסגולים הם "בלגן": משימת הרס קצרה נגד השעון', at: () => Pickups.items.filter(i => i.alive && i.t === 'rampage'), done: () => !!G.rampage },
    { id: 'garage', ic: '🔧', n: 'להיעלם במוסך', tip: 'מישהו כועס עליך? עוצרים במוסך של שלומי והרוגז נמחק', tt: 'מישהו כועס עליך? עוצרים במוסך של שלומי והרוגז נמחק', at: () => MAP.sprays, done: (v, s) => s.garage },
    { id: 'laundry', ic: '🧺', n: 'למצוא מספר כביסה', tip: 'בקיבוץ מפוזרים 12 מספרי כביסה אבודים. הקומונרית מחכה להם', tt: 'בקיבוץ מפוזרים 12 מספרי כביסה אבודים. הקומונרית מחכה להם', at: null, done: () => Object.keys(G.eggs).length > 0 },
  ];
  const KEY = 'gtk-discover';
  let st = { tried: {}, hinted: {} };
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s) st = { tried: s.tried || {}, hinted: s.hinted || {} }; } catch (e) { }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { } };
  const S = { revT: 0, garage: false };
  let calmT = 0, nextAt = 45, cur = null;

  function markGarage() { S.garage = true; }
  function tick(dt) {
    const v = Player.veh;
    // reversing with a trailer on the hook
    if (v && v.hitch && v.hitch.type === 'trailer' && v.vx * Math.cos(v.a) + v.vy * Math.sin(v.a) < -12) S.revT += dt; else S.revT = Math.max(0, S.revT - dt * .5);
    for (const f of FEATS) {
      if (st.tried[f.id] || !f.done(v, S)) continue;
      st.tried[f.id] = 1; save(); track('found-' + f.id);
      if (cur && cur.f === f) cur.life = Math.min(cur.life, .6);
      G.msg(`✓ ${f.n} (${count()}/${FEATS.length} שווה לנסות)`, '#9be26b');
    }
    if (cur) { cur.life -= dt; if (cur.life <= 0) cur = null; }
    // tips only when nothing else is asking for attention
    const calm = G.state === 'play' && !G.mission && !G.rampage && !G.phoneCall && !G.shopMenu && !G.banner && G.level === 0 && Player.out <= 0 && !(v && v.alt > .05);
    if (!calm) return;
    calmT += dt;
    if (calmT < nextAt || cur) return;
    const f = FEATS.filter(f => !st.tried[f.id] && (st.hinted[f.id] || 0) < 2).sort((a, b) => (st.hinted[a.id] || 0) - (st.hinted[b.id] || 0))[0];
    nextAt = calmT + 100;
    if (!f) return;
    st.hinted[f.id] = (st.hinted[f.id] || 0) + 1; save();
    cur = { f, life: 9 }; Audio2.sfx('click');
  }
  function draw() {
    if (!cur || G.state !== 'play') return;
    const f = cur.f, tch = TOUCH.on, w = Math.min(460, VW - 24), x = VW / 2 - w / 2, text = tch ? f.tt : f.tip;
    const lines = wrap(text, w - 96, 14), h = 34 + lines.length * 19, y = tch ? Math.max(14, VH * .2) : VH * .17;
    ctx.globalAlpha = Math.min(1, cur.life * 1.5, (9 - cur.life) * 3);
    panel(x, y, w, h, .82, 12); ctx.fillStyle = '#ffd84a'; ctx.fillRect(x + w - 6, y + 10, 3, h - 20);
    T(`💡 שווה לנסות: ${f.n}`, x + w - 16, y + 17, 14, '#ffd84a', 'right', { stroke: false });
    lines.forEach((l, i) => T(l, x + w - 16, y + 38 + i * 19, 14, '#eef3f6', 'right', { stroke: false }));
    // where is it: arrow + distance
    const o = f.at && near(f.at);
    if (o) {
      const a = Math.atan2(o.y - Player.y, o.x - Player.x), cx = x + 38, cy = y + h / 2 - 6, d = dist(Player.x, Player.y, o.x, o.y);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a); ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(-8, -9); ctx.lineTo(-3, 0); ctx.lineTo(-8, 9); ctx.closePath(); ctx.fill(); ctx.restore();
      T(d < 60 ? 'כאן!' : `${Math.round(d / 7 / 10) * 10} מ׳`, cx, y + h - 12, 12, '#cfe', 'center', { stroke: false });
    } else T(f.ic, x + 38, y + h / 2, 24, '#fff', 'center', { stroke: false });
    ctx.globalAlpha = 1;
  }
  const count = () => FEATS.filter(f => st.tried[f.id]).length;
  // menu page
  function drawPage() {
    const short = VH < 560, rh = short ? 22 : 30, w = Math.min(520, VW - 24), x = VW / 2 - w / 2, top = short ? 46 : 64;
    const h = top + FEATS.length * rh + (short ? 8 : 20), y = Math.max(8, Math.min(VH * .1, VH - 80 - h));
    panel(x, y, w, h, .86, 14);
    T(`שווה לנסות · ${count()}/${FEATS.length}`, VW / 2, y + (short ? 22 : 30), short ? 18 : 22, '#ffd84a', 'center');
    FEATS.forEach((f, i) => {
      const yy = y + top + i * rh, ok = st.tried[f.id];
      T(`${f.ic}  ${f.n}`, x + w - 20, yy, short ? 14 : 16, ok ? '#9be26b' : '#fff', 'right', { stroke: false });
      T(ok ? '✓' : '?', x + 24, yy, short ? 16 : 18, ok ? '#9be26b' : '#667', 'center', { stroke: false });
    });
  }
  return { tick, draw, drawPage, markGarage, count, FEATS };
})();
