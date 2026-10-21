// Checkpoint a desk store without serialising it for every pointer movement.
// The provider is read at flush time, so a song switch or undo cannot write an old copy.
export function createDraftPersistence({ storage, key, value, delay = 200, maxDelay = 1000,
  retryDelays = [1000, 5000, 30000],
  setTimer = setTimeout, clearTimer = clearTimeout, onError = () => {} }) {
  let revision = 0;
  let persisted = 0;
  let trailing = null;
  let maximum = null;
  let reportedFailure = false;
  let retry = null;
  let retries = 0;

  const cancelTimers = () => {
    if (trailing != null) clearTimer(trailing);
    if (maximum != null) clearTimer(maximum);
    if (retry != null) clearTimer(retry);
    retry = null;
    trailing = maximum = null;
  };
  const flush = () => {
    if (persisted === revision) { cancelTimers(); return true; }
    cancelTimers();
    try {
      // Serialisation can fail as well as storage. Neither failure may mark a revision saved.
      storage.setItem(key, JSON.stringify(value()));
      persisted = revision;
      reportedFailure = false;
      retries = 0;
      return true;
    } catch (error) {
      // A transient failure can recover even if the user stops editing. Bound
      // automatic attempts so a full storage quota cannot create an idle loop.
      if (retries < retryDelays.length) retry = setTimer(flush, retryDelays[retries++]);
      if (!reportedFailure) onError(error);
      reportedFailure = true;
      return false;
    }
  };
  const markDirty = () => {
    revision++;
    retries = 0;
    if (trailing != null) clearTimer(trailing);
    trailing = setTimer(flush, delay);
    if (maximum == null) maximum = setTimer(flush, maxDelay);
  };
  const writeNow = () => { markDirty(); return flush(); };
  return {
    markDirty, writeNow, flush,
    hasPending: () => revision !== persisted,
    dispose: cancelTimers,
  };
}
