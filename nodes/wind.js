import { defineNode } from '../engine/registry.js';
import { SEND_INPUTS, heard, sends, previewSends } from '../engine/sends.js';

// NAMI's wind: a soft, breathy bed of noise that grows louder and brighter as the breeze rises. Held while its thing is
// in the scene. Autumn's "dry leaves": the leaves still on the trees rattling in it, much louder in a gust. (Made in
// code; swap for a Sound loop of a recording any time.)
defineNode({
  type: 'wind', title: 'Wind', kind: 'part',
  help: 'A soft breathy wind that grows louder and brighter with its strength (wire in a Breeze), with dry leaves rattling in the trees if you like. Volume 1 = as loud as NAMI\'s.',
  inputs: {
    strength: { type: 'number', value: 0.5, help: '0 = still (silent), 1 = a strong gust. Live: wire in a Breeze.' },
    leaves: { type: 'number', value: 0, label: 'dry leaves', help: 'Dry leaves rattling in the trees on top of the wind, quiet in a lull and much louder in a gust: 0 = none (a bare garden), 1 = an autumn wood.' },
    volume: { type: 'number', value: 1, help: '1 = as loud as in NAMI\'s Plum Blossom.' },
    ...SEND_INPUTS,
    space: { ...SEND_INPUTS.space, value: 0 },
  },
  sound(n, out) {
    const v = heard(n, n.in('volume') / 2) * 2;             // (heard() caps at 1; volume may go up to 2)
    if (v > 0.001) out.push({ key: `${n.me.id}.${n.id}`, kind: 'wind', level: Math.max(0, Math.min(1, n.in('strength'))), leaves: Math.max(0, Math.min(3, n.in('leaves'))), volume: v, ...sends(n) });
  },
  // heard on its own: a lull rising to a gust and back (its strength usually comes from a Breeze)
  preview: (get) => ({ hum: (t) => ({ kind: 'wind', level: 0.25 + 0.75 * Math.sin((Math.PI * t) / 7) ** 2, leaves: Math.max(0, Math.min(3, get('leaves'))), volume: Math.max(0, Math.min(2, get('volume'))), ...previewSends(get) }), seconds: 7 }),
});
