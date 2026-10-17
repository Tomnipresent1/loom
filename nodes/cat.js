import { defineNode } from '../engine/registry.js';
import { seeded } from '../engine/rng.js';
import { catPose } from '../engine/cat.js';
import { nearestBird } from './birds.js';

// A shy black cat who follows someone (Autumn; Tom's pick A: shy, trust grows). She keeps her distance at first, on
// whichever side of the girl she is, stopping when the girl stops: she sits, washes now and then, watches. Calm time
// slowly builds her trust, so the distance shrinks; trusting her fully, when the girl stands still a while the cat
// walks past her legs to the other side. A hard landing or a kick near her, or (not yet trusting) the girl rushing at
// her, startles her: she arches, scampers off and her trust dips. When the girl is up a tree, the cat waits at its
// foot looking up. Wary of a puppy at first ("wary of"), she startles when it rushes close, until used to it. She walks on the ground (her paws rustle through leaves: she has feet).
// Birds about (a Birds box): sitting, she watches the nearest, head turned up to it, calm (no chasing); now and then a
// short mew. Drawn by runtime/cat2d.js.
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
    climbs: { type: 'number', value: 0.33, label: 'follows her up', help: 'How often she follows the girl up a branch she can walk up (one sloping up from the ground): 0 = never, 0.33 = one time in three, 1 = always. Out at the end of a branch she\'s stuck (too high to jump down) till the girl walks underneath her; then she turns and walks back down.' },
    chatty: { type: 'number', value: 1, help: 'How often she mews by herself: 0 = never (only at birds, or stuck); 1 = now and then (sitting a while; the girl jumping up a tree, leaving her below); 2 = a talkative cat.' },
    watches: { type: 'number', value: 1, label: 'watches birds', help: 'Birds about (a Birds box): 0 = she ignores them; 1 = sitting, she watches them, now and then a short mew; 2 = she mews more.' },
    colour: { type: 'colour', value: '#1c1a20', help: 'Her fur.' },
    eyes: { type: 'colour', value: '#e2c84a', help: 'Her eyes.' },
    size: { type: 'number', value: 1, help: '1 = an ordinary cat (about 60 long, 24 to the shoulder).' },
    opacity: { type: 'number', value: 1, help: '0 = invisible, 1 = solid.' },
  },
  outputs: {
    startled: { flow: true, help: 'Fires when something startles her (she scampers off).' },
    step: { flow: true, help: 'Fires as her paws come down while she walks (for soft footsteps).' },
    mewed: { flow: true, help: 'Fires when she gives a short mew: watching birds, sitting a while, or left below as the girl jumps up a tree (wire a Play sound or an Animal call: cat mew).' },
    calls: { flow: true, label: 'calls (stuck)', help: 'Fires when she finds she is stuck up a branch (too high to jump down), and again every few seconds till the girl comes to help (wire an Animal call: cat calling, or a Play sound).' },
    callNo: { type: 'number', label: 'call number', help: 'Which call this is since she got stuck: 1, 2, 3… (e.g. the first two to get noticed, then more pleading). 0 when she is not stuck.' },
    trusts: { type: 'number', label: 'trust', help: 'How much she trusts now: 0 = a stranger .. 1 = fully.' },
    sitting: { type: 'yesno', label: 'sitting?', help: 'Yes while she sits.' },
  },
  create(n) {
    Object.assign(n.state, { rnd: seeded(`cat ${n.me.id}`), vx: 0, facing: -1, mode: 'follow', modeT: 0, scamper: 1, idleT: 0, cycle: 0,
      sit: 1, wash: 0, washT: 4, washing: 0, lookUp: 0, arch: 0, blink: 3, rubT: 6, rubTo: null, seen: {}, trust: null, used: 0, mewT: 3, watching: null,
      on: null, followUp: false, girlWasUp: false, upDir: 1, stuck: false, descending: false, callT: 0.8 });
  },
  tick(n, dt) {
    const s = n.state, p = n.me.pos, rnd = s.rnd, size = Math.max(0.1, n.in('size')), jump = Math.max(0, n.in('startle'));
    if (s.trust === null) s.trust = Math.max(0, Math.min(1, n.in('trust')));
    const girl = n.world.instances.find((i) => i.kind === n.in('follows') && !i.removed && i !== n.me);
    let want = 0, up = false, girlOn = null;
    if (girl) {
      const g = girl.pos, gz = g[2] || 0, dist = Math.abs(p[0] - g[0]);
      let f = null;
      girl.each((m) => { if (!f && m.type.feet) f = m.type.feet(m); });
      const gvx = f ? f.vx : 0, side = Math.sign(p[0] - g[0]) || -(f ? f.facing : 1), aloft = !!s.on;
      // the girl going up onto a branch: this time, does she follow her up? (one time in three, say)
      girlOn = f && f.standing ? f.on : null;
      if (girlOn && !s.girlWasUp && !aloft) s.followUp = rnd() < Math.max(0, n.in('climbs'));
      s.girlWasUp = !!girlOn;
      up = gz > 60 && !aloft;
      // what startles her: a hard landing near her, a kick towards her, (not trusting yet) the girl rushing at her
      // (up a branch she can't be frightened by the girl down below, only by her up at her height; never while she
      // climbs down to her)
      const fresh = (e, key) => e && e.id !== s.seen[key] && n.world.time - e.time < 0.1 && ((s.seen[key] = e.id), true);
      const level = !s.descending && (!aloft || Math.abs(gz - (p[2] || 0)) < 80);
      let scare = false;
      if (level && f && fresh(f.landing, 'landing') && f.landing.impact > 650 && dist < 260 * jump) scare = true;
      if (level && f && fresh(f.strike, 'strike') && (p[0] - g[0]) * f.strike.dir > -20 && dist < 230 * jump) scare = true;
      if (level && s.trust < 0.5 && jump > 0 && dist < 120 && (p[0] - g[0]) * gvx > 0 && Math.abs(gvx) > 150 && !up) scare = true;
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
        if (s.mode !== 'scamper' && !aloft && jump > 0 && od < 140 && Math.abs(of.vx) > 120 && rnd() < (1 - s.used) * 0.5) {
          s.mode = 'scamper'; s.modeT = 0.75; s.scamper = Math.sign(p[0] - of.x) || 1; s.arch = 1;
          n.fire('startled');
          if (n.me.removed) return;
        }
      }
      // trust grows with calm company (slower when she is far off)
      if (s.mode !== 'scamper' && Math.abs(gvx) < 200) s.trust = Math.min(1, s.trust + (dt / Math.max(1, n.in('warm'))) * (dist < n.in('far') * 1.6 ? 1 : 0.3));
      // up a branch herself: the girl on the ground right underneath her → she turns and walks back down the way she came
      if (aloft && !s.descending && !girlOn && gz < 5 && dist < 90) { s.descending = true; s.stuck = false; }
      if (s.mode === 'scamper') {
        want = s.scamper * n.in('run');
        if ((s.modeT -= dt) <= 0) { s.mode = 'follow'; s.idleT = 0; }
      } else if (s.descending) want = -s.upDir * n.in('walk');
      else {
        let gap = lerp(n.in('far'), n.in('close'), s.trust ** 1.5) * size;
        if (aloft || s.followUp) gap = Math.min(gap, 110 * size);     // (following her up, she keeps close behind)
        let target = g[0] + side * gap;                              // keeps to her side of the girl, that far off
        if (up) target = g[0] + side * 45 * size;                    // the girl up a tree: wait at its foot
        if (aloft && !girlOn) target = g[0];                         // up a branch, the girl on the ground: along it to above her
        // trusting fully: when the girl has stood still a while, walk past her legs to her other side
        s.rubT -= dt;
        if (!up && !aloft && s.trust > 0.85 && s.rubT <= 0 && Math.abs(gvx) < 5 && s.idleT > 3 && dist < gap * 2) { s.rubTo = g[0] - side * gap * 0.9; s.rubT = 14 + rnd() * 10; }
        if (s.rubTo !== null) { target = s.rubTo; if (Math.abs(p[0] - s.rubTo) < 8) s.rubTo = null; }
        // near enough: she stays put (a looser margin when keeping her distance); further off, she walks, speeding up
        // to a run the further behind she is
        const dx = target - p[0], slack = up || aloft || s.rubTo !== null ? 8 : 20 + gap * 0.08, walk = n.in('walk'), runs = n.in('run');
        // (once settled she stays settled till things are well out of place: trust creeping up doesn't keep getting her up)
        const margin = s.settled && !up && !aloft && s.rubTo === null ? slack + 60 : slack;
        if (Math.abs(dx) > margin) { s.settled = false; want = Math.sign(dx) * (walk + (runs - walk) * Math.min(1, Math.max(0, (Math.abs(dx) - slack) / 300))); }
        else s.settled = true;
      }
    }
    s.vx += (want * size - s.vx) * Math.min(1, dt * 5);
    if (!want && Math.abs(s.vx) < 3) s.vx = 0;
    const [w] = n.world.bounds, nx = Math.min(w, Math.max(0, p[0] + s.vx * dt));
    if (s.on || (s.followUp && girlOn)) climb(n, nx, girlOn);         // up a branch, or stepping onto one to follow her up
    else { p[0] = nx; p[2] = 0; }
    // on a branch she walks at its depth (else, nearer the camera than it, she'd seem to float above it up high) and
    // tilts with its slope; on the ground, back in her own lane, level
    const ledge = s.on && n.world.ledges(n.me).find((l) => l.node === s.on), home = n.me.home ? n.me.home[1] : p[1];
    let slope = 0;
    if (ledge) {
      const a = ledge.height(p[0] - 6), b = ledge.height(p[0] + 6);
      if (a !== null && b !== null) slope = Math.atan2(b - a, 12);
    }
    s.tilt = (s.tilt || 0) + (slope - (s.tilt || 0)) * Math.min(1, dt * 10);
    p[1] += ((ledge ? s.on.me.pos[1] + 3 : home) - p[1]) * Math.min(1, dt * 8);
    // stuck: out at the end of a branch, or sitting up one with the girl down on the ground (not underneath her) — she
    // calls for help (so the player notices), a moment after she finds she can't get down, then every few seconds
    const stranded = s.stuck || (!!s.on && !s.descending && !girlOn && !!girl && (girl.pos[2] || 0) < 5 && s.idleT > 1.5);
    if (!stranded) { s.callT = 0.8; s.callNo = 0; }
    else if ((s.callT -= dt) <= 0) { s.callT = 3.5 + rnd() * 2.5; s.callNo = (s.callNo || 0) + 1; n.fire('calls'); if (n.me.removed) return; }
    const moving = Math.abs(s.vx) > 10;
    if (moving) s.facing = Math.sign(s.vx);
    else if (girl && s.mode !== 'scamper') s.facing = Math.sign(girl.pos[0] - p[0]) || s.facing;   // sitting, she watches her
    // birds about: sitting (or standing still), she watches the nearest instead; a short mew now and then
    const birdy = Math.max(0, n.in('watches'));
    s.watching = birdy > 0 && !moving && s.mode !== 'scamper' ? nearestBird(n, p[0], 650) : null;
    if (s.watching) {
      s.facing = Math.sign(s.watching.x - p[0]) || s.facing;
      if ((s.mewT -= dt) <= 0) {
        s.mewT = (5 + rnd() * 9) / birdy;
        if (rnd() < (s.watching.flying ? 0.5 : 0.25) && !n.me.removed) { n.fire('mewed'); if (n.me.removed) return; }
      }
    }
    // mewing by herself (chatty): the girl jumping up a tree, leaving her below, a mew a moment later (most times);
    // sitting a while, one now and then
    const chat = Math.max(0, n.in('chatty'));
    if (chat > 0 && !s.watching && !s.on && s.mode !== 'scamper') {
      if (up && !s.wasUp && rnd() < Math.min(1, 0.7 * chat)) s.upMew = 0.6 + rnd() * 0.8;
      if (s.upMew > 0 && (s.upMew -= dt) <= 0) { n.fire('mewed'); if (n.me.removed) return; }
      s.sitMew = (s.sitMew ?? 12 + rnd() * 10) - (s.sit > 0.9 && s.idleT > 5 ? dt * chat : 0);
      if (s.sitMew <= 0) { s.sitMew = 18 + rnd() * 20; if (rnd() < 0.7) { n.fire('mewed'); if (n.me.removed) return; } }
    }
    s.wasUp = up;
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
    s.lookUp += ((up ? 1 : s.watching ? Math.min(1, Math.max(0, (s.watching.z - 10) / 220)) : 0) - s.lookUp) * Math.min(1, dt * 3);
    s.arch = Math.max(0, s.arch - dt * 1.4);
    s.blink -= dt; if (s.blink < -0.15) s.blink = 2 + rnd() * 4;
    if (steps && moving && !n.me.removed) n.fire('step');
  },
  // her paws, for the leaves she walks through (and the branch she's on, which bends a little under her)
  feet(n) {
    const s = n.state, p = n.me.pos;
    return { x: p[0], y: p[1], z: p[2] || 0, vx: s.vx, vz: 0, standing: true, on: s.on, landing: null, facing: s.facing, kick: null, strike: null };
  },
  draw(n, out) {
    const s = n.state;
    out.push({ kind: 'cat', at: n.me.pos, facing: s.facing, scale: Math.max(0.1, n.in('size')), colour: n.in('colour'), eyes: n.in('eyes'), alpha: n.in('opacity'), slope: s.tilt || 0,
      pose: catPose({ phase: s.cycle % 1, speed: Math.abs(s.vx) / (110 * Math.max(0.1, n.in('size'))), sit: s.sit, wash: s.wash, lookUp: s.lookUp, arch: s.arch, t: n.world.time, blink: s.blink < 0 }) });
  },
  read: { trusts: (n) => n.state.trust ?? n.in('trust'), sitting: (n) => n.state.sit > 0.5, callNo: (n) => n.state.callNo || 0 },
});

