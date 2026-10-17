// A side-on person's body and how it moves (Autumn's girl; the Character box): pure maths, no drawing. The renderers
// draw the pose (runtime/character2d.js), in code or from painted pieces.
// Her own space: x forward (the way she faces), y up, feet on the ground at y = 0; the body is about 165 tall (the
// box's height scales it). Everything moves by itself from how the thing moves:
//   walking: the walk cycle follows the ground covered (so her feet don't slide), legs swing, knees fold through, the
//            toe pushes off; the hips sit so the lower foot just touches the ground; arms swing against the legs
//   the air: rising, the near knee tucks and an arm reaches up; falling, both legs reach down for the ground
//   landing: the knees give and she squashes a little, harder for a harder landing
//   kicking: a wind-up, the leg swinging through with the toe up, and back (her arms swing against it)
//   tossing: she bends down (knees and back), both hands scoop the leaves at her feet, she straightens and throws them
//            up over her head, and watches them come down
//   standing: she breathes and blinks
//   ponytail and scarf end: little chains swinging around her body (they swing when she starts, stops, turns and lands,
//   float while she is in the air, trail a little as she walks)
import { seeded } from './rng.js';

const TAU = Math.PI * 2;
export const BODY = { THIGH: 42, SHIN: 40, FOOT: 15, TORSO: 44, NECK: 5, HEAD: 14.5, UPPER: 25, FORE: 23, TALL: 165 };
const WALK = 180;        // the walking speed (scene units a second, at her full height) her walk cycle is made for
const STRIDE = 150;      // ground covered by one full walk cycle (two steps), at her full height
const GRAVITY = 1698;    // the hair's gravity: her jump's (Walk and jump's 110 high, 0.36 s), so in the air it floats
// A toss, in seconds: how long it takes, when her hands scoop the leaves up (gather) and when she lets go (fling).
// Walk and jump keeps time by these; the pose below is keyed to them.
export const TOSS = { len: 1.2, gather: 0.46, fling: 0.72 };
// its pose through time: [t, near thigh, near knee, far thigh, far knee, lean, shoulders, elbows, head tilt]
// (thigh: forward from hanging; knee: how bent; lean: the back, forward; shoulders: the arms, forward and up from
// hanging; head tilt: forward = down, back = up)
const TOSS_KEYS = [
  [0, 0, 0.12, 0, 0.12, 0, 0.06, 0.25, 0],
  [0.38, 1.2, 2.1, 1.0, 1.9, 1.1, 0.3, 0.15, 1.25],        // bent down, hands reaching for the leaves, looking at them
  [0.5, 1.2, 2.1, 1.0, 1.9, 1.05, 0, 0.45, 1.2],          // scooped: hands drawn in, full
  [0.64, 0.3, 0.5, 0.2, 0.4, 0.15, 1.7, 0.25, 0.1],       // rising, arms swinging up
  [0.74, 0, 0.1, -0.05, 0.1, -0.12, 2.9, 0.1, -0.35],     // let go, arms high over her head, looking up
  [0.95, 0, 0.12, -0.05, 0.12, -0.1, 2.5, 0.35, -0.45],   // watching them come down
  [1.2, 0, 0.12, 0, 0.12, 0, 0.06, 0.25, 0],
];
function tossPose(t) {
  let i = 1;
  while (i < TOSS_KEYS.length - 1 && t > TOSS_KEYS[i][0]) i++;
  const a = TOSS_KEYS[i - 1], b = TOSS_KEYS[i], u = Math.max(0, Math.min(1, (t - a[0]) / (b[0] - a[0]))), e = u * u * (3 - 2 * u);
  return a.map((v, k) => v + (b[k] - v) * e);
}

