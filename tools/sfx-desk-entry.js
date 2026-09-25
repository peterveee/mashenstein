// THE SFX DESK, browser half: `npm run sfx`.
//
// One question, asked over and over: does this cue sit right against the song
// the player will hear it over? The cue sheet answers it on a meter; only a
// speaker answers it for real, and only against a bed — a cue that measures
// fine over silence can still disappear under a blizzard or jump out of a
// sparse verse.
//
// So: pick a song, hit play, and fire cues over it. Every cue has a fader that
// moves its SFX_TRIM live, without a rebuild — that is the whole reason
// audio.js exports the table. AUTO walks the list on a timer so a pass is
// listening rather than clicking, and whatever stands out can be caught with
// the fader under it.
//
// Nothing is written until Save. The server half then rewrites the numbers in
// src/engine/audio.js, which is the same deal the song mixer offers.
import {
  Audio, SFX_TRIM, setSfxTrim,
  WEAPON_AUDIO_GAIN, setWeaponGain, setAttackTrim, ATTACK_MASTER_TRIM,
} from '../src/engine/audio.js';
import { CONTACT_CUE, LAUNCH_CUE } from '../src/engine/weapon-sfx.js';
import { HEROES } from '../src/data/heroes.js';
import { resolveTrack, listTracks } from '../src/data/tracks.js';
import { MIX } from '../src/data/mix.js';
// When each cue was born, from the repository's own history — see
// tools/sfx-birthdays.js. A levelling pass is also an archaeology session: the
// cues that have never been touched since day one are exactly the ones nobody
// has ever compared against anything.
import { sfxBorn } from '../src/data/sfx-birthdays.js';

