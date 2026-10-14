import { defineNode } from '../engine/registry.js';

defineNode({
  type: 'on-message', title: 'On message', kind: 'when',
  help: 'Fires when this thing is sent the message.',
  inputs: { message: { type: 'message', value: '', setting: true, help: 'Which message to listen for.' } },
  outputs: {
    received: { flow: true, help: 'Fires when this thing is sent the message.' },
    from: { type: 'thing', help: 'Who sent it.' },
    data: { type: 'any', help: 'What came with it (if anything).' },
  },
  receive(n, message, { from, data }) {
    if (message !== n.in('message')) return;
    n.state.from = from; n.state.data = data;
    n.fire('received');
  },
  read: { from: (n) => n.state.from || null, data: (n) => (n.state.data === undefined ? null : n.state.data) },
});
