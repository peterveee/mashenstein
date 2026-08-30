// The desk's tooltips, and the card-placer they share with the tour.
//
// Lifted out of mixer-entry.js whole: nothing in here reaches into the desk's state, so
// it needed no arguments to leave — only `$`, which is one line of DOM. `placeCard` is
// the half the tour also wants, and mixer-entry already hands it to createTutorial
// rather than letting the tour reach for it; it is exported here for that same call
// site.
//
// One card for the whole page, filled and moved on hover. Any element carrying
// `data-tip` gets one: the name goes in bold, `data-tipkey` becomes the key chip beside
// it, and `data-tipsays` is the sentence underneath — which is the only reason to have
// built this rather than leave the browser's `title` doing it. A row of icon buttons is
// exactly the case a one-line grey system tooltip cannot serve: the picture is the label,
// so the tooltip has to carry both the name AND what the thing is for.
//
// Never both: an element with `data-tip` must not also have a `title`, or the OS draws
// its own on top a second later.

const $ = (id) => document.getElementById(id);

// its own on top a second later.
const TIP_DELAY = 340;         // long enough that crossing the row does not flash six cards
let tipTimer = null;
let tipTarget = null;

function hideTip() {
  clearTimeout(tipTimer);
  tipTimer = null;
  tipTarget = null;
  $('tip').classList.remove('show', 'in');
}

/**
 * Put a floating card beside the thing it is about, and aim its arrow at that thing.
 *
 * Shared by the tooltip and the tour, because both have the same two problems and the
 * same two answers. The card is sized by its own sentence, so whether it fits below the
 * anchor cannot be known until it is in the page and measured — hence `show` before
 * place, never after. And the card is clamped to the window while the anchor is not, so
 * at the ends of a row the two stop agreeing about where the middle is: the arrow
 * follows the ANCHOR, because a point aimed at the centre of a card that had to move is
 * a point aimed at nothing.
 *
 * `prefer: 'side'` moves it out to the left or right instead. A tooltip never needs this
 * — it is two lines under a toolbar button and gone again — but a card that stays up
 * while you read four lines of it will lie straight over a channel strip, which is the
 * one thing on the desk it was pointing at. Beside, the strip is still readable. It
 * falls back to above/below when there is no room either side.
 */
export function placeCard(card, el, arrow, { gap = 9, edge = 6, inset = 11, prefer = 'below' } = {}) {
  const r = el.getBoundingClientRect();
  const box = card.getBoundingClientRect();
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, hi));

  // Beside the anchor, on whichever flank it fits. Pulled out of the `prefer` branch
  // because it is also the ANSWER TO A TALL ANCHOR: the effect catalogue is most of the
  // window high, so neither above nor below it fits, and the vertical placement below
  // would have run off the top of the screen with the card on it.
  const trySide = () => {
    const right = r.right + gap;
    const leftSide = r.left - gap - box.width;
    const at = right + box.width <= innerWidth - edge ? right
      : leftSide >= edge ? leftSide
        : null;
    if (at !== null) {
      const top = clamp(r.top + r.height / 2 - box.height / 2, edge,
        innerHeight - box.height - edge);
      card.style.left = `${Math.round(at)}px`;
      card.style.top = `${Math.round(top)}px`;
      if (arrow) {
        // The side arrows are the same rotated square wearing a different pair of the
        // card's borders — see the `.tutarrow.beside` rules.
        arrow.classList.remove('under');
        arrow.classList.add('beside');
        arrow.classList.toggle('after', at === leftSide);
        arrow.style.left = '';
        arrow.style.top = `${Math.round(
          clamp(r.top + r.height / 2 - top, inset, box.height - inset) - 4.5)}px`;
      }
      return true;
    }
    return false;
  };

  if (prefer === 'side' && trySide()) return true;

  const below = r.bottom + gap + box.height <= innerHeight - edge;
  const above = r.top - gap - box.height >= edge;
  // Neither end of the anchor has room for the card. Beside it is a real answer and
  // off the top of the window is not, so ask for the flank before falling through.
  if (!below && !above && prefer !== 'side' && trySide()) return true;
  const left = clamp(r.left + r.width / 2 - box.width / 2, edge, innerWidth - box.width - edge);
  // Clamped for the same reason `left` always was, and it was the one axis that was not:
  // a card whose top went negative did not merely overhang, it took its Back and Next
  // buttons off the screen with it and the tour could not be advanced.
  const top = clamp(below ? r.bottom + gap : r.top - gap - box.height,
    edge, Math.max(edge, innerHeight - box.height - edge));
  card.style.left = `${Math.round(left)}px`;
  card.style.top = `${Math.round(top)}px`;
  if (!arrow) return below;
  arrow.classList.remove('beside', 'after');
  arrow.style.top = '';
  arrow.classList.toggle('under', !below);
  const at = clamp(r.left + r.width / 2 - left, inset, box.width - inset);
  arrow.style.left = `${Math.round(at - 4.5)}px`;
  return below;
}

