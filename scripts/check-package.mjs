import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const dist = new URL('../dist/', import.meta.url);
const pathOf = (file) => fileURLToPath(new URL(file, dist));
const read = (file) => readFile(pathOf(file), 'utf8');
const require = createRequire(import.meta.url);

const ENTRIES = ['index', 'element', 'react', 'vue', 'tour'];
const FORMATS = [
  { name: 'ESM', extension: 'js', load: (file) => import(new URL(file, dist).href) },
  { name: 'CJS', extension: 'cjs', load: async (file) => require(pathOf(file)) }
];
const LOCAL_IMPORT = /(?:from\s*|import\s*|require\(\s*)['"]\.\/([^'"]+)['"]/g;

async function reachableFrom(file) {
  const seen = new Set();
  const queue = [file];

  while (queue.length) {
    const next = queue.shift();
    if (seen.has(next)) continue;
    seen.add(next);
    for (const [, dependency] of (await read(next)).matchAll(LOCAL_IMPORT)) queue.push(dependency);
  }

  return [...seen];
}

async function anyContains(files, needle) {
  const sources = await Promise.all(files.map(read));
  return sources.some((source) => source.includes(needle));
}

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
  assert.equal(typeof modules.tour.createTour, 'function', `${name} tour: no export`);
  assert.ok((await read(`react.${extension}`)).startsWith("'use client';"), `${name} react: no 'use client'`);

  const fromIndex = await reachableFrom(`index.${extension}`);
  const fromTour = await reachableFrom(`tour.${extension}`);
  assert.ok(!(await anyContains(fromIndex, 'function createTour(')), `${name} index: pulls in the tour`);
  assert.ok(!(await anyContains(fromTour, 'function createBuildReveal(')), `${name} tour: pulls in the reveal`);
  assert.ok(!(await anyContains(fromTour, 'function createTimeline(')), `${name} tour: pulls in the timeline`);

  const bundles = (await readdir(dist)).filter(
    (file) => file.endsWith(`.${extension}`) && !file.includes('.global.')
  );
  const drawingCopies = (await Promise.all(bundles.map(read))).filter((source) =>
    source.includes('function pointerIcon(')
  );
  assert.equal(drawingCopies.length, 1, `${name}: the shared drawing code is bundled more than once`);
}

const context = vm.createContext({});
vm.runInContext(await read('build-reveal.global.js'), context);
assert.equal(typeof context.BuildReveal?.createBuildReveal, 'function', 'script tag: no window.BuildReveal');
assert.equal(typeof context.BuildReveal?.createTour, 'function', 'script tag: no BuildReveal.createTour');

console.log('Package OK: every entry loads in ESM and CommonJS, the reveal and the tour share one core, and the script tag works.');
