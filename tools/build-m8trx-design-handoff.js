// Bundles a self-contained brief for redesigning the M8TRX panel in Claude Design — the
// third of these, after tools/build-design-handoff.js (a hero) and
// tools/build-synth-design-handoff.js (the pilot instruments). Same rules: one HTML file,
// no server, no network, boots from file://, which is also what Design's CSP requires.
//
// The point of GENERATING it rather than writing it is that the control inventory is read
// out of the panel's OWN markup (`#rearrangepanel` in tools/mixer-shell.html), its option
// lists out of the panel's OWN vocabularies (tools/lib/rearrange.js and the label maps in
// tools/mixer-entry.js), and the palette out of the desk's OWN stylesheet. A button added
// to the toolbar arrives in the brief on the next build; a brief that has drifted from the
// desk is not a possible state.
//
// Two things here ARE hand-written, and both are guarded rather than trusted:
//
//   SCOPES — which of the four scopes each control acts on. This is not recoverable from
//   markup and it is the whole subject of the redesign, so it is a table, and the build
//   FAILS if a control has no scope or a scope names a control that is gone.
//
//   DOM_BUILT — the part cards, the slices and the clip shelf are created in JavaScript,
//   not markup, so they cannot be scanned. Each entry carries a `probe` string that must
//   still appear in mixer-entry.js, so a renamed or deleted card button fails the build
//   instead of quietly staying in the brief.
//
// Usage: node tools/build-m8trx-design-handoff.js
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  REARRANGE_DRUM_MODES, REARRANGE_TRANSPOSES, REARRANGE_FORM_ROLES,
  REARRANGE_CREATIVE_DEFAULTS, REARRANGE_STYLE_DEFAULT,
} from './lib/rearrange.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'work/local/design-handoff');
const outFile = join(outDir, 'm8trx.html');

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const die = (message) => { console.error(`build-m8trx-design-handoff: ${message}`); process.exit(1); };

const shellRaw = readFileSync(join(root, 'tools/mixer-shell.html'), 'utf8');
const entry = readFileSync(join(root, 'tools/mixer-entry.js'), 'utf8');

// ---- the desk's palette, read off the desk -----------------------------------------
//
// Nine themes, and a layout has to survive all of them — which is most of the reason the
// desk owns no hard-coded colours. Parsed rather than copied so a token retuned in the
// stylesheet is retuned here too.
const shellCss = shellRaw.replace(/\/\*[\s\S]*?\*\//g, '');
const declsOf = (body) => {
  const map = {};
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) map[m[1]] = m[2].trim();
  return map;
};
// Merged, not assigned: the desk declares `:root` more than once — the raw hues in one
// block, the derived ones (--well, --faint, --accent-wash) in another — and taking only
// the last would drop --bg on the floor.
const themeBlocks = {};
for (const m of shellCss.matchAll(/:root(?:\[data-mixer-theme="([\w-]+)"\])?\s*\{([^{}]*)\}/g)) {
  const id = m[1] || 'default';
  themeBlocks[id] = Object.assign(themeBlocks[id] || {}, declsOf(m[2]));
}

