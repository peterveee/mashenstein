// Bundles a self-contained brief for designing the LAYERED SYNTH's editor in Claude
// Design — the sibling of tools/build-design-handoff.js, which does the same job for a
// hero. Same rules: one HTML file, no server, no network, boots from file://, which is
// also what Design's CSP requires.
//
// The point of generating it rather than writing it is that the control inventory is
// read out of the panel's OWN definition (`panelSpec` in tools/mixer-voice-editor.js)
// and the palette out of the desk's OWN stylesheet. A card added to the panel arrives
// in the brief on the next build; a brief that has drifted from the desk is not a
// possible state. The prose is the only hand-written part, and it says nothing a
// generated table also says.
//
// Usage: node tools/build-synth-design-handoff.js
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { panelSpec } from './mixer-voice-editor.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'work/local/design-handoff');
const out = join(outDir, 'layer-synth.html');

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---- the desk's palette, read off the desk ----------------------------------
//
// Nine themes, and a layout has to survive all of them — which is most of the reason
// the desk owns no hard-coded colours. Parsed rather than copied so a token retuned in
// the stylesheet is retuned here too.
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
// of mixer-entry.js so the brief cannot offer a theme the picker does not.
const entry = readFileSync(join(root, 'tools/mixer-entry.js'), 'utf8');
const themeList = [...entry.slice(entry.indexOf('const THEMES = ['))
  .slice(0, entry.slice(entry.indexOf('const THEMES = [')).indexOf('];'))
  .matchAll(/\['([\w-]+)',\s*'([^']+)'\]/g)].map((m) => ({ id: m[1], name: m[2] }));

// The tokens worth showing. Every one of them is load-bearing somewhere on the desk;
// the rest of the `:root` block is geometry, which the brief states in prose instead.
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

// ---- the panel, read off the panel ------------------------------------------
const spec = panelSpec({ synth: 'MRDR-3' });
const SHORT = spec.pillLabels;

/**
 * A row's or a card's `when` as something a designer can read.
 *
 * These are real functions, so `String(fn)` is their SOURCE — and the layer cards are
 * built in a `for` loop, so that source still carries the loop's own variables: `${p}`
 * for the layer's path, `${base}` for a pitch envelope's, a bare `p` handed to
 * `sectionOn`, and a bare `i` for which of the three layers this is. The caller knows
 * all three, so they are substituted back in rather than printed. `i === 1` is then
 * decided here — layer 1 has no on/off switch, so the clause guarding on it is either
 * always true or reduces to the switch — because "(i === 1 || …)" in a design brief is
 * a leaked implementation detail, not a condition.
 *
 * Everything after that is cosmetic: drop the arrow head, unwrap `getAt` and
 * `sectionOn`, and lose the optional chaining that only ever mattered to the panel.
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
const rangeOf = (row) => {
  if (row.kind === 'pick') {
    return row.options.map((o) => {
      const pill = SHORT[o] ?? String(o).toUpperCase();
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
  if (row.scale) out.push('non-linear taper');
  if (row.read) out.push('display unit ≠ stored unit');
  if (row.trio) out.push(`one third of the ${esc(row.trio)} trio`);
  if (row.startRow) out.push('starts a fresh row');
  if (row.derived) out.push('shares its key with a sibling control');
  return out;
};

let controls = 0;
let conditional = 0;
const cardHtml = (g, { common = false } = {}) => {
  const rows = (g.rows || []).flat(Infinity).filter(Boolean);
  controls += rows.length;
  // Which of the three layers this card belongs to, taken from its own title — the one
  // place the loop index survives into the data. `Osc 2 · Filter` is layer 2, and that
  // is what `${p}` and `i` were when its conditions were written.
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
        <td class="rng">${rangeOf(r)}</td>
        <td class="def">${esc(String(r.def))}</td>
        <td class="key"><code>${esc(r.path).replaceAll('.', '.<wbr>')}</code></td>
      </tr>`;
    }).join('')}
    </tbody></table>
  </article>`;
};

const cards = [cardHtml(spec.common, { common: true }), ...spec.groups.map((g) => cardHtml(g))].join('\n');
const layerCards = spec.groups.filter((g) => /^Osc 1\b/.test(g.title)).length;

const swatches = themes.map((t) => `
  <div class="theme" data-theme="${t.id}">
    <h4>${esc(t.name)}<code>${t.id === 'default' ? 'no attribute' : `data-mixer-theme="${t.id}"`}</code></h4>
    <div class="sw">${TOKENS.map(([k, why]) => `
      <div class="s" title="${esc(why)}">
        <i style="background:${esc(t.vars[k] || 'transparent')}"></i>
        <em>${esc(k.slice(2))}</em><b>${esc(t.vars[k] || '—')}</b>
      </div>`).join('')}</div>
  </div>`).join('');

const html = `<!-- @dsCard group="Synth UI" -->
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MASHENSTEIN — Layered Synth editor</title>
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
  <h1>Layered Synth — editor<span>MASHENSTEIN · Song Mixer</span></h1>
  <p class="brief">
    <b>MRDR-3</b> is the mixer's biggest instrument: three complete oscillator sections,
    each with its own waveform, pitch envelope, FM operator, filter, filter envelope and
    amplifier, summed into a shared filter, a shared amplifier, an LFO and a drive stage.
    Today its editor is drawn into a column <b>366&nbsp;px wide</b> — three channel strips
    across — because that is the slot it happens to occupy on the desk, and every decision
    in it is a concession to that width: 42&nbsp;px knobs, 9.5&nbsp;px labels, four columns
    of grid, and ${controls} controls in one long vertical scroll.
  </p>
  <div class="box">
    <h2>The commission</h2>
    <p style="margin:0">
      Design this as a <b>full-window editor</b> that opens over the desk and closes back to
      it — a plugin, not a strip. Assume the browser window: roughly <b>1280&nbsp;px to
      2560&nbsp;px wide</b> and 720&nbsp;px to 1440&nbsp;px tall, at whatever aspect the
      window happens to be. The 366&nbsp;px cage is gone and none of its compromises need
      defending. Signal flow, grouping, knob size, how the three layers sit against each
      other, what is on screen at once and what is a tab or a page — all open.
    </p>
    <ul>
      <li><b>Palette and typeface stay the desk's.</b> Every colour comes from the tokens
        below, and the layout has to survive all ${themes.length} themes, light and dark.
        Nothing hard-coded. Layout and control <em>shapes</em> are yours.</li>
      <li><b>Every control below has to be reachable.</b> All ${controls} of them. This is
        enforced in CI — <code>tests/pot-coverage.js</code> fails the build if the engine
        reads a key with no control on it, or a control exists that no engine path reads.
        If you want to drop one, say which and why; if you want a new one, name what it
        would control.</li>
      <li><b>Same control, same name, everywhere.</b> A control that also appears elsewhere
        on the desk keeps its label, its option order and its units. CUTOFF means one thing
        on all nine cards that have one.</li>
      <li><b>Readings are absolute.</b> The same number means the same thing on every layer
        and every card. No hidden multipliers, no per-context scaling.</li>
      <li><b>The three layers are structurally identical.</b> Whatever Osc&nbsp;1 gets,
        Osc&nbsp;2 and Osc&nbsp;3 get — ${layerCards} cards each, three times over. Only
        Osc&nbsp;1 lacks an on/off switch, because it <em>is</em> the voice.</li>
      <li><b>Things appear and disappear.</b> ${conditional} of the controls are conditional,
        and the PWM, Pitch&nbsp;Env, FM, Filter and Filter&nbsp;Env cards come and go with the
        section above them. The layout must not lurch when they do — that is a real
        constraint on how you place them, not a detail.</li>
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
      <div class="stat"><b>${controls}</b><em>controls</em></div>
      <div class="stat"><b>${spec.groups.length + 1}</b><em>cards</em></div>
      <div class="stat"><b>${conditional}</b><em>conditional</em></div>
      <div class="stat"><b>3</b><em>layers, identical</em></div>
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
      is signal order: what the oscillator does, then what bends it, then what filters it,
      then what shapes its level — and the shared stage after all three layers. <b>Key</b>
      is what the control writes onto the preset. A red line under a control's name is the
      condition under which it exists at all; a red tag on a card is the same for the whole
      card.
    </p>
    <div class="cards">
${cards}
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

mkdirSync(outDir, { recursive: true });
writeFileSync(out, html);
console.log(`${out} (${(html.length / 1024).toFixed(0)} KB)`);
console.log(`${controls} controls across ${spec.groups.length + 1} cards, ${conditional} conditional`);
