import { defineNode } from '../engine/registry.js';

// A tree painted by code (Autumn): a tapering trunk with bark, limbs reaching up into a crown of leafy clumps, lit
// from above. Every copy is its own tree (its seed comes from where it stands, unless you give one). No trunk = a bush;
// no crown = a bare trunk. Give it a picture and the picture stands there instead (your own painting of it).
defineNode({
  type: 'tree', title: 'Tree', kind: 'part',
  help: 'A tree painted by code: a trunk with bark and a crown of autumn leaves, every copy different. No trunk = a bush, no crown = a bare trunk. A picture replaces it with your own painting.',
  inputs: {
    height: { type: 'number', value: 1300, help: 'How tall the tree stands, in scene units (about 100 = a metre).' },
    trunk: { type: 'number', value: 90, help: 'How wide its trunk is at the foot (0 = no trunk: a bush).' },
    crown: { type: 'number', value: 700, help: 'How wide its crown of leaves is (0 = bare).' },
    crownAt: { type: 'number', value: 0.65, label: 'crown starts', help: 'Where the crown begins, up the tree: 0 = from the ground (a bush), 1 = at the very top.' },
    lean: { type: 'number', value: 0, help: 'How far its top leans over, in scene units (+ to the right, − to the left).' },
    bark: { type: 'colour', value: '#5b3d2a', help: 'The trunk\'s colour.' },
    leaves: { type: 'colour', value: '#c8632b', help: 'The crown goes from this colour...' },
    leaves2: { type: 'colour', value: '#e8a33a', label: 'leaves 2', help: '...to this one (lit from above: the top is lighter, the underside darker).' },
    seed: { type: 'whole', value: 0, help: 'Which tree of all the possible ones: 0 = its own (from where it stands); any other number picks one.' },
    picture: { type: 'picture', value: '', help: 'Your own painting of it instead (stands on its foot, as tall as "height"). Empty = painted by code.' },
    opacity: { type: 'number', value: 1, help: '0 = invisible, 1 = solid.' },
  },
  draw(n, out) {
    const h = n.me.home, seed = n.in('seed') || Math.round(h[0] * 7 + h[1] * 13 + h[2]);
    out.push({ kind: 'tree', at: n.me.pos, height: Math.max(1, n.in('height')), trunk: Math.max(0, n.in('trunk')), crown: Math.max(0, n.in('crown')),
      crownAt: n.in('crownAt'), lean: n.in('lean'), seed, bark: n.in('bark'), leaves: n.in('leaves'), leaves2: n.in('leaves2'),
      picture: n.in('picture'), alpha: n.in('opacity') });
  },
});