// ---------------------------------------------------------------- the cues
//
// Grouped the way the lane groups them, because a levelling pass is comparative
// and the comparison that matters is within a family: every pickup against the
// other pickups, every breakage against the other breakages.
//
// `gain` is the multiplier the GAME passes at the call site, reproduced here so
// the desk fires each cue exactly as loud as the lane does. A cue with no gain
// here is fired plain. `opt` carries anything else the cue needs to sound like
// itself (a hero for a weapon, a material for debris, a count for a spray).
const GROUPS = [
  {
    name: 'Hero & movement',
    cues: [
      { cue: 'jump', what: 'every jump, ground or air' },
      { cue: 'jump2', what: 'the second jump of a double' },
      { cue: 'land', what: 'landing' },
      { cue: 'slide', what: 'going into a slide' },
      { cue: 'dash', what: 'a dash ability' },
      { cue: 'girderBoing', what: 'a springboard girder under a jump' },
      { cue: 'boost', what: 'a boost pad, a spring, the loop ride' },
      { cue: 'boostTick', what: 'a boost pad arming', opt: { pitch: 1.1 } },
      { cue: 'boostFall', what: 'a boost pad winding down after a miss' },
      { cue: 'loopRun', what: 'running the loop ring' },
      { cue: 'slideWhistle', what: 'slipping on ice; the finish pole' },
      { cue: 'clickHard', what: 'the finish plunger bottoming out' },
      { cue: 'plop', what: 'Ramon scattering; the boss dropping in' },
    ],
  },
  {
    name: 'Abilities',
    cues: [
      { cue: 'impact', what: 'a weapon connecting, for a hero with no baked cue' },
      { cue: 'axe', what: "Grumpos' axe leaving his hand" },
      { cue: 'shield', what: 'a roll shield; a hit absorbed' },
      { cue: 'chomp', what: 'Chompo biting' },
      { cue: 'waka', what: 'one bite of a chomp', opt: { pitch: 0.92 } },
      { cue: 'shoot', what: 'a shooter drone firing at you' },
      { cue: 'abilityReady', what: 'a cooldown coming back' },
      { cue: 'star', what: 'invincibility starting' },
      { cue: 'starEnd', what: 'invincibility running out' },
    ],
  },
  {
    name: 'Hazards, breakage & damage',
    cues: [
      { cue: 'popSmall', what: 'the ?-crate coin ladder', gain: 3.0, opt: { pitch: 1.12 } },
      { cue: 'switchFlick', what: 'the power block being hit' },
      { cue: 'stripThrow', what: 'the master strip being thrown off, in the opening film' },
      { cue: 'socketDrop', what: 'one plug leaving the MCGFN-1 bank, in the opening film' },
      { cue: 'bridgeLay', what: 'the ice deck laying across the break' },
      { cue: 'trapSnap', what: 'a bear trap', gain: 0.72 },
      { cue: 'boom', what: 'an explosion; a card box bursting', gain: 1.5 },
      { cue: 'thunder', what: 'the lightning strike that turns neon-1 to night' },
      { cue: 'cameraClick', what: 'the speed camera taking your picture on speed-2' },
      { cue: 'blockBreak', what: 'a crate or ?-crate breaking' },
      { cue: 'copterBonk', what: 'bonking the clown-copter' },
      { cue: 'boxKick', what: "the card box's crack; the plow", gain: 0.65 },
      { cue: 'hit', what: 'taking damage' },
      { cue: 'dogBark', what: 'the finish dog' },
      { cue: 'die', what: 'losing a life' },
      { cue: 'crunch', what: 'scenery breaking; the pit landing' },
      { cue: 'barrelBurst', what: 'a barrel bursting' },
      { cue: 'punt', what: 'booting a cone or barrel' },
      { cue: 'debris', what: 'chunks hitting the floor', opt: { mat: 'wood' } },
    ],
  },
  {
    name: 'Pickups & progress',
    cues: [
      { cue: 'coin', what: 'a coin, mid-combo', opt: { combo: 4 } },
      { cue: 'coinSpray', what: 'a burst of coins', opt: { count: 6 } },
      { cue: 'power', what: 'a capsule collected' },
      { cue: 'powerDown', what: 'the arcade power going out' },
      { cue: 'rewindPickup', what: 'the rewind capsule' },
      { cue: 'win', what: 'a cord piece or mission item' },
      { cue: 'perfect', what: 'a perfect flip or beat hit' },
      { cue: 'checkpoint', what: 'passing a checkpoint' },
      { cue: 'tag', what: 'the relay hand-off landing' },
      { cue: 'portal', what: 'the relay portal, going out', gain: 5.5 },
    ],
  },
  // EVERYTHING THAT IS NOT IN THE LANE, which used to be nothing at all.
  //
  // This desk was built for levelling a run — a cue is only ever too loud or
  // too quiet against the song you hear it over, and the song is playing in a
  // stage. But half the sounds in this game are made while nothing is playing:
  // a menu moving, a purchase, the title sign buzzing, a minigame ending. They
  // are levelled against silence and against each other, which is a real
  // comparison and one nobody could make here, because the rows did not exist.
  //
  // Set the song picker to 'no song' for these; the AUTO walk covers them like
  // anything else.
  {
    name: 'UI & menus',
    cues: [
      { cue: 'ui', what: 'moving the cursor; any menu step' },
      { cue: 'uiConfirm', what: 'confirming a choice' },
      { cue: 'uiBad', what: 'a refusal — locked, unaffordable, not yet' },
      { cue: 'type', what: 'text arriving a letter at a time' },
      { cue: 'cash', what: 'a purchase going through in the shop' },
      // The pair belongs together on the desk: they are levelled against each
      // other, so auditioning either one alone tells you very little.
      { cue: 'doorOpen', what: 'the EXIT / Trophy Room door letting you through' },
      { cue: 'doorClose', what: 'the same door shutting once you walk off' },
      // The hinged pair (Arcade Corner, back room) — a closer's spring, not the
      // sliding pair's pneumatics. Levelled against those two, so all four rows
      // want hearing together.
      { cue: 'doorSwingOpen', what: 'the Arcade Corner / back room door swinging open' },
      { cue: 'doorSwingShut', what: 'the same hinged door swinging back' },
    ],
  },
  {
    name: 'Title, attract & celebration',
    cues: [
      { cue: 'comet', what: 'a comet crossing the title sky' },
      { cue: 'neonBuzz', what: 'the title sign faulting' },
      { cue: 'fizzUp', what: 'a firework shell going up' },
      { cue: 'popBig', what: 'a big shell bursting' },
      { cue: 'crackle', what: 'the crackle tail of a burst' },
      { cue: 'static', what: 'an unplugged arcade screen fizzing' },
      { cue: 'crowdCheer', what: 'the cast getting a crowd reaction' },
    ],
  },
  {
    name: 'Flow & endings',
    cues: [
      { cue: 'win', what: 'a stage won' },
      { cue: 'lose', what: 'a minigame lost' },
      { cue: 'pacDeath', what: 'the tutorial death jingle' },
    ],
  },
];

