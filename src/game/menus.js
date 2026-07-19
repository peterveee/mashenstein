// Title, slot select, difficulty select (the joke), intro cutscene, results,
// finale, settings. All keyboard + touch navigable.
import { W, H } from '../engine/renderer.js';
import { Input } from '../engine/input.js';
import { Audio } from '../engine/audio.js';
import { drawText, drawTextCentered, textWidth, getSprite } from '../engine/sprites.js';
import { drawToon } from '../sprites/toons.js';
import { DIFFICULTIES, INTRO_PANELS, FINALE_BEATS, RANK_LINES } from '../data/jokes.js';
import { CABINETS, HUB_THEME } from '../data/cabinets.js';
import { totalPlugs } from './progress.js';

function menuNav(input, idx, len) {
  if (input.pressed('duck') || input.pressed('right')) { Audio.sfx('ui'); return (idx + 1) % len; }
  if (input.pressed('jump') && !input.pressed('confirm')) { /* jump==confirm conflict handled below */ }
  if (input.pressed('left')) { Audio.sfx('ui'); return (idx + len - 1) % len; }
  return idx;
}

function stitchLogo(ctx, t, reducedFlashing) {
  const cx = W / 2;
  // sutured biome patches behind the logo
  const patches = ['#3a9c48', '#c88848', '#282858', '#c8e0f0', '#3a3048', '#484838', '#c8a068', '#b0b0c0'];
  patches.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(40 + i * 50, 30 + (i % 2) * 24, 52, 48);
    ctx.globalAlpha = 1;
    // crude stitches between patches
    ctx.strokeStyle = '#181820';
    for (let s = 0; s < 4; s++) {
      const sx = 40 + i * 50 + 48;
      ctx.beginPath(); ctx.moveTo(sx - 3, 38 + s * 10 + (i % 2) * 24); ctx.lineTo(sx + 5, 42 + s * 10 + (i % 2) * 24); ctx.stroke();
    }
  });
  const flicker = reducedFlashing ? 1 : (Math.sin(t * 30) > -0.92 ? 1 : 0.6);
  ctx.globalAlpha = flicker;
  drawTextCentered(ctx, 'MASHENSTEIN', cx, 44, '#f6d33c', 4);
  // stitches across the letters
  ctx.strokeStyle = '#0b0b14';
  for (let i = 0; i < 6; i++) {
    const sx = cx - 120 + i * 48;
    ctx.beginPath(); ctx.moveTo(sx, 48); ctx.lineTo(sx + 8, 66); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx + 8, 48); ctx.lineTo(sx, 66); ctx.stroke();
  }
  drawTextCentered(ctx, 'THE UNPLUGGENING', cx, 80, '#48e0c8', 1);
  ctx.globalAlpha = 1;
  drawTextCentered(ctx, "IT'S ALIVE... AND UNPLUGGED", cx, 94, '#5a5a68');
}

