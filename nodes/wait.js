import { defineNode } from '../engine/registry.js';

// Unreal's Delay (but a second "go" while waiting starts the wait again).
defineNode({
  type: 'wait', title: 'Wait', kind: 'do',
  help: 'Waits a while, then carries on. If told to go again while waiting, it starts the wait again.',
  inputs: {
    go: { flow: true, help: 'Start waiting.' },
    seconds: { type: 'number', value: 1, help: 'How long to wait.' },
  },
  outputs: {
    then: { flow: true, help: 'Fires when the wait is over.' },
    waiting: { type: 'yesno', label: 'waiting?', help: 'Yes while it is waiting.' },
  },
  create(n) { n.state.left = null; },
  on: { go(n) { n.state.left = Math.max(0, n.in('seconds')); } },
  tick(n, dt) {
    if (n.state.left === null) return;
    n.state.left -= dt;
    if (n.state.left <= 0) { n.state.left = null; n.fire('then'); }
  },
  read: { waiting: (n) => n.state.left !== null },
});