// The desk's own list, in the desk's own order, with the desk's own names.
const themeSrc = entry.slice(entry.indexOf('const THEMES = ['));
const themeList = [...themeSrc.slice(0, themeSrc.indexOf('];'))
  .matchAll(/\['([\w-]+)',\s*'([^']+)'\]/g)].map((m) => ({ id: m[1], name: m[2] }));
if (themeList.length < 5) die('could not read THEMES out of mixer-entry.js');

// The tokens this panel actually paints with. Smaller than the synth brief's list and
// different in one way: the panel leans on --well (its own background is a well, and so
// is the timeline) and on --faint, which is what a silenced slice fades to.
const TOKENS = [
  ['--bg', 'page behind the panel'], ['--panel', 'the panel'],
  ['--panel2', 'the panel body'], ['--well', 'the timeline behind the rows'],
  ['--line', 'every border'], ['--ink', 'text'], ['--dim', 'a label'],
  ['--faint', 'a silenced slice'],
  ['--accent', 'ON, SELECTED or MOVING'], ['--on-accent', 'text on the accent'],
  ['--accent-line', 'a hovered border'], ['--accent-wash', 'the part that is sounding'],
  ['--hot', 'destructive'], ['--ctl', 'the body of a control'],
  ['--ctl-hi', 'a control, lit'], ['--input', 'a field you can type in'],
  ['--hover', 'hover'], ['--deep', "the panel's drop shadow"],
];
const themes = themeList.map(({ id, name }) => ({
  id, name, vars: { ...themeBlocks.default, ...(themeBlocks[id] || {}) },
}));

// One colour per part of the form, and these are NOT tokens — they are fixed hues,
// deliberately, because a Chorus should be the same colour in all nine themes. Read out
// of the stylesheet so the brief cannot show a hue the panel does not.
const roleColours = REARRANGE_FORM_ROLES.map((role) => {
  const m = new RegExp(`--role-${role.toLowerCase()}\\s*:\\s*(#[0-9a-f]{3,8})`, 'i').exec(shellCss);
  if (!m) die(`no --role-${role.toLowerCase()} colour in mixer-shell.html`);
  return { role, hex: m[1] };
});

// ---- the panel's markup ------------------------------------------------------------
const panelStart = shellRaw.indexOf('<section id="rearrangepanel"');
const panelEnd = shellRaw.indexOf('</section>', panelStart);
if (panelStart < 0 || panelEnd < 0) die('could not find #rearrangepanel in mixer-shell.html');
const panel = shellRaw.slice(panelStart, panelEnd);

/**
 * The panel cut into the zones it reads as, by the markers that open each one.
 *
 * Source order IS the order down the screen now, with no exceptions — that is the whole
 * point of the bands. A control's band is its scope, so the zone a control is scanned out
 * of is also the answer to "what does this act on", and the SCOPES table below is a second
 * opinion on the same question rather than the only one.
 */
const ZONE_MARKS = [
  ['generate', '<div class="reband regen">', 'The Generate band — everything deferred'],
  ['arrangement', '<div class="reband rearr">', 'The Arrangement band'],
  ['material', '<div class="rebar rematerial"', 'Selection · material'],
  ['selarrange', '<div class="rebar rearrops"', 'Selection · arrangement'],
  // No Part zone here: everything that acts on a whole part lives on the part's own card
  // now, which is JS-built and covered by DOM_BUILT below rather than scanned out of markup.
  ['body', '<div class="rebody">', 'The timeline'],
  ['shelf', '<div id="reclipstrip"', 'The clip shelf'],
];
const zones = ZONE_MARKS.map(([id, mark, title], i) => {
  const at = panel.indexOf(mark);
  if (at < 0) die(`zone '${id}' is gone — no '${mark}' in #rearrangepanel`);
  return { id, title, at, mark };
});
for (let i = 0; i < zones.length; i += 1) {
  zones[i].html = panel.slice(zones[i].at, i + 1 < zones.length ? zones[i + 1].at : panel.length);
  if (zones[i].at > (zones[i + 1]?.at ?? Infinity)) die(`zone '${zones[i].id}' is out of source order`);
}
const zoneOf = (id) => zones.find((z) => z.id === id);

const attrsOf = (tag) => {
  const map = {};
  for (const m of tag.matchAll(/([\w-]+)\s*=\s*"([^"]*)"/g)) map[m[1]] = m[2];
  if (/\bhidden\b/.test(tag)) map.hidden = '';
  return map;
};
const textOf = (html) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

// Every `<label for=…>` in the panel, so a control's name comes from the label the user
// actually reads rather than from its id.
const labelFor = {};
for (const m of panel.matchAll(/<label\b([^>]*)>([\s\S]*?)<\/label>/g)) {
  const a = attrsOf(m[1]);
  if (a.for) labelFor[a.for] = textOf(m[2]);
}

// ---- option lists the markup does not carry ------------------------------------------
//
// Four selects are filled in JavaScript, so their options are read from the same sources
// the panel reads them from rather than retyped.
const drumLabelSrc = entry.slice(entry.indexOf('const REARRANGE_DRUM_LABELS = {'));
const drumLabels = Object.fromEntries([...drumLabelSrc.slice(0, drumLabelSrc.indexOf('};'))
  .matchAll(/(\w+):\s*'([^']*)'/g)].map((m) => [m[1], m[2]]));
if (Object.keys(drumLabels).length !== REARRANGE_DRUM_MODES.length) {
  die(`REARRANGE_DRUM_LABELS has ${Object.keys(drumLabels).length} names for ${REARRANGE_DRUM_MODES.length} modes`);
}
const NUMERALS = ['i', 'ii', 'III', 'iv', 'v', 'VI'];
const DYNAMIC_OPTIONS = {
  redrums: ['Auto · Drive', ...REARRANGE_DRUM_MODES.map((m) => drumLabels[m])],
  rekey: ['Detected key', 'None · chromatic', '24 keys — twelve minor, twelve major'],
  reslicetranspose: [`Off, then every semitone ${Math.min(...REARRANGE_TRANSPOSES)} to +${Math.max(...REARRANGE_TRANSPOSES)}`],
  reslicechord: ['As written', ...NUMERALS.map((n) => `${n} (of the song’s key)`)],
};

/**
 * Scan one zone into control rows.
 *
 * The style radiogroup is lifted out first and re-entered as ONE control, because that is
 * what it is on screen — four pills that pick one value — rather than four buttons.
 */
const reads = new Set();
const scan = (zone) => {
  let html = zone.html;
  const rows = [];
  const radio = /<div id="restyle"[\s\S]*?<\/div>/.exec(html);
  if (radio) {
    const options = [...radio[0].matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)]
      .map((m) => ({ text: textOf(m[2]), tip: attrsOf(m[1]).title, on: attrsOf(m[1])['aria-checked'] === 'true' }));
    rows.push({
      id: 'restyle', label: labelFor.restyle || 'Style', kind: 'pills',
      options: options.map((o) => o.text),
      def: options.find((o) => o.on)?.text || REARRANGE_STYLE_DEFAULT,
      tip: options.map((o) => `${o.text} — ${o.tip}`).join(' · '),
    });
    html = html.replace(radio[0], '');
  }

  const found = [];
  for (const m of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
    found.push({ at: m.index, tag: 'button', a: attrsOf(m[1]), inner: m[2] });
  }
  for (const m of html.matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/g)) {
    found.push({ at: m.index, tag: 'select', a: attrsOf(m[1]), inner: m[2] });
  }
  for (const m of html.matchAll(/<input\b([^>]*?)\/?>/g)) {
    found.push({ at: m.index, tag: 'input', a: attrsOf(m[1]), inner: '' });
  }
  found.sort((x, y) => x.at - y.at);

  for (const el of found) {
    const { a } = el;
    if (!a.id) continue;
    if (a.type === 'file') continue; // the hidden picker behind Load JSON…, not a control
    let kind = el.tag;
    let options = null;
    let def = '';
    let range = '';
    if (el.tag === 'select') {
      const declared = [...el.inner.matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/g)]
        .map((m) => ({ text: textOf(m[2]), on: 'selected' in attrsOf(m[1]) || /\bselected\b/.test(m[1]) }));
      options = DYNAMIC_OPTIONS[a.id] || declared.map((o) => o.text);
      def = DYNAMIC_OPTIONS[a.id] ? options[0] : (declared.find((o) => o.on)?.text || declared[0]?.text || '');
      kind = 'select';
    } else if (el.tag === 'input' && a.type === 'range') {
      // A DIAL'S READING IS A WORD. Every slider on this panel reports itself as a name —
      // "Bittersweet", "Woven", "Frisky", "Rolling" — never as its number, and the two
      // ends are captioned under it. The readout is given 11ch in the stylesheet for the
      // longest of them, which is a real constraint on any layout that moves them.
      const out = new RegExp(`<output id="${a.id}value"[^>]*>([\\s\\S]*?)</output>`).exec(zone.html);
      const hint = new RegExp(`<div id="${a.id}hint"[^>]*>([\\s\\S]*?)</div>`).exec(zone.html);
      const ends = hint ? [...hint[1].matchAll(/<span>([\s\S]*?)<\/span>/g)].map((m) => textOf(m[1])) : [];
      kind = 'dial';
      range = ends.length === 2 ? `${ends[0]} ↔ ${ends[1]}` : `${a.min}–${a.max} step ${a.step}`;
      def = out ? `${a.value} · “${textOf(out[1])}”` : a.value;
      if (out) reads.add(textOf(out[1]));
    }
    rows.push({
      id: a.id,
      label: labelFor[a.id] || textOf(el.inner) || a['aria-label'] || a.id,
      kind, options, def, range, tip: a.title || a['aria-label'] || '',
      pressed: 'aria-pressed' in a,
    });
  }
  return rows;
};

