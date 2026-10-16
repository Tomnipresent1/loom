// Draws the Puppy (Autumn) on a 2-D canvas from her pose (engine/quadruped.js, PUPPY build): far legs a shade darker,
// a stubby wagging tail, a round body with a pale chest, chunky legs and round paws, a big head with a snout and a dark
// nose, floppy ears that bounce, a round eye with a glint (blinking), and her tongue out when she runs or play-bows.
const TAU = Math.PI * 2;

/** sx, sy: the screen spot under her (her z is in it); s: pixels per scene unit there; d: the 'dog' draw command. */
export function drawDog(g, sx, sy, s, d, alpha) {
  const P = d.pose, k = s * d.scale;
  if (alpha <= 0.01 || !P) return;
  const coat = d.colour, dark = shade(coat, 0.72), chest = d.chest, ear = d.ears;
  g.save();
  g.globalAlpha = alpha;
  g.translate(sx, sy);
  g.scale(k * d.facing, -k);
  const line = (pts, w, col) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const q of pts.slice(1)) g.lineTo(q.x, q.y); g.stroke(); };
  const leg = (l, col) => { line([l.top, l.knee, l.paw], l.which === 'hind' ? 7 : 6.5, col); g.fillStyle = col; g.beginPath(); g.ellipse(l.paw.x + 1.5, l.paw.y + 1.8, 3.8, 2.3, 0, 0, TAU); g.fill(); };
  for (const l of P.legs) if (!l.near) leg(l, dark);
  for (let i = 1; i < P.tail.length; i++) line([P.tail[i - 1], P.tail[i]], 6 - i * 1.1, coat);
  // the body: round and soft, a pale chest
  const H = P.hip, S = P.shoulder, M = P.spine;
  g.fillStyle = coat; g.beginPath();
  g.moveTo(H.x - 6, H.y);
  g.quadraticCurveTo(M.x, M.y + 9, S.x + 4, S.y + 6);
  g.quadraticCurveTo(S.x + 10, S.y - 2, S.x + 4, S.y - 9);
  g.quadraticCurveTo(M.x, M.y - 14, H.x - 3, H.y - 9);
  g.quadraticCurveTo(H.x - 11, H.y - 4, H.x - 6, H.y);
  g.closePath(); g.fill();
  g.fillStyle = chest; g.beginPath(); g.ellipse(S.x + 4, S.y - 2, 5, 7, 0.3, 0, TAU); g.fill();
  for (const l of P.legs) if (l.near) leg(l, coat);
  // the head: big and round, a snout, a nose, a floppy ear that bounces, an eye, the tongue
  const h = P.head, bounce = Math.sin(P.legs[0].paw.x * 0.3) * 0.15;
  g.save(); g.translate(h.x, h.y); g.rotate(h.tilt);
  g.fillStyle = coat; g.beginPath(); g.arc(0, 0, 9.5, 0, TAU); g.fill();
  g.fillStyle = chest; g.beginPath(); g.ellipse(8, -3.5, 5.6, 4.2, -0.1, 0, TAU); g.fill();            // snout
  g.fillStyle = '#2a1c18'; g.beginPath(); g.ellipse(13, -2, 2.2, 1.7, 0, 0, TAU); g.fill();              // nose
  g.strokeStyle = '#5a3a2c'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(12, -4.2); g.quadraticCurveTo(9, -7, 6.5, -5.5); g.stroke();   // mouth
  if (d.tongue) { g.fillStyle = '#e07a8a'; g.beginPath(); g.ellipse(8.5, -8, 2.2, 3.4, 0.2, 0, TAU); g.fill(); }
  if (P.blink) { g.strokeStyle = '#2a1c18'; g.lineWidth = 1; g.beginPath(); g.moveTo(1.5, 2.4); g.lineTo(5.5, 2.2); g.stroke(); }
  else {
    g.fillStyle = '#2a1c18'; g.beginPath(); g.arc(3.6, 2.6, 2.1, 0, TAU); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(4.2, 3.3, 0.7, 0, TAU); g.fill();                       // a glint
  }
  g.fillStyle = ear; g.beginPath();                                                                         // the floppy ear
  g.save(); g.translate(-3.5, 6); g.rotate(-0.35 + bounce);
  g.ellipse(-1.5, -6, 4, 7.5, 0.15, 0, TAU); g.fill();
  g.restore();
  g.restore();
  g.restore();
}

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16), ch = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${ch((n >> 16) & 255)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}
