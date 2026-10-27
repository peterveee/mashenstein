// WINDOWS 3.1 ON ONE CUBICLE MONITOR, while office-2's ta-da plays (Peter, 26 Oct: "one monitor
// around there to look like it's running Windows 3 or 3.1 ... there must be a combo of colours
// that screams Windows 3.1"). The screen is 10.8 x 9 logical px, so it is a handful of flat
// blocks in the 16-colour EGA palette the era ran in: the sky-blue start-up splash with its
// four-colour flag for the "ta", then a teal desktop with a grey Program Manager under a navy
// title bar, white menu strip and a grid of bright group icons for the "da".
import { box, hash } from './line.js';
import { MID_BASE } from '../officeClimb.js';

// where a desk's monitor stands: the same draw as room.js cubiclesBack, whose `h(1)` this is
export function deskMonitorX(d) {
  return d.x + 14 + hash(d.seed * 7.31 + 1) * 10;
}

// whether a desk's monitor has crashed to the blue screen: room.js draws it (and only at an empty
// desk), and the ta-da's Windows monitor must NOT be one — it starts as a green terminal
// (Peter, 26 Oct), so the one place both have to agree is here
export function deskBlueScreen(d) {
  return !d.occupied && hash(d.seed * 7.31 + 11) < 0.45;
}

export const WIN31_SPLASH_SEC = 0.16;   // the "ta": the splash gives way to the desktop with the "da"
export const WIN31_HOLD_SEC = 3.0;      // then the desktop stays, and the monitor returns to itself
const FADE = 0.3;

const SKY = '#5aa0e8', CLOUD = '#ffffff', TEAL = '#008080', GREY = '#c0c0c0', NAVY = '#000080';
const ICONS = ['#ffff55', '#ff5555', '#55ffff', '#55ff55', '#ff55ff', '#ffff55'];

export function paintWin31Screen(g, mx, tadaT, ink = '#1d1b26') {
  if (!(tadaT >= 0) || tadaT > WIN31_HOLD_SEC + FADE) return;
  const b = MID_BASE, sx = mx - 5.4, sy = b - 44.4, w = 10.8, h = 9;
  g.save();
  g.globalAlpha *= tadaT > WIN31_HOLD_SEC ? 1 - (tadaT - WIN31_HOLD_SEC) / FADE : 1;
  // a faint cyan spill round the glass: the screen is brighter than the room
  g.fillStyle = 'rgba(85,255,255,0.16)';
  g.fillRect(sx - 1.6, sy - 1.6, w + 3.2, h + 3.2);
  if (tadaT < WIN31_SPLASH_SEC) {
    box(g, sx, sy, w, h, SKY, ink, 0.35);
    g.fillStyle = CLOUD;
    g.fillRect(sx + 0.8, sy + 6.6, 4.4, 1.2);
    g.fillRect(sx + 4.2, sy + 7.2, 4.8, 1.0);
    g.fillRect(sx + 7, sy + 6.2, 2.6, 1.3);
    // the flag: red, green, blue and yellow panes, waving a little
    const fx = sx + 3.5, fy = sy + 1.6;
    g.fillStyle = '#ff3b30'; g.fillRect(fx, fy, 1.8, 1.7);
    g.fillStyle = '#34c759'; g.fillRect(fx + 2.0, fy + 0.3, 1.8, 1.7);
    g.fillStyle = '#0a60ff'; g.fillRect(fx, fy + 1.9, 1.8, 1.7);
    g.fillStyle = '#ffd60a'; g.fillRect(fx + 2.0, fy + 2.2, 1.8, 1.7);
  } else {
    box(g, sx, sy, w, h, TEAL, ink, 0.35);
    // Program Manager: grey window, navy title bar with its control box and a white title
    box(g, sx + 0.9, sy + 0.9, w - 1.8, h - 1.8, GREY, '#000000', 0.3);
    g.fillStyle = NAVY; g.fillRect(sx + 1.2, sy + 1.2, w - 2.4, 1.5);
    g.fillStyle = GREY; g.fillRect(sx + 1.3, sy + 1.3, 1.1, 1.3);
    g.fillStyle = '#000000'; g.fillRect(sx + 1.5, sy + 1.8, 0.7, 0.3);
    g.fillStyle = '#ffffff'; g.fillRect(sx + 3.1, sy + 1.75, 3.6, 0.4);
    // menu strip, white, with a few black words
    g.fillStyle = '#ffffff'; g.fillRect(sx + 1.2, sy + 2.8, w - 2.4, 0.9);
    g.fillStyle = '#000000'; g.fillRect(sx + 1.5, sy + 3.1, 1.2, 0.3); g.fillRect(sx + 3.1, sy + 3.1, 1.2, 0.3); g.fillRect(sx + 4.7, sy + 3.1, 1.2, 0.3);
    // the group icons: two rows of three in EGA brights, each on a black outline
    ICONS.forEach((c, i) => {
      const ix = sx + 1.7 + (i % 3) * 2.6, iy = sy + 4.1 + Math.floor(i / 3) * 1.9;
      g.fillStyle = '#000000'; g.fillRect(ix, iy, 1.8, 1.5);
      g.fillStyle = c; g.fillRect(ix + 0.3, iy + 0.3, 1.2, 0.9);
    });
  }
  g.restore();
}
