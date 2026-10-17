import { defineNode } from '../engine/registry.js';
import { SEND_INPUTS, sends, panFrom, previewSends } from '../engine/sends.js';

// Footsteps that sound like what is underfoot (Autumn), made in code, every step a little different: soft earth, a
// hollow knock on bark (higher on a thinner branch), a brighter knock on a plank, a muffled shuffle in leaves. "auto"
// asks the feet of the walker in its thing (a Walk and jump, a Cat, a Puppy) what they stand on: a Ledge (drawn as a
// branch = bark, a plank = wood), else the ground, where leaves lying under the foot (a Leaf pile's) make it leaves.
// Heard from those feet: to the side of the listener it pans that way. A landing is both feet, harder for a bigger drop.
defineNode({
  type: 'footsteps', title: 'Footsteps', kind: 'do',
  help: 'Footsteps that sound like what is underfoot: soft earth, a hollow knock on a branch, a knock on a plank, a shuffle in leaves. Wire a Character\'s (or a Cat\'s) "step" into "step".',
  inputs: {
    go: { flow: true, label: 'step', help: 'A foot comes down now (wire a Character\'s, a Cat\'s or a Puppy\'s "step").' },
    land: { flow: true, help: 'Both feet come down at once, after a jump (wire a Character\'s or Walk and jump\'s "landed"): harder for a bigger drop.' },
    under: { type: 'choice', value: 'auto', options: ['auto', 'earth', 'bark', 'wood', 'leaves'], setting: true, label: 'underfoot', help: 'What the feet come down on. auto = whatever is under them: the ground is earth (or leaves, where leaves lie), a branch is bark, a plank is wood.' },
    weight: { type: 'number', value: 1, help: 'How heavy the feet are: 1 = a person in boots, 0.3 = a cat\'s soft paws.' },
    volume: { type: 'number', value: 1, help: '0 = silent, 1 = normal, 2 = twice as loud.' },
    ...SEND_INPUTS,
  },
  outputs: {
    then: { flow: true, help: 'Fires straight after each step.' },
    surface: { type: 'text', label: 'what it was', help: 'What the last step came down on: earth, bark, wood or leaves.' },
  },
  create(n) { n.state.last = 'earth'; },
  on: {
    go(n) { step(n, false); },
    land(n) { step(n, true); },
  },
  read: { surface: (n) => n.state.last },
  // heard on its own: a few steps in a row on what's set underfoot ("auto": earth), then both feet landing
  preview: (get) => {
    const under = ['earth', 'bark', 'wood', 'leaves'].includes(get('under')) ? get('under') : 'earth', weight = Math.max(0.05, Math.min(2, get('weight')));
    const step = { kind: 'step', under, strength: 0.9, weight, land: false, pitch: 1, volume: Math.max(0, Math.min(4, get('volume'))), ...previewSends(get) };
    return { play: [step], repeat: { times: 6, gap: weight < 0.6 ? 0.22 : 0.42, last: { ...step, land: true, strength: 1.2 } } };
  },
});

function step(n, land) {
  const f = feetOf(n), at = f ? [f.x, f.y, f.z] : n.me.pos;
  let under = n.in('under');
  if (!['earth', 'bark', 'wood', 'leaves'].includes(under)) under = underfoot(n, f, at);
  n.state.last = under;
  const near = n.in('near'), ear = n.world.listener();
  let volume = Math.max(0, Math.min(4, n.in('volume')));
  if (near > 0) volume *= Math.max(0, 1 - Math.hypot(at[0] - ear[0], at[1] - ear[1], (at[2] || 0) - (ear[2] || 0)) / near) ** 2;
  const strength = land ? Math.max(0.5, Math.min(2, (f && f.landing ? f.landing.impact : 600) / 600)) : Math.max(0.3, Math.min(1.2, 0.45 + (f ? Math.abs(f.vx) : 150) / 330));
  const thick = f && f.on && f.on.type.ledge ? Math.max(4, f.on.in('thickness')) : 22;
  if (volume > 0) n.world.playSound({ kind: 'step', under, strength, weight: Math.max(0.05, Math.min(2, n.in('weight'))), land, pitch: Math.sqrt(22 / thick), pan: panFrom(n, at), volume, ...sends(n) });
  n.fire('then');
}

// what the feet stand on: a Ledge (its look), else the ground: leaves if a few lie under the foot, else earth
function underfoot(n, f, at) {
  if (f && f.on && f.on.type.ledge) return f.on.in('look') === 'branch' ? 'bark' : 'wood';
  if (at[2] > 2) return 'earth';
  let count = 0;
  for (const inst of n.world.instances) if (!inst.removed) inst.each((m) => { if (m.type.underfoot) count += m.type.underfoot(m, at[0], at[1]); });
  return count >= 2 ? 'leaves' : 'earth';
}

// the feet of a walker in the same thing (Walk and jump, Cat, Puppy), if any
function feetOf(n) { let f = null; n.me.each((m) => { if (!f && m !== n && m.type.feet) f = m.type.feet(m); }); return f; }
