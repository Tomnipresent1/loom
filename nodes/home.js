import { defineNode } from '../engine/registry.js';

defineNode({
  type: 'home', title: 'Home', kind: 'data',
  help: 'Where this thing was placed in the scene (it doesn\'t change when the thing moves).',
  outputs: {
    position: { type: 'position', help: 'Its home place: [x, y, z].' },
    x: { type: 'number', help: 'Its home left-right place.' },
    y: { type: 'number', help: 'Its home up-down place.' },
  },
  read: { position: (n) => [...n.me.home], x: (n) => n.me.home[0], y: (n) => n.me.home[1] },
});
