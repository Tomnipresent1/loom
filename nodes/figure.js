import { defineNode } from '../engine/registry.js';
import { seeded } from '../engine/rng.js';

// A person in kimono, drawn by code (NAMI's Plum Blossom people; the drawing is runtime/figure2d.js). It brings itself
// to life: it bobs as its thing moves, turns to face the way it walks (towards you = facing you), glances about now and
// then and shifts its weight. Wire a 0..1 into bow (e.g. a Ramp) to make it bow, or into bend to stoop and pick up.
defineNode({
  type: 'figure', title: 'Figure', kind: 'part',
  help: 'A person in kimono (as in NAMI\'s Plum Blossom). Walks, turns and glances about by itself; wire in bow or bend to make it bow or stoop.',
  inputs: {
    outfit: { type: 'whole', value: 1, help: '1 to 14: a kimono from NAMI\'s Edo palette (patterned); 15: a tea-house keeper\'s dark jacket. 0 = the plain robe and sash colours below.' },
    robe: { type: 'colour', value: '#a8452f', help: 'The robe\'s colour (only with outfit 0).' },
    sash: { type: 'colour', value: '#e8d9b0', help: 'The sash (obi) colour (only with outfit 0).' },
    height: { type: 'number', value: 160, help: 'How tall the person is, in scene units (160 = 1.6 m).' },
    front: { type: 'yesno', value: false, label: 'facing you?', help: 'Facing you (yes) or seen from behind (no) while standing still at the start. Walking, they face the way they go.' },
    bow: { type: 'number', value: 0, help: '0 = upright, 1 = bowed low. Wire in a Ramp that goes up and back down.' },
    bend: { type: 'number', value: 0, help: '0 = upright, 1 = stooping to pick something up.' },
    glance: { type: 'number', value: 1, help: 'How much they glance about (0 = never, 1 = now and then, as in NAMI).' },
    basket: { type: 'yesno', value: false, label: 'basket?', help: 'Carries a small basket at the side.' },
    blossoms: { type: 'whole', value: 0, help: 'How much blossom shows in the basket.' },
    ornament: { type: 'yesno', value: false, label: 'hairpin?', help: 'A red hairpin in the bun.' },
    apron: { type: 'yesno', value: false, label: 'apron?', help: 'A pale apron over the robe (the tea-house keeper wears one, with outfit 15).' },
    opacity: { type: 'number', value: 1, help: '0 = invisible, 1 = solid.' },
  },
  create(n) {
    const r = seeded(n.me.id);
    Object.assign(n.state, { r, prev: [...n.me.pos], step: r() * 4, facing: null, look: 0, lookTo: 0, lookT: r() * 4, phase: r() * 6 });
  },
  tick(n, dt) {
    const s = n.state, p = n.me.pos, dx = p[0] - s.prev[0], dy = p[1] - s.prev[1], moved = Math.hypot(dx, dy);
    s.prev = [...p];
    s.step += (moved / 100) * 1.3;                                          // one bob per ~0.8 m walked (NAMI)
    if (moved > 15 * dt && Math.abs(dy) > Math.abs(dx) * 0.3) s.facing = dy > 0;   // walking towards you (down the map) = facing you
    // a glance to one side now and then, then ahead again (NAMI: everyone glances about)
    if ((s.lookT -= dt) <= 0) {
      if (s.lookTo) { s.lookTo = 0; s.lookT = 2 + s.r() * 5; }
      else { s.lookTo = (s.r() < 0.5 ? -1 : 1) * (0.5 + s.r() * 0.5) * Math.min(1, n.in('glance')); s.lookT = 1 + s.r() * 2; }
    }
    if (n.in('bow') > 0.05 || n.in('bend') > 0.05) s.lookTo = 0;
    s.look += (s.lookTo - s.look) * Math.min(1, dt * 3);
  },
  draw(n, out) {
    const s = n.state;
    out.push({ kind: 'figure', at: n.me.pos, height: n.in('height'), outfit: n.in('outfit'), robe: n.in('robe'), sash: n.in('sash'),
      front: s.facing === null ? !!n.in('front') : s.facing, bow: Math.max(0, Math.min(1, n.in('bow'))), bend: Math.max(0, Math.min(1, n.in('bend'))),
      look: s.look, step: s.step, idle: Math.sin(n.world.time * 0.7 + s.phase), basket: !!n.in('basket'), blossoms: n.in('blossoms'),
      ornament: !!n.in('ornament'), apron: !!n.in('apron'), alpha: n.in('opacity') });
  },
});
