import { defineNode } from '../engine/registry.js';

defineNode({
  type: 'send', title: 'Send', kind: 'do',
  help: 'Sends a message: to one thing (wire it into "to"), to every thing of a kind, or to everyone.',
  inputs: {
    go: { flow: true, help: 'Send the message now.' },
    message: { type: 'message', value: '', setting: true, help: 'Which message to send (from the list in piece.json).' },
    mode: { type: 'choice', value: 'one', options: ['one', 'kind', 'everyone'], setting: true, label: 'send to',
      help: 'one: the thing wired into "to". kind: every thing of one kind. everyone: every thing in the scene.' },
    to: { type: 'thing', value: null, help: 'The thing to send to (when sending to one).' },
    kind: { type: 'kind', value: '', setting: true, help: 'Which kind of thing to send to (when sending to a kind).' },
    data: { type: 'any', value: null, help: 'Anything to send along with the message (optional).' },
  },
  outputs: { then: { flow: true, help: 'Fires straight after sending.' } },
  on: {
    go(n) {
      n.world.send(n.in('message'), { mode: n.in('mode'), to: n.in('to'), kind: n.in('kind'), from: n.me, data: n.in('data') });
      n.fire('then');
    },
  },
});
