// Preset windows share a bounded layer below dialogs (71) and dropdowns (72).
// Raising never reparents a live editor or grows its z-index past those overlays.
const wired = new WeakSet();

export function bringPresetWindowToFront(element) {
  element.dataset.presetWindow = '';
  const peers = [...element.ownerDocument.querySelectorAll('[data-preset-window]')]
    .filter((peer) => peer !== element)
    .sort((a, b) => Number(a.style.zIndex || 69) - Number(b.style.zIndex || 69));
  peers.push(element);
  // Keep the previous front window immediately behind this one. Putting every
  // inactive peer on the same layer would restore DOM order and bury the selector.
  peers.forEach((peer, index) => { peer.style.zIndex = String(71 - peers.length + index); });
}

export function registerPresetWindow(element) {
  if (wired.has(element)) return;
  wired.add(element);
  element.dataset.presetWindow = '';
  // Capture: pots and dropdowns often stop bubbling to protect their gestures.
  element.addEventListener('pointerdown', () => bringPresetWindowToFront(element), true);
  element.addEventListener('focusin', () => bringPresetWindowToFront(element));
}
