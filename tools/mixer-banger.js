// MAKE A BANGER… — the desk's half. 2 Oct 2026.
//
// The dialog, Make It, and the take buttons. The music comes from tools/lib/banger/ —
// run right here in the page, so the static desk can make one too and a change to the
// generator needs a refresh rather than a server restart — and the server only writes
// the file it makes (POST /make-banger, /banger-take; see tools/lib/banger-file.js).
//
// Kept out of mixer-entry.js on purpose: everything the desk owns (its drafts, its saved
// copies, its selection, its transport) is handed in as `desk`, so this file never
// reaches into the desk's variables and the desk only has a few lines of wiring.
import {
  BANGER_STYLES, BANGER_MOODS, BANGER_MODES, moodBass, BANGER_RIFF_NOTES, MOOD_MODES, BANGER_VARIATIONS, BANGER_LENGTHS, BANGER_TEMPOS,
  BANGER_GROUPS, BANGER_LIMITS, normaliseBangerOptions, surpriseBangerOptions, styleDefaults,
  styleFor, generateBanger, validateRiff, riffSummary, randomBangerSeed, keyName, parseRiff,
  bangerBars, bangerBpm, BANGER_GENERATOR_VERSION,
} from './lib/banger/index.js';
import { analyseRiff } from './lib/banger/analyse.js';
import { BANGER_COMBOS } from './lib/banger/combos.js';
import { Rng } from '../src/engine/rng.js';

/** What the dialog was last asked for — everything but the bars, which are the selection's. */
export const BANGER_PREFS_KEY = 'mash-mixer-banger';
/** The static desk's takes: per song, the seed and options of every take it has made. */
export const BANGER_TAKES_KEY = 'mash-mixer-banger-takes';

const readStore = (key) => { try { return JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch { return {}; } };
const writeStore = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* full or blocked */ } };
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

/**
 * The banger desk. `desk` is everything the desk owns that this needs:
 *
 *   $, ask, tell, toast, escapeHtml, closeMenu, isStatic()
 *   current()            { id, track } — the song on the desk
 *   barCount()           bars in the song on the desk
 *   readRiff(from, to)   the riff in those bars, as the desk hears them (0-based, inclusive)
 *   listTracks()         every song, for a title nothing is using
 *   adopt({ track, mix, arrangement, local })   take a song in: register it, mark its
 *                        mix and arrangement as saved, drop any draft it had
 *   selectSong(id), play()
 *   isDirty(id)
 *   slugForClient(title)
 */
