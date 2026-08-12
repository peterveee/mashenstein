// BREAKER BOX minigames: 4 tiny genre parodies. Shared framework: 35s timer,
// success/fail reported to onEnd. Skippable via ESC or the SKIP button (counts
// as no-bonus, not as a mocked failure). Touch-first devices bypass them
// entirely upstream
// (Flow.openCabinet / ArcadeState) — they are too finicky without a keyboard.
import { W, H } from '../../engine/renderer.js';
import { Input } from '../../engine/input.js';
import { Audio } from '../../engine/audio.js';
import { drawText, drawTextCentered, getSprite } from '../../engine/sprites.js';
import { drawProp } from '../../sprites/props.js';
import { Rng } from '../../engine/rng.js';

export const MINIGAMES = ['blocksurge', 'paddlewar', 'mashinvaders', 'brickbonk'];
export const MINIGAME_NAMES = {
  blocksurge: 'BLOCK SURGE',
  paddlewar: 'PADDLE WAR', mashinvaders: 'MASH INVADERS', brickbonk: 'BRICK BONK',
};

export class MinigameState {
  // opts: {game, seed, onEnd(success), settings}
  constructor(opts) { this.o = opts; }

  enter() {
    Input.setContext('minigame');
    this.game = makeGame(this.o.game, new Rng(this.o.seed ?? 1), this.o.settings || {});
    this.timer = 35;
    this.result = null;
    this.resultT = 0;
    this.reported = false;
    this.skipped = false;
    Audio.setBank(null);
    const buttons = this.game.buttons ? this.game.buttons() : [
      { id: 'left', x: 8, y: H - 52, w: 40, h: 40, action: 'left', label: '<' },
      { id: 'right', x: 56, y: H - 52, w: 40, h: 40, action: 'right', label: '>' },
      { id: 'jump', x: W - 96, y: H - 52, w: 40, h: 40, action: 'jump', label: 'A' },
      { id: 'duck', x: W - 48, y: H - 52, w: 40, h: 40, action: 'duck', label: 'B' },
    ];
    buttons.push({ id: 'skip', x: W - 52, y: 6, w: 44, h: 16, action: 'back', label: 'SKIP' });
    Input.setButtons(buttons);
  }

  exit() { Input.setContext('default'); Input.setButtons([]); }

  update(dt) {
    if (this.result != null) {
      this.resultT += dt;
      if (!this.reported && (this.resultT > 0.8 || Input.pressed('confirm') || Input.pressed('jump') || Input.pressed('back'))) {
        this.reported = true;
        this.o.onEnd(this.result);
      }
      Input.endFrame();
      return;
    }
    if (Input.pressed('back')) { // ESC maps to back outside the 'run' context
      this.result = false;
      this.skipped = true;
      this.resultT = 0;
      Audio.sfx('uiBad');
      Input.endFrame();
      return;
    }
    this.timer -= dt;
    const status = this.game.update(dt, Input);
    if (status === true || status === false) {
      this.result = status;
      Audio.sfx(status ? 'win' : 'lose');
    } else if (this.timer <= 0) {
      this.result = false;
      Audio.sfx('lose');
    }
    Input.endFrame();
  }

