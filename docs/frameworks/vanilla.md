# JavaScript

Works with any bundler (Vite, webpack, esbuild, Parcel…) and with the [script tag](../getting-started.md#1-install).

## Basic use

```js
import { createBuildReveal } from 'build-reveal';

const reveal = createBuildReveal(document.querySelector('#dashboard'), {
  cursors: [{ label: 'Ada' }, { label: 'Linus' }],
  onComplete: () => console.log('revealed')
});
```

With the script tag, the same functions are on `window.BuildReveal`:

```html
<script src="https://unpkg.com/build-reveal@0.1"></script>

<section id="dashboard">…</section>

<script>
  BuildReveal.createBuildReveal(document.querySelector('#dashboard'));
</script>
```

Create the reveal once the content is in the page. The targets are hidden right away and revealed when the stage scrolls into view.

> **Tip:** for static HTML, the [`<build-reveal>` element](web-component.md) with the script in `<head>` hides the targets before the page is first painted. A reveal created by a script at the end of the page can let the content show for a moment on slow connections.

## Controls

```js
reveal.play();               // start now (without waiting for visibility), or replay
reveal.finish();             // end now and show everything
reveal.update({ speed: 2 }); // change options; the others keep their value
reveal.destroy();            // show everything, remove listeners, restore the stage
reveal.phase;                // 'idle' | 'pending' | 'playing' | 'done'
```

`play()` returns a promise that resolves once the animation has started. It waits for web fonts first, so the typing matches the final text.

### Replay button

```js
document.querySelector('#replay').addEventListener('click', () => reveal.play());
```

### Start it yourself

```js
const reveal = createBuildReveal(stage, { trigger: 'manual' });

// Later, for example when a tab opens:
reveal.play();
```

With `trigger: 'manual'`, the targets stay hidden until you call `play()` or `finish()`.

## Content that loads later

Use `hold` to keep the animation open while content arrives:

```js
const reveal = createBuildReveal(stage, { hold: true });

const items = await loadItems();
stage.append(...items.map(renderItem)); // elements with data-build join the animation
reveal.update({ hold: false });         // now let it finish
```

## Long pages

`progressive: true` reveals each target as it scrolls into view, instead of all visible targets at once:

```js
createBuildReveal(document.querySelector('main'), { progressive: true });
```

## Single-page apps

Call `destroy()` when the stage is removed or the user leaves the page, so the reveal stops listening for events:

```js
const reveal = createBuildReveal(stage);

// When this view goes away:
reveal.destroy();
```

## Turning animations off

```js
import { setBuildRevealEnabled } from 'build-reveal';

setBuildRevealEnabled(false); // finishes running animations and skips new ones
```

Use it for a "reduce animations" setting in your app, or in end-to-end tests.