export class TitleState {
  constructor({ save, onSlotChosen, onOvertime, onSettings, onHowTo, onGuide, onSoundTest }) {
    this.save = save; this.onSlotChosen = onSlotChosen; this.onOvertime = onOvertime; this.onSettings = onSettings;
    this.onHowTo = onHowTo; this.onGuide = onGuide; this.onSoundTest = onSoundTest;
  }
  enter() {
    this.idx = 0;
    this.t = 0;
    Audio.setBank(null);
    Input.setButtons([]);
  }
  options() {
    const opts = [];
    this.save.data.slots.forEach((s, i) => {
      opts.push({
        id: 'slot' + i,
        label: s ? `FILE ${i + 1}: ${totalPlugs(s)} PLUGS, ${s.coins} COINS` : `FILE ${i + 1}: NEW GAME`,
        act: () => this.onSlotChosen(i, !s),
      });
    });
    const anyOvertime = this.save.data.slots.some((s) => s && s.campaign.storyFlags.sawEnding);
    if (anyOvertime) opts.push({ id: 'overtime', label: 'OVERTIME (ENDLESS)', act: () => this.onOvertime() });
    opts.push({ id: 'howto', label: 'HOW TO PLAY', act: () => this.onHowTo() });
    opts.push({ id: 'guide', label: 'FIELD GUIDE (WHAT IS WHAT)', act: () => this.onGuide() });
    opts.push({ id: 'soundtest', label: 'SOUND TEST (JUKEBOX)', act: () => this.onSoundTest() });
    opts.push({ id: 'settings', label: 'SETTINGS (SINCERE)', act: () => this.onSettings() });
    return opts;
  }
  update(dt) {
    this.t += dt;
    const opts = this.options();
    if (Input.pressed('duck') || Input.pressed('right')) { this.idx = (this.idx + 1) % opts.length; Audio.sfx('ui'); }
    if (Input.pressed('left')) { this.idx = (this.idx + opts.length - 1) % opts.length; Audio.sfx('ui'); }
    if (Input.pressed('jump')) { this.idx = (this.idx + 1) % opts.length; Audio.sfx('ui'); } // jump scrolls too (menus: confirm = Enter/tap)
    if (Input.pressed('confirm')) { Audio.sfx('uiConfirm'); opts[this.idx].act(); }
    if (Input.pressed('pointer')) {
      const p = Input.pointer;
      const y0 = 116;
      const i = Math.floor((p.y - y0) / 16);
      if (i >= 0 && i < opts.length) { this.idx = i; Audio.sfx('uiConfirm'); opts[i].act(); }
    }
    Input.pollGamepad();
    Input.endFrame();
  }
  draw(ctx) {
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    stitchLogo(ctx, this.t, this.save.settings.reducedFlashing);
    const opts = this.options();
    opts.forEach((o, i) => {
      const sel = i === this.idx;
      drawTextCentered(ctx, (sel ? '> ' : '') + o.label + (sel ? ' <' : ''), W / 2, 116 + i * 16, sel ? '#f6d33c' : '#c8c8d8');
    });
    drawTextCentered(ctx, 'ARROWS/TAP: CHOOSE   ENTER/TAP: CONFIRM', W / 2, H - 30, '#5a5a68');
    drawTextCentered(ctx, 'A GAME STITCHED TOGETHER FROM PARTS OF OTHER GAMES', W / 2, H - 16, '#30303f');
  }
}

export class DifficultyState {
  constructor({ save, onDone }) { this.save = save; this.onDone = onDone; }
  enter() { this.idx = 0; this.confirming = false; }
  update(dt) {
    const n = DIFFICULTIES.length;
    if (this.confirming) {
      if (Input.pressed('confirm')) { Audio.sfx('uiConfirm'); this.commit(5); }
      if (Input.pressed('back') || Input.pressed('duck')) { this.confirming = false; Audio.sfx('ui'); }
      Input.endFrame();
      return;
    }
    if (Input.pressed('duck') || Input.pressed('right')) { this.idx = (this.idx + 1) % n; Audio.sfx('ui'); }
    if (Input.pressed('jump') || Input.pressed('left')) { this.idx = (this.idx + n - 1) % n; Audio.sfx('ui'); }
    if (Input.pressed('pointer')) {
      const i = Math.floor((Input.pointer.y - 90) / 24);
      if (i >= 0 && i < n) {
        if (this.idx === i) this.select(); else { this.idx = i; Audio.sfx('ui'); }
      }
    }
    if (Input.pressed('confirm')) this.select();
    Input.endFrame();
  }
  select() {
    const d = DIFFICULTIES[this.idx];
    if (d.id === 5) { this.confirming = true; Audio.sfx('uiBad'); return; }
    Audio.sfx('uiConfirm');
    this.commit(d.id);
  }
  commit(id) {
    this.save.slot.difficulty = id;
    this.save.persist();
    this.onDone();
  }
  draw(ctx) {
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    drawTextCentered(ctx, 'SELECT DIFFICULTY', W / 2, 40, '#fff', 2);
    drawTextCentered(ctx, '(THE PAUSE MENU WILL ALWAYS TELL YOU THE TRUTH)', W / 2, 64, '#5a5a68');
    DIFFICULTIES.forEach((d, i) => {
      const sel = i === this.idx;
      const danger = d.id === 5;
      let label = d.name;
      if (d.id === 2) label += ' '.repeat(0);
      const color = danger ? '#e04848' : sel ? '#f6d33c' : '#c8c8d8';
      drawTextCentered(ctx, (sel ? '> ' : '') + label + (sel ? ' <' : ''), W / 2, 90 + i * 24, color, d.id === 2 ? 1 : 1);
      drawTextCentered(ctx, d.desc, W / 2, 100 + i * 24, '#5a5a68');
      if (d.id === 3 && sel) drawText(ctx, ':)', W / 2 + textWidth(label) / 2 + 18, 90 + i * 24, '#8a8a98'); // the skull is smiling
    });
    if (this.confirming) {
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillRect(40, 90, W - 80, 80);
      ctx.strokeStyle = '#e04848';
      ctx.strokeRect(40.5, 90.5, W - 81, 80);
      drawTextCentered(ctx, 'ARE YOU SURE?', W / 2, 108, '#e04848', 2);
      drawTextCentered(ctx, '(WE ARE NOT.)', W / 2, 132, '#8a8a98');
      drawTextCentered(ctx, 'ENTER: YES   ESC: WISDOM', W / 2, 150, '#c8c8d8');
    }
  }
}

