import { defineNode } from '../engine/registry.js';
import { SEND_INPUTS, sends, clamp01, previewSends } from '../engine/sends.js';

// The crunch of dry leaves (Autumn), made in code: a shower of tiny crackles, more and longer for more leaves, crisper
// for a harder kick, with an optional soft low whump (landing in a pile). Every one is different. Heard from "where"
// (a Leaf pile's): to the left or right of the listener it pans that way; "hear within" fades it with distance.
defineNode({
  type: 'crunch', title: 'Crunch', kind: 'do',
  help: 'The crunch of dry leaves, made in code: lots of tiny crackles, more and longer for more leaves, with an optional soft whump. Every one is different.',
  inputs: {
    go: { flow: true, label: 'play', help: 'Crunch now.' },
    leaves: { type: 'number', value: 6, label: 'how many leaves', help: 'How many leaves crunch: 1 = a single crackle, 10 = a kick, 40 or more = a big burst.' },
    strength: { type: 'number', value: 0.6, help: 'How hard: 0.2 = a gentle shuffle (soft and dull), 1 = a brisk kick (crisp), 1.5 = a big landing.' },
    thump: { type: 'number', value: 0, label: 'whump', help: 'A soft low whump underneath (landing in a pile): 0 = none, 1 = full.' },
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
      if (volume > 0) n.world.playSound({ kind: 'crunch', leaves: Math.max(0, n.in('leaves')), strength: Math.max(0, Math.min(3, n.in('strength'))), thump: clamp01(n.in('thump')), pan, volume, ...sends(n) });
      n.fire('then');
    },
  },
  // (heard on its own: how many leaves and how hard as set; wired from a Leaf pile, a typical kick through them)
  preview: (get) => ({ play: [{ kind: 'crunch', leaves: Math.max(0, get('leaves')), strength: Math.max(0, Math.min(3, get('strength'))), thump: clamp01(get('thump')), volume: Math.max(0, Math.min(4, get('volume'))), ...previewSends(get) }] }),
});
