import { defineNode } from '../engine/registry.js';

// Pictures for the pieces of a Character in the same thing (a cut-out puppet: your painting, her movement). Any piece
// left empty is still drawn by code, so you can swap them in one at a time. How to paint a piece: upright, facing
// right, on a see-through background; a limb with the joint it hangs from at the top middle and the next joint at the
// bottom middle (a little extra beyond each joint is fine: it is meant to overlap). The far arm and leg use the same
// pictures, a little darker.
const joint = (what) => `Paint it upright, ${what}.`;
defineNode({
  type: 'painted-pieces', title: 'Painted pieces', kind: 'part',
  help: 'Pictures for the pieces of the Character in the same thing: any piece left empty is still drawn by code. Paint each piece upright, facing right, its top joint at the top middle and its bottom joint at the bottom middle.',
  inputs: {
    head: { type: 'picture', value: '', help: 'Her head with hat and hair, facing right, its middle at the middle of the head. About three heads tall in all.' },
    body: { type: 'picture', value: '', help: joint('the neck at the top middle, the middle of the coat\'s hem at the bottom middle (the coat, arms left off)') },
    upperArm: { type: 'picture', value: '', label: 'upper arm', help: joint('the shoulder at the top middle, the elbow at the bottom middle') },
    forearm: { type: 'picture', value: '', label: 'forearm', help: joint('the elbow at the top middle, the hand at the bottom') },
    thigh: { type: 'picture', value: '', help: joint('the hip at the top middle, the knee at the bottom middle') },
    shin: { type: 'picture', value: '', help: joint('the knee at the top middle, the ankle at the bottom middle') },
    boot: { type: 'picture', value: '', help: 'The boot, sole flat at the bottom, toe to the right, the ankle at the top middle.' },
    ponytail: { type: 'picture', value: '', help: 'Hanging straight down, where it is tied at the top middle.' },
    scarfEnd: { type: 'picture', value: '', label: 'scarf end', help: 'Hanging straight down, where it leaves her neck at the top middle.' },
    far: { type: 'number', value: 0.78, label: 'far side', help: 'How dark the far arm and leg are drawn (1 = the same as the near ones).' },
  },
  pieces(n) {
    const out = {};
    for (const k of ['head', 'body', 'upperArm', 'forearm', 'thigh', 'shin', 'boot', 'ponytail', 'scarfEnd']) if (n.in(k)) out[k] = n.in(k);
    out.far = Math.max(0, Math.min(1, n.in('far')));
    return out;
  },
});
