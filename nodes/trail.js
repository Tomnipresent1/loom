import { defineNode } from '../engine/registry.js';

defineNode({
  type: 'trail', title: 'Trail', kind: 'part',
  help: 'Leaves a fading line behind this thing as it moves.',
  inputs: {
    colour: { type: 'colour', value: '#ffffff', help: 'The trail\'s colour.' },
    seconds: { type: 'number', value: 0.6, label: 'length', help: 'How many seconds of path the trail shows.' },
    width: { type: 'number', value: 3, help: 'How thick the trail is at the thing (it thins to nothing at the end).' },
    brightness: { type: 'number', value: 0.7, help: '0 = invisible, 1 = full.' },
  },
  create(n) { n.state.points = []; },
  tick(n) {
    const pts = n.state.points, keep = Math.max(2, Math.round(n.in('seconds') * 60));
    pts.push([...n.me.pos]);
    if (pts.length > keep) pts.splice(0, pts.length - keep);
  },
  draw(n, out) {
    const pts = n.state.points;
    if (pts.length > 1) out.push({ kind: 'trail', points: pts, colour: n.in('colour'), width: n.in('width'), strength: n.in('brightness') });
  },
});
