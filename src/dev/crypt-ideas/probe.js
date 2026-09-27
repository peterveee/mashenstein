// A throwaway probe idea for the harness: a pale disc on each layer.
export const IDEAS = ['bg', 'mid', 'fg'].map((layer, i) => ({
  id: `probe-${layer}`, name: `PROBE ${layer}`, note: '', layer, when: 'on', u: [360, 170, 322][i],
  paint(ctx, f) { ctx.fillStyle = '#f0d060'; ctx.beginPath(); ctx.arc(f.x, f.y - 8, 6, 0, Math.PI * 2); ctx.fill(); },
}));
