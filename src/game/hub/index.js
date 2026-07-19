// THE LAST FUNCTIONING FOOD COURT: side-view hub + stage select, team select,
// Repair Bench, Gary's Legally Distinct Pawn Shop, arcade corner.
import { W, H } from '../../engine/renderer.js';
import { Input } from '../../engine/input.js';
import { Audio } from '../../engine/audio.js';
import { drawText, drawTextCentered, getSprite } from '../../engine/sprites.js';
import { drawToon, toonStandSprite } from '../../sprites/toons.js';
import { CABINETS, CABINET_BY_ID, HUB_THEME } from '../../data/cabinets.js';
import { STAGES, stagesForCabinet, UNLOCKS } from '../../data/stages.js';
import { HEROES, HERO_BY_ID } from '../../data/heroes.js';
import { BENCH_UPGRADES, MODS, MOD_BY_ID } from '../../data/progression.js';
import { HUB_LINES, PAWN_LINES } from '../../data/jokes.js';
import { totalPlugs, cabinetUnlocked, bossAvailable, finaleUnlocked, actForSlot } from '../progress.js';
import { MINIGAMES, MINIGAME_NAMES } from '../minigames/index.js';

const CORRUPTED_MODIFIERS = [
  { id: 'nojump', name: 'NO JUMPING', desc: 'THE JUMP BUTTON IS ON STRIKE. IT PROVIDES A CONTRACTUAL MINIMUM HOP.' },
  { id: 'maxspeed', name: 'MAXIMUM SPEED', desc: 'EVERYTHING IS FASTER. NOTHING IS CALMER.' },
  { id: 'randomswap', name: 'RANDOM SWAPS', desc: 'YOUR TEAM ORDER IS A SUGGESTION.' },
  { id: 'narration', name: 'INACCURATE NARRATION', desc: 'EGGSHELL DESCRIBES A DIFFERENT GAME.' },
];
export { CORRUPTED_MODIFIERS };

export class HubState {
  constructor({ save, flow }) { this.save = save; this.flow = flow; }

  stations() {
    const slot = this.save.slot;
    const st = [];
    let x = 70;
    for (const cab of CABINETS) {
      const unlocked = cabinetUnlocked(slot, cab.id);
      st.push({ type: 'cabinet', cab, x, unlocked, label: cab.name });
      x += 64;
    }
    x += 20;
    st.push({ type: 'bench', x, label: 'REPAIR BENCH' }); x += 70;
    st.push({ type: 'shop', x, label: "GARY'S LEGALLY DISTINCT PAWN SHOP" }); x += 84;
    st.push({ type: 'arcade', x, label: 'ARCADE CORNER' }); x += 70;
    st.push({ type: 'shelf', x, label: 'TROPHY SHELF' }); x += 70;
    if (totalPlugs(slot) >= 25) { st.push({ type: 'backroom', x, label: 'THE BACK ROOM (YOU DID NOT SEE THIS DOOR)' }); x += 70; }
    if (finaleUnlocked(slot) && !slot.campaign.storyFlags.sawEnding) st.push({ type: 'socket', x, label: 'THE SOCKET' });
    if (slot.campaign.storyFlags.sawEnding) st.push({ type: 'overtime', x, label: 'OVERTIME CABINET' });
    x += 80;
    this.width = Math.max(W, x);
    return st;
  }

  enter() {
    this.px = this.px ?? 40;
    this.t = 0;
    this.talk = null;
    Audio.setBank(HUB_THEME);
    Input.setButtons(Input.usingTouch ? [
      { id: 'left', x: 8, y: H - 48, w: 44, h: 40, action: 'left', label: '<' },
      { id: 'right', x: 60, y: H - 48, w: 44, h: 40, action: 'right', label: '>' },
      { id: 'use', x: W - 52, y: H - 48, w: 44, h: 40, action: 'confirm', label: 'USE' },
    ] : []);
  }
  exit() { Input.setButtons([]); }

