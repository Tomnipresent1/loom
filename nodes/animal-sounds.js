import { shot } from './garden-sounds.js';

// Autumn's animal sounds, made in code like the garden's: a puppy's yaps, a cat's short mew, small wings taking off.
// Heard from where their thing stands if "from its place?" (the puppy's and the cat's things move with them).
shot('animal-call', 'Animal call', 'An animal calls: a puppy\'s yaps ("yap! yap!"), a cat\'s short mew (not a long miaow), a cat calling for help (stuck up a tree: a longer "mee-ow?", louder), or a squirrel\'s alarm chatter ("chuk-chuk-chuk", sometimes a "tchrrr"). Every one a little different.',
  {
    animal: { type: 'choice', value: 'puppy bark', options: ['puppy bark', 'cat mew', 'cat calling', 'squirrel chatter'], setting: true, help: 'Which call.' },
    count: { type: 'whole', value: 0, label: 'how many', help: 'Barks: how many yaps in a row (0 = 1 to 3, at random). A mew is always one.' },
  },
  (n) => ({ kind: 'animal', animal: n.in('animal'), count: n.in('count') }));

shot('wings', 'Wings', 'Small wings taking off: a quick flurry of soft wingbeats ("frrrt"), one for each bird, each a moment after the last.',
  { birds: { type: 'whole', value: 3, label: 'how many birds', help: 'How many pairs of wings.' } },
  (n) => ({ kind: 'wings', birds: Math.max(1, n.in('birds')) }));