// ------------------------------------------------------------ the weapons
//
// EVERY HERO SEPARATELY, because they are separate sounds: Clara's double pew
// and Kiko's warning-shot crack are different cues from different files, and a
// single `launch` fader moved all eleven of them at once — which is exactly the
// thing you cannot level with. A hero's weapon is two numbers and the desk
// exposes both: the FAMILY trim at the top of the group (every launch and every
// contact together, ATTACK_MASTER_TRIM) and then this hero's own place inside it
// (WEAPON_AUDIO_GAIN).
//
// Built from the engine's own CONTACT_CUE / LAUNCH_CUE tables rather than a list
// typed here, so a hero who gains a cue appears on the desk by existing.
const heroName = (id) => (HEROES[id]?.name || id).toUpperCase();
const weaponRows = (kind, table, verb) => Object.keys(table)
  .filter((hero) => hero in WEAPON_AUDIO_GAIN[kind])
  .sort()
  .map((hero) => ({
    cue: kind,
    id: `${kind}:${hero}`,
    weapon: { kind, hero },
    what: `${heroName(hero)} — ${verb}`,
    opt: { hero },
  }));

GROUPS.splice(1, 0, {
  name: 'Weapons — firing',
  cues: [
    { cue: 'launch', id: 'attack-family', attack: true, silent: true,
      what: 'ALL WEAPONS — the family trim under every row below' },
    ...weaponRows('launch', LAUNCH_CUE, 'firing'),
  ],
});
GROUPS.splice(2, 0, {
  name: 'Weapons — connecting',
  cues: weaponRows('contact', CONTACT_CUE, 'connecting'),
});

const ROWS = GROUPS.flatMap((g) => g.cues.map((c) => ({ ...c, id: c.id || c.cue, group: g.name })));
const db = (mult) => (mult > 0 ? 20 * Math.log10(mult) : -60);
const mult = (d) => Math.pow(10, d / 20);

// ONE ROW, ONE NUMBER, whichever table that number lives in — a plain cue's
// SFX_TRIM, a hero's WEAPON_AUDIO_GAIN, or the weapon family's own trim. Keyed
// by ROW rather than by cue name, because eleven rows now share the cue name
// `launch` and each of them has to move on its own.
const valueOf = (r) => (r.attack ? ATTACK_MASTER_TRIM
  : r.weapon ? (WEAPON_AUDIO_GAIN[r.weapon.kind][r.weapon.hero] ?? 1)
    : (SFX_TRIM[r.cue] ?? 1));
const applyTo = (r, v) => (r.attack ? setAttackTrim(v)
  : r.weapon ? setWeaponGain(r.weapon.kind, r.weapon.hero, v)
    : setSfxTrim(r.cue, v));

// Where each number stood on disk, so Save knows what actually moved and Reset
// has something to go back to.
const BASE = {};
for (const r of ROWS) BASE[r.id] = valueOf(r);
const live = { ...BASE };

// ------------------------------------------------------------------ the page
const $ = (sel) => document.querySelector(sel);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

const TRACKS = listTracks().filter((t) => t.group === 'cabinet' || ['hub', 'title', 'finale', 'shop', 'megamix'].includes(t.id));
let playing = null;          // the track id currently under the cues
let autoTimer = null;
let autoAt = 0;
let armed = false;           // has the context been unlocked by a gesture

function ensureAudio() {
  if (armed) return;
  Audio.ensure();
  Audio.resumeAfterPanic?.();
  armed = true;
}