  update(dt) {
    this.t += dt;
    const st = this.stations();
    if (Input.held('left')) { this.px -= 90 * dt; this.facing = -1; }
    if (Input.held('right')) { this.px += 90 * dt; this.facing = 1; }
    this.px = Math.max(20, Math.min(this.width - 20, this.px));
    const near = st.find((s) => Math.abs(s.x - this.px) < 26);
    this.near = near;
    if ((Input.pressed('confirm') || Input.pressed('jump')) && near) this.interact(near);
    // Talk to NPC heroes.
    const npc = this.npcs().find((n) => Math.abs(n.x - this.px) < 18);
    this.nearNpc = npc;
    if (Input.pressed('duck') && npc) {
      const lines = HUB_LINES[npc.id];
      const slot = this.save.slot;
      const seen = slot.hub.npcSeen[npc.id] || 0;
      this.talk = { text: lines[seen % lines.length], t: 3.2, who: npc.id };
      slot.hub.npcSeen[npc.id] = seen + 1;
      Audio.sfx('ui');
    }
    if (this.talk && (this.talk.t -= dt) <= 0) this.talk = null;
    if (Input.pressed('back')) this.flow.toTitle();
    if (Input.pressed('mute')) { this.save.settings.muted = !this.save.settings.muted; Audio.setMuted(this.save.settings.muted); }
    Input.pollGamepad();
    Input.endFrame();
  }

  interact(st) {
    Audio.sfx('uiConfirm');
    const slot = this.save.slot;
    if (st.type === 'cabinet') {
      if (!st.unlocked) {
        this.talk = { text: `NEEDS ${UNLOCKS[st.cab.id]} PLUGS. YOU HAVE ${totalPlugs(slot)}. THE MATH IS SINCERE.`, t: 3, who: null };
        return;
      }
      this.flow.openCabinet(st.cab);
    } else if (st.type === 'bench') this.flow.openBench();
    else if (st.type === 'shop') this.flow.openShop();
    else if (st.type === 'arcade') this.flow.openArcade();
    else if (st.type === 'socket') this.flow.startFinale();
    else if (st.type === 'overtime') this.flow.startOvertime();
    else if (st.type === 'backroom') this.flow.startOvertime((Date.now() & 0xfffff) ^ 0xbac);
    else if (st.type === 'shelf') {
      const toasters = Object.values(slot.campaign.plugs).filter((p) => p[2]).length;
      const sRanks = Object.values(slot.campaign.ranks).filter((r) => r === 'S' || r === 'CONCERNING').length;
      this.talk = { text: `TOASTERS: ${toasters}/27. S RANKS: ${sRanks}. DEATHS: ${slot.stats.deaths}. THE SHELF IS PROUD-ADJACENT.`, t: 4, who: null };
    }
  }

  npcs() {
    // Heroes loiter in the hub, spread by index; DUST DEVIL cleans impossible things.
    return HEROES.map((h, i) => ({ id: h.id, x: 110 + i * 90 + (i % 3) * 22 }));
  }

