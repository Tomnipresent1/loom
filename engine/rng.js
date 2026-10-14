// Seeded randomness: the same seed gives the same numbers every time (so a garden, or a person's glances, behave the same
// in the tests and on every load). seeded(seed) -> () => a number from 0 up to 1. A seed can be a number or a text.
export function seeded(seed) {
  let a = typeof seed === 'number' ? Math.round(seed) : [...String(seed)].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
