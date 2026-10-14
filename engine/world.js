// The World runs a loaded scene: one Instance per placed thing, each with its own copy of its thing's nodes. It knows
// nothing about screens or fingers: the runtime hands it input ({ move: [x, y], target: [x, y] | null }) and asks it
// for draw commands, so it runs the same in the browser, on the phone, and in the tests.
const MAX_DEPTH = 200;

export class World {
  constructor(loaded) {
    const { files, blueprints } = loaded;
    this.files = files;
    this.blueprints = blueprints;
    this.bounds = files.scene.size;
    this.time = 0;
    this.input = { move: [0, 0], target: null };
    this.pieceVars = startValues(files.piece.vars);
    this.sceneVars = startValues(files.scene.vars);
    this.hud = {};                                   // slot -> { text, age, life }
    this.depth = 0;
    this.onFire = null;                              // optional watcher: (instance, nodeId, pin) when a white wire fires
    this.soundQueue = [];
    this.instances = [];
    this.byId = new Map();
    for (const p of files.scene.place || []) {
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
    const placed = new Map((loaded.files.scene.place || []).map((p) => [p.id, p]));
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
