import { VOICES } from '../src/data/voices.js';
import { EFFECT_BY_ID } from '../src/engine/effects.js';
import { BANGER_GROUPS, BANGER_MOODS, BANGER_VARIATIONS } from './lib/banger/options.js';
import { TRACK_EFFECTS_MODES } from './lib/banger/production.js';
import { reportStrip, sameReportStrip } from './lib/banger/report.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const label = (list, id) => list.find(x => x.id === id)?.label || id || '—';
const db = n => Number.isFinite(n) ? `${n > 0 ? '+' : ''}${n.toFixed(1)} dB` : '—';
const effectName = id => EFFECT_BY_ID[id]?.label || EFFECT_BY_ID[id]?.name || id;
const effects = strip => (strip.effects || []).map(e => `${effectName(e.id)}${e.bypass || e.off ? ' (off)' : ''}`).join(', ') || 'No inserts';
const sends = strip => ['delay', 'reverb'].map(k => `${k}: ${Math.round((strip.send?.[k] || 0) * 100)}%`).join(' · ');
const table = (heads, rows) => `<div class="bgreport-scroll"><table><thead><tr>${heads.map(h => `<th>${escape(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(v => `<td>${escape(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const section = (title, body) => `<section><h3>${escape(title)}</h3>${body}</section>`;
const paragraph = text => `<p>${escape(text)}</p>`;
const sectionRanges = e => (e.ranges?.length ? e.ranges : e.from ? [[e.from, e.to]] : [])
  .map(([a, z]) => `${a[0]}:${a[1]} → ${z[0]}:${z[1]}`).join(', ');

/** Recorded roll decisions alongside the actual mixer. Never runs the generator. */
export function bangerReportHtml(track, mix = {}) {
  const b = track?.banger;
  if (!b) return paragraph('This song has no Banger recipe.');
  const r = b.report?.version === 1 ? b.report : null;
  const o = b.options || {};
  const s = r?.summary;
  const mode = b.trackEffects?.mode || o.production?.mode || 'style';
  const decisions = b.trackEffects?.roles || [];
  const changed = b.trackEffects?.applied?.length || 0;
  let html = `<div class="bgreport">`;
  html += paragraph(`${track.title || 'Banger'} · Take ${b.take || 1} · Seed ${b.seed} · Generator ${b.generator || 'unknown'}`);
  html += paragraph(r ? 'Recorded decisions for this roll. Current mixer settings appear below; later edits may differ.'
    : 'This older take has no full decision report. Its saved recipe and current mixer are shown; unrecorded choices have not been reconstructed.');
  html += section('The roll', table(['Choice', 'Result'], [
    ['Style / mood', `${s?.style || b.style || o.style} / ${label(BANGER_MOODS, o.mood)}`],
    ['Key / tempo / length', s ? `${s.key} · ${s.bpm} BPM · ${s.bars} bars` : `${o.key || 'From riff'} · ${track.bank?.bpm || '—'} BPM`],
    ['Hook', s?.hook || o.hook || 'Auto'],
    ['Variation', label(BANGER_VARIATIONS, o.variation)],
    ['Track Effects', label(TRACK_EFFECTS_MODES, mode)],
    ['Effects changes', mode === 'style' ? 'No extra treatments: Keep Style retains the saved mixer treatments.'
      : b.trackEffects ? `${changed} track${changed === 1 ? '' : 's'} treated. Other parts kept their existing production.` : 'Decisions were not recorded for this take.'],
  ]));
  if (decisions.length) html += section('Why these effects?', table(['Track', 'Decision', 'Why'], decisions.map(e => [
    mix.labels?.[e.lane] || e.role,
    ({ echo: 'Rhythmic delay', room: 'Room reverb', lush: 'Chorus', upfront: 'Reduced ambience', clean: 'No extra treatment', protected: 'Protected source treatment' })[e.treatment] || e.treatment,
    e.reason,
  ])));
  const recorded = new Map((r?.lanes || []).map(x => [x.role, x]));
  if (b.sectionEffects) html += section('Section FX', b.sectionEffects.decisions.length
    ? table(['Part / section', 'Source', 'Effects / range', 'Decision'], b.sectionEffects.decisions.map(e => [
      `${mix.labels?.[e.lane] || e.role} / ${e.section}`, e.origin,
      `${(e.effects || []).filter(id => id !== 'gain').map(effectName).join(', ') || '—'}${e.from ? ` · ${sectionRanges(e)} (end excluded)` : ''}`,
      `${e.status}: ${e.reason}${e.chain ? ' · ' + e.chain.map(x => x.id + ' ' + JSON.stringify(x.params)).join(' + ') : ''}`,
    ])) : paragraph('No section treatments were requested or saved in this style.'));
  html += section('Tracks on the desk now', table(['Track / job', 'Sound', 'Effects / sends', 'Compared with roll'], Object.entries(b.laneOf || {}).map(([role, lane]) => {
    const now = reportStrip(mix, lane); const old = recorded.get(role);
    const voice = now.voiceParams || VOICES[now.voice];
    return [ `${mix.labels?.[lane] || role} / ${role}`, voice?.label || now.voice || lane,
      `${effects(now.strip)} · ${sends(now.strip)}${now.noteFX?.portamento ? ' · Portamento' : ''}`,
      old ? sameReportStrip(now, { voice: old.voice, voiceParams: old.voiceParams, strip: old.strip, noteFX: old.noteFX }) ? 'As rolled' : 'Mixer differs from recorded roll' : 'No recorded snapshot' ];
  })));
  if (b.form?.length) html += section('Song shape', table(['Bars', 'Section', 'Energy'], b.form.map(f => [`${f.from}–${f.to}`, f.label || f.type || f.role, f.energy])));
  html += section('Joins and transitions', r ? r.transitions?.length ? table(['Bar', 'Join', 'Moves'], r.transitions.map(t => [t.bar, `${t.from} → ${t.to}`, t.moves.join(', ')])) : paragraph('No transition moves were chosen.') : paragraph('Transition decisions were not recorded for this older take.'));
  html += section('Auto Portamento', r ? r.expression.length ? table(['Track', 'Amount', 'Glide'], r.expression.map(e => [mix.labels?.[e.lane] || e.role, e.set?.amount, e.set?.glide])) : paragraph('No Auto Portamento was added.') : paragraph(`Recipe setting: ${o.expression?.autoPortamento ? 'on' : 'off'}. Individual decisions were not recorded.`));
  if (r?.levels?.length) html += section('Balance decisions', paragraph('Fader values chosen by the generator. Measured support means calibration was available; otherwise it used the predictive fallback. Current faders may have been edited.') + table(['Track', 'Roll fader', 'Change', 'Support'], r.levels.map(e => [mix.labels?.[e.lane] || e.job, db(e.after), db(e.move), e.calibrated ? 'Measured calibration' : 'Prediction'])));
  if (r?.lastModify) html += section('Last modification', table(['Action', 'Parts'], Object.entries(r.lastModify).filter(([, v]) => Array.isArray(v) && v.length).map(([k, v]) => [k.replace(/([A-Z])/g, ' $1'), v.join(', ')])));
  html += `<details><summary>Recipe settings</summary>${BANGER_GROUPS.map(g => section(g.label, table(['Setting', 'Choice'], g.fields.filter(f => f.key !== 'version').map(f => {
    const value = o[g.id]?.[f.key]; const choice = f.options?.find(x => String(x[0]) === String(value));
    return [f.label, choice?.[1] ?? (typeof value === 'boolean' ? value ? 'On' : 'Off' : value ?? 'Default')];
  })))).join('')}</details>`;
  if (r?.warnings?.length) html += section('Worth knowing', r.warnings.map(paragraph).join(''));
  return html + '</div>';
}
