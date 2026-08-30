// Where the arrangement and the mixer actually are on screen, and how to scroll them.
//
// Lifted out of mixer-entry.js. A measured cache of the arrangement grid's geometry, the
// strip pitch of the mixer rack, and the four scroll routines that read them — the
// playhead follow, the two snap-to-strip scrollers, and the pair that keep the
// arrangement and the rack agreeing with each other.
//
// It needs nothing from the desk at all: every function is handed the element it works
// on, or finds it by id. That is unusual enough here to be worth saying out loud — it is
// why this could leave without a seam.

const $ = (id) => document.getElementById(id);

// A TTL as well as explicit invalidation, because the failure modes are not symmetric.
// A stale geometry does not throw or look broken — it makes the playhead follow the wrong
// place, quietly, until something rebuilds the grid. Every route that changes the layout
// is supposed to call `forgetArrangementGeometry`, and one that is added later and forgets
// to is a bug nobody will connect to this cache. Half a second of staleness costs one
// layout read every half second instead of six every frame, and bounds that bug.
const ARR_GEOM_TTL_MS = 500;
let arrGeom = null;
function forgetArrangementGeometry() { arrGeom = null; }

function measureArrangementGeometry(grid) {
  const bars = grid.querySelector('.arrrow .arrbars');
  return {
    span: grid.scrollWidth - grid.clientWidth,
    clientWidth: grid.clientWidth,
    width: bars ? bars.scrollWidth : grid.scrollWidth,
    inset: bars ? bars.offsetLeft : 0,
  };
}

function followArrangementScroll(frac) {
  const grid = $('arrgrid');
  const upper = $('upperwork');
  if (!grid || upper?.dataset.arrscroll !== '1') return;
  const nowMs = performance.now();
  if (!arrGeom || nowMs - arrGeom.at > ARR_GEOM_TTL_MS) {
    arrGeom = measureArrangementGeometry(grid);
    arrGeom.at = nowMs;
  }
  const { span, clientWidth, width, inset } = arrGeom;
  // Nothing to scroll — a song that fits. KEEP the measurement rather than dropping it:
  // clearing here would re-measure on the very next frame and every frame after, which is
  // exactly the per-frame layout read this cache exists to remove, for the one case where
  // there is no work to do at all. The TTL re-checks soon enough if the grid grows.
  if (span <= 0) return;
  // The playhead's x in the SCROLLER's coordinates, which start at the row's left edge —
  // so the pinned name column counts. Measuring from the first bar instead put the
  // playhead a column further left than it really was, and the view sat still while it
  // walked off the right-hand side.
  const x = inset + Math.max(0, Math.min(1, frac)) * width;
  // And the names are painted OVER the bars they cover, so the visible span starts after
  // them: a playhead behind that edge is on screen and unreadable, which is off screen.
  const scrolled = grid.scrollLeft;
  const left = scrolled + inset;
  const right = scrolled + clientWidth;
  // Behind the view as well as ahead of it: a loop that jumps back to the top should
  // take the window with it rather than leave you looking at the bars it just left.
  if (x >= left && x < right - 4) return;
  const lead = clientWidth * 0.1;
  grid.scrollLeft = Math.max(0, Math.min(span, x - inset - lead));
}

function mixerStripGeometry(rack) {
  const strips = rack.querySelectorAll('.strip');
  if (!strips.length) return null;
  const rackRect = rack.getBoundingClientRect();
  const firstRect = strips[0].getBoundingClientRect();
  const firstStart = firstRect.left - rackRect.left + rack.scrollLeft;
  const step = strips.length > 1
    ? strips[1].getBoundingClientRect().left - firstRect.left
    : (parseFloat(getComputedStyle(strips[0]).width) || 0)
      + (parseFloat(getComputedStyle(rack).columnGap) || 0);
  return step > 0 ? { firstStart, step } : null;
}

function mixerScrollSnapLeft(rack, left) {
  const geometry = mixerStripGeometry(rack);
  if (!geometry) return Math.max(0, left);
  const max = Math.max(0, rack.scrollWidth - rack.clientWidth);
  const target = geometry.firstStart
    + Math.round((left - geometry.firstStart) / geometry.step) * geometry.step;
  return Math.max(0, Math.min(max, Math.round(target)));
}

function snapMixerScroll() {
  const rack = $('rack');
  const rail = $('mixscroll');
  if (!rack || !rail) return;
  const target = mixerScrollSnapLeft(rack, rack.scrollLeft);
  if (Math.abs(rack.scrollLeft - target) > 0.5) {
    rack.scrollTo({ left: target, behavior: 'auto' });
  }
  if (Math.abs(rail.scrollLeft - target) > 0.5) rail.scrollLeft = target;
}