export class IntroState {
  constructor({ onDone }) { this.onDone = onDone; }
  enter() { this.panel = 0; this.chars = 0; }
  update(dt) {
    if (this.panel >= INTRO_PANELS.length) { Input.endFrame(); return; }
    this.chars += dt * 40;
    const text = INTRO_PANELS[this.panel].text;
    if (Input.pressed('confirm') || Input.pressed('jump') || Input.pressed('pointer')) {
      if (this.chars < text.length) this.chars = text.length;
      else { this.panel++; this.chars = 0; Audio.sfx('ui'); if (this.panel >= INTRO_PANELS.length) { this.onDone(); } }
    }
    if (Input.pressed('back')) this.onDone();
    Input.endFrame();
  }
  draw(ctx) {
    if (this.panel >= INTRO_PANELS.length) return;
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    // panel art: minimal pixel scenes
    ctx.strokeStyle = '#30303f';
    ctx.strokeRect(60.5, 30.5, W - 121, 120);
    const spr = getSprite('eggshell');
    if (this.panel === 1 && spr) ctx.drawImage(spr, W / 2 - 24, 60, 48, 32);
    if (this.panel === 0) {
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = ['#3a9c48', '#c88848', '#282858', '#c8e0f0', '#3a3048', '#c8a068'][i];
        ctx.fillRect(80 + i * 55, 60, 40, 60);
        ctx.fillStyle = '#181820';
        ctx.fillRect(84 + i * 55, 66, 32, 40);
      }
    }
    if (this.panel === 2 || this.panel === 3) {
      const heroes = ['lorenzo', 'gnash', 'fernwick', 'b33p', 'mochi', 'chompo', 'gary', 'grumpos'];
      heroes.forEach((h, i) => {
        drawToon(ctx, h, { kind: 'idle', time: this.chars * 0.05 + i * 0.8, grounded: true }, 90 + i * 38 + 9, 108, 24);
      });
    }
    const text = INTRO_PANELS[this.panel].text;
    const shown = text.slice(0, Math.floor(this.chars));
    // simple two-line wrap
    const mid = shown.length > 60 ? shown.lastIndexOf(' ', 60) : shown.length;
    drawTextCentered(ctx, shown.slice(0, mid), W / 2, 170, '#e8e8f0');
    if (mid < shown.length) drawTextCentered(ctx, shown.slice(mid + 1), W / 2, 184, '#e8e8f0');
    drawTextCentered(ctx, `${this.panel + 1}/4  (TAP/ENTER)`, W / 2, H - 20, '#5a5a68');
  }
}

