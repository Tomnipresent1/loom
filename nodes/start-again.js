import { defineNode } from '../engine/registry.js';

// Begin the scene again (WALK AGAIN), or leave for the list of pieces (NAMI's "back to the album"). Starting again keeps
// the piece's variables (they are "kept from scene to scene": e.g. the ink of an unfinished print) and resets the
// scene's and the things' own. The World only asks (world.request); the runtime does it.
defineNode({
  type: 'start-again', title: 'Start again', kind: 'do',
  help: 'Begins the scene again (piece variables are kept, scene and thing variables start afresh), or goes to the list of pieces.',
  inputs: {
    go: { flow: true, help: 'Do it now.' },
    where: { type: 'choice', value: 'this scene', options: ['this scene', 'the list of pieces'], setting: true, label: 'start',
      help: 'this scene: begin it again. the list of pieces: leave this piece (in the editor it just begins again).' },
  },
  on: { go(n) { n.world.request = n.in('where') === 'this scene' ? 'restart' : 'leave'; } },
});