  draw(ctx) {
    const slot = this.save.slot;
    const act = actForSlot(slot);
    const cam = Math.max(0, Math.min(this.width - W, this.px - W / 2));
    ctx.fillStyle = '#14101c';
    ctx.fillRect(0, 0, W, H);
    // back wall + floor
    ctx.fillStyle = '#241c30';
    ctx.fillRect(0, 40, W, 150);
    ctx.fillStyle = '#38304a';
    ctx.fillRect(0, 190, W, 6);
    ctx.fillStyle = '#1c1626';
    ctx.fillRect(0, 196, W, H - 196);
    // checkered food-court floor
    for (let y = 0; y < 3; y++) {
      for (let x = -((cam) % 32); x < W; x += 32) {
        ctx.fillStyle = (Math.floor((x + cam) / 32) + y) % 2 === 0 ? '#241c30' : '#1c1626';
        ctx.fillRect(Math.round(x), 200 + y * 22, 32, 22);
      }
    }
    // ceiling lights: on per act
    for (let i = 0; i < 8; i++) {
      const lx = i * 130 - cam * 0.9;
      const on = i < act * 3;
      ctx.fillStyle = on ? '#f6d33c' : '#30303f';
      ctx.fillRect(Math.round(lx), 34, 26, 4);
      if (on) {
        const g = ctx.createLinearGradient(0, 38, 0, 140);
        g.addColorStop(0, 'rgba(246,211,60,0.10)'); g.addColorStop(1, 'rgba(246,211,60,0)');
        ctx.fillStyle = g;
        ctx.fillRect(Math.round(lx) - 14, 38, 54, 102);
      }
    }
    // stations
    for (const s of this.stations()) {
      const x = Math.round(s.x - cam);
      if (x < -80 || x > W + 40) continue;
      if (s.type === 'cabinet') {
        ctx.fillStyle = s.unlocked ? s.cab.ground : '#20242c';
        ctx.fillRect(x - 18, 110, 36, 82);
        ctx.fillStyle = s.unlocked ? '#0b0b14' : '#101018';
        ctx.fillRect(x - 14, 116, 28, 40);
        if (s.unlocked) {
          // tiny attract-mode shimmer in cabinet screens
          ctx.fillStyle = s.cab.sky[0];
          ctx.fillRect(x - 14, 116 + (Math.floor(this.t * 3) % 4) * 8, 28, 4);
        }
        const cleared = slot.campaign.cleared[s.cab.id];
        if (cleared) drawTextCentered(ctx, 'OK', x, 100, '#48c848');
      } else {
        ctx.fillStyle = s.type === 'shop' ? '#5a3a5a' : s.type === 'socket' ? '#f6d33c' : '#3a4a5a';
        ctx.fillRect(x - 22, 130, 44, 62);
        if (s.type === 'shop') {
          const gs = toonStandSprite('gary', 12, 16);
          ctx.imageSmoothingEnabled = true;
          ctx.drawImage(gs, x - 6, 148, 12, 16);
          ctx.imageSmoothingEnabled = false;
        }
        if (s.type === 'socket') {
          ctx.fillStyle = '#0b0b14';
          ctx.fillRect(x - 6, 146, 4, 8); ctx.fillRect(x + 2, 146, 4, 8);
        }
      }
    }
    // NPC heroes
    for (const n of this.npcs()) {
      const x = Math.round(n.x - cam);
      if (x < -20 || x > W + 20) continue;
      const spr = toonStandSprite(n.id, 12, 16);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(spr, x - 6, 176, 12, 16);
      ctx.imageSmoothingEnabled = false;
    }
    // DUST DEVIL cleaning something impossible (varies by act)
    const ddSpots = [[300, 178, 'THE FLOOR'], [520, 40, 'THE CEILING'], [720, 120, 'THE INSIDE OF A CRT']];
    const [dx, dy] = ddSpots[Math.min(act - 1, 2)];
    const dd = getSprite('dustdevil');
    if (dd) ctx.drawImage(dd, Math.round(dx - cam + Math.sin(this.t) * 8), dy);
    // player walks
    const heroId = slot.mods.equipped.includes('coupon') ? 'gary' : (this.flow.lastTeam && this.flow.lastTeam[0]) || 'lorenzo';
    const moving = Input.held('left') || Input.held('right');
    drawToon(ctx, heroId, {
      kind: moving ? 'run' : 'idle',
      phase: (this.t * 1.6) % 1,
      time: this.t,
      grounded: true,
      facing: this.facing || 1,
    }, Math.round(this.px - cam), 192, 24);
    // header
    drawText(ctx, 'THE LAST FUNCTIONING FOOD COURT', 8, 8, '#48e0c8');
    drawText(ctx, `PLUGS: ${totalPlugs(slot)}   COINS: ${slot.coins}   ACT ${act}`, 8, 20, '#c8c8d8');
    // prompts
    if (this.near) {
      const label = this.near.type === 'cabinet' && !this.near.unlocked
        ? `${this.near.label} (LOCKED: ${UNLOCKS[this.near.cab.id]} PLUGS)` : this.near.label;
      drawTextCentered(ctx, `${label} - ENTER/TAP USE`, W / 2, H - 60, '#f6d33c');
    } else if (this.nearNpc) {
      drawTextCentered(ctx, `${HERO_BY_ID[this.nearNpc.id].short} - PRESS DOWN TO TALK`, W / 2, H - 60, '#8a8a98');
    }
    if (this.talk) {
      const who = this.talk.who ? HERO_BY_ID[this.talk.who]?.short || '' : '';
      drawTextCentered(ctx, `${who ? who + ': ' : ''}${this.talk.text}`, W / 2, 60, '#d0f0e8');
    }
    for (const b of Input.buttons) {
      ctx.fillStyle = 'rgba(72,224,200,0.12)';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      drawTextCentered(ctx, b.label, b.x + b.w / 2, b.y + b.h / 2 - 3, '#48e0c8');
    }
  }
}