function syncMixerScroll() {
  const rack = $('rack');
  const rail = $('mixscroll');
  const railContent = $('mixscroll-content');
  if (!rack || !rail || !railContent) return;
  const previousLeft = Math.max(0, rack.scrollLeft);
  // The final send needs a trailing strip-width of content when channels overflow:
  // without it the nearest snap point can still leave the last strip a few pixels
  // outside the viewport. Remove the class before measuring so a resize that makes the
  // rack fit can give that space back immediately.
  rack.style.removeProperty('--mixer-tail-pad');
  rack.classList.remove('snap-tail');
  const naturalMax = Math.max(0, rack.scrollWidth - rack.clientWidth);
  if (naturalMax > 1) {
    const geometry = mixerStripGeometry(rack);
    if (geometry) {
      const snapMax = geometry.firstStart
        + Math.ceil(Math.max(0, naturalMax - geometry.firstStart) / geometry.step)
          * geometry.step;
      const baseRight = Number.parseFloat(getComputedStyle(rack).paddingRight) || 0;
      rack.style.setProperty('--mixer-tail-pad', `${Math.round(
        baseRight + Math.max(0, snapMax - naturalMax),
      )}px`);
    }
    rack.classList.add('snap-tail');
  }
  rack.scrollLeft = Math.min(previousLeft, Math.max(0, rack.scrollWidth - rack.clientWidth));
  const styles = getComputedStyle(rack);
  const leftPad = Number.parseFloat(styles.paddingLeft) || 0;
  // The visible rail is a separate scroller with a slightly smaller viewport than the
  // hidden rack. Match MAX scroll positions directly so any conditional rack tail is
  // represented in the rail as well, rather than subtracting the rack's current padding
  // and silently losing the new end space.
  const width = Math.max(1, Math.round(rack.scrollWidth - leftPad
    - rack.clientWidth + rail.clientWidth));
  railContent.style.width = `${width}px`;
  rail.scrollLeft = Math.max(0, rack.scrollLeft);
  if (rack.dataset.scrollBound !== '1') {
    rack.dataset.scrollBound = '1';
    rack.addEventListener('scroll', () => {
      const x = Math.max(0, rack.scrollLeft);
      if (Math.abs(rail.scrollLeft - x) > 0.5) rail.scrollLeft = x;
    }, { passive: true });
    rack.addEventListener('scrollend', snapMixerScroll, { passive: true });
  }
  if (rail.dataset.scrollBound === '1') return;
  rail.dataset.scrollBound = '1';
  rail.addEventListener('scroll', () => {
    if (Math.abs(rack.scrollLeft - rail.scrollLeft) > 0.5) {
      rack.scrollLeft = rail.scrollLeft;
    }
  }, { passive: true });
  rail.addEventListener('scrollend', snapMixerScroll, { passive: true });
}

function syncArrangementScroll() {
  const grid = $('arrgrid');
  const upper = $('upperwork');
  const rail = $('arrscroll');
  const railContent = $('arrscroll-content');
  if (!grid || !upper || !rail || !railContent) return;
  const bars = grid.querySelector('.arrrow .arrbars');
  const width = bars ? Math.round(bars.scrollWidth) : 0;
  // Only when the rows genuinely want more than they have. A song that fits keeps the
  // behaviour it always had: bars stretched across the window, no scrollbar to reach for.
  const scrolls = width > 0 && grid.scrollWidth > grid.clientWidth + 1;
  upper.dataset.arrscroll = scrolls ? '1' : '0';
  upper.style.setProperty('--arr-content-w', `${width}px`);
  railContent.style.width = `${Math.max(1, width)}px`;
  rail.scrollLeft = Math.max(0, grid.scrollLeft);
  if (!scrolls) upper.style.setProperty('--arr-scroll', '0px');
  else upper.style.setProperty('--arr-scroll', `${Math.round(grid.scrollLeft)}px`);
  if (grid.dataset.scrollBound !== '1') {
    grid.dataset.scrollBound = '1';
    grid.addEventListener('scroll', () => {
      const x = Math.max(0, grid.scrollLeft);
      if (Math.abs(rail.scrollLeft - x) > 0.5) rail.scrollLeft = x;
      upper.style.setProperty('--arr-scroll', `${Math.round(x)}px`);
    }, { passive: true });
  }
  if (rail.dataset.scrollBound === '1') return;
  rail.dataset.scrollBound = '1';
  rail.addEventListener('scroll', () => {
    if (Math.abs(grid.scrollLeft - rail.scrollLeft) > 0.5) {
      grid.scrollLeft = rail.scrollLeft;
    }
  }, { passive: true });
}

export {
  forgetArrangementGeometry, followArrangementScroll, syncMixerScroll, syncArrangementScroll,
};
