// Shapes painted by code (Autumn's world): a tree and a line of hills, worked out from a few numbers and a seed, so the
// same numbers always give the same tree. Pure maths, no drawing: the renderers paint them (with the light and the
// distance), and the tests check them. Local units: x across, z up, the foot at (0, 0).
import { seeded } from './rng.js';

/** A tree: { trunk: outline [[x, z]], bark: [lines], limbs: [{ pts, w }], blobs: [{ x, z, r, t, light }], top, wide }.
 *  height = all of it; trunk = its width at the foot (0 = no trunk: a bush); lean = how far its top leans over (units);
 *  crown = how wide the leafy crown is (0 = bare); crownAt = where the crown starts, 0..1 of the height. */
export function treeShape({ height = 1300, trunk = 90, lean = 0, crown = 700, crownAt = 0.65, seed = 1 }) {
  const rnd = seeded(`tree ${seed}`), H = Math.max(1, height), base = crown > 0 ? H * Math.max(0, Math.min(0.95, crownAt)) : H;
  const top = crown > 0 ? Math.min(H, base + crown * 0.3) : H;
  const wig = rnd() * 6, wa = (rnd() - 0.5) * trunk * 0.25;
  const mid = (z) => lean * (z / H) ** 1.5 + wa * Math.sin((z / H) * 3 + wig);         // the trunk's middle line
  const half = (z) => (trunk / 2) * (1 - 0.6 * (z / top)) * (1 + 0.35 * Math.max(0, 1 - z / (H * 0.06)));   // tapers; flares at the roots
  const out = { trunk: [], bark: [], limbs: [], blobs: [], top: H, wide: Math.max(trunk, crown) };
  if (trunk > 0) {
    const N = 12, left = [], right = [];
    for (let i = 0; i <= N; i++) { const z = (top * i) / N; left.push([mid(z) - half(z), z]); right.push([mid(z) + half(z), z]); }
    out.trunk = [...left, ...right.reverse()];
    for (let b = 0; b < 4; b++) {                                     // bark: a few wavy darker lines up the trunk
      const across = -0.55 + 0.37 * b + (rnd() - 0.5) * 0.15, line = [], ph = rnd() * 6;
      for (let i = 0; i <= 10; i++) { const z = top * (0.03 + (0.9 * i) / 10); line.push([mid(z) + half(z) * (across + 0.08 * Math.sin(z * 0.03 + ph)), z]); }
      out.bark.push(line);
    }
  }
  if (crown > 0) {
    const crownH = Math.max(crown * 0.75, (H - base) * 1.05), cz = base + crownH / 2, cx = mid(top);
    if (trunk > 0) for (let i = 0; i < 4; i++) {                       // limbs reaching up into the crown
      const side = i % 2 ? 1 : -1, z0 = base + (top - base) * (0.1 + 0.25 * i) * 0.8;
      const tip = [cx + side * crown * (0.18 + rnd() * 0.22), z0 + crownH * (0.25 + rnd() * 0.25)];
      out.limbs.push({ pts: [[mid(z0), z0], [(mid(z0) + tip[0]) / 2 + side * 15, (z0 + tip[1]) / 2 - 10], tip], w: trunk * 0.22 });
    }
    out.core = { x: cx, z: cz, rx: crown * 0.42, rz: crownH * 0.42 };   // the crown's shaded heart (no sky between clumps)
    const n = Math.max(12, Math.min(70, Math.round(crown / 22)));
    for (let i = 0; i < n; i++) {                                      // leafy clumps filling the crown's oval
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * 0.9, r = crown * (0.075 + rnd() * 0.07);
      const x = cx + Math.cos(a) * d * (crown / 2 - r * 0.5), z = cz + Math.sin(a) * d * (crownH / 2 - r * 0.5);
      // lit from above and from the sun's side (the right): lighter up there, darker underneath
      const light = 0.72 + 0.34 * ((z - base) / crownH) + 0.12 * ((x - cx) / crown) + (rnd() - 0.5) * 0.12;
      // each clump: a few round leaf-masses together (a scalloped edge, not a ball)
      const bits = [[0, 0, r]];
      for (let k = 0; k < 3; k++) { const b = rnd() * Math.PI * 2; bits.push([Math.cos(b) * r * 0.62, Math.sin(b) * r * 0.62, r * (0.45 + rnd() * 0.2)]); }
      out.blobs.push({ x, z, r, t: rnd(), light, bits });
    }
    out.blobs.sort((p, q) => p.light - q.light);                       // (darker, lower ones first: the lit ones on top)
    out.top = Math.max(H, cz + crownH / 2 + crown * 0.06);
  }
  return out;
}

/** A line of hills: [[x, z]] across its width (centred), never above height, sinking to the ground at both ends.
 *  roughness 0 = smooth swells, 1 = bumpy. */
export function ridgeLine({ width = 5000, height = 1800, roughness = 0.3, seed = 1 }) {
  const rnd = seeded(`hills ${seed}`), W = Math.max(1, width), pts = [], N = 64;
  // long gentle swells, a few smaller ones on them, and (with roughness) a little bumpiness
  const waves = [[0.9, 0.16], [2.1, 0.09], [4.7, 0.045 * (0.4 + roughness)], [11.3, 0.025 * roughness]].map(([f, a]) => [f, a, rnd() * Math.PI * 2]);
  for (let i = 0; i <= N; i++) {
    const u = i / N, x = -W / 2 + W * u;
    let h = 0.72;
    for (const [f, a, p] of waves) h += a * Math.sin(u * f * Math.PI * 2 + p);
    pts.push([x, Math.max(0, height * Math.min(1, h) * Math.sin(Math.PI * u) ** 0.6)]);
  }
  return pts;
}

// Colours: mix two "#rrggbb" colours (t = 0: the first, 1: the second), and lighten / darken by a factor.
export function mixColour(a, b, t) {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16), k = Math.max(0, Math.min(1, t));
  const ch = (s) => Math.round(((A >> s) & 255) + ((((B >> s) & 255) - ((A >> s) & 255)) * k));
  return '#' + ((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0');
}
export function shadeColour(a, f) {
  const A = parseInt(a.slice(1), 16), ch = (s) => Math.max(0, Math.min(255, Math.round(((A >> s) & 255) * f)));
  return '#' + ((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0');
}
