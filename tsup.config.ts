import { readFile, writeFile } from 'node:fs/promises';
import { defineConfig } from 'tsup';

const CLIENT_ENTRIES = ['dist/react.js', 'dist/react.cjs'];
const CLIENT_DIRECTIVE = "'use client';\n";

async function markClientEntries() {
  for (const file of CLIENT_ENTRIES) {
    const code = await readFile(file, 'utf8');
    if (!code.startsWith(CLIENT_DIRECTIVE)) await writeFile(file, CLIENT_DIRECTIVE + code);
  }
}

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
      element: 'src/element.ts',
      react: 'src/react.ts',
      vue: 'src/vue.ts'
    },
    format: ['esm', 'cjs'],
    target: 'es2022',
    dts: true,
    clean: true,
    sourcemap: true,
    treeshake: true,
    splitting: true,
    external: ['react', 'vue'],
    onSuccess: markClientEntries
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
