# Vue & Nuxt

Works with Vue 3.3 and later.

## Component

```vue
<script setup lang="ts">
import { BuildReveal } from 'build-reveal/vue';

function onDone() {
  console.log('revealed');
}
</script>

<template>
  <BuildReveal class="dashboard" :cursors="2" @complete="onDone">
    <h1 data-build="type">Revenue</h1>
    <p data-build>Up 12% this month.</p>
    <Chart data-build />
  </BuildReveal>
</template>
```

`<BuildReveal>` renders a `div` that is the stage; use `tag="section"` for another element. Attributes such as `class` and `id` go to that element.

| Prop | Default |
| --- | --- |
| `cursors` | `3` |
| `speed` | `1` |
| `trigger` | `'visible'` |
| `progressive` | `false` |
| `hold` | `false` |
| `disabled` | `false` |
| `tag` | `'div'` |

Prop changes are applied as they happen. The `complete` event fires when the animation finishes or is cut short.

Your components can be targets: Vue passes `data-build` on to their root element.

## Replay and finish

A template ref exposes `play()` and `finish()`:

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { BuildReveal } from 'build-reveal/vue';

const reveal = ref<{ play(): Promise<void>; finish(): void } | null>(null);
</script>

<template>
  <button type="button" @click="reveal?.play()">Replay</button>
  <BuildReveal ref="reveal">
    <h1 data-build="type">Revenue</h1>
  </BuildReveal>
</template>
```

## Directive

To keep your own element, use `v-build-reveal` with an options object:

```vue
<script setup lang="ts">
import { vBuildReveal } from 'build-reveal/vue';

function onDone() {
  console.log('revealed');
}
</script>

<template>
  <section v-build-reveal="{ cursors: 2, onComplete: onDone }">
    <h1 data-build="type">Welcome</h1>
  </section>
</template>
```

In `<script setup>`, an imported `vBuildReveal` is available as `v-build-reveal`. To register both for the whole app:

```ts
import { createApp } from 'vue';
import { BuildReveal, vBuildReveal } from 'build-reveal/vue';
import App from './App.vue';

createApp(App)
  .component('BuildReveal', BuildReveal)
  .directive('build-reveal', vBuildReveal)
  .mount('#app');
```

## Loading data

```vue
<BuildReveal :hold="loading">
  <article v-for="post in posts" :key="post.id" data-build>{{ post.title }}</article>
</BuildReveal>
```

While `hold` is on, the animation stays open and new targets join it. Set it to `false` when loading is done.

## Nuxt

The component and the directive only touch the page in the browser, so both work with server rendering. The page shows the server HTML first and the targets are hidden when Vue hydrates, so content at the very top may be visible for a moment before the animation starts. If that matters, wrap it in `<ClientOnly>`:

```vue
<ClientOnly>
  <BuildReveal>…</BuildReveal>
</ClientOnly>
```

## Testing

jsdom has no `IntersectionObserver`, so with Vue Test Utils and Vitest or Jest the animation is skipped and everything is visible. If your setup mocks `IntersectionObserver`, call `setBuildRevealEnabled(false)` in it.
