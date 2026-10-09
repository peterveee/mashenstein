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
  BANGER_GROUPS, BANGER_LIMITS, normaliseBangerOptions, surpriseBangerOptions, goCrazyBangerOptions, styleDefaults, classicDefaults,
  BANGER_REROLLS, modifyBanger, describeModify, BANGER_STRUCTURE, keepStructure,
  styleFor, generateBanger, validateRiff, riffSummary, randomBangerSeed, keyName, parseRiff, flavoursFor, moodFlavour,
  fusionOf, flavourOf, BANGER_FLAVOURS,
  bangerBars, bangerBpm, BANGER_GENERATOR_VERSION, BANGER_EXPRESSION_VERSION, sourceRiff,
} from './lib/banger/index.js';
import { analyseRiff } from './lib/banger/analyse.js';
import { createFormEditor } from './mixer-banger-form.js';
import { BANGER_COMBOS } from './lib/banger/combos.js';
import { bangerReportHtml } from './mixer-banger-report.js';
import { Rng } from '../src/engine/rng.js';

/** What the dialog was last asked for — everything but the bars, which are the selection's. */
export const BANGER_PREFS_KEY = 'mash-mixer-banger';
/** The static desk's takes: per song, the seed and options of every take it has made. */
export const BANGER_TAKES_KEY = 'mash-mixer-banger-takes';
/** Simple or Full Options — whichever the dialog was last left on. */
export const BANGER_MODE_KEY = 'mash-mixer-banger-mode';

const readStore = (key) => { try { return JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch { return {}; } };
const writeStore = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* full or blocked */ } };
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

/** A deliberate desk variation choice also chooses its automatic slide policy.
 * Spot FX intensity is chosen independently in Section FX.
 * Reading old recipes never calls this: their original expression stays intact. */