export function createRig(seed = 1) {
  const rnd = seeded(seed);
  const chain = (n, seg) => ({ seg, pts: Array.from({ length: n }, () => ({ x: 0, y: 0, px: 0, py: 0 })), ready: false });
  return { rnd, t: 0, cycle: 0, phase: 0, walk: 0, air: 0, rising: false, landT: 9, impact: 0, landingSeen: 'start', blink: 2 + rnd() * 3, facing: 1,
    last: null, vx: 0, vz: 0, steps: 0, hair: chain(5, 7.5), scarf: chain(5, 6.5) };
}

// One step of time. m = how the thing is moving: { x, z (its place: along, height), standing (on her feet?), landing
// ({ id, impact } of the last landing, or null), facing (1 / -1, or 0 = from the way it moves), kick ({ t } while a
// kick goes on: seconds into it, or null), toss (likewise, a toss), scale (height / 165) }.
// Returns how many footfalls happened (for footstep sounds).
export function stepRig(rig, m, dt) {
  if (dt <= 0) return 0;
  const sc = m.scale || 1;
  if (!rig.last) rig.last = { x: m.x, z: m.z };
  const vx = (m.x - rig.last.x) / dt, vz = (m.z - rig.last.z) / dt;
  rig.last = { x: m.x, z: m.z };
  const ax = (vx - rig.vx) / dt, az = (vz - rig.vz) / dt;
  rig.vx = vx; rig.vz = vz;
  rig.t += dt;
  if (m.facing) rig.facing = m.facing;
  else if (Math.abs(vx) > 5) rig.facing = Math.sign(vx);
  rig.kick = m.kick || null;
  rig.toss = m.toss || null;
  const speed = Math.abs(vx) / sc;
  rig.walk = Math.min(1.3, speed / WALK);
  let footfalls = 0;
  if (m.standing && speed >= 1) {                                    // (a foot comes down at a quarter and three quarters of the cycle)
    const before = rig.cycle, after = (rig.cycle += Math.min(0.25, (speed * dt) / STRIDE));
    footfalls = Math.floor(after * 2 - 0.5) - Math.floor(before * 2 - 0.5);
    rig.phase = after % 1;
  }
  rig.rising = !m.standing && vz > 0;
  rig.air += ((m.standing ? 0 : 1) - rig.air) * Math.min(1, dt * 18);
  // (a landing she was already standing from when we started doesn't count; every one after does)
  if (rig.landingSeen === 'start') rig.landingSeen = m.landing ? m.landing.id : null;
  else if (m.landing && m.landing.id !== rig.landingSeen) { rig.landT = 0; rig.impact = m.landing.impact; rig.landingSeen = m.landing.id; }
  rig.landT += dt;
  rig.blink -= dt;
  if (rig.blink < -0.12) rig.blink = 2.5 + rig.rnd() * 3;
  // the chains live around her body (in the world's directions, her size): gravity, her speeding up / slowing down,
  // a light breath of air as she walks
  const P = rigPose(rig);
  swing(rig, rig.hair, P.hairRoot, ax / sc, az / sc, vx / sc, dt, 1.2);
  swing(rig, rig.scarf, P.scarfRoot, ax / sc, az / sc, vx / sc, dt, 1);
  rig.steps += footfalls;
  return footfalls;
}

function swing(rig, c, root, ax, az, vx, dt, drag) {
  const d = Math.min(dt, 1 / 30), rx = root.x * rig.facing, ry = root.y;
  if (!c.ready) { c.pts.forEach((p, i) => { p.x = p.px = rx - rig.facing * i; p.y = p.py = ry - c.seg * i; }); c.ready = true; return; }
  // (a sudden jump of the thing, e.g. a restart, would fling them: only ordinary accelerations count)
  const cl = (v) => Math.max(-60000, Math.min(60000, v));
  c.pts[0].x = rx; c.pts[0].y = ry;
  for (let i = 1; i < c.pts.length; i++) {
    const p = c.pts[i], mx = (p.x - p.px) * 0.97, my = (p.y - p.py) * 0.97;
    p.px = p.x; p.py = p.y;
    p.x += mx + (-cl(ax) - vx * drag) * d * d;
    p.y += my + (-GRAVITY - cl(az)) * d * d;
  }
  for (let k = 0; k < 3; k++) for (let i = 1; i < c.pts.length; i++) {
    const a = c.pts[i - 1], b = c.pts[i], dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, f = (len - c.seg) / len;
    b.x -= dx * f; b.y -= dy * f;
  }
}

