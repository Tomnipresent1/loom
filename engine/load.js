// Loading a piece: read its files, upgrade old formats, then check and compile every thing's graph into a "blueprint"
// the World can run. Problems are collected (not thrown one at a time) so the screen can list them all at once, in words.
import { NODE_TYPES, DATA_TYPES } from './registry.js';
import { migrate, LoadProblem } from './format.js';
import { checkCamera } from './camera.js';
import { checkPaths } from './path.js';
import { checkScatters } from './scatter.js';

// readJson(path inside the piece folder) -> parsed JSON (async). Returns { files, blueprints, problems }.
export async function loadPiece(readJson) {
  const problems = [];
  const read = async (path, kind) => {
    let file;
    try { file = await readJson(path); } catch (e) { problems.push(`${path}: couldn't be read (${e.message})`); return null; }
    try { file = migrate(file, path); } catch (e) { if (e instanceof LoadProblem) { problems.push(e.message); return null; } throw e; }
    if (file.kind !== kind) { problems.push(`${path}: should say "kind": "${kind}"`); return null; }
    return file;
  };

  const piece = await read('piece.json', 'piece');
  if (!piece) return { files: null, blueprints: null, problems };
  if (typeof piece.start !== 'string') { problems.push('piece.json: needs "start": the name of the first scene'); return { files: null, blueprints: null, problems }; }
  const scene = await read(`scenes/${piece.start}.json`, 'scene');
  if (!scene) return { files: null, blueprints: null, problems };

  // every kind of thing the scene places, plus any listed in piece.json "things" (made, but not placed yet)
  const things = {};
  if (piece.things !== undefined && !(Array.isArray(piece.things) && piece.things.every((t) => typeof t === 'string'))) problems.push('piece.json: "things" should be a list of thing names');
  const scattered = scene.scatters && typeof scene.scatters === 'object' ? Object.values(scene.scatters).map((s) => s && s.thing) : [];
  for (const name of new Set([...(scene.place || []).map((p) => p.thing), ...scattered, ...(Array.isArray(piece.things) ? piece.things : [])])) {
    if (typeof name !== 'string') continue;
    const t = await read(`things/${name}.json`, 'thing');
    if (t) things[name] = t;
  }
  const files = { piece, scene, things };
  const blueprints = compile(files, problems);
  return { files, blueprints: problems.length ? null : blueprints, problems };
}

function checkValue(type, value, pin, ctx) {
  const t = DATA_TYPES.get(type);
  return t ? t.check(value, pin, ctx) : `unknown type "${type}"`;
}

function checkVars(vars, where, problems, ctx) {
  if (vars == null) return {};
  if (typeof vars !== 'object' || Array.isArray(vars)) { problems.push(`${where}: "vars" should be { name: { "type": ..., "value": ... } }`); return {}; }
  for (const [name, v] of Object.entries(vars)) {
    const t = v && DATA_TYPES.get(v.type);
    if (!t || !t.wire) { problems.push(`${where}: variable "${name}" has unknown type "${v && v.type}"`); continue; }
    const bad = t.check(v.value, {}, ctx);
    if (bad) problems.push(`${where}: variable "${name}" starting value ${bad}`);
  }
  return vars;
}

// Turn the files into blueprints: { thingName: { name, file, vars, nodes: { id: spec }, order: [id] } }.
export function compile({ piece, scene, things }, problems = []) {
  const messages = piece.messages || {};
  const pieceVars = checkVars(piece.vars, 'piece.json', problems, {});
  const sceneFile = `scenes/${piece.start}.json`;
  const sceneVars = checkVars(scene.vars, sceneFile, problems, {});

  // the scene: size, camera, what's placed where
  if (!Array.isArray(scene.size) || scene.size.length !== 2 || !scene.size.every((n) => n > 0)) problems.push(`${sceneFile}: "size" should be [width, height]`);
  const ids = new Set();
  for (const [i, p] of (scene.place || []).entries()) {
    const where = `${sceneFile}: placed thing ${i + 1}${p && p.id ? ` ("${p.id}")` : ''}`;
    if (!p || typeof p.id !== 'string') { problems.push(`${where}: needs an "id"`); continue; }
    if (ids.has(p.id)) problems.push(`${where}: the id "${p.id}" is used twice`);
    ids.add(p.id);
    if (!Array.isArray(p.at) || p.at.length !== 3 || !p.at.every(Number.isFinite)) problems.push(`${where}: "at" should be [x, y, z]`);
    const t = things[p.thing];
    if (!t) continue;                                   // already reported when the file failed to load
    for (const [k, v] of Object.entries(p.set || {})) {
      const decl = (t.vars || {})[k];
      if (!decl) problems.push(`${where}: sets "${k}", but ${p.thing} has no variable called that`);
      else if (!decl.perCopy) problems.push(`${where}: sets "${k}", but ${p.thing}'s "${k}" isn't ticked "perCopy"`);
      else { const bad = checkValue(decl.type, v, {}, {}); if (bad) problems.push(`${where}: "${k}" ${bad}`); }
    }
  }
  const follow = scene.camera && scene.camera.follow;
  if (follow && !ids.has(follow)) problems.push(`${sceneFile}: the camera follows "${follow}", but nothing placed has that id`);
  problems.push(...checkCamera(scene.camera, sceneFile));
  problems.push(...checkPaths(scene.paths, sceneFile));
  const paths = scene.paths && typeof scene.paths === 'object' ? scene.paths : {};
  problems.push(...checkScatters(scene.scatters, paths, things, sceneFile, [...new Set((scene.place || []).map((p) => p.thing))]));
  for (const name of Object.keys(scene.scatters && typeof scene.scatters === 'object' ? scene.scatters : {})) {
    const clash = [...ids].find((id) => new RegExp(`^${name.replace(/[^\w]/g, '\\$&')}-\\d+$`).test(id));
    if (clash) problems.push(`${sceneFile}: the placed thing "${clash}" has an id the scatter "${name}" uses for its copies (${name}-1, ${name}-2...): rename one`);
  }

  const blueprints = {};
  for (const [name, thing] of Object.entries(things)) blueprints[name] = compileThing(name, thing, { messages, pieceVars, sceneVars, things, paths }, problems);
  return blueprints;
}

