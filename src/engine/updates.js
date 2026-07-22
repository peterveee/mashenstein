// Keeps the installed game current.
//
// Registers build/sw.js (see the long note in that file: an iPhone Home Screen
// app will happily relaunch a weeks-old snapshot, and GitHub Pages gives us no
// headers to argue with). Nothing here is user-visible on purpose — the worker
// fetches network-first, so the next cold launch is simply the current build.
// A player mid-run is never interrupted, and a running session is never
// reloaded out from under them.
export function initUpdates() {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) return;
  // Dev builds (the only ones carrying a build stamp) opt out, and evict any
  // worker a previous production build left registered on this origin. The dev
  // server hands out dist/, so without this a `npm run dev` session could be
  // answered by the last worker installed from a real build — technically
  // still network-first and correct, and still one more thing to disbelieve at
  // 2am when a save does not seem to have taken.
  if (typeof window !== 'undefined' && window.__MASH_BUILD__) {
    navigator.serviceWorker.getRegistrations
      && navigator.serviceWorker.getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister())).catch(() => {});
    return;
  }
  // file:// and plain http (other than localhost) have no service workers, and
  // the dev server's dist/ has no sw.js to register. Every one of those throws
  // or rejects, and every one of them means the same thing: play windowed,
  // fetch normally.
  try {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).then((reg) => {
      if (!reg) return;
      // The browser only checks for a new worker on its own schedule (and iOS
      // is the slowest at it), so ask again every time the app comes back to
      // the foreground — which for a Home Screen app is every launch.
      const poke = () => { if (!document.hidden) reg.update().catch(() => {}); };
      document.addEventListener('visibilitychange', poke);
      window.addEventListener('focus', poke);
    }).catch(() => {});
  } catch (e) { /* no worker: the game still runs, it just caches like a page */ }
}
