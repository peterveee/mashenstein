// Saved evidence from this roll. Older takes are never regenerated to invent a report.
export const reportStrip = (mix, lane) => ({
  voice: mix.voice?.[`${lane}Voice`] || null,
  voiceParams: mix.voiceParams?.[`${lane}Voice`] || null,
  strip: mix.lanes?.[lane] || {},
  noteFX: mix.lanes?.[lane]?.noteFx || null,
});

const ordered = value => Array.isArray(value) ? value.map(ordered)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, ordered(value[k])])) : value;
// Song saving reorders properties and omits neutral faders. Neither is a mix edit.
export function sameReportStrip(a, b) {
  const normal = x => ({ ...x, strip: { ...x.strip, gain: x.strip?.gain ?? 0,
    pan: x.strip?.pan ?? 0, effects: x.strip?.effects || [],
    eq: { high: 0, mid: 0, low: 0, ...x.strip?.eq },
    send: { delay: 0, reverb: 0, ...x.strip?.send } } });
  return JSON.stringify(ordered(normal(a))) === JSON.stringify(ordered(normal(b)));
}

export function rollReport({ summary, warnings, levels, transitions, expressed, mix, laneOf }) {
  return structuredClone({ version: 1, summary, warnings, levels, transitions,
    expression: expressed?.applied || [],
    lanes: Object.entries(laneOf).map(([role, lane]) => ({ role, lane,
      label: mix.labels?.[lane] || role, ...reportStrip(mix, lane) })),
  });
}
