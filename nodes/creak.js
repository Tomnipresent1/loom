import { defineNode } from '../engine/registry.js';
import { SEND_INPUTS, sends, previewSends } from '../engine/sends.js';

// A branch taking a weight (Autumn), made in code: a hollow woody knock, and for a harder landing a short strained
// creak of wood. Every one a little different. Heard from "where" (left / right of the listener pans it).
defineNode({
  type: 'creak', title: 'Branch creak', kind: 'do',
  help: 'A branch taking a weight, made in code: a hollow woody knock, and for a harder landing a short creak. Wire a Ledge\'s "landed on" and its landing speed.',
  inputs: {
    go: { flow: true, label: 'play', help: 'Creak now.' },
    hard: { type: 'number', value: 600, label: 'how hard', help: 'How hard (a landing speed: about 600 = a hop, 1000 or more = a drop from higher up). The harder, the louder, and the more it creaks.' },
    where: { type: 'position', value: [0, 0, 0], help: 'Where it is heard from. Unwired: this thing.' },
    volume: { type: 'number', value: 1, help: '0 = silent, 1 = normal, 2 = twice as loud.' },
    ...SEND_INPUTS,
  },
  outputs: { then: { flow: true, help: 'Fires straight after it starts.' } },
  on: {
    go(n) {
      const at = n.spec.dataIn.where ? n.in('where') : n.me.pos, ear = n.world.listener(), near = n.in('near');
      let volume = Math.max(0, Math.min(4, n.in('volume')));
      if (near > 0) volume *= Math.max(0, 1 - Math.hypot(at[0] - ear[0], at[1] - ear[1], (at[2] || 0) - (ear[2] || 0)) / near) ** 2;
      const pan = Math.max(-1, Math.min(1, (at[0] - ear[0]) / 900)) * 0.8;
      if (volume > 0) n.world.playSound({ kind: 'creak', hard: Math.max(0, n.in('hard')), pan, volume, ...sends(n) });
      n.fire('then');
    },
  },
  preview: (get) => ({ play: [{ kind: 'creak', hard: Math.max(0, get('hard')), volume: Math.max(0, Math.min(4, get('volume'))), ...previewSends(get) }] }),
});
