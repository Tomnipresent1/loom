import { defineNode } from '../engine/registry.js';

const ORDER = ['first', 'second', 'third', 'fourth'];

defineNode({
  type: 'sequence', title: 'Sequence', kind: 'do',
  help: 'Splits one white wire into several, fired in order: first, second, third, fourth.',
  inputs: { go: { flow: true, help: 'Fire all the outputs, in order.' } },
  outputs: Object.fromEntries(ORDER.map((k, i) => [k, { flow: true, help: `Fires ${i ? 'after the ' + ORDER[i - 1] : 'first'}.` }])),
  on: { go(n) { for (const k of ORDER) { if (n.me.removed) return; n.fire(k); } } },
});
