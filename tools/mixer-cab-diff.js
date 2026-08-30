// What changed between the level's mix and the cabinet's, and how to carry it.
//
// The comparison core of the cabinet screen, lifted out of mixer-entry.js. The screen
// itself could not come: it is a MODE, not a panel — it stashes the desk's draft mix,
// swaps a cabinet's in, moves the loop locators, and puts it all back on the way out,
// which is thirty-odd bindings' worth of the desk's own model. This half touches none
// of that. It takes two mixes and returns a patch, a list of what refused to travel,
// and a sentence a person can read; `mergeCabMix` is the other direction, the same
// field-by-field merge the game does, so the desk auditions what it will actually play.
//
// Pure but for three things it cannot know: how the desk escapes text, what it calls a
// lane, and the words behind a `when` code.

import { EFFECT_BY_ID } from '../src/engine/effects.js';
import { laneSettings } from '../src/data/mix.js';
import { AUX_DEFAULTS } from '../src/engine/mixer.js';

// ---- the seam ---------------------------------------------------------------
let escapeHtml, targetLabel, CAB_WHENS;

/** Hand the diff the three desk facts it needs before anything below is called. */
export function installCabDiff(deps) {
  ({ escapeHtml, targetLabel, CAB_WHENS } = deps);
}

/**
 * What the draft says that the saved mix does not — field by field, and only the fields
 * a transition can actually move.
 *
 * The refusals matter as much as the patch. A treatment is applied by ramping parameters
 * on a running song, so anything that would rebuild a node instead — a lane's effect
 * chain changing SHAPE, a reverb's decay, the limiter, a duplicated or deleted lane, a
 * voice swap — cannot be carried and is reported rather than dropped quietly.
 */
