// The player: loads a piece, runs its World, draws it, and keeps it in step with the files (live link).
// Open  /?piece=glow  (glow is the default).
import '../nodes/index.js';
import { loadPiece } from '../engine/load.js';
import { World } from '../engine/world.js';
import { canPatchLive } from '../engine/live.js';
import { cameraSettings, theatreAim, sideAim } from '../engine/camera.js';
import { createRenderer2D } from './render2d.js';
import { createRendererTheatre } from './render-theatre.js';
import { createPictures } from './pictures.js';
import { createButtons } from './buttons.js';
import { createCards } from './cards.js';
import { createInput } from './input.js';
import { connectLive } from './live.js';
import { createAudio } from './audio.js';

const pieceName = new URLSearchParams(location.search).get('piece') || 'glow';
const folder = `pieces/${pieceName}/`;
const readJson = async (p) => {
  const r = await fetch(folder + p, { cache: 'no-store' });
  if (!r.ok) throw new Error(r.status === 404 ? 'file not found' : 'HTTP ' + r.status);
  return r.json();
};

const canvas = document.getElementById('screen');
const pictures = createPictures((f) => `${folder}pictures/${encodeURIComponent(f)}`);
const buttons = createButtons((f) => `${folder}pictures/${encodeURIComponent(f)}`), cards = createCards(), pressed = [];
const renderers = { map: createRenderer2D(canvas, { pictures }), theatre: createRendererTheatre(canvas, { pictures }) };   // the scene's camera style picks one
renderers.side = renderers.theatre;                    // (the side view is the theatre's drawing with a level camera)
const input = createInput(canvas);
const problemsBox = document.getElementById('problems');
document.getElementById('fs').onclick = () => {
  if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.().catch(() => {});
};

let loaded = null, world = null, camera = null, note = null, taps = 0, kick = 0;

// ---- sound: starts on the first touch or key (phones insist), sleeps when the page is hidden, ♪ turns it off/on ----
const audio = createAudio({ soundUrl: (f) => `${folder}sounds/${encodeURIComponent(f)}` });
const soundBtn = document.getElementById('snd') || document.createElement('button');   // (an older page may not have it)
try { audio.muted = localStorage.getItem('loom.muted') === '1'; } catch {}
const showSound = () => { soundBtn.style.opacity = audio.muted ? 0.4 : 1; soundBtn.style.textDecoration = audio.muted ? 'line-through' : 'none'; };
showSound();
soundBtn.onclick = (e) => { e.stopPropagation(); audio.unlock(); audio.muted = !audio.muted; try { localStorage.setItem('loom.muted', audio.muted ? '1' : '0'); } catch {} showSound(); };
for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, () => audio.unlock(), { capture: true });
document.addEventListener('visibilitychange', () => audio.sleep(document.hidden));

function showProblems(list) {
  problemsBox.textContent = list.length ? `The piece "${pieceName}" has ${list.length} problem${list.length > 1 ? 's' : ''}:\n\n• ${list.join('\n• ')}` : '';
  problemsBox.className = list.length ? 'show' : '';
}
function startWorld(l) {
  loaded = l;
  world = new World(l);
  world.begin();
  camera = null;
  hearScene(l);
}
// the scene's room + echo, and every sound file its boxes use, fetched ahead of time
function hearScene(l) {
  audio.configure(l.files.scene.sound);
  const files = new Set();
  for (const bp of Object.values(l.blueprints)) for (const spec of Object.values(bp.nodes)) {
    for (const [pin, d] of Object.entries(spec.type.inputs)) if (d.type === 'sound' && spec.set[pin]) files.add(spec.set[pin]);
  }
  audio.preload([...files]);
}
let missingShown = '';                                // sound and picture files that couldn't be found, said on screen
function checkMissing() {
  const pics = [...pictures.missing], m = audio.missing.join(', ') + ' | ' + pics.join(', ');
  if (m === missingShown) return;
  missingShown = m;
  const say = [];
  if (audio.missing.length) say.push(`sound file${audio.missing.length > 1 ? 's' : ''} not found: ${audio.missing.join(', ')} (they belong in ${folder}sounds/)`);
  if (pics.length) say.push(`picture${pics.length > 1 ? 's' : ''} not found: ${pics.join(', ')} (they belong in ${folder}pictures/)`);
  if (say.length) showProblems(say);
}

