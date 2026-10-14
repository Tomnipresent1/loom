import { defineNode } from '../engine/registry.js';

defineNode({
  type: 'remove-me', title: 'Remove me', kind: 'do',
  help: 'This thing leaves the scene (at the end of the frame).',
  inputs: { go: { flow: true, help: 'Take this thing out of the scene.' } },
  outputs: { then: { flow: true, help: 'Fires just before it goes (at the end of this frame).' } },
  on: { go(n) { n.me.remove(); n.fire('then'); } },
});
