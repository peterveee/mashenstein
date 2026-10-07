// THE GOLDEN TOASTER'S TOP, BEFORE ITS PERSPECTIVE WAS FIXED (Peter, 7 Oct 2026: "i kinda like the
// current one but the top perspective where the toast comes out is off"). A frozen copy of
// PROP_PAINTERS.appliance as it was, so the gallery can show the fix beside it. Review only:
// nothing in the game reads this file.
import { GOLD_TOASTER_FINISH, plain, rr, star, stroke } from '../sprites/props.js';

export function applianceBefore(ctx, w, h, frame = 0, finish = null) {
  finish = finish || GOLD_TOASTER_FINISH;
  const u = Math.max(w, h);
  const fineShape = (fill, pathFn) => {
    ctx.beginPath(); pathFn(ctx);
    ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = 'rgba(55,35,12,0.22)';
    ctx.lineWidth = Math.max(0.24, u * 0.015);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.stroke();
  };
  const wingShape = (fill, pathFn) => {
    ctx.beginPath(); pathFn(ctx);
    ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = 'rgba(64,61,78,0.4)';
    ctx.lineWidth = Math.max(0.34, u * 0.02);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.stroke();
  };

  // Build in the reference's three-quarter view, then flip the complete
  // construction so its body, lever and unequal wings all travel rightward.
  ctx.save();
  // The 24x20 pickup reserves its top four pixels for the toast launch.
  // Compress the appliance construction back to its intended 24x16 body and
  // bottom-anchor it inside that taller transparent canvas.
  ctx.translate(0, h * 0.2);
  ctx.scale(1, 0.8);
  ctx.translate(w, 0);
  ctx.scale(-1, 1);
  // Pitch the complete appliance toward its front-right corner. Because the
  // authored construction is mirrored, this slight counter-clockwise local
  // roll appears clockwise on screen: the near-right corner sits lower.
  ctx.translate(w * 0.5, h * 0.5);
  ctx.rotate(-0.065);
  ctx.translate(-w * 0.5, -h * 0.5);
  const phase = (frame % 12) * Math.PI / 6;
  const lift = Math.cos(phase);
  const sweep = Math.sin(phase);
  // Toast runs on its own four-second cycle, offset from the quick wing flap.
  const toastBand = Math.floor((frame % 96) / 12);
  const toastPhase = (frame % 96) * Math.PI / 48 + Math.PI / 6;
  // Spend most of the slow cycle raised, dip fully into the slot only
  // briefly, then return. Frame zero starts visibly raised in static views.
  // Band three is reserved for genuinely toastless appliances.  Previously
  // it merely landed near the bottom of the animation curve, which still
  // left a small slice visible on most wing frames.
  const toastOpen = toastBand === 3 ? 0
    : Math.pow(Math.max(0, 0.5 + Math.cos(toastPhase) * 0.5), 0.35);
  const toastRise = h * 0.48 * toastOpen;
  const toastSway = w * 0.002 * Math.sin(toastPhase);

  // Small rear wing tucked behind the toaster's top shoulder.
  ctx.save();
  ctx.translate(w * 0.34, h * 0.44);
  // This wing extends left in the authored view, so its hinge rotation must
  // oppose the foreground wing for both tips to rise and fall together.
  ctx.rotate(0.28 + lift * 0.26 - sweep * 0.02);
  ctx.scale(1.08, 1.08);
  wingShape('#d5d4dc', (c) => {
    c.moveTo(0, h * 0.08);
    c.bezierCurveTo(-w * 0.1, -h * 0.01, -w * 0.22, -h * 0.03, -w * 0.29, h * 0.01);
    c.quadraticCurveTo(-w * 0.22, h * 0.11, -w * 0.15, h * 0.11);
    c.quadraticCurveTo(-w * 0.11, h * 0.19, -w * 0.05, h * 0.15);
    c.closePath();
  });
  stroke(ctx, '#9999a8', Math.max(0.24, u * 0.014), (c) => {
    c.moveTo(-w * 0.25, h * 0.025); c.quadraticCurveTo(-w * 0.12, h * 0.06, 0, h * 0.1);
    c.moveTo(-w * 0.17, h * 0.035); c.lineTo(-w * 0.08, h * 0.135);
  });
  ctx.restore();

  // Flat reference construction: one narrow side plane, one broad face and
  // one sloped cap. Avoid a separate round centre panel.
  fineShape(finish?.back || '#a97816', (c) => {
    c.moveTo(w * 0.16, h * 0.36);
    c.quadraticCurveTo(w * 0.17, h * 0.35, w * 0.2, h * 0.36);
    c.lineTo(w * 0.31, h * 0.39);
    c.lineTo(w * 0.32, h * 0.92);
    c.lineTo(w * 0.21, h * 0.9);
    c.quadraticCurveTo(w * 0.16, h * 0.88, w * 0.16, h * 0.82);
    c.lineTo(w * 0.16, h * 0.36);
    c.closePath();
  });
  const sidePath = (c) => {
    c.moveTo(w * 0.31, h * 0.39);
    c.lineTo(w * 0.74, h * 0.35);
    c.quadraticCurveTo(w * 0.8, h * 0.34, w * 0.8, h * 0.41);
    c.lineTo(w * 0.79, h * 0.81);
    c.quadraticCurveTo(w * 0.79, h * 0.86, w * 0.73, h * 0.88);
    c.lineTo(w * 0.36, h * 0.92);
    c.quadraticCurveTo(w * 0.32, h * 0.92, w * 0.32, h * 0.88);
    c.lineTo(w * 0.31, h * 0.39);
    c.closePath();
  };
  fineShape(finish?.side || '#f4c934', sidePath);
  // CHROME. A mirror finish is what it reflects: bright sky over the upper
  // face, a hard dark horizon just below the middle, lighter ground under it,
  // and two fixed specular streaks across the part the wing leaves bare. All
  // of it is fixed to the casing — the toaster never turns, so nothing here
  // is allowed to flash on a clock (see the glint rule for the ball tops).
  if (finish?.chrome) {
    ctx.save();
    ctx.beginPath(); sidePath(ctx); ctx.clip();
    // tests/props.js traces painters on a recorder that returns no gradient.
    const g = ctx.createLinearGradient(0, h * 0.35, 0, h * 0.92);
    if (g) {
      for (const [at, col] of finish.chrome) g.addColorStop(at, col);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.moveTo(w * 0.35, h * 0.3); ctx.lineTo(w * 0.4, h * 0.3);
    ctx.lineTo(w * 0.33, h * 0.95); ctx.lineTo(w * 0.28, h * 0.95);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.moveTo(w * 0.44, h * 0.3); ctx.lineTo(w * 0.46, h * 0.3);
    ctx.lineTo(w * 0.39, h * 0.95); ctx.lineTo(w * 0.37, h * 0.95);
    ctx.closePath(); ctx.fill();
    // The travelling glint (applianceSheenSprite): a soft white band at `pos`
    // across the face, as bright as `a`. It sits under the wing, which is
    // painted after it.
    if (finish.sheen && finish.sheen.a > 0) {
      // Across the part of the face the wing leaves bare (authored 0.3..0.58).
      const cx = w * (0.3 + 0.28 * (finish.sheen.pos + 1) / 2);
      const half = w * 0.07;
      const band = ctx.createLinearGradient(cx - half, 0, cx + half, 0);
      if (band) {
        band.addColorStop(0, 'rgba(255,255,255,0)');
        band.addColorStop(0.5, `rgba(255,255,255,${0.9 * finish.sheen.a})`);
        band.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = band;
        ctx.beginPath();
        ctx.moveTo(cx - half + w * 0.04, h * 0.3); ctx.lineTo(cx + half + w * 0.04, h * 0.3);
        ctx.lineTo(cx + half - w * 0.04, h * 0.95); ctx.lineTo(cx - half - w * 0.04, h * 0.95);
        ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();

    ctx.beginPath(); sidePath(ctx);
    ctx.strokeStyle = 'rgba(55,35,12,0.22)';
    ctx.lineWidth = Math.max(0.24, u * 0.015);
    ctx.stroke();
  }
  fineShape(finish?.top || '#ffe16a', (c) => {
    c.moveTo(w * 0.17, h * 0.36);
    c.lineTo(w * 0.31, h * 0.28);
    c.quadraticCurveTo(w * 0.32, h * 0.27, w * 0.35, h * 0.27);
    c.lineTo(w * 0.68, h * 0.27);
    c.quadraticCurveTo(w * 0.7, h * 0.27, w * 0.72, h * 0.29);
    c.lineTo(w * 0.79, h * 0.34);
    c.quadraticCurveTo(w * 0.8, h * 0.36, w * 0.77, h * 0.36);
    c.lineTo(w * 0.35, h * 0.39);
    c.quadraticCurveTo(w * 0.32, h * 0.4, w * 0.3, h * 0.38);
    c.closePath();
  });
  stroke(ctx, finish?.edge || 'rgba(178,124,22,0.55)', Math.max(0.2, u * 0.011), (c) => {
    c.moveTo(w * 0.35, h * 0.39);
    c.lineTo(w * 0.77, h * 0.36);
  });

  // The ejector lives on the narrow side plane. Its thumb rises as the
  // independent toast cycle opens, making the mechanism legible without the
  // old floating knob.
  stroke(ctx, finish?.lever || '#6e4518', Math.max(0.26, u * 0.014), (c) => {
    c.moveTo(w * 0.235, h * 0.49);
    c.lineTo(w * 0.235, h * 0.74);
  });
  const sliderY = h * (0.67 - toastOpen * 0.13);
  fineShape(finish?.slot || '#4a2b12', (c) => rr(c, w * 0.19, sliderY, w * 0.09, h * 0.07, w * 0.022));

  // A very small travelling gleam keeps the collectible feeling prized
  // without competing with the toast or feather animation.
  const glimmer = Math.max(0, Math.sin(toastPhase * 2 - 0.45));
  ctx.save();
  ctx.globalAlpha = 0.22 + glimmer * 0.62;
  plain(ctx, finish?.glint || '#fff8c8', (c) => star(c, w * 0.67, h * 0.56, w * (0.012 + glimmer * 0.014), w * 0.005, 4));
  ctx.restore();

  // Clip the full square slice at the slot line: at the bottom of its slow
  // cycle it is genuinely inside the casing; at the top it rises almost
  // completely clear. The tiny lateral settle keeps all 96 poses distinct.
  ctx.save();
  ctx.translate(w * 0.5, h * 0.325);
  ctx.rotate(-0.07);
  ctx.translate(-w * 0.5, -h * 0.325);
  ctx.beginPath();
  ctx.rect(0, -h, w, h * 1.335);
  ctx.clip();
  ctx.translate(toastSway, -toastRise);
  // A slight shear makes the slice lean toward the visible right-side plane
  // while its lower edge remains aligned with the slot.
  ctx.transform(1, 0, 0.07, 1, -h * 0.021, 0);
  fineShape('#93602a', (c) => rr(c, w * 0.385, h * 0.345, w * 0.23, h * 0.345, w * 0.03));
  plain(ctx, '#d9a84f', (c) => rr(c, w * 0.415, h * 0.38, w * 0.17, h * 0.275, w * 0.022));
  ctx.restore();

  // One clean recessed opening; the dark capsule carries enough depth
  // without an extra metallic rim competing with the toast.
  ctx.save();
  ctx.translate(w * 0.5, h * 0.325);
  ctx.rotate(-0.07);
  ctx.translate(-w * 0.5, -h * 0.325);
  plain(ctx, finish?.slot || '#4a2b12', (c) => rr(c, w * 0.36, h * 0.309, w * 0.28, h * 0.036, h * 0.016));
  ctx.restore();

  // Large foreground wing wraps across the side. Separate feather tips make
  // the wing survive reduction without reverting to a thick dark outline.
  ctx.save();
  ctx.translate(w * 0.57, h * 0.52);
  ctx.rotate(-0.08 - lift * 0.31 + sweep * 0.025);
  ctx.scale(1.08, 1.08);
  wingShape('#f6f5fa', (c) => {
    c.moveTo(-w * 0.05, -h * 0.06);
    c.bezierCurveTo(w * 0.08, -h * 0.14, w * 0.21, -h * 0.15, w * 0.36, -h * 0.11);
    c.quadraticCurveTo(w * 0.4, -h * 0.04, w * 0.34, h * 0.015);
    c.quadraticCurveTo(w * 0.39, h * 0.08, w * 0.31, h * 0.12);
    c.quadraticCurveTo(w * 0.34, h * 0.2, w * 0.25, h * 0.2);
    c.quadraticCurveTo(w * 0.23, h * 0.28, w * 0.14, h * 0.23);
    c.quadraticCurveTo(w * 0.08, h * 0.29, w * 0.02, h * 0.18);
    c.closePath();
  });
  stroke(ctx, '#aaaab8', Math.max(0.24, u * 0.014), (c) => {
    c.moveTo(-w * 0.02, h * 0.02); c.quadraticCurveTo(w * 0.17, h * 0.02, w * 0.34, -h * 0.08);
    c.moveTo(w * 0.1, h * 0.04); c.lineTo(w * 0.31, h * 0.1);
    c.moveTo(w * 0.08, h * 0.08); c.lineTo(w * 0.24, h * 0.19);
    c.moveTo(w * 0.04, h * 0.1); c.lineTo(w * 0.14, h * 0.23);
  });
  ctx.restore();

  // At the glint's peak the band throws a star off the face's top edge, over the
  // wing and out past the silhouette — the part of a glint that reads at lane size.
  if (finish.sheen && finish.sheen.a > 0.35) {
    const k = (finish.sheen.a - 0.35) / 0.65;
    const cx = w * (0.3 + 0.28 * (finish.sheen.pos + 1) / 2) + w * 0.03;
    ctx.save();
    ctx.globalAlpha = 0.3 * k;
    plain(ctx, '#ffffff', (c) => c.arc(cx, h * 0.3, w * 0.09 * k, 0, Math.PI * 2));
    ctx.globalAlpha = k;
    plain(ctx, '#ffffff', (c) => star(c, cx, h * 0.3, w * (0.07 + 0.13 * k), w * 0.014, 4));
    ctx.restore();
  }

  ctx.restore();
}