export class ResultsState {
  constructor({ result, gains, save, onDone }) {
    this.result = result; this.gains = gains; this.save = save; this.onDone = onDone;
  }
  enter() { this.t = 0; this.shown = 0; Audio.sfx(this.result.success ? 'win' : 'lose'); }
  update(dt) {
    this.t += dt;
    this.shown = Math.min(this.result.score, this.shown + dt * Math.max(500, this.result.score));
    if ((Input.pressed('confirm') || Input.pressed('pointer') || Input.pressed('jump')) && this.t > 0.6) {
      Audio.sfx('uiConfirm');
      this.onDone();
    }
    Input.endFrame();
  }
  draw(ctx) {
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    const r = this.result;
    drawTextCentered(ctx, r.success ? (r.boss ? 'BOSS DEFEATED' : 'STAGE COMPLETE') : (r.failMsg || 'UNPLUGGED'), W / 2, 34, r.success ? '#48c848' : '#e04848', 2);
    drawTextCentered(ctx, `SCORE: ${Math.floor(this.shown)}`, W / 2, 70, '#fff', 1);
    let y = 90;
    const line = (t, c) => { drawTextCentered(ctx, t, W / 2, y, c || '#c8c8d8'); y += 13; };
    line(`COINS BANKED: +${this.gains.coins}`, '#f6d33c');
    if (r.stage) {
      const plugs = this.save.slot.campaign.plugs[r.stage.id] || [];
      line(`PLUGS: ${['MISSION', 'CHALLENGE', 'TOASTER'].map((n, i) => `${n} ${plugs[i] ? 'X' : '-'}`).join('  ')}`, '#48e0c8');
      if (this.gains.plugsNew > 0) line(`+${this.gains.plugsNew} NEW PLUG${this.gains.plugsNew > 1 ? 'S' : ''}`, '#48e0c8');
      if (r.rank) {
        const osha = this.save.slot.mods.equipped.includes('osha');
        line(`RANK: ${r.rank}${osha ? '*' : ''}`, r.rank === 'S' || r.rank === 'CONCERNING' ? '#f6d33c' : '#c8c8d8');
        line(RANK_LINES[r.rank] || '', '#8a8a98');
        if (osha) line('* THE BINDER IS DISAPPOINTED.', '#5a5a68');
      }
    }
    if (r.bestCombo > 1) line(`BEST RELAY COMBO: ${r.bestCombo}`);
    for (const m of this.gains.mastery || []) line(`${m.heroId.toUpperCase()} MASTERY LEVEL ${m.level}!`, '#f890b8');
    drawTextCentered(ctx, 'TAP/ENTER: CONTINUE', W / 2, H - 20, '#5a5a68');
  }
}

export class FinaleState {
  constructor({ save, onDone }) { this.save = save; this.onDone = onDone; }
  enter() { this.beat = 0; this.chars = 0; Audio.setBank(null); }
  update(dt) {
    if (this.beat >= FINALE_BEATS.length) { Input.endFrame(); return; }
    this.chars += dt * 34;
    const text = FINALE_BEATS[this.beat];
    if (Input.pressed('confirm') || Input.pressed('jump') || Input.pressed('pointer')) {
      if (this.chars < text.length) this.chars = text.length;
      else {
        this.beat++; this.chars = 0; Audio.sfx('ui');
        if (this.beat >= FINALE_BEATS.length) {
          this.save.slot.campaign.storyFlags.sawEnding = true;
          this.save.persist();
          this.onDone();
        }
      }
    }
    Input.endFrame();
  }
  draw(ctx) {
    if (this.beat >= FINALE_BEATS.length) return;
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    const spr = getSprite('eggshell');
    if (this.beat >= 1 && this.beat <= 5 && spr) ctx.drawImage(spr, W / 2 - 24, 60, 48, 32);
    const dd = getSprite('dustdevil');
    if (this.beat === 6 && dd) ctx.drawImage(dd, W / 2 - 12, 60, 24, 20);
    if (this.beat === 8) drawTextCentered(ctx, 'OVERTIME UNLOCKED', W / 2, 70, '#8858c8', 2);
    const text = FINALE_BEATS[this.beat];
    const shown = text.slice(0, Math.floor(this.chars));
    const mid = shown.length > 58 ? shown.lastIndexOf(' ', 58) : shown.length;
    drawTextCentered(ctx, shown.slice(0, mid), W / 2, 150, '#e8e8f0');
    if (mid < shown.length) drawTextCentered(ctx, shown.slice(mid + 1), W / 2, 164, '#e8e8f0');
    drawTextCentered(ctx, `${this.beat + 1}/${FINALE_BEATS.length}`, W / 2, H - 20, '#5a5a68');
  }
}