for (const zone of zones) zone.rows = scan(zone);
const allRows = zones.flatMap((z) => z.rows.map((r) => ({ ...r, zone: z.id })));

// ---- the four scopes -----------------------------------------------------------------
//
// THE SUBJECT OF THE REDESIGN. Almost every confusion in the panel is two controls that
// look alike acting on different things, and nothing on screen says which. A control's
// scope is not in its markup, so this is the one hand-written table — and it is checked
// against the scan below, both ways, so it cannot rot.
const SCOPE_NAMES = {
  selection: ['Selection', 'The slices currently held — one, a run, or a whole part.'],
  part: ['Part', 'One row of the timeline: a named section (A · Verse), resolved from wherever the selection sits.'],
  arrangement: ['Arrangement', 'The whole recipe — every part, the output length, the transport.'],
  generate: ['Next Generate', 'Changes nothing now. Sets what the NEXT press of Generate will build.'],
  transport: ['Transport', 'Starts, stops or moves the playhead. Changes nothing.'],
  persistence: ['Persistence', 'Writes or reads a file. Changes nothing on screen.'],
  none: ['Read-only', 'Tells you something. Not a control.'],
};
const SCOPES = {
  // The Generate band — every one of these is deferred, and drawn dashed to say so.
  restyle: 'generate',
  remood: 'generate',
  rehypnosis: 'generate',
  rechaos: 'generate',
  redrive: 'generate',
  retranspose: 'generate',
  rekey: 'generate',
  refill: 'generate',
  relength: 'generate',
  reseedhold: 'generate',
  redice: 'arrangement',
  regenerate: 'arrangement',
  // The Arrangement band. M8TRX carries no Undo of its own — while a recipe is live the
  // desk's Undo is M8TRX's and relabels itself, the same borrowing the loop button does.
  redrums: 'arrangement',
  reclearkept: 'arrangement',
  regrab: 'part',
  resaveversion: 'persistence',
  resave: 'persistence',
  reload: 'persistence',
  rereturn: 'arrangement',
  // The door onto Key / Fill new sections / New length / Transpose. Deferred like all four
  // of them, and it counts whichever are off their default so the popup cannot hide one.
  readvancedbtn: 'generate',
  // Selection · material
  reclearselection: 'selection',
  replayfrom: 'transport',
  rerollselected: 'selection',
  reslicetranspose: 'selection',
  reslicechord: 'selection',
  restutter: 'selection',
  redoublerepeats: 'selection',
  rehalfrepeats: 'selection',
  // Selection · arrangement
  recopysection: 'selection',
  repastesection: 'selection',
  remute: 'selection',
  rejoin: 'selection',
  resplit: 'selection',
  reunroll: 'selection',
  reremove: 'selection',
  reloopremove: 'selection',
  reclipselected: 'selection',
  redeleteselected: 'selection',
  // Nothing for the PART scope here: everything that acts on a whole part is on the part's
  // own card now — the W and F marks, ½, ×2, the shelf and its right-click menu — all JS-built, and
  // all described in DOM_BUILT rather than scanned out of the panel's markup.
};
{
  const scanned = new Set(allRows.map((r) => r.id));
  const missing = [...scanned].filter((id) => !SCOPES[id]);
  const stale = Object.keys(SCOPES).filter((id) => !scanned.has(id));
  if (missing.length) die(`no scope for: ${missing.join(', ')} — add them to SCOPES`);
  if (stale.length) die(`SCOPES names controls that are gone: ${stale.join(', ')}`);
}
for (const row of allRows) row.scope = SCOPES[row.id];
for (const zone of zones) for (const row of zone.rows) row.scope = SCOPES[row.id];

