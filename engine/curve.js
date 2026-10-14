// Curves for the Ramp node. A curve is a list of keys [time, value, inSlope, outSlope], time and value 0..1, joined
// smoothly (cubic Hermite, the same maths as Maya's Graph Editor tangents). Files can name a preset instead of keys.

export const CURVE_PRESETS = {
  'linear':      [[0, 0, 1, 1], [1, 1, 1, 1]],
  'ease-in':     [[0, 0, 0, 0], [1, 1, 2, 2]],
  'ease-out':    [[0, 0, 2, 2], [1, 1, 0, 0]],
  'ease-in-out': [[0, 0, 0, 0], [1, 1, 0, 0]],
};

export function curveKeys(c) {
  if (typeof c === 'string') return CURVE_PRESETS[c] || null;
  return c && Array.isArray(c.keys) ? c.keys : null;
}

// null if fine, otherwise what's wrong.
export function checkCurve(c) {
  const keys = curveKeys(c);
  if (!keys) return typeof c === 'string' ? `unknown curve preset "${c}" (try: ${Object.keys(CURVE_PRESETS).join(', ')})` : 'a curve is a preset name or { "keys": [[time, value, inSlope, outSlope], ...] }';
  if (keys.length < 2) return 'a curve needs at least 2 keys';
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (!Array.isArray(k) || k.length !== 4 || !k.every(Number.isFinite)) return `curve key ${i + 1} should be [time, value, inSlope, outSlope]`;
    if (i > 0 && !(k[0] > keys[i - 1][0])) return 'curve keys must go forward in time';
  }
  return null;
}

export function evalCurve(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  const last = keys[keys.length - 1];
  if (t >= last[0]) return last[1];
  let i = 0;
  while (t > keys[i + 1][0]) i++;
  const [t0, v0, , m0] = keys[i], [t1, v1, m1] = keys[i + 1];
  const h = t1 - t0, s = (t - t0) / h, s2 = s * s, s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * v0 + (s3 - 2 * s2 + s) * h * m0 + (-2 * s3 + 3 * s2) * v1 + (s3 - s2) * h * m1;
}
