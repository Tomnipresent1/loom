// Input (adapted from NAMI's input.js): keys give a direction; a held finger or mouse gives a point on the screen.
// The player turns the point into a place in the scene (it knows the camera); the World never sees the screen.
// Taps (for jumping): a quick touch that hardly moves counts as a tap when it lifts; a finger that lands while another
// is already held counts at once (the second thumb, while walking); Space / up / W count as they go down.
// Flicks (for kicking): a quick sideways swipe (lifted within FLICK_MS, mostly sideways, at least FLICK_MOVE pixels)
// kicks that way; K or down kicks the way she faces.
// Tilt can join later behind the same poll().

const KEYS = { ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0], ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1] };
const TAP_KEYS = new Set(['Space', 'ArrowUp', 'KeyW']);
const TAP_MS = 200, TAP_MOVE = 24;     // a tap: lifted within this long, having moved less than this many pixels
const KICK_KEYS = new Set(['KeyK', 'ArrowDown', 'KeyS']);
const FLICK_MS = 320, FLICK_MOVE = 40;  // a flick: lifted within this long, having moved at least this far, mostly sideways

export function createInput(canvas) {
  const held = new Set();
  let taps = 0, kick = 0;                // kick: 0 = none, -1 / 1 = left / right, 2 = the way she faces
  addEventListener('keydown', (e) => {
    if (TAP_KEYS.has(e.code)) { if (!e.repeat) taps++; e.preventDefault(); }
    if (KICK_KEYS.has(e.code) && !e.repeat) kick = 2;
    if (KEYS[e.code]) { held.add(e.code); e.preventDefault(); }
  });
  addEventListener('keyup', (e) => held.delete(e.code));
  addEventListener('blur', () => held.clear());

  // Every finger is tracked; the newest one steers (a resting thumb mustn't grab it, as NAMI learnt). A finger that
  // lands while another steers only takes over once it has stayed down longer than a tap (so a jump tap with the other
  // thumb doesn't turn her round).
  const fingers = new Map();
  let steering = null;
  canvas.addEventListener('pointerdown', (e) => {
    const second = steering !== null && fingers.has(steering);
    fingers.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now(), tapped: second, waiting: second });
    if (second) taps++; else steering = e.pointerId;
    try { canvas.setPointerCapture(e.pointerId); } catch {}
  });
  canvas.addEventListener('pointermove', (e) => { const f = fingers.get(e.pointerId); if (f) { f.x = e.clientX; f.y = e.clientY; } });
  const up = (e) => {
    const f = fingers.get(e.pointerId);
    if (!f) return;
    fingers.delete(e.pointerId);
    const held = performance.now() - f.t0, dx = f.x - f.x0, dy = f.y - f.y0;
    if (e.type === 'pointerup' && !f.tapped && held < TAP_MS && Math.hypot(dx, dy) < TAP_MOVE) taps++;
    else if (e.type === 'pointerup' && held < FLICK_MS && Math.abs(dx) >= FLICK_MOVE && Math.abs(dx) > Math.abs(dy) * 1.5) kick = Math.sign(dx);
    if (e.pointerId === steering) {
      const rest = [...fingers.keys()];
      steering = rest.length ? rest[rest.length - 1] : null;
      if (steering !== null) fingers.get(steering).waiting = false;
    }
  };
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(ev, up);

  return {
    poll() {
      let x = 0, y = 0;
      for (const k of held) { x += KEYS[k][0]; y += KEYS[k][1]; }
      const now = performance.now();
      for (const [id, f] of fingers) if (f.waiting && now - f.t0 >= TAP_MS) { f.waiting = false; steering = id; }   // held on: it steers now
      const f = steering !== null ? fingers.get(steering) : null;
      const out = { move: [x, y], pointer: f ? { x: f.x, y: f.y, id: steering } : null, taps, kick };
      taps = 0; kick = 0;
      return out;
    },
  };
}
