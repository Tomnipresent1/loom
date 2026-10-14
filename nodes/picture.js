import { defineNode } from '../engine/registry.js';

// Stands a picture (a file in the piece's pictures folder) up as a flat cut-out, its foot on this thing's spot, like the
// painted cut-outs of NAMI's Plum Blossom. In the theatre view it grows as you walk in; on the map it lies flat.
// Sway: the picture leans with a breeze while its foot stays put (NAMI's tree sway; 1 = a plum tree in a full breeze),
// each copy in its own time (from where it was placed).
defineNode({
  type: 'picture', title: 'Picture', kind: 'part',
  help: 'Stands a picture from the piece\'s pictures folder up as a flat cut-out, its foot on this thing. Drop pictures onto the editor to add them.',
  inputs: {
    picture: { type: 'picture', value: '', help: 'Which picture (a png / jpg / webp in the piece\'s pictures folder).' },
    height: { type: 'number', value: 200, help: 'How tall it stands, in scene units (about 100 = a metre). Its width follows the picture.' },
    sway: { type: 'number', value: 0, help: 'How much it sways in a breeze, its foot staying put: 0 = still, 1 = a plum tree in NAMI\'s full breeze.' },
    flip: { type: 'yesno', value: false, help: 'Mirror it left to right.' },
    turn: { type: 'number', value: 0, help: 'Turn it about its foot, in degrees: + leans it to the right, − to the left (a stem set in a vase).' },
    flat: { type: 'yesno', value: false, label: 'lie flat?', help: 'Lay it on the ground instead of standing it up (a fallen sprig, a rug, a puddle): drawn as a card squashed flat, as NAMI did. Draw such pictures as seen from above.' },
    opacity: { type: 'number', value: 1, help: '0 = invisible, 1 = solid.' },
    shadow: { type: 'number', value: 0.4, help: 'How dark the soft shadow on the ground under it is (0 = none).' },
  },
  draw(n, out) {
    const file = n.in('picture');
    if (!file) return;
    const t = n.world.time, h = n.me.home, ph = (h[0] * 0.013 + h[1] * 0.007) % 100;
    const lean = n.in('sway') * 0.045 * (Math.sin(t * 1.1 + ph) * 0.5 + Math.sin(t * 2.3 + ph * 2) * 0.2);
    out.push({ kind: 'picture', at: n.me.pos, file, height: n.in('height'), lean, turn: (n.in('turn') * Math.PI) / 180, flip: !!n.in('flip'), flat: !!n.in('flat'), alpha: n.in('opacity'), shadow: n.in('shadow') });
  },
});