// --------------------------------------------------------------------------
function listMenu(state, opts) {
  if (Input.pressed('duck') || Input.pressed('right')) { state.idx = (state.idx + 1) % opts.length; Audio.sfx('ui'); }
  if (Input.pressed('jump') || Input.pressed('left')) { state.idx = (state.idx + opts.length - 1) % opts.length; Audio.sfx('ui'); }
  if (Input.pressed('confirm')) { Audio.sfx('uiConfirm'); return opts[state.idx]; }
  if (Input.pressed('pointer')) {
    const i = Math.floor((Input.pointer.y - state.listY) / state.rowH);
    if (i >= 0 && i < opts.length) {
      if (state.idx === i) { Audio.sfx('uiConfirm'); return opts[i]; }
      state.idx = i; Audio.sfx('ui');
    }
  }
  return null;
}

export class StageSelectState {
  constructor({ save, cab, flow }) { this.save = save; this.cab = cab; this.flow = flow; this.listY = 74; this.rowH = 26; }
  enter() { this.idx = 0; this.corrupt = null; Input.setMenuButtons(); }
  options() {
    const slot = this.save.slot;
    const opts = stagesForCabinet(this.cab.id).map((s) => ({ kind: 'stage', stage: s }));
    if (bossAvailable(slot, this.cab.id)) opts.push({ kind: 'boss' });
    if (slot.campaign.cleared[this.cab.id]) opts.push({ kind: 'corrupt' });
    opts.push({ kind: 'back' });
    return opts;
  }
  update(dt) {
    const sel = listMenu(this, this.options());
    if (sel) {
      if (sel.kind === 'stage') this.flow.pickTeam(this.cab, sel.stage, this.corrupt ? [this.corrupt] : []);
      else if (sel.kind === 'boss') this.flow.pickTeam(this.cab, null, [], true);
      else if (sel.kind === 'corrupt') {
        const cur = CORRUPTED_MODIFIERS.findIndex((m) => m.id === this.corrupt);
        this.corrupt = cur + 1 >= CORRUPTED_MODIFIERS.length ? null : CORRUPTED_MODIFIERS[cur + 1].id;
        if (cur === -1) this.corrupt = CORRUPTED_MODIFIERS[0].id;
      } else this.flow.toHub();
    }
    if (Input.pressed('back')) this.flow.toHub();
    Input.endFrame();
  }
  draw(ctx) {
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    drawTextCentered(ctx, this.cab.name, W / 2, 20, '#f6d33c', 2);
    drawTextCentered(ctx, `${this.cab.genre} CABINET - STYLE: ${this.cab.style.toUpperCase()}`, W / 2, 44, '#8a8a98');
    const slot = this.save.slot;
    this.options().forEach((o, i) => {
      const y = this.listY + i * this.rowH;
      const sel = i === this.idx;
      const c = sel ? '#f6d33c' : '#c8c8d8';
      if (o.kind === 'stage') {
        const plugs = slot.campaign.plugs[o.stage.id] || [];
        const rank = slot.campaign.ranks[o.stage.id];
        drawText(ctx, `${sel ? '> ' : '  '}${o.stage.id.toUpperCase()}  ${o.stage.mission.type.toUpperCase()}`, 40, y, c);
        drawText(ctx, `${plugs[0] ? 'M' : '-'}${plugs[1] ? 'C' : '-'}${plugs[2] ? 'T' : '-'}  ${rank || ''}`, W - 120, y, '#48e0c8');
        drawText(ctx, o.stage.mission.desc.slice(0, 52), 52, y + 10, '#5a5a68');
      } else if (o.kind === 'boss') {
        drawText(ctx, `${sel ? '> ' : '  '}BOSS: ${this.cab.id === 'neon' ? 'THE UNDERINSURED CLOWN-COPTER' : this.cab.id === 'rhythm' ? 'DUST DEVIL 9000' : 'THE FINAL POWER STRIP'}`, 40, y, sel ? '#e04848' : '#c05050');
      } else if (o.kind === 'corrupt') {
        const m = CORRUPTED_MODIFIERS.find((mm) => mm.id === this.corrupt);
        drawText(ctx, `${sel ? '> ' : '  '}CORRUPTED MODE: ${m ? m.name : 'OFF'}`, 40, y, sel ? '#8858c8' : '#6a5a8a');
        if (m) drawText(ctx, m.desc + ' (ONE-HIT RULES)', 52, y + 10, '#5a5a68');
      } else {
        drawText(ctx, `${sel ? '> ' : '  '}BACK`, 40, y, c);
      }
    });
  }
}

