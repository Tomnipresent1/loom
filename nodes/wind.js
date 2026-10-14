import { defineNode } from '../engine/registry.js';
import { SEND_INPUTS, heard, sends } from '../engine/sends.js';

// NAMI's wind: a soft, breathy bed of noise that grows louder and brighter as the breeze rises. Held while its thing is
// in the scene. (Made in code; swap for a Sound loop of a recording any time.)
defineNode({
  type: 'wind', title: 'Wind', kind: 'part',
  help: 'A soft breathy wind that grows louder and brighter with its strength (wire in a Breeze). Volume 1 = as loud as NAMI\'s.',
  inputs: {
    strength: { type: 'number', value: 0.5, help: '0 = still (silent), 1 = a strong gust. Live: wire in a Breeze.' },
    volume: { type: 'number', value: 1, help: '1 = as loud as in NAMI\'s Plum Blossom.' },
    ...SEND_INPUTS,
    space: { ...SEND_INPUTS.space, value: 0 },
  },
  sound(n, out) {
    const v = heard(n, n.in('volume') / 2) * 2;             // (heard() caps at 1; volume may go up to 2)
    if (v > 0.001) out.push({ key: `${n.me.id}.${n.id}`, kind: 'wind', level: Math.max(0, Math.min(1, n.in('strength'))), volume: v, ...sends(n) });
  },
});
