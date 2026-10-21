import assert from 'node:assert/strict';
import { createDraftPersistence } from '../tools/mixer-draft-persistence.js';

function clock() {
  let now = 0; let next = 1;
  const jobs = new Map();
  return {
    setTimer(fn, delay) { const id = next++; jobs.set(id, { at: now + delay, fn }); return id; },
    clearTimer(id) { jobs.delete(id); },
    advance(ms) {
      const end = now + ms;
      while (true) {
        const due = [...jobs].filter(([, job]) => job.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        jobs.delete(due[0]); now = due[1].at; due[1].fn();
      }
      now = end;
    },
  };
}

const timer = clock();
let draft = { a: { gain: 0 } };
const writes = [];
let fail = false; let errors = 0;
const storage = { setItem(key, data) {
  if (fail) throw new Error('quota');
  writes.push({ key, data: JSON.parse(data) });
} };
const checkpoint = createDraftPersistence({
  storage, key: 'mash-mixer-draft', value: () => draft,
  ...timer, onError: () => errors++,
});

for (let i = 0; i < 100; i++) { draft.a.gain = i; checkpoint.markDirty(); }
assert.equal(writes.length, 0, 'a short gesture does not synchronously write');
timer.advance(199);
assert.equal(writes.length, 0);
timer.advance(1);
assert.equal(writes.length, 1);
assert.equal(writes[0].data.a.gain, 99);
assert.equal(checkpoint.hasPending(), false);

for (let i = 0; i < 30; i++) {
  draft.a.gain = i;
  checkpoint.markDirty();
  timer.advance(50);
}
assert.ok(writes.length >= 2 && writes.length <= 3,
  'a continuous gesture checkpoints by the maximum delay');
assert.equal(checkpoint.flush(), true);
assert.equal(writes.at(-1).data.a.gain, 29);

draft.b = { gain: 4 };
checkpoint.markDirty();
assert.equal(checkpoint.flush(), true);
assert.deepEqual(writes.at(-1).data.b, { gain: 4 }, 'song switch writes latest whole collection');

draft.a.gain = 77;
checkpoint.markDirty();
fail = true;
assert.equal(checkpoint.flush(), false);
assert.equal(checkpoint.hasPending(), true);
assert.equal(errors, 1);
fail = false;
assert.equal(checkpoint.flush(), true);
assert.equal(writes.at(-1).data.a.gain, 77);
assert.equal(checkpoint.hasPending(), false);

draft = { b: { gain: 5 } };
checkpoint.writeNow();
timer.advance(2000);
assert.deepEqual(writes.at(-1).data, draft, 'reset cannot be resurrected by an older timer');
console.log('MIXER DRAFT PERSISTENCE: PASSED');

// Idle recovery, bounded backoff, and disposal use virtual time (no real waits).
const retryClock = clock();
let attempts = 0; let unavailable = true; let warnings = 0; let latest = { gain: 1 };
let stored;
const recovering = createDraftPersistence({
  ...retryClock, key: 'retry', value: () => latest,
  storage: { setItem(key, text) { attempts++; if (unavailable) throw Error('quota'); stored = JSON.parse(text); } },
  onError: () => warnings++,
});
recovering.writeNow();
retryClock.advance(999); assert.equal(attempts, 1);
latest = { gain: 2 }; unavailable = false;
retryClock.advance(1);
assert.deepEqual(stored, latest, 'idle retry reads current state');
assert.equal(recovering.hasPending(), false);
retryClock.advance(60000); assert.equal(attempts, 2, 'success cancels retry work');
unavailable = true; recovering.writeNow();
retryClock.advance(60000);
assert.equal(attempts, 6, 'one initial attempt plus three bounded retries');
assert.equal(warnings, 2, 'one warning per failure episode');
assert.equal(recovering.hasPending(), true);
retryClock.advance(60000); assert.equal(attempts, 6, 'persistent failure stops automatic attempts');
recovering.markDirty(); retryClock.advance(200); assert.equal(attempts, 7);
recovering.dispose(); retryClock.advance(60000); assert.equal(attempts, 7, 'dispose cancels pending retry');
console.log('MIXER DRAFT RETRIES: PASSED');
