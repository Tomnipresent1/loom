// What every sound box shares: how much of it goes to the scene's room (reverb) and echo, like the sends on a mixing
// desk, and how its volume falls off with distance from the listener ("hear within").
export const SEND_INPUTS = {
  space: { type: 'number', value: 0.3, label: 'room', help: 'How much goes into the room (reverb) the scene sets: 0 = dry and close, 1 = far away in the space.' },
  echo: { type: 'number', value: 0, help: 'How much goes into the scene\'s echo: 0 = none, 1 = lots.' },
  near: { type: 'number', value: 0, label: 'hear within', help: 'Only heard when the player is this close (fades with distance). 0 = heard everywhere.' },
};

// The scene's two shared effects (scene.sound), and what they are when a scene doesn't say.
export const SOUND_DEFAULTS = { room: { size: 2.4, tone: 0.5, level: 1 }, echo: { time: 0.38, feedback: 0.35, tone: 0.5, level: 1 } };

export const clamp01 = (v) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));

// volume after distance: full at the listener, fading smoothly to nothing at `near`
export function heard(n, volume) {
  let v = clamp01(volume);
  const near = n.in('near');
  if (near > 0) {
    const ear = n.world.listener(), p = n.me.pos;
    const d = Math.hypot(p[0] - ear[0], p[1] - ear[1], p[2] - ear[2]);
    v *= Math.max(0, 1 - d / near) ** 2;
  }
  return v;
}

export const sends = (n) => ({ space: clamp01(n.in('space')), echo: clamp01(n.in('echo')) });
