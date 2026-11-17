import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const dist = new URL('../dist/', import.meta.url);
const pathOf = (file) => fileURLToPath(new URL(file, dist));
const read = (file) => readFile(pathOf(file), 'utf8');
const require = createRequire(import.meta.url);

const ENTRIES = ['index', 'element', 'react', 'vue'];
const FORMATS = [
  { name: 'ESM', extension: 'js', load: (file) => import(new URL(file, dist).href) },
  { name: 'CJS', extension: 'cjs', load: async (file) => require(pathOf(file)) }
];

for (const { name, extension, load } of FORMATS) {
  const modules = {};

  for (const entry of ENTRIES) {
    const file = `${entry}.${extension}`;
    modules[entry] = await load(file);
    assert.ok(
      !(await read(file)).includes('function createBuildReveal('),
      `${name} ${entry}: bundles its own copy of the core, so global settings would not be shared`
    );
  }

  for (const entry of ['react', 'vue']) {
    assert.equal(
      modules[entry].setBuildRevealEnabled,
      modules.index.setBuildRevealEnabled,
      `${name} ${entry}: does not share the core with the main entry`
    );
  }

  assert.equal(typeof modules.element.defineBuildRevealElement, 'function', `${name} element: no export`);
  assert.ok((await read(`react.${extension}`)).startsWith("'use client';"), `${name} react: no 'use client'`);
}

const context = vm.createContext({});
vm.runInContext(await read('build-reveal.global.js'), context);
assert.equal(typeof context.BuildReveal?.createBuildReveal, 'function', 'script tag: no window.BuildReveal');

console.log('Package OK: ESM, CommonJS and script tag builds load and share one core.');