// FIELD GUIDE: every enemy, object, and pickup with its sprite and one line
// of truth. Color legend: red = avoid, teal = touch it, gold = collect.
const GUIDE_PAGES = [
  {
    title: 'HAZARDS: GROUND FLOOR', color: '#e04848', hint: 'RED = AVOID. JUMP THESE.',
    rows: [
      { s: 'shrub', name: 'THORN SHRUB', desc: 'RED AND SPIKY. JUMP IT. BREAKABLE.' },
      { s: 'crate', name: 'CRATE', desc: 'WOOD. SOMETIMES STACKED. JUMP OR SMASH IT.' },
      { s: '_pipe', name: 'PIPE', desc: 'TALL AND SMUG. JUMP IT.' },
      { s: 'barrel', name: 'BARREL', desc: 'ROLLS AT YOU. JUMP IT.' },
      { s: 'chair', name: 'OFFICE CHAIR', desc: 'ALSO ROLLS AT YOU. FASTER. JUMP IT.' },
      { s: '_gap', name: 'PIT', desc: 'A HOLE WHERE FLOOR SHOULD BE. JUMP IT.' },
      { s: 'tombstone', name: 'TOMBSTONE', desc: 'JUMP IT. RESPECTFULLY.' },
      { s: 'zombieWalk', name: 'ZOMBIE', desc: 'SHAMBLES TOWARD YOU. JUMP IT.' },
    ],
  },
  {
    title: 'HAZARDS: AIRBORNE + WEIRD', color: '#e04848', hint: 'RED = AVOID. DUCK OR DODGE THESE.',
    rows: [
      { s: 'drone', name: 'DRONE', desc: 'FLIES LOW. DUCK OR ROLL UNDER IT.' },
      { s: 'drone', name: 'SHOOTER DRONE', desc: 'STAYS HIGH. DODGE ITS SHOTS INSTEAD.' },
      { s: '_shot', name: 'ENEMY SHOT', desc: 'RED MEANS DODGE. YELLOW MEANS ABOUT TO FIRE.' },
      { s: 'buzzbird', name: 'BUZZBIRD', desc: 'MID-AIR MENACE. DO NOT JUMP INTO IT.' },
      { s: 'icicle', name: 'ICICLE', desc: 'FALLS WHEN YOU GET CLOSE. WATCH ITS SHADOW.' },
      { s: '_beatBar', name: 'BEAT BAR', desc: 'POPS UP ON THE BEAT. JUMP ON TIME.' },
      { s: '_paper', name: 'PAPERWORK', desc: 'FLIES LOW. DUCK. DO NOT SIGN IT.' },
      { s: 'cardboardMonster', name: 'BOX MONSTER', desc: 'CARDBOARD. STILL COUNTS. JUMP IT.' },
    ],
  },
  {
    title: 'TOUCH THESE ON PURPOSE', color: '#48e0c8', hint: 'TEAL = RUN INTO IT. IT IS FINE.',
    rows: [
      { s: '_qcrate', name: '?-CRATE', desc: 'FLOATS. TOUCH TO BREAK. DROPS COINS.' },
      { s: 'capStar', name: 'TARGET', desc: 'FLOATING TARGET. TOUCH TO DESTROY.' },
      { s: 'printer', name: 'PRINTER', desc: 'SHOOTS PAPER. RAM IT TO BREAK IT.' },
      { s: 'battery', name: 'FROZEN SWITCH', desc: 'TOUCH TO EXTEND A BRIDGE OVER THE NEXT PIT.' },
      { s: 'boostPad', name: 'BOOST PAD', desc: 'RUN OVER IT. GO UNREASONABLY FAST.' },
      { s: '_portal', name: 'TAG PORTAL', desc: 'SWAP HERO HERE. TAG NEAR DANGER = PERFECT.' },
      { s: 'eggshell', name: 'CLOWN-COPTER', desc: 'CATCH IT WHEN IT SWOOPS LOW. CHASE MISSIONS.' },
    ],
  },
  {
    title: 'PICKUPS', color: '#f6d33c', hint: 'GOLD = COLLECT. NO DOWNSIDES. PROBABLY.',
    rows: [
      { s: 'coin', name: 'COIN', desc: 'MONEY. THE ARCADE RUNS ON IT.' },
      { s: 'battery', name: 'BATTERY', desc: '+1 BATTERY CELL. HEALTH, BASICALLY.' },
      { s: 'capShield', name: 'SHIELD CAPSULE', desc: 'ABSORBS ONE HIT. POLITELY.' },
      { s: 'capMagnet', name: 'MAGNET CAPSULE', desc: 'PULLS NEARBY COINS TO YOU.' },
      { s: 'capStar', name: 'STAR CAPSULE', desc: 'SCORE MULTIPLIER. YES, IT LOOKS LIKE A TARGET.' },
      { s: 'capSlow', name: 'SLOW-MO CAPSULE', desc: 'SLOWS THE WHOLE WORLD DOWN BRIEFLY.' },
      { s: 'appliance', name: 'GOLDEN TOASTER', desc: 'THE THIRD PLUG. GRAB IT MID-STAGE.' },
      { s: 'fuse', name: 'CORD PIECE', desc: 'MISSION PICKUP. COLLECT ALL THE PIECES.' },
      { s: 'zombieWalk', name: 'RESIDENT', desc: 'FOLLOWS YOU. ESCORT THEM TO THE FINISH.' },
    ],
  },
];

