import { defineNode } from '../engine/registry.js';

defineNode({
  type: 'on-start', title: 'On start', kind: 'when',
  help: 'Fires once when the scene begins.',
  outputs: { started: { flow: true, help: 'Fires once, the moment the scene begins.' } },
  begin(n) { n.fire('started'); },
});