function compileThing(name, thing, { messages, pieceVars, sceneVars, things, paths }, problems) {
  const file = `things/${name}.json`;
  const vars = checkVars(thing.vars, file, problems, {});
  for (const v of Object.keys(vars)) if (v in sceneVars || v in pieceVars) problems.push(`${file}: variable "${v}" has the same name as a scene/piece variable`);
  const ctx = { messages, things, paths, findVar: (v) => vars[v] || sceneVars[v] || pieceVars[v] || null };
  // Frames (Q7e): titled boxes drawn behind nodes in the editor; the engine ignores them when playing.
  for (const [i, f] of (thing.frames || []).entries()) {
    const okRect = f && Array.isArray(f.at) && f.at.length === 2 && Array.isArray(f.size) && f.size.length === 2 && [...f.at, ...f.size].every(Number.isFinite);
    if (!okRect || typeof f.title !== 'string') problems.push(`${file}: frame ${i + 1} should be { "title": ..., "at": [x, y], "size": [w, h] }`);
    else if (f.colour !== undefined && !/^#[0-9a-f]{6}$/i.test(f.colour)) problems.push(`${file}: frame "${f.title}" colour should be like "#4a6fa5"`);
  }

  const nodes = {};
  for (const [id, nd] of Object.entries(thing.nodes || {})) {
    const where = `${file}: node "${id}"`;
    const type = nd && NODE_TYPES.get(nd.type);
    if (!type) { problems.push(`${where} has unknown type "${nd && nd.type}"`); continue; }
    const set = { ...(nd.set || {}) };
    for (const [k, v] of Object.entries(set)) {
      const pin = type.inputs[k];
      if (!pin || pin.flow) { problems.push(`${where} (${type.title}) has no setting "${k}"`); continue; }
      const bad = checkValue(pin.type, v, pin, ctx);
      if (bad) problems.push(`${where} (${type.title}) "${k}" ${bad}`);
    }
    const spec = { id, type, set, dataIn: {}, flowOut: {}, outTypes: {} };
    for (const [pin, o] of Object.entries(type.outputs)) if (!o.flow) spec.outTypes[pin] = typeof o.type === 'function' ? o.type(spec, ctx) : o.type;
    nodes[id] = spec;
  }

  for (const [i, w] of (thing.wires || []).entries()) {
    const label = Array.isArray(w) ? `${w[0]} → ${w[1]}` : JSON.stringify(w);
    const where = `${file}: wire ${i + 1} (${label})`;
    const ends = Array.isArray(w) && w.length === 2 ? w.map((s) => (typeof s === 'string' ? s.split('.') : [])) : [];
    if (ends.length !== 2 || ends.some((e) => e.length !== 2)) { problems.push(`${where}: should be ["node.pin", "node.pin"]`); continue; }
    const [[fromId, out], [toId, inp]] = ends;
    const from = nodes[fromId], to = nodes[toId];
    if (!from || !to) { if (!(thing.nodes || {})[from ? toId : fromId]) problems.push(`${where}: there's no node "${from ? toId : fromId}"`); continue; }
    const o = from.type.outputs[out], p = to.type.inputs[inp];
    if (!o) { problems.push(`${where}: ${fromId} (${from.type.title}) has no output "${out}"`); continue; }
    if (!p) { problems.push(`${where}: ${toId} (${to.type.title}) has no input "${inp}"`); continue; }
    if (!!o.flow !== !!p.flow) { problems.push(`${where}: joins a white (order) pin to a coloured (data) pin`); continue; }
    if (o.flow) {
      if (from.flowOut[out]) { problems.push(`${where}: "${fromId}.${out}" already has a white wire out (one out each; use a Sequence to split)`); continue; }
      from.flowOut[out] = { node: toId, pin: inp };
    } else {
      if (p.setting) { problems.push(`${where}: "${inp}" is a setting on ${to.type.title}, it can't take a wire`); continue; }
      const ot = from.outTypes[out], it = p.type;
      // ("anything" fits everywhere, both ways, like Unreal's wildcard pins: e.g. a message's data into a number)
      if (it !== 'any' && ot !== 'any' && ot !== it) { problems.push(`${where}: carries ${label_(ot)} into ${label_(it)}, needs a converter box`); continue; }
      if (to.dataIn[inp]) { problems.push(`${where}: "${toId}.${inp}" already has a wire in (one in each)`); continue; }
      to.dataIn[inp] = { node: fromId, pin: out };
    }
  }
  return { name, file, vars, nodes, order: Object.keys(nodes) };
}
const label_ = (t) => (DATA_TYPES.get(t) || { label: t }).label;