function cabDiff(cur, base, { rebuildOk = false } = {}) {
  const patch = {};
  const refused = [];
  const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  // Chains whose ONLY disagreement is a bypass — the same links, in the same order, with
  // the same numbers, one side switched out. Kept apart from `refused` because it is the
  // one refusal with an answer: the person wants this effect on one screen and not the
  // other, reached for the control that has always meant "off", and got the one control
  // that cannot move at a bar line. cabUpdate offers to turn them into mutes, which can.
  const bypassOnly = [];
  // Chains carried WHOLE because the handover has no crossfade to protect.
  //
  // A chain's shape is frozen across a ramp — a link added, removed or reordered disposes
  // the slot, and no bar line can be aimed at a graph edit. But a handover with no
  // crossfade is not a ramp: MusicDirector._fire rebuilds every chain from scratch
  // through applyMix, keeping the clock and costing only the reverb tails, which behind a
  // closed shutter is nothing. So the desk stops refusing what the engine can already do.
  // Named here so the summary can say what it will cost.
  const rebuilds = [];
  const scanBypass = (target, label, a, b) => {
    if (a.length !== b.length || !a.every((e, i) => e.id === b[i].id)) return false;
    const flips = a.map((e, i) => (!e.bypass !== !b[i].bypass ? i : -1)).filter((i) => i >= 0);
    if (!flips.length) return false;
    for (const i of flips) {
      bypassOnly.push({ target, label, index: i, id: a[i].id,
        name: EFFECT_BY_ID[a[i].id]?.name || a[i].id, cabBypass: !!a[i].bypass });
    }
    return true;
  };

  for (const k of ['master', 'masterPan']) {
    if ((cur[k] || 0) !== (base[k] || 0)) patch[k] = cur[k] || 0;
  }
  if (!!cur.limiter !== !!base.limiter) refused.push('the limiter (it re-wires the master)');
  for (const k of ['layers', 'off', 'voice', 'voiceParams']) {
    if (!same(cur[k], base[k])) refused.push(`${k} (it changes the song, not the mix)`);
  }

  const lanes = {};
  for (const key of new Set([...Object.keys(cur.lanes || {}), ...Object.keys(base.lanes || {})])) {
    const a = laneSettings(cur.lanes?.[key]);
    const b = laneSettings(base.lanes?.[key]);
    const L = {};
    for (const f of ['gain', 'pan', 'width', 'mute']) if (a[f] !== b[f]) L[f] = a[f];
    const send = {};
    for (const id of Object.keys(a.send || {})) {
      if ((a.send[id] || 0) !== (b.send[id] || 0)) send[id] = a.send[id] || 0;
    }
    if (Object.keys(send).length) L.send = send;
    const eq = {};
    for (const bnd of ['low', 'mid', 'high']) {
      if ((a.eq[bnd] || 0) !== (b.eq[bnd] || 0)) eq[bnd] = a.eq[bnd] || 0;
    }
    if (Object.keys(eq).length) L.eq = eq;
    // A chain can be re-TUNED across a boundary but never re-BUILT, so the two sides have
    // to agree on its shape: same effects, same order. Only the numbers may differ.
    const ca = cur.lanes?.[key]?.effects || [];
    const cb = base.lanes?.[key]?.effects || [];
    if (!same(ca, cb)) {
      if (ca.length === cb.length && ca.every((e, i) => e.id === cb[i].id && !e.bypass === !cb[i].bypass)) {
        L.effects = JSON.parse(JSON.stringify(ca));
      } else if (scanBypass(key, targetLabel(key), ca, cb)) {
        // Named by scanBypass, answered by cabUpdate. Not pushed to `refused`, which is
        // the list of things nothing can be done about.
      } else if (rebuildOk) {
        L.effects = JSON.parse(JSON.stringify(ca));
        rebuilds.push(targetLabel(key));
      } else {
        refused.push(`${key}'s effect chain — a chain can only be REBUILT on a handover `
          + 'with no crossfade. Set "Band arrives" to 0 bars and it will carry.');
      }
    }
    if (Object.keys(L).length) lanes[key] = L;
  }
  if (Object.keys(lanes).length) patch.lanes = lanes;

  const fx = {};
  for (const id of Object.keys(AUX_DEFAULTS)) {
    const a = { ...AUX_DEFAULTS[id], ...(cur.fx?.[id] || {}) };
    const b = { ...AUX_DEFAULTS[id], ...(base.fx?.[id] || {}) };
    const F = {};
    for (const f of ['level', 'pan']) if ((a[f] ?? 0) !== (b[f] ?? 0)) F[f] = a[f];
    if (!same(a.eq, b.eq)) F.eq = a.eq;
    for (const f of ['decay', 'preDelay', 'division', 'feedback', 'tone']) {
      if (a[f] !== undefined && a[f] !== b[f]) refused.push(`${id} ${f} (it rebuilds the effect)`);
    }
    if (Object.keys(F).length) fx[id] = F;
  }
  if (Object.keys(fx).length) patch.fx = fx;

  // The master chain has the two answers a lane chain has, and for the same reasons.
  //
  // An effect the level does not have at all becomes the TREATMENT — its own leg of the
  // music, faded away from rather than switched out, which is the only way an effect can
  // come OFF a running song without a click. Added to the end of what the level already
  // has, because that is the one shape whose meaning is unambiguous.
  //
  // An effect BOTH sides have is re-tuned in place instead, exactly as a lane's chain is:
  // same effects, same order, same bypass, only the numbers differing. That is a ramp on
  // an AudioParam, which Audio.rampMix schedules for the bar line along with every fader
  // (it walks `__master` in the same list as every strip). It is the cheaper answer where
  // it fits — no second leg carrying a duplicate of the whole master path — and it is how
  // you keep a phaser on the bus at `wet: 0` for the level and open it for the screen.
  //
  // Bypass is in neither. It re-wires the graph, and a disconnect takes no audio time —
  // there is no bar line you can schedule one for. rampMix refuses it by name.
  const ma = cur.masterEffects || [];
  const mb = base.masterEffects || [];
  let treatment = null;
  if (!same(ma, mb)) {
    if (ma.length > mb.length && mb.every((e, i) => same(e, ma[i]))) {
      treatment = JSON.parse(JSON.stringify(ma.slice(mb.length)));
    } else if (ma.length === mb.length
      && ma.every((e, i) => e.id === mb[i].id && !e.bypass === !mb[i].bypass)) {
      patch.masterEffects = JSON.parse(JSON.stringify(ma));
    } else if (scanBypass('__master', 'MASTER', ma, mb)) {
      // Answerable. See bypassOnly above.
    } else if (rebuildOk) {
      patch.masterEffects = JSON.parse(JSON.stringify(ma));
      rebuilds.push('MASTER');
    } else {
      refused.push('the master chain — an effect added anywhere but the END can only be '
        + 'carried on a handover with no crossfade. Set "Band arrives" to 0 bars.');
    }
  }
  return { patch, refused, treatment, bypassOnly, rebuilds };
}

/**
 * Turn the bypasses cabDiff could not carry into mutes, on BOTH sides.
 *
 * A bypass unwires a link, and no bar line can be aimed at a disconnect — so a level and
 * its cabinet screen can never disagree about one, and every attempt to make them was
 * silently dropped. A mute is two gains around the same link, which a transition CAN
 * schedule, so the same intention expressed that way simply works.
 *
 * Both sides, because the flag has to leave the chain entirely: leaving `bypass` on the
 * level and adding `mute` to the screen would still be a bypass difference, and would
 * still be refused. So each flagged link comes out of bypass on both sides and goes into
 * mute on whichever side had it switched off.
 *
 * Returns the two rewritten mixes. THE LEVEL IS CHANGED — the effect stops being unwired
 * and starts being wired-and-silent, which costs its CPU in the level. That is the price
 * of the screen being able to differ at all, and cabUpdate says so before doing it.
 */
