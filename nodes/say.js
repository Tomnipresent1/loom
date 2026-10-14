import { defineNode } from '../engine/registry.js';

defineNode({
  type: 'say', title: 'Say', kind: 'do',
  help: 'Shows text on screen. Seconds 0 = stays until something replaces it.',
  inputs: {
    go: { flow: true, help: 'Show the text now.' },
    text: { type: 'text', value: '', help: 'What to show.' },
    slot: { type: 'choice', value: 'middle', options: ['middle', 'corner'], setting: true, label: 'where',
      help: 'middle: big, in the centre of the screen. corner: small, top left.' },
    seconds: { type: 'number', value: 2, help: 'How long it stays. 0 = until something replaces it.' },
  },
  outputs: { then: { flow: true, help: 'Fires straight after showing it.' } },
  on: { go(n) { n.world.say(n.in('slot'), n.in('text'), n.in('seconds')); n.fire('then'); } },
});
