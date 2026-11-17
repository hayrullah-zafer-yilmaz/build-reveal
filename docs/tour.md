# Guided tours

A virtual cursor walks your users through the real page. It moves to an element, draws a selection frame around it, explains it in a caption, and can act out a click or typing without touching your app.

```js
import { createTour } from 'build-reveal/tour';

const tour = createTour([
  { target: '#search', caption: 'Type the invoice you are looking for.', type: 'Invoice 2026' },
  { target: '#filter', caption: 'Filter the list by date.', click: true },
  { target: '#export', caption: 'Download it as a spreadsheet.' }
]);

document.querySelector('#help').addEventListener('click', () => tour.start());
```

With the [script tag](getting-started.md#1-install), use `BuildReveal.createTour(...)`.

## Steps

| Field | Type | Description |
| --- | --- | --- |
| `target` | `string \| Element \| () => Element` | What the step points at: a CSS selector, an element, or a function that returns one. |
| `caption` | `string` | The explanation shown in the panel. Screen readers read it too. |
| `click` | `boolean` | Act out a click: the cursor presses and a ring spreads out. Nothing is clicked. |
| `type` | `string` | Act out typing. If the target is an empty input or textarea, or contains exactly one, the text appears inside the field letter by letter. Otherwise it appears in the panel. The field's value never changes. |

In each step, the tour:

1. scrolls the target into view if it isn't comfortably visible,
2. moves the cursor to it and draws a frame around it,
3. shows the caption,
4. acts out the click or the typing.

## Options

| Option | Default | Description |
| --- | --- | --- |
| `autoplay` | `false` | Move to the next step by itself after a reading delay based on the text length. It waits while the pointer is over the panel and turns off when the user goes back. |
| `speed` | `1` | Playback speed multiplier. |
| `cursor` | | The cursor's `label`, `color` or `hue`, like the reveal's [`cursors`](api.md#buildcursor). |
| `labels` | English | Button and panel texts, see [Translating](#translating). |
| `onStep(index)` | | Called as soon as a step is shown, before its target is looked for. Use it to open a menu or render what the step needs. It's also called for steps that end up skipped. |
| `onEnd(completed)` | | Called when the tour ends: `true` after the last step, `false` when it's closed early. |

## Controls

```js
tour.start();     // from the first step, or tour.start(2) from the third
tour.next();      // ends the tour on the last step
tour.back();
tour.goTo(1);
tour.stop();      // ends the tour, onEnd(false)
tour.destroy();   // removes everything without calling onEnd
tour.step;        // the current step, or -1
tour.active;      // whether the tour is running
```

Only one tour runs at a time: starting another one ends the first.

## What the user can do

- Use **Next**, **Back** and **Close** in the panel.
- Press the arrow keys while the panel has focus, and Escape to close the tour. Escape is left alone while the user types in a field on the page, or when your app has already handled it.
- Keep using the page: the tour doesn't block it, and it follows its target when the page scrolls or changes.

Clicks inside the panel don't reach your app's "click outside" handlers, so open menus stay open.

## Targets that aren't there yet

If a step's target isn't on the page (it might render later in a single-page app), the tour waits up to 3 seconds and then skips the step. To show something that needs a click first, open it in `onStep`:

```js
createTour(steps, {
  onStep: (index) => {
    if (index === 2) openSettingsMenu();
  }
});
```

## Translating

```js
createTour(steps, {
  labels: {
    next: 'İleri',
    back: 'Geri',
    done: 'Bitti',
    close: 'Turu kapat',
    tour: 'Rehberli tur',
    progress: (step, total) => `${step} / ${total}`
  }
});
```

`tour` is the name screen readers announce for the panel, and `close` labels the × button.

## Showing a tour only once

```js
const tour = createTour(steps, {
  onEnd: () => localStorage.setItem('invoices-tour', 'seen')
});

if (!localStorage.getItem('invoices-tour')) tour.start();
```

## React and Vue

`createTour` doesn't touch the page until `start()`, so you can create a tour anywhere, including during server-side rendering.

```tsx
import { useEffect, useRef } from 'react';
import { createTour, type Tour } from 'build-reveal/tour';

export function HelpButton() {
  const tour = useRef<Tour | null>(null);

  useEffect(() => {
    tour.current = createTour([
      { target: '#search', caption: 'Type the invoice you are looking for.', type: 'Invoice 2026' },
      { target: '#export', caption: 'Download it as a spreadsheet.', click: true }
    ]);
    return () => tour.current?.destroy();
  }, []);

  return (
    <button type="button" onClick={() => tour.current?.start()}>
      Show me around
    </button>
  );
}
```

```vue
<script setup lang="ts">
import { onBeforeUnmount } from 'vue';
import { createTour } from 'build-reveal/tour';

const tour = createTour([
  { target: '#search', caption: 'Type the invoice you are looking for.', type: 'Invoice 2026' },
  { target: '#export', caption: 'Download it as a spreadsheet.', click: true }
]);

onBeforeUnmount(() => tour.destroy());
</script>

<template>
  <button type="button" @click="tour.start()">Show me around</button>
</template>
```

## Theming

Tours use the same [CSS custom properties](theming.md) as the reveal, plus two of their own. A tour is drawn above the whole page, so set them on `:root` or `body` rather than on a stage:

| Property | Default | What it changes |
| --- | --- | --- |
| `--build-reveal-text` | `#1f2937` | Text color of the panel. The panel's background is `--build-reveal-surface`. |
| `--build-reveal-tour-z-index` | `2147483000` | Stacking order of the tour above your page. |

```css
.dark {
  --build-reveal-color: #a78bfa;
  --build-reveal-surface: #111827;
  --build-reveal-text: #f9fafb;
}
```

## Accessibility

- The panel is a non-modal dialog. Focus moves to it when the tour starts and returns where it was when the tour ends.
- Each step is announced once, with its progress and caption. All controls work with the keyboard.
- The cursor and the frames are hidden from assistive technology.
- If the user prefers reduced motion, nothing moves: each step appears complete right away.
- A tour is content, not decoration, so `setBuildRevealEnabled(false)` doesn't turn tours off.

## Mobile

On screens narrower than 640 pixels, the panel spans the bottom of the screen. Targets are scrolled so they stay above it, and if one can't, the panel moves to the top. It also stays above the on-screen keyboard.

## Limits

- Clicks and typing are only acted out. The tour never changes your app's state.
- During very fast scrolling, the frame can trail its target by a frame.
- Your app's own modal dialogs can sit above the tour. Tours inside modal dialogs aren't supported yet.
- In fields with a floating label driven by `:placeholder-shown`, the typed text can overlap the label.
- Let a reveal animation finish before starting a tour: clicking the tour panel ends a running reveal.
