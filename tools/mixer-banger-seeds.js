// The desk's side of seed bangers and Sound Combos (tools/lib/banger-seeds.js). 2 Oct 2026.
//
//   Use as Style…    on a style's seed banger: its sounds, channels and master become where
//                    new bangers in that style start (POST /banger-seed-use)
//   Save as Combo…   on any banger: its sounds and channels kept under a name, chosen in
//                    Make a Banger's Sounds (POST /banger-combo-save)
//   A/B              on a seed: flip between it and the remix its style came from, each
//                    song keeping its own place, playing on if it was playing
//
// Everything the desk owns is handed in (`desk`); nothing here reaches into mixer-entry.js.
import { styleFor } from './lib/banger/styles/index.js';

export function createSeedDesk(desk) {
  const { $, ask, tell, toast, closeMenu } = desk;
  const esc = (s) => desk.escapeHtml(String(s ?? ''));
  // Where each song of an A/B pair was left, and which pair is open.
  const places = new Map();
  let pair = null;

  const styleOfTrack = (t) => styleFor(t?.banger?.seedOf || t?.banger?.style);
  const remixOf = (t) => {
    if (t?.group !== 'bangerSeed') return null;
    const id = styleOfTrack(t)?.seed?.song;
    return id && desk.resolveTrack(id) ? id : null;
  };

  /** Save what is on the desk first: both routes read the song's file, not the faders. */
  async function savedFirst(id) {
    if (!desk.isDirty(id)) return true;
    const ok = await desk.saveMix(id);
    if (!ok) toast('Not saved, so nothing was read from it', 3000);
    return ok;
  }

  async function post(url, body) {
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const out = await res.json().catch(() => ({ ok: false, problems: [`the desk answered ${res.status}`] }));
      return out;
    } catch (err) {
      return { ok: false, problems: [`the desk could not be reached: ${err.message || err}`] };
    }
  }

  const problemsHtml = (problems) => `<ul>${(problems || []).map((p) => `<li>${esc(p)}</li>`).join('')}</ul>`;

  async function useAsStyle() {
    closeMenu();
    const { id, track } = desk.current();
    const style = styleOfTrack(track);
    if (!style || track?.group !== 'bangerSeed') return;
    const ok = await ask(`Use ${track.title} as ${style.label}?`,
      `<p>New ${esc(style.label)} bangers will start from this seed: its sounds, its channels and its master — `
      + 'and their faders will be matched to its balance.</p>'
      + '<p>Sounds you tuned on it are kept as presets of their own, named after the style.</p>'
      + (desk.isDirty(id) ? '<p>Your changes to it are saved first.</p>' : ''), 'Use as Style');
    if (!ok || !(await savedFirst(id))) return;
    toast(`Reading ${track.title}…`, 2500);
    const out = await post('/banger-seed-use', { id });
    if (!out.ok) {
      await tell(`${style.label} is unchanged`, `<p>${esc(track.title)} was not used:</p>${problemsHtml(out.problems)}`);
      return;
    }
    const kept = out.kept?.length ? `<p>Kept as presets: ${out.kept.map((k) => `<b>${esc(k.label)}</b>`).join(', ')}.</p>` : '';
    const reload = await ask(`${style.label} now starts from this seed`,
      `<p>${out.changed.sounds} sound${out.changed.sounds === 1 ? '' : 's'} changed, ${out.changed.channels} channels and the master taken.</p>`
      + `${kept}<p>The desk makes bangers with the sounds it loaded with — reload it to make them with these.</p>`,
      'Reload Now', { cancel: true });
    if (reload) location.reload();
  }

  async function saveCombo() {
    closeMenu();
    const { id, track } = desk.current();
    const style = styleOfTrack(track);
    if (!style || !track?.banger) return;
    const ok = await ask('Save as Combo',
      `<p>Keep this banger's sounds and channels as a ${esc(style.label)} Sound Combo — chosen under Sounds when you make a banger.`
      + ' The same name again saves over it.</p>'
      + '<label class="askfield">Name<input id="comboname" type="text" maxlength="40" placeholder="Icy Anthem" autocomplete="off"></label>'
      + (desk.isDirty(id) ? '<p>Your changes are saved first.</p>' : ''), 'Save Combo');
    const label = ($('comboname')?.value || '').trim();
    if (!ok) return;
    if (!label) { toast('A combo needs a name', 2500); return; }
    if (!(await savedFirst(id))) return;
    const out = await post('/banger-combo-save', { id, label });
    if (!out.ok) {
      await tell('Not saved as a combo', problemsHtml(out.problems));
      return;
    }
    const reload = await ask(`Saved “${out.label}”`,
      `<p>A ${esc(style.label)} Sound Combo. Reload the desk to find it under Sounds in Make a Banger.</p>`, 'Reload Now');
    if (reload) location.reload();
  }

  /** Flip between a seed and its style's remix, each song keeping its own place. */
  async function ab() {
    closeMenu();
    const { id, track } = desk.current();
    const remix = remixOf(track);
    if (remix) pair = { seed: id, remix };
    if (!pair || (id !== pair.seed && id !== pair.remix)) return;
    const other = id === pair.seed ? pair.remix : pair.seed;
    const wasPlaying = desk.isPlaying();
    places.set(id, desk.position());
    if (wasPlaying) desk.stop();
    if (!(await desk.selectSong(other))) return;
    desk.jumpTo(places.get(other) ?? 0, { start: wasPlaying });
    syncButtons();
  }

  function syncButtons() {
    const { id, track } = desk.current();
    const server = !desk.isStatic();
    const seed = track?.group === 'bangerSeed';
    if ($('bangeruse')) $('bangeruse').hidden = !(server && seed);
    if ($('bangercombo')) $('bangercombo').hidden = !(server && track?.banger);
    const b = $('bangerab');
    if (!b) return;
    const remix = remixOf(track);
    const back = pair && id === pair.remix ? pair.seed : null;
    const other = remix || back;
    b.hidden = !other;
    if (other) b.textContent = `A/B with ${desk.resolveTrack(other)?.title || other}`;
  }

  return { useAsStyle, saveCombo, ab, syncButtons };
}
