import { defineNode } from '../engine/registry.js';
import { SEND_INPUTS, sends, previewSends } from '../engine/sends.js';

// Acorns knocking (Autumn's nuts), made in code: little hollow wooden tocks, more for more nuts, louder and brighter for
// harder. Every one is different. Heard from "where" (a Leaf pile's): to the left or right of the listener it pans that
// way; "hear within" fades it with distance. Wire a Leaf pile of nuts: "dropped" (they land and bounce), "kicked",
// "landed in", "scooped up", with its "how many flew" and "strength".
defineNode({
  type: 'nut-clatter', title: 'Nut clatter', kind: 'do',
  help: 'Acorns knocking, made in code: little hollow wooden tocks, more for more nuts. Every one is different.',
  inputs: {
    go: { flow: true, label: 'play', help: 'Clatter now.' },
    nuts: { type: 'number', value: 3, label: 'how many nuts', help: 'How many knock: 1 = a single tock, 5 = a little clatter, 14 or more = a handful.' },
    strength: { type: 'number', value: 0.6, help: 'How hard: 0.2 = a soft roll, 1 = dropped from a height (louder, brighter).' },
    where: { type: 'position', value: [0, 0, 0], help: 'Where it is heard from (wire a Leaf pile\'s "where"). Unwired: this thing.' },
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
      if (volume > 0) n.world.playSound({ kind: 'nuts', nuts: Math.max(0, n.in('nuts')), strength: Math.max(0, Math.min(3, n.in('strength'))), pan, volume, ...sends(n) });
      n.fire('then');
    },
  },
  preview: (get) => ({ play: [{ kind: 'nuts', nuts: Math.max(0, get('nuts')), strength: Math.max(0, Math.min(3, get('strength'))), volume: Math.max(0, Math.min(4, get('volume'))), ...previewSends(get) }] }),
});