  draw(ctx) {
    ctx.fillStyle = '#101018';
    ctx.fillRect(0, 0, W, H);
    // breaker-box frame
    ctx.strokeStyle = '#48e0c8';
    ctx.strokeRect(4.5, 4.5, W - 9, H - 9);
    drawTextCentered(ctx, `BREAKER BOX: ${MINIGAME_NAMES[this.o.game]}`, W / 2, 10, '#48e0c8');
    // timer bar
    const tmax = 35;
    ctx.fillStyle = '#20242c';
    ctx.fillRect(40, 22, W - 80, 4);
    ctx.fillStyle = this.timer < 6 ? '#e04848' : '#f6d33c';
    ctx.fillRect(40, 22, (W - 80) * Math.max(0, this.timer / tmax), 4);
    this.game.draw(ctx);
    if (this.result != null) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, H / 2 - 24, W, 48);
      const title = this.result ? 'POWER RESTORED' : this.skipped ? 'SKIPPED. THE BREAKER SHRUGS.' : 'THE BREAKER REMAINS UNIMPRESSED';
      drawTextCentered(ctx, title, W / 2, H / 2 - 8, this.result ? '#48c848' : this.skipped ? '#f6d33c' : '#e04848', 1);
      if (this.skipped) drawTextCentered(ctx, 'FINE. WE WILL POWER IT THE BORING WAY.', W / 2, H / 2 + 6, '#8a8a98');
      else if (!this.result) drawTextCentered(ctx, 'A CHILD COULD REWIRE THAT. A CHILD.', W / 2, H / 2 + 6, '#8a8a98');
      else if (this.o.bonusText) drawTextCentered(ctx, this.o.bonusText, W / 2, H / 2 + 6, '#f6d33c');
    }
    // touch buttons (SKIP reads as amber so it isn't mistaken for a d-pad key)
    for (const b of Input.buttons) {
      const skip = b.id === 'skip';
      ctx.fillStyle = skip ? 'rgba(246,211,60,0.12)' : 'rgba(72,224,200,0.12)';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      drawTextCentered(ctx, b.label, b.x + b.w / 2, b.y + b.h / 2 - 3, skip ? '#f6d33c' : '#48e0c8');
    }
    // isTouchDevice(), not usingTouch: the breaker box can open before a finger
    // has landed this run, and the SKIP plate beside it already says it better.
    if (!Input.isTouchDevice()) drawText(ctx, 'ESC SKIP', 8, 12, '#5a5a68');
  }
}

function makeGame(id, rng, settings) {
  switch (id) {
    case 'blocksurge': return blockSurge(rng);
    case 'paddlewar': return paddleWar(rng);
    case 'mashinvaders': return mashInvaders(rng);
    case 'brickbonk': return brickBonk(rng);
    default: return blockSurge(rng);
  }
}

// --- BLOCK SURGE: falling MASH-ominoes (deliberately NOT the classic seven) --
const MASHOMINOES = [
  [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]],       // plus
  [[0, 0], [1, 0], [0, 1], [1, 1], [2, 1]],          // 2x2 with a nub
  [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]],          // W-bend
  [[-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0]],        // 1x5 plank
  [[-1, -1], [-1, 0], [0, 0], [1, 0], [1, -1]],      // U
  [[0, 0], [0, 1], [1, 1]],                          // small L (3 cells, mercy piece)
];
function blockSurge(rng) {
  const COLS = 7, ROWS = 10, CS = 14;
  const ox = W / 2 - (COLS * CS) / 2, oy = 40;
  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  let piece = null, px = 3, py = 0, rot = 0, dropT = 0, lines = 0, fallSpeed = 0.55;
  function cells() {
    return piece.map(([cx, cy]) => {
      let x = cx, y = cy;
      for (let r = 0; r < rot % 4; r++) { const t = x; x = -y; y = t; }
      return [px + x, py + y];
    });
  }
  function fits(dx = 0, dy = 0, dr = 0) {
    const saveR = rot; rot += dr;
    const ok = cells().every(([x, y]) => x + dx >= 0 && x + dx < COLS && y + dy < ROWS && (y + dy < 0 || !grid[y + dy][x + dx]));
    rot = saveR;
    return ok;
  }
  function spawn() { piece = rng.pick(MASHOMINOES); px = 3; py = 0; rot = 0; if (!fits()) return false; return true; }
  spawn();
  return {
    update(dt, input) {
      if (input.pressed('left') && fits(-1, 0)) px--;
      if (input.pressed('right') && fits(1, 0)) px++;
      if (input.pressed('jump') && fits(0, 0, 1)) { rot++; Audio.sfx('ui'); }
      dropT += dt * (input.held('duck') ? 6 : 1);
      if (dropT > fallSpeed) {
        dropT = 0;
        if (fits(0, 1)) py++;
        else {
          for (const [x, y] of cells()) if (y >= 0 && y < ROWS) grid[y][x] = 1;
          for (let y = ROWS - 1; y >= 0; y--) {
            if (grid[y].every((v) => v)) {
              grid.splice(y, 1);
              grid.unshift(Array(COLS).fill(0));
              lines++; y++;
              Audio.sfx('coin');
            }
          }
          if (lines >= 2) return true;
          if (!spawn()) return false;
        }
      }
    },
    draw(ctx) {
      drawTextCentered(ctx, `CLEAR 2 LINES: ${lines}/2`, W / 2, 30, '#c8e0ff');
      ctx.strokeStyle = '#48e0c8';
      ctx.strokeRect(ox - 1.5, oy - 1.5, COLS * CS + 3, ROWS * CS + 3);
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        if (grid[y][x]) { ctx.fillStyle = '#8858c8'; ctx.fillRect(ox + x * CS, oy + y * CS, CS - 1, CS - 1); }
      }
      if (piece) {
        ctx.fillStyle = '#f6d33c';
        for (const [x, y] of cells()) if (y >= 0) ctx.fillRect(ox + x * CS, oy + y * CS, CS - 1, CS - 1);
      }
      drawText(ctx, 'THESE ARE NOT THE', ox + COLS * CS + 12, 60, '#5a5a68');
      drawText(ctx, 'SHAPES YOU KNOW.', ox + COLS * CS + 12, 70, '#5a5a68');
      drawText(ctx, 'LEGALLY.', ox + COLS * CS + 12, 80, '#5a5a68');
    },
  };
}

