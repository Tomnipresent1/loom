// Draws a Character (Autumn's girl) on a 2-D canvas from her pose (engine/character.js): each piece drawn by code, or,
// where the Painted pieces box gives a picture, that picture pinned from joint to joint (a cut-out puppet).
// Her own space: x forward, y up, feet at 0, about 165 tall; the caller gives the screen spot of her feet and how many
// pixels a scene unit is there.
const TAU = Math.PI * 2, HEAD = 14.5;

/** sx, sy: her feet on the screen; s: pixels per scene unit there; d: the 'character' draw command; pictures: the loader. */
export function drawCharacter(g, sx, sy, s, d, alpha, pictures) {
  const k = s * d.scale, P = d.pose, C = d.colours, pieces = d.pieces || {}, far = pieces.far ?? 0.78;
  if (alpha <= 0.01 || !P) return;
  const pic = (name) => (pieces[name] && pictures ? pictures.get(pieces[name]) : null);
  g.save();
  g.globalAlpha = alpha;
  g.translate(sx, sy);
  g.scale(k * d.facing, -k * P.squash);
  const [nl, fl] = P.legs, [na, fa] = P.arms;
  // ponytail and scarf end (behind everything)
  chainPiece(g, P.hair, pic('ponytail'), 8, 3, C.hair, k);
  chainPiece(g, P.scarf, pic('scarfEnd'), 8, 6, shade(C.scarf, 0.84), k);
  // far leg and arm, a little darker
  legPieces(g, fl, pic, C, far, k);
  armPieces(g, fa, pic, C, far, k);
  legPieces(g, nl, pic, C, 1, k);
  const body = pic('body');
  if (body) {
    const hem = { x: P.hip.x - 26 * Math.sin(P.lean), y: P.hip.y - 26 * Math.cos(P.lean) };
    piece(g, body, P.shoulder, hem, 0.12, 1, k);
  } else coat(g, P, C);
  armPieces(g, na, pic, C, 1, k);
  const head = pic('head');
  if (head) {
    g.save(); g.translate(P.head.x, P.head.y); g.scale(1, -1); g.rotate(P.tilt);
    const h = HEAD * 3, w = (h * head.w) / head.h;
    g.drawImage(head.sized(w * k * 2), -w / 2, -h / 2, w, h);
    g.restore();
  } else headDrawn(g, P, C);
  g.restore();
}

// ---- painted pieces ----
// a picture pinned from joint a (its top middle) to joint b (its bottom middle), a little beyond each (overhang)
function piece(g, img, a, b, over, dark, k) {
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
  const h = len * (1 + 2 * over), w = (h * img.w) / img.h;
  g.save();
  if (dark < 1) g.filter = `brightness(${dark})`;
  g.translate(a.x, a.y); g.scale(1, -1);                                 // (pictures are drawn y-down, upright)
  g.rotate(Math.atan2(-dy, dx) - Math.PI / 2);
  g.drawImage(img.sized(w * k * 2), -w / 2, -len * over, w, h);
  g.restore();
}
function legPieces(g, L, pic, C, dark, k) {
  const thigh = pic('thigh'), shin = pic('shin'), boot = pic('boot');
  if (thigh) piece(g, thigh, L.hip, L.knee, 0.12, dark, k); else limb(g, [L.hip, L.knee], 11, shade(C.tights, dark));
  if (shin) piece(g, shin, L.knee, L.ankle, 0.12, dark, k); else limb(g, [L.knee, L.ankle], 11, shade(C.tights, dark));
  if (boot) {
    const h = 14, w = (h * boot.w) / boot.h;
    g.save();
    if (dark < 1) g.filter = `brightness(${dark})`;
    g.translate(L.ankle.x, L.ankle.y); g.scale(1, -1); g.rotate(-L.footA);
    g.drawImage(boot.sized(w * k * 2), -w / 2 + 4, -2, w, h);
    g.restore();
  } else { bootPath(g, L); g.fillStyle = shade(C.boots, dark); g.fill(); }
}
function armPieces(g, A, pic, C, dark, k) {
  const upper = pic('upperArm'), fore = pic('forearm');
  if (upper) piece(g, upper, A.shoulder, A.elbow, 0.12, dark, k); else limb(g, [A.shoulder, A.elbow], 10.5, shade(C.coat, dark * (dark < 1 ? 0.95 : 1)));
  if (fore) piece(g, fore, A.elbow, A.hand, 0.08, dark, k);
  else { limb(g, [A.elbow, A.hand], 10.5, shade(C.coat, dark * (dark < 1 ? 0.95 : 1))); dot(g, A.hand, 4.5, shade(C.skin, dark < 1 ? 0.88 : 1)); }
}
function chainPiece(g, pts, img, w0, w1, col, k) {
  if (!pts || pts.length < 2) return;
  if (img) return piece(g, img, pts[0], pts[pts.length - 1], 0.05, 1, k);
  for (let i = 1; i < pts.length; i++) limb(g, [pts[i - 1], pts[i]], w0 + ((w1 - w0) * i) / pts.length, col);
}

