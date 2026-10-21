// Serialize the request AND acknowledgement across all desk song writes. The server
// returns whole-library baselines, so separate per-song queues are not sufficient.
// Callers capture their immutable request before enqueueing, not when it starts.
export function createSaveQueue() {
  let tail = Promise.resolve();
  return (save) => {
    const result = tail.then(save);
    // A failed save still rejects to its caller but cannot strand subsequent saves.
    tail = result.catch(() => {});
    return result;
  };
}
