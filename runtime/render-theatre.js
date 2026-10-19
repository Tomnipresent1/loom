// The paper-theatre renderer (scene camera style "theatre"): the same draw commands as the map view, seen from behind
// and above the followed thing, like NAMI's Plum Blossom. Everything stands up in the garden as a flat cut-out, drawn far
// to near, growing as you walk in. The maths lives in engine/camera.js.
//   disc: stands on the ground (its bottom at the thing's height), with a soft shadow under it
//   glow: centred on the body of the thing it belongs to (same place as its disc), else at its own height
//   trail: a line through the projected points, lifted half its width off the ground
//   picture: a flat cut-out standing on its foot, leaning with its sway, a soft shadow on the ground under it; or, if
//            "flat", lying on the ground (foreshortened like the ground itself)
//   block:   a plain upright block standing on its foot (for blocking out a scene)
//   plank:   a ledge drawn as a thick line, its top edge where walkers stand
//   character: a side-on person (runtime/character2d.js) standing on her feet; cat: a cat (runtime/cat2d.js); dog: a puppy (runtime/dog2d.js);
//            bird: a small bird, perched or flying (runtime/bird2d.js)
// It also draws the side view (camera style "side", a side-scroller): the same maths with a level camera standing in
// front of the followed thing; there nothing fades for being in the way (things passing in front are the point).
import { theatreProject, theatreGround, theatreFade, theatrePersonFade, sidePick, sideFade, sideHaze, SKY_DEFAULTS } from '../engine/camera.js';
import { treeShape, ridgeLine, mixColour, shadeColour } from '../engine/shapes.js';
import { drawWords, drawWash, drawBars, rgb, leafPalette } from './render2d.js';
import { drawFigure } from './figure2d.js';
import { drawCharacter } from './character2d.js';
import { drawCat } from './cat2d.js';
import { drawDog } from './dog2d.js';
import { drawBird } from './bird2d.js';
import { drawSquirrel, drawKnothole } from './squirrel2d.js';
import { pixelRatio } from './quality.js';

const LEAF_SLICE = 20;          // leaves are drawn in slices this deep (front to back), sorted with everything else
// trees and hills are worked out once per set of numbers (engine/shapes.js), then only placed and lit each frame
const shapes = new Map();
const shapeOf = (key, make) => { let s = shapes.get(key); if (!s) { if (shapes.size > 400) shapes.clear(); shapes.set(key, (s = make())); } return s; };
// a colour with some of the air's in it (t: 0..1), remembered
const tints = new Map();
const tinted = (c, air, t) => {
  const q = Math.round(t * 50) / 50;
  if (q <= 0) return c;
  const key = c + air + q;
  let v = tints.get(key);
  if (!v) { if (tints.size > 4000) tints.clear(); tints.set(key, (v = mixColour(c, air, q))); }
  return v;
};