// Walking up branches (Ledges), to x: from the ground, onto the foot of a branch that slopes up from the ground to
// where the girl is; along a branch, onto the next one that carries on at the same height (the bough into the branch
// at the trunk); off the bottom of the slope, the ground again. Off the end of a branch with nothing to walk onto:
// too high to jump down, so she can't go on (stuck).
function climb(n, nx, girlOn) {
  const s = n.state, p = n.me.pos, z = p[2] || 0, ls = n.world.ledges(n.me), reach = 10 + Math.abs(nx - p[0]) * 1.5;
  if (!s.on) {
    const foot = girlOn && ls.find((l) => { const h = l.height(nx); return h !== null && h <= reach && joined(l, girlOn, ls); });
    if (foot) { s.on = foot.node; s.upDir = Math.sign(nx - p[0]) || 1; s.stuck = false; p[2] = foot.height(nx); } else p[2] = 0;
    p[0] = nx;
    return;
  }
  const here = ls.find((l) => l.node === s.on), h = here ? here.height(nx) : null;
  if (h !== null) {
    // nearing the tip of this branch with nothing to walk on beyond it: she stops, front paws at the tip (stuck)
    const ahead = Math.sign(nx - p[0]), tip = ahead > 0 ? here.x2 : here.x1, tz = here.height(tip) ?? h;
    const goesOn = tz <= 15 || ls.some((l) => l.node !== s.on && l.height(tip + ahead * 2) !== null && Math.abs(l.height(tip + ahead * 2) - tz) <= 15);
    if (ahead && Math.abs(tip - nx) < 18 && !goesOn) { s.vx = 0; s.stuck = true; return; }
    p[0] = nx; p[2] = h; s.stuck = false; return;
  }
  let next = null;
  for (const l of ls) { const hh = l.height(nx); if (l.node !== s.on && hh !== null && Math.abs(hh - z) <= reach && (!next || hh > next.h)) next = { h: hh, node: l.node }; }
  if (next) { s.on = next.node; p[0] = nx; p[2] = next.h; s.stuck = false; }
  else if (z <= reach) {                                             // down at the foot of the slope (helped down: a little more trust)
    if (s.descending) s.trust = Math.min(1, (s.trust ?? 0) + 0.1);
    s.on = null; p[0] = nx; p[2] = 0; s.descending = false; s.followUp = false; s.stuck = false;
  }
  else { s.vx = 0; s.stuck = true; }                                                                                         // the end of a branch: too high to jump
}
// does branch l lead up to the one the girl is on (it is that one, or its top end meets one of that one's ends)?
function joined(l, on, ls) {
  if (l.node === on) return true;
  const top = l.z1 > l.z2 ? [l.x1, l.z1] : [l.x2, l.z2], g = ls.find((q) => q.node === on);
  return !!g && [[g.x1, g.z1], [g.x2, g.z2]].some(([x, z]) => Math.abs(x - top[0]) < 20 && Math.abs(z - top[1]) < 20);
}
