// Draws a Cat (Autumn's black cat) on a 2-D canvas from her pose (engine/cat.js): far legs a shade darker, a tapering
// tail, the body as one soft shape (arched when startled), ears, an almond eye that blinks, a few whiskers, and a faint
// sheen along her back so black fur still reads against dark ground.
const TAU = Math.PI * 2;

/** sx, sy: the screen spot under her; s: pixels per scene unit there; d: the 'cat' draw command. */
export function drawCat(g, sx, sy, s, d, alpha) {
  const P = d.pose, k = s * d.scale;
  if (alpha <= 0.01 || !P) return;
  const fur = d.colour, dark = shade(fur, 0.6), sheen = shade(fur, 2.1);
  g.save();
  g.globalAlpha = alpha;
  g.translate(sx, sy);
  if (d.slope) g.rotate(-d.slope);                         // (on a sloping branch, all of her tilts with it, paws on it)
  g.scale(k * d.facing, -k);
  const line = (pts, w, col) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const q of pts.slice(1)) g.lineTo(q.x, q.y); g.stroke(); };
  const leg = (l, col) => { line([l.top, l.knee, l.paw], l.which === 'hind' ? 6.5 : 5.5, col); g.fillStyle = col; g.beginPath(); g.ellipse(l.paw.x + 1.2, l.paw.y + 1.3, 3.2, 1.8, 0, 0, TAU); g.fill(); };
  // far legs, then the tail (tapering; puffed up when startled)
  for (const l of P.legs) if (!l.near) leg(l, dark);
  for (let i = 1; i < P.tail.length; i++) line([P.tail[i - 1], P.tail[i]], (4.6 - i * 0.35) * P.puff, fur);
  // the body: from her haunch to her chest, rounded, a little arched along the back
  const H = P.hip, S = P.shoulder, M = P.spine;
  g.fillStyle = fur; g.beginPath();
  g.moveTo(H.x - 6, H.y + 1);
  g.quadraticCurveTo(M.x, M.y + 8, S.x + 4, S.y + 5);
  g.quadraticCurveTo(S.x + 9, S.y - 2, S.x + 4, S.y - 8);
  g.quadraticCurveTo(M.x, M.y - 13 + P.arch * 5, H.x - 3, H.y - 8);
  g.quadraticCurveTo(H.x - 10, H.y - 4, H.x - 6, H.y + 1);
  g.closePath(); g.fill();
  g.strokeStyle = sheen; g.lineWidth = 1.2; g.globalAlpha = alpha * 0.45; g.beginPath();
  g.moveTo(H.x - 5, H.y + 1.5); g.quadraticCurveTo(M.x, M.y + 8, S.x + 3, S.y + 5); g.stroke();
  g.globalAlpha = alpha;
  // near legs
  for (const l of P.legs) if (l.near) leg(l, fur);
  // the head: round, a muzzle, two ears, an eye, whiskers
  const h = P.head;
  g.save(); g.translate(h.x, h.y); g.rotate(h.tilt);
  g.fillStyle = fur; g.beginPath(); g.arc(0, 0, 8.5, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(6.5, -2.5, 4.5, 3.6, 0, 0, TAU); g.fill();                 // muzzle
  for (const [ex, lean] of [[-4.5, -0.25], [2, 0.2]]) {                               // ears (the far one a touch darker)
    g.fillStyle = ex < 0 ? dark : fur;
    g.beginPath(); g.moveTo(ex - 3, 6); g.lineTo(ex + 1 + lean * 6, 14.5); g.lineTo(ex + 4.5, 5); g.closePath(); g.fill();
  }
  g.fillStyle = shade(fur, 0.55); g.beginPath(); g.moveTo(2.7, 7); g.lineTo(3.4 + 0.2 * 6, 12); g.lineTo(5, 6.3); g.closePath(); g.fill();   // inside the near ear
  if (d.pose.blink) { g.strokeStyle = d.eyes; g.lineWidth = 0.9; g.beginPath(); g.moveTo(1.5, 1.6); g.lineTo(5.5, 1.3); g.stroke(); }
  else {
    g.fillStyle = d.eyes; g.beginPath(); g.ellipse(3.6, 1.6, 2.3, 1.5, -0.15, 0, TAU); g.fill();
    g.fillStyle = '#0b0a0c'; g.beginPath(); g.ellipse(3.9, 1.6, 0.55, 1.35, 0, 0, TAU); g.fill();     // a slit pupil
  }
  g.fillStyle = '#3a2a2e'; g.beginPath(); g.arc(10.6, -1.6, 0.9, 0, TAU); g.fill();                    // nose
  g.strokeStyle = sheen; g.lineWidth = 0.4; g.globalAlpha = alpha * 0.6; g.beginPath();
  for (const [dy, len] of [[-2.2, 8], [-3.6, 7], [-1, 7]]) { g.moveTo(8.5, dy); g.lineTo(8.5 + len, dy + (dy + 2.2) * 0.8 - 0.4); }
  g.stroke();
  g.restore();
  g.restore();
}

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16), ch = (v) => Math.max(0, Math.min(255, Math.round(v * f + (f > 1 ? 10 * (f - 1) : 0))));
  return `rgb(${ch((n >> 16) & 255)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}
