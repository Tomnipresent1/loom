// Draws a red squirrel (Autumn) from its 'squirrel' draw command, side-on, cartoon-cute: a red-brown body with a pale
// belly, a round head with a bright eye and tufted ears, and a big bushy tail. Poses: run (bounding: gathered, hind feet
// landing ahead of the front, then stretched out; phase 0..1), sit (up on its haunches, the tail curled up its back in an
// S, nibbling a nut held in its paws), climb (the run turned upright on the trunk: up = 1 head up, -1 head down), cling
// (still on the trunk, usually head down, watching), leap (stretched out, the tail streaming). nut: an acorn in its mouth
// (or paws, sitting). flick: a twitch of the tail. tilt: the slope of the branch it's on. Also its knot-hole on the trunk.
const TAU = Math.PI * 2;

/** sx, sy: the screen spot at its paws; s: pixels per scene unit there; d: the 'squirrel' draw command. */
export function drawSquirrel(g, sx, sy, s, d, alpha) {
  const k = s * d.scale;
  if (alpha <= 0.01 || k < 0.02) return;
  const C = { fur: d.fur, dark: shade(d.fur, 0.7), deep: shade(d.fur, 0.52), tail: shade(d.fur, 1.12), glow: shade(d.fur, 1.32), belly: d.belly };
  g.save();
  g.globalAlpha = alpha;
  g.translate(sx, sy);
  if (d.tilt) g.rotate(-d.tilt);
  g.scale(k * (d.facing || 1), -k);
  g.lineCap = 'round'; g.lineJoin = 'round';
  if (d.pose === 'sit') sitting(g, d, C);
  else if (d.pose === 'climb' || d.pose === 'cling') {
    g.translate(0, 6); g.rotate((d.up || 1) * Math.PI / 2); g.translate(0, -6);          // (turned upright about its middle)
    running(g, d.pose === 'cling' ? 0.3 : d.phase, d, C, d.pose === 'cling' && (d.up || 1) < 0 ? 0.5 : 0);
  } else if (d.pose === 'leap') { g.rotate(Math.max(-0.7, Math.min(0.7, d.lean || 0))); running(g, 0.5, d, C, 0, true); }
  else running(g, d.phase, d, C, d.bend ? 0.9 : 0);
  g.restore();
}

