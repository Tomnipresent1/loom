// Draws a small round bird (Autumn's robins) from its 'bird' draw command: a plump body (brown back, orange-red breast
// and face), a round head with a beak and a bright eye, a cocked tail. Perched it stands on thin legs (pecking, its head
// dips to the ground; a flick of the tail now and then); flying, its wings beat (flap: -1 down .. 1 up) and it leans
// into the flight.
const TAU = Math.PI * 2;

/** sx, sy: the spot under it on the screen (its feet, perched; its middle, flying); s: pixels per scene unit there. */
export function drawBird(g, sx, sy, s, d, alpha) {
  const k = s * d.scale;
  if (alpha <= 0.01 || k < 0.02) return;
  const fly = typeof d.flap === 'number', peck = d.peck || 0, flick = d.flick || 0, back = d.back, breast = d.breast, dark = shade(back, 0.68);
  g.save();
  g.globalAlpha = alpha;
  g.translate(sx, sy);
  g.scale(k * (d.facing || 1), -k);
  const lift = fly ? -5 : 0;                                              // (perched: its feet at the spot; flying: its middle)
  if (fly) g.rotate(Math.max(-0.5, Math.min(0.5, d.climb || 0)));
  const wing = (a, near) => {                                             // a wing seen side-on, beating up and down
    g.fillStyle = near ? dark : shade(back, 0.55);
    g.beginPath(); g.moveTo(1.2, lift + 5.2); g.quadraticCurveTo(-1, lift + 5.6 + a * 6, -4.5, lift + 4.6 + a * 8.5 * (near ? 1 : 0.8));
    g.quadraticCurveTo(-3, lift + 3.6 + a * 2, -0.8, lift + 3.8); g.closePath(); g.fill();
  };
  if (!fly) {                                                             // thin legs
    g.strokeStyle = '#4a3326'; g.lineWidth = 0.7; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-0.6, 2.4); g.lineTo(-1, 0); g.moveTo(0.9, 2.4); g.lineTo(1.4, 0); g.stroke();
  }
  g.fillStyle = dark;                                                     // the tail, cocked up (flicked higher now and then)
  g.beginPath(); g.moveTo(-3.6, lift + 4.2); g.lineTo(-8.6, lift + 5.4 + flick * 2.5 + (fly ? -1.5 : 0)); g.lineTo(-8.2, lift + 3.6 + flick * 1.5 + (fly ? -1.5 : 0)); g.lineTo(-3.4, lift + 3); g.closePath(); g.fill();
  if (fly) wing(-d.flap * 0.9, false);
  g.fillStyle = back; g.beginPath(); g.ellipse(0, lift + 5, 5, 3.4, 0.08, 0, TAU); g.fill();                         // the body
  g.fillStyle = '#ece3d3'; g.beginPath(); g.ellipse(0.4, lift + 3.2, 3.6, 1.9, 0.1, 0, TAU); g.fill();               // the pale belly
  g.strokeStyle = '#9aa4ab'; g.lineWidth = 0.6;                                                                         // the breast, edged blue-grey
  g.fillStyle = breast; g.beginPath(); g.ellipse(2.1, lift + 4.3, 3, 2.7, -0.25, 0, TAU); g.fill(); g.stroke();
  const hx = 4.1 + peck * 1.6, hy = lift + 7.6 - peck * 5.4;
  g.fillStyle = back; g.beginPath(); g.arc(hx - 0.3, hy + 0.2, 2.5, 0, TAU); g.fill();                               // the head
  g.fillStyle = breast; g.beginPath(); g.ellipse(hx + 0.8, hy - 0.5, 1.8, 1.6, 0, 0, TAU); g.fill();                 // the face
  g.fillStyle = '#3a2a20'; g.beginPath(); g.moveTo(hx + 2.2, hy + 0.1); g.lineTo(hx + 3.7, hy - 0.4 - peck * 0.4); g.lineTo(hx + 2.2, hy - 0.8); g.closePath(); g.fill();   // the beak
  g.fillStyle = '#140d0a'; g.beginPath(); g.arc(hx + 0.7, hy + 0.7, 0.55, 0, TAU); g.fill();                         // the eye
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(hx + 0.9, hy + 0.9, 0.18, 0, TAU); g.fill();
  if (fly) wing(d.flap, true);
  else { g.fillStyle = dark; g.beginPath(); g.ellipse(-0.9, lift + 5.4, 3.3, 1.7, 0.22, 0, TAU); g.fill(); }        // the folded wing
  g.restore();
}

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16), ch = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${ch((n >> 16) & 255)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}
