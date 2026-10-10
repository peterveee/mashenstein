// The C cores tools/build-wasm.js compiles, how they are compiled, and the hash that says a
// build is current. The hash half is shared with tests/wasm-worklet-proof.js, so the
// staleness check needs no toolchain; the compile half needs Homebrew's:
//
//   brew install llvm lld wasi-libc
//
// Apple's clang has no wasm32 target. wasi-libc is there for its maths only — cos, sin,
// pow, log2 and friends, musl's implementations — linked from libc.a by hand rather than
// through the WASI startup files, so a core imports NOTHING: no WASI, no JS glue. compile()
// refuses a module that has an import, because a worklet has nothing to satisfy one with.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const WASM_CORES = Object.freeze([
  { name: 'hello', source: 'src/engine/mrdr3wasm/hello.c', output: 'src/engine/mrdr3wasm/hello.wasm.js' },
]);

// No entry point; every EXPORT-marked function is exported, plus `memory`.
export const WASM_FLAGS = Object.freeze([
  '--target=wasm32-wasip1', '-O3', '-nostdlib', '-fvisibility=hidden', '-Wall', '-Werror',
  '-Wl,--no-entry', '-Wl,--export-dynamic', '-Wl,--strip-all',
]);

/** Source text plus flags: a change to either makes the tracked bytes stale. */
export const wasmSourceHash = (text) => createHash('sha256')
  .update(WASM_FLAGS.join(' ')).update('\0').update(text)
  .digest('hex').slice(0, 16);

const CLANG = process.env.MASH_CLANG || '/opt/homebrew/opt/llvm/bin/clang';
const LLD_BIN = process.env.MASH_LLD_BIN || '/opt/homebrew/opt/lld/bin';
const SYSROOT = process.env.MASH_WASI_SYSROOT || '/opt/homebrew/share/wasi-sysroot';
const LIBC = join(SYSROOT, 'lib', 'wasm32-wasip1', 'libc.a');

/** Whether this machine can compile a core at all. */
export function wasmToolchainMissing() {
  for (const p of [CLANG, join(LLD_BIN, 'wasm-ld'), LIBC]) if (!existsSync(p)) return p;
  return null;
}

/** Compile one C file to wasm bytes. Throws on a compile error or an import. */
export function compileWasm(sourcePath) {
  const missing = wasmToolchainMissing();
  if (missing) throw new Error(`no wasm toolchain (${missing}) — brew install llvm lld wasi-libc`);
  const tmp = mkdtempSync(join(tmpdir(), 'mash-wasm-'));
  try {
    const out = join(tmp, 'core.wasm');
    execFileSync(CLANG, [...WASM_FLAGS, `--sysroot=${SYSROOT}`, '-o', out, sourcePath, LIBC], {
      stdio: 'inherit',
      env: { ...process.env, PATH: `${LLD_BIN}:${process.env.PATH}` },
    });
    const bytes = readFileSync(out);
    const imports = WebAssembly.Module.imports(new WebAssembly.Module(bytes));
    if (imports.length) {
      throw new Error(`${sourcePath} imports ${imports.map((i) => `${i.module}.${i.name}`).join(', ')}`);
    }
    return bytes;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
