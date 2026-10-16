// A cat's body seen side-on (Autumn's black cat; the Cat box): the four-legged body (engine/quadruped.js) built as a
// cat: about 60 long, 24 to the shoulder (at size 1), a long tail. runtime/cat2d.js draws it.
import { quadrupedPose, CAT } from './quadruped.js';

export const catPose = (o) => quadrupedPose(o, CAT);
