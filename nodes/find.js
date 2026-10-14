import { defineNode } from '../engine/registry.js';

defineNode({
  type: 'find', title: 'Find', kind: 'data',
  help: 'Gets hold of a thing in the scene by its kind (e.g. the player), to wire into boxes that want a thing.',
  inputs: { kind: { type: 'kind', value: 'player', setting: true, help: 'Which kind of thing to find. If there are several, the first one.' } },
  outputs: { thing: { type: 'thing', help: 'The thing found (nothing, if there isn\'t one).' } },
  read: { thing: (n) => n.world.instances.find((i) => i.kind === n.in('kind') && !i.removed) || null },
});
