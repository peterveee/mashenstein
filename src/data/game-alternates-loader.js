// Shared by main.js (the ?alt= dev URL param) and src/dev/menus.js (the GAME
// ALTERNATES audition menu) — the only two consumers of the generated,
// ~14MB game-alternates.js. Neither can import it directly without pulling
// that weight into the boot-critical bundle; see data/game-alternates-lazy.js
// and build.js's gameAlternates entry for how it ships as its own file.
let _gameAlternates = null;
let _gameAlternatesPromise = null;
export function loadGameAlternatesModule() {
  if (_gameAlternates) return Promise.resolve(_gameAlternates);
  if (!_gameAlternatesPromise) {
    _gameAlternatesPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL('./gameAlternates.js', document.baseURI).href;
      script.onload = () => {
        if (window.__mash_game_alternates) { _gameAlternates = window.__mash_game_alternates; resolve(_gameAlternates); }
        else reject(new Error('gameAlternates.js loaded but did not set window.__mash_game_alternates'));
      };
      script.onerror = () => reject(new Error('gameAlternates.js failed to load'));
      document.body.appendChild(script);
    });
  }
  return _gameAlternatesPromise;
}
// Already-resolved data, or null while it is still loading/not yet requested
// — for callers like the dev menu that need to render something synchronously
// on the very first call and refresh once the real list is in.
export function gameAlternatesIfLoaded() {
  return _gameAlternates;
}
