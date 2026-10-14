import { defineNode } from '../engine/registry.js';
import { curveKeys, evalCurve } from '../engine/curve.js';

// Unreal's Timeline: Play runs forward, Reverse runs back, both from wherever it is now (it never jumps).
defineNode({
  type: 'ramp', title: 'Ramp', kind: 'do',
  help: 'Runs a curve forward (Play) or back (Reverse) from wherever it is; gives its value every frame.',
  inputs: {
    play: { flow: true, help: 'Run the curve forward, from wherever it is now.' },
    reverse: { flow: true, help: 'Run the curve backward, from wherever it is now.' },
    seconds: { type: 'number', value: 1.5, help: 'How long a full run from bottom to top takes.' },
    from: { type: 'number', value: 0, help: 'The value at the bottom of the curve.' },
    to: { type: 'number', value: 1, help: 'The value at the top of the curve.' },
    curve: { type: 'curve', value: 'ease-in-out', setting: true, help: 'The shape of the run: how it speeds up and slows down.' },
    loop: { type: 'choice', value: 'none', options: ['none', 'loop', 'ping-pong'], setting: true,
      help: 'none: stop at the ends. loop: jump back and go again. ping-pong: bounce back and forth.' },
  },
  outputs: {
    value: { type: 'number', help: 'Where the ramp is right now, between "from" and "to". Always up to date.' },
    reachedTop: { flow: true, label: 'reached top', help: 'Fires when a forward run gets to the top.' },
    backToBottom: { flow: true, label: 'back at bottom', help: 'Fires when a backward run gets back to the bottom.' },
  },
  create(n) { n.state.t = 0; n.state.dir = 0; },
  on: {
    play(n) { if (n.state.t < 1 || n.in('loop') !== 'none') n.state.dir = 1; },
    reverse(n) { if (n.state.t > 0 || n.in('loop') !== 'none') n.state.dir = -1; },
  },
  tick(n, dt) {
    const s = n.state;
    if (!s.dir) return;
    s.t += (s.dir * dt) / Math.max(0.001, n.in('seconds'));
    const loop = n.in('loop');
    if (s.t >= 1) {
      if (loop === 'loop') s.t -= 1; else if (loop === 'ping-pong') { s.t = 1; s.dir = -1; } else { s.t = 1; s.dir = 0; }
      n.fire('reachedTop');
    } else if (s.t <= 0) {
      if (loop === 'loop') s.t += 1; else if (loop === 'ping-pong') { s.t = 0; s.dir = 1; } else { s.t = 0; s.dir = 0; }
      n.fire('backToBottom');
    }
  },
  read: {
    value(n) {
      const a = n.in('from'), b = n.in('to');
      return a + (b - a) * evalCurve(curveKeys(n.in('curve')), n.state.t);
    },
  },
});