// ---- drawn by code ----
function limb(g, pts, w, col) {
  g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const p of pts.slice(1)) g.lineTo(p.x, p.y); g.stroke();
}
function bootPath(g, L) {
  const a = L.ankle, t = L.toe, up = { x: a.x - 2 * Math.sin(L.shin), y: a.y + 12 };
  g.beginPath();
  g.moveTo(up.x - 6, up.y); g.lineTo(up.x + 5, up.y); g.lineTo(t.x + 2, t.y + 1); g.quadraticCurveTo(t.x + 3, t.y - 4, t.x - 2, t.y - 4.5); g.lineTo(a.x - 6, a.y - 4.5); g.closePath();
}
// the coat: from her shoulders to a hem that flares as her legs swing (and trails a little as she moves); buttons; the
// scarf wrapped at her neck
function coat(g, P, C) {
  const S = P.shoulder, Hp = P.hip, [nl, fl] = P.legs, sw = P.hemSwing;
  const front = Math.max(nl.knee.x, fl.knee.x) * 0.55 + 12, back = Math.min(nl.knee.x, fl.knee.x) * 0.55 - 13, hemY = Hp.y - 26;
  g.fillStyle = C.coat; g.beginPath();
  g.moveTo(S.x - 9, S.y + 2);
  g.quadraticCurveTo(S.x + 6, S.y + 5, S.x + 9, S.y - 2);
  g.quadraticCurveTo(Hp.x + 12, Hp.y + 10, front + sw * 0.5, hemY);
  g.quadraticCurveTo((front + back) / 2 + sw, hemY - 3, back + sw * 1.2, hemY + 1);
  g.quadraticCurveTo(Hp.x - 13, Hp.y + 12, S.x - 9, S.y + 2);
  g.closePath(); g.fill();
  for (let i = 0; i < 3; i++) dot(g, { x: S.x + 6 - i * 0.6 + (Hp.x - S.x) * (0.25 + i * 0.25) * 0.3, y: S.y - 10 - i * 11 }, 1.4, shade(C.coat, 0.6));
  g.fillStyle = C.scarf; g.beginPath(); g.ellipse(S.x, S.y + 3.5, 10, 5.5, P.lean, 0, TAU); g.fill();
}
// the head: hair behind, face, fringe, a knitted hat with a band and a pompom, an eye (blinking), a rosy cheek
function headDrawn(g, P, C) {
  const r = HEAD;
  g.save(); g.translate(P.head.x, P.head.y); g.rotate(-P.tilt);
  g.fillStyle = C.hair; g.beginPath(); g.arc(-2, -1, r + 1.5, 0, TAU); g.fill();
  g.fillStyle = C.skin; g.beginPath(); g.ellipse(2.5, -2, r * 0.82, r * 0.9, 0, 0, TAU); g.fill();
  g.fillStyle = C.hair; g.beginPath(); g.moveTo(-r, 2); g.quadraticCurveTo(4, 9, r * 0.95, 3); g.lineTo(r * 0.7, 7); g.quadraticCurveTo(-4, 14, -r, 6); g.fill();
  g.fillStyle = C.hat; g.beginPath(); g.moveTo(-r - 2, 4); g.quadraticCurveTo(0, r + 14, r + 2, 4); g.closePath(); g.fill();
  g.fillStyle = shade(C.hat, 0.9); g.beginPath(); g.rect(-r - 2.5, 1.5, 2 * r + 5, 5); g.fill();
  dot(g, { x: -3, y: r + 10 }, 5, C.scarf);
  if (P.blink) { g.strokeStyle = '#2a1a14'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(6.5, -2); g.lineTo(10.5, -2.3); g.stroke(); }
  else dot(g, { x: 8.5, y: -2 }, 1.9, '#2a1a14');
  const a = g.globalAlpha; g.globalAlpha = a * 0.55; dot(g, { x: 6, y: -7.5 }, 2.6, '#e89a86'); g.globalAlpha = a;
  g.restore();
}
function dot(g, p, r, col) { g.fillStyle = col; g.beginPath(); g.arc(p.x, p.y, r, 0, TAU); g.fill(); }
const shades = new Map();
function shade(hex, f) {
  if (f === 1) return hex;
  const key = hex + f;
  let c = shades.get(key);
  if (!c) { const n = parseInt(hex.slice(1), 16); c = `rgb(${(((n >> 16) & 255) * f) | 0},${(((n >> 8) & 255) * f) | 0},${((n & 255) * f) | 0})`; shades.set(key, c); }
  return c;
}
