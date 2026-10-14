// Scatter: a live rule that grows many copies of a thing beside a path (like Maya's MASH or Blender's scatter), from
// NAMI's Plum Blossom orchard. scene.scatters = { name: rule }. The copies are made afresh whenever the piece loads, so
// changing a number re-grows them; the same seed always grows the same garden. Pure maths, no DOM.
//
// A rule: { thing, path, seed, count, depth, hug, gap, apart, onPath, extend, vary }
//   thing   which kind of thing to scatter          path    the path they stand beside
//   count   how many to try to place (fewer when there's no room)
//   depth   how far back from the path's edge they go          hug   0..1: how much they crowd close to the path
//   gap     how far from the path's edge the nearest stand (below 0 = a little onto it)
//   apart   the least distance between two copies
//   onPath  how many stand on the path itself (something to step round)
//   extend  how far before the path's start and past its end they carry on; past the end they close across the path,
//           so it never opens onto a bare horizon
//   avoid   keep clear of an earlier scatter's copies, or of placed things of a kind: { scatterName or kind: distance }
//           (e.g. fallen sprigs away from trunks, trees away from huts)
//   vary    per-copy values: { var: [least, most] } for a number; any other kind (colour, picture, yes/no, text) a list
//           to pick one from, e.g. { look: ["plum-1.png", "plum-2.png"] }
import { pathLength, pointAlong } from './path.js';
import { DATA_TYPES } from './registry.js';

const RANGED = new Set(['number', 'whole']);         // these vary between two values; everything else picks from a list

export const SCATTER_DEFAULTS = { seed: 1, count: 200, depth: 2500, hug: 0.4, gap: 70, apart: 280, onPath: 0, extend: 2000, vary: {} };
const NUMBERS = ['seed', 'count', 'depth', 'hug', 'gap', 'apart', 'onPath', 'extend'];

function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Problems with scene.scatters, in words (for load.js). `things` = the loaded things, to check "vary". */
export function checkScatters(scatters, paths, things, where, placedKinds = []) {
  if (scatters === undefined) return [];
  if (!scatters || typeof scatters !== 'object' || Array.isArray(scatters)) return [`${where}: "scatters" should be { name: { "thing": ..., "path": ..., ... } }`];
  const out = [];
  for (const [name, s] of Object.entries(scatters)) {
    const at = `${where}: scatter "${name}"`;
    if (!s || typeof s !== 'object') { out.push(`${at} should be { "thing": ..., "path": ... }`); continue; }
    if (typeof s.thing !== 'string') out.push(`${at} needs "thing": which kind of thing to scatter`);
    if (!paths || !paths[s.path]) out.push(`${at} uses path "${s.path}", which isn't in the scene's "paths" (known: ${Object.keys(paths || {}).join(', ') || 'none'})`);
    for (const k of NUMBERS) if (s[k] !== undefined && !Number.isFinite(s[k])) out.push(`${at}: "${k}" should be a number`);
    const before = Object.keys(scatters).slice(0, Object.keys(scatters).indexOf(name));
    for (const [o, d] of Object.entries(s.avoid || {})) {
      if (!before.includes(o) && !placedKinds.includes(o)) out.push(`${at} keeps clear of "${o}", which isn't a scatter listed before it or a kind of placed thing (known: ${[...before, ...placedKinds].join(', ') || 'none'})`);
      else if (!Number.isFinite(d)) out.push(`${at}: keeping clear of "${o}" needs a distance (a number)`);
    }
    const t = things[s.thing], vars = (t && t.vars) || {};
    for (const [k, v] of Object.entries(s.vary || {})) {
      const decl = vars[k];
      if (!t) break;
      const type = decl && DATA_TYPES.get(decl.type);
      if (!decl || !decl.perCopy) out.push(`${at} varies "${k}", but ${s.thing} has no "set per copy" variable called that`);
      else if (RANGED.has(decl.type) ? !(Array.isArray(v) && v.length === 2 && v.every(Number.isFinite))
        : !(Array.isArray(v) && v.length && v.every((x) => !type.check || !type.check(x, {}, {})))) out.push(`${at}: "${k}" should be ${RANGED.has(decl.type) ? '[least, most]' : `a list of ${type.label} values to pick from`}`);
    }
  }
  return out;
}

