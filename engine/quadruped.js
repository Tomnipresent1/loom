// A four-legged animal's body seen side-on (Autumn's cat and puppy): pure maths, no drawing (runtime/cat2d.js and
// runtime/dog2d.js draw it). Its own space: x forward (the way it faces), y up, paws on the ground at y = 0. A build
// gives the proportions (CAT, PUPPY); the pose comes from a few numbers its box keeps moving:
//   phase / speed: the walk cycle (0 still, 1 walking, up to 2 running): the paws step in their own order (near hind,
//                  near fore, far hind, far fore, a quarter apart); running, the hind legs and the fore legs go in pairs
//   sit, wash, lookUp, arch, bow, leap: 0..1 each, blended in: sitting on its haunches; washing (a paw raised, the head
//                  bobbing to it); looking up (at someone up a tree); arched (startled: back up, tail straight up and
//                  puffed); a play-bow (chest down, front legs out, rear up); leaping (in the air, stretched out)
//   wag: how happily the tail wags (0 = the slow sway of a cat's tail); t: time; blink: eyes shut
const TAU = Math.PI * 2;
const lerp = (a, b, k) => a + (b - a) * k;
const mix = (p, q, k) => ({ x: lerp(p.x, q.x, k), y: lerp(p.y, q.y, k) });

export const CAT = { up: 12, low: 12, stand: 23, hipX: -17, shX: 15, head: [9, 8], sitHead: [5, 11], tailN: 7, tailSeg: 7.5, tailUp: 2.0 };
export const PUPPY = { up: 10, low: 10, stand: 19, hipX: -15, shX: 13, head: [11, 9], sitHead: [7, 12], tailN: 3, tailSeg: 4.5, tailUp: 1.25 };

