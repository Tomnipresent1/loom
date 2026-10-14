// The phone's end of the live link: listen to the server's /live line and pass on which file changed.
// Phones drop the line (out of Wi-Fi, screen locked, tab in the background), and while it's down they miss changes.
// So: if nothing (not even the server's "still here" ping) has been heard for a while, open a fresh line; and whenever
// the line comes back, or the page is looked at again, ask to catch up (onResync) on anything missed.
// When the piece is played without our server (a published copy), there is no line and this quietly does nothing.
const QUIET = 45000;                                         // the server pings every 20 s

export function connectLive(onFile, onResync = () => {}) {
  if (typeof EventSource === 'undefined') return;
  let es = null, heard = Date.now(), dropped = false;
  const open = () => {
    if (es) es.close();
    es = new EventSource('live');
    es.onopen = () => { heard = Date.now(); if (dropped) { dropped = false; onResync(); } };
    es.onmessage = (e) => {
      heard = Date.now();
      let msg = {};
      try { msg = JSON.parse(e.data); } catch {}
      if (msg.file) onFile(msg.file);
    };
    es.onerror = () => { dropped = true; };                 // the browser retries by itself; we catch up when it's back
  };
  open();
  setInterval(() => { if (es.readyState === EventSource.CLOSED || Date.now() - heard > QUIET) { dropped = true; open(); } }, 10000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    if (es.readyState === EventSource.OPEN) onResync(); else { dropped = true; open(); }
  });
}
