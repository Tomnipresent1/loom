// Paths: named lines drawn on the scene's ground (scene.paths = { name: { points: [[x, y], ...], width } }). The points
// are joined by a smooth curve through every one of them (Catmull-Rom), so a few points make a gentle winding path.
// Invisible in the game; the editor's top view shows them (drag the points). Boxes use them: Stroll keeps to one.
// Pure maths, no DOM.

const STEPS = 12;                      // curve samples between two points
const lines = new WeakMap();           // path object -> its sampled curve (paths are replaced, never changed, on an edit)

/** Problems with scene.paths, in words (for load.js). */
export function checkPaths(paths, where) {
  if (paths === undefined) return [];
  if (!paths || typeof paths !== 'object' || Array.isArray(paths)) return [`${where}: "paths" should be { name: { "points": [[x, y], ...], "width": ... } }`];
  const out = [];
  for (const [name, p] of Object.entries(paths)) {
    const okPoints = p && Array.isArray(p.points) && p.points.length >= 2 && p.points.every((q) => Array.isArray(q) && q.length === 2 && q.every(Number.isFinite));
    if (!okPoints) out.push(`${where}: path "${name}" needs "points": at least two [x, y]`);
    if (!p || !(Number.isFinite(p.width) && p.width > 0)) out.push(`${where}: path "${name}" needs a "width" above 0`);
  }
  return out;
}

/** The smooth curve through a path's points, as many short straight pieces: [[x, y], ...]. */
export function pathLine(path) {
  let line = lines.get(path);
  if (line) return line;
  const P = path.points, n = P.length;
  line = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(n - 1, i + 2)];
    for (let s = 0; s < STEPS; s++) {
      const t = s / STEPS, t2 = t * t, t3 = t2 * t;
      const c = (a, b, c_, d) => 0.5 * (2 * b + (-a + c_) * t + (2 * a - 5 * b + 4 * c_ - d) * t2 + (-a + 3 * b - 3 * c_ + d) * t3);
      line.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  line.push([...P[n - 1]]);
  lines.set(path, line);
  return line;
}

/** The nearest place on the path's middle line to x, y: { x, y, dist, along } (along = how far along the path). */
export function nearestOnPath(path, x, y) {
  const line = pathLine(path);
  let best = null, run = 0;
  for (let i = 1; i < line.length; i++) {
    const [ax, ay] = line[i - 1], [bx, by] = line[i], dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2)) : 0;
    const px = ax + dx * t, py = ay + dy * t, d = Math.hypot(x - px, y - py), len = Math.sqrt(len2);
    if (!best || d < best.dist) best = { x: px, y: py, dist: d, along: run + len * t };
    run += len;
  }
  return best;
}

/** How long the path's middle line is. */
export function pathLength(path) {
  const line = pathLine(path);
  let run = 0;
  for (let i = 1; i < line.length; i++) run += Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]);
  return run;
}

/** The place this far along the path's middle line, and which way it runs there: { x, y, dx, dy } (dx, dy: a unit
 *  step along). Before the start or past the end, the line carries straight on the way it was going. */
export function pointAlong(path, along) {
  const line = pathLine(path);
  let run = 0;
  for (let i = 1; i < line.length; i++) {
    const [ax, ay] = line[i - 1], [bx, by] = line[i], len = Math.hypot(bx - ax, by - ay);
    if (!len) continue;
    if (along <= run + len || i === line.length - 1) {
      const t = (along - run) / len;                        // (below 0 before the start, above 1 past the end)
      return { x: ax + (bx - ax) * t, y: ay + (by - ay) * t, dx: (bx - ax) / len, dy: (by - ay) / len };
    }
    run += len;
  }
  return { x: line[0][0], y: line[0][1], dx: 0, dy: -1 };
}

/** Keep a position (an [x, y, ...] array, changed in place) inside the path's width. True if it had to be moved. */
export function keepInside(path, pos) {
  const near = nearestOnPath(path, pos[0], pos[1]), half = path.width / 2;
  if (near.dist <= half) return false;
  const k = half / near.dist;
  pos[0] = near.x + (pos[0] - near.x) * k;
  pos[1] = near.y + (pos[1] - near.y) * k;
  return true;
}