export function createRendererTheatre(canvas, { pictures } = {}) {
  const g = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  const fit = () => {
    dpr = pixelRatio(devicePixelRatio);                      // (how sharp: runtime/quality.js, stepped down on a slow phone)
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  };
  fit();
  addEventListener('resize', fit);

  // tufts on the ground (the map's speckles, standing up): they slide past as you walk, so you feel yourself move
  let tufts = null, tuftsFor = '';
  const tuftsOf = (w, h) => {
    const key = w + 'x' + h;
    if (tuftsFor !== key) {
      let s = 54321;
      const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      tufts = Array.from({ length: Math.min(30000, Math.round((w * h) / 9000)) }, () => [rnd() * w, rnd() * h, 0.6 + rnd() * 0.8]);
      tuftsFor = key;
    }
    return tufts;
  };

  return {
    get width() { return W; },
    get height() { return H; },
    // camera: { x, y, set, youX } (where it stands on the ground, its settings, the followed thing's x); the side view's
    // also has z (its eye's height). A touch in the side view = the spot on the followed thing's plane.
    toScene(camera, sx, sy) {
      return camera.style === 'side' ? sidePick(camera, camera.set, W, H, sx, sy, camera.set.back) : theatreGround(camera, camera.set, W, H, sx, sy);
    },

    frame({ camera, scene, draws, hud, note, wash, bars }) {
      if (dpr !== pixelRatio(devicePixelRatio)) fit();
      const set = camera.set, hy = set.horizon * H, side = camera.style === 'side';
      const P = (x, y, z) => theatreProject(camera, set, W, H, x, y, z);
      const fade = side ? (x, depth) => sideFade(set, depth) : (x, depth) => theatreFade(camera, set, camera.youX, x, depth);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;

      // ---- the backdrop: sky, ground, a soft mist where they meet (Hiroshige's bokashi) ----
      const sky = scene.sky || {}, ground = scene.ground || {};
      const skyTop = sky.top || SKY_DEFAULTS.top, skyLow = sky.low || SKY_DEFAULTS.low;
      const groundNear = ground.colour || '#0b1020', groundFar = ground.far || skyLow;
      // the side view's air: far things take on the sky's low colour (theatre: they fade instead, as before)
      const air = side ? (depth) => sideHaze(set, depth) : () => 0, tint = (c, t) => tinted(c, skyLow, t);
      // the side view's light (scene "light"): things between the camera and her go darker towards the shade colour (and
      // painted trees soften), as in a film's foreground; sun rays; a vignette. near(depth) = how much, 0..1.
      const light = side ? scene.light || {} : {}, shadeC = light.shade || '#24170f', nearPow = Math.max(0, light.near || 0);
      const near = (depth) => (nearPow ? Math.min(1, Math.max(0, (set.back - 60 - depth) / (set.back * 0.6))) * nearPow : 0);
      const paint = (c, depth) => { const n = near(depth); return n > 0.01 ? tinted(c, shadeC, Math.min(0.9, n * 0.85)) : tint(c, air(depth)); };
      let grad = g.createLinearGradient(0, 0, 0, hy);
      grad.addColorStop(0, skyTop); grad.addColorStop(1, skyLow);
      g.fillStyle = grad; g.fillRect(0, 0, W, hy + 1);
      if (sky.sun) {                                 // a low sun (scene sky "sun"): a warm glow and its disc, fixed in the sky
        const sx = W * (sky.sunX ?? 0.75), sy = hy * (sky.sunY ?? 0.45), [R, G, B] = rgb(sky.sun);
        const glow = g.createRadialGradient(sx, sy, 0, sx, sy, H * 0.75);
        glow.addColorStop(0, `rgba(${R},${G},${B},0.75)`); glow.addColorStop(0.12, `rgba(${R},${G},${B},0.35)`); glow.addColorStop(1, `rgba(${R},${G},${B},0)`);
        g.globalCompositeOperation = 'lighter'; g.fillStyle = glow; g.fillRect(0, 0, W, hy + 1); g.globalCompositeOperation = 'source-over';
        g.fillStyle = sky.sun; g.beginPath(); g.arc(sx, sy, H * 0.035, 0, 7); g.fill();
      }
      grad = g.createLinearGradient(0, hy, 0, H);
      grad.addColorStop(0, groundFar); grad.addColorStop(1, groundNear);
      g.fillStyle = grad; g.fillRect(0, hy, W, H - hy);
      const [mr, mg, mb] = rgb(skyLow);
      grad = g.createLinearGradient(0, hy - H * 0.08, 0, hy + H * 0.05);
      grad.addColorStop(0, `rgba(${mr},${mg},${mb},0)`); grad.addColorStop(0.6, `rgba(${mr},${mg},${mb},0.7)`); grad.addColorStop(1, `rgba(${mr},${mg},${mb},0)`);
      g.fillStyle = grad; g.fillRect(0, hy - H * 0.08, W, H * 0.13);

      // ---- tufts ----
      const [sw, sh] = scene.size, far = set.haze * 0.8;
      g.strokeStyle = ground.speckle || '#2a3557'; g.lineWidth = 1; g.globalAlpha = 0.8;
      g.beginPath();
      for (const [x, y, k] of tuftsOf(sw, sh)) {
        const depth = camera.y - y;
        if (depth < 20 || depth > far) continue;
        const p = P(x, y, 0);
        if (!p || p[0] < -10 || p[0] > W + 10) continue;
        const h = Math.max(1, 14 * k * p[2]);
        g.moveTo(p[0] - h * 0.4, p[1]); g.lineTo(p[0] - h * 0.15, p[1] - h); g.moveTo(p[0], p[1]); g.lineTo(p[0] + h * 0.1, p[1] - h * 1.2);
      }
      g.stroke();
      g.globalAlpha = 1;

      // ---- everything standing in the scene, far to near ----
      const bodies = new Map();                     // a thing's position array -> its disc (a Light centres on it)
      for (const d of draws) if (d.kind === 'disc') bodies.set(d.at, d);
      const list = [];
      for (const d of draws) {
        if (d.kind === 'disc') {
          const p = P(d.at[0], d.at[1], (d.at[2] || 0) + d.radius);
          if (p) list.push([p[3], d, p]);
        } else if (d.kind === 'glow') {
          const body = bodies.get(d.at), p = P(d.at[0], d.at[1], (d.at[2] || 0) + (body ? body.radius : 0));
          if (p) list.push([p[3] - 0.01, d, p]);    // (just in front of its own body)
        } else if (d.kind === 'picture') {
          const p = P(d.at[0], d.at[1], d.at[2] || 0);
          if (p && p[3] < set.haze * 4) list.push([d.flat ? p[3] + 1e6 : p[3], d, p]);     // (lying flat: part of the ground, drawn first)
        } else if (d.kind === 'figure' || d.kind === 'character' || d.kind === 'cat' || d.kind === 'dog' || d.kind === 'bird' || d.kind === 'squirrel' || d.kind === 'knothole') {
          const p = P(d.at[0], d.at[1], d.at[2] || 0);
          if (p && p[3] < set.haze * 3) list.push([p[3], d, p]);
        } else if (d.kind === 'trail' && d.points.length > 1) {
          const last = d.points[d.points.length - 1], p = P(last[0], last[1], 0);
          if (p) list.push([p[3] + 0.01, d, p]);    // (just behind its thing)
        } else if (d.kind === 'block' || d.kind === 'plank' || d.kind === 'tree' || d.kind === 'ridge') {
          const p = P(d.at[0], d.at[1], d.at[2] || 0);
          if (p && (side || p[3] < set.haze * 4)) list.push([p[3], d, p]);
        } else if (d.kind === 'leaves') {
          // leaves are sorted among everything else in thin slices of depth, so some lie in front of her feet and some
          // behind, and kicked ones fly past on either side
          const slices = new Map();
          for (const l of d.leaves) {
            const key = Math.floor(l.y / LEAF_SLICE);
            let sl = slices.get(key);
            if (!sl) slices.set(key, (sl = []));
            sl.push(l);
          }
          for (const [key, ls] of slices) {
            const depth = camera.y - (key + 0.5) * LEAF_SLICE;
            if (depth > 5 && depth < set.haze * 4) list.push([depth, { kind: 'leafslice', of: d, ls, at: [camera.youX, 0, 0] }, [0, 0, 0, depth]]);
          }
        }
      }
      list.sort((a, b) => b[0] - a[0]);
      // sun rays: soft shafts fanning from the sun, drawn just behind her lane (so she and her trees stay crisp in front)
      let raysDone = !(side && light.rays > 0 && sky.sun);
      const rays = () => {
        raysDone = true;
        const sx = W * (sky.sunX ?? 0.75), sy = hy * (sky.sunY ?? 0.45), [R, G, B] = rgb(light.rayColour || sky.sun), now = performance.now() / 1000;
        const len = Math.hypot(W, H) * 1.3, toLeft = (sky.sunX ?? 0.75) >= 0.5;
        g.save(); g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 9; i++) {
          const h1 = (Math.sin(i * 127.1) * 43758.5453) % 1, h2 = (Math.sin(i * 311.7) * 12345.678) % 1;
          let ang = Math.PI * 0.6 + i * 0.07 + Math.sin(now * 0.13 + i * 1.7) * 0.012;      // (down and away from the sun)
          if (!toLeft) ang = Math.PI - ang;
          const wide = 0.016 + 0.02 * Math.abs(h1), alpha = Math.min(1, light.rays) * (0.05 + 0.06 * Math.abs(h2)) * (0.75 + 0.25 * Math.sin(now * 0.4 + i * 2.1));
          const ex = sx + Math.cos(ang) * len, ey = sy + Math.sin(ang) * len, gr = g.createLinearGradient(sx, sy, ex, ey);
          gr.addColorStop(0, `rgba(${R},${G},${B},${alpha})`); gr.addColorStop(1, `rgba(${R},${G},${B},0)`);
          g.fillStyle = gr; g.beginPath(); g.moveTo(sx, sy);
          g.lineTo(sx + Math.cos(ang - wide) * len, sy + Math.sin(ang - wide) * len); g.lineTo(sx + Math.cos(ang + wide) * len, sy + Math.sin(ang + wide) * len);
          g.closePath(); g.fill();
        }
        g.restore();
      };
      for (const [, d, p] of list) {
        if (!raysDone && p[3] < set.back + 60) rays();
        // people fade their own way (NAMI v3.12): once they have passed behind you they fade quickly, wherever they are
        // on screen, so nobody ever looms up huge in front of the lens (camera settings: people fade from / gone by)
        const t = air(p[3]);                        // (side view: how much air lies in front of it)
        let a = (d.kind === 'figure' || d.kind === 'character' || d.kind === 'cat' || d.kind === 'dog' || d.kind === 'bird') && !side ? theatrePersonFade(set, p[3])
          : fade(d.kind === 'trail' ? d.points[d.points.length - 1][0] : d.at[0], p[3]);
        if (d.kind === 'picture' || d.kind === 'figure' || d.kind === 'character' || d.kind === 'cat' || d.kind === 'dog' || d.kind === 'bird' || d.kind === 'squirrel' || d.kind === 'knothole' || d.kind === 'disc') a *= 1 - 0.6 * t;   // (pictures can't be coloured: they fade)
        if (a < 0.02) continue;
        if (d.kind === 'figure') { drawFigure(g, p[0], p[1], p[2], d, Math.max(0, Math.min(1, d.alpha)) * a); continue; }
        if (d.kind === 'character') { drawCharacter(g, p[0], p[1], p[2], d, Math.max(0, Math.min(1, d.alpha)) * a, pictures); g.globalAlpha = 1; continue; }
        if (d.kind === 'cat') { drawCat(g, p[0], p[1], p[2], d, Math.max(0, Math.min(1, d.alpha)) * a); g.globalAlpha = 1; continue; }
        if (d.kind === 'dog') { drawDog(g, p[0], p[1], p[2], d, Math.max(0, Math.min(1, d.alpha)) * a); g.globalAlpha = 1; continue; }
        if (d.kind === 'bird') { drawBird(g, p[0], p[1], p[2], d, Math.max(0, Math.min(1, d.alpha)) * a); g.globalAlpha = 1; continue; }
        if (d.kind === 'squirrel') { drawSquirrel(g, p[0], p[1], p[2], d, Math.max(0, Math.min(1, d.alpha)) * a); g.globalAlpha = 1; continue; }
        if (d.kind === 'knothole') { drawKnothole(g, p[0], p[1], p[2], d, Math.max(0, Math.min(1, d.alpha)) * a); g.globalAlpha = 1; continue; }
        if (d.kind === 'disc') {
          const r = d.radius * p[2], foot = P(d.at[0], d.at[1], 0);
          if (foot) {                               // a soft shadow on the ground under it
            g.globalAlpha = 0.25 * a; g.fillStyle = '#000';
            g.beginPath(); g.ellipse(foot[0], foot[1], r * 0.9, r * 0.22, 0, 0, 7); g.fill();
          }
          g.globalAlpha = Math.max(0, Math.min(1, d.alpha)) * a; g.fillStyle = d.colour;
          g.beginPath(); g.arc(p[0], p[1], r, 0, 7); g.fill();
        } else if (d.kind === 'picture') {
          const pic = pictures && pictures.get(d.file);
          if (!pic) continue;
          if (d.flat) {
            // lying on the ground, the paper-theatre way (as NAMI drew its fallen sprigs): a card squashed to under half its
            // height, centred on its spot. (True foreshortening would leave a sliver too thin to spot on a phone.)
            const fh = d.height * p[2], fw = (fh * pic.w) / pic.h, sh = fh * 0.45;
            g.globalAlpha = Math.max(0, Math.min(1, d.alpha)) * a;
            g.save(); g.translate(p[0], p[1]); if (d.flip) g.scale(-1, 1);
            g.drawImage(pic.sized(fw * dpr), -fw / 2, -sh / 2, fw, sh);
            g.restore();
            continue;
          }
          const h = d.height * p[2], w = (h * pic.w) / pic.h;
          if (p[0] + w < -w * 0.2 || p[0] - w > W + w * 0.2) continue;               // well off the screen
          if (d.shadow > 0) {                                                         // a long soft shadow, as in the print
            g.globalAlpha = Math.min(1, d.shadow) * 0.6 * a; g.fillStyle = '#1e3c2d';
            g.beginPath(); g.ellipse(p[0] - w * 0.12, p[1], w * 0.36, Math.max(1, w * 0.045), 0, 0, 7); g.fill();
          }
          g.globalAlpha = Math.max(0, Math.min(1, d.alpha)) * a;
          if (d.turn) {                                                               // turned about its foot (and swaying a little)
            g.save(); g.translate(p[0], p[1]); g.rotate(d.turn + d.lean); if (d.flip) g.scale(-1, 1);
            g.drawImage(pic.sized(w * dpr), -w / 2, -h, w, h);
            g.restore();
          } else {
            // the foot stays put while the top leans (a shear about the foot); mirrored if flipped
            g.setTransform(dpr * (d.flip ? -1 : 1), 0, d.lean * dpr, dpr, dpr * (p[0] - d.lean * p[1]), 0);
            g.drawImage(pic.sized(w * dpr), -w / 2, p[1] - h, w, h);
            g.setTransform(dpr, 0, 0, dpr, 0, 0);
          }
        } else if (d.kind === 'glow') {
          const r = d.radius * p[2] * (0.55 + 0.45 * Math.min(1, d.strength)), s = d.strength * a, [R, G, B] = rgb(d.colour);
          const gr = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], r);
          gr.addColorStop(0, `rgba(${R},${G},${B},${Math.min(1, 0.95 * s)})`);
          gr.addColorStop(0.18, `rgba(${R},${G},${B},${Math.min(1, 0.55 * s)})`);
          gr.addColorStop(0.5, `rgba(${R},${G},${B},${0.16 * s})`);
          gr.addColorStop(1, `rgba(${R},${G},${B},0)`);
          g.globalAlpha = 1; g.globalCompositeOperation = 'lighter';
          g.fillStyle = gr; g.beginPath(); g.arc(p[0], p[1], r, 0, 7); g.fill();
          g.globalCompositeOperation = 'source-over';
        } else if (d.kind === 'block') {
          const w = d.width * p[2], h = d.height * p[2];
          if (p[0] + w / 2 < 0 || p[0] - w / 2 > W) continue;
          g.globalAlpha = Math.max(0, Math.min(1, d.alpha)) * a; g.fillStyle = paint(d.colour, p[3]);
          g.beginPath(); roundBox(g, p[0] - w / 2, p[1] - h, w, h, (Math.min(w, h) / 2) * Math.max(0, Math.min(1, d.round))); g.fill();
        } else if (d.kind === 'tree') {
          drawTree(g, d, p, a, t, near(p[3]), (c) => paint(c, p[3]), pictures, dpr, W);
        } else if (d.kind === 'ridge') {
          drawRidge(g, d, p, a, t, tint, pictures, dpr, W);
        } else if (d.kind === 'leafslice' && d.of.nuts) {
          drawNuts(g, d, P, leafPalette(paint(d.of.colours[0], p[3]), paint(d.of.colours[1], p[3])), paint('#5e3f22', p[3]), a, dpr, W, H);
        } else if (d.kind === 'leafslice') {
          // each leaf: two curves from tip to tip, turned and squashed (lying flat, or tumbling in the air); all the leaves
          // of one shade go into one path (the transform is applied as each is added), then one fill per shade
          const pal = leafPalette(paint(d.of.colours[0], p[3]), paint(d.of.colours[1], p[3])), half = d.of.size / 2;
          g.globalAlpha = a;
          for (let c = 0; c < pal.length; c++) {
            let any = false;
            g.beginPath();
            for (const l of d.ls) {
              if (l.c !== c) continue;
              const q = P(l.x, l.y, l.z);
              if (!q) continue;
              const len = half * l.k * q[2];
              if (q[0] < -len || q[0] > W + len || q[1] < -len || q[1] > H + len) continue;
              const sq = l.fly ? 0.12 + 0.88 * Math.abs(Math.cos(l.tum)) : l.sq, turn = l.fly ? l.rot : l.tilt;
              const cs = Math.cos(turn) * len, sn = Math.sin(turn) * len;
              g.setTransform(dpr * cs, dpr * sn, -dpr * sn * sq, dpr * cs * sq, dpr * q[0], dpr * q[1]);
              g.moveTo(-1, 0); g.quadraticCurveTo(0, -0.62, 1, 0); g.quadraticCurveTo(0, 0.62, -1, 0);
              any = true;
            }
            g.setTransform(dpr, 0, 0, dpr, 0, 0);
            if (any) { g.fillStyle = pal[c]; g.fill(); }
          }
        } else if (d.kind === 'plank') {
          // the plank's top edge is the ledge, so it hangs half its thickness below the line it is drawn along; a springy
          // one comes with points along its bend
          if (d.look === 'branch') { drawBranch(g, d, P, a, (c) => paint(c, p[3]), W); continue; }
          const z = (d.at[2] || 0) - d.thickness / 2, pts = (d.points || [d.from, d.to]).map(([x, dz]) => P(d.at[0] + x, d.at[1], z + dz));
          if (pts.some((q) => !q) || Math.max(...pts.map((q) => q[0])) < -50 || Math.min(...pts.map((q) => q[0])) > W + 50) continue;
          g.globalAlpha = Math.max(0, Math.min(1, d.alpha)) * a; g.strokeStyle = paint(d.colour, p[3]);
          g.lineWidth = Math.max(1, d.thickness * p[2]); g.lineCap = 'round'; g.lineJoin = 'round';
          g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
          for (const q of pts.slice(1)) g.lineTo(q[0], q[1]);
          g.stroke();
        } else {
          const pts = d.points, n = pts.length, [R, G, B] = rgb(d.colour), lift = d.width / 2;
          g.lineCap = 'round'; g.globalAlpha = 1; g.globalCompositeOperation = 'lighter';
          let prev = P(pts[0][0], pts[0][1], (pts[0][2] || 0) + lift);
          for (let i = 1; i < n; i++) {
            const q = P(pts[i][0], pts[i][1], (pts[i][2] || 0) + lift), f = i / (n - 1);
            if (prev && q) {
              g.strokeStyle = `rgba(${R},${G},${B},${Math.min(1, d.strength * f * a)})`;
              g.lineWidth = Math.max(0.5, d.width * q[2] * f);
              g.beginPath(); g.moveTo(prev[0], prev[1]); g.lineTo(q[0], q[1]); g.stroke();
            }
            prev = q;
          }
          g.globalCompositeOperation = 'source-over';
        }
      }
      g.globalAlpha = 1;
      if (!raysDone) rays();
      g.globalAlpha = 1;
      if (light.vignette > 0) {                       // a vignette: the edges of the picture sink towards the shade colour
        const [R, G, B] = rgb(shadeC), v = g.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.35, W / 2, H * 0.55, Math.hypot(W, H) * 0.62);
        v.addColorStop(0, `rgba(${R},${G},${B},0)`); v.addColorStop(1, `rgba(${R},${G},${B},${Math.min(1, light.vignette) * 0.75})`);
        g.fillStyle = v; g.fillRect(0, 0, W, H);
      }
      drawWash(g, W, H, wash);
      drawBars(g, W, bars);
      drawWords(g, W, H, hud, note, scene.words);
    },
  };
}