function showTip(el) {
  const tip = $('tip');
  tip.textContent = '';
  tip.classList.toggle('bartip', el.dataset.tipkind === 'bar');
  tip.classList.toggle('tracktip', el.dataset.tipkind === 'track');
  const head = document.createElement('div');
  head.className = 'tiphead';
  const name = document.createElement('span');
  name.className = 'tipname';
  name.textContent = el.dataset.tip;
  head.append(name);
  if (el.dataset.tipkey) {
    const key = document.createElement('kbd');
    key.className = 'tipkey';
    key.textContent = el.dataset.tipkey;
    head.append(key);
  }
  tip.append(head);
  if (el.dataset.tipcontext) {
    const context = document.createElement('div');
    context.className = 'tipcontext';
    context.textContent = el.dataset.tipcontext;
    tip.append(context);
  }
  if (el.dataset.tipsays) {
    const says = document.createElement('div');
    says.className = 'tipsays';
    says.textContent = el.dataset.tipsays;
    tip.append(says);
  }
  if (el.dataset.tipgroups) {
    let groups = [];
    try { groups = JSON.parse(el.dataset.tipgroups); } catch { groups = []; }
    const body = document.createElement('div');
    body.className = 'tipgroups';
    for (const group of groups) {
      const row = document.createElement('div');
      row.className = 'tipgroup';
      const label = document.createElement('div');
      label.className = 'tipgroup-label';
      label.textContent = group.label || '';
      const values = document.createElement('div');
      values.className = 'tipgroup-values';
      if (group.context) {
        const source = document.createElement('span');
        source.className = 'tipgroup-context';
        source.textContent = group.context;
        values.append(source);
      }
      for (const item of group.items || []) {
        const chip = document.createElement('span');
        chip.className = `tipchip${item.tone ? ` ${item.tone}` : ''}`;
        chip.textContent = item.text || '';
        values.append(chip);
      }
      row.append(label, values);
      body.append(row);
    }
    tip.append(body);
  }
  if (el.dataset.tiphints) {
    const foot = document.createElement('div');
    foot.className = 'tipfoot';
    let hints = [];
    try { hints = JSON.parse(el.dataset.tiphints); } catch { hints = []; }
    for (const hint of hints) {
      const item = document.createElement('span');
      item.className = 'tiphint';
      const key = document.createElement('kbd');
      key.textContent = hint.key || '';
      const action = document.createElement('span');
      action.textContent = hint.text || '';
      item.append(key, action);
      foot.append(item);
    }
    tip.append(foot);
  }
  const arrow = document.createElement('span');
  arrow.className = 'tiparrow';
  tip.append(arrow);

  // Shown first, then placed — see placeCard for why the order matters.
  tip.classList.add('show');
  placeCard(tip, el, arrow);
  requestAnimationFrame(() => tip.classList.add('in'));
}

/**
 * Put the page's one card on the page's own pointer and focus, and keep it honest.
 *
 * The listeners were bare statements while this lived in mixer-entry, so they ran when
 * the file did. Called once from the desk's wiring instead, which is where every other
 * global hook on this desk is installed.
 */
export function installTooltips() {
  addEventListener('pointerover', (ev) => {
    const el = ev.target.closest?.('[data-tip]') || null;
    if (el === tipTarget) return;
    hideTip();
    if (!el) return;
    tipTarget = el;
    tipTimer = setTimeout(() => { if (tipTarget === el) showTip(el); }, TIP_DELAY);
  });
  // Reached by keyboard, the tip is the only label there is — the buttons are pictures — so
  // it comes up at once rather than after a delay meant to keep a moving pointer quiet.
  addEventListener('focusin', (ev) => {
    const el = ev.target.closest?.('[data-tip]');
    if (!el || !el.matches(':focus-visible')) return;
    hideTip();
    tipTarget = el;
    showTip(el);
  });
  addEventListener('focusout', hideTip);
  // Capture, so the card is gone before the click it belongs to opens a panel underneath it.
  addEventListener('pointerdown', hideTip, true);
  addEventListener('keydown', hideTip, true);
  addEventListener('scroll', hideTip, true);
  addEventListener('blur', hideTip);
}