export function createBangerDesk(desk) {
  const { $, ask, tell, toast, escapeHtml, closeMenu } = desk;

  // ---------------------------------------------------------------- the dialog
  const sel = (value, want) => (String(value) === String(want) ? ' selected' : '');
  const toggle = (group, f, on) => `<label class="askcheck askcheck-toggle" title="${escapeHtml(f.title || f.label)}">`
    + `<input type="checkbox" data-group="${group}" data-key="${f.key}"${on ? ' checked' : ''}>`
    + `<span class="fxswitch${on ? ' on' : ''}" aria-hidden="true"><i></i></span><span>${escapeHtml(f.label)}</span></label>`;
  const select = (group, f, value) => `<label class="askfield" title="${escapeHtml(f.title || f.label)}">${escapeHtml(f.label)}`
    + `<select data-group="${group}" data-key="${f.key}">`
    + f.options.map(([id, label]) => `<option value="${id}"${sel(value, id)}>${escapeHtml(label)}</option>`).join('')
    + '</select></label>';

  /**
   * The Mode list, marked for the mood: which modes suit it, which fight it. Guidance —
   * every mode stays choosable.
   */
  function modeOptions(mood, value) {
    const pair = MOOD_MODES[mood] || { suits: [], fights: [] };
    const moodLabel = BANGER_MOODS.find((m) => m.id === mood)?.label || mood;
    return BANGER_MODES.map((k) => {
      const note = pair.suits.includes(k.id) ? `suits ${moodLabel}` : pair.fights.includes(k.id) ? `fights ${moodLabel}` : '';
      return `<option value="${k.id}"${sel(value, k.id)}${note ? ` data-note="${note}"` : ''}>${k.label}</option>`;
    }).join('');
  }

  /** The Sounds list: the style's own, then its Sound Combos (saved from bangers tuned on the desk). */
  function comboOptions(styleId, value) {
    return `<option value=""${value ? '' : ' selected'}>Style Sounds</option>`
      + Object.entries(BANGER_COMBOS[styleId] || {}).map(([id, c]) => `<option value="${id}"${sel(value, id)}>${escapeHtml(c.label)}</option>`).join('');
  }
  /** Sounds is only asked where the style has a combo to offer. */
  function syncCombos(styleId, value = '') {
    const select = $('bgcombo');
    if (!select) return;
    select.innerHTML = comboOptions(styleId, value);
    select.value = BANGER_COMBOS[styleId]?.[value] ? value : '';
    $('bgcombofield').hidden = !Object.keys(BANGER_COMBOS[styleId] || {}).length;
  }

  function bodyHtml(o, { from, to, settings }) {
    const style = styleFor(o.style);
    const lengthOpts = BANGER_LENGTHS.map((l) => `<option value="${l.id}"${sel(o.length, l.id)}>${l.label}${l.bars ? ` · ${l.bars} bars` : ''}</option>`).join('');
    return '<div class="bangergrid">'
      + `<label class="askfield">Style<select id="bgstyle">${BANGER_STYLES.map((s) => `<option value="${s.id}"${sel(o.style, s.id)}>${escapeHtml(s.label)}</option>`).join('')}</select></label>`
      + `<label class="askfield" id="bgcombofield" title="The style's own sounds, or a Sound Combo saved from a banger tuned on the desk"${Object.keys(BANGER_COMBOS[o.style] || {}).length ? '' : ' hidden'}>Sounds<select id="bgcombo">${comboOptions(o.style, o.combo)}</select></label>`
      + `<label class="askfield">Mood<select id="bgmood">${BANGER_MOODS.map((m) => `<option value="${m.id}"${sel(o.mood, m.id)}>${m.label}</option>`).join('')}</select></label>`
      + `<label class="askfield" title="Major or minor with one note changed — that note is the flavour">Mode<select id="bgmode">${modeOptions(o.mood, o.mode)}</select></label>`
      + `<label class="askfield" id="bgriffnotesfield" title="What the mode may do to your riff's own notes">Riff Notes<select id="bgriffnotes">${BANGER_RIFF_NOTES.map((k) => `<option value="${k.id}"${sel(o.riffNotes, k.id)}>${k.label}</option>`).join('')}</select></label>`
      + `<label class="askfield">Length<select id="bglength">${lengthOpts}</select></label>`
      + `<label class="askfield" id="bgcustomfield">Bars<input id="bgcustom" type="number" min="${BANGER_LIMITS.minBars}" max="${BANGER_LIMITS.maxBars}" step="${BANGER_LIMITS.barStep}" value="${o.customBars}"></label>`
      + `<label class="askfield">Tempo<select id="bgtempo">${BANGER_TEMPOS.map((t) => `<option value="${t.id}"${sel(o.tempo, t.id)}>${t.label}</option>`).join('')}</select></label>`
      + `<label class="askfield" id="bgbpmfield">BPM<input id="bgbpm" type="number" min="${BANGER_LIMITS.minBpm}" max="${BANGER_LIMITS.maxBpm}" step="1" value="${o.bpm ?? style.bpm}"></label>`
      + `<label class="askfield">From Bar<input id="bgfrom" type="number" min="1" step="1" value="${from + 1}"${settings ? ' disabled' : ''}></label>`
      + `<label class="askfield">To Bar<input id="bgto" type="number" min="1" step="1" value="${to + 1}"${settings ? ' disabled' : ''}></label>`
      + '</div>'
      + '<div class="bangerrow"><span class="bangerlabel">Variation</span><div class="askseg" id="bgvariation" role="group" aria-label="Variation">'
      + BANGER_VARIATIONS.map((v) => `<button type="button" data-value="${v.id}" title="${escapeHtml(v.title)}" aria-pressed="${o.variation === v.id}" class="${o.variation === v.id ? 'on' : ''}">${v.label}</button>`).join('')
      + '</div><button type="button" id="bgsurprise" class="bangersurprise" title="Roll the mood, mode, variation, tempo, usually the riff sound, and a few spice switches">Surprise Me</button></div>'
      + '<div class="bangerriff" id="bgriff"></div>'
      + '<details class="bangermore" id="bgmore"><summary>More Options</summary><div class="bangergroups">'
      + BANGER_GROUPS.map((g) => `<fieldset class="bangergroup"><legend>${escapeHtml(g.label)}</legend>`
        + g.fields.map((f) => (f.type === 'select' ? select(g.id, f, o[g.id][f.key]) : toggle(g.id, f, o[g.id][f.key]))).join('')
        + '</fieldset>').join('')
      + '</div></details>';
  }

  /** The request the dialog is showing. */
  function readDialog(box) {
    const raw = {
      style: $('bgstyle').value, mood: $('bgmood').value,
      mode: $('bgmode').value, riffNotes: $('bgriffnotes').value,
      length: $('bglength').value, customBars: Number($('bgcustom').value),
      tempo: $('bgtempo').value, bpm: Number($('bgbpm').value),
      variation: box.querySelector('#bgvariation button.on')?.dataset.value || 'some',
      hook: $('bghook')?.value || 'auto',
      combo: $('bgcombo')?.value || null,
    };
    for (const g of BANGER_GROUPS) raw[g.id] = {};
    box.querySelectorAll('[data-group]').forEach((el) => {
      raw[el.dataset.group][el.dataset.key] = el.type === 'checkbox' ? el.checked : el.value;
    });
    return raw;
  }

  /** Put a request on the dialog's controls (Surprise Me, a style's defaults). */
  function writeDialog(box, o) {
    const setSel = (id, v) => { const el = $(id); if (el && v != null) { el.value = String(v); el.dispatchEvent(new Event('change')); } };
    setSel('bgstyle', o.style); setSel('bgmood', o.mood);
    setSel('bgmode', o.mode); setSel('bgriffnotes', o.riffNotes);
    setSel('bglength', o.length); setSel('bgtempo', o.tempo);
    $('bgcustom').value = String(o.customBars);
    $('bgbpm').value = String(o.bpm);
    box.querySelectorAll('#bgvariation button').forEach((b) => {
      const on = b.dataset.value === o.variation;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    box.querySelectorAll('[data-group]').forEach((el) => {
      const v = o[el.dataset.group]?.[el.dataset.key];
      if (v == null) return;
      if (el.type === 'checkbox') {
        el.checked = !!v;
        el.parentElement.querySelector('.fxswitch')?.classList.toggle('on', !!v);
      } else if (el.value !== String(v)) {
        el.value = String(v);
        el.dispatchEvent(new Event('change'));
      }
    });
  }

  /**
   * The dialog. `mode` is `new` (bars from the song on the desk) or `settings` (a
   * banger's own recipe: its riff is fixed, and Make It writes a new take of it).
   * Resolves to `{ riff, options }`, or null for Cancel.
   */
  async function dialog({ from, to, mode = 'new', recipe = null }) {
    const settings = mode === 'settings';
    const stored = readStore(BANGER_PREFS_KEY);
    const start = normaliseBangerOptions(settings ? recipe.options : { ...stored, hook: 'auto' }).options;
    const bars = settings ? recipe.riff.bars : desk.barCount();
    const title = settings ? `Banger settings — ${escapeHtml(desk.current().track?.title || '')}` : 'Make a banger';
    const answered = ask(title, bodyHtml(start, { from: settings ? recipe.riff.source.from : from, to: settings ? recipe.riff.source.to : to, settings }),
      settings ? 'Make a New Take' : 'Make It', { wide: true });
    const box = $('askbody');
    const ok = $('askok');
    let riff = settings ? recipe.riff : null;
    let riffIssues = [];

    const readRiff = () => {
      if (settings) return;
      const a = Math.max(1, Math.min(bars, Math.round(Number($('bgfrom').value) || 1)));
      const b = Math.max(1, Math.min(bars, Math.round(Number($('bgto').value) || a)));
      const lo = Math.min(a, b) - 1;
      const hi = Math.max(a, b) - 1;
      if (hi - lo + 1 > BANGER_LIMITS.maxRiffBars) {
        riff = null;
        riffIssues = [`that is ${hi - lo + 1} bars — a riff is at most ${BANGER_LIMITS.maxRiffBars}. Pick a shorter stretch.`];
        return;
      }
      try {
        riff = desk.readRiff(lo, hi);
        riffIssues = validateRiff(riff);
      } catch (err) {
        riff = null;
        riffIssues = [String(err?.message || err)];
      }
    };

    // The readout: what the riff is, which part is the hook, what key it reads as —
    // and, when it cannot be made, why, with Make It switched off.
    const paint = () => {
      const raw = readDialog(box);
      const { options, issues } = normaliseBangerOptions(raw);
      const style = styleFor(options.style);
      $('bgcustomfield').hidden = options.length !== 'custom';
      $('bgriffnotesfield').hidden = options.mode === 'keep';
      $('bgbpmfield').hidden = options.tempo !== 'custom';
      const sourceBpm = riff?.source?.bpm;
      const bpm = bangerBpm(options, style, sourceBpm);
      const seconds = (bangerBars(options) * 240) / bpm;
      let html = '';
      if (riff && !riffIssues.length) {
        const sum = riffSummary(riff);
        const melodic = riff.parts.filter((p) => p.kind === 'melodic' || p.kind === 'chord');
        const hookNow = $('bghook')?.value || 'auto';
        let keyText = '';
        try {
          const parts = parseRiff(riff);
          const hookKey = hookNow !== 'auto' ? hookNow : sum.hook;
          for (const p of parts) {
            if (p.key === hookKey) p.role = 'hook';
            else if (p.role === 'hook') p.role = 'counter';
          }
          const an = analyseRiff(parts, options, style);
          const made = keyName(an.key);
          keyText = ` · reads as ${keyName(an.detected)}${made !== keyName(an.detected) ? `, made in ${made}` : ''}`;
          // What the mode does to the riff, so Keep As Written / Fit to the Mode is a choice
          // made knowing the cost.
          if (options.mode !== 'keep' && options.riffNotes === 'fit') {
            keyText += an.moved ? ` · moves ${an.moved} of the riff's ${an.notes} notes` : ' · no riff notes need to move';
          } else if (options.mode !== 'keep') keyText += ' · your notes stay as written — the mode is in the chords';
        } catch { keyText = ''; }
        html = `<span>Riff: ${riff.bars} bar${riff.bars === 1 ? '' : 's'} · ${sum.parts} part${sum.parts === 1 ? '' : 's'}`
          + `${sum.drums ? ` (${sum.drums} drum${sum.drums === 1 ? '' : 's'})` : ''}${keyText}</span>`
          + `<label class="askfield bangerhook">Hook<select id="bghook"><option value="auto">Auto · ${escapeHtml(sum.hookLabel || '')}</option>`
          // Two parts can carry the same name (a song's own labels repeat); the lane says which.
          + melodic.map((p) => {
            const twin = melodic.filter((q) => q.label === p.label).length > 1;
            return `<option value="${escapeHtml(p.key)}"${sel(hookNow, p.key)}>${escapeHtml(p.label)}${twin ? ` · ${escapeHtml(p.key)}` : ''}</option>`;
          }).join('')
          + '</select></label>'
          + `<span class="bangerlength">${bangerBars(options)} bars · ${bpm} BPM · ${mmss(seconds)}</span>`
          + (sum.quantised ? `<span class="bangernote">${sum.quantised} note${sum.quantised === 1 ? '' : 's'} moved to the sixteenth grid</span>` : '');
      } else {
        html = `<span class="bangerwarn">${escapeHtml(riffIssues.join(' ') || 'Nothing to make a banger from.')}</span>`;
      }
      if (issues.length) html += `<span class="bangerwarn">${escapeHtml(issues.join('; '))}</span>`;
      const riffBox = $('bgriff');
      const hookWas = $('bghook')?.value;
      riffBox.innerHTML = html;
      if ($('bghook') && hookWas) $('bghook').value = hookWas;
      if ($('bghook')) $('bghook').onchange = paint;
      const blocked = !riff || riffIssues.length > 0 || issues.length > 0;
      ok.disabled = blocked;
      ok.title = blocked ? (riffIssues[0] || issues[0] || '') : '';
    };

    readRiff();
    paint();
    // A switch's light follows its box.
    box.addEventListener('change', (e) => {
      const el = e.target;
      if (el.type === 'checkbox') el.parentElement.querySelector('.fxswitch')?.classList.toggle('on', el.checked);
      if (el.id === 'bgstyle') {
        writeDialog(box, { ...styleDefaults(styleFor(el.value)), variation: readDialog(box).variation });
        syncCombos(el.value);
      }
      // A new mood re-marks the Mode list: what suits it now, what fights it.
      if (el.id === 'bgmood') {
        // …and moves the Bass switch to the bass the mood suggests.
        const bass = box.querySelector('[data-group="parts"][data-key="bass"]');
        if (bass) { bass.value = moodBass(styleFor($('bgstyle').value), el.value); bass.dispatchEvent(new Event('change', { bubbles: false })); }
        const mode = $('bgmode');
        const keep = mode.value;
        mode.innerHTML = modeOptions(el.value, keep);
        mode.value = keep;
      }
      if (el.id === 'bgfrom' || el.id === 'bgto') readRiff();
      paint();
    });
    box.addEventListener('input', (e) => { if (e.target.id === 'bgfrom' || e.target.id === 'bgto' || e.target.type === 'number') { readRiff(); paint(); } });
    box.querySelectorAll('#bgvariation button').forEach((b) => {
      b.onclick = () => {
        box.querySelectorAll('#bgvariation button').forEach((x) => {
          x.classList.toggle('on', x === b);
          x.setAttribute('aria-pressed', String(x === b));
        });
        paint();
      };
    });
    $('bgsurprise').onclick = () => {
      const now = normaliseBangerOptions(readDialog(box)).options;
      const next = surpriseBangerOptions(new Rng(randomBangerSeed()), now);
      writeDialog(box, next);
      paint();
      toast(`Surprise: ${next.mood} · ${next.variation} · ${next.tempo === 'custom' ? `${next.bpm} BPM` : 'its own tempo'}${next.parts.riffSound === 'random' ? ' · new riff sound' : ''}`, 1800);
    };
    if (!settings) $('bgfrom').focus();

    if (!await answered) return null;
    const { options } = normaliseBangerOptions(readDialog(box));
    // Remembered as a working preference — everything but the hook, which belongs to a riff.
    const { hook, ...keep } = options;
    void hook;
    writeStore(BANGER_PREFS_KEY, keep);
    return { riff, options };
  }

  // ---------------------------------------------------------------- making one
  /** A title nothing in the drawer is using. */
  const freshTitle = (base) => {
    const taken = new Set(desk.listTracks().map((t) => t.title));
    let title = base;
    for (let i = 2; taken.has(title); i++) title = `${base} ${i}`;
    return title;
  };

  function generate(riff, options, seed) {
    try {
      return generateBanger({ riff, options, seed });
    } catch (err) {
      tell('Could not make the banger', escapeHtml(String(err?.message || err)));
      return null;
    }
  }

  const describe = (out, take) => `${out.summary.style} · ${out.summary.key} · ${out.summary.bars} bars · ${out.summary.bpm} BPM · take ${take}`;

  /** Make a Banger… from bars `from`–`to` (0-based) of the song on the desk. */
  async function makeBanger({ from, to }) {
    closeMenu();
    const source = desk.current();
    if (!source.track?.bank) return;
    const answer = await dialog({ from, to, mode: 'new' });
    if (!answer) { desk.$('navbtn')?.focus?.(); return; }
    const seed = randomBangerSeed();
    const out = generate(answer.riff, answer.options, seed);
    if (!out) return;
    const title = freshTitle(out.title);
    let track; let mix; let arrangement;
    if (!desk.isStatic()) {
      let res;
      try {
        res = await fetch('/make-banger', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ title, generated: out }),
        });
      } catch (err) {
        await tell('Could not make the banger', escapeHtml(String(err?.message || err)));
        return;
      }
      const text = await res.text();
      if (!res.ok) { await tell('Could not make the banger', escapeHtml(text)); return; }
      const reply = JSON.parse(text);
      ({ track, mix, arrangement } = reply);
      desk.adopt({ track, mix, arrangement, local: false });
    } else {
      // The deployed desk: the browser is the file. The song and its takes live in
      // localStorage; a take is kept as its seed and re-made from it.
      const usedIds = new Set(desk.listTracks().map((t) => t.id));
      let id = desk.slugForClient(title);
      for (let n = 2; usedIds.has(id); n++) id = `${desk.slugForClient(title)}-${n}`;
      track = { id, title, slug: id, group: 'banger', writable: true, bank: out.bank, banger: { ...out.banger, take: 1 } };
      ({ mix, arrangement } = out);
      desk.adopt({ track, mix, arrangement, local: true });
      const store = readStore(BANGER_TAKES_KEY);
      store[id] = { take: 1, takes: { 1: { seed, options: out.banger.options, generator: BANGER_GENERATOR_VERSION } } };
      writeStore(BANGER_TAKES_KEY, store);
    }
    await desk.selectSong(track.id);
    desk.play();
    toast(`Made ${track.title} — ${describe(out, 1)}`, 6000);
    for (const w of out.warnings) toast(w, 6000);
  }

  /** The drawer's Make a Banger…: the selection's bars, or the first four. */
  function makeFromDrawer() {
    const s = desk.selection();
    const bars = desk.barCount();
    let from = s ? s.from : 0;
    let to = s ? s.to : Math.min(bars, 4) - 1;
    if (to - from + 1 > BANGER_LIMITS.maxRiffBars) to = from + 3;
    to = Math.min(to, bars - 1);
    return makeBanger({ from, to });
  }

  // ---------------------------------------------------------------- takes
  // The desk repaints its status on nearly every edit, so the drawer's take buttons read
  // a cached answer and ask the server again at most every few seconds — or at once
  // after anything here has changed the takes.
  const takeCache = new Map();   // id -> { at, state }
  const forget = (id) => takeCache.delete(id);

  /** Where the banger on the desk stands. */
  async function takes() {
    const { id, track } = desk.current();
    if (!track?.banger) return null;
    if (desk.isStatic()) {
      const store = readStore(BANGER_TAKES_KEY)[id];
      const list = Object.keys(store?.takes || { 1: true }).map(Number).sort((a, b) => a - b);
      const take = store?.take ?? track.banger.take ?? 1;
      return { take, takes: list, mixed: false, previous: [...list].reverse().find((n) => n < take) ?? null, next: list.find((n) => n > take) ?? null, banger: track.banger };
    }
    try {
      const res = await fetch(`/banger-takes?id=${encodeURIComponent(id)}`);
      return res.ok ? await res.json() : null;
    } catch { return null; }
  }

  /** Before a take is left: unsaved edits would be lost, a mixed take is kept. Says so. */
  async function okToLeave(state, verb) {
    const { id, track } = desk.current();
    if (desk.isDirty(id)) {
      const go = await ask(`${escapeHtml(track.title)} has unsaved changes`,
        `<p>${verb} replaces what is on the desk. The changes you have not saved on take ${state.take} `
        + 'will be lost — take them into the file with <b>Save song</b> first if you want them kept with it.</p>',
        'Discard and Continue');
      if (!go) return false;
    }
    return true;
  }

  async function moveTo(direction, { generated = null, options = null } = {}) {
    const { id, track } = desk.current();
    forget(id);
    const state = await takes();
    if (!state) return;
    const verb = direction === 'another' ? 'Another Take' : direction === 'previous' ? 'Previous Take' : 'Next Take';
    if (!await okToLeave(state, verb)) return;
    let out = generated;
    const recipe = state.banger || track.banger;
    if (direction === 'another' && !out) {
      out = generate(recipe.riff, options || recipe.options, randomBangerSeed());
      if (!out) return;
    }
    if (!desk.isStatic()) {
      let res;
      try {
        res = await fetch('/banger-take', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id, direction, generated: out }),
        });
      } catch (err) { await tell(`Could not change take`, escapeHtml(String(err?.message || err))); return; }
      const text = await res.text();
      if (!res.ok) { await tell('Could not change take', escapeHtml(text)); return; }
      const reply = JSON.parse(text);
      forget(id);
      desk.adopt({ track: reply.track, mix: reply.mix, arrangement: reply.arrangement, local: false, swap: true });
      await desk.selectSong(id);
      const now = reply.takes;
      toast(direction === 'another'
        ? `Take ${now.take} of ${reply.track.title} — ${describe(out, now.take)} · Previous Take brings back take ${now.previous}`
        : `${reply.track.title}: back to take ${now.take} of ${now.takes.length}`, 6000);
      if (state.mixed) toast(`Take ${state.take} had been mixed — it is kept as it was`, 5000);
      return;
    }
    // The static desk: a take is its seed, re-made on the way back.
    const store = readStore(BANGER_TAKES_KEY);
    const mine = store[id] || { take: 1, takes: { 1: { seed: recipe.seed, options: recipe.options, generator: recipe.generator } } };
    let target;
    if (direction === 'another') {
      target = Math.max(...Object.keys(mine.takes).map(Number)) + 1;
      mine.takes[target] = { seed: out.banger.seed, options: out.banger.options, generator: BANGER_GENERATOR_VERSION };
    } else {
      target = direction === 'previous' ? state.previous : state.next;
      if (target == null) return;
      const t = mine.takes[target];
      if (t.generator !== BANGER_GENERATOR_VERSION) toast('That take was made by an older generator — it may not sound the same', 5000);
      out = generate(recipe.riff, t.options, t.seed);
      if (!out) return;
    }
    mine.take = target;
    store[id] = mine;
    writeStore(BANGER_TAKES_KEY, store);
    forget(id);
    desk.adopt({
      track: { ...track, bank: out.bank, banger: { ...out.banger, take: target } },
      mix: out.mix, arrangement: out.arrangement, local: true, swap: true,
    });
    await desk.selectSong(id);
    toast(`${track.title}: take ${target} — ${describe(out, target)}`, 6000);
  }

  /** Banger Settings…: the recipe in the dialog; Make a New Take writes it as the next take. */
  async function settings() {
    closeMenu();
    const state = await takes();
    if (!state) return;
    const recipe = state.banger || desk.current().track.banger;
    const answer = await dialog({ mode: 'settings', recipe });
    if (!answer) return;
    const out = generate(recipe.riff, answer.options, randomBangerSeed());
    if (!out) return;
    await moveTo('another', { generated: out });
  }

  /** The take buttons: shown on a banger only, Previous and Next only where there is one. */
  async function syncButtons() {
    const { track } = desk.current();
    // A style seed is tuned, not re-rolled: it gets Use as Style instead of takes.
    const on = !!track?.banger && track.group !== 'bangerSeed';
    for (const id of ['bangeragain', 'bangerprev', 'bangernext', 'bangersettings']) {
      const b = $(id);
      if (b) b.hidden = !on;
    }
    if (!on) return;
    const { id } = desk.current();
    const cached = takeCache.get(id);
    let state = cached?.state;
    if (!cached || Date.now() - cached.at > 4000) {
      takeCache.set(id, { at: Date.now(), state });
      state = await takes();
      takeCache.set(id, { at: Date.now(), state });
    }
    if (desk.current().track !== track) return;
    if ($('bangerprev')) {
      $('bangerprev').hidden = state?.previous == null;
      $('bangerprev').title = state?.previous != null ? `Go back to take ${state.previous} — take ${state.take} is kept` : '';
    }
    if ($('bangernext')) {
      $('bangernext').hidden = state?.next == null;
      $('bangernext').title = state?.next != null ? `Go forward to take ${state.next}` : '';
    }
    if ($('bangeragain')) {
      const n = Math.max(...(state?.takes?.length ? state.takes : [1])) + 1;
      $('bangeragain').title = `Re-roll this banger with the same settings as take ${n} — take ${state?.take ?? 1} is kept`;
    }
  }

  return {
    makeBanger,
    makeFromDrawer,
    anotherTake: () => { closeMenu(); return moveTo('another'); },
    previousTake: () => { closeMenu(); return moveTo('previous'); },
    nextTake: () => { closeMenu(); return moveTo('next'); },
    settings,
    syncButtons,
  };
}
