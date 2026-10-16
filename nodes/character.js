import { defineNode } from '../engine/registry.js';
import { createRig, stepRig, rigPose } from '../engine/character.js';

// A side-on person (Autumn's girl), drawn by code (runtime/character2d.js), moving by herself: she walks with her
// thing's walking (her feet keep pace with the ground), jumps, lands with her knees giving, breathes and blinks
// standing, her ponytail and scarf swinging. With a Walk and jump in the same thing she follows it exactly (on her feet
// or in the air, which way she faces, each landing); otherwise she works it out from how her thing moves.
// Any piece of her can be a picture instead: add a Painted pieces box to the same thing.
defineNode({
  type: 'character', title: 'Character', kind: 'part',
  help: 'A side-on person drawn by code, who walks, jumps and lands by herself with her thing (her feet keep pace). Add a Painted pieces box to swap any piece for a picture.',
  inputs: {
    height: { type: 'number', value: 165, help: 'How tall she is, in scene units (165 = 1.65 m).' },
    coat: { type: 'colour', value: '#2f6f73', help: 'Her coat.' },
    scarf: { type: 'colour', value: '#c23b2e', help: 'Her scarf (and the hat\'s pompom).' },
    hat: { type: 'colour', value: '#efe3c8', help: 'Her knitted hat.' },
    hair: { type: 'colour', value: '#3b2418', help: 'Her hair.' },
    skin: { type: 'colour', value: '#f1cfae', help: 'Her skin.' },
    tights: { type: 'colour', value: '#3b2b3c', help: 'Her tights.' },
    boots: { type: 'colour', value: '#6a4026', help: 'Her boots.' },
    opacity: { type: 'number', value: 1, help: '0 = invisible, 1 = solid.' },
  },
  outputs: {
    step: { flow: true, help: 'Fires each time one of her feet comes down while she walks (for footsteps).' },
  },
  create(n) { n.state.rig = createRig(n.me.id); },
  tick(n, dt) {
    const p = n.me.pos, f = feetOf(n);
    const m = f ? { x: p[0], z: p[2] || 0, standing: f.standing, landing: f.landing, facing: f.facing, kick: f.kick }
      : { x: p[0], z: p[2] || 0, standing: (p[2] || 0) <= 0.5, landing: null, facing: 0 };
    m.scale = Math.max(0.05, n.in('height')) / 165;
    const steps = stepRig(n.state.rig, m, dt);
    for (let i = 0; i < steps && !n.me.removed; i++) n.fire('step');
  },
  draw(n, out) {
    const rig = n.state.rig, pieces = piecesOf(n);
    out.push({ kind: 'character', at: n.me.pos, scale: Math.max(0.05, n.in('height')) / 165, facing: rig.facing, pose: rigPose(rig),
      colours: { coat: n.in('coat'), scarf: n.in('scarf'), hat: n.in('hat'), hair: n.in('hair'), skin: n.in('skin'), tights: n.in('tights'), boots: n.in('boots') },
      pieces, alpha: n.in('opacity') });
  },
});

// the feet of a walker in the same thing (Walk and jump), and the Painted pieces box in the same thing, if any
function feetOf(n) { let f = null; n.me.each((m) => { if (!f && m !== n && m.type.feet) f = m.type.feet(m); }); return f; }
function piecesOf(n) { let p = null; n.me.each((m) => { if (!p && m.type.pieces) p = m.type.pieces(m); }); return p; }