function cabConvertBypasses(cur, base, flips) {
  const nextCur = JSON.parse(JSON.stringify(cur));
  const nextBase = JSON.parse(JSON.stringify(base));
  const chainOf = (mix, target) => (target === '__master'
    ? (mix.masterEffects || (mix.masterEffects = []))
    : (mix.lanes?.[target]?.effects || []));
  for (const f of flips) {
    for (const mix of [nextCur, nextBase]) {
      const link = chainOf(mix, f.target)[f.index];
      if (!link || link.id !== f.id) continue;
      const off = !!link.bypass;
      delete link.bypass;
      if (off) link.mute = true; else delete link.mute;
    }
  }
  return { cur: nextCur, base: nextBase };
}

const cabSummary = ({ patch, refused, treatment, rebuilds = [] }, loop, when) => {
  const bits = [];
  const laneNames = Object.keys(patch.lanes || {});
  if (laneNames.length) bits.push(`<b>${laneNames.length}</b> channel${laneNames.length === 1 ? '' : 's'}: ${escapeHtml(laneNames.join(', '))}`);
  if (patch.fx) bits.push(`the ${escapeHtml(Object.keys(patch.fx).join(' and '))} return${Object.keys(patch.fx).length === 1 ? '' : 's'}`);
  if (patch.master != null || patch.masterPan != null) bits.push('the master trim');
  // Named rather than counted, because the whole chain is carried whether or not every
  // effect on it moved — the same as a lane's chain — and which effects those are is the
  // thing worth reading back before agreeing to it.
  if (patch.masterEffects) {
    // With each one's MUTE, because that is the field most likely to be the entire
    // point of the capture — a phaser the level holds muted and this screen opens —
    // and a bare list of names would read as "nothing has changed here".
    const names = patch.masterEffects.map((e) => {
      const n = EFFECT_BY_ID[e.id]?.name || e.id;
      return e.mute ? `${n} (muted)` : n;
    });
    bits.push(`the master chain re-tuned — ${escapeHtml(names.join(', '))} — moving on the boundary with the faders`);
  }
  if (treatment?.length) bits.push(`<b>${treatment.length}</b> effect${treatment.length === 1 ? '' : 's'} across the whole mix, lifted on the way into the level`);
  if (loop?.startBar > 1) bits.push(`a way in on bar <b>${loop.startBar}</b>`);
  if (loop?.fromBar) bits.push(`a loop of bars <b>${loop.fromBar}–${loop.toBar}</b>`);
  return `<p>Plays <b>${escapeHtml(CAB_WHENS.find(([v]) => v === when)?.[1] || when)}</b>, carrying ${
    bits.length ? bits.join(', ') : 'nothing — the draft matches the saved mix'}.</p>`
    // Said out loud because it is the one carry with a cost attached. An effect ADDED or
    // taken off cannot be ramped, so the level rebuilds those chains on the boundary
    // instead — seamless on the clock, but any reverb still ringing is cut with them.
    + (rebuilds.length
      ? `<p>The effect chains on <b>${escapeHtml([...new Set(rebuilds)].join('</b>, <b>'))}</b> `
        + 'are a different shape from the level\'s, so they are <b>rebuilt</b> as the level starts '
        + 'rather than faded. The clock does not move; anything still ringing is cut. Behind the '
        + 'shutter that is inaudible — which is why it only works with no crossfade.</p>'
      : '')
    + (refused.length
      ? `<p class="warn">Not carried:<br>${refused.map(escapeHtml).join('<br>')}</p>` : '');
};

/** The stored treatment for whichever condition the dropdown is showing. */

/** The same field-by-field merge the game does, so the desk auditions what it will play. */
function mergeCabMix(base, patch) {
  if (!patch) return JSON.parse(JSON.stringify(base));
  const out = JSON.parse(JSON.stringify(base));
  for (const [k, v] of Object.entries(patch)) {
    if (k !== 'lanes' && k !== 'fx') out[k] = v;
  }
  for (const [key, lane] of Object.entries(patch.lanes || {})) {
    const prev = out.lanes?.[key] || {};
    out.lanes = out.lanes || {};
    out.lanes[key] = {
      ...prev, ...lane,
      ...(prev.send || lane.send ? { send: { ...(prev.send || {}), ...(lane.send || {}) } } : {}),
      ...(prev.eq || lane.eq ? { eq: { ...(prev.eq || {}), ...(lane.eq || {}) } } : {}),
    };
  }
  for (const [id, aux] of Object.entries(patch.fx || {})) {
    const prev = out.fx?.[id] || {};
    out.fx = out.fx || {};
    out.fx[id] = { ...prev, ...aux, ...(prev.eq || aux.eq ? { eq: { ...(prev.eq || {}), ...(aux.eq || {}) } } : {}) };
  }
  return out;
}

export { cabDiff, cabConvertBypasses, cabSummary, mergeCabMix };