export class TeamSelectState {
  constructor({ save, flow, onGo }) { this.save = save; this.flow = flow; this.onGo = onGo; }
  enter() {
    this.picked = (this.flow.lastTeam || ['lorenzo', 'gnash', 'mochi']).slice(0, 3);
    this.idx = 0;
    this.t = 0;
    Input.setMenuButtons();
  }
  update(dt) {
    this.t += dt;
    const cols = 4;
    if (Input.pressed('right')) { this.idx = (this.idx + 1) % 8; Audio.sfx('ui'); }
    if (Input.pressed('left')) { this.idx = (this.idx + 7) % 8; Audio.sfx('ui'); }
    if (Input.pressed('duck')) { this.idx = (this.idx + cols) % 8; Audio.sfx('ui'); }
    if (Input.pressed('jump')) { this.idx = (this.idx + 8 - cols) % 8; Audio.sfx('ui'); }
    let toggled = null;
    if (Input.pressed('confirm')) toggled = HEROES[this.idx].id;
    if (Input.pressed('pointer')) {
      const p = Input.pointer;
      const gx = Math.floor((p.x - (W / 2 - 152)) / 76), gy = Math.floor((p.y - 60) / 74);
      if (gx >= 0 && gx < 4 && gy >= 0 && gy < 2) { this.idx = gy * 4 + gx; toggled = HEROES[this.idx].id; }
      if (p.y > H - 40 && this.picked.length === 3) { this.go(); toggled = null; }
    }
    if (toggled) {
      Audio.sfx('uiConfirm');
      if (this.picked.includes(toggled)) this.picked = this.picked.filter((h) => h !== toggled);
      else if (this.picked.length < 3) this.picked.push(toggled);
    }
    if (Input.pressed('ability') && this.picked.length === 3) this.go();
    if (Input.pressed('back')) this.flow.toHub();
    Input.endFrame();
  }
  go() { this.flow.lastTeam = this.picked.slice(); this.onGo(this.picked.slice()); }
  draw(ctx) {
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    drawTextCentered(ctx, 'CHOOSE YOUR RELAY TEAM (3)', W / 2, 16, '#fff', 2);
    const slot = this.save.slot;
    HEROES.forEach((h, i) => {
      const x = W / 2 - 152 + (i % 4) * 76, y = 60 + Math.floor(i / 4) * 74;
      const sel = i === this.idx;
      const inTeam = this.picked.includes(h.id);
      const order = this.picked.indexOf(h.id);
      ctx.fillStyle = inTeam ? '#1c3a34' : '#14141c';
      ctx.fillRect(x, y, 68, 64);
      ctx.strokeStyle = sel ? '#f6d33c' : inTeam ? '#48e0c8' : '#30303f';
      ctx.strokeRect(x + 0.5, y + 0.5, 68, 64);
      drawToon(ctx, h.id, {
        kind: 'idle',
        time: (this.t || 0) + i * 0.7,
        grounded: true,
        squash: sel ? 0.05 + 0.05 * Math.sin((this.t || 0) * 6) : 0,
      }, x + 18, y + 38, 32);
      drawText(ctx, h.short, x + 4, y + 42, inTeam ? '#48e0c8' : '#c8c8d8');
      if (inTeam) drawText(ctx, `#${order + 1}`, x + 52, y + 4, '#f6d33c');
      const m = slot.mastery[h.id];
      if (m && m.level > 0) drawText(ctx, `M${m.level}`, x + 4, y + 54, '#f890b8');
    });
    const h = HEROES[this.idx];
    drawTextCentered(ctx, `${h.name} - ${h.tagline}`, W / 2, 208, '#f6d33c');
    drawTextCentered(ctx, h.abilityDesc, W / 2, 220, '#c8c8d8');
    if (this.picked.length === 3) {
      drawTextCentered(ctx, '>>> START (X / SHIFT / TAP HERE) <<<', W / 2, H - 26, '#48c848');
    } else {
      drawTextCentered(ctx, `PICK ${3 - this.picked.length} MORE`, W / 2, H - 26, '#8a8a98');
    }
  }
}