// The pose now: every joint in her own space (x forward, y up, feet at 0), plus the chains.
export function rigPose(rig) {
  const { THIGH, SHIN, FOOT, TORSO, NECK, HEAD, UPPER, FORE } = BODY;
  const s = Math.min(1.3, rig.walk), a = rig.air, rising = rig.rising, legs = [], arms = [];
  const land = rig.landT < 0.35 ? Math.exp(-rig.landT * 10) * Math.min(1.3, rig.impact / 600) : 0;
  for (const off of [0, 0.5]) {                                       // near leg / arm, far leg / arm (half a cycle apart)
    const q = (rig.phase + off) * TAU;
    let thigh = 0.46 * s * Math.sin(q), knee = 0.12 + 0.95 * s * Math.max(0, Math.cos(q)) ** 1.6;
    let foot = -0.5 * s * Math.max(0, -Math.sin(q)) * Math.max(0, -Math.cos(q));
    const air = off === 0 ? (rising ? [1.0, 1.5, 0.2] : [0.35, 0.45, 0]) : (rising ? [-0.25, 1.0, -0.4] : [-0.05, 0.3, 0]);
    thigh += (air[0] - thigh) * a; knee += (air[1] - knee) * a; foot += (air[2] - foot) * a;
    knee += land * 1.1; thigh += land * 0.45;
    legs.push({ thigh, knee, foot });
    const arm = off === 0 ? (rising ? [2.2, 0.5] : [1.2, 0.3]) : (rising ? [-0.7, 0.4] : [0.9, 0.4]);
    let sh = -0.42 * s * Math.sin(q) + 0.06, el = 0.25 + 0.3 * s;
    sh += (arm[0] - sh) * a; el += (arm[1] - el) * a;
    sh += land * 0.5;
    arms.push({ sh, el });
  }
  // how far below the hip each foot reaches (its ankle, or its toe when pointing down)
  // a kick (0.45 s): wind up (the leg back, the knee bent), swing through (thigh up, the leg straightening, toe up),
  // and back down; the arms swing against it and she leans back a little as the foot comes through
  let kicking = 0;
  if (rig.kick) {
    const k = Math.min(1, rig.kick.t / 0.45), sm = (v) => v * v * (3 - 2 * v), L = legs[0], A = arms[0], B = arms[1];
    let th, kn, ft;
    if (k < 0.35) { const e = sm(k / 0.35); th = -0.5 * e; kn = 0.25 + 0.9 * e; ft = -0.2 * e; }
    else if (k < 0.6) { const e = sm((k - 0.35) / 0.25); th = -0.5 + 1.75 * e; kn = 1.15 - 1.0 * e; ft = -0.2 + 0.6 * e; }
    else { const e = sm((k - 0.6) / 0.4); th = 1.25 * (1 - e); kn = 0.15 - 0.03 * e; ft = 0.4 * (1 - e); }
    const w = Math.min(1, k * 8, (1 - k) * 8);                      // (eases in and out of the walk pose)
    L.thigh += (th - L.thigh) * w; L.knee += (kn - L.knee) * w; L.foot += (ft - L.foot) * w;
    A.sh += (-0.2 - 0.7 * Math.max(0, th) - A.sh) * w; B.sh += (0.4 + 0.6 * Math.max(0, th) - B.sh) * w;
    kicking = Math.max(0, th) * w;
  }
  // a toss (TOSS.len s): keyed poses (TOSS_KEYS), blended in from whatever she was doing and back out again
  let tossW = 0, T = null;
  if (rig.toss) {
    const t = rig.toss.t;
    tossW = Math.max(0, Math.min(1, t / 0.12, (TOSS.len - t) / 0.3));
    T = tossPose(t);
    const [, tn, kn, tf, kf, , sh, el] = T, mix = (o, k, v) => { o[k] += (v - o[k]) * tossW; };
    mix(legs[0], 'thigh', tn); mix(legs[0], 'knee', kn); mix(legs[0], 'foot', 0);
    mix(legs[1], 'thigh', tf); mix(legs[1], 'knee', kf); mix(legs[1], 'foot', 0);
    mix(arms[0], 'sh', sh); mix(arms[0], 'el', el);
    mix(arms[1], 'sh', sh - 0.12); mix(arms[1], 'el', el + 0.08);      // (the far arm just behind the near one)
  }
  const reach = (l) => {
    const ankle = THIGH * Math.cos(l.thigh) + SHIN * Math.cos(l.thigh - l.knee), fa = l.foot + Math.min(0, l.thigh - l.knee) * 0.3;
    return ankle + Math.max(0, -FOOT * Math.sin(fa) - 2);
  };
  const hipY = Math.max(reach(legs[0]), reach(legs[1])) + 2;
  let lean = 0.07 * s + (rising ? -0.05 : 0.04) * a + land * 0.25 - 0.12 * kicking;
  if (T) lean += (T[5] - lean) * tossW;
  const breathe = (1 - Math.min(1, s)) * (1 - a) * Math.sin(rig.t * 2.2) * 0.8 * (1 - tossW);
  const hip = { x: 0, y: hipY + breathe * 0.3 };
  const shoulder = { x: hip.x + TORSO * Math.sin(lean), y: hip.y + TORSO * Math.cos(lean) + breathe };
  let tilt = lean * 0.4 - 0.05 * s * Math.cos(rig.phase * 2 * TAU) - land * 0.2;
  if (T) tilt += (T[8] - tilt) * tossW;
  const head = { x: shoulder.x + (NECK + HEAD) * Math.sin(tilt + 0.05), y: shoulder.y + (NECK + HEAD) * Math.cos(tilt + 0.05) };
  const leg = (l) => {
    const knee = { x: hip.x + THIGH * Math.sin(l.thigh), y: hip.y - THIGH * Math.cos(l.thigh) };
    const sa = l.thigh - l.knee, ankle = { x: knee.x + SHIN * Math.sin(sa), y: knee.y - SHIN * Math.cos(sa) };
    const fa = l.foot + Math.min(0, l.thigh - l.knee) * 0.3, toe = { x: ankle.x + FOOT * Math.cos(fa), y: ankle.y + FOOT * Math.sin(fa) };
    return { hip, knee, ankle, toe, thigh: l.thigh, shin: sa, footA: fa };
  };
  const arm = (r) => {
    const elbow = { x: shoulder.x + UPPER * Math.sin(r.sh), y: shoulder.y - UPPER * Math.cos(r.sh) };
    const fa = r.sh + r.el, hand = { x: elbow.x + FORE * Math.sin(fa), y: elbow.y - FORE * Math.cos(fa) };
    return { shoulder, elbow, hand, upper: r.sh, fore: fa };
  };
  const local = (c) => c.pts.map((p) => ({ x: p.x * rig.facing, y: p.y }));
  return {
    legs: legs.map(leg), arms: arms.map(arm), hip, shoulder, head, lean, tilt,
    squash: 1 - land * 0.06 + (rising ? 0.04 * a : 0), blink: rig.blink < 0,
    hemSwing: -rig.vx * rig.facing * 0.025 + rig.vz * 0.01,
    hairRoot: { x: head.x - HEAD * 0.85, y: head.y + 1 }, scarfRoot: { x: shoulder.x - 6, y: shoulder.y + 3 },
    hair: rig.hair.ready ? local(rig.hair) : null, scarf: rig.scarf.ready ? local(rig.scarf) : null,
  };
}
