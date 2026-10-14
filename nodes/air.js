import { defineNode } from '../engine/registry.js';
import { SEND_INPUTS, heard, sends } from '../engine/sends.js';

// NAMI's air: the quiet ambience under everything in Plum Blossom: a low bed of noise breathing slowly in and out, and a
// very faint low drone. Held while its thing is in the scene.
defineNode({
  type: 'air', title: 'Air', kind: 'part',
  help: 'A quiet ambience under everything: a low breathing bed and a faint drone (NAMI\'s). Volume 1 = as loud as NAMI\'s.',
  inputs: {
    volume: { type: 'number', value: 1, help: '1 = as loud as in NAMI\'s Plum Blossom.' },
    ...SEND_INPUTS,
    space: { ...SEND_INPUTS.space, value: 0 },
  },
  sound(n, out) {
    const v = heard(n, n.in('volume') / 2) * 2;
    if (v > 0.001) out.push({ key: `${n.me.id}.${n.id}`, kind: 'air', volume: v, ...sends(n) });
  },
});