// bounding: g = how gathered (1: hind feet forward under it, back arched; 0: stretched out, off the ground)
function running(g, phase, d, C, look, leap = false) {
  const gat = leap ? 0 : 0.5 + 0.5 * Math.cos(phase * TAU), lift = leap ? 1 : 2.2 * (1 - gat), y = 6.4 + lift;
  // the tail first (behind everything): streaming back and up in a soft S
  const wave = Math.sin(phase * TAU) * 1.5, fl = d.flick || 0;
  tail(g, C, leap
    ? [[-7, y + 1], [-13, y + 3], [-19, y + 3.5], [-24, y + 4.5 + fl * 2]]
    : [[-7, y + 1.5], [-12, y + 7 + wave], [-18, y + 9 + wave * 0.5], [-20, y + 13 + fl * 2.5]]);
  // far legs (darker), then the body, then near legs
  const hindX = leap ? -11 : -9 + 13 * gat, frontX = leap ? 12 : 10 - 11 * gat, footUp = (x) => (lift > 1 ? lift * 0.6 : 0);
  legs(g, C.deep, hindX + 1.2, frontX - 1, y, footUp(), gat);
  g.fillStyle = C.fur;
  g.beginPath(); g.ellipse(0, y, 8 + 2.6 * (1 - gat), 4.4 + 0.9 * gat, -0.08 * gat, 0, TAU); g.fill();     // the body
  g.fillStyle = C.dark; g.beginPath(); g.ellipse(-5 + 2 * gat, y - 0.5, 4, 3.6, 0, 0, TAU); g.fill();      // the haunch
  g.fillStyle = C.belly; g.beginPath(); g.ellipse(2, y - 2.6, 5.5, 1.8, 0.05, 0, TAU); g.fill();           // the belly
  legs(g, C.dark, hindX, frontX, y, footUp(), gat);
  head(g, C, 9.6 + (1 - gat) * 1.2, y + 2.4 - look * 3, look ? -0.5 * look : 0.1 * (1 - gat), d.nut, false);
}
function legs(g, col, hindX, frontX, y, up, gat) {
  g.strokeStyle = col;
  g.lineWidth = 2.4; g.beginPath(); g.moveTo(-4.5 + 2 * gat, y - 1.5); g.lineTo(hindX, up + 0.8); g.lineTo(hindX + 2.6, up + 0.4); g.stroke();   // hind: long feet
  g.lineWidth = 1.7; g.beginPath(); g.moveTo(5.5, y - 1); g.lineTo(frontX, up + 0.6); g.stroke();                                              // front
}
// up on its haunches: the tail curled up its back, front paws at its mouth (a nut in them, nibbling)
function sitting(g, d, C) {
  const nib = d.nibble || 0, fl = d.flick || 0;
  tail(g, C, [[-4, 3], [-10.5, 7], [-11, 15], [-7, 21.5], [-3 + fl * 1.5, 23 + fl * 2]]);
  g.fillStyle = C.dark; g.beginPath(); g.ellipse(2.4, 0.9, 3.8, 1.1, 0, 0, TAU); g.fill();                 // the long hind foot
  g.fillStyle = C.fur; g.beginPath(); g.ellipse(-0.5, 4, 5.2, 4, 0, 0, TAU); g.fill();                      // the haunch
  g.beginPath(); g.ellipse(1.3, 9.5, 4.3, 6.6, -0.18, 0, TAU); g.fill();                                     // the body, upright
  g.fillStyle = C.belly; g.beginPath(); g.ellipse(2.9, 9, 2.4, 5, -0.18, 0, TAU); g.fill();                 // the belly
  const hy = 16.5 - nib * 0.6;
  g.strokeStyle = C.dark; g.lineWidth = 1.6; g.beginPath(); g.moveTo(3.2, 11.5); g.lineTo(5.6, hy - 3.6); g.stroke();   // front paws, up at its mouth
  if (d.nut) acorn(g, 6.6, hy - 3.2, 2.6, 0.9);
  head(g, C, 3.6, hy, -0.15 + nib * 0.12, false, true);
}
function head(g, C, x, y, tilt, nut, upright) {
  g.save(); g.translate(x, y); g.rotate(tilt);
  g.fillStyle = C.fur;
  g.beginPath(); g.moveTo(-1.2, 2.4); g.lineTo(-2.3, 7.4); g.lineTo(0.6, 3); g.closePath(); g.fill();       // the ear...
  g.strokeStyle = C.deep; g.lineWidth = 0.7;                                                                 // ...and its tuft
  g.beginPath(); g.moveTo(-2.3, 7.4); g.lineTo(-2.9, 9.3); g.moveTo(-2.1, 7.2); g.lineTo(-1.6, 9.4); g.moveTo(-2.4, 7.1); g.lineTo(-3.6, 8.6); g.stroke();
  g.beginPath(); g.arc(0, 0, 3.6, 0, TAU); g.fill();                                                          // the head
  g.beginPath(); g.ellipse(2.8, -0.9, 2.5, 1.9, -0.1, 0, TAU); g.fill();                                      // the snout
  g.fillStyle = C.belly; g.beginPath(); g.ellipse(2.4, -2.3, 2.3, 1.1, 0.1, 0, TAU); g.fill();               // a pale chin
  g.fillStyle = '#2a1712'; g.beginPath(); g.arc(5.1, -0.5, 0.65, 0, TAU); g.fill();                          // the nose
  const a = g.globalAlpha;
  g.fillStyle = C.belly; g.globalAlpha = a * 0.55; g.beginPath(); g.ellipse(1.1, 0.8, 1.7, 1.6, 0, 0, TAU); g.fill(); g.globalAlpha = a;   // a pale ring round the eye
  g.fillStyle = '#140b08'; g.beginPath(); g.arc(1.2, 0.9, 1.05, 0, TAU); g.fill();                           // the eye
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(1.55, 1.25, 0.38, 0, TAU); g.fill();
  g.restore();
  if (nut && !upright) acorn(g, x + 5.6, y - 2.2, 2.6, 0.3);
}
// the bushy tail: thin where it leaves the body, then a full plume (a darker edge, its colour, a brighter middle),
// wisps at the edge
function tail(g, C, pts) {
  const path = (plume) => {                                                  // (the plume starts half way along the first piece)
    g.beginPath();
    if (plume) g.moveTo((pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2); else g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[i + 1]; g.quadraticCurveTo(x1, y1, (x1 + x2) / 2, (y1 + y2) / 2); }
    const [lx, ly] = pts[pts.length - 1]; g.lineTo(lx, ly);
  };
  g.strokeStyle = C.dark; g.lineWidth = 4.4; path(false); g.stroke();
  g.lineWidth = 9.4; path(true); g.stroke();
  g.strokeStyle = C.tail; g.lineWidth = 3; path(false); g.stroke();
  g.lineWidth = 7.8; path(true); g.stroke();
  const a = g.globalAlpha;
  g.strokeStyle = C.glow; g.lineWidth = 2.8; g.globalAlpha = a * 0.6; path(true); g.stroke(); g.globalAlpha = a;
  g.strokeStyle = C.dark; g.lineWidth = 0.6;                                                                 // wisps
  g.beginPath();
  for (let i = 2; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    for (const side of [-1, 1]) { const mx = (x0 + x1) / 2, my = (y0 + y1) / 2; g.moveTo(mx + nx * side * 4.2, my + ny * side * 4.2); g.lineTo(mx + nx * side * 5.8 - dx * 0.12, my + ny * side * 5.8 - dy * 0.12); }
  }
  g.stroke();
}
// a little acorn: a nut with a darker cap (turned by `turn`)
function acorn(g, x, y, r, turn) {
  g.save(); g.translate(x, y); g.rotate(turn);
  g.fillStyle = '#c58e3d'; g.beginPath(); g.ellipse(0.2, 0, r * 0.82, r * 0.62, 0, 0, TAU); g.fill();
  g.fillStyle = '#5e3f22'; g.beginPath(); g.ellipse(-r * 0.5, 0, r * 0.4, r * 0.68, 0, 0, TAU); g.fill();
  g.restore();
}

/** Its hole up the trunk: a dark opening in a lighter rim of bark. sx, sy: the hole's middle on the screen. */
export function drawKnothole(g, sx, sy, s, d, alpha) {
  const r = 5.5 * s * d.scale;
  if (alpha <= 0.01 || r < 0.5) return;
  g.save(); g.globalAlpha = alpha;
  g.fillStyle = '#6e4b30'; g.beginPath(); g.ellipse(sx, sy, r, r * 1.3, 0, 0, TAU); g.fill();
  g.fillStyle = '#4a311f'; g.beginPath(); g.ellipse(sx, sy + r * 0.1, r * 0.82, r * 1.1, 0, 0, TAU); g.fill();
  g.fillStyle = '#150c07'; g.beginPath(); g.ellipse(sx, sy + r * 0.18, r * 0.62, r * 0.9, 0, 0, TAU); g.fill();
  g.restore();
}

function shade(col, f) {
  if (!col.startsWith('#')) return col;
  const n = parseInt(col.slice(1), 16), ch = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${ch((n >> 16) & 255)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}
