// Pictures for the renderers: each file is fetched once, then kept with smaller copies (half, quarter, eighth size), so
// far-off cut-outs draw from a small copy instead of shrinking the big one every frame (NAMI's v3.22 phone speed-up).
// get(file) -> { w, h, sized(px) } once loaded, else null (it starts loading). Files that can't be found are listed in
// `missing`, to be said on screen.
export function createPictures(urlFor) {
  const cache = new Map(), missing = new Set();
  function halvings(img) {
    const out = [img];
    while (out.length < 4 && out[out.length - 1].width > 16) {
      const a = out[out.length - 1], c = document.createElement('canvas');
      c.width = Math.ceil(a.width / 2); c.height = Math.ceil(a.height / 2);
      const x = c.getContext('2d');
      x.imageSmoothingQuality = 'high';
      x.drawImage(a, 0, 0, c.width, c.height);
      out.push(c);
    }
    return out;
  }
  return {
    missing,
    get(file) {
      let p = cache.get(file);
      if (p === undefined) {
        cache.set(file, null);
        const img = new Image();
        img.onload = () => {
          const mips = halvings(img);
          // the smallest copy still at least `px` wide (px = how wide it will be drawn, in screen pixels)
          const sized = (px) => { for (let i = mips.length - 1; i > 0; i--) if (mips[i].width >= px) return mips[i]; return mips[0]; };
          cache.set(file, { w: img.naturalWidth, h: img.naturalHeight, sized });
          missing.delete(file);
        };
        img.onerror = () => missing.add(file);
        img.src = urlFor(file);
        return null;
      }
      return p;
    },
  };
}
