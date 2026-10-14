import { defineNode } from '../engine/registry.js';

defineNode({
  type: 'trigger-zone', title: 'Trigger zone', kind: 'when',
  help: 'An invisible circle round this thing. Fires when something comes in or goes out.',
  inputs: {
    radius: { type: 'number', value: 80, help: 'How far the zone reaches from this thing, in scene units.' },
    only: { type: 'kind', value: '', setting: true, label: 'only notice', help: 'Which kind of thing the zone reacts to (e.g. player). Empty = anything.' },
  },
  outputs: {
    entered: { flow: true, help: 'Fires when a thing comes into the zone.' },
    left: { flow: true, help: 'Fires when a thing goes out of the zone.' },
    who: { type: 'thing', help: 'The thing that last came in or went out.' },
    inside: { type: 'yesno', label: 'anyone inside?', help: 'Yes while at least one thing is inside the zone.' },
  },
  create(n) { n.state.inside = new Set(); n.state.who = null; },
  tick(n) {
    const r = n.in('radius'), only = n.in('only'), me = n.me, inside = n.state.inside;
    for (const o of inside) if (o.removed) inside.delete(o);
    for (const o of n.world.instances) {
      if (o === me || o.removed || (only && o.kind !== only)) continue;
      const near = Math.hypot(o.pos[0] - me.pos[0], o.pos[1] - me.pos[1], o.pos[2] - me.pos[2]) <= r;
      if (near === inside.has(o)) continue;
      if (near) inside.add(o); else inside.delete(o);
      n.state.who = o;
      n.fire(near ? 'entered' : 'left');
      if (me.removed) return;
    }
  },
  read: { who: (n) => n.state.who, inside: (n) => n.state.inside.size > 0 },
});