// --- PADDLE WAR: one-point pong vs Eggshell ---------------------------------
function paddleWar(rng) {
  const py0 = 60, py1 = H - 60;
  let my = H / 2, ey = H / 2;
  let bx = W / 2, by = H / 2, bvx = 120 * (rng.chance(0.5) ? 1 : -1), bvy = rng.range(-60, 60);
  let taunt = 0;
  return {
    buttons: () => [
      { id: 'up', x: W - 48, y: 40, w: 40, h: 70, action: 'jump', label: 'UP' },
      { id: 'down', x: W - 48, y: H - 110, w: 40, h: 70, action: 'duck', label: 'DN' },
    ],
    update(dt, input) {
      taunt += dt;
      if (input.held('jump') || input.held('left')) my -= 140 * dt;
      if (input.held('duck') || input.held('right')) my += 140 * dt;
      my = Math.max(50, Math.min(H - 50, my));
      // Eggshell AI: confident, imperfect.
      const targetY = by + Math.sin(taunt * 2) * 18;
      ey += Math.max(-95 * dt, Math.min(95 * dt, targetY - ey));
      bx += bvx * dt; by += bvy * dt;
      if (by < 34 || by > H - 12) bvy = -bvy;
      const speedup = 1.035;
      if (bx < 30 && Math.abs(by - my) < 22 && bvx < 0) { bvx = -bvx * speedup; bvy += (by - my) * 4; Audio.sfx('ui'); }
      if (bx > W - 30 && Math.abs(by - ey) < 24 && bvx > 0) { bvx = -bvx * speedup; bvy += (by - ey) * 3; Audio.sfx('ui'); }
      if (bx < 8) return false;
      if (bx > W - 8) return true;
    },
    draw(ctx) {
      drawTextCentered(ctx, 'FIRST POINT WINS. HIS PADDLE IS HIS SHELL.', W / 2, 34, '#c8e0ff');
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#30303f';
      ctx.beginPath(); ctx.moveTo(W / 2, 34); ctx.lineTo(W / 2, H - 8); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#48e0c8';
      ctx.fillRect(22, my - 20, 5, 40);
      // Eggshell's shell paddle
      ctx.fillStyle = '#48c848';
      ctx.fillRect(W - 27, ey - 22, 6, 44);
      ctx.fillStyle = '#2a8a2a';
      for (let i = 0; i < 4; i++) ctx.fillRect(W - 25, ey - 18 + i * 10, 2, 4);
      ctx.fillStyle = '#f6d33c';
      ctx.fillRect(bx - 3, by - 3, 6, 6);
      if (Math.floor(taunt / 4) % 2 === 0) drawTextCentered(ctx, '"I INVENTED PONG." - EGGSHELL', W / 2, H - 18, '#5a5a68');
    },
  };
}

