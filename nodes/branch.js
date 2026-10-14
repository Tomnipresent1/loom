import { defineNode } from '../engine/registry.js';

// Unreal's Branch.
defineNode({
  type: 'branch', title: 'If', kind: 'do',
  help: 'Goes one way or the other: when the white wire arrives, it carries on out of "yes" or "no".',
  inputs: {
    go: { flow: true, help: 'Ask the question now.' },
    condition: { type: 'yesno', value: true, label: 'is it yes?', help: 'The question (wire in a yes/no, e.g. from Compare).' },
  },
  outputs: {
    yes: { flow: true, help: 'Fires if the answer is yes.' },
    no: { flow: true, help: 'Fires if the answer is no.' },
  },
  on: { go(n) { n.fire(n.in('condition') ? 'yes' : 'no'); } },
});
