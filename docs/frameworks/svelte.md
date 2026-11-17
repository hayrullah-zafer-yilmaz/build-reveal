# Svelte

## Action (recommended)

A small [action](https://svelte.dev/docs/svelte/use) turns any element into a stage:

```svelte
<script>
  import { createBuildReveal } from 'build-reveal';

  function buildReveal(node, options) {
    const reveal = createBuildReveal(node, options);
    return {
      update: (next) => reveal.update(next),
      destroy: () => reveal.destroy()
    };
  }
</script>

<section use:buildReveal={{ cursors: 2, onComplete: () => console.log('revealed') }}>
  <h1 data-build="type">Revenue</h1>
  <p data-build>Up 12% this month.</p>
</section>
```

To use it everywhere, move it to a shared file. With TypeScript:

```ts
// src/lib/buildReveal.ts
import type { Action } from 'svelte/action';
import { createBuildReveal, type BuildRevealOptions } from 'build-reveal';

export const buildReveal: Action<HTMLElement, BuildRevealOptions | undefined> = (node, options) => {
  const reveal = createBuildReveal(node, options);
  return {
    update: (next) => reveal.update(next ?? {}),
    destroy: () => reveal.destroy()
  };
};
```

## Web Component

You can also use the [`<build-reveal>` element](web-component.md). Register it once, for example in your root layout:

```svelte
<script>
  import { defineBuildRevealElement } from 'build-reveal/element';

  defineBuildRevealElement();
</script>

<build-reveal speed="1.2" oncomplete={() => console.log('revealed')}>
  <h1 data-build="type">Revenue</h1>
</build-reveal>
```

In Svelte 4, listen with `on:complete` instead of `oncomplete`.

## SvelteKit

Actions only run in the browser, so the action works with server rendering. The page shows the server HTML first, so content at the very top may be visible for a moment before the animation starts.
