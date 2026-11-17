# Getting started

## 1. Install

With a package manager:

```bash
npm install build-reveal
# or: pnpm add build-reveal · yarn add build-reveal · bun add build-reveal
```

Without a build step, load the script from a CDN. Pin the version so that a new release never surprises you:

```html
<script src="https://unpkg.com/build-reveal@0.1"></script>
<!-- or -->
<script src="https://cdn.jsdelivr.net/npm/build-reveal@0.1"></script>
```

The script registers the `<build-reveal>` element and puts everything else on `window.BuildReveal`. You can also copy `node_modules/build-reveal/dist/build-reveal.global.js` into your project and serve it yourself.

## 2. Mark your content

The animation works inside a container called the **stage**. Inside it, you mark the elements that should appear, the **targets**:

```html
<section id="dashboard">
  <h1 data-build="type">Revenue</h1>
  <p data-build>Up 12% this month.</p>
  <img data-build src="chart.png" alt="Revenue chart" />
  <footer>Not marked, so always visible.</footer>
</section>
```

- `data-build`: a cursor draws a frame around the element, then the element fades in.
- `data-build="type"`: the same, and then its text is typed letter by letter.

Elements without a mark are left alone. [Marking content](markup.md) covers nesting, icons, content that changes and more.

## 3. Start it

Turn the container into a stage:

| Setup | How |
| --- | --- |
| HTML, CDN | Use `<build-reveal>` as the container. |
| JavaScript | `createBuildReveal(document.querySelector('#dashboard'))` |
| React | `<BuildReveal>…</BuildReveal>` from `build-reveal/react` |
| Vue | `<BuildReveal>…</BuildReveal>` from `build-reveal/vue` |
| Angular, Svelte, others | The `<build-reveal>` element, see the [framework guides](README.md) |

A complete HTML page:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <script src="https://unpkg.com/build-reveal@0.1"></script>
  </head>
  <body>
    <build-reveal>
      <h1 data-build="type">Hello</h1>
      <p data-build>This paragraph fades in.</p>
    </build-reveal>
  </body>
</html>
```

Loading the script in `<head>`, without `defer` or `async`, hides the targets before the page is first painted, so they never flash before the animation.

## 4. What happens

1. **Right away**, the targets are hidden. They keep their place in the layout, so nothing moves.
2. **When the stage is in view** (at least 30% of it, or it fills half the screen) and nothing covers it, the animation starts. If something like a cookie banner covers it, it waits up to 4 seconds.
3. **The cursors** fly in and work through the targets in reading order, top to bottom and left to right, several at a time. Each one drags a selection frame around a target, the target fades in, and typed targets get their text typed.
4. **When every target is visible**, the cursors leave and `onComplete` is called.

The animation **ends early** and shows everything as soon as the user clicks, taps, presses a key, moves focus into the stage or scrolls the stage out of view. If the user prefers reduced motion, nothing is hidden or animated at all.

## 5. Control it

`createBuildReveal()` and every framework integration give you a few controls:

```js
const reveal = createBuildReveal(stage, { trigger: 'manual' });

reveal.play();               // start now, or replay
reveal.finish();             // end now and show everything
reveal.update({ speed: 2 }); // change options
reveal.destroy();            // show everything and clean up
```

## Next steps

- The guide for your framework: [JavaScript](frameworks/vanilla.md) · [Web Component](frameworks/web-component.md) · [React](frameworks/react.md) · [Vue](frameworks/vue.md) · [Angular](frameworks/angular.md) · [Svelte](frameworks/svelte.md)
- Every option: [API reference](api.md)
- Colors and cursor names: [Theming](theming.md)
