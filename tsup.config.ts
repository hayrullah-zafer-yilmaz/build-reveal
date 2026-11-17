import { readFile, writeFile } from 'node:fs/promises';
import { defineConfig } from 'tsup';

const ENTRIES = {
  index: 'src/index.ts',
  element: 'src/element.ts',
  react: 'src/react.ts',
  vue: 'src/vue.ts',
  tour: 'src/tour.ts'
};
const CLIENT_ENTRIES = ['dist/react.js', 'dist/react.cjs'];
const CLIENT_DIRECTIVE = "'use client';\n";
const BARE_CHUNK_IMPORT = /^import '\.\/chunk-[\w-]+\.js';$/gm;

async function rewrite(file: string, change: (code: string) => string) {
  const code = await readFile(file, 'utf8');
  const changed = change(code);
  if (changed !== code) await writeFile(file, changed);
}

async function finishEntries() {
  for (const name of Object.keys(ENTRIES)) {
    await rewrite(`dist/${name}.js`, (code) => code.replace(BARE_CHUNK_IMPORT, ''));
  }
  for (const file of CLIENT_ENTRIES) {
    await rewrite(file, (code) => (code.startsWith(CLIENT_DIRECTIVE) ? code : CLIENT_DIRECTIVE + code));
  }
}

export default defineConfig([
  {
    entry: ENTRIES,
    format: ['esm', 'cjs'],
    target: 'es2022',
    dts: true,
    clean: true,
    sourcemap: true,
    treeshake: true,
    splitting: true,
    external: ['react', 'vue'],
    onSuccess: finishEntries
  },
  {
    entry: { 'build-reveal': 'src/browser.ts' },
    format: ['iife'],
    globalName: 'BuildReveal',
    target: 'es2022',
    minify: true,
    sourcemap: true
  }
]);