export class BenchState {
  constructor({ save, flow }) { this.save = save; this.flow = flow; this.listY = 60; this.rowH = 20; }
  enter() { this.idx = 0; Input.setMenuButtons(); }
  options() {
    const slot = this.save.slot;
    const opts = BENCH_UPGRADES.map((u) => {
      const cur = slot.bench[u.id] || 0;
      // Power-up tracks start at level 1 (owned); relay tracks start at 0.
      const baseLevel = ['shield', 'magnet', 'star', 'slowmo'].includes(u.id) ? 1 : 0;
      const lvl = Math.max(cur, baseLevel);
      const nextIdx = lvl - baseLevel;
      const cost = u.levels[nextIdx];
      const maxed = lvl >= u.max + baseLevel - (baseLevel ? 0 : 0) && nextIdx >= u.levels.length || cost === undefined;
      return { u, lvl, cost, maxed, baseLevel };
    });
    opts.push({ back: true });
    return opts;
  }
  update(dt) {
    const sel = listMenu(this, this.options());
    if (sel) {
      if (sel.back) return this.flow.toHub();
      const slot = this.save.slot;
      if (!sel.maxed && sel.cost !== undefined && slot.coins >= sel.cost) {
        slot.coins -= sel.cost;
        slot.bench[sel.u.id] = sel.lvl + 1;
        this.save.persist();
        Audio.sfx('power');
      } else Audio.sfx('uiBad');
    }
    if (Input.pressed('back')) this.flow.toHub();
    Input.endFrame();
  }
  draw(ctx) {
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    drawTextCentered(ctx, 'THE REPAIR BENCH', W / 2, 16, '#f6d33c', 2);
    drawTextCentered(ctx, `COINS: ${this.save.slot.coins}`, W / 2, 40, '#f6d33c');
    this.options().forEach((o, i) => {
      const y = this.listY + i * this.rowH;
      const sel = i === this.idx;
      if (o.back) { drawText(ctx, `${sel ? '> ' : '  '}BACK`, 40, y, sel ? '#f6d33c' : '#c8c8d8'); return; }
      const c = sel ? '#f6d33c' : '#c8c8d8';
      const lvlText = 'I'.repeat(Math.max(1, o.lvl));
      drawText(ctx, `${sel ? '> ' : '  '}${o.u.name} [${lvlText}]`, 40, y, c);
      if (o.maxed || o.cost === undefined) drawText(ctx, 'MAX', W - 90, y, '#48c848');
      else drawText(ctx, `${o.cost}`, W - 90, y, this.save.slot.coins >= o.cost ? '#f6d33c' : '#5a5a68');
      if (sel && !o.maxed && o.u.desc[o.lvl - o.baseLevel]) drawTextCentered(ctx, o.u.desc[o.lvl - o.baseLevel], W / 2, H - 20, '#8a8a98');
    });
  }
}