// --- MASH INVADERS: one wave of descending vacuums ---------------------------
function mashInvaders(rng) {
  let px = W / 2;
  const inv = [];
  for (let i = 0; i < 8; i++) inv.push({ x: 90 + (i % 4) * 80, y: 50 + Math.floor(i / 4) * 30, live: true });
  let dir = 1, shots = [], cd = 0;
  return {
    update(dt, input) {
      if (input.held('left')) px -= 150 * dt;
      if (input.held('right')) px += 150 * dt;
      px = Math.max(20, Math.min(W - 20, px));
      cd -= dt;
      if (input.pressed('jump') && cd <= 0) { cd = 0.35; shots.push({ x: px, y: H - 40 }); Audio.sfx('shoot'); }
      let edge = false;
      for (const v of inv) {
        if (!v.live) continue;
        v.x += dir * 40 * dt;
        if (v.x > W - 30 || v.x < 30) edge = true;
      }
      if (edge) { dir = -dir; for (const v of inv) if (v.live) v.y += 12; }
      for (const s of shots) {
        s.y -= 220 * dt;
        for (const v of inv) {
          if (v.live && Math.abs(v.x - s.x) < 10 && Math.abs(v.y - s.y) < 9) {
            v.live = false; s.y = -99; Audio.sfx('crunch');
          }
        }
      }
      shots = shots.filter((s) => s.y > -10);
      if (inv.every((v) => !v.live)) return true;
      if (inv.some((v) => v.live && v.y > H - 60)) return false;
    },
    draw(ctx) {
      drawTextCentered(ctx, 'CLEAR THE WAVE OF DUST DEVILS.', W / 2, 34, '#c8e0ff');
      for (const v of inv) {
        if (!v.live) continue;
        drawProp(ctx, 'dustdevil', Math.round(v.x - 7), Math.round(v.y - 6), 14, 12);
      }
      ctx.fillStyle = '#48e0c8';
      ctx.fillRect(px - 8, H - 36, 16, 8);
      ctx.fillRect(px - 2, H - 42, 4, 6);
      ctx.fillStyle = '#f6d33c';
      for (const s of shots) ctx.fillRect(s.x - 1, s.y - 4, 2, 6);
    },
  };
}

// --- BRICK BONK: breakout; the wall is Eggshell's mustache -------------------
function brickBonk(rng) {
  const bricks = [];
  // mustache shape (two swoops), 14 cols x 5 rows mask
  const MASK = [
    '..XXX....XXX..',
    '.XXXXX..XXXXX.',
    'XXXXXXXXXXXXXX',
    'XXXX.XXXX.XXXX',
    '.XX........XX.',
  ];
  MASK.forEach((row, ry) => {
    row.split('').forEach((ch, rx) => {
      if (ch === 'X') bricks.push({ x: 70 + rx * 24, y: 46 + ry * 14, hp: ry === 2 ? 2 : 1, live: true });
    });
  });
  const total = bricks.length;
  let px = W / 2, bx = W / 2, by = H - 70, bvx = 90, bvy = -150;
  return {
    update(dt, input) {
      if (input.held('left')) px -= 170 * dt;
      if (input.held('right')) px += 170 * dt;
      if (input.pointer.down) px += Math.max(-170 * dt, Math.min(170 * dt, input.pointer.x - px));
      px = Math.max(30, Math.min(W - 30, px));
      bx += bvx * dt; by += bvy * dt;
      if (bx < 12 || bx > W - 12) bvx = -bvx;
      if (by < 34) bvy = Math.abs(bvy);
      if (by > H - 46 && by < H - 38 && Math.abs(bx - px) < 26 && bvy > 0) {
        bvy = -Math.abs(bvy) * 1.02;
        bvx += (bx - px) * 3;
        Audio.sfx('ui');
      }
      if (by > H - 8) { by = H - 70; bvy = -150; bvx = rng.range(-90, 90); Audio.sfx('uiBad'); }
      for (const b of bricks) {
        if (b.live && Math.abs(bx - (b.x + 11)) < 14 && Math.abs(by - (b.y + 6)) < 9) {
          b.hp--; if (b.hp <= 0) b.live = false;
          bvy = -bvy;
          Audio.sfx('crunch');
          break;
        }
      }
      const smashed = bricks.filter((b) => !b.live).length;
      if (smashed / total >= 0.4) return true;
    },
    draw(ctx) {
      const smashed = bricks.filter((b) => !b.live).length;
      drawTextCentered(ctx, `SMASH 40% OF THE MUSTACHE: ${Math.floor((smashed / total) * 100)}%`, W / 2, 34, '#c8e0ff');
      for (const b of bricks) {
        if (!b.live) continue;
        ctx.fillStyle = b.hp > 1 ? '#8a2020' : '#c83030';
        ctx.fillRect(b.x, b.y, 22, 12);
        ctx.strokeStyle = '#5a1414';
        ctx.strokeRect(b.x + 0.5, b.y + 0.5, 22, 12);
      }
      ctx.fillStyle = '#48e0c8';
      ctx.fillRect(px - 24, H - 42, 48, 6);
      // the ball is a coin
      drawProp(ctx, 'coin', Math.round(bx - 4), Math.round(by - 4), 8, 8);
    },
  };
}
