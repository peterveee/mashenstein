// Build timestamps are ISO values in the bundle, but users should see the
// same local device time everywhere: the install/portrait shell and Settings.
// Keep the formatter dependency-free so both the gate and the game bundle can
// use it without pulling DOM or renderer code into the other side.
const OPTIONS = {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZoneName: 'short',
};

export function formatBuildTime(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(undefined, OPTIONS).format(date);
  } catch (e) {
    return date.toISOString();
  }
}

export function formatBuildTimeLines(value) {
  const stamp = formatBuildTime(value);
  return stamp ? ['BUILT', stamp] : ['BUILT', 'TIME UNAVAILABLE'];
}
