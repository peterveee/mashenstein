// Title, slot select, difficulty select (the joke), intro cutscene, results,
// finale, settings. All keyboard + touch navigable.
import { W, H } from '../engine/renderer.js';
import { Input } from '../engine/input.js';
import { Audio } from '../engine/audio.js';
import { drawText, drawTextCentered, textWidth, getSprite } from '../engine/sprites.js';
import { DIFFICULTIES, INTRO_PANELS, FINALE_BEATS, RANK_LINES } from '../data/jokes.js';
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
  constructor({ save, onSlotChosen, onOvertime, onSettings, onHowTo }) {
    this.save = save; this.onSlotChosen = onSlotChosen; this.onOvertime = onOvertime; this.onSettings = onSettings; this.onHowTo = onHowTo;
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
      const y0 = 130;
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
      drawTextCentered(ctx, (sel ? '> ' : '') + o.label + (sel ? ' <' : ''), W / 2, 130 + i * 16, sel ? '#f6d33c' : '#c8c8d8');
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
        const s = getSprite(`hero_${h}_run1`);
        if (s) ctx.drawImage(s, 90 + i * 38, 90);
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
