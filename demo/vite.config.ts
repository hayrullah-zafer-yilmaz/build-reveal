import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const source = (path: string) => fileURLToPath(new URL(`../src/${path}`, import.meta.url));

export default defineConfig({
  base: './',
  define: {
    __VUE_OPTIONS_API__: 'true',
    __VUE_PROD_DEVTOOLS__: 'false',
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false'
  },
  resolve: {
    alias: [
      { find: /^build-reveal\/(element|react|vue)$/, replacement: source('$1.ts') },
      { find: /^build-reveal$/, replacement: source('index.ts') }
    ]
  }
});