export class FieldGuideState {
  constructor({ onDone }) { this.onDone = onDone; }
  enter() { this.page = 0; this.t = 0; Input.setButtons([]); }
  update(dt) {
    this.t += dt;
    const n = GUIDE_PAGES.length;
    if (Input.pressed('right') || Input.pressed('duck')) { this.page = (this.page + 1) % n; Audio.sfx('ui'); }
    if (Input.pressed('left') || Input.pressed('jump')) { this.page = (this.page + n - 1) % n; Audio.sfx('ui'); }
    if (Input.pressed('pointer') && this.t > 0.3) {
      if (Input.pointer.x < W / 3) { this.page = (this.page + n - 1) % n; Audio.sfx('ui'); }
      else { this.page = (this.page + 1) % n; Audio.sfx('ui'); }
    }
    if (Input.pressed('confirm') && this.t > 0.3) { this.page = (this.page + 1) % n; Audio.sfx('ui'); }
    if (Input.pressed('back')) { Audio.sfx('ui'); this.onDone(); }
    Input.endFrame();
  }
  drawIcon(ctx, key, cx, yBottom) {
    // custom composites for things without a single sprite
    if (key === '_gap') {
      ctx.fillStyle = '#101018'; ctx.fillRect(cx - 10, yBottom - 6, 20, 6);
      ctx.fillStyle = '#30303f'; ctx.fillRect(cx - 12, yBottom - 8, 3, 8); ctx.fillRect(cx + 9, yBottom - 8, 3, 8);
      return;
    }
    if (key === '_beatBar') {
      ctx.fillStyle = '#e04898'; ctx.fillRect(cx - 4, yBottom - 10, 8, 10);
      ctx.fillStyle = '#f890c8'; ctx.fillRect(cx - 4, yBottom - 10, 8, 2);
      return;
    }
    if (key === '_paper') {
      ctx.fillStyle = '#101018'; ctx.fillRect(cx - 5, yBottom - 8, 10, 8);
      ctx.fillStyle = '#f0f0f8'; ctx.fillRect(cx - 4, yBottom - 7, 8, 6);
      ctx.fillStyle = '#8a8a98'; ctx.fillRect(cx - 3, yBottom - 5, 6, 1);
      return;
    }
    if (key === '_shot') {
      ctx.fillStyle = '#101018'; ctx.fillRect(cx - 3, yBottom - 7, 6, 6);
      ctx.fillStyle = '#e04848'; ctx.fillRect(cx - 2, yBottom - 6, 4, 4);
      ctx.fillStyle = '#fff'; ctx.fillRect(cx - 1, yBottom - 5, 2, 2);
      return;
    }
    if (key === '_portal') {
      const pulse = Math.round(Math.sin(this.t * 5) * 2);
      const spr = getSprite('portal');
      if (spr) ctx.drawImage(spr, cx - 6, yBottom - 20 - pulse, 12, 20 + pulse);
      else { ctx.fillStyle = '#48e0c8'; ctx.fillRect(cx - 6, yBottom - 20, 12, 20); }
      return;
    }
    if (key === '_pipe') {
      const spr = getSprite('crate');
      if (spr) { ctx.drawImage(spr, cx - 6, yBottom - 11); ctx.drawImage(spr, cx - 6, yBottom - 18); }
      return;
    }
    if (key === '_qcrate') {
      const bob = Math.round(Math.sin(this.t * 3) * 2);
      const spr = getSprite('crate');
      if (spr) ctx.drawImage(spr, cx - 6, yBottom - 16 + bob);
      return;
    }
    const spr = getSprite(key);
    if (spr) ctx.drawImage(spr, cx - Math.floor(spr.width / 2), yBottom - spr.height);
  }
  draw(ctx) {
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    const p = GUIDE_PAGES[this.page];
    drawTextCentered(ctx, 'FIELD GUIDE', W / 2, 14, '#fff', 2);
    drawTextCentered(ctx, p.title, W / 2, 36, p.color, 1);
    drawTextCentered(ctx, p.hint, W / 2, 48, '#5a5a68');
    const rh = p.rows.length > 8 ? 20 : 22; // 9-row pages tighten up a touch
    p.rows.forEach((r, i) => {
      const y = 62 + i * rh;
      this.drawIcon(ctx, r.s, 44, y + 18);
      drawText(ctx, r.name, 70, y + 6, p.color);
      drawText(ctx, r.desc, 190, y + 6, '#c8c8d8');
    });
    drawTextCentered(ctx, `< PREV   PAGE ${this.page + 1}/${GUIDE_PAGES.length}   NEXT >   ESC: BACK`, W / 2, H - 14, '#5a5a68');
  }
}

