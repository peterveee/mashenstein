// Bundles self-contained briefs for designing the pilot instruments' Advanced editor in
// Claude Design — the sibling of tools/build-design-handoff.js, which does the same job
// for a hero. Same rules: one HTML file per synth, no server, no network, boots from
// file://, which is also what Design's CSP requires.
//
// MRDR-3 and KLNG8 share one full-window Advanced surface in the game
// (`tools/mixer-synth-full.js`, `FULL_EDITORS`), so they are built as a matched pair here
// too — same palette read, same table renderer, same rules for what a brief may claim.
// Only the per-synth prose and control inventory differ.
//
// The point of generating it rather than writing it is that the control inventory is
// read out of the panel's OWN definition (`panelSpec` in tools/mixer-voice-editor.js)
// and the palette out of the desk's OWN stylesheet. A card added to a panel arrives in
// its brief on the next build; a brief that has drifted from the desk is not a possible
// state. The prose is the only hand-written part, and it says nothing a generated table
// also says.
//
// Usage: node tools/build-synth-design-handoff.js
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { panelSpec } from './mixer-voice-editor.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'work/local/design-handoff');

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---- the desk's palette, read off the desk ----------------------------------
//
// Nine themes, and a layout has to survive all of them — which is most of the reason
// the desk owns no hard-coded colours. Parsed rather than copied so a token retuned in
// the stylesheet is retuned here too. Read once and shared by every synth's brief.
const shell = readFileSync(join(root, 'tools/mixer-shell.html'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '');
const declsOf = (body) => {
  const map = {};
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) map[m[1]] = m[2].trim();
  return map;
};
const themeBlocks = {};
for (const m of shell.matchAll(/:root(?:\[data-mixer-theme="([\w-]+)"\])?\s*\{([^{}]*)\}/g)) {
  themeBlocks[m[1] || 'default'] = declsOf(m[2]);
}
// The desk's own list, in the desk's own order, with the desk's own names — parsed out
// of mixer-entry.js so a brief cannot offer a theme the picker does not.
const entry = readFileSync(join(root, 'tools/mixer-entry.js'), 'utf8');
const themeList = [...entry.slice(entry.indexOf('const THEMES = ['))
  .slice(0, entry.slice(entry.indexOf('const THEMES = [')).indexOf('];'))
  .matchAll(/\['([\w-]+)',\s*'([^']+)'\]/g)].map((m) => ({ id: m[1], name: m[2] }));

// The tokens worth showing. Every one of them is load-bearing somewhere on the desk;
// the rest of the `:root` block is geometry, which a brief states in prose instead.
const TOKENS = [
  ['--bg', 'page behind the panels'], ['--panel', 'a panel'], ['--panel2', 'a panel inset'],
  ['--line', 'every border'], ['--ink', 'text'], ['--dim', 'a label'],
  ['--accent', 'ON, SELECTED or MOVING'], ['--hot', 'destructive, or clipping'],
  ['--ctl', 'the body of a control'], ['--ctl-hi', 'a control, lit'],
  ['--input', 'a field you can type in'], ['--hover', 'hover'],
  ['--primary', 'the confirming button'], ['--cell', 'a grid cell'],
];
const themes = themeList.map(({ id, name }) => {
  const vars = { ...themeBlocks.default, ...(themeBlocks[id] || {}) };
  return { id, name, vars };
});
const swatches = themes.map((t) => `
  <div class="theme" data-theme="${t.id}">
    <h4>${esc(t.name)}<code>${t.id === 'default' ? 'no attribute' : `data-mixer-theme="${t.id}"`}</code></h4>
    <div class="sw">${TOKENS.map(([k, why]) => `
      <div class="s" title="${esc(why)}">
        <i style="background:${esc(t.vars[k] || 'transparent')}"></i>
        <em>${esc(k.slice(2))}</em><b>${esc(t.vars[k] || '—')}</b>
      </div>`).join('')}</div>
  </div>`).join('');

/**
 * A row's or a card's `when` as something a designer can read.
 *
 * These are real functions, so `String(fn)` is their SOURCE. MRDR-3's layer cards are
 * built in a `for` loop, so that source can still carry the loop's own variables: `${p}`
 * for the layer's path, `${base}` for a pitch envelope's, a bare `p` handed to
 * `sectionOn`, and a bare `i` for which of the three layers this is — the caller knows
 * all three, so they are substituted back in rather than printed, and `i === 1` is then
 * decided here because "(i === 1 || …)" in a design brief is a leaked implementation
 * detail, not a condition. KLNG8's groups carry none of that — `p`/`base` stay
 * empty and `i` stays 0, and the substitutions below are simply no-ops.
 *
 * Everything after that is cosmetic and applies to both synths alike: drop the arrow
 * head, unwrap `getAt` and `sectionOn`, and lose the optional chaining that only ever
 * mattered to the panel.
 */
const condOf = (fn, { p = '', base = '', i = 0 } = {}) => {
  if (typeof fn !== 'function') return '';
  let s = String(fn).replace(/\s+/g, ' ').trim();
  if (p) s = s.replaceAll('${p}', p).replace(/sectionOn\(v, p\)/g, `sectionOn(v, '${p}')`);
  if (base) s = s.replaceAll('${base}', base);
  s = s.replace(/^\(?\s*v\s*\)?\s*=>\s*/, '');
  s = s.replace(/getAt\(v,\s*[`'"]\$?([^`'"]+)[`'"]\)/g, '$1');
  s = s.replace(/sectionOn\(v,\s*[`'"]?\$?([^`'",)]+)[`'"]?\)/g, '$1 is ON');
  // After the unwrap, so the clause being reduced no longer contains brackets of its own.
  if (i) s = s.replace(/\(i === 1 \|\| ([^)]+)\)(?: && )?/, i === 1 ? '' : '$1 && ');
  s = s.replace(/\bv\?\./g, '').replace(/\bv\./g, '').replace(/\?\./g, '.');
  s = s.replace(/NATIVE_SYNTHS\.includes\(synth\)/g, 'a native synth');
  return s.trim();
};

/** What the pot's travel is, in the unit printed under it. */
const rangeOf = (row, short) => {
  if (row.kind === 'pick') {
    return row.options.map((o) => {
      const pill = short[o] ?? String(o).toUpperCase();
      return pill === String(o) ? pill : `${pill}<span class="raw">(${esc(String(o))})</span>`;
    }).join(' ');
  }
  const u = row.unit ? ` ${esc(row.unit)}` : '';
  return `${row.min} … ${row.max}${u}<span class="raw">step ${row.step}</span>`;
};

/** The things about a control that change what it should LOOK like. */
const notesOf = (row) => {
  const out = [];
  if (row.origin === 0 && row.min < 0) out.push('bipolar — centre detent');
  // Two different non-linearities, and a designer drawing the travel needs to know
  // which: a power curve leans the travel toward one end, the log taper spends it
  // evenly per decade — a quarter turn per ×10 on every envelope time.
  if (row.taper === 'log') out.push('log taper — a decade per quarter turn');
  else if (row.scale) out.push('non-linear taper');
  if (row.read) out.push('display unit ≠ stored unit');
  if (row.trio) out.push(`one third of the ${esc(row.trio)} trio`);
  if (row.startRow) out.push('starts a fresh row');
  if (row.derived) out.push('shares its key with a sibling control');
  return out;
};

/**
 * The Taps card, for the one synth that has one, is not a fixed row count: `tapsGroup()`
 * (tools/mixer-voice-editor.js) draws a TAPS stepper that adds or removes a repeat, and
 * every control after it only exists because TAPS is above 1 — up to five per-repeat
 * timing knobs, a FALLOFF, PITCH and TONE walk, and optional per-tap LEVEL/DECAY override
 * arrays. A table can't say "1 to 7 rows" honestly, so this card is prose instead, and
 * its controls are deliberately left out of the totals above rather than force-fit into
 * a count that would misstate what's actually on screen at any one TAPS setting.
 *
 * On screen the per-tap three are drawn as a TABLE — a row per tap, a column per number,
 * the column named once at its head — so TIME, LEVEL and DECAY below are columns rather
 * than knobs with names on them. In the full window the whole card lives behind a door in
 * the Master card's header, labelled with the count: `TAPS`, or `TAPS 3` at three taps.
 */
const tapsCardHtml = () => `<article class="card">
    <h3>Taps<span class="n">dynamic</span></h3>
    <p class="bits"><span class="tag">not a fixed row count — see note</span>
      <span class="tag">a row per tap</span></p>
    <p class="tips"><b>Only synth with this card.</b> One tap needs nothing; the card
      only exists once there is something to repeat. In the full window it is a door on
      the Master card, and the door carries the count.</p>
    <table><thead><tr>
      <th>Control</th><th>Kind</th><th>Range</th><th>Default</th><th>Key</th>
    </tr></thead><tbody>
      <tr><td class="lab">TAPS<div class="tip">Adds or removes one repeat at a time; a new
        one lands after the last by the gap the last one used, so adding to a clap keeps
        its rhythm instead of restarting it.</div></td>
        <td class="kind">stepper</td><td class="rng">1 … 6<span class="raw">step 1</span></td>
        <td class="def">1</td><td class="key"><code>$taps.length</code></td></tr>
      <tr><td class="lab">TIME<div class="tip">The table's first column: one knob per
        repeat beyond the first, appearing as TAPS grows. Each keeps its own offset rather
        than being generated from a count and a spacing — authored claps are unevenly
        spaced on purpose. Tap 1 is the sound itself and reads a fixed 0ms.</div>
        <div class="meta">up to 5 controls, only as many as TAPS − 1</div></td>
        <td class="kind">pot</td><td class="rng">2 … 200 ms<span class="raw">step 1ms</span></td>
        <td class="def">12ms × repeat index</td><td class="key"><code>$taps[i]</code></td></tr>
      <tr><td class="lab">FALLOFF<div class="tip">How much quieter each repeat is than the
        one before it.</div></td>
        <td class="kind">pot</td><td class="rng">0.2 … 1<span class="raw">step 0.01</span></td>
        <td class="def">0.78</td><td class="key"><code>$tapFalloff</code></td></tr>
      <tr><td class="lab">PITCH<div class="tip">How far each repeat is pitched from the
        one before it.</div></td>
        <td class="kind">pot</td><td class="rng">0.8 … 1.25<span class="raw">step 0.005</span></td>
        <td class="def">1 (no walk)</td><td class="key"><code>$tapDetune</code></td></tr>
      <tr><td class="lab">TONE<div class="tip">How much duller or brighter each repeat is
        than the one before it.</div></td>
        <td class="kind">pot</td><td class="rng">0.6 … 1.4<span class="raw">step 0.01</span></td>
        <td class="def">1 (no walk)</td><td class="key"><code>$tapTone</code></td></tr>
      <tr><td class="lab">LEVEL<div class="tip">The table's second column: this tap's own
        level, in place of FALLOFF's curve.</div>
        <div class="meta">optional array, one entry per tap — only when stored</div></td>
        <td class="kind">pot</td><td class="rng">0 … 2<span class="raw">step 0.005</span></td>
        <td class="def">falloff^i</td><td class="key"><code>$tapGains[i]</code></td></tr>
      <tr><td class="lab">DECAY<div class="tip">The table's third column: this tap's own
        length, in place of the section's decay.</div>
        <div class="meta">optional array, one entry per tap — only when stored</div></td>
        <td class="kind">pot</td><td class="rng">5 … 600 ms<span class="raw">step 1ms</span></td>
        <td class="def">noise decay</td><td class="key"><code>$tapDecays[i]</code></td></tr>
    </tbody></table>
  </article>`;

/**
 * One synth's full brief, built from its own `panelSpec()`. Returns the HTML for
 * `<main>` plus the counts the header stats and commission prose quote, so every number
 * on the page is the one the table underneath it actually adds up to.
 */
function buildBody(synth) {
  const spec = panelSpec(synth.voice);
  const short = spec.pillLabels;

  let controls = 0;
  let conditional = 0;
  const cardHtml = (g, { common = false } = {}) => {
    if (g.taps) return tapsCardHtml();
    const rows = (g.rows || []).flat(Infinity).filter(Boolean);
    controls += rows.length;
    // Which of the three layers this card belongs to, taken from its own title — the
    // one place the loop index survives into the data. `Osc 2 · Filter` is layer 2, and
    // that is what `${p}` and `i` were when its conditions were written. Groups outside
    // MRDR-3's layer loop never match this pattern, so `i` is 0 and `p` stays empty.
    const i = Number(/^Osc (\d)\b/.exec(g.title)?.[1] || 0);
    const p = i ? `layer.osc${i}` : '';
    const gCond = condOf(g.when, { p, i });
    const bits = [];
    if (g.optional) bits.push(`<span class="tag opt">switched section · <code>${esc(g.optional)}</code></span>`);
    if (g.solo) bits.push('<span class="tag">has a SOLO button</span>');
    if (common) bits.push('<span class="tag">on every preset, not just this synth</span>');
    if (gCond) bits.push(`<span class="tag when">only when ${esc(gCond)}</span>`);
    const tips = [g.offTip && `<b>off →</b> ${esc(g.offTip)}`, g.onTip && `<b>on →</b> ${esc(g.onTip)}`]
      .filter(Boolean).join(' &nbsp;·&nbsp; ');
    return `<article class="card">
    <h3>${esc(g.title)}<span class="n">${rows.length}</span></h3>
    ${bits.length ? `<p class="bits">${bits.join(' ')}</p>` : ''}
    ${tips ? `<p class="tips">${tips}</p>` : ''}
    <table><thead><tr>
      <th>Control</th><th>Kind</th><th>Range</th><th>Default</th><th>Key</th>
    </tr></thead><tbody>
    ${rows.map((r) => {
      // `${base}` is always the row's own path with the leaf taken off — that is what it
      // was when `pitchEnvRows(base)` built it.
      const base = `${r.path.replace(/^\$/, '').split('.').slice(0, -1).join('.')}.`;
      const cond = condOf(r.when, { p, base, i });
      if (cond) conditional += 1;
      const notes = notesOf(r);
      // The condition sits UNDER the name rather than in a column of its own. It belongs
      // to the control, it is prose, and as a sixth column it was what pushed every table
      // wider than the card holding it.
      return `<tr>
        <td class="lab">${esc(r.label)}${r.unit ? `<span class="u"> ${esc(r.unit)}</span>` : ''}
          ${cond ? `<div class="cond">only when ${esc(cond)}</div>` : ''}
          ${r.tip ? `<div class="tip">${esc(r.tip)}</div>` : ''}
          ${notes.length ? `<div class="meta">${notes.map(esc).join(' · ')}</div>` : ''}</td>
        <td class="kind">${r.kind === 'pick' ? 'pills' : 'pot'}</td>
        <td class="rng">${rangeOf(r, short)}</td>
        <td class="def">${esc(String(r.def))}</td>
        <td class="key"><code>${esc(r.path).replaceAll('.', '.<wbr>')}</code></td>
      </tr>`;
    }).join('')}
    </tbody></table>
  </article>`;
  };

  const cards = [cardHtml(spec.common, { common: true }), ...spec.groups.map((g) => cardHtml(g))].join('\n');
  const layerCards = spec.groups.filter((g) => /^Osc 1\b/.test(g.title)).length;
  return { cards, controls, conditional, cardCount: spec.groups.length + 1, layerCards };
};

/** The page shell every synth's brief shares — palette, chrome, stats bar, script. */
const pageHtml = (synth, body) => `<!-- @dsCard group="Synth UI" -->
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(synth.pageTitle)}</title>
<style>
  /* The desk's own tokens, so this brief is written in the palette it is a brief for.
     Switching the backdrop switches the page, which is the cheapest possible way to
     see whether a colour decision survives all nine. */
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
  /* Cards flow into as many columns as the window gives them — the brief should not
     itself be a narrow strip. The floor is what the widest table needs; the backstop
     below is for a window narrower than that. */
  .cards { display:grid; gap:12px; grid-template-columns:repeat(auto-fill, minmax(470px, 1fr)); }
  .card { background:var(--panel); border:1px solid var(--line); border-radius:6px;
          padding:11px 12px 4px; min-width:0; overflow-x:auto; }
  .card h3 { margin:0 0 7px; font-size:12.5px; font-weight:500; letter-spacing:.03em;
             display:flex; align-items:baseline; gap:8px; }
  .card h3 .n { margin-left:auto; font-size:10px; color:var(--dim); font-weight:400; }
  .bits { margin:0 0 7px; display:flex; flex-wrap:wrap; gap:5px; }
  .tag { font-size:9.5px; letter-spacing:.04em; padding:1.5px 6px; border-radius:99px;
         color:var(--dim); border:1px solid var(--line); }
  .tag code { color:inherit; font-size:9.5px; }
  .tag.opt { color:var(--accent); border-color:var(--accent); }
  .tag.when { color:var(--hot); border-color:var(--hot); }
  .tips { margin:0 0 9px; font-size:11px; line-height:1.6; color:var(--dim); }
  .tips b { color:var(--ink); font-weight:500; }
  table { width:100%; border-collapse:collapse; font-size:11.5px; }
  th { text-align:left; font-size:9.5px; letter-spacing:.09em; text-transform:uppercase;
       color:var(--dim); font-weight:500; padding:4px 7px 5px; border-bottom:1px solid var(--line); }
  td { padding:6px 7px; border-bottom:1px solid var(--line); vertical-align:top; }
  tr:last-child td { border-bottom:none; }
  td.lab { color:var(--ink); white-space:nowrap; }
  td.lab .u { color:var(--dim); font-size:10px; }
  td.kind, td.def { color:var(--dim); white-space:nowrap; }
  td.rng { color:var(--ink); }
  code { font-size:10.5px; color:var(--dim); }
  /* A key like $layer.osc1.filter.env.octaves is the longest unbreakable run on the
     page, and refusing to break it is what pushed six tables wider than their card.
     It wraps at its DOTS — there is a <wbr> after each one — because breaking a path
     anywhere gives you "$layer.osc1.t / ype", which is a key you have to reassemble. */
  td.key code { overflow-wrap:normal; }
  .raw { display:block; font-size:9.5px; color:var(--dim); opacity:.75; white-space:nowrap; }
  .cond, .tip, .meta { white-space:normal; max-width:30ch; margin:3px 0 0; line-height:1.5; }
  .cond { font-size:10.5px; color:var(--hot); }
  .tip { font-size:10.5px; color:var(--dim); }
  .meta { font-size:9.5px; color:var(--accent); opacity:.85; }
  .themes { display:grid; gap:12px; grid-template-columns:repeat(auto-fill, minmax(330px, 1fr)); }
  .theme { background:var(--panel); border:1px solid var(--line); border-radius:6px; padding:11px 12px; }
  .theme h4 { margin:0 0 9px; font-size:12px; font-weight:500; display:flex; align-items:baseline; gap:8px; }
  .theme h4 code { margin-left:auto; font-size:9.5px; }
  .sw { display:grid; gap:4px 10px; grid-template-columns:repeat(2, 1fr); }
  .s { display:flex; align-items:center; gap:6px; font-size:10px; min-width:0; }
  .s i { flex:none; width:13px; height:13px; border-radius:3px; border:1px solid var(--line); }
  .s em { font-style:normal; color:var(--dim); flex:none; }
  .s b { font-weight:400; color:var(--ink); opacity:.7; margin-left:auto;
         overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  @media (max-width:700px) { header, .bar, main { padding-left:14px; padding-right:14px; } }
</style>
</head>
<body>
<header>
  <h1>${esc(synth.h1)}<span>MASHENSTEIN · Song Mixer</span></h1>
  <p class="brief">${synth.briefHtml(body)}</p>
  <div class="box">
    <h2>The commission</h2>
    <p style="margin:0">${synth.commissionHtml(body)}</p>
    <ul>
      <li><b>Palette and typeface stay the desk's.</b> Every colour comes from the tokens
        below, and the layout has to survive all ${themes.length} themes, light and dark.
        Nothing hard-coded. Layout and control <em>shapes</em> are yours.</li>
      <li><b>Every control below has to be reachable.</b> All ${body.controls} of them${synth.hasTaps ? ', plus Taps below — see its own note' : ''}.
        This is enforced in CI — <code>tests/pot-coverage.js</code> fails the build if the
        engine reads a key with no control on it, or a control exists that no engine path
        reads. If you want to drop one, say which and why; if you want a new one, name
        what it would control.</li>
      <li><b>Same control, same name, everywhere.</b> A control that also appears elsewhere
        on the desk keeps its label, its option order and its units. CUTOFF means one thing
        on all nine cards that have one.</li>
      <li><b>Readings are absolute.</b> The same number means the same thing on every card.
        No hidden multipliers, no per-context scaling.</li>
      ${synth.structureLi(body)}
      <li><b>Things appear and disappear.</b> ${body.conditional} of the controls are
        conditional, and switched sections come and go with their own switch above them.
        The layout must not lurch when they do — that is a real constraint on how you
        place them, not a detail.</li>
      <li><b>Off is a state, not zero.</b> A switched section that is off builds no audio
        nodes at all. Its switch is a real control with its own pair of tooltips (both are
        listed on each card).</li>
      <li><b>It is DOM and CSS in a browser</b>, driven by mouse and trackpad. Today a pot is
        a 42&nbsp;px SVG you drag to turn, shift-drag for a fifth of the travel, click the
        reading to type an exact value, double-click to reset; a choice is a row of pills,
        never a dropdown. Keep those affordances or improve on them — but a control has to
        be aimable and its value has to be readable without hovering.</li>
    </ul>
  </div>
  <div class="box" style="border-left-color:var(--hot)">
    <h2>Giving notes that can be applied</h2>
    <ul>
      <li>Phrase every change as <b>name: current &rarr; proposed</b>, using a name from the
        tables below.</li>
      <li>Layout notes are best as <b>which card sits where, and why</b> — the cards are the
        unit the panel is built from, and moving one is a line of code.</li>
      <li>If you want something no existing control expresses, propose it as a <b>new name</b>
        and say what it should do. That is a useful answer.</li>
    </ul>
  </div>
</header>
<div class="bar"><span>Theme</span>${themes
  .map((t, i) => `<button data-t="${t.id}"${i ? '' : ' class="on"'}>${esc(t.name)}</button>`).join('')}</div>
<main>
  <section>
    <h2>The size of the problem</h2>
    <div class="stats">
      <div class="stat"><b>${body.controls}</b><em>controls</em></div>
      <div class="stat"><b>${body.cardCount}</b><em>cards</em></div>
      <div class="stat"><b>${body.conditional}</b><em>conditional</em></div>
      ${synth.extraStats(body)}
      <div class="stat"><b>366px</b><em>today's width</em></div>
      <div class="stat"><b>${themes.length}</b><em>themes to survive</em></div>
    </div>
  </section>
  <section>
    <h2>Palette</h2>
    <p class="note">
      The desk's tokens, read out of <b>tools/mixer-shell.html</b> at build time. The rule
      the desk already follows: <b>--ctl</b> carries the bulk of the surface and
      <b>--accent</b> is reserved for things that are <em>on, selected or moving</em> — two
      hundred knobs in the accent colour make the accent read as the background. Use the
      buttons above to put this page into any of them.
    </p>
    <div class="themes">${swatches}</div>
  </section>
  <section>
    <h2>The control surface</h2>
    <p class="note">
      Generated from the panel's own definition, in the order the panel declares it, which
      is signal order. <b>Key</b> is what the control writes onto the preset. A red line
      under a control's name is the condition under which it exists at all; a red tag on a
      card is the same for the whole card.
    </p>
    <div class="cards">
${body.cards}
    </div>
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

// ---- the two pilot synths ----------------------------------------------------
const SYNTHS = [
  {
    id: 'MRDR-3',
    voice: { synth: 'MRDR-3' },
    outFile: 'layer-synth.html',
    pageTitle: 'MASHENSTEIN — Layered Synth editor',
    h1: 'Layered Synth — editor',
    hasTaps: false,
    briefHtml: (body) => `
    <b>MRDR-3</b> is the mixer's biggest instrument: three complete oscillator sections,
    each with its own waveform, pitch envelope, FM operator, filter, filter envelope and
    amplifier, summed into a shared filter, a shared amplifier, an LFO and an <b>Effects</b>
    stage — a drive that can sit either side of that shared filter and amplifier, and a
    stereo chorus after all of it.
    Today its editor is drawn into a column <b>366&nbsp;px wide</b> — three channel strips
    across — because that is the slot it happens to occupy on the desk, and every decision
    in it is a concession to that width: 42&nbsp;px knobs, 9.5&nbsp;px labels, four columns
    of grid, and ${body.controls} controls in one long vertical scroll.`,
    commissionHtml: () => `
      Design this as a <b>full-window editor</b> that opens over the desk and closes back to
      it — a plugin, not a strip. Assume the browser window: roughly <b>1280&nbsp;px to
      2560&nbsp;px wide</b> and 720&nbsp;px to 1440&nbsp;px tall, at whatever aspect the
      window happens to be. The 366&nbsp;px cage is gone and none of its compromises need
      defending. Signal flow, grouping, knob size, how the three layers sit against each
      other, what is on screen at once and what is a tab or a page — all open. KLNG8
      shares this same full-window surface (see its own brief) — the two should read as a
      matched pair, not two unrelated plugins.`,
    structureLi: (body) => `<li><b>The three layers are structurally identical.</b> Whatever
        Osc&nbsp;1 gets, Osc&nbsp;2 and Osc&nbsp;3 get — ${body.layerCards} cards each, three
        times over. Only Osc&nbsp;1 lacks an on/off switch, because it <em>is</em> the
        voice.</li>`,
    extraStats: () => '<div class="stat"><b>3</b><em>layers, identical</em></div>',
  },
  {
    id: 'drum',
    voice: { synth: 'KLNG8', kind: 'drum' },
    outFile: 'klng8.html',
    pageTitle: 'MASHENSTEIN — KLNG8 editor',
    h1: 'KLNG8 — editor',
    hasTaps: true,
    briefHtml: (body) => `
    <b>KLNG8</b> is the mixer's variable multi-source percussion instrument: up to
    five switchable sound sources — a pitched <b>Oscillator</b> (with its own FM operator),
    <b>Noise</b>, a struck resonant filter (<b>Ring</b>) and an inharmonic square cluster
    (<b>Metal</b>) — summed through a shared <b>Drive</b> stage, plus <b>Humanise</b> and a
    <b>Taps</b> stepper that turns one hit into an authored multi-hit clap or hat. Any
    combination of sources can be on at once; a kick might use only Oscillator, a hat only
    Metal, a snare Noise plus Ring. Today its editor is drawn into the same
    <b>366&nbsp;px column</b> as every other preset on the desk, and every decision in it
    is a concession to that width: 42&nbsp;px knobs, 9.5&nbsp;px labels, four columns of
    grid, and ${body.controls} controls in one long vertical scroll.`,
    commissionHtml: () => `
      Design this as a <b>full-window editor</b> that opens over the desk and closes back to
      it — a plugin, not a strip. Assume the browser window: roughly <b>1280&nbsp;px to
      2560&nbsp;px wide</b> and 720&nbsp;px to 1440&nbsp;px tall, at whatever aspect the
      window happens to be. The 366&nbsp;px cage is gone and none of its compromises need
      defending. Signal flow, grouping, knob size, how the sources sit against each other
      and against Drive, what is on screen at once and what is a tab or a page — all open.
      MRDR-3 shares this same full-window surface (see its own brief) — the two should read
      as a matched pair, not two unrelated plugins.`,
    structureLi: () => `<li><b>The sources are independent, not identical.</b> Unlike
        MRDR-3's three matched layers, KLNG8's five switched sections
        (Oscillator, its FM, Noise, Ring, Metal) are each a different mechanism with a
        different control set — there is no shared shape to repeat, so each card earns its
        own layout.</li>`,
    extraStats: () => '<div class="stat"><b>5</b><em>switchable sections</em></div>',
  },
];

mkdirSync(outDir, { recursive: true });
for (const synth of SYNTHS) {
  const body = buildBody(synth);
  const html = pageHtml(synth, body);
  const out = join(outDir, synth.outFile);
  writeFileSync(out, html);
  console.log(`${out} (${(html.length / 1024).toFixed(0)} KB)`);
  console.log(`  ${body.controls} controls across ${body.cardCount} cards, ${body.conditional} conditional`);
}