export function deskBangerVariation(options, variation) {
  return { ...options, variation,
    expression: { autoPortamento: variation === 'wild', version: BANGER_EXPRESSION_VERSION } };
}

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
 *   savedSong()          { mix, arrangement } of the song on the desk, as last saved
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
    // A choice's note (a third item) shows beside it in the open list.
    + f.options.map(([id, label, note]) => `<option value="${id}"${note ? ` data-note="${escapeHtml(note)}"` : ''}${sel(value, id)}>${escapeHtml(label)}</option>`).join('')
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
  /**
   * The Flavour list (styles/flavours.js): By Mood — naming the one the mood plays — then each
   * of the style's arrangements, then Random. Only shown for a style that has flavours.
   */
  function flavourOptions(styleId, value, mood) {
    const list = flavoursFor(styleId);
    const byMood = list.find((f) => f.id === moodFlavour(styleFor(styleId), mood));
    return `<option value="mood"${sel(value, 'mood')}>By Mood${byMood ? ` (${escapeHtml(byMood.label)})` : ''}</option>`
      + list.map((f) => `<option value="${f.id}" title="${escapeHtml(f.note || '')}"${sel(value, f.id)}>${escapeHtml(f.label)}</option>`).join('')
      + `<option value="random"${sel(value, 'random')}>Random</option>`;
  }
  function syncFlavours(styleId, value = 'mood', mood = $('bgmood')?.value) {
    const select = $('bgflavour');
    if (!select) return;
    const ok = value === 'mood' || value === 'random' || flavoursFor(styleId).some((f) => f.id === value);
    select.innerHTML = flavourOptions(styleId, ok ? value : 'mood', mood);
    select.value = ok ? value : 'mood';
    $('bgflavourfield').hidden = !flavoursFor(styleId).length;
  }
  /** Sounds is only asked where the style has a combo to offer — and not over another style's beat. */
  function syncCombos(styleId, value = '') {
    const select = $('bgcombo');
    if (!select) return;
    select.innerHTML = comboOptions(styleId, value);
    select.value = BANGER_COMBOS[styleId]?.[value] ? value : '';
    $('bgcombofield').hidden = !Object.keys(BANGER_COMBOS[styleId] || {}).length || ($('bginfusion')?.value || 'none') !== 'none';
  }
  /**
   * The Infusion list (FUSION, styles/fusion.js; the Lab's INFUSION, 7 Oct 2026): None, then every
   * other style — and each of their flavours, which sound of their own — whose sound (its chords,
   * instruments and form) plays over this style's groove: its drums, bass and tempo.
   */
  function infusionOptions(styleId, value) {
    const flavoursOf = (id) => BANGER_FLAVOURS.filter((f) => f.base === id);
    return `<option value="none"${sel(value || 'none', 'none')}>None</option>`
      + BANGER_STYLES.filter((s) => s.id !== styleId).map((s) => `<option value="${s.id}" data-note="${escapeHtml(s.note || '')}"${sel(value, s.id)}>${escapeHtml(s.label)}</option>`
        + flavoursOf(s.id).map((f) => `<option value="${f.id}"${sel(value, f.id)}>${escapeHtml(f.label)}</option>`).join('')).join('');
  }
  /** The Infusion list for `styleId`, keeping `value` unless it is that style (or one of its flavours). */
  function syncInfusion(styleId, value = 'none') {
    const select = $('bginfusion');
    if (!select) return;
    const sound = value && value !== 'none' ? styleFor(value) : null;
    const ok = !!sound && (sound.base || sound.id) !== styleId;
    select.innerHTML = infusionOptions(styleId, ok ? value : 'none');
    select.value = ok ? value : 'none';
  }
  /**
   * The recipe a request plays: its style, or a fusion — the infusion it names over the style's
   * groove, or (a take from early on 7 Oct 2026) the style over the groove its `fusion` names.
   */
  function recipeOf(o) {
    const style = styleFor(o.style);
    const sound = o.infusion && o.infusion !== 'none' ? styleFor(o.infusion) : null;
    const groove = o.fusion && o.fusion !== 'none' ? styleFor(o.fusion) : null;
    return (sound && fusionOf(sound, style)) || (groove && fusionOf(style, groove)) || style;
  }
  /**
   * `make` (styleDefaults, classicDefaults) for the request's style with its Infusion: the fusion's —
   * the style's drum switches, bass and pump, the infusion's everything else — asked for the desk's way.
   */
  function defaultsOf(o, make = styleDefaults) {
    const infusion = o.infusion && o.infusion !== 'none' ? o.infusion : 'none';
    const d = make(recipeOf({ style: o.style, infusion }));
    d.style = o.style;
    d.infusion = infusion;
    delete d.fusion;
    return d;
  }

  function bodyHtml(o, { from, to, settings, modifying = false, view }) {
    const style = styleFor(o.style);
    const lengthOpts = BANGER_LENGTHS.map((l) => `<option value="${l.id}"${sel(o.length, l.id)}>${l.label}${l.bars ? ` · ${l.bars} bars` : ''}</option>`).join('');
    // Visual sections share the existing parts request; each control is rendered once.
    const partSections = [
      { id: 'bass', label: 'Bass', keys: ['bass', 'riffBass', 'bassLift', 'sub'] },
      { id: 'chords', label: 'Chords', keys: ['chords', 'choir', 'arp', 'arpPattern'] },
      { id: 'leads', label: 'Leads', keys: ['writeLead', 'riffSound', 'fillIn', 'fillEvery', 'fillNotes', 'square', 'bell', 'octaveDouble', 'thirdBelow', 'counter'] },
      { id: 'sounds', label: 'Instrument sounds', keys: ['soundSet', 'partSounds'] },
    ];
    const parts = BANGER_GROUPS.find((g) => g.id === 'parts');
    const sections = new Map([
      ...BANGER_GROUPS.map((g) => [g.id, { ...g, group: g.id }]),
      ...partSections.map((g) => [g.id, { ...g, group: 'parts', fields: g.keys.map((key) => parts.fields.find((f) => f.key === key)) }]),
    ]);
    // Simple: Style, Mood, Length and the riff — everything marked `bgfull` is Full Options.
    return `<div id="bgdialog" class="bgmode-${view}">`
      + '<div class="bgmodebar"><div class="askseg" id="bgmodeseg" role="group" aria-label="How much to show">'
      + '<button type="button" data-mode="simple" title="The bare minimum: a style, a mood and a length. Everything else is the style\'s own — or what you last set in Full Options">Simple</button>'
      + '<button type="button" data-mode="full" title="Every setting: mode, tempo, variation, the form, sounds, drums, FX">Full Options</button></div></div>'
      // MODIFY THIS TAKE: the same seed with these settings, keeping every part the change
      // does not reach — tools/lib/banger/modify.js. The song's shape is locked (style,
      // length, form); the re-rolls draw one part again on its own.
      + (modifying ? '<p class="bgmodifynote">Modify keeps this take\'s shape — its style, length and form are locked. '
        + 'Change anything else: only the parts it reaches are rewritten, and your edits and mix on the rest stay. '
        + 'To change the shape, use <b>Banger Settings…</b> and make a new take.</p>'
        + '<div class="bangerrow bgmodifyrow"><span class="bangerlabel">Re-roll</span><div class="askseg" id="bgrerolls" role="group" aria-label="Parts to draw again">'
        + BANGER_REROLLS.map((r) => `<button type="button" data-stream="${r.stream}" aria-pressed="false" title="${escapeHtml(r.title)}">${r.label}</button>`).join('')
        + '</div></div>' : '')
      + '<div class="bangergrid"><fieldset class="bgprimary"><legend>Sound &amp; feel</legend><div class="bgfields">'
      + `<label class="askfield" title="The recipe: the drums, the bass, the chords, the sounds and the form it starts on. Picking one resets everything under More Options to its defaults">Style<select id="bgstyle">${BANGER_STYLES.map((s) => `<option value="${s.id}" data-note="${escapeHtml(s.note || '')}"${sel(o.style, s.id)}>${escapeHtml(s.label)}</option>`).join('')}</select></label>`
      + `<label class="askfield bgfull" id="bgcombofield" title="The style's own sounds, or a Sound Combo saved from a banger tuned on the desk"${Object.keys(BANGER_COMBOS[o.style] || {}).length ? '' : ' hidden'}>Sounds<select id="bgcombo">${comboOptions(o.style, o.combo)}</select></label>`
      + `<label class="askfield" id="bgflavourfield" title="Which of the style's arrangements a take is — its drums, rhythms, sounds and how long its chords are held. By Mood: the one the mood plays. Random: drawn from the take's seed, so Another Take can land on any of them"${flavoursFor(o.style).length ? '' : ' hidden'}>Flavour<select id="bgflavour">${flavourOptions(o.style, o.flavour || 'mood', o.mood)}</select></label>`
      + `<label class="askfield" id="bginfusionfield" title="Infusion: another style's sound — its chords, instruments and form — over this style's groove: its drums, percussion, bass and tempo. None: the style's own sound">Infusion<select id="bginfusion">${infusionOptions(o.style, o.infusion)}</select></label>`
      + `<label class="askfield" title="The feel: the chord progression, the chord colours, how bright the hook is — and it can swap sounds and suggest a bass">Mood<select id="bgmood">${BANGER_MOODS.map((m) => `<option value="${m.id}" data-note="${escapeHtml(m.title)}"${sel(o.mood, m.id)}>${m.label}</option>`).join('')}</select></label>`
      + `<label class="askfield bgfull" title="Major or minor with one note changed — that note is the flavour">Mode<select id="bgmode">${modeOptions(o.mood, o.mode)}</select></label>`
      + '</div></fieldset><fieldset class="bgprimary bgfull"><legend>Length &amp; tempo</legend><div class="bgfields">'
      + `<label class="askfield bgfull" title="How long the song is. A form drawn in the Form row rescales to it">Length<select id="bglength">${lengthOpts}</select></label>`
      + `<label class="askfield bgfull" id="bgcustomfield" title="A custom length, ${BANGER_LIMITS.minBars}–${BANGER_LIMITS.maxBars} bars in fours">Bars<input id="bgcustom" type="number" min="${BANGER_LIMITS.minBars}" max="${BANGER_LIMITS.maxBars}" step="${BANGER_LIMITS.barStep}" value="${o.customBars}"></label>`
      + `<label class="askfield bgfull" title="The style's own tempo, the tempo of the song the riff came from, or one you type">Tempo<select id="bgtempo">${BANGER_TEMPOS.map((t) => `<option value="${t.id}"${sel(o.tempo, t.id)}>${t.label}</option>`).join('')}</select></label>`
      + `<label class="askfield bgfull" id="bgbpmfield" title="The tempo to make it at">BPM<input id="bgbpm" type="number" min="${BANGER_LIMITS.minBpm}" max="${BANGER_LIMITS.maxBpm}" step="1" value="${o.bpm ?? style.bpm}"></label>`
      + '</div></fieldset><fieldset class="bgprimary bgfull"><legend>Source riff</legend><div class="bgfields">'
      + `<label class="askfield bgfull" title="The first bar of the riff — the bars of this song the banger is made from">From Bar<input id="bgfrom" type="number" min="1" step="1" value="${from + 1}"${settings ? ' disabled' : ''}></label>`
      + `<label class="askfield bgfull" title="The last bar of the riff — up to ${BANGER_LIMITS.maxRiffBars} bars">To Bar<input id="bgto" type="number" min="1" step="1" value="${to + 1}"${settings ? ' disabled' : ''}></label>`
      + `<label class="askfield bgfull" id="bgriffnotesfield" title="What the mode may do to your riff's own notes">Riff Notes<select id="bgriffnotes">${BANGER_RIFF_NOTES.map((k) => `<option value="${k.id}"${sel(o.riffNotes, k.id)}>${k.label}</option>`).join('')}</select></label>`
      + '</div></fieldset></div>'
      + '<div class="bangerrow bgsimpleonly"><span class="bangerlabel">Length</span><div class="askseg" id="bgsimplelen" role="group" aria-label="Length">'
      + BANGER_LENGTHS.filter((l) => l.bars).map((l) => `<button type="button" data-length="${l.id}" title="${l.bars} bars">${l.label}</button>`).join('')
      + '</div><span class="bgsimplenote" id="bgsimplenote"></span></div>'
      + '<div class="bangerrow">'
      + select('production', BANGER_GROUPS.find(g => g.id === 'production').fields[0], o.production.mode)
      + '<span class="bgsimplenote">Echoes, room and width chosen for each part</span></div>'
      + '<div class="bangerrow bgfull"><span class="bangerlabel">Variation</span><div class="askseg" id="bgvariation" role="group" aria-label="Variation">'
      + BANGER_VARIATIONS.map((v) => `<button type="button" data-value="${v.id}" title="${escapeHtml(v.title)}" aria-pressed="${o.variation === v.id}" class="${o.variation === v.id ? 'on' : ''}">${v.label}</button>`).join('')
      + '</div><div class="bangerresets">'
      + '<button type="button" id="bgdefaults" title="Put every setting back to this style\'s own defaults — mood, mode, length, tempo, variation, the form and everything under More Options. The riff\'s bars stay">Style Defaults</button>'
      + '<button type="button" id="bgclassic" title="This style as it was before the variety: its own sounds every take (Part Sounds: Style\'s Own), its own arp figure throughout, no Bass Lifts, the Club form. For Big-Room House that is ABSOLUTE ZERO\'s shape and sound">Classic</button>'
      + '<button type="button" id="bgcrazy" title="Everything that transforms the original, on at once: Wild variation, counter-melody and third below; the riff\'s bass, drums and sounds replaced; congas, cowbell and tambourine; a major-third key lift, half time and a false ending; stutter, bitcrush intro and tape-stop ending. Key and tempo stay as they are">Go Crazy</button>'
      + '<button type="button" id="bgsurprise" class="bangersurprise" title="Roll the mood, mode, variation, tempo, usually the riff sound, and a few spice switches">Surprise Me</button></div></div>'
      // The song's shape: the template the Form buttons choose (a hidden switch, read with
      // the rest) and the strip that draws it (tools/mixer-banger-form.js).
      + `<input type="hidden" id="bgtemplatevalue" data-group="form" data-key="template" value="${escapeHtml(o.form.template || 'club')}">`
      + '<div class="bangerform bgfull" id="bgform"></div>'
      + '<div class="bangerriff" id="bgriff"></div>'
      + '<details class="bangermore bgfull" id="bgmore"><summary>More Options</summary><div class="bangergroups">'
      + [['form'], ['bass', 'chords', 'drums'], ['leads', 'sounds', 'sectionFx'], ['spot', 'fx']].map((ids) => '<div class="bangercolumn">'
        + ids.map((id) => {
          const g = sections.get(id);
          return `<fieldset class="bangergroup"><legend>${escapeHtml(g.label)}</legend>`
            + g.fields.filter((f) => !(g.id === 'sectionFx' && f.key !== 'mode') && !(g.id === 'form' && f.key === 'template'))
              .sort((a, b) => Number(b.type === 'select') - Number(a.type === 'select'))
              .map((f) => (f.type === 'select' ? select(g.group, f, o[g.group][f.key]) : toggle(g.group, f, o[g.group][f.key]))).join('')
            + (g.id === 'leads' ? toggle('expression', { key: 'autoPortamento', label: 'Auto Portamento',
              title: 'Automatically add selected slides to suitable lead tracks, with varied Amount and Glide. Preserves phrase breaks. Wild and Go Crazy turn this on; you can turn it off or edit each track in Note FX afterward.' }, o.expression.autoPortamento) : '')
            + '</fieldset>';
        }).join('') + '</div>').join('')
      + '</div></details></div>';
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
      flavour: $('bgflavour')?.value || 'mood',
      infusion: $('bginfusion')?.value || 'none',
      // A take made before the Infusion field (early on 7 Oct 2026) keeps its groove, in Modify.
      ...(box.dataset.fusion ? { fusion: box.dataset.fusion } : {}),
      expression: { version: BANGER_EXPRESSION_VERSION },
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
    // Defaults with an Infusion say so (defaultsOf); a style's say nothing, and leave the Infusion as it is.
    if (o.infusion !== undefined) syncInfusion(o.style, o.infusion);
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
    // `modify` is the settings dialog with the take's shape locked (see BANGER_STRUCTURE).
    const modifying = mode === 'modify';
    const settings = mode === 'settings' || modifying;
    const stored = readStore(BANGER_PREFS_KEY);
    // A preference saved before there were form templates names none — it would read as
    // the Club form for every style. It starts on its style's own form instead.
    if (stored.form && stored.form.template == null) {
      stored.form = { ...stored.form, template: styleDefaults(styleFor(stored.style) || BANGER_STYLES[0]).form.template };
    }
    // One saved before Breakdown Hook: Varied (9 Oct 2026, `prefs` 2) says Half Speed because that was
    // everyone's default, or says nothing: it opens on Varied. One that chose another way keeps it.
    if (stored.form && !(stored.prefs >= 2) && (stored.form.breakdownHook ?? 'half') === 'half') {
      stored.form = { ...stored.form, breakdownHook: 'varied' };
    }
    const start = normaliseBangerOptions(settings ? recipe.options : { ...stored, hook: 'auto' }).options;
    // A take or a preference from early on 7 Oct 2026 named its sound `style` and its groove `fusion`;
    // the desk asks the other way round now: Style the groove, Infusion the sound. Modify keeps the
    // take's shape, style and all, so there the groove rides along unseen (readDialog).
    let legacyFusion = null;
    if (start.fusion && start.fusion !== 'none' && (!start.infusion || start.infusion === 'none')) {
      const groove = styleFor(start.fusion);
      if (groove && modifying) legacyFusion = start.fusion;
      else if (groove) {
        const sound = flavourOf(styleFor(start.style), start.flavour, { seed: recipe?.seed ?? 1, mood: start.mood });
        start.infusion = sound ? sound.id : start.style;
        start.style = groove.base || groove.id;
        start.flavour = groove.flavour || 'style';
      }
    }
    delete start.fusion;
    const bars = settings ? recipe.riff.bars : desk.barCount();
    const title = modifying ? `Modify this take — ${escapeHtml(desk.current().track?.title || '')}`
      : settings ? `Banger settings — ${escapeHtml(desk.current().track?.title || '')}` : 'Make a banger';
    let view = (() => { try { return localStorage.getItem(BANGER_MODE_KEY) === 'full' ? 'full' : 'simple'; } catch { return 'simple'; } })();
    const answered = ask(title, bodyHtml(start, { from: settings ? recipe.riff.source.from : from, to: settings ? recipe.riff.source.to : to, settings, modifying, view }),
      modifying ? 'Modify This Take' : settings ? 'Make a New Take' : 'Make It', { wide: true });
    const box = $('askbody');
    // (the ask box is shared with every dialog: the groove rides along on this one only)
    if (legacyFusion) box.dataset.fusion = legacyFusion; else delete box.dataset.fusion;
    const ok = $('askok');
    let riff = settings ? sourceRiff(recipe.riff) : null;
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
    // The Form row: the request without a drawn form is what the strip draws a template
    // from; with one, the drawn form is part of the request.
    let availabilityCache = null;
    const formEditor = createFormEditor({
      host: $('bgform'), escapeHtml, toast,
      request: () => {
        const plain = readDialog(box);
        const { options } = normaliseBangerOptions(plain);
        return { options, style: styleFor(options.style), sourceBpm: riff?.source?.bpm };
      },
      availability: (section, rows) => {
        if (!rows.length || !riff || riffIssues.length) return [];
        const raw = formEditor.apply(readDialog(box));
        const { options, issues } = normaliseBangerOptions(raw);
        if (issues.length) return [];
        const key = JSON.stringify([riff, options]);
        try {
          if (availabilityCache?.key !== key) availabilityCache = { key, song: generateBanger({ riff, options,
            seed: settings ? recipe.seed : 19, rerolls: settings ? recipe.rerolls : null }) };
          const decisions = availabilityCache.song.banger.sectionEffects.decisions.filter(d => d.origin === 'Section choice' && d.sectionId === section.id);
          return rows.map((_, i) => {
            const decision = decisions.find(d => d.assignmentIndex === i);
            return decision?.status === 'Skipped' ? `Preview: ${decision.reason}. No notes will be added.` : '';
          });
        } catch { return []; }
      },
      changed: () => paint(),
    });
    const read = () => formEditor.apply(readDialog(box));

    const paint = () => {
      const raw = read();
      const { options, issues } = normaliseBangerOptions(raw);
      // With an Infusion, the fusion: its tempo is the style's, the groove's.
      const style = recipeOf(options);
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
        html = `<span>Riff: bars ${riff.source.from + 1}–${riff.source.to + 1} (${riff.bars} bar${riff.bars === 1 ? '' : 's'}) · ${sum.parts} part${sum.parts === 1 ? '' : 's'}`
          + `${sum.drums ? ` (${sum.drums} drum${sum.drums === 1 ? '' : 's'})` : ''}${keyText}</span>`
          + `<label class="askfield bangerhook" title="Which of the riff's parts is the hook — the tune everything else doubles and answers. Auto picks the busiest melodic part">Hook<select id="bghook"><option value="auto">Auto · ${escapeHtml(sum.hookLabel || '')}</option>`
          // Two parts can carry the same name (a song's own labels repeat); the lane says which.
          + melodic.map((p) => {
            const twin = melodic.filter((q) => q.label === p.label).length > 1;
            return `<option value="${escapeHtml(p.key)}"${sel(hookNow, p.key)}>${escapeHtml(p.label)}${twin ? ` · ${escapeHtml(p.key)}` : ''}</option>`;
          }).join('')
          + '</select></label>'
          + `<span class="bangerlength">${bangerBars(options)} bars · ${bpm} BPM · ${mmss(seconds)}</span>`
          // A riff with its own bassline: say what happens to it, and where to change that.
          + (riff.parts.some((p) => p.role === 'bass' && p.key !== (hookNow !== 'auto' ? hookNow : sum.hook))
            ? `<span class="bangernote" title="Riff Bass, under More Options → Bass &amp; Chords">Your bassline: ${options.parts.riffBass === 'keep' ? 'kept in the drops' : 'replaced in the drops by the Bass setting'} (Riff Bass)</span>` : '')
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
      // The switches that only shape the Club form, dimmed when another form (or a drawn
      // one) is chosen — they still say what they say, they just have nothing to change.
      const tpl = options.form.template || 'club';
      for (const g of BANGER_GROUPS) {
        for (const f of g.fields) {
          if (!f.forms) continue;
          const label = box.querySelector(`[data-group="${g.id}"][data-key="${f.key}"]`)?.closest('label');
          if (label) label.classList.toggle('bangerdim', formEditor.edited || !f.forms.includes(tpl));
        }
      }
      formEditor.render();
      paintSimple(options, style);
      // The Style field's tooltip: the chosen style, in full.
      const styleLabel = $('bgstyle')?.closest('label');
      if (styleLabel && style.title) styleLabel.title = `${style.label}: ${style.title}. Picking a style resets everything under Full Options to its defaults`;
    };

    // ---- Simple / Full Options
    /**
     * Simple shows Style, Mood, Length and the riff. Whatever Full Options holds still
     * applies — so when it is anything but the style's own, Simple says so, with a way
     * back to the style's own (keeping the style, the mood and the length).
     */
    function paintSimple(options, style) {
      box.querySelectorAll('#bgmodeseg button').forEach((b) => {
        b.classList.toggle('on', b.dataset.mode === view);
        b.setAttribute('aria-pressed', String(b.dataset.mode === view));
      });
      box.querySelectorAll('#bgsimplelen button').forEach((b) => {
        b.classList.toggle('on', b.dataset.length === options.length);
        b.setAttribute('aria-pressed', String(b.dataset.length === options.length));
      });
      const own = defaultsOf(options);
      const same = (o) => JSON.stringify({ ...o, style: 0, mood: 0, length: 0, customBars: 0, hook: 0, bpm: 0, combo: 0, fusion: 0, infusion: 0, parts: { ...o.parts, bass: 0 } });
      const tuned = formEditor.edited || options.combo || same(options) !== same(own)
        || options.parts.bass !== moodBass(style, options.mood);
      const custom = options.length === 'custom' ? `Custom · ${options.customBars} bars. ` : '';
      $('bgsimplenote').innerHTML = (custom + (tuned
        ? '+ your Full Options settings · <button type="button" id="bgsimplereset" class="bglink" title="Everything else back to this style\'s own — the style, mood and length stay">Use the style\'s own</button>'
        : '')).trim();
      const r = $('bgsimplereset');
      if (r) r.onclick = () => {
        const now = normaliseBangerOptions(readDialog(box)).options;
        const d = defaultsOf(now);
        write({ ...d, mood: now.mood, length: now.length, customBars: now.customBars,
          parts: { ...d.parts, bass: moodBass(style, now.mood) } });
        syncCombos(now.style);
        syncFlavours(now.style);
        formEditor.reset();
        paint();
      };
    }
    box.querySelectorAll('#bgmodeseg button').forEach((b) => {
      b.onclick = () => {
        view = b.dataset.mode;
        try { localStorage.setItem(BANGER_MODE_KEY, view); } catch { /* blocked */ }
        $('bgdialog').className = `bgmode-${view}`;
        paint();
      };
    });
    box.querySelectorAll('#bgsimplelen button').forEach((b) => {
      b.onclick = () => {
        const sel = $('bglength');
        sel.value = b.dataset.length;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      };
    });

    readRiff();
    if (start.form.sections) formEditor.load(start.form.sections);
    formEditor.loadEffects(start.sectionFx);
    paint();
    // A switch's light follows its box.
    box.addEventListener('change', (e) => {
      const el = e.target;
      if (el.type === 'checkbox') el.parentElement.querySelector('.fxswitch')?.classList.toggle('on', el.checked);
      if (el.id === 'bgstyle') {
        const current = readDialog(box);
        // The Infusion stays, unless it is the new style's own; the defaults are the fusion's if it stays.
        syncInfusion(el.value, current.infusion);
        write({ ...defaultsOf({ style: el.value, infusion: $('bginfusion')?.value }), variation: current.variation, expression: current.expression });
        syncCombos(el.value);
        syncFlavours(el.value);
        formEditor.reset(`Form back to ${styleFor(el.value).label}'s own`);
      }
      // A new Infusion is picked like a style: everything under Full Options to the fusion's defaults
      // (the infusion's, but the style's drums, bass and pump), keeping the mood, the length and the variation.
      if (el.id === 'bginfusion') {
        const now = normaliseBangerOptions(readDialog(box)).options;
        const d = defaultsOf(now);
        write({ ...d, mood: now.mood, length: now.length, customBars: now.customBars, variation: now.variation, expression: now.expression,
          parts: { ...d.parts, bass: moodBass(recipeOf(now), now.mood) } });
        syncCombos(now.style);
        syncFlavours(now.style, $('bgflavour')?.value, now.mood);
        formEditor.reset(`Form back to ${recipeOf(now).label}'s own`);
      }
      // A new mood re-marks the Mode list: what suits it now, what fights it.
      if (el.id === 'bgmood') {
        // …and moves the Bass switch to the bass the mood suggests.
        const bass = box.querySelector('[data-group="parts"][data-key="bass"]');
        if (bass) { bass.value = moodBass(recipeOf(readDialog(box)), el.value); bass.dispatchEvent(new Event('change', { bubbles: false })); }
        const mode = $('bgmode');
        const keep = mode.value;
        mode.innerHTML = modeOptions(el.value, keep);
        mode.value = keep;
        // …and By Mood names the flavour the new mood plays.
        syncFlavours($('bgstyle').value, $('bgflavour')?.value, el.value);
      }
      if (el.id === 'bgfrom' || el.id === 'bgto') readRiff();
      // A new length: a drawn form rescales to it, keeping its sections.
      if (el.id === 'bglength' || el.id === 'bgcustom') {
        const { options } = normaliseBangerOptions(readDialog(box));
        formEditor.rescale(bangerBars(options));
      }
      paint();
    });
    box.addEventListener('input', (e) => { if (e.target.id === 'bgfrom' || e.target.id === 'bgto' || e.target.type === 'number') { readRiff(); paint(); } });
    box.querySelectorAll('#bgvariation button').forEach((b) => {
      b.onclick = () => {
        box.querySelectorAll('#bgvariation button').forEach((x) => {
          x.classList.toggle('on', x === b);
          x.setAttribute('aria-pressed', String(x === b));
        });
        write(deskBangerVariation(normaliseBangerOptions(read()).options, b.dataset.value));
        paint();
      };
    });
    // Style Defaults / Classic: everything back to the style's own (or its classic), the
    // riff's bars and the hook kept, any drawn form and Sound Combo dropped.
    const resetTo = (make, what) => {
      const style = styleFor($('bgstyle').value);
      // With an Infusion, the fusion's own: the style's drums, bass and pump, the infusion's the rest.
      write(defaultsOf({ style: style.id, infusion: $('bginfusion')?.value }, make));
      syncCombos(style.id);
      syncFlavours(style.id);
      formEditor.reset();
      paint();
      toast(`${style.label} — ${what}; explicit section effects cleared`, 2200);
    };
    $('bgdefaults').onclick = () => resetTo(styleDefaults, 'its own defaults');
    $('bgclassic').onclick = () => resetTo(classicDefaults, 'classic: its own sounds, its own arp, no bass lift, the Club form');
    // In Modify, anything that writes the dialog (Surprise Me, Go Crazy, a style's
    // defaults) leaves the locked shape showing what the take has.
    const relock = () => {
      if (!modifying) return;
      const o = recipe.options;
      $('bgstyle').value = o.style;
      $('bglength').value = o.length;
      $('bgcustom').value = String(o.customBars);
      box.querySelectorAll('[data-group="form"]').forEach((el) => {
        const v = o.form?.[el.dataset.key];
        if (!BANGER_STRUCTURE.form.includes(el.dataset.key) || v == null) return;
        if (el.type === 'checkbox') {
          el.checked = !!v;
          el.parentElement.querySelector('.fxswitch')?.classList.toggle('on', !!v);
        } else el.value = String(v);
      });
    };
    function write(o) { writeDialog(box, o); relock(); }
    if (modifying) {
      for (const b of box.querySelectorAll('#bgrerolls button')) {
        b.onclick = () => {
          const on = !b.classList.contains('on');
          b.classList.toggle('on', on);
          b.setAttribute('aria-pressed', String(on));
        };
      }
      // The shape, locked: the controls switched off, the Form row out of reach.
      for (const id of ['bgstyle', 'bglength', 'bgcustom']) { const el = $(id); if (el) { el.disabled = true; el.title = 'Locked — Modify keeps the take\'s shape'; } }
      box.querySelectorAll('#bgsimplelen button').forEach((b) => { b.disabled = true; });
      box.querySelectorAll('[data-group="form"]').forEach((el) => {
        if (!BANGER_STRUCTURE.form.includes(el.dataset.key)) return;
        el.disabled = true;
        el.closest('label')?.classList.add('bglocked');
      });
      formEditor.setStructureLocked(true);
    }
    $('bgcrazy').onclick = () => {
      write(deskBangerVariation(goCrazyBangerOptions(normaliseBangerOptions(read()).options), 'wild'));
      paint();
      toast('Go Crazy: everything transformed — the key and tempo kept', 1800);
    };
    $('bgsurprise').onclick = () => {
      const now = normaliseBangerOptions(read()).options;
      const next = surpriseBangerOptions(new Rng(randomBangerSeed()), now);
      write(next);
      paint();
      toast(`Surprise: ${next.mood} · ${next.variation} · ${next.tempo === 'custom' ? `${next.bpm} BPM` : 'its own tempo'}${next.parts.riffSound === 'random' ? ' · new riff sound' : ''}`, 1800);
    };
    if (!settings) $('bgfrom').focus();

    if (!await answered) return null;
    const { options } = normaliseBangerOptions(read());
    // Remembered as a working preference — everything but the hook, which belongs to a riff.
    const { hook, ...keep } = options;
    void hook;
    writeStore(BANGER_PREFS_KEY, { ...keep, prefs: 2 });
    const rerolls = modifying ? [...box.querySelectorAll('#bgrerolls button.on')].map((b) => b.dataset.stream) : [];
    // Whatever a button wrote over them (Surprise Me, Go Crazy, a style's defaults), the
    // shape goes back to the take's own.
    return { riff, options: modifying ? keepStructure(options, recipe.options) : options, rerolls };
  }

  // ---------------------------------------------------------------- making one
  /** A title nothing in the drawer is using. */
  const freshTitle = (base) => {
    const taken = new Set(desk.listTracks().map((t) => t.title));
    let title = base;
    for (let i = 2; taken.has(title); i++) title = `${base} ${i}`;
    return title;
  };

  function generate(riff, options, seed, rerolls = null) {
    try {
      return generateBanger({ riff, options, seed, rerolls });
    } catch (err) {
      tell('Could not make the banger', escapeHtml(String(err?.message || err)));
      return null;
    }
  }

  const describe = (out, take) => `${out.summary.style} · ${out.summary.key} · ${out.summary.bars} bars · ${out.summary.bpm} BPM · take ${take}`;

  /** Make a Banger… from bars `from`–`to` (0-based) of the song on the desk. */
  async function makeBanger({ from, to }) {
    closeMenu();
    // A song of four bars or fewer is a riff already: one bar picked from it means all of it.
    if (from === to && desk.barCount() <= 4) { from = 0; to = desk.barCount() - 1; }
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

  /**
   * The drawer's Make a Banger…: the selection's bars, or the first four. A single bar
   * selected is a click, not a choice of riff — it counts as no selection.
   */
  function makeFromDrawer() {
    const s0 = desk.selection();
    const s = s0 && s0.to > s0.from ? s0 : null;
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
      out = generate(recipe.riff, t.options, t.seed, t.rerolls);
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

  /** Modify Take…: the recipe in the dialog with the take's shape locked; OK modifies it in place. */
  async function openModify() {
    closeMenu();
    const state = await takes();
    if (!state) return;
    const recipe = state.banger || desk.current().track.banger;
    const answer = await dialog({ mode: 'modify', recipe });
    if (!answer) return;
    await modify(state, recipe, answer);
  }

  /**
   * MODIFY THIS TAKE, in place (Peter's call, 3 Oct): the same seed with the new settings,
   * merged into the take as saved so that only the parts the change reaches are rewritten.
   * A part edited by hand that the change does reach is replaced — and named.
   */
  async function modify(state, recipe, answer) {
    const { id, track } = desk.current();
    if (!await okToLeave(state, 'Modify This Take')) return;
    const rerolls = { ...(recipe.rerolls || {}) };
    for (const stream of answer.rerolls) rerolls[stream] = randomBangerSeed();
    let next;
    let base;
    try {
      next = generateBanger({ riff: recipe.riff, options: answer.options, seed: recipe.seed, rerolls });
      // A take made before parts had fingerprints is made again from its recipe for them.
      // A take made by an older generator may not come out the same, and then its parts
      // cannot be told from hand edits — said, not hidden.
      base = recipe.prints || generateBanger({ riff: recipe.riff, options: recipe.options, seed: recipe.seed, rerolls: recipe.rerolls }).banger.prints;
    } catch (err) {
      await tell('Could not modify the banger', escapeHtml(String(err?.message || err)));
      return;
    }
    const older = !recipe.prints && recipe.generator !== BANGER_GENERATOR_VERSION;
    const saved = desk.savedSong();
    const merged = modifyBanger({
      current: { bank: track.bank, mix: saved.mix || next.mix, arrangement: saved.arrangement || {}, banger: recipe },
      next, base,
    });
    let generated;
    if (merged.ok) {
      generated = { bank: merged.bank, mix: merged.mix, arrangement: merged.arrangement, note: next.note, banger: merged.banger };
    } else {
      const go = await ask('Modify would rebuild the whole take',
        `<p>It can't keep parts this time: ${escapeHtml(merged.reason)}.</p>`
        + `<p>Rebuild take ${state.take} with these settings instead? Its edits and mix go with the old music. `
        + '<b>Make a New Take</b> keeps this one as it is.</p>', 'Rebuild This Take');
      if (!go) return;
      generated = next;
    }
    if (!desk.isStatic()) {
      let res;
      try {
        res = await fetch('/banger-take', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id, direction: 'modify', generated }),
        });
      } catch (err) { await tell('Could not modify the banger', escapeHtml(String(err?.message || err))); return; }
      const text = await res.text();
      if (res.status === 404 && /no modify take/.test(text)) {
        await tell('Restart the desk to use Modify', '<p>The desk server was started before Modify existed, so it does not know how to save a modified take. '
          + 'Restart it (<b>npm run mixer</b>, or the desk launcher) and try again — nothing has been changed.</p>');
        return;
      }
      if (!res.ok) { await tell('Could not modify the banger', escapeHtml(text)); return; }
      const reply = JSON.parse(text);
      forget(id);
      desk.adopt({ track: reply.track, mix: reply.mix, arrangement: reply.arrangement, local: false, swap: true });
    } else {
      const store = readStore(BANGER_TAKES_KEY);
      const mine = store[id] || { take: 1, takes: { 1: { seed: recipe.seed, options: recipe.options, generator: recipe.generator } } };
      mine.takes[mine.take] = { seed: recipe.seed, options: answer.options, rerolls, generator: BANGER_GENERATOR_VERSION };
      store[id] = mine;
      writeStore(BANGER_TAKES_KEY, store);
      forget(id);
      desk.adopt({
        track: { ...track, bank: generated.bank, banger: { ...generated.banger, take: state.take } },
        mix: generated.mix, arrangement: generated.arrangement, local: true, swap: true,
      });
    }
    await desk.selectSong(id);
    if (!merged.ok) { toast(`${track.title}: take ${state.take} rebuilt with the new settings`, 5000); return; }
    toast(`${track.title}: ${describeModify(merged.report)}`, 7000);
    const r = merged.report;
    if (r.handEdited.length || r.handEditedExpression?.length || r.skipped.length || older) {
      await tell('Modified — worth knowing', [
        r.handEdited.length ? `<p>These parts had been edited by hand and are now the new version: <b>${r.handEdited.map(escapeHtml).join(', ')}</b>.</p>` : '',
        r.handEditedExpression?.length ? `<p>These parts had an Auto Portamento setting of their own, and the change replaced it with the new take's (or took it away): <b>${r.handEditedExpression.map(escapeHtml).join(', ')}</b>.</p>` : '',
        r.skipped.length ? `<p>No free lane was left for: <b>${r.skipped.map(escapeHtml).join(', ')}</b>.</p>` : '',
        older ? '<p>This take was made by an older version of the generator, so some parts may have been rewritten that the change did not touch.</p>' : '',
      ].join(''));
    }
  }

  /** The take buttons: shown on a banger only, Previous and Next only where there is one. */
  async function syncButtons() {
    const { track } = desk.current();
    if ($('bangerreport')) $('bangerreport').hidden = !track?.banger;
    // A style seed is tuned, not re-rolled: it gets Use as Style instead of takes.
    const on = !!track?.banger && track.group !== 'bangerSeed';
    for (const id of ['bangeragain', 'bangerprev', 'bangernext', 'bangersettings', 'bangermodify']) {
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
    report: () => {
      closeMenu();
      const { track } = desk.current();
      const opened = ask('Banger Report', bangerReportHtml(track, desk.currentMix?.() || desk.savedSong()?.mix || {}), 'Close', { cancel: false, wide: true });
      $('askbox').scrollTop = 0;
      $('askbody').scrollTop = 0;
      return opened;
    },
    makeBanger,
    makeFromDrawer,
    anotherTake: () => { closeMenu(); return moveTo('another'); },
    previousTake: () => { closeMenu(); return moveTo('previous'); },
    nextTake: () => { closeMenu(); return moveTo('next'); },
    settings,
    modify: openModify,
    syncButtons,
  };
}