// ---- the parts of the panel that are built in JavaScript ------------------------------
//
// Not scannable, so each entry carries a probe that must still be in mixer-entry.js.
const DOM_BUILT = [
  {
    id: 'card', title: 'The part card — the left cap of every row', probe: "seg.className = 'reformseg'",
    note: '372 px wide, fixed. One per part, and it is also the part\'s checkbox: clicking it anywhere that is not a button holds the whole part, double-clicking plays from here and keeps it held, dragging it reorders the form.',
    rows: [
      ['Letter · name', 'button', 'part', 'B · Verse. Clicking it plays from the start of this part.', "name.className = 'reformname'"],
      ['Role chip', 'read-only', 'none', 'An 11 px square in one of five fixed hues — the part\'s role. Always beside the name, never instead of it.', "chip.className = 'rerolechip'"],
      ['Chord line', 'read-only', 'none', 'The walk this part takes, as roman numerals joined by arrows: i ×2 ▸ VI ▸ iv. A held chord is COUNTED rather than repeated, because two bars of the tonic written out as “i i” reads as “ii” — the supertonic, a different chord. Read off the draft recipe, so it shows what will actually sound.', "walk.className = 'reformchords'"],
      ['Bars n–m · ×p', 'read-only', 'none', 'Where the part sits in the output, and how many passes it makes.', "range.className = 'reformbars'"],
      ['🔒 / 🔓', 'toggle', 'part', 'Locked parts are kept verbatim through the next Generate.', "lock.className = 'relock'"],
      ['🎲', 'button', 'part', 'Build this part again from scratch — new material AND a new chop, in exactly the space it already takes. Its walk, its favourites and its fill are kept.', "dice.className = 'rediceSection'"],
      ['½', 'button', 'part', 'Halve this part\'s output. The song gets shorter.', "halve.className = 'rehalve'"],
      ['×2', 'button', 'part', 'Repeat this part once. The song gets longer.', "double.className = 'redouble'"],
      ['W', 'button', 'part', 'Does this part walk a chord loop? Lit when it does; opens the walk menu. The INITIAL of the word, not a pictogram — at this size a rebus is something you re-solve every glance, and a walking figure for “moves around the key” is a pun rather than an icon.', "walkButton.className = 'rewalkbutton'"],
      ['F', 'button', 'part', 'Does this part end on a fill? Lit when it does; opens the fill menu.', "fill.className = 'refillbutton'"],
      ['To shelf', 'button', 'part', 'Save this whole part to the session shelf, for the next Go to reuse.', "shelf.className = 'reclipbutton'"],
    ],
  },
  {
    id: 'slice', title: 'The slice — the blocks across each row', probe: "slice.className = 'reslice'",
    note: 'One per operation in the recipe, at least 58 px tall, and its WIDTH is its time: the panel runs one time scale end to end, so a bar is the same width in every row. What a block says without being clicked is the list below — the toolbar is only for changing it.',
    rows: [
      ['Colour', 'read-only', 'none', 'Its PART, varied. Every block in a row is a member of that part\'s colour family, and a different member for each distinct piece of material in the part — so the row says at a glance how many things are in it and where they change. Three members per family, then it cycles. The same material in another part is another colour: cross-part identity is what the source label is for.', 'rearrangeSliceVariants('],
      ['Width', 'read-only', 'none', 'How long it takes, to the panel\'s one scale.', "slice.style.setProperty('--slicespan'"],
      ['Interior rules', 'read-only', 'none', 'A repeated slice is divided into its passes.', 'slice.dataset.repeats'],
      ['Left edge, thick', 'read-only', 'none', 'The start of every pass after the first, so a doubled part shows its seam.', "slice.dataset.cycle = 'on'"],
      ['Roman numeral or interval', 'read-only', 'none', 'Its chord, or its transpose, at the foot.', "className = 'rechordbadge'"],
      ['Small square', 'read-only', 'none', 'It is part of a fill.', "className = 'refilltick'"],
      ['Hatched and grey', 'read-only', 'none', 'Silenced. It still takes its time.', "slice.dataset.mute = 'on'"],
      ['Accent outline', 'read-only', 'none', 'Selected.', "slice.classList.add('selected')"],
      ['Click / ctrl-click / drag', 'gesture', 'selection', 'Hold one, add or remove one, or hold the run you drag across — across rows too. Double-click plays from that slice.', 'toggleRearrangeSectionSlices'],
    ],
  },
  {
    id: 'shelf', title: 'The clip shelf — the strip under the timeline', probe: "className = 'reclipuse'",
    note: 'Session-only, and hidden until something is on it. Clips are offered to the NEXT Generate; they are not a clipboard, and Copy/Paste in the toolbar is the immediate one.',
    rows: [
      ['Use', 'button', 'generate', 'Offer this clip to the next Generate.', "className = 'reclipuse'"],
      ['Letter', 'select', 'generate', 'Which part letter the clip is offered for.', "className = 'reclipletter'"],
      ['×', 'button', 'generate', 'Take it off the shelf.', "className = 'reclipremove'"],
    ],
  },
];
for (const group of DOM_BUILT) {
  if (!entry.includes(group.probe)) die(`'${group.title}' is gone from mixer-entry.js (probe: ${group.probe})`);
  for (const [label, , , , probe] of group.rows) {
    if (!entry.includes(probe)) die(`'${label}' in '${group.title}' is stale (probe: ${probe})`);
  }
}

// One control lives outside the panel entirely: the desk's transport carries the recipe's
// loop toggle, because it is the desk's loop button wearing a different word.
if (!entry.includes("'Recipe Loop' : 'Recipe Once'")) die('the Recipe Loop/Once toggle has moved');

// ---- counts --------------------------------------------------------------------------
const scopeCounts = {};
for (const row of allRows) scopeCounts[row.scope] = (scopeCounts[row.scope] || 0) + 1;
const domControls = DOM_BUILT.flatMap((g) => g.rows).filter((r) => r[1] !== 'read-only').length;
const total = allRows.length + domControls;

