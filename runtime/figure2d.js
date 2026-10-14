// A figure in kimono, drawn on a 2-D canvas: NAMI's Plum Blossom people (gardenart.js drawPerson, v3.18), ported so
// any renderer can draw the Figure box's command. About 1.6 m tall at NAMI's scale; front = facing you, else seen from
// behind. Outfits: an Edo-period palette with the patterns you see all through ukiyo-e: asanoha (hemp-leaf star),
// seigaiha (waves), ichimatsu (chequers), kikko (tortoiseshell), stripes, fine dots.
const SKIN = '#ecd2b0', HAIR = '#1d1a1c', INK = '#16213b';      // (NAMI's ink: a blue-black)
// [ground colour, pattern, pattern colour, sash, haori jacket colour or null]  (outfit 1..14; 0 = the figure's own colours)
export const OUTFITS = [
  ['#2d4b7d', 'asanoha', '#a9c0d8', '#e7c76a', null],
  ['#6b4a35', 'stripes', '#a8835c', '#2a2420', '#2b2a30'],
  ['#3f5d55', 'dots', '#c9d6c6', '#9b2c2c', null],
  ['#8a2f2a', 'seigaiha', '#e3b9a4', '#e9dcb8', null],
  ['#4a4a55', 'check', '#6f6f7c', '#c7a45a', '#22242b'],
  ['#5d3f5f', 'kikko', '#b49cb4', '#e7c76a', null],
  ['#2a3f63', 'stripes', '#7f97b8', '#d9d2c0', null],
  ['#7a5a3a', 'dots', '#d8bf94', '#2d4b7d', '#3b2e26'],
  ['#3d5f7a', 'seigaiha', '#b9d0de', '#9b2c2c', null],
  ['#6e2e3a', 'asanoha', '#d9a9a6', '#2a2a2a', null],
  ['#56603e', 'kikko', '#aab38a', '#b2362e', '#2e3324'],
  ['#c06a3a', 'check', '#9a4f28', '#2d4b7d', null],
  ['#384a3e', 'plain', null, '#d9b85f', '#1f2622'],
  ['#9c7a4c', 'stripes', '#5e4a30', '#6e2e3a', null],
  ['#3a4a5c', 'plain', null, '#ece6d6', '#24262d'],             // 15: the tea-house keeper's dark haori (wear with an apron)
];
const TILE = 40, TILE_UNITS = 0.26;              // one pattern repeat is about a quarter of a metre (a hand's width)
function patternTile(type, base, fg) {
  const c = document.createElement('canvas'); c.width = c.height = TILE;
  const x = c.getContext('2d'), T = TILE;
  x.fillStyle = base; x.fillRect(0, 0, T, T);
  x.strokeStyle = fg; x.fillStyle = fg; x.lineWidth = 2;
  if (type === 'stripes') { for (const sx of [6, 20, 26]) x.fillRect(sx, 0, sx === 20 ? 5 : 2, T); }
  else if (type === 'check') { x.fillRect(0, 0, T / 2, T / 2); x.fillRect(T / 2, T / 2, T / 2, T / 2); }
  else if (type === 'dots') { for (const [dx, dy] of [[10, 10], [30, 30], [30, 10], [10, 30], [20, 20]]) { x.beginPath(); x.arc(dx, dy, dx === 20 ? 2.5 : 1.8, 0, Math.PI * 2); x.fill(); } }
  else if (type === 'seigaiha') {
    for (const [cx, cy] of [[0, T], [T, T], [T / 2, T / 2], [0, 0], [T, 0]]) for (const rr of [T * 0.48, T * 0.34, T * 0.2]) { x.beginPath(); x.arc(cx, cy, rr, Math.PI, 0); x.stroke(); }
  } else if (type === 'kikko') {
    x.lineWidth = 1.6; const h = T / 2;
    x.beginPath(); x.moveTo(T * 0.25, 0); x.lineTo(T * 0.75, 0); x.moveTo(T * 0.75, 0); x.lineTo(T, h); x.lineTo(T * 0.75, T); x.lineTo(T * 0.25, T); x.lineTo(0, h); x.lineTo(T * 0.25, 0); x.stroke();
  } else if (type === 'asanoha') {
    x.lineWidth = 1.2; const m = T / 2;
    x.beginPath();
    for (const [px, py] of [[0, 0], [T, 0], [0, T], [T, T], [m, 0], [m, T], [0, m], [T, m]]) { x.moveTo(m, m); x.lineTo(px, py); }
    for (const [px, py] of [[0, 0], [T, 0], [0, T], [T, T]]) { x.moveTo(px, py); x.lineTo(m, py === 0 ? T * 0.25 : T * 0.75); }
    x.stroke();
  }
  return c;
}
const cloths = new WeakMap();                    // canvas context -> outfit number -> its patterned cloth
function cloth(ctx, i) {
  let m = cloths.get(ctx);
  if (!m) cloths.set(ctx, (m = new Map()));
  if (!m.has(i)) {
    const [base, type, fg] = OUTFITS[i];
    let fill = base;
    if (type !== 'plain') {
      fill = ctx.createPattern(patternTile(type, base, fg), 'repeat');
      if (fill && fill.setTransform && typeof DOMMatrix === 'function') fill.setTransform(new DOMMatrix([TILE_UNITS / TILE, 0, 0, TILE_UNITS / TILE, 0, 0]));
      else fill = base;                                                    // (no pattern support: plain cloth)
    }
    m.set(i, fill);
  }
  return m.get(i);
}