// START OR RESTART, always from the top. Stop leaves the PICKER alone — it is
// the choice of bed, not the transport — so pressing Play after a Stop puts the
// same song back on. Without that split there was no way back: stopping cleared
// the selection, and re-picking the song already showing fires no change event,
// so the desk sat in silence with no button that would start it again.
function startSong(id) {
  ensureAudio();
  if (!id) return stopSong();
  const t = resolveTrack(id);
  if (!t) return;
  Audio.setBank(t.bank, MIX[id] || null, undefined, { startAtBeginning: true });
  playing = id;
  paintTransport();
}

function stopSong() {
  Audio.setBank(null);
  playing = null;
  paintTransport();
}

function fire(row) {
  ensureAudio();
  // The family row is a fader, not a cue. Firing it plays the hero under it so
  // the knob still answers when you press it.
  if (row.silent) return fire(ROWS.find((r) => r.weapon && r.weapon.kind === 'launch') || row.opt && row);
  const opt = { ...(row.opt || {}) };
  if (row.gain != null) opt.gain = row.gain;
  Audio.sfx(row.cue, opt);
  const node = document.getElementById(`row-${row.id}`);
  if (!node) return;
  node.classList.add('lit');
  setTimeout(() => node.classList.remove('lit'), 220);
}

// ------------------------------------------------------------------- faders
function setKnob(row, value) {
  const v = Math.max(0.01, Math.min(4, value));
  live[row.id] = v;
  applyTo(row, v);
  const node = document.getElementById(`row-${row.id}`);
  if (node) {
    node.querySelector('.val').textContent = `${db(v) >= 0 ? '+' : ''}${db(v).toFixed(1)} dB`;
    node.querySelector('input[type=range]').value = db(v).toFixed(1);
    node.classList.toggle('moved', Math.abs(db(v) - db(BASE[row.id])) >= 0.05);
  }
  paintSaveState();
}

function movedRows() {
  return ROWS.filter((r) => Math.abs(db(live[r.id]) - db(BASE[r.id])) >= 0.05);
}

function paintSaveState() {
  const moved = movedRows();
  const btn = $('#save');
  btn.disabled = moved.length === 0;
  btn.textContent = moved.length === 0 ? 'Save' : `Save ${moved.length} change${moved.length === 1 ? '' : 's'}`;
  $('#dirty').textContent = moved.length === 0 ? 'nothing moved'
    : moved.map((r) => `${r.id} ${db(live[r.id]) >= 0 ? '+' : ''}${db(live[r.id]).toFixed(1)}`).join('  ·  ');
}