// ---- the page --------------------------------------------------------------------------
const swatches = themes.map((t) => `
  <div class="theme" data-theme="${t.id}">
    <h4>${esc(t.name)}<code>${t.id === 'default' ? 'no attribute' : `data-mixer-theme="${t.id}"`}</code></h4>
    <div class="sw">${TOKENS.map(([k, why]) => `
      <div class="s" title="${esc(why)}">
        <i style="background:${esc(t.vars[k] || 'transparent')}"></i>
        <em>${esc(k.slice(2))}</em><b>${esc(t.vars[k] || '—')}</b>
      </div>`).join('')}</div>
  </div>`).join('');

const scopeTag = (scope) => `<span class="sc sc-${scope}">${esc(SCOPE_NAMES[scope][0])}</span>`;

const rowHtml = (r) => `<tr>
  <td class="lab">${esc(r.label)}
    ${r.tip ? `<div class="tip">${esc(r.tip)}</div>` : ''}</td>
  <td class="kind">${esc(r.kind)}${r.pressed ? '<div class="meta">held state</div>' : ''}</td>
  <td class="rng">${r.options
    ? `<div class="opts">${r.options.map((o) => `<span>${esc(o)}</span>`).join('')}</div>`
    : esc(r.range || '—')}</td>
  <td class="def">${esc(r.def || '—')}</td>
  <td class="scope">${scopeTag(r.scope)}</td>
</tr>`;

const table = (rows) => `<table><thead><tr>
    <th>Control</th><th>Kind</th><th>Range or options</th><th>Default</th><th>Acts on</th>
  </tr></thead><tbody>${rows.map(rowHtml).join('')}</tbody></table>`;

const zoneCard = (zone, note) => `
  <article class="card">
    <h3>${esc(zone.title)}<span class="n">${zone.rows.length} control${zone.rows.length === 1 ? '' : 's'}</span></h3>
    ${note ? `<p class="tips">${note}</p>` : ''}
    ${zone.rows.length ? table(zone.rows) : '<p class="tips">No controls — this zone is text.</p>'}
  </article>`;

const domCard = (group) => `
  <article class="card">
    <h3>${esc(group.title)}<span class="n">built in JS</span></h3>
    <p class="tips">${esc(group.note)}</p>
    <table><thead><tr><th>Part</th><th>Kind</th><th>What it says or does</th><th>Acts on</th></tr></thead>
    <tbody>${group.rows.map(([label, kind, scope, what]) => `<tr>
      <td class="lab">${esc(label)}</td>
      <td class="kind">${esc(kind)}</td>
      <td class="rng" style="white-space:normal">${esc(what)}</td>
      <td class="scope">${scopeTag(scope)}</td>
    </tr>`).join('')}</tbody></table>
  </article>`;