export class ShopState {
  constructor({ save, flow }) { this.save = save; this.flow = flow; this.listY = 60; this.rowH = 18; }
  enter() { this.idx = 0; this.line = PAWN_LINES[Math.floor(Math.random() * PAWN_LINES.length)]; Input.setMenuButtons(); }
  options() {
    const slot = this.save.slot;
    const opts = MODS.filter((m) => m.source === 'shop' || slot.mods.found.includes(m.id)).map((m) => {
      const owned = slot.mods.found.includes(m.id) || (m.source === 'mastery' && (slot.mastery[m.hero]?.level || 0) >= 2);
      const equipped = slot.mods.equipped.includes(m.id);
      const price = m.price ? Math.round(m.price * (slot.mods.equipped.includes('coupon') ? 0.75 : 1)) : 0;
      return { m, owned, equipped, price };
    });
    // Mastery sidegrades appear once unlocked.
    for (const m of MODS.filter((mm) => mm.source === 'mastery')) {
      if ((slot.mastery[m.hero]?.level || 0) >= 2 && !opts.some((o) => o.m.id === m.id)) {
        opts.push({ m, owned: true, equipped: slot.mods.equipped.includes(m.id), price: 0 });
      }
    }
    opts.push({ back: true });
    return opts;
  }
  update(dt) {
    const sel = listMenu(this, this.options());
    if (sel) {
      if (sel.back) return this.flow.toHub();
      const slot = this.save.slot;
      if (!sel.owned) {
        if (slot.coins >= sel.price) {
          slot.coins -= sel.price;
          slot.mods.found.push(sel.m.id);
          if (sel.m.id === 'thirdslot') slot.mods.slots = 3;
          Audio.sfx('power');
        } else Audio.sfx('uiBad');
      } else if (sel.m.id !== 'thirdslot') {
        if (sel.equipped) slot.mods.equipped = slot.mods.equipped.filter((id) => id !== sel.m.id);
        else if (slot.mods.equipped.length < slot.mods.slots) slot.mods.equipped.push(sel.m.id);
        else Audio.sfx('uiBad');
        Audio.sfx('ui');
      }
      this.save.persist();
    }
    if (Input.pressed('back')) this.flow.toHub();
    Input.endFrame();
  }
  draw(ctx) {
    ctx.fillStyle = '#100a14';
    ctx.fillRect(0, 0, W, H);
    drawTextCentered(ctx, "GARY'S LEGALLY DISTINCT PAWN SHOP", W / 2, 14, '#f890b8', 1);
    drawTextCentered(ctx, this.line, W / 2, 28, '#5a5a68');
    const slot = this.save.slot;
    drawTextCentered(ctx, `COINS: ${slot.coins}   EQUIPPED: ${slot.mods.equipped.length}/${slot.mods.slots}`, W / 2, 44, '#f6d33c');
    this.options().forEach((o, i) => {
      const y = this.listY + i * this.rowH;
      const sel = i === this.idx;
      if (o.back) { drawText(ctx, `${sel ? '> ' : '  '}BACK`, 30, y, sel ? '#f6d33c' : '#c8c8d8'); return; }
      const c = o.equipped ? '#48e0c8' : sel ? '#f6d33c' : o.owned ? '#c8c8d8' : '#8a8a98';
      drawText(ctx, `${sel ? '> ' : '  '}${o.equipped ? '[E] ' : ''}${o.m.name}`, 30, y, c);
      if (!o.owned) drawText(ctx, `${o.price}`, W - 70, y, slot.coins >= o.price ? '#f6d33c' : '#5a5a68');
      if (sel) drawTextCentered(ctx, (o.m.desc || 'A MASTERY SIDEGRADE. IT KNOWS WHAT IT DID.').slice(0, 70), W / 2, H - 18, '#8a8a98');
    });
  }
}

export class ArcadeState {
  constructor({ save, flow }) { this.save = save; this.flow = flow; this.listY = 60; this.rowH = 18; }
  enter() { this.idx = 0; Input.setMenuButtons(); }
  options() {
    const seen = this.save.slot.campaign.storyFlags.minigamesSeen || [];
    const opts = MINIGAMES.filter((m) => seen.includes(m)).map((m) => ({ game: m }));
    if (!opts.length) opts.push({ none: true });
    opts.push({ back: true });
    return opts;
  }
  update(dt) {
    const sel = listMenu(this, this.options());
    if (sel) {
      if (sel.back || sel.none) return this.flow.toHub();
      this.flow.playMinigame(sel.game, true);
    }
    if (Input.pressed('back')) this.flow.toHub();
    Input.endFrame();
  }
  draw(ctx) {
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    drawTextCentered(ctx, 'ARCADE CORNER', W / 2, 16, '#48e0c8', 2);
    drawTextCentered(ctx, 'REPLAY BREAKER-BOX GAMES. WIN: +100 COINS.', W / 2, 40, '#8a8a98');
    this.options().forEach((o, i) => {
      const y = this.listY + i * this.rowH;
      const sel = i === this.idx;
      const label = o.back ? 'BACK' : o.none ? 'NOTHING UNLOCKED YET. POWER ON A CABINET.' : MINIGAME_NAMES[o.game];
      drawText(ctx, `${sel ? '> ' : '  '}${label}`, 40, y, sel ? '#f6d33c' : '#c8c8d8');
    });
  }
}
