import { defineNode } from '../engine/registry.js';

// Turns a question into events: like a trigger zone's entered / left, but for any yes/no.
defineNode({
  type: 'on-change', title: 'On change', kind: 'when',
  help: 'Watches a yes/no and fires when it flips: "turned yes" or "turned no".',
  inputs: { value: { type: 'yesno', value: false, label: 'watch', help: 'The yes/no to watch (wire in e.g. a Compare).' } },
  outputs: {
    turnedYes: { flow: true, label: 'turned yes', help: 'Fires the moment it changes from no to yes.' },
    turnedNo: { flow: true, label: 'turned no', help: 'Fires the moment it changes from yes to no.' },
    now: { type: 'yesno', label: 'yes now?', help: 'What it is right now.' },
  },
  create(n) { n.state.last = false; },
  tick(n) {
    const v = !!n.in('value');
    if (v === n.state.last) return;
    n.state.last = v;
    n.fire(v ? 'turnedYes' : 'turnedNo');
  },
  read: { now: (n) => n.state.last },
});
