// The World runs a loaded scene: one Instance per placed thing, each with its own copy of its thing's nodes. It knows
// nothing about screens or fingers: the runtime hands it input ({ move: [x, y], target: [x, y] | null, finger }) and asks
// it for draw commands, so it runs the same in the browser, on the phone, and in the tests. finger = the steering finger
// as { id, x } (x across the screen in "picture units": the screen's height = 600, as in NAMI), or null. pressed = the
// labels of on-screen buttons pressed since the last step (see buttons()), and Card choices ("<card key>#1" / "#2").
// tap = yes on the one step after a tap (a quick touch, or space): Walk and jump jumps. kick = -1 / 1 (a flick that
// way) or 2 (K: the way she faces) on the one step after a kick, else 0.
import { scenePlacements } from './scatter.js';
const MAX_DEPTH = 200;

export class World {
  // keep.pieceVars: the piece variables to carry on with (beginning the scene again keeps them: "kept from scene to scene")
  constructor(loaded, keep = {}) {
    const { files, blueprints } = loaded;
    this.files = files;
    this.blueprints = blueprints;
    this.bounds = files.scene.size;
    this.time = 0;
    this.input = { move: [0, 0], target: null, finger: null };
    this.request = null;                             // 'restart' / 'leave', asked for by a Start again box
    this.pieceVars = { ...startValues(files.piece.vars), ...(keep.pieceVars ? structuredClone(keep.pieceVars) : {}) };
    this.sceneVars = startValues(files.scene.vars);
    this.hud = {};                                   // slot -> { text, age, life }
    this.depth = 0;
    this.onFire = null;                              // optional watcher: (instance, nodeId, pin) when a white wire fires
    this.soundQueue = [];
    this.instances = [];
    this.byId = new Map();
    for (const p of scenePlacements(files.scene, files.things)) {        // (placed things, then scattered ones)
      const inst = new Instance(this, blueprints[p.thing], p);
      this.instances.push(inst);
      this.byId.set(p.id, inst);
    }
    for (const inst of this.instances) inst.each((n) => n.type.create && n.type.create(n));
  }

  begin() { for (const inst of this.instances) inst.each((n) => n.type.begin && n.type.begin(n)); }

  step(dt, input) {
    if (input) this.input = input;
    this.time += dt;
    for (const inst of this.instances) if (!inst.removed) inst.each((n) => n.type.tick && !inst.removed && n.type.tick(n, dt));
    if (this.instances.some((i) => i.removed)) {
      this.instances = this.instances.filter((i) => !i.removed);
      for (const [id, i] of this.byId) if (i.removed) this.byId.delete(id);
    }
    for (const [slot, h] of Object.entries(this.hud)) { h.age += dt; if (h.age > h.life + FADE) delete this.hud[slot]; }
  }

