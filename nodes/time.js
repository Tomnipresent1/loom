import { defineNode } from '../engine/registry.js';

defineNode({
  type: 'time', title: 'Time', kind: 'data',
  help: 'How many seconds the scene has been running. Always up to date.',
  outputs: { seconds: { type: 'number', help: 'Seconds since the scene started.' } },
  read: { seconds: (n) => n.world.time },
});