// ---- Autumn's painted world ----
// Nuts (a Leaf pile of nuts): little cartoon acorns, each a round nut in the pile's shades with a darker cap, a stalk
// and a glint, sitting on where it lies (turned however it came to rest; turning over as it flies and rolls). One path
// per shade, then the caps, then the glints.
function drawNuts(g, d, P, pal, cap, a, dpr, W, H) {
  const half = d.of.size / 2, put = [];
  for (const l of d.ls) {
    const q = P(l.x, l.y, l.z);
    if (!q) continue;
    const len = half * l.k * q[2];
    if (len < 0.3 || q[0] < -len * 2 || q[0] > W + len * 2 || q[1] < -len * 2 || q[1] > H + len * 2) continue;
    const turn = l.fly ? l.rot : l.tilt;
    put.push([l.c, Math.cos(turn) * len, Math.sin(turn) * len, q[0], q[1] - 0.6 * len]);
  }
  if (!put.length) return;
  const at = ([, cs, sn, x, y]) => g.setTransform(dpr * cs, dpr * sn, -dpr * sn, dpr * cs, dpr * x, dpr * y);
  g.globalAlpha = a;
  for (let c = 0; c < pal.length; c++) {                                 // the nuts
    let any = false;
    g.beginPath();
    for (const t of put) if (t[0] === c) { at(t); g.moveTo(0.95, 0); g.ellipse(0.1, 0, 0.82, 0.62, 0, 0, Math.PI * 2); any = true; }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (any) { g.fillStyle = pal[c]; g.fill(); }
  }
  g.beginPath();                                                         // the caps and stalks
  for (const t of put) { at(t); g.moveTo(-0.1, 0); g.ellipse(-0.5, 0, 0.4, 0.68, 0, 0, Math.PI * 2); g.rect(-1.08, -0.08, 0.2, 0.16); }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = cap; g.fill();
  g.beginPath();                                                         // a glint on each
  for (const t of put) { at(t); g.moveTo(0.62, -0.26); g.ellipse(0.38, -0.26, 0.24, 0.1, -0.2, 0, Math.PI * 2); }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.globalAlpha = a * 0.45; g.fillStyle = '#fff6e0'; g.fill();
  g.globalAlpha = 1;
}

