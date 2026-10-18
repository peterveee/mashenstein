import { CABINET_STYLES } from '../sprites/arcade.js';

const BASE = CABINET_STYLES.chibi;

function candidate({ id, label, note, screen, accent }) {
  const box = { ...BASE.box, screen: { ...screen } };
  const style = {
    ...BASE,
    box,
    paint(ctx, w, h, pal, opts = {}) {
      return BASE.paint(ctx, w, h, pal, {
        ...opts,
        monitorBox: box,
        monitorAccent: accent,
      });
    },
  };
  return { id, label, note, style };
}

const BEFORE_SCREEN = { x0: 0.14, x1: 0.86, y0: 0.283, y1: 0.567 };
const PREVIOUS_SCREEN = { x0: 0.115, x1: 0.885, y0: 0.278, y1: 0.572 };
const CURRENT_SCREEN = { x0: 0.125, x1: 0.875, y0: 0.285, y1: 0.565 };
const NEAR_FLUSH_SCREEN = { x0: 0.11, x1: 0.89, y0: 0.285, y1: 0.565 };

export const FOOD_COURT_MONITOR_CANDIDATES = [
  candidate({
    id: 'before', label: 'BEFORE — WIDE RIGHT EDGE',
    note: 'Original narrow glass with the full-width bright side tab.',
    screen: BEFORE_SCREEN,
    accent: { x: 0.855, width: 0.08, blend: 0 },
  }),
  candidate({
    id: 'now', label: 'NOW — PREVIOUS OPENING',
    note: 'Previous screen opening with the remaining right edge strip.',
    screen: PREVIOUS_SCREEN,
    accent: { x: 0.885, width: 0.03, blend: 0 },
  }),
  candidate({
    id: 'a', label: 'A — NO TAB · SMALLER, CENTERED',
    note: 'Selected: smaller glass centered in its bezel, with a clear gap above the deck.',
    screen: CURRENT_SCREEN,
    accent: null,
  }),
  candidate({
    id: 'b', label: 'B — WIDER GLASS · NO TAB',
    note: 'Comparison only: a near-flush side rim, with the same vertical size and placement.',
    screen: NEAR_FLUSH_SCREEN,
    accent: null,
  }),
  candidate({
    id: 'c', label: 'C — SOFT SIDE TAB',
    note: 'Comparison only: adds a subtle right-side strip to the centered glass.',
    screen: CURRENT_SCREEN,
    accent: { x: 0.885, width: 0.03, blend: 0.58 },
  }),
];