// a small woven basket (bottom centre at bx, by, in the figure's units), with blossom showing over the rim
function basketShape(ctx, bx, by, count) {
  ctx.strokeStyle = '#7a5a3a'; ctx.lineWidth = 0.025; ctx.beginPath(); ctx.arc(bx, by - 0.16, 0.1, Math.PI, 0); ctx.stroke();   // handle
  for (let i = 0; i < Math.min(count, 9); i++) {
    const a = (i * 2.39) % 6.28, rr = 0.03 + (i % 3) * 0.025;
    ctx.fillStyle = '#fdf8f0'; ctx.beginPath(); ctx.arc(bx + Math.cos(a) * rr * 1.6, by - 0.17 - Math.abs(Math.sin(a)) * rr, 0.035, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#c9a55f'; ctx.beginPath(); ctx.moveTo(bx - 0.12, by - 0.16); ctx.lineTo(bx + 0.12, by - 0.16); ctx.lineTo(bx + 0.09, by); ctx.lineTo(bx - 0.09, by); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(110,80,40,0.7)'; ctx.lineWidth = 0.012;
  ctx.beginPath(); for (let k = -3; k <= 3; k++) { ctx.moveTo(bx + k * 0.03, by - 0.16); ctx.lineTo(bx + k * 0.025, by); } ctx.moveTo(bx - 0.11, by - 0.08); ctx.lineTo(bx + 0.11, by - 0.08); ctx.stroke();
  ctx.strokeStyle = INK; ctx.lineWidth = 0.018; ctx.beginPath(); ctx.moveTo(bx - 0.12, by - 0.16); ctx.lineTo(bx + 0.12, by - 0.16); ctx.lineTo(bx + 0.09, by); ctx.lineTo(bx - 0.09, by); ctx.closePath(); ctx.stroke();
}

/** Draw a Figure command `f` standing at screen (x, y) (its feet), `px` = screen pixels per scene unit there. */
export function drawFigure(ctx, x, y, px, f, alpha = 1) {
  const s = px * (f.height / 1.6), o = f.outfit >= 1 && f.outfit <= OUTFITS.length ? OUTFITS[f.outfit - 1] : null;
  const robe = o ? cloth(ctx, f.outfit - 1) : f.robe, obi = o ? o[3] : f.sash, haori = o ? o[4] : null;
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(30,60,45,0.22)'; ctx.beginPath(); ctx.ellipse(0, 0, 0.35, 0.08, 0, 0, Math.PI * 2); ctx.fill();   // shadow
  const bob = Math.abs(Math.sin(f.step * Math.PI)) * 0.03, sway = Math.sin(f.step * Math.PI) * 0.03;
  ctx.translate(sway, -bob);
  // bowing (or bending to pick something up): fold forward from the hips: the top half dips and shortens
  const bow = Math.max(f.bow, Math.min(1, f.bend * 1.25));
  ctx.lineJoin = 'round';
  ctx.fillStyle = robe; ctx.beginPath(); ctx.moveTo(-0.24, 0); ctx.lineTo(0.24, 0); ctx.lineTo(0.2, -0.75); ctx.lineTo(-0.2, -0.75); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 0.025; ctx.stroke();
  if (haori) { ctx.fillStyle = haori; ctx.fillRect(-0.205, -0.75, 0.41, 0.24); ctx.strokeRect(-0.205, -0.75, 0.41, 0.24); }   // the jacket's hem
  if (f.apron) { ctx.fillStyle = '#ece6d6'; ctx.fillRect(-0.15, -0.74, 0.3, 0.6); ctx.strokeRect(-0.15, -0.74, 0.3, 0.6); }    // a keeper's apron
  ctx.save(); ctx.translate(0, -0.75); ctx.rotate(f.idle * 0.035); ctx.scale(1, 1 - 0.35 * bow); ctx.translate(0, 0.12 * bow);   // (idle: shifting weight)
  ctx.fillStyle = haori || robe; ctx.beginPath(); ctx.moveTo(-0.2, 0); ctx.lineTo(0.2, 0); ctx.lineTo(0.17, -0.55); ctx.lineTo(-0.17, -0.55); ctx.closePath(); ctx.fill(); ctx.stroke();
  if (haori) { ctx.strokeStyle = 'rgba(230,220,200,0.6)'; ctx.lineWidth = 0.02; ctx.beginPath(); ctx.moveTo(-0.08, -0.5); ctx.lineTo(0, -0.2); ctx.lineTo(0.08, -0.5); ctx.stroke(); }   // the jacket's open front
  else { ctx.fillStyle = obi; ctx.fillRect(-0.2, -0.22, 0.4, 0.13); }
  const look = f.look;                                                                          // -1 left .. 1 right
  ctx.fillStyle = f.front ? SKIN : HAIR; ctx.beginPath(); ctx.arc(f.front ? look * 0.035 : 0, -0.68, 0.12, 0, Math.PI * 2); ctx.fill();
  if (!f.front && Math.abs(look) > 0.12) {
    // turning the head, seen from behind: a sliver of cheek slides in at the edge of the head, clipped to it
    const k = Math.min(1, (Math.abs(look) - 0.12) / 0.6), side = Math.sign(look);
    ctx.save(); ctx.beginPath(); ctx.arc(0, -0.68, 0.12, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = SKIN; ctx.beginPath(); ctx.ellipse(side * (0.165 - 0.08 * k), -0.665, 0.06, 0.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // the hair turns with the head
  const hairX = f.front ? look * 0.035 : -look * 0.02, bunX = f.front ? look * 0.035 : -look * 0.035;
  ctx.fillStyle = HAIR; ctx.beginPath(); ctx.arc(hairX, f.front ? -0.74 : -0.7, 0.12, Math.PI, 0); ctx.fill();
  ctx.beginPath(); ctx.arc(bunX, -0.84, 0.07, 0, Math.PI * 2); ctx.fill();                       // hair bun
  if (f.ornament) { ctx.fillStyle = '#c4473a'; ctx.beginPath(); ctx.arc(bunX + 0.07, -0.87, 0.028, 0, Math.PI * 2); ctx.fill(); }   // a hairpin
  ctx.restore();
  if (f.basket) basketShape(ctx, 0.31, -0.42, f.blossoms);           // a basket hanging at her side
  ctx.restore();
}
