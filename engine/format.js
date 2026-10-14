// File-format versions. Every piece file carries "format": N. When the format changes, FORMAT goes up by one and a
// migration is added that upgrades a file from the old shape to the new one, so old pieces always keep loading.

export const FORMAT = 1;

// MIGRATIONS[n] upgrades a file from format n to n + 1: (file) => file. (None yet: format 1 is the first.)
export const MIGRATIONS = [];

export class LoadProblem extends Error {}

export function migrate(file, where, migrations = MIGRATIONS, current = FORMAT) {
  if (!file || typeof file !== 'object' || Array.isArray(file)) throw new LoadProblem(`${where}: isn't a JSON object`);
  let v = file.format;
  if (!Number.isInteger(v) || v < 1) throw new LoadProblem(`${where}: has no "format" number`);
  if (v > current) throw new LoadProblem(`${where}: is format ${v}, newer than this engine understands (${current})`);
  while (v < current) {
    const up = migrations[v];
    if (!up) throw new LoadProblem(`${where}: no migration from format ${v} to ${v + 1}`);
    file = up(structuredClone(file));
    v++;
    file.format = v;
  }
  return file;
}
