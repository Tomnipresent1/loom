// Writing piece files back out in the same readable shape we write by hand: anything short stays on one line
// ("zone": { "type": "trigger-zone", "at": [40, 80], ... }), longer things open up one entry per line.
const WIDTH = 120;

function oneLine(v) {
  if (Array.isArray(v)) return '[' + v.map(oneLine).join(', ') + ']';
  if (v && typeof v === 'object') {
    const e = Object.entries(v).filter(([, x]) => x !== undefined);
    return e.length ? '{ ' + e.map(([k, x]) => JSON.stringify(k) + ': ' + oneLine(x)).join(', ') + ' }' : '{}';
  }
  return JSON.stringify(v);
}

export function formatJson(v, indent = '', lead = 0) {
  const one = oneLine(v);
  if (!v || typeof v !== 'object' || indent.length + lead + one.length <= WIDTH) return one;
  const inner = indent + '  ';
  if (Array.isArray(v)) return '[\n' + v.map((x) => inner + formatJson(x, inner)).join(',\n') + '\n' + indent + ']';
  const e = Object.entries(v).filter(([, x]) => x !== undefined);
  return '{\n' + e.map(([k, x]) => { const key = JSON.stringify(k) + ': '; return inner + key + formatJson(x, inner, key.length); }).join(',\n') + '\n' + indent + '}';
}

export const fileText = (v) => formatJson(v) + '\n';
