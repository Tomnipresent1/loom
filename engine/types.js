// The built-in data types (wire colours from ideas.md, Q7a). More can be registered from anywhere with defineType.
import { defineType } from './registry.js';
import { checkCurve } from './curve.js';

const need = (ok, what) => (ok ? null : `should be ${what}`);

// Types that travel along wires.
defineType({ name: 'number',   label: 'number',       colour: '#7bd36b', check: (v) => need(Number.isFinite(v), 'a number') });
defineType({ name: 'whole',    label: 'whole number', colour: '#3cc7b5', check: (v) => need(Number.isInteger(v), 'a whole number') });
defineType({ name: 'yesno',    label: 'yes/no',       colour: '#8f1d2c', check: (v) => need(typeof v === 'boolean', 'true or false') });
defineType({ name: 'text',     label: 'text',         colour: '#f08ac2', check: (v) => need(typeof v === 'string', 'text in "quotes"') });
defineType({ name: 'position', label: 'position',     colour: '#f0d34a', check: (v) => need(Array.isArray(v) && v.length === 3 && v.every(Number.isFinite), '[x, y, z]') });
defineType({ name: 'colour',   label: 'colour',       colour: '#eeeeee', check: (v) => need(typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v), 'a colour like "#ffd27a"') });
defineType({ name: 'thing',    label: 'thing',        colour: '#4a8cf0', check: (v) => need(v == null, 'wired in (a thing can\'t be typed into a file)') });
defineType({ name: 'any',      label: 'anything',     colour: '#9a9a9a' });

// Setting-only types: typed into the box, never wired.
defineType({ name: 'curve',   label: 'curve',   wire: false, check: (v) => checkCurve(v) });
defineType({ name: 'choice',  label: 'choice',  wire: false, check: (v, pin) => need(pin.options.includes(v), `one of: ${pin.options.join(', ')}`) });
defineType({ name: 'message', label: 'message', wire: false,
  check: (v, pin, ctx) => (typeof v !== 'string' || !v ? 'should be a message name'
    : ctx.messages[v] ? null : `uses message "${v}", which isn't in piece.json "messages" (known: ${Object.keys(ctx.messages).join(', ') || 'none'})`) });
defineType({ name: 'var', label: 'variable', wire: false,
  check: (v, pin, ctx) => (typeof v !== 'string' || !v ? 'should be a variable name' : ctx.findVar(v) ? null : `uses variable "${v}", which isn't declared on this thing, the scene or the piece`) });
defineType({ name: 'sound', label: 'sound file', wire: false,
  check: (v) => need(typeof v === 'string' && (v === '' || /\.(mp3|ogg|wav|m4a|flac|webm)$/i.test(v)), 'a sound file name from the piece\'s sounds folder, like "rain.mp3"') });
defineType({ name: 'kind', label: 'kind of thing', wire: false,
  check: (v) => need(typeof v === 'string', 'the name of a kind of thing (or "" for any)') });
