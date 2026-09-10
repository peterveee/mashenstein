// Small, fail-closed scanner for hand-authored JavaScript data tables.
// It deliberately returns source spans rather than reprinting JavaScript.

export function matchBrace(src, open) {
  const opener = src[open];
  const pairs = { '{': '}', '[': ']', '(': ')' };
  const closer = pairs[opener];
  if (!closer) throw new Error(`expected an opening delimiter at ${open}`);
  const stack = [];
  let quote = null;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === '\\') { i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '\'' || c === '"' || c === '`') { quote = c; continue; }
    if (c === '/' && src[i + 1] === '/') {
      const nl = src.indexOf('\n', i + 2);
      i = nl < 0 ? src.length : nl;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      if (end < 0) throw new Error('unterminated block comment');
      i = end + 1;
      continue;
    }
    if (c === '{' || c === '[' || c === '(') stack.push(c);
    else if (c === '}' || c === ']' || c === ')') {
      const expected = pairs[stack[stack.length - 1]];
      if (expected !== c) throw new Error(`mismatched delimiter at ${i}`);
      stack.pop();
      if (!stack.length) return i + 1; // end-exclusive
    }
  }
  throw new Error(`unclosed ${opener} at ${open}`);
}

function skipSpace(src, i, to) {
  while (i < to) {
    if (/\s/.test(src[i])) { i++; continue; }
    if (src[i] === '/' && src[i + 1] === '/') {
      const nl = src.indexOf('\n', i + 2);
      i = nl < 0 ? to : nl + 1;
      continue;
    }
    if (src[i] === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      if (end < 0 || end >= to) throw new Error('unterminated block comment');
      i = end + 2;
      continue;
    }
    break;
  }
  return i;
}

// Properties at the direct depth of [from, to). `valueStart` points at the first
// token of the value and `valueEnd` is exclusive. The returned `end` includes a
// trailing comma but never the next property.
export function topLevelProps(src, from, to) {
  const out = [];
  let i = from;
  while (i < to) {
    i = skipSpace(src, i, to);
    if (i >= to) break;
    if (src[i] === ',') { i++; continue; }
    if (src[i] === '/' && src[i + 1] === '/') {
      const nl = src.indexOf('\n', i + 2);
      i = nl < 0 ? to : nl + 1;
      continue;
    }
    if (src[i] === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      if (end < 0) throw new Error('unterminated block comment');
      i = end + 2;
      continue;
    }
    const keyStart = i;
    let key = null;
    if (/[A-Za-z_$]/.test(src[i])) {
      let j = i + 1;
      while (j < to && /[\w$]/.test(src[j])) j++;
      key = src.slice(i, j);
      j = skipSpace(src, j, to);
      if (src[j] !== ':') key = null;
      else i = j + 1;
    }
    if (!key) {
      // A spread or unsupported computed property: skip one complete value so
      // nested keys cannot be mistaken for table members.
      if (src[i] === '{' || src[i] === '[' || src[i] === '(') i = matchBrace(src, i);
      else {
        const nl = src.indexOf('\n', i + 1);
        i = nl < 0 ? to : nl + 1;
      }
      continue;
    }
    const valueStart = skipSpace(src, i, to);
    if (valueStart >= to) throw new Error(`property ${key} has no value`);
    let valueEnd;
    if ('{[('.includes(src[valueStart])) valueEnd = matchBrace(src, valueStart);
    else {
      let j = valueStart;
      let q = null;
      while (j < to) {
        const c = src[j];
        if (q) { if (c === '\\') j++; else if (c === q) q = null; j++; continue; }
        if (c === '\'' || c === '"' || c === '`') { q = c; j++; continue; }
        if (c === '/' && src[j + 1] === '/') break;
        if (c === '/' && src[j + 1] === '*') {
          const e = src.indexOf('*/', j + 2); if (e < 0) throw new Error('unterminated block comment');
          j = e + 2; continue;
        }
        if (c === ',') break;
        j++;
      }
      valueEnd = j;
      while (valueEnd > valueStart && /\s/.test(src[valueEnd - 1])) valueEnd--;
    }
    let end = valueEnd;
    let after = skipSpace(src, valueEnd, to);
    if (src[after] === ',') end = after + 1;
    out.push({ key, keyStart, valueStart, valueEnd, end });
    i = end;
  }
  return out;
}