  draws() {
    const out = [];
    for (const inst of this.instances) inst.each((n) => n.type.draw && n.type.draw(n, out));
    return out;
  }
  // The on-screen buttons showing right now: [{ label, picture, key }], one per label (Button boxes with the same label
  // share one). The runtime draws them and hands back the labels pressed, as input.pressed on the next step.
  buttons() {
    const out = new Map();
    for (const inst of this.instances) if (!inst.removed) inst.each((n) => {
      const b = n.type.button && n.type.button(n);
      if (b && !out.has(b.label)) out.set(b.label, b);
    });
    return [...out.values()];
  }
  // What walkers bump against: [{ x, y, r, hw, who }] from every box that says it is solid (a node type's solid(n)
  // gives { r, hw }: its radius, and half its extra width left to right; or just a radius). `except` = the walker's own
  // thing, which never bumps into itself.
  solids(except) {
    const out = [];
    for (const inst of this.instances) if (inst !== except && !inst.removed) inst.each((n) => {
      const s = n.type.solid && n.type.solid(n);
      const r = typeof s === 'number' ? s : s ? s.r : 0, hw = (s && s.hw) || 0;
      if (r > 0) out.push({ x: inst.pos[0], y: inst.pos[1], r, hw, who: inst });
    });
    return out;
  }
  // What side-on walkers (Walk and jump) stand on: [{ x1, z1, x2, z2, height(x), who, node }], each a line from its left
  // end to its right end (x along, z height), from every box that says it is a ledge (a node type's ledge(n) gives the
  // ends relative to its thing, and optionally sag(u): how far it is bent down at u, 0 = left end .. 1 = right end).
  // height(x) = its top at x (never below the ground), or null off its ends. Depth (y) doesn't matter: a walker can
  // stand on every ledge.
  ledges(except) {
    const out = [];
    for (const inst of this.instances) if (inst !== except && !inst.removed) inst.each((n) => {
      const l = n.type.ledge && n.type.ledge(n);
      if (!l || !(l.x2 > l.x1)) return;
      const [x, , z = 0] = inst.pos, x1 = x + l.x1, x2 = x + l.x2, z1 = z + l.z1, z2 = z + l.z2, sag = l.sag;
      const height = (px) => {
        if (px < x1 || px > x2) return null;
        const u = (px - x1) / (x2 - x1);
        return Math.max(0, z1 + (z2 - z1) * u - (sag ? sag(u) : 0));
      };
      out.push({ x1, z1, x2, z2, height, who: inst, node: n });
    });
    return out;
  }
  // Feet: where every walker's feet are and how they move, for things that react to being walked through (Leaf pile):
  // [{ x, y, z, vx, vz, standing, landing: { id, impact, time } | null, who }] from every box that has feet (a node
  // type's feet(n)). landing = the walker's last landing (a new id each time).
  feet() {
    const out = [];
    for (const inst of this.instances) if (!inst.removed) inst.each((n) => { const f = n.type.feet && n.type.feet(n); if (f) out.push({ ...f, who: inst }); });
    return out;
  }
  // Screens: the cards showing (Card boxes), how much colour the picture has (a Wash box; 1 if none), the bars (Bar).
  cards() { return this.collect('card'); }
  bars() { return this.collect('bar'); }
  wash() { return this.collect('wash')[0] || null; }
  collect(hook) {
    const out = [];
    for (const inst of this.instances) if (!inst.removed) inst.each((n) => { const v = n.type[hook] && n.type[hook](n); if (v) out.push(v); });
    return out;
  }
  // Spaces people keep out of (Keep clear boxes): [{ x, y, r }].
  clearZones() {
    const out = [];
    for (const inst of this.instances) if (!inst.removed) inst.each((n) => {
      const r = n.type.keepClear && n.type.keepClear(n);
      if (r > 0) out.push({ x: inst.pos[0], y: inst.pos[1], r });
    });
    return out;
  }

  // Sound, like drawing: the World only says what should sound; the runtime's audio plays it (or a test reads it).
  //   one-shots (a chime): queued by playSound, collected once with takeSounds()
  //   held sounds (a hum): asked for every frame with hums(), each with a key so the audio can follow it
  playSound(cmd) { this.soundQueue.push(cmd); }
  takeSounds() { return this.soundQueue.splice(0); }
  hums() {
    const out = [];
    for (const inst of this.instances) inst.each((n) => n.type.sound && n.type.sound(n, out));
    return out;
  }
  // Where the "ears" are: the thing the camera follows (usually the player), else the middle of the scene.
  listener() {
    const cam = this.files.scene.camera, t = cam && this.byId.get(cam.follow);
    return t ? t.pos : [this.bounds[0] / 2, this.bounds[1] / 2, 0];
  }

  // Messages (Q7d): mode 'one' (to a thing), 'kind' (all things of a kind) or 'everyone'.
  send(message, { mode = 'one', to = null, kind = '', from = null, data = null } = {}) {
    const targets = mode === 'everyone' ? this.instances
      : mode === 'kind' ? this.instances.filter((i) => i.kind === kind)
      : to ? [to] : [];
    for (const t of [...targets]) if (!t.removed) t.each((n) => n.type.receive && n.type.receive(n, message, { from, data }));
  }

