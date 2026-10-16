import { defineNode } from '../engine/registry.js';
import { seeded } from '../engine/rng.js';
import { catPose } from '../engine/cat.js';

// A shy black cat who follows someone (Autumn; Tom's pick A: shy, trust grows). She keeps her distance at first, on
// whichever side of the girl she is, stopping when the girl stops: she sits, washes now and then, watches. Calm time
// slowly builds her trust, so the distance shrinks; trusting her fully, when the girl stands still a while the cat
// walks past her legs to the other side. A hard landing or a kick near her, or (not yet trusting) the girl rushing at
// her, startles her: she arches, scampers off and her trust dips. When the girl is up a tree, the cat waits at its
// foot looking up. Wary of a puppy at first ("wary of"), she startles when it rushes close, until used to it. She walks on the ground (her paws rustle through leaves: she has feet). Drawn by runtime/cat2d.js.
const lerp = (a, b, k) => a + (b - a) * k;

defineNode({
  type: 'cat', title: 'Cat', kind: 'part',
  help: 'A shy cat who follows someone: keeps her distance at first, sits and washes when they stop, comes closer as she learns to trust them; startled by hard landings and kicks near her. Waits under trees.',
  inputs: {
    follows: { type: 'kind', value: 'player', setting: true, help: 'Which kind of thing she follows.' },
    far: { type: 'number', value: 420, label: 'shy distance', help: 'How far away she keeps at first (about 100 = a metre).' },
    close: { type: 'number', value: 70, label: 'trusting distance', help: 'How close she comes once she trusts fully.' },
    warm: { type: 'number', value: 90, label: 'warms up in', help: 'Seconds of calm company for her to trust fully.' },
    trust: { type: 'number', value: 0.05, label: 'trust at start', help: '0 = a stranger, 1 = old friends.' },
    walk: { type: 'number', value: 110, help: 'Her walking speed.' },
    run: { type: 'number', value: 300, help: 'Her running speed (scampering off, or catching up from far away).' },
    wary: { type: 'kind', value: 'puppy', setting: true, label: 'wary of', help: 'Another kind of animal she startles at when it rushes close, until she is used to it.' },
    usedTo: { type: 'number', value: 45, label: 'used to it in', help: 'Seconds near that animal for her to get used to it (stop startling).' },
    startle: { type: 'number', value: 1, label: 'jumpiness', help: 'How easily she is startled: 0 = never, 1 = a cat, 2 = very jumpy.' },
    colour: { type: 'colour', value: '#1c1a20', help: 'Her fur.' },
    eyes: { type: 'colour', value: '#e2c84a', help: 'Her eyes.' },
    size: { type: 'number', value: 1, help: '1 = an ordinary cat (about 60 long, 24 to the shoulder).' },
    opacity: { type: 'number', value: 1, help: '0 = invisible, 1 = solid.' },
  },
  outputs: {
    startled: { flow: true, help: 'Fires when something startles her (she scampers off).' },
    step: { flow: true, help: 'Fires as her paws come down while she walks (for soft footsteps).' },
    trusts: { type: 'number', label: 'trust', help: 'How much she trusts now: 0 = a stranger .. 1 = fully.' },
    sitting: { type: 'yesno', label: 'sitting?', help: 'Yes while she sits.' },
  },
  create(n) {
    Object.assign(n.state, { rnd: seeded(`cat ${n.me.id}`), vx: 0, facing: -1, mode: 'follow', modeT: 0, scamper: 1, idleT: 0, cycle: 0,
      sit: 1, wash: 0, washT: 4, washing: 0, lookUp: 0, arch: 0, blink: 3, rubT: 6, rubTo: null, seen: {}, trust: null, used: 0 });
  },
  tick(n, dt) {
    const s = n.state, p = n.me.pos, rnd = s.rnd, size = Math.max(0.1, n.in('size')), jump = Math.max(0, n.in('startle'));
    if (s.trust === null) s.trust = Math.max(0, Math.min(1, n.in('trust')));
    const girl = n.world.instances.find((i) => i.kind === n.in('follows') && !i.removed && i !== n.me);
    let want = 0, up = false;
    if (girl) {
      const g = girl.pos, gz = g[2] || 0, dist = Math.abs(p[0] - g[0]);
      let f = null;
      girl.each((m) => { if (!f && m.type.feet) f = m.type.feet(m); });
      const gvx = f ? f.vx : 0, side = Math.sign(p[0] - g[0]) || -(f ? f.facing : 1);
      up = gz > 60;
      // what startles her: a hard landing near her, a kick towards her, (not trusting yet) the girl rushing at her
      const fresh = (e, key) => e && e.id !== s.seen[key] && n.world.time - e.time < 0.1 && ((s.seen[key] = e.id), true);
      let scare = false;
      if (f && fresh(f.landing, 'landing') && f.landing.impact > 650 && dist < 260 * jump) scare = true;
      if (f && fresh(f.strike, 'strike') && (p[0] - g[0]) * f.strike.dir > -20 && dist < 230 * jump) scare = true;
      if (s.trust < 0.5 && jump > 0 && dist < 120 && (p[0] - g[0]) * gvx > 0 && Math.abs(gvx) > 150 && !up) scare = true;
      if (scare && s.mode !== 'scamper') {
        s.mode = 'scamper'; s.modeT = 0.75; s.scamper = side; s.arch = 1;
        s.trust = Math.max(0, s.trust - 0.2 * jump);
        n.fire('startled');
        if (n.me.removed) return;
      }
      // wary of the other animal (a puppy): rushing close, she startles her too, until they're used to each other
      // (about "used to" seconds near her); that doesn't cost the girl her trust
      const other = n.in('wary') && n.world.instances.find((i) => i.kind === n.in('wary') && !i.removed && i !== n.me);
      let of = null;
      if (other) other.each((m) => { if (!of && m.type.feet) of = m.type.feet(m); });
      if (of) {
        const od = Math.abs(of.x - p[0]);
        if (od < 700) s.used = Math.min(1, s.used + dt / Math.max(1, n.in('usedTo')));
        if (s.mode !== 'scamper' && jump > 0 && od < 140 && Math.abs(of.vx) > 120 && rnd() < (1 - s.used) * 0.5) {
          s.mode = 'scamper'; s.modeT = 0.75; s.scamper = Math.sign(p[0] - of.x) || 1; s.arch = 1;
          n.fire('startled');
          if (n.me.removed) return;
        }
      }
      // trust grows with calm company (slower when she is far off)
      if (s.mode !== 'scamper' && Math.abs(gvx) < 200) s.trust = Math.min(1, s.trust + (dt / Math.max(1, n.in('warm'))) * (dist < n.in('far') * 1.6 ? 1 : 0.3));
      if (s.mode === 'scamper') {
        want = s.scamper * n.in('run');
        if ((s.modeT -= dt) <= 0) { s.mode = 'follow'; s.idleT = 0; }
      } else {
        const gap = lerp(n.in('far'), n.in('close'), s.trust ** 1.5) * size;
        let target = g[0] + side * gap;                              // keeps to her side of the girl, that far off
        if (up) target = g[0] + side * 45 * size;                    // the girl up a tree: wait at its foot
        // trusting fully: when the girl has stood still a while, walk past her legs to her other side
        s.rubT -= dt;
        if (!up && s.trust > 0.85 && s.rubT <= 0 && Math.abs(gvx) < 5 && s.idleT > 3 && dist < gap * 2) { s.rubTo = g[0] - side * gap * 0.9; s.rubT = 14 + rnd() * 10; }
        if (s.rubTo !== null) { target = s.rubTo; if (Math.abs(p[0] - s.rubTo) < 8) s.rubTo = null; }
        // near enough: she stays put (a looser margin when keeping her distance); further off, she walks, speeding up
        // to a run the further behind she is
        const dx = target - p[0], slack = up || s.rubTo !== null ? 8 : 20 + gap * 0.08, walk = n.in('walk'), runs = n.in('run');
        // (once settled she stays settled till things are well out of place: trust creeping up doesn't keep getting her up)
        const margin = s.settled && !up && s.rubTo === null ? slack + 60 : slack;
        if (Math.abs(dx) > margin) { s.settled = false; want = Math.sign(dx) * (walk + (runs - walk) * Math.min(1, Math.max(0, (Math.abs(dx) - slack) / 300))); }
        else s.settled = true;
      }
    }
    s.vx += (want * size - s.vx) * Math.min(1, dt * 5);
    if (!want && Math.abs(s.vx) < 3) s.vx = 0;
    const [w] = n.world.bounds;
    p[0] = Math.min(w, Math.max(0, p[0] + s.vx * dt));
    const moving = Math.abs(s.vx) > 10;
    if (moving) s.facing = Math.sign(s.vx);
    else if (girl && s.mode !== 'scamper') s.facing = Math.sign(girl.pos[0] - p[0]) || s.facing;   // sitting, she watches her
    // her body: the walk cycle, sitting down after a moment still, washing now and then, looking up, arching
    s.idleT = moving ? 0 : s.idleT + dt;
    const before = s.cycle;
    s.cycle += (Math.abs(s.vx) * dt) / (70 * size);
    const steps = Math.floor(before * 2) !== Math.floor(s.cycle * 2) ? 1 : 0;
    const sitWant = !moving && s.idleT > 0.8 && s.mode !== 'scamper' ? 1 : 0;
    s.sit += (sitWant - s.sit) * Math.min(1, dt * 4);
    if (s.sit > 0.9 && !up) { s.washT -= dt; if (s.washT <= 0) { s.washing = 2.5; s.washT = 7 + rnd() * 8; } }
    s.washing = Math.max(0, s.washing - dt);
    s.wash += ((s.washing > 0 ? 1 : 0) - s.wash) * Math.min(1, dt * 5);
    s.lookUp += ((up ? 1 : 0) - s.lookUp) * Math.min(1, dt * 3);
    s.arch = Math.max(0, s.arch - dt * 1.4);
    s.blink -= dt; if (s.blink < -0.15) s.blink = 2 + rnd() * 4;
    if (steps && moving && !n.me.removed) n.fire('step');
  },
  // her paws, for the leaves she walks through
  feet(n) {
    const s = n.state, p = n.me.pos;
    return { x: p[0], y: p[1], z: p[2] || 0, vx: s.vx, vz: 0, standing: true, on: null, landing: null, facing: s.facing, kick: null, strike: null };
  },
  draw(n, out) {
    const s = n.state;
    out.push({ kind: 'cat', at: n.me.pos, facing: s.facing, scale: Math.max(0.1, n.in('size')), colour: n.in('colour'), eyes: n.in('eyes'), alpha: n.in('opacity'),
      pose: catPose({ phase: s.cycle % 1, speed: Math.abs(s.vx) / (110 * Math.max(0.1, n.in('size'))), sit: s.sit, wash: s.wash, lookUp: s.lookUp, arch: s.arch, t: n.world.time, blink: s.blink < 0 }) });
  },
  read: { trusts: (n) => n.state.trust ?? n.in('trust'), sitting: (n) => n.state.sit > 0.5 },
});