/** The copies one rule grows: [{ id, thing, at: [x, y, 0], set, scatter }]. Ids are "<name>-1", "<name>-2"... */
export function scatterOne(name, rule, paths, thingVars = {}, others = {}) {
  const s = { ...SCATTER_DEFAULTS, ...rule }, path = paths && paths[s.path];
  if (!path || typeof s.thing !== 'string') return [];
  const r = mulberry32(Math.round(s.seed)), half = path.width / 2, L = pathLength(path), spots = [];
  // copies of earlier scatters to keep clear of: [x, y, distance] (avoid = { scatterName: distance })
  const clearOf = Object.entries(s.avoid || {}).flatMap(([o, d]) => (others[o] || []).map((p) => [p.at[0], p.at[1], d]));
  const roomy = (x, y, d) => spots.every((q) => Math.hypot(q[0] - x, q[1] - y) > d) && clearOf.every((q) => Math.hypot(q[0] - x, q[1] - y) > q[2]);
  const place = (x, y) => spots.push([x, y]);
  // standing on the path, here and there along the middle stretch: something to step round
  for (let i = 0, tries = 0; i < s.onPath && tries < s.onPath * 20; tries++) {
    const p = pointAlong(path, L * (0.1 + 0.85 * r())), off = (r() - 0.5) * 2 * half * 0.6;
    const x = p.x - p.dy * off, y = p.y + p.dx * off;
    if (roomy(x, y, s.apart * 1.4)) { place(x, y); i++; }
  }
  // beside the path, either side, crowding close (hug) and thinning out to depth; past the end, closing across it
  const k = 1 + 3 * Math.max(0, Math.min(1, s.hug));
  for (let i = 0, tries = 0; i < s.count && tries < s.count * 12; tries++) {
    const along = -s.extend + r() * (L + 2 * s.extend), p = pointAlong(path, along), side = r() < 0.5 ? -1 : 1;
    const off = along > L ? side * r() * (half + s.depth) : side * (half + s.gap + s.depth * r() ** k);
    const x = p.x - p.dy * off, y = p.y + p.dx * off;
    if (roomy(x, y, s.apart)) { place(x, y); i++; }
  }
  // each copy its own values (from the same seed, so they stay put between loads)
  return spots.map(([x, y], i) => {
    const set = {};
    for (const [key, v] of Object.entries(s.vary || {})) {
      if (!thingVars[key]) continue;
      const type = thingVars[key].type;
      set[key] = !RANGED.has(type) ? v[Math.floor(r() * v.length) % v.length]
        : type === 'whole' ? Math.round(v[0] + r() * (v[1] - v[0])) : Math.round((v[0] + r() * (v[1] - v[0])) * 100) / 100;
    }
    return { id: `${name}-${i + 1}`, thing: s.thing, at: [Math.round(x), Math.round(y), 0], set, scatter: name };
  });
}

// the last few gardens grown, by what they were grown from (the editor changes a scene in place, so not by object)
const grown = new Map();
/** Everything a scene places: its placed things, then every scatter's copies. `things` = loaded thing files (for vary). */
export function scenePlacements(scene, things = {}) {
  const scatters = scene.scatters && typeof scene.scatters === 'object' ? scene.scatters : {};
  if (!Object.keys(scatters).length) return scene.place || [];
  const varsOf = (rule) => (rule && things[rule.thing] && things[rule.thing].vars) || {};
  const key = JSON.stringify([scatters, scene.paths, Object.values(scatters).map(varsOf), (scene.place || []).map((p) => [p.thing, p.at])]);
  let copies = grown.get(key);
  if (!copies) {
    // each scatter can keep clear of the ones before it, and of placed things by their kind (e.g. "hut")
    const placed = {};
    for (const p of scene.place || []) (placed[p.thing] ||= []).push(p);
    const done = {};
    for (const [name, rule] of Object.entries(scatters)) done[name] = scatterOne(name, rule, scene.paths, varsOf(rule), { ...placed, ...done });
    copies = Object.values(done).flat();
    grown.set(key, copies);
    if (grown.size > 4) grown.delete(grown.keys().next().value);
  }
  return [...(scene.place || []), ...copies];
}