// --------------------------------------------------------------------- auto
// AUTO is the point of the tool. Levelling by hand means clicking forty-four
// buttons and forgetting what the last one sounded like; the walk plays them in
// order at a steady interval so the ear compares neighbours, and the row it is
// on is highlighted so an outlier can be caught and moved without stopping.
function autoStep() {
  const list = autoScope();
  if (!list.length) return;
  autoAt = autoAt % list.length;
  const row = list[autoAt];
  fire(row);
  const node = document.getElementById(`row-${row.id}`);
  document.querySelectorAll('.row.walking').forEach((n) => n.classList.remove('walking'));
  if (node) {
    node.classList.add('walking');
    node.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  autoAt += 1;
}

function autoScope() {
  const g = $('#scope').value;
  return g === 'all' ? ROWS : ROWS.filter((r) => r.group === g);
}

function toggleAuto() {
  if (autoTimer) {
    clearInterval(autoTimer);
    autoTimer = null;
    document.querySelectorAll('.row.walking').forEach((n) => n.classList.remove('walking'));
  } else {
    ensureAudio();
    const ms = Number($('#every').value) * 1000;
    autoStep();
    autoTimer = setInterval(autoStep, ms);
  }
  $('#auto').classList.toggle('on', !!autoTimer);
  $('#auto').textContent = autoTimer ? 'Stop' : 'Auto';
}

function paintTransport() {
  const picked = $('#song').value;
  $('#nowplaying').textContent = playing
    ? `playing ${resolveTrack(playing)?.title || playing}`
    : (picked ? `stopped — ${resolveTrack(picked)?.title || picked}` : 'no bed — cues over silence');
  $('#stop').disabled = !playing;
  $('#play').disabled = !picked;
  $('#play').textContent = playing ? 'Restart' : 'Play';
}

// ------------------------------------------------------------------- render
function build() {
  const app = $('#app');

  for (const g of GROUPS) {
    const sec = el('section');
    sec.appendChild(el('h2', null, g.name));
    const list = el('div', 'rows');
    for (const c of g.cues) {
      const row = el('div', 'row');
      row.id = `row-${c.id || c.cue}`;
      const row0 = ROWS.find((r) => r.id === (c.id || c.cue));
      const play = el('button', 'play', '▶');
      play.title = 'fire this cue';
      play.addEventListener('click', () => fire(row0));
      const name = el('div', 'name');
      name.appendChild(el('span', 'cue', c.cue));
      name.appendChild(el('span', 'what', c.what));
      // WHEN THE CUE WAS ADDED, in a column of its own rather than tucked under
      // the name: it lines up down the group, so a family whose dates all read
      // 2026-07-19 is visibly day-one furniture and the one row from last week
      // is visibly the new arrival. That is the thing worth seeing at a glance
      // in a levelling pass — the recent ones are where the outliers live.
      const born = sfxBorn(c.cue);
      const added = el('div', 'added', born || 'uncommitted');
      added.title = born ? `first appeared in the repository on ${born}` : 'not committed yet';
      if (!born) added.classList.add('new');
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = '-24';
      slider.max = '12';
      slider.step = '0.1';
      slider.value = db(live[row0.id]).toFixed(1);
      slider.id = `fader-${row0.id}`;
      slider.addEventListener('input', () => setKnob(row0, mult(Number(slider.value))));
      // Nudge from the keyboard once a fader has focus: levelling happens in
      // tenths, and a mouse cannot reliably hit one.
      const val = el('div', 'val', `${db(live[row0.id]) >= 0 ? '+' : ''}${db(live[row0.id]).toFixed(1)} dB`);
      if (c.attack) row.classList.add('family');
      row.append(play, name, added, slider, val);
      list.appendChild(row);
    }
    sec.appendChild(list);
    app.appendChild(sec);
  }

  // Songs, grouped the way the picker in the mixer groups them.
  const pick = $('#song');
  pick.appendChild(new Option('— no song, cues over silence —', ''));
  for (const t of TRACKS) pick.appendChild(new Option(t.title || t.id, t.id));
  pick.addEventListener('change', () => startSong(pick.value));

  const scope = $('#scope');
  scope.appendChild(new Option('every cue', 'all'));
  for (const g of GROUPS) scope.appendChild(new Option(g.name, g.name));

  $('#play').addEventListener('click', () => startSong($('#song').value));
  $('#stop').addEventListener('click', stopSong);
  $('#auto').addEventListener('click', toggleAuto);
  $('#reset').addEventListener('click', () => {
    for (const r of ROWS) setKnob(r, BASE[r.id]);
  });
  $('#save').addEventListener('click', save);
  // Space fires the cue the walk is on, so a pass can be done one-handed.
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (e.code === 'Space') { e.preventDefault(); autoStep(); }
  });

  paintTransport();
  paintSaveState();
}

async function save() {
  const changes = { trims: {}, weapons: { launch: {}, contact: {} }, attack: null };
  for (const r of movedRows()) {
    const v = Number(live[r.id].toFixed(3));
    if (r.attack) changes.attack = v;
    else if (r.weapon) changes.weapons[r.weapon.kind][r.weapon.hero] = v;
    else changes.trims[r.cue] = v;
  }
  $('#save').disabled = true;
  $('#status').textContent = 'saving…';
  try {
    const res = await fetch('/save', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(changes),
    });
    const out = await res.json();
    if (!res.ok || out.error) throw new Error(out.error || res.statusText);
    for (const r of movedRows()) BASE[r.id] = live[r.id];
    $('#status').textContent = `written to audio.js — ${out.written} cue${out.written === 1 ? '' : 's'}`;
  } catch (err) {
    $('#status').textContent = `save failed: ${err.message}`;
  }
  paintSaveState();
}

build();