const html = `<!-- @dsCard group="M8TRX" -->
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MASHENSTEIN — M8TRX panel</title>
<style>
  /* The desk's own tokens, so this brief is written in the palette it is a brief for.
     Switching the backdrop switches the page, which is the cheapest possible way to see
     whether a colour decision survives all ${themes.length}. */
${themes.map((t) => `  ${t.id === 'default' ? ':root, [data-theme="default"]' : `[data-theme="${t.id}"]`} {
${Object.entries(t.vars).filter(([k]) => TOKENS.some(([n]) => n === k))
    .map(([k, v]) => `    ${k}: ${v};`).join('\n')}
  }`).join('\n')}
  * { box-sizing: border-box; }
  html, body { margin:0; padding:0; background:var(--bg); color:var(--ink);
               font:13px/1.55 ui-monospace, SFMono-Regular, Menlo, monospace; }
  header { padding:26px 26px 20px; background:var(--panel); border-bottom:1px solid var(--line); }
  h1 { margin:0; font-size:20px; letter-spacing:.02em; font-weight:500; }
  h1 span { color:var(--dim); font-size:12px; font-weight:400; margin-left:12px; }
  .brief { max-width:82ch; margin:14px 0 0; color:var(--dim); font-size:12.5px; line-height:1.7; }
  .brief b, .brief strong { color:var(--ink); }
  .box { max-width:82ch; margin:16px 0 0; padding:14px 16px; background:var(--panel2);
         border:1px solid var(--line); border-left:3px solid var(--accent); border-radius:5px;
         font-size:12.5px; line-height:1.7; }
  .box h2 { margin:0 0 8px; font-size:11px; letter-spacing:.12em; text-transform:uppercase;
            color:var(--accent); }
  .box ul { margin:8px 0 0; padding-left:20px; }
  .box li { margin:5px 0; }
  .box li b { color:var(--ink); }
  .bar { position:sticky; top:0; z-index:5; display:flex; gap:6px; flex-wrap:wrap; align-items:center;
         padding:9px 26px; background:var(--panel); border-bottom:1px solid var(--line); }
  .bar > span { font-size:10px; letter-spacing:.11em; text-transform:uppercase; color:var(--dim);
                margin-right:4px; }
  .bar button { font:inherit; font-size:11.5px; padding:3px 10px; cursor:pointer;
                color:var(--dim); background:var(--bg); border:1px solid var(--line);
                border-radius:99px; }
  .bar button.on { color:var(--accent); border-color:var(--accent); background:var(--panel2); }
  main { padding:0 26px 80px; }
  section { margin:34px 0 0; }
  section > h2 { margin:0 0 4px; font-size:11.5px; letter-spacing:.13em; text-transform:uppercase;
                 color:var(--accent); border-bottom:1px solid var(--line); padding-bottom:7px; }
  p.note { max-width:82ch; margin:10px 0 16px; color:var(--dim); font-size:12.5px; line-height:1.7; }
  p.note b { color:var(--ink); }
  .stats { display:flex; flex-wrap:wrap; gap:10px; margin:14px 0 0; }
  .stat { flex:1 1 130px; padding:10px 12px; background:var(--panel); border:1px solid var(--line);
          border-radius:5px; }
  .stat b { display:block; font-size:22px; font-weight:500; color:var(--accent); line-height:1.2; }
  .stat em { font-style:normal; font-size:10.5px; letter-spacing:.06em; text-transform:uppercase;
             color:var(--dim); }
  .cards { display:grid; gap:12px; grid-template-columns:repeat(auto-fill, minmax(560px, 1fr)); }
  .card { background:var(--panel); border:1px solid var(--line); border-radius:6px;
          padding:11px 12px 4px; min-width:0; overflow-x:auto; }
  .card h3 { margin:0 0 7px; font-size:12.5px; font-weight:500; letter-spacing:.03em;
             display:flex; align-items:baseline; gap:8px; }
  .card h3 .n { margin-left:auto; font-size:10px; color:var(--dim); font-weight:400; }
  .tips { margin:0 0 9px; font-size:11px; line-height:1.6; color:var(--dim); }
  .tips b { color:var(--ink); font-weight:500; }
  table { width:100%; border-collapse:collapse; font-size:11.5px; }
  th { text-align:left; font-size:9.5px; letter-spacing:.09em; text-transform:uppercase;
       color:var(--dim); font-weight:500; padding:4px 7px 5px; border-bottom:1px solid var(--line); }
  td { padding:6px 7px; border-bottom:1px solid var(--line); vertical-align:top; }
  tr:last-child td { border-bottom:none; }
  td.lab { color:var(--ink); white-space:nowrap; }
  td.kind, td.def { color:var(--dim); white-space:nowrap; }
  td.rng { color:var(--ink); }
  td.scope { white-space:nowrap; }
  .tip, .meta { white-space:normal; max-width:38ch; margin:3px 0 0; line-height:1.5; }
  .tip { font-size:10.5px; color:var(--dim); }
  .meta { font-size:9.5px; color:var(--accent); opacity:.85; }
  .opts { display:flex; flex-wrap:wrap; gap:3px; max-width:34ch; }
  .opts span { font-size:10px; padding:1px 6px; border-radius:99px; border:1px solid var(--line);
               color:var(--dim); white-space:nowrap; }
  /* The four scopes get four colours ON THIS PAGE ONLY — the desk has no such palette,
     and inventing one is part of the commission, not a decision already taken. */
  .sc { font-size:9.5px; letter-spacing:.04em; padding:1.5px 7px; border-radius:99px;
        border:1px solid currentColor; white-space:nowrap; }
  .sc-selection { color:#4f9dd9; } .sc-part { color:#e8a33d; }
  .sc-arrangement { color:#b57bd8; } .sc-generate { color:#6fae8f; }
  .sc-transport, .sc-persistence, .sc-none { color:var(--dim); border-color:var(--line); }
  .scopes { display:grid; gap:12px; grid-template-columns:repeat(auto-fill, minmax(300px, 1fr)); }
  .scopebox { background:var(--panel); border:1px solid var(--line); border-radius:6px;
              padding:12px 13px; border-left:3px solid currentColor; }
  .scopebox p { margin:7px 0 0; font-size:11.5px; line-height:1.6; color:var(--dim); }
  .scopebox .c { float:right; font-size:20px; font-weight:500; line-height:1; }
  .themes { display:grid; gap:12px; grid-template-columns:repeat(auto-fill, minmax(330px, 1fr)); }
  .theme { background:var(--panel); border:1px solid var(--line); border-radius:6px; padding:11px 12px; }
  .theme h4 { margin:0 0 9px; font-size:12px; font-weight:500; display:flex; align-items:baseline; gap:8px; }
  .theme h4 code { margin-left:auto; font-size:9.5px; color:var(--dim); }
  .sw { display:grid; gap:4px 10px; grid-template-columns:repeat(2, 1fr); }
  .s { display:flex; align-items:center; gap:6px; font-size:10px; min-width:0; }
  .s i { flex:none; width:13px; height:13px; border-radius:3px; border:1px solid var(--line); }
  .s em { font-style:normal; color:var(--dim); flex:none; }
  .s b { font-weight:400; color:var(--ink); opacity:.7; margin-left:auto;
         overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .roles { display:flex; flex-wrap:wrap; gap:8px; margin:12px 0 0; }
  .role { display:flex; align-items:center; gap:7px; padding:7px 12px; background:var(--panel);
          border:1px solid var(--line); border-radius:5px; font-size:11.5px; }
  .role i { width:13px; height:13px; border-radius:3px; }
  .role code { font-size:10px; color:var(--dim); }
  @media (max-width:700px) { header, .bar, main { padding-left:14px; padding-right:14px; } }
</style>
</head>
<body>
<header>
  <h1>M8TRX — the arrangement panel<span>MASHENSTEIN · Song Mixer</span></h1>
  <p class="brief">
    <b>M8TRX</b> is a performance layer over a finished song. It cuts the song's whole band
    into slices and rebuilds it as a generated <b>recipe</b> — a form of named parts, each
    part a row of slices — which you then play, edit and reroll. <b>It never changes the
    song.</b> Nothing in this panel writes to the arrangement, the mix, the notes or the
    game's copy of the track; the recipe is a draft that exists until you clear it.
    <br><br>
    It is a <b>full-window panel</b>: fixed, <code>100vw − 24px</code> wide, floating over
    the desk from 56&nbsp;px down, with the transport still aimable underneath. Today it has
    <b>${total} controls</b> in it, in ${zones.length} zones stacked down the window, and the
    top three of those — a six-column grid of dials and buttons, a block of prose, and an
    "Advanced" cluster beside them — are where it comes apart.
  </p>
  <div class="box">
    <h2>The commission</h2>
    <p style="margin:0">
      <b>Redesign the panel, all ${zones.length} zones of it.</b> Assume the browser window: roughly
      1280&nbsp;px to 2560&nbsp;px wide, 720&nbsp;px to 1440&nbsp;px tall, at whatever aspect
      the window happens to be, and assume the timeline needs most of the height it can get.
      Grouping, hierarchy, what is on screen at once and what is behind a disclosure, control
      shapes, how the toolbar relates to the thing it edits — all open.
    </p>
    <ul>
      <li><b>The real problem is scope, not density.</b> Four different things can be acted
        on — the <em>selection</em>, one <em>part</em>, the whole <em>arrangement</em>, and
        what the <em>next Generate</em> will build — and almost nothing on screen says which
        one a control touches. Two controls named Fill do different jobs for this reason.
        Every control below is tagged with its scope. <b>Making those four legible is the
        job.</b></li>
      <li><b>Palette and typeface stay the desk's.</b> Every colour comes from the tokens
        below, and the layout has to survive all ${themes.length} themes, light and dark.
        Nothing hard-coded — with one deliberate exception, the five part-role hues, which
        are fixed on purpose and explained in their own section.</li>
      <li><b>Every control below has to survive.</b> All ${total} of them. If you want to drop
        one, say which and why; if two should merge, say so; if you want a new one, name what
        it would do. Those are useful answers — silently losing one is not.</li>
      <li><b>The timeline is the panel.</b> One time scale end to end: a bar is the same width
        in every row, so a four-bar part draws half as long as an eight-bar one. That is what
        makes parts comparable by eye and it is not negotiable. Everything else is chrome
        around it and should cost as little height as it can.</li>
      <li><b>It is DOM and CSS in a browser</b>, driven by mouse and trackpad, and it is
        <em>played</em> — things move while you are looking at them. The part that is sounding
        is washed with the accent, the playhead runs, and a pending Generate lands at the next
        bar with the whole timeline drawn dashed until it does. Buttons grey out rather than
        coming and going, deliberately, so the timeline never jumps under a pointer already
        heading for a slice. Keep that promise or improve on it.</li>
      <li><b>Legibility beats decoration.</b> This is a desk rule with scars: a lit button
        that drew accent text on an accent background measured 1.00:1 and was invisible; hot
        text on the light themes' pale buttons measured 2.91:1, so the colour moved to the
        border. Check every state in the pale themes as well as the dark ones.</li>
    </ul>
  </div>
  <div class="box" style="border-left-color:var(--hot)">
    <h2>Giving notes that can be applied</h2>
    <ul>
      <li>Phrase every change as <b>name: current &rarr; proposed</b>, using a name from the
        tables below.</li>
      <li>Layout notes are best as <b>which zone sits where, and why</b> — the zones are what
        the panel is assembled from, and moving one is a small change.</li>
      <li>Where a rename would fix a scope confusion, say the scope you read from the current
        name and the one you meant. That is the most valuable kind of note here.</li>
    </ul>
  </div>
</header>
<div class="bar"><span>Theme</span>${themes
  .map((t, i) => `<button data-t="${t.id}"${i ? '' : ' class="on"'}>${esc(t.name)}</button>`).join('')}</div>
<main>
  <section>
    <h2>The size of the problem</h2>
    <div class="stats">
      <div class="stat"><b>${total}</b><em>controls</em></div>
      <div class="stat"><b>${zones.length}</b><em>bands</em></div>
      <div class="stat"><b>4</b><em>scopes, each named</em></div>
      <div class="stat"><b>${scopeCounts.generate || 0}</b><em>deferred, drawn dashed</em></div>
      <div class="stat"><b>${themes.length}</b><em>themes to survive</em></div>
      <div class="stat"><b>100vw</b><em>today's width</em></div>
    </div>
  </section>
  <section>
    <h2>The four scopes</h2>
    <p class="note">
      Read this first. Every control in every table below carries one of these tags. The
      colours are <b>this page's invention, not the desk's</b>, and deliberately so: four
      scope hues would collide with four of the five fixed part-role hues, so on the panel
      itself a scope is named in WORDS and never carried by colour. Three more tags appear
      for the controls that act on nothing: transport, persistence, and read-only.
    </p>
    <div class="scopes">
${['selection', 'part', 'arrangement', 'generate'].map((s) => `      <div class="scopebox sc-${s}">
        <span class="c">${scopeCounts[s] || 0}</span>
        <b style="font-size:13px">${esc(SCOPE_NAMES[s][0])}</b>
        <p>${esc(SCOPE_NAMES[s][1])}</p>
      </div>`).join('\n')}
    </div>
    <p class="note" style="margin-top:16px">
      <b>How the panel answers this.</b> A control's <b>band is its scope</b>, permanently:
      the bands stack in a fixed order down the panel, so the meaning of a row never changes
      under you. Each band carries a 212&nbsp;px rail down its right naming the scope and,
      on the three that act now, the live subject a press would hit — "2 slices in B ·
      Verse", "all of B", "nothing held". Everything in the Generate band is
      <b>drawn dashed</b>, which is the panel's existing word for "made, not yet heard"
      (a pending edit already dashed the timeline) used for the whole of what it means. A
      rail whose scope holds nothing <b>collapses to one line of instruction at the same
      height</b>, so the timeline below never moves under a pointer already heading for a
      slice. The two Fills are two bands apart and named for what they touch:
      <b>Fill new sections</b> only affects what Go builds, <b>Fill this ending</b> acts on
      the part in hand, now.
    </p>
  </section>
  <section>
    <h2>Palette</h2>
    <p class="note">
      The desk's tokens, read out of <b>tools/mixer-shell.html</b> at build time. The rule the
      desk already follows: <b>--ctl</b> carries the bulk of the surface and <b>--accent</b> is
      reserved for things that are <em>on, selected or moving</em>. In this panel the accent is
      already doing four jobs at once — the selected slice's outline, the locked part's inset,
      the sounding part's wash, and the lit Play button — so it is close to spent. Use the
      buttons at the top to put this page into any theme.
    </p>
    <div class="themes">${swatches}</div>
  </section>
  <section>
    <h2>The five part-role hues — the one hard-coded colour</h2>
    <p class="note">
      Fixed hues, not tokens, and deliberately so: the desk's accent is teal in one theme,
      gold in another and cyan in a third, but <b>a Chorus should be the same colour in all
      ${themes.length}</b> — the point of the colour is that the third chorus is recognisably
      the same part as the first. Mid-lightness and saturated, so a chip reads on the darkest
      panel and the lightest alike, and no two are a red/green pair. Always beside the part's
      NAME, never instead of it.
    </p>
    <div class="roles">${roleColours.map((r) => `
      <div class="role"><i style="background:${esc(r.hex)}"></i>${esc(r.role)}<code>${esc(r.hex)}</code></div>`).join('')}
    </div>
  </section>
  <section>
    <h2>The control surface — zone by zone</h2>
    <p class="note">
      Generated from the panel's own markup, in source order, which is the order the zones
      stack down the window — with one exception noted on the card. <b>Kind</b> is what it is
      today, not what it must be. The prose under a control is its current tooltip, verbatim:
      it is the only explanation a user gets, and how much of it there is tells you how much
      the layout is failing to say.
    </p>
    <div class="cards">
${zoneCard(zoneOf('generate'), `The top band, recessed onto <code>--panel2</code>, rail dashed. <b>Nothing in it is heard until Go is pressed</b>, and every control says so with its own dashed border rather than leaning on the band to say it once — a control is read where the pointer is, not where the label is. "Advanced" used to hold Key, Fill and Transpose behind the fold; it is gone as a concept, because those three were only advanced in the sense of having nowhere to sit.
      <br><br><b>Every dial reports a word, never a number</b> — ${[...reads].map((r) => `“${esc(r)}”`).join(', ')} — with its two ends captioned underneath. The readout is given <b>11 characters</b> of room for the longest of them, or the value shifts every time it crosses a band. Any layout that narrows a dial has to keep that.`)}
${zoneCard(zoneOf('arrangement'), 'The whole recipe, and the song it never touches — and nothing on the row but controls. What is loaded and what just happened went to the desk\'s own status bar at the foot of the window, which the panel now stops above rather than covering. The DESK also lends M8TRX three of its controls, each relabelled so you can see that it has: <b>Undo M8TRX</b> (M8TRX\'s history only — the desk\'s mix and arrangement history waits untouched and comes back on Return to Song), <b>Recipe Once / Recipe Loop</b>, and the <b>?</b>, which opens M8TRX\'s own help instead of the desk tour. There is no close button: the M8TRX button in the toolbar is the way in and the way out.')}
${zoneCard(zoneOf('material'), 'What the held slices are MADE OF: roll new material under them, move their pitch, set their chord, stutter them, add or drop a repeat. The rail names the live subject — “2 slices in B · Verse” — and with nothing held the whole row collapses to “Click a slice in the timeline to change what it is made of.” at the same height.')}
${zoneCard(zoneOf('selarrange'), 'What the held slices ARE and where they sit: copy, paste, mute, join, split, borrow, loop, shelf, delete. Split from the material rail because they are two different questions about the same selection, and one bar of twenty buttons made them read as one list.')}
${zoneCard(zoneOf('body'), 'The timeline itself — every part card and every slice is created in JavaScript. See the three cards below. Everything that acts on a whole PART lives on the part\'s own card now, rather than in a rail down here: a row at the foot of the panel for edits aimed at the thing under your pointer meant travelling the height of the window and back. It was once three controls wrapped in a faint box at the end of one long toolbar — <b>and that box was the only scope cue in the entire panel</b>.')}
${zoneCard(zoneOf('shelf'), 'Hidden until a clip is on it. Its contents are built in JavaScript — see below.')}
${DOM_BUILT.map(domCard).join('\n')}
    </div>
  </section>
  <section>
    <h2>Two things that are not in the panel</h2>
    <p class="note">
      <b>The open button</b> lives in the desk's own toolbar (<code>#rearrangebtn</code>) and
      is not yours to move. <b>Recipe Loop / Recipe Once</b> is the desk's loop button wearing
      a different word while a recipe is active — it decides whether a finished recipe starts
      again, and it defaults to <b>Once</b>, because M8TRX is for auditioning an arrangement
      rather than for looping one. If the redesign wants that toggle inside the panel, say so:
      it is a real proposal, not a detail.
    </p>
  </section>
</main>
<script>
  for (const b of document.querySelectorAll('.bar button')) {
    b.onclick = () => {
      document.documentElement.dataset.theme = b.dataset.t;
      for (const o of document.querySelectorAll('.bar button')) o.classList.toggle('on', o === b);
    };
  }
</script>
</body>
</html>
`;

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, html);
console.log(`${outFile} (${(html.length / 1024).toFixed(0)} KB)`);
console.log(`  ${total} controls across ${zones.length} zones, ${themes.length} themes`);
for (const zone of zones) console.log(`    ${zone.id.padEnd(10)} ${String(zone.rows.length).padStart(2)}  ${zone.title}`);
console.log(`  scopes: ${Object.entries(scopeCounts).map(([s, n]) => `${s} ${n}`).join(' · ')}`);
console.log(`  defaults read: style ${REARRANGE_STYLE_DEFAULT}, dials ${JSON.stringify(REARRANGE_CREATIVE_DEFAULTS)}`);