// SOUND TEST: the classic arcade jukebox. Every cabinet track + the hub theme.
const JUKEBOX = [
  { name: 'THE FOOD COURT (HUB THEME)', bank: HUB_THEME },
  ...CABINETS.map((c) => ({ name: `${c.name} (${c.genre})`, bank: c.music })),
];

export class SoundTestState {
  constructor({ onDone }) { this.onDone = onDone; }
  enter() { this.idx = 0; this.playing = -1; this.t = 0; Audio.setBank(null); Input.setButtons([]); }
  exit() { Audio.setBank(null); }
  play(i) {
    this.playing = i;
    Audio.setBank(JUKEBOX[i].bank);
    Audio.sfx('uiConfirm');
  }
  update(dt) {
    this.t += dt;
    const n = JUKEBOX.length;
    if (Input.pressed('duck') || Input.pressed('right') || Input.pressed('jump')) { this.idx = (this.idx + 1) % n; Audio.sfx('ui'); }
    if (Input.pressed('left')) { this.idx = (this.idx + n - 1) % n; Audio.sfx('ui'); }
    if (Input.pressed('confirm')) this.play(this.idx);
    if (Input.pressed('pointer')) {
      const i = Math.floor((Input.pointer.y - 64) / 16);
      if (i >= 0 && i < n) {
        if (this.idx === i) this.play(i); else { this.idx = i; Audio.sfx('ui'); }
      }
    }
    if (Input.pressed('back')) { Audio.setBank(null); this.onDone(); }
    Input.endFrame();
  }
  draw(ctx) {
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    drawTextCentered(ctx, 'SOUND TEST', W / 2, 16, '#fff', 2);
    drawTextCentered(ctx, 'ALL CHIPTUNES ARE PLAYED LIVE BY A VERY SMALL ORCHESTRA.', W / 2, 40, '#5a5a68');
    JUKEBOX.forEach((tr, i) => {
      const sel = i === this.idx;
      const on = i === this.playing;
      const label = `${on ? '* ' : ''}${tr.name}  (${tr.bank.bpm} BPM)`;
      drawTextCentered(ctx, (sel ? '> ' : '') + label + (sel ? ' <' : ''), W / 2, 64 + i * 16, on ? '#48e0c8' : sel ? '#f6d33c' : '#c8c8d8');
    });
    if (this.playing >= 0) {
      const bars = 12;
      for (let i = 0; i < bars; i++) {
        const hgt = 3 + Math.abs(Math.sin(this.t * 6 + i * 0.9)) * 10;
        ctx.fillStyle = '#48e0c8';
        ctx.fillRect(W / 2 - bars * 5 + i * 10, H - 34 - hgt, 6, hgt);
      }
    }
    drawTextCentered(ctx, 'ENTER/TAP: PLAY   ESC: BACK', W / 2, H - 14, '#5a5a68');
  }
}

