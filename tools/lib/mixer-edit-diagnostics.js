// Opt-in audit support. Imported by the Stage 5 harness, never the production Desk.
// Measures synchronous handler work, not promise completion or heard latency.
export function createEditDiagnostics({ enabled = true, limit = 256, now = () => performance.now() } = {}) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 4096) throw new RangeError('Invalid sample limit');
  const records = new Map();
  function wrap(name, fn) {
    if (!enabled) return fn;
    if (records.has(name)) throw new Error(`Duplicate diagnostic: ${name}`);
    if (records.size >= 32) throw new Error('Too many diagnostics');
    const record = { count: 0, errors: 0, totalMs: 0, maxMs: 0, samples: [], next: 0 };
    records.set(name, record);
    return function (...args) {
      const start = now();
      record.count++;
      try { return Reflect.apply(fn, this, args); }
      catch (error) { record.errors++; throw error; }
      finally {
        const ms = Math.max(0, now() - start);
        record.totalMs += ms;
        record.maxMs = Math.max(record.maxMs, ms);
        record.samples[record.next] = ms;
        record.next = (record.next + 1) % limit;
      }
    };
  }
  function snapshot() {
    return Object.fromEntries([...records].map(([name, record]) => {
      const values = [...record.samples].sort((a, b) => a - b);
      const percentile = fraction => values.length ? values[Math.floor((values.length - 1) * fraction)] : null;
      return [name, { count: record.count, errors: record.errors, totalMs: record.totalMs,
        maxMs: record.maxMs, retained: values.length, p50Ms: percentile(0.5), p95Ms: percentile(0.95) }];
    }));
  }
  function reset() {
    for (const record of records.values()) Object.assign(record,
      { count: 0, errors: 0, totalMs: 0, maxMs: 0, samples: [], next: 0 });
  }
  return { wrap, snapshot, reset };
}