export function quadrupedPose({ phase = 0, speed = 0, sit = 0, wash = 0, lookUp = 0, arch = 0, bow = 0, leap = 0, wag = 0, t = 0, blink = false }, B = CAT) {
  const s = Math.min(2, speed), walk = Math.min(1, s) * (1 - leap), run = Math.max(0, s - 1) * (1 - leap);
  const bob = 1.4 * walk * Math.cos(phase * 2 * TAU) * (1 - sit);
  const stand = B.stand + arch * 4;
  // walking / running: hips and shoulders, and the four legs
  let hip = { x: B.hipX, y: stand + bob - run * 2 * Math.sin(phase * TAU) }, shoulder = { x: B.shX, y: stand + 1 + bob + run * 2 * Math.sin(phase * TAU) };
  const offsets = run > 0.3 ? [0, 0.6, 0.08, 0.52] : [0, 0.25, 0.5, 0.75];   // near hind, near fore, far hind, far fore
  const legs = [['hind', true], ['fore', true], ['hind', false], ['fore', false]].map(([which, near], i) => {
    const q = (phase + offsets[i]) * TAU, A = 0.45 * walk + 0.25 * run;
    // (leaping: front legs reach forward, hind legs stretch back)
    const swing = A * Math.sin(q) + leap * (which === 'fore' ? 0.95 : -0.95), lift = (0.6 + 0.5 * run) * walk * Math.max(0, Math.cos(q));
    const top = which === 'hind' ? hip : shoulder;
    const knee = { x: top.x + B.up * Math.sin(swing), y: top.y - B.up * Math.cos(swing) };
    const low = which === 'hind' ? swing + lift + 0.15 * (1 - leap) : swing - lift * 0.7;      // (a hind leg's hock bends back)
    const paw = { x: knee.x + B.low * Math.sin(low), y: knee.y - B.low * Math.cos(low) };
    return { which, near, top, knee, paw };
  });
  // on the ground: the lowest paw just touches it (leaping, the box lifts the whole body off the ground itself)
  const lowest = Math.min(...legs.map((l) => l.paw.y)) * (1 - leap);
  for (const l of legs) { l.knee = { ...l.knee, y: l.knee.y - lowest }; l.paw = { ...l.paw, y: l.paw.y - lowest }; }
  hip = { ...hip, y: hip.y - lowest }; shoulder = { ...shoulder, y: shoulder.y - lowest };
  for (const l of legs) l.top = l.which === 'hind' ? hip : shoulder;
  // sitting: haunches down, the front legs straight, the body tipped up
  if (sit > 0) {
    const sHip = { x: B.hipX + 7, y: 7 * (B.stand / 23) }, sSh = { x: B.shX - 6, y: B.stand + 4 };
    hip = mix(hip, sHip, sit); shoulder = mix(shoulder, sSh, sit);
    for (const l of legs) {
      const dx = l.near ? 0 : -3, k = B.stand / 23;
      const kn = l.which === 'hind' ? { x: hip.x + 11 + dx, y: 6 * k } : { x: shoulder.x + 1 + dx, y: 13 * k }, p = l.which === 'hind' ? { x: hip.x + 6 + dx, y: 0 } : { x: shoulder.x + 2 + dx, y: 0 };
      l.top = l.which === 'hind' ? hip : shoulder;
      l.knee = mix(l.knee, kn, sit); l.paw = mix(l.paw, p, sit);
    }
    if (wash > 0) {                                                   // washing: the near front paw comes up to the mouth
      const f = legs[1], up = wash * sit;
      f.knee = mix(f.knee, { x: shoulder.x + 8, y: shoulder.y - 7 }, up); f.paw = mix(f.paw, { x: shoulder.x + 7, y: shoulder.y + 3 + Math.sin(t * 9) * 1.5 }, up);
    }
  }
  // a play-bow: chest down between the front legs stretched out ahead, rear up
  if (bow > 0) {
    const bSh = { x: shoulder.x + 2, y: B.stand * 0.42 }, bHip = { x: hip.x, y: B.stand + 2 };
    shoulder = mix(shoulder, bSh, bow); hip = mix(hip, bHip, bow);
    for (const l of legs) {
      l.top = l.which === 'hind' ? hip : shoulder;
      if (l.which === 'fore') { const dx = l.near ? 0 : -3; l.knee = mix(l.knee, { x: shoulder.x + 8 + dx, y: 2 }, bow); l.paw = mix(l.paw, { x: shoulder.x + 17 + dx, y: 0 }, bow); }
      else { l.knee = mix(l.knee, { x: hip.x + Math.sin(0.1) * B.up, y: hip.y - B.up }, bow); l.paw = mix(l.paw, { x: hip.x + 1, y: 0 }, bow); }
    }
  }
  const spine = { x: (hip.x + shoulder.x) / 2, y: (hip.y + shoulder.y) / 2 + 3 + arch * 9 - bow * 2 };
  // the head: ahead of the shoulders; tipped down to wash, up to look up, low in a play-bow
  const bobW = wash * sit * Math.sin(t * 9) * 1.2;
  const head = {
    x: shoulder.x + lerp(B.head[0], B.sitHead[0], sit) - wash * sit + lookUp * -2 + bow * 3,
    y: shoulder.y + lerp(B.head[1], B.sitHead[1], sit) - wash * sit * 6 + lookUp * 3 + bobW - bow * 3,
    tilt: lookUp * 0.8 - wash * sit * 0.5 + walk * 0.05 + bow * 0.25 + leap * 0.15,
  };
  // the tail: up and back, swaying slowly (a cat) or wagging (happy); curled round the paws sitting; straight up startled
  const base = { x: hip.x - 4, y: hip.y + 2 }, tail = [base];
  let a = lerp(lerp(B.tailUp, B.tailUp + 0.3, walk), Math.PI * 1.02, sit * (1 - wag));
  a = lerp(a, Math.PI / 2 + 0.1, arch);
  a += wag * Math.sin(t * 15) * 0.45;
  for (let i = 0; i < B.tailN; i++) {
    const sway = Math.sin(t * (sit ? 0.9 : 2.2) - i * 0.6) * (0.08 + 0.05 * i) * (1 - arch) * (1 - wag);
    const curl = lerp(lerp(0.12, 0.2, i / (B.tailN - 1)), i < 3 ? 0.05 : 0.42, sit * (1 - wag)) * (1 - arch);
    a += -curl + sway;
    const prev = tail[tail.length - 1];
    tail.push({ x: prev.x + B.tailSeg * Math.cos(a), y: Math.max(sit && !wag ? 1 : -50, prev.y + B.tailSeg * Math.sin(a)) });
  }
  return { hip, shoulder, spine, head, legs, tail, arch, puff: 1 + arch * 0.8, blink, sit, bow, leap };
}
