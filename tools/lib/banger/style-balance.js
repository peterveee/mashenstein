import overrides from './balance-overrides.json' with { type: 'json' };

/** Built-in style balance plus the per-style values saved from THE DESK. */
export function balanceForStyle(style) {
  const base = style?.balance || {};
  const saved = overrides[style?.id] || {};
  return {
    ...base,
    ...saved,
    roleGainDb: { ...(base.roleGainDb || {}), ...(saved.roleGainDb || {}) },
  };
}