async function load(changed) {
  const l = await loadPiece(readJson);
  showProblems(l.problems);
  if (l.problems.length) return;                    // keep playing the last good version until it's fixed
  if (world && changed && JSON.stringify(l.files) === JSON.stringify(loaded.files)) return;   // nothing new
  if (world && changed && canPatchLive(loaded.files, l.files)) {
    world.patch(l);
    loaded = { files: l.files, blueprints: world.blueprints };
    hearScene(loaded);
    note = { text: `live: ${changed}`, age: 0 };
  } else {
    startWorld(l);
    if (changed) note = { text: `restarted: ${changed}`, age: 0 };
  }
}

// The published copy (on the web, tools/publish.mjs marks its index.html) has no PC server to listen to.
if (!document.querySelector('meta[name="loom-published"]')) connectLive((file) => {
  if (file.startsWith(folder)) load(file.slice(folder.length));
  else if (/^(engine|nodes|runtime)\/|^index\.html$/.test(file)) location.reload();
}, () => load('caught up after reconnecting'));      // back in Wi-Fi / screen back on: fetch whatever was missed

// ---- the loop: fixed 60 steps a second, drawn every screen frame ----
const STEP = 1 / 60;
let last = performance.now(), spare = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (!world) return;
  const scene = loaded.files.scene;
  const set = cameraSettings(scene), renderer = renderers[set.style];
  const follow = set.follow && world.byId.get(set.follow);
  const want = follow ? follow.pos : [scene.size[0] / 2, scene.size[1] / 2];
  if (camera && camera.style !== set.style) camera = null;          // the style was changed (live): start afresh
  if (set.style === 'theatre') {
    camera = { ...theatreAim(camera, set, want, dt), style: set.style, set, youX: want[0] };
  } else if (set.style === 'side') {
    camera = { ...sideAim(camera, set, want, dt, renderer.width, renderer.height, scene.size[0]), style: set.style, set, youX: want[0] };
  } else {
    const scale = Math.min(renderer.width, renderer.height) / set.view;
    if (!camera) camera = { x: want[0], y: want[1], scale, style: set.style };
    camera.scale = scale;
    camera.x += (want[0] - camera.x) * Math.min(1, dt * 4);
    camera.y += (want[1] - camera.y) * Math.min(1, dt * 4);
  }

  const raw = input.poll();
  const target = raw.pointer ? renderer.toScene(camera, raw.pointer.x, raw.pointer.y) : null;
  spare += dt;
  const finger = raw.pointer ? { id: raw.pointer.id, x: (raw.pointer.x / renderer.height) * 600 } : null;   // (picture units)
  pressed.push(...buttons.take(), ...cards.take());   // button and card presses go to the next step only (once each)
  taps += raw.taps;                                    // taps (a quick touch, or space): to the next step only, too
  if (raw.kick) kick = raw.kick;                       // a kick (a flick, or K): likewise
  while (spare >= STEP) { world.step(STEP, { move: raw.move, target, finger, pressed: pressed.splice(0), tap: taps > 0, kick }); taps = 0; kick = 0; spare -= STEP; }
  if (world.request) return answer(world.request);     // a Start again box asked: begin again, or leave
  buttons.update(world.buttons());
  cards.update(world.cards());
  audio.play(world.takeSounds());
  audio.hums(world.hums());
  checkMissing();
  if (note) note.age += dt;
  renderer.frame({ camera, scene, draws: world.draws(), hud: world.hud, note, wash: world.wash(), bars: world.bars() });
}
// Start again: begin the scene afresh, keeping the piece's variables (e.g. the ink); or leave for the list of pieces
// (inside the editor there is nowhere to leave to: it just begins again).
function answer(request) {
  if (request === 'leave' && window.top === window) { location.href = './'; return; }
  const keep = world.pieceVars;
  loaded = { files: loaded.files, blueprints: world.blueprints };
  world = new World(loaded, { pieceVars: keep });
  world.begin();
  camera = null; pressed.length = 0; taps = 0; kick = 0;
}

// A handle for the Machine to look inside from the browser pane (read state, step time by hand). Harmless otherwise.
window.LOOM = { get world() { return world; }, get loaded() { return loaded; }, get camera() { return camera; }, STEP, audio };

load(null).then(() => requestAnimationFrame(frame), (e) => showProblems([e.message]));