// A Ledge drawn as a branch: its top edge is where walkers stand; thickest where it is held (the trunk end), tapering
// to a thin tip, a lighter line along its top (the light from above), a few twigs up and out towards its free end(s).
function drawBranch(g, d, P, a, col, W) {
  const pts = d.points || [d.from, d.to], n = pts.length, held = d.held ?? 0.5, T = d.thickness, z0 = d.at[2] || 0;
  const far = (u) => Math.min(1, Math.abs(u - held) / Math.max(held, 1 - held, 1e-6));
  const top = [], under = [];
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1), [x, z] = pts[i], w = T * (1.25 - 0.85 * far(u));
    const A = P(d.at[0] + x, d.at[1], z0 + z), B = P(d.at[0] + x, d.at[1], z0 + z - w);
    if (!A || !B) return;
    top.push(A); under.push(B);
  }
  if (Math.max(...top.map((q) => q[0])) < -80 || Math.min(...top.map((q) => q[0])) > W + 80) return;
  const c0 = col(d.colour), s = top[0][2];
  g.globalAlpha = Math.max(0, Math.min(1, d.alpha)) * a;
  g.fillStyle = c0; g.beginPath();
  top.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])));
  for (let i = n - 1; i >= 0; i--) g.lineTo(under[i][0], under[i][1]);
  g.closePath(); g.fill();
  // twigs: from the top edge, out towards the free end(s), each with a little fork
  g.strokeStyle = c0; g.lineCap = 'round';
  for (let i = 1; i < n - 1; i++) {
    const u = i / (n - 1), f = far(u);
    if (f < 0.35 || (i * 7 + Math.round(d.at[0])) % 3 === 0) continue;
    const out = Math.sign(u - held) || 1, len = (18 + 22 * f) * s, A = top[i], h = (i * 37 + Math.round(d.at[0])) % 5;
    const B = [A[0] + out * len * (0.5 + 0.1 * h), A[1] - len * (0.85 - 0.08 * h)];
    g.lineWidth = Math.max(0.8, T * 0.22 * (1 - 0.5 * f) * s);
    g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]);
    g.moveTo((A[0] + B[0]) / 2, (A[1] + B[1]) / 2); g.lineTo(B[0] + out * len * 0.35, (A[1] + B[1]) / 2 - len * 0.15);
    g.stroke();
  }
  // the light along its top
  g.strokeStyle = col(shadeColour(d.colour, 1.35)); g.lineWidth = Math.max(0.6, T * 0.12 * s); g.lineJoin = 'round';
  g.beginPath(); top.forEach((q, i) => (i ? g.lineTo(q[0], q[1] + 1) : g.moveTo(q[0], q[1] + 1))); g.stroke();
}

