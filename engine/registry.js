// The registry: every node type and every data type registers itself here. The core never lists them by name, and the
// editor (Stage 2) builds its menus from what is registered. Adding a node = adding a file in nodes/ (and one line in
// nodes/index.js, because a browser can't list a folder by itself).

export const NODE_TYPES = new Map();
export const DATA_TYPES = new Map();

// A data type: { name, label, colour, wire (can it travel along a wire?), check(value, pin, ctx) -> null | problem }.
export function defineType(def) {
  if (!def || !def.name) throw new Error('defineType: a data type needs a name');
  if (DATA_TYPES.has(def.name)) throw new Error(`data type "${def.name}" is registered twice`);
  DATA_TYPES.set(def.name, { wire: true, check: () => null, ...def });
}

// A node type. Fields (all optional except type/title/kind):
//   type    'ramp'            file-format name, never changes once pieces use it
//   title   'Ramp'            shown on the box
//   kind    'when' | 'do' | 'data' | 'part'   (red events, blue actions, value nodes, and parts that draw/move the thing)
//   help    one line for the editor
//   inputs  { pin: { flow: true } | { type, value, setting?, options? } }   setting = set in the box, never wired;
//           every pin may also have label (plain words for the editor) and help (one sentence, shown on hover)
//   outputs { pin: { flow: true } | { type } }   type may be a function (node, ctx) -> type name, e.g. Get variable
//   create(n)             once when the thing appears: set up n.state
//   begin(n)              once when the scene starts (after every thing exists)
//   on: { pin(n) }        a white wire arrived at this flow input
//   read: { pin(n) }      someone wants this data output's current value (live wires pull)
//   tick(n, dt)           every frame
//   receive(n, msg, info) a message arrived at this node's thing
//   draw(n, out)          push draw commands for the renderer
// The words shown for a pin: its own label if it has one, else its file name in plain words (reachedTop → reached top).
export const pinLabel = (pin, def) => (def && def.label) || pin.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();

// A converter box that bridges a gap between two wire types (from → to), if there is one (see nodes/converters.js).
export function findConverter(from, to) {
  for (const t of NODE_TYPES.values()) if (t.converts && (t.converts[0] === from || t.converts[0] === '*') && t.converts[1] === to && from !== to) return t;
  return null;
}

export function defineNode(def) {
  if (!def || !def.type) throw new Error('defineNode: a node needs a type');
  if (NODE_TYPES.has(def.type)) throw new Error(`node type "${def.type}" is registered twice`);
  for (const k of ['title', 'kind']) if (!def[k]) throw new Error(`node type "${def.type}" has no ${k}`);
  NODE_TYPES.set(def.type, { inputs: {}, outputs: {}, on: {}, read: {}, ...def });
}
