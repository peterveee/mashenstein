// Every authored text screen in the game, browsable without playing it.
//
// The prose is spread across four unrelated places — jokes.js writes the intro
// panels and the finale, briefings.js writes the pre-stage memos, and stages.js
// hides an opening line on nine of its twenty-seven entries — and each one is
// reached by a different route in the real game. The briefings need a stage
// launch, the intro panels need a NEW save file, the finale needs a cleared
// campaign, and the stage intros need all of that AND the first four seconds of
// the run. Reading the campaign's copy end to end meant playing the campaign.
//
// So: one list, in story order, derived from STAGES rather than hand-written,
// which is the part that matters. A briefing added to briefings.js or an intro
// line added to a stage shows up here the moment it is written, and cannot be
// silently missing from the browser that exists to prove it reads right.
import { W, H } from '../engine/renderer.js';
import { Input } from '../engine/input.js';
import { Audio } from '../engine/audio.js';
import { drawTextCentered } from '../engine/sprites.js';
import { setState } from '../engine/states.js';
import { STAGES } from '../data/stages.js';
import { CABINET_BY_ID } from '../data/cabinets.js';
import { drawSpeech, drawActBanner } from '../game/hud.js';
import { BriefingState, IntroState, FinaleState } from '../game/menus.js';

// What a stage opens with, in the order the run plays it. Most have one of
// these; plumber-1 has both, and the other eighteen stages have neither.
function openers(stage) {
  const out = [];
  if (stage.act) out.push({ stage, act: true, text: stage.act, label: 'ACT CARD' });
  if (stage.intro) {
    out.push({
      stage, act: false, text: stage.intro, who: stage.introBy || null,
      label: `INTRO — ${(stage.introBy || 'NARRATOR').toUpperCase()}`,
    });
  }
  return out;
}

// One stage opener, previewed cold.
//
// In game these land over a live stage: the ACT cards freeze the world for two
// seconds and the bubbles ride four seconds of running. Neither is reproducible
// here and neither is the point — this is for the words, the wrap, and the
// portrait on the left of the bubble. Black backdrop, real painters, and a
// caption saying which stage you are looking at, because on a black screen
// 'THE PRINTERS SMELL FEAR' does not announce that it belongs to office-1.
export class StageIntroState {
  constructor({ opener, settings, onDone }) {
    this.opener = opener; this.settings = settings; this.onDone = onDone;
  }
  enter() { this.t = 0; Input.setMenuButtons(); }
  update(dt) {
    this.t += dt;
    if (Input.pressed('confirm') || Input.pressed('jump') || Input.pressed('pointer') || Input.pressed('back')) {
      Audio.sfx('uiConfirm');
      this.onDone();
    }
    Input.endFrame();
  }
  draw(ctx) {
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    const o = this.opener;
    if (o.act) drawActBanner(ctx, o.text, { t: this.t, still: this.settings.reducedMotion });
    else drawSpeech(ctx, { text: o.text, who: o.who });
    // Dev chrome last: the ACT card paints a full-screen scrim of its own, and
    // a caption drawn before it would be underneath.
    drawTextCentered(ctx, `${o.stage.id.toUpperCase()} — ${o.label}`, W / 2, 16, '#5a5a68');
    drawTextCentered(ctx, 'ANY KEY TO CONTINUE', W / 2, H - 20, '#5a5a68');
  }
}

// The campaign's prose in playing order. Each beat knows how to open itself
// given a continuation, so the same list serves both a single look and the
// read-everything walk.
function proseBeats(dev) {
  const { save } = dev.ctx;
  const beats = [{
    label: 'INTRO PANELS (4)',
    open: (next) => new IntroState({ onDone: next }),
  }];
  for (const stage of STAGES) {
    const cab = CABINET_BY_ID[stage.cabinet];
    beats.push({
      label: `${stage.id} BRIEFING`,
      kind: 'briefing',
      open: (next) => new BriefingState({ cab, stage, onDone: next }),
    });
    // Only the stage that opens a cabinet has one — and plumber-1 has two, so
    // the walk plays its act card and Lorenzo's line in the order the run does.
    for (const opener of openers(stage)) {
      beats.push({
        label: `${stage.id} ${opener.label}`,
        kind: 'intro',
        open: (next) => new StageIntroState({ opener, settings: save.settings, onDone: next }),
      });
    }
  }
  // Built here rather than through Flow.startFinale so the walk can continue
  // past it. Same state, and the same catch: FinaleState sets sawEnding on its
  // way out, so previewing the ending unlocks OVERTIME on the title. That is
  // already true of SCENES ▸ FINALE; it is noted, not new.
  beats.push({
    label: 'FINALE (9 BEATS + CODA + CURTAIN CALL)',
    open: (next) => new FinaleState({ save, onDone: next }),
  });
  return beats;
}

// Open beat i, then the one after it, until the list runs out. Every screen in
// here exits on its own confirm — there is no back button that means 'stop the
// walk' — so the escape hatch is the dev menu itself: ` opens over any state,
// and SCENES has somewhere else to be.
function walk(dev, beats, i) {
  if (i >= beats.length) return dev.ctx.Flow.toHub();
  setState(beats[i].open(() => walk(dev, beats, i + 1)));
}

function one(dev, beat) {
  dev.close();
  setState(beat.open(() => dev.ctx.Flow.toHub()));
}

// Split by kind rather than listed flat: thirty-eight rows in one scroller is a
// worse index than three short ones, and the two groups are read for different
// reasons — briefings are a manifest you check for consistency, stage intros
// are nine one-liners you check for tone.
function beatListMenu(dev, title, kind) {
  const build = () => ({
    title,
    items: proseBeats(dev).filter((b) => b.kind === kind)
      .map((beat) => ({ label: beat.label, act: () => one(dev, beat) })),
  });
  return { ...build(), rebuild: build };
}

export function proseMenu(dev) {
  const build = () => {
    const beats = proseBeats(dev);
    return {
      title: 'STORY TEXT',
      items: [
        { label: `READ EVERYTHING IN ORDER (${beats.length})`, act: () => { dev.close(); walk(dev, beats, 0); } },
        { label: 'INTRO PANELS (4)', act: () => one(dev, beats[0]) },
        { label: 'BRIEFINGS ▸', submenu: () => beatListMenu(dev, 'BRIEFINGS', 'briefing') },
        { label: 'STAGE INTROS ▸', submenu: () => beatListMenu(dev, 'STAGE INTROS', 'intro') },
        { label: 'FINALE (9 BEATS + CODA)', act: () => one(dev, beats[beats.length - 1]) },
      ],
    };
  };
  return { ...build(), rebuild: build };
}