// A Tree box: trunk with bark, limbs, a crown of leafy clumps lit from above (engine/shapes.js); or its picture.
// t = the air in front of it, n = how near the camera it is (the light's foreground shade), col = its colours after both.
function drawTree(g, d, p, a, t, n, col, pictures, dpr, W) {
  const s = p[2], alpha = Math.max(0, Math.min(1, d.alpha)) * a;
  const pic = d.picture && pictures ? pictures.get(d.picture) : null;
  if (d.picture) {
    if (!pic) return;
    const h = d.height * s, w = (h * pic.w) / pic.h;
    if (p[0] + w < 0 || p[0] - w > W) return;
    g.globalAlpha = alpha * (1 - 0.6 * t);
    g.drawImage(pic.sized(w * dpr), p[0] - w / 2, p[1] - h, w, h);
    return;
  }
  const key = ['tree', d.height, d.trunk, d.crown, d.crownAt, d.lean, d.seed, d.leaves, d.leaves2, d.bark].join('|');
  const T = shapeOf(key, () => {
    const shp = treeShape(d);
    for (const b of shp.blobs) { b.col = shadeColour(mixColour(d.leaves, d.leaves2, b.t), b.light); b.rim = shadeColour(b.col, 1.18); }
    return shp;
  });
  if (p[0] + T.wide * s < -40 || p[0] - T.wide * s > W + 40) return;
  g.globalAlpha = alpha;
  // a tree is painted once into its own picture (at about this size, in this much air or shade, softened if near) and
  // then just placed: the phone draws a few hundred leafy clumps once, not every frame. (A huge one right by the lens
  // is painted directly, unsoftened.)
  const q = Math.max(0.01, Math.round(s * 40) / 40), tq = Math.round(t * 50) / 50, nq = Math.round(n * 20) / 20;
  const blur = nq > 0.05 ? nq * 6 * dpr : 0, pad = blur ? (blur * 2) / (q * dpr) : 0;
  const halfW = T.wide / 2 + 30 + pad, top = T.top + 20 + pad, below = pad;
  const pw = Math.ceil(2 * halfW * q * dpr), ph = Math.ceil((top + below) * q * dpr);
  if (pw > 4096 || ph > 4096) { paintTree(g, T, d, p[0], p[1], s, col); return; }
  const skey = key + '|' + tq + '|' + nq + '|' + q + '|' + dpr;
  let sp = sprites.get(skey);
  if (!sp) {
    const c = document.createElement('canvas'); c.width = pw; c.height = ph;
    const cg = c.getContext('2d'); cg.scale(dpr, dpr);
    if (blur) cg.filter = 'blur(' + blur.toFixed(1) + 'px)';
    paintTree(cg, T, d, halfW * q, top * q, q, col);
    if (sprites.size > 160) sprites.delete(sprites.keys().next().value);
    sprites.set(skey, (sp = c));
  } else { sprites.delete(skey); sprites.set(skey, sp); }            // (most recently used last)
  g.drawImage(sp, p[0] - halfW * s, p[1] - top * s, 2 * halfW * s, (top + below) * s);
}
const sprites = new Map();
// paint a tree with its foot at (fx, fy), s pixels per unit, col = its colours (after air and shade)
function paintTree(g, T, d, fx, fy, s, col) {
  const X = (x) => fx + x * s, Z = (z) => fy - z * s;
  if (T.trunk.length) {
    g.fillStyle = col(d.bark); g.beginPath();
    T.trunk.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))));
    g.closePath(); g.fill();
    g.strokeStyle = col(shadeColour(d.bark, 0.72)); g.lineWidth = Math.max(0.7, d.trunk * 0.045 * s); g.lineCap = 'round';
    for (const line of T.bark) { g.beginPath(); line.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z)))); g.stroke(); }
    g.strokeStyle = col(d.bark);
    for (const L of T.limbs) {
      g.lineWidth = Math.max(1, L.w * s); g.beginPath();
      L.pts.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z)))); g.stroke();
    }
  }
  if (T.core) {                                                       // the crown's shaded heart
    g.fillStyle = col(shadeColour(mixColour(d.leaves, d.leaves2, 0.3), 0.62));
    g.beginPath(); g.ellipse(X(T.core.x), Z(T.core.z), T.core.rx * s, T.core.rz * s, 0, 0, 7); g.fill();
  }
  for (const b of T.blobs) {                                          // the clumps, darker ones first; each with a lit rim
    g.fillStyle = col(b.col); g.beginPath();
    for (const [dx, dz, r] of b.bits) { g.moveTo(X(b.x + dx) + r * s, Z(b.z + dz)); g.arc(X(b.x + dx), Z(b.z + dz), r * s, 0, 7); }
    g.fill();
    g.fillStyle = col(b.rim); g.beginPath();
    g.arc(X(b.x + b.r * 0.25), Z(b.z + b.r * 0.3), b.r * 0.55 * s, 0, 7); g.fill();
  }
}

