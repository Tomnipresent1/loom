import { defineNode } from '../engine/registry.js';

defineNode({
  type: 'every-frame', title: 'Every frame', kind: 'when',
  help: 'Fires every frame. For special cases: most things follow live wires instead.',
  outputs: {
    tick: { flow: true, label: 'each frame', help: 'Fires 60 times a second.' },
    seconds: { type: 'number', label: 'frame time', help: 'How long the last frame took, in seconds (about 0.017).' },
  },
  tick(n, dt) { n.state.dt = dt; n.fire('tick'); },
  read: { seconds: (n) => n.state.dt || 0 },
});
