// Input (adapted from NAMI's input.js): keys give a direction; a held finger or mouse gives a point on the screen.
// The player turns the point into a place in the scene (it knows the camera); the World never sees the screen.
// Tilt can join later behind the same poll().

const KEYS = { ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0], ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1] };

export function createInput(canvas) {
  const held = new Set();
  addEventListener('keydown', (e) => { if (KEYS[e.code]) { held.add(e.code); e.preventDefault(); } });
  addEventListener('keyup', (e) => held.delete(e.code));
  addEventListener('blur', () => held.clear());

  // Every finger is tracked; the newest one steers (a resting thumb mustn't grab it, as NAMI learnt).
  const fingers = new Map();
  let steering = null;
  canvas.addEventListener('pointerdown', (e) => {
    fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    steering = e.pointerId;
    try { canvas.setPointerCapture(e.pointerId); } catch {}
  });
  canvas.addEventListener('pointermove', (e) => { const f = fingers.get(e.pointerId); if (f) { f.x = e.clientX; f.y = e.clientY; } });
  const up = (e) => {
    if (!fingers.delete(e.pointerId)) return;
    if (e.pointerId === steering) { const rest = [...fingers.keys()]; steering = rest.length ? rest[rest.length - 1] : null; }
  };
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(ev, up);

  return {
    poll() {
      let x = 0, y = 0;
      for (const k of held) { x += KEYS[k][0]; y += KEYS[k][1]; }
      const f = steering !== null ? fingers.get(steering) : null;
      return { move: [x, y], pointer: f ? { x: f.x, y: f.y, id: steering } : null };
    },
  };
}