// A Hills box: its ridge filled down to the ground (engine/shapes.js); or its picture stretched across.
function drawRidge(g, d, p, a, t, tint, pictures, dpr, W) {
  const s = p[2], alpha = Math.max(0, Math.min(1, d.alpha)) * a;
  if (p[0] + (d.width / 2) * s < 0 || p[0] - (d.width / 2) * s > W) return;
  if (d.picture) {
    const pic = pictures ? pictures.get(d.picture) : null;
    if (!pic) return;
    g.globalAlpha = alpha * (1 - 0.6 * t);
    g.drawImage(pic.sized(d.width * s * dpr), p[0] - (d.width / 2) * s, p[1] - d.height * s, d.width * s, d.height * s);
    return;
  }
  const pts = shapeOf(['ridge', d.width, d.height, d.roughness, d.seed].join('|'), () => ridgeLine(d));
  g.globalAlpha = alpha; g.fillStyle = tint(d.colour, t); g.beginPath();
  pts.forEach(([x, z], i) => (i ? g.lineTo(p[0] + x * s, p[1] - z * s) : g.moveTo(p[0] + x * s, p[1] - z * s)));
  g.lineTo(p[0] + pts[pts.length - 1][0] * s, p[1] + 2); g.lineTo(p[0] + pts[0][0] * s, p[1] + 2);
  g.closePath(); g.fill();
}

// a rectangle with rounded corners (radius r), as a path to fill
export function roundBox(g, x, y, w, h, r) {
  if (r > 0.5 && g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h);
}