  // Variables (Q7c): the thing's own first, then the scene's, then the piece's.
  varHome(inst, name) {
    if (inst && name in inst.vars) return inst.vars;
    if (name in this.sceneVars) return this.sceneVars;
    if (name in this.pieceVars) return this.pieceVars;
    throw new Error(`no variable "${name}"`);
  }
  getVar(inst, name) { return this.varHome(inst, name)[name]; }
  setVar(inst, name, value) { this.varHome(inst, name)[name] = value; }

  say(slot, text, seconds) { this.hud[slot] = { text: String(text), age: 0, life: seconds > 0 ? seconds : Infinity }; }

  // Live link: the files changed only in numbers/settings (same shape), so swap the values in without restarting.
  patch(loaded) {
    for (const [name, bp] of Object.entries(this.blueprints)) {
      const fresh = loaded.blueprints[name];
      for (const [id, spec] of Object.entries(bp.nodes)) spec.set = fresh.nodes[id].set;
    }
    const placed = new Map(scenePlacements(loaded.files.scene, loaded.files.things).map((p) => [p.id, p]));
    for (const inst of this.instances) {
      const p = placed.get(inst.id);
      for (const [k, decl] of Object.entries(inst.bp.vars)) if (decl.perCopy) inst.vars[k] = p && p.set && k in p.set ? p.set[k] : decl.value;
    }
    this.files = loaded.files;
  }
}
export const FADE = 0.6;

function startValues(vars) {
  const out = {};
  for (const [k, v] of Object.entries(vars || {})) out[k] = structuredClone(v.value);
  return out;
}

class Instance {
  constructor(world, bp, placement) {
    this.world = world;
    this.bp = bp;
    this.kind = bp.name;
    this.id = placement.id;
    this.pos = [...placement.at];
    this.home = [...placement.at];                    // where it was placed (things that orbit go round this)
    this.removed = false;
    this.vars = startValues(bp.vars);
    for (const [k, v] of Object.entries(placement.set || {})) this.vars[k] = structuredClone(v);
    this.nodes = {};
    for (const id of bp.order) this.nodes[id] = new NodeRun(this, bp.nodes[id]);
  }
  each(fn) { for (const id of this.bp.order) fn(this.nodes[id]); }
  remove() { this.removed = true; }

  // A live data wire pulls the source's current value.
  read(id, pin) {
    const n = this.nodes[id], w = this.world;
    if (++w.depth > MAX_DEPTH) { w.depth = 0; throw new Error(`${this.bp.file}: wires go round in a loop near "${id}.${pin}"`); }
    try { return n.type.read[pin](n); } finally { w.depth--; }
  }
  // A white wire arrives at a flow input.
  trigger(id, pin) {
    const n = this.nodes[id], w = this.world;
    if (++w.depth > MAX_DEPTH) { w.depth = 0; throw new Error(`${this.bp.file}: white wires go round in a loop near "${id}.${pin}"`); }
    try { n.type.on[pin](n); } finally { w.depth--; }
  }
}

// What a node's code sees: n.in('pin') for an input's value (wire, else its setting, else the default), n.fire('pin') to
// send a white wire onward, n.state for its own memory, n.me for its thing, n.world for everything else.
class NodeRun {
  constructor(inst, spec) { this.me = inst; this.spec = spec; this.type = spec.type; this.id = spec.id; this.state = {}; }
  get world() { return this.me.world; }
  in(pin) {
    const src = this.spec.dataIn[pin];
    if (src) return this.me.read(src.node, src.pin);
    const v = this.spec.set[pin];
    return v !== undefined ? v : this.type.inputs[pin].value;
  }
  fire(pin) {
    const t = this.spec.flowOut[pin];
    if (!t) return;
    const w = this.world;
    if (w.onFire) w.onFire(this.me, this.id, pin);    // watch mode: the editor sees white wires fire
    this.me.trigger(t.node, t.pin);
  }
}
