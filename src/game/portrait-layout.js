// Portrait gameplay HUD geometry.  This module is deliberately DOM-free: the
// renderer publishes a logical portrait frame, and the HUD uses the same
// safe-area math on every phone size.  Landscape keeps its existing geometry.

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
// Safe-area insets describe the physical status/notch region, but the first
// readable HUD ink should not start immediately below that boundary. Reserve a
// second, authored breathing band so the rail and status plate cannot feel
// glued to a Dynamic Island, browser chrome, or an unusually tall status bar.
export const PORTRAIT_HUD_TOP_CLEARANCE_CSS = 28;
let cachedKey = '';
let cachedLayout = null;

/**
 * Return the logical portrait HUD bands.  `frame.scale` converts logical
 * pixels to CSS pixels, so the margins and minimum text sizes below stay
 * meaningful on both small and large phones.
 */
export function portraitHudLayout(frame) {
  const scale = Number.isFinite(frame?.scale) && frame.scale > 0 ? frame.scale : 1;
  const safe = frame?.safeRect || { left: 0, top: 0, right: 480, bottom: 270 };
  const key = [frame?.revision ?? -1, scale, safe.left, safe.top, safe.right, safe.bottom].join('|');
  if (key === cachedKey && cachedLayout) return cachedLayout;
  const css = (px) => px / scale;
  const safeWidth = Number.isFinite(safe.width) ? safe.width : Math.max(0, safe.right - safe.left);
  const margin = css(12);
  const gap = css(8);
  // The progress rail is the one HUD element allowed to use the entire safe
  // width. Eight CSS pixels keeps it readable as a timeline instead of a hairline
  // while the panels below retain their inset, centered column.
  const railH = css(8);
  const railY = safe.top + css(PORTRAIT_HUD_TOP_CLEARANCE_CSS);
  // The landscape HUD's glyphs are about 6 logical px high.  This scale makes
  // the primary portrait ink roughly 12–13 CSS px without letting the panels
  // consume the whole safe frame on a narrow phone.
  const panelScale = clamp(13 / (6 * scale), 2.15, 2.8);
  const statusY = railY + railH + css(8);
  const statusH = 18 * panelScale;
  const goalY = statusY + statusH + gap;
  const goalH = 18 * panelScale;
  const bonusY = goalY + goalH + gap;
  const bonusScale = Math.max(0.9, panelScale * 0.9);
  // drawObjectivePanel receives `bonusScale` as its text scale, but uses its
  // full 18px row whenever that scale is >= 1.  Keep the resolver's band
  // measured from the painter's actual panel height rather than from the
  // smaller glyph scale, otherwise the chatter row can sit inside BONUS on
  // the smallest phones.
  const bonusH = 12 * panelScale;
  const rhythmY = bonusY + bonusH + css(12);
  const rhythmH = css(18);
  const chatterY = rhythmY + rhythmH + css(12);
  const floatieY = chatterY + css(72);
  // The ability/power names belong under the large action discs on portrait.
  // Use a compact bottom strip so the labels fit between the disc bottoms and
  // the reported home-indicator safe edge without competing with the world.
  const actionLabelScale = Math.max(1.55, Math.min(1.9, panelScale * 0.68));
  const actionY = safe.bottom - 7 * actionLabelScale - css(2);
  cachedLayout = Object.freeze({
    scale,
    panelScale,
    margin,
    gap,
    left: safe.left + margin,
    right: safe.right - margin,
    center: (safe.left + safe.right) / 2,
    railLeft: safe.left,
    railRight: safe.right,
    railY,
    railH,
    statusY,
    statusH,
    goalY,
    goalH,
    bonusY,
    bonusH,
    bonusScale,
    rhythmY,
    rhythmH,
    chatterY,
    floatieY,
    actionLabelScale,
    actionY,
    chatterWidth: Math.max(css(180), safeWidth - margin * 2),
  });
  cachedKey = key;
  return cachedLayout;
}
