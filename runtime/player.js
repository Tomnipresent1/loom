// The player: loads a piece, runs its World, draws it, and keeps it in step with the files (live link).
// Open  /?piece=glow  (glow is the default).
import '../nodes/index.js';
import { loadPiece } from '../engine/load.js';
import { World } from '../engine/world.js';
import { canPatchLive } from '../engine/live.js';
import { createRenderer2D } from './render2d.js';
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
const renderer = createRenderer2D(canvas);
const input = createInput(canvas);
const problemsBox = document.getElementById('problems');
document.getElementById('fs').onclick = () => {
  if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.().catch(() => {});
};

let loaded = null, world = null, camera = null, note = null;

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
let missingShown = '';                                // sound files that couldn't be found, said on screen
function checkMissing() {
  const m = audio.missing.join(', ');
  if (m === missingShown) return;
  missingShown = m;
  if (m) showProblems([`sound file${audio.missing.length > 1 ? 's' : ''} not found: ${m} (they belong in ${folder}sounds/)`]);
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
  const view = (scene.camera && scene.camera.view) || 700;
  const scale = Math.min(renderer.width, renderer.height) / view;
  const follow = scene.camera && world.byId.get(scene.camera.follow);
  const want = follow ? follow.pos : [scene.size[0] / 2, scene.size[1] / 2];
  if (!camera) camera = { x: want[0], y: want[1], scale };
  camera.scale = scale;
  camera.x += (want[0] - camera.x) * Math.min(1, dt * 4);
  camera.y += (want[1] - camera.y) * Math.min(1, dt * 4);

  const raw = input.poll();
  const target = raw.pointer ? renderer.toScene(camera, raw.pointer.x, raw.pointer.y) : null;
  spare += dt;
  while (spare >= STEP) { world.step(STEP, { move: raw.move, target }); spare -= STEP; }
  audio.play(world.takeSounds());
  audio.hums(world.hums());
  checkMissing();
  if (note) note.age += dt;
  renderer.frame({ camera, scene, draws: world.draws(), hud: world.hud, note });
}

// A handle for the Machine to look inside from the browser pane (read state, step time by hand). Harmless otherwise.
window.LOOM = { get world() { return world; }, get loaded() { return loaded; }, STEP, audio };

load(null).then(() => requestAnimationFrame(frame), (e) => showProblems([e.message]));