export class HowToPlayState {
  constructor({ onDone }) { this.onDone = onDone; }
  enter() { this.t = 0; Input.setButtons([]); }
  update(dt) {
    this.t += dt;
    if (this.t > 0.3 && (Input.pressed('confirm') || Input.pressed('back') || Input.pressed('pointer'))) {
      Audio.sfx('ui');
      this.onDone();
    }
    Input.endFrame();
  }
  draw(ctx) {
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    drawTextCentered(ctx, 'HOW TO PLAY', W / 2, 22, '#fff', 2);
    drawTextCentered(ctx, 'ONE HERO RENDERS AT A TIME. BUDGET CUTS. RUN ANYWAY.', W / 2, 44, '#8a8a98');
    let y = 64;
    const line = (a, b, c) => {
      drawText(ctx, a, 46, y, c || '#f6d33c');
      drawText(ctx, b, 170, y, '#c8c8d8');
      y += 15;
    };
    line('JUMP', 'SPACE / W / UP -- TAP. HOLD FOR HIGHER.');
    line('DUCK / ROLL', 'S / DOWN (HOLD) -- SWIPE DOWN.');
    line('ABILITY', 'X / SHIFT -- PWR BUTTON.');
    line('TAG', 'C / E -- TAG BUTTON. SWAP HEROES AT PORTALS.');
    line('PERFECT TAG', 'TAG RIGHT BEFORE AN OBSTACLE. SLOW-MO + BONUS.', '#48e0c8');
    line('TEAM MOVE', 'FULL RELAY METER + TAG BUTTON. CLEARS THE SCREEN.', '#48e0c8');
    y += 4;
    line('MISSION', 'FINISH IT TO WIN THE STAGE. EARNS A PLUG.', '#f890b8');
    line('CHALLENGE', 'OPTIONAL. ANOTHER PLUG. NO PRESSURE. SOME PRESSURE.', '#f890b8');
    line('TOASTER', 'GRAB THE FLOATING APPLIANCE MID-STAGE. THIRD PLUG.', '#f890b8');
    line('PLUGS', 'UNLOCK NEW CABINETS. COINS BUY UPGRADES.', '#f890b8');
    y += 4;
    line('PAUSE / MUTE', 'P OR ESC / M.');
    drawTextCentered(ctx, 'JUMP THE RED THORN SHRUBS. DUCK THE DRONES. MIND THE GAPS.', W / 2, y + 6, '#d84828');
    drawTextCentered(ctx, 'TAP/ENTER: BACK', W / 2, H - 16, '#5a5a68');
  }
}

export class SettingsState {
  constructor({ save, onDone }) { this.save = save; this.onDone = onDone; }
  enter() { this.idx = 0; }
  options() {
    const s = this.save.settings;
    return [
      { label: `MUTE: ${s.muted ? 'ON' : 'OFF'}`, act: () => { s.muted = !s.muted; Audio.setMuted(s.muted); } },
      { label: `REDUCED MOTION: ${s.reducedMotion ? 'ON' : 'OFF'}`, act: () => { s.reducedMotion = !s.reducedMotion; } },
      { label: `REDUCED FLASHING: ${s.reducedFlashing ? 'ON' : 'OFF'}`, act: () => { s.reducedFlashing = !s.reducedFlashing; } },
      { label: `SCREEN SHAKE: ${Math.round(s.screenShake * 100)}%`, act: () => { s.screenShake = s.screenShake >= 1 ? 0 : s.screenShake + 0.5; } },
      { label: `HIGH CONTRAST OUTLINES: ${s.highContrast ? 'ON' : 'OFF'}`, act: () => { s.highContrast = !s.highContrast; } },
      { label: `ASSIST SPEED: ${s.assistSpeed}%`, act: () => { s.assistSpeed = s.assistSpeed === 100 ? 80 : s.assistSpeed + 10; } },
      { label: 'DONE', act: () => { this.save.persist(); this.onDone(); } },
    ];
  }
  update(dt) {
    const opts = this.options();
    if (Input.pressed('duck') || Input.pressed('right') || Input.pressed('jump')) { this.idx = (this.idx + 1) % opts.length; Audio.sfx('ui'); }
    if (Input.pressed('left')) { this.idx = (this.idx + opts.length - 1) % opts.length; Audio.sfx('ui'); }
    if (Input.pressed('confirm')) { Audio.sfx('uiConfirm'); opts[this.idx].act(); }
    if (Input.pressed('pointer')) {
      const i = Math.floor((Input.pointer.y - 70) / 18);
      if (i >= 0 && i < opts.length) {
        if (this.idx === i) { Audio.sfx('uiConfirm'); opts[i].act(); } else { this.idx = i; Audio.sfx('ui'); }
      }
    }
    if (Input.pressed('back')) { this.save.persist(); this.onDone(); }
    Input.endFrame();
  }
  draw(ctx) {
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    drawTextCentered(ctx, 'SETTINGS', W / 2, 30, '#fff', 2);
    drawTextCentered(ctx, 'ALL OF THESE DO EXACTLY WHAT THEY SAY.', W / 2, 52, '#5a5a68');
    this.options().forEach((o, i) => {
      const sel = i === this.idx;
      drawTextCentered(ctx, (sel ? '> ' : '') + o.label, W / 2, 70 + i * 18, sel ? '#f6d33c' : '#c8c8d8');
    });
  }
}
