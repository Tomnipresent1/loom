// Live link rule (Q5): if two versions of a piece differ only in settings (numbers, colours, curves, per-copy values) or
// in where boxes sit in the editor (and its frames), the change is swapped in live. Anything else (wires, nodes,
// placements) restarts.

export function liveShape(files) {
  const strip = (thing) => ({
    ...thing,
    frames: undefined,
    nodes: Object.fromEntries(Object.entries(thing.nodes || {}).map(([id, n]) => [id, { ...n, set: undefined, at: undefined }])),
  });
  return JSON.stringify({
    piece: { ...files.piece, sounds: undefined, pictures: undefined },   // sound / picture credits: notes, nothing to restart for
    // room / echo, the camera, the colours and the paths: live (read afresh every frame); spacing: the editor's memory
    scene: { ...files.scene, sound: undefined, camera: undefined, ground: undefined, sky: undefined, light: undefined, words: undefined, paths: undefined, spacing: undefined, place: (files.scene.place || []).map((p) => ({ ...p, set: undefined })) },
    things: Object.fromEntries(Object.entries(files.things).map(([k, t]) => [k, strip(t)])),
  });
}

export const canPatchLive = (oldFiles, newFiles) => liveShape(oldFiles) === liveShape(newFiles);
