# Web Component

`<build-reveal>` is a standard custom element. It works in plain HTML and in anything that renders HTML: Angular, Svelte, Lit, Solid, Astro, Alpine, server templates and so on.

## Register it

With the script tag, it registers itself:

```html
<script src="https://unpkg.com/build-reveal@0.2"></script>
```

With a bundler, register it once when your app starts, before the element is rendered:

```js
import { defineBuildRevealElement } from 'build-reveal/element';

defineBuildRevealElement();
```

Calling it again does nothing, and it's safe to call during server-side rendering. If the tag name is already taken, choose another one: `defineBuildRevealElement('my-reveal')`.

## Use it

```html
<build-reveal cursors="2" speed="1.2">
  <h1 data-build="type">Hello</h1>
  <p data-build>Built in front of your eyes.</p>
</build-reveal>
```

The element itself is the stage. With the default tag name it displays as a block.

## Options

Every option is both an attribute and a property:

| Attribute | Property | Value |
| --- | --- | --- |
| `cursors="2"` | `el.cursors = 2` | Number of cursors. A list, like `[{ label: 'Ada' }]`, only works as a property. |
| `speed="1.5"` | `el.speed = 1.5` | Playback speed. |
| `trigger="manual"` | `el.trigger = 'manual'` | `visible` (default) or `manual`. |
| `progressive` | `el.progressive = true` | Reveal targets as they scroll into view. |
| `hold` | `el.hold = true` | Keep the animation open while content loads. |
| `disabled` | `el.disabled = true` | Skip the animation. |

Changes are applied as they happen, as with [`update()`](../api.md#buildreveal).

## Methods, state and events

```js
const el = document.querySelector('build-reveal');

el.play();   // start now, or replay
el.finish(); // end now and show everything
el.phase;    // 'idle' | 'pending' | 'playing' | 'done'

el.addEventListener('complete', () => console.log('revealed'));
```

The `complete` event doesn't bubble, so listen on the element itself. Its name is also exported as `BUILD_REVEAL_COMPLETE_EVENT`.

## Lifecycle

The reveal is created when the element is added to the page and destroyed when it's removed. Moving the element to another place counts as removing and adding it again, so the animation runs again.

## In other frameworks

- **Angular**: see the [Angular guide](angular.md).
- **Svelte**: see the [Svelte guide](svelte.md).
- **Lit**:

  ```js
  html`<build-reveal .cursors=${this.cursors} speed="1.2" @complete=${this.onDone}>…</build-reveal>`;
  ```

- **Astro**: write the element in your markup and register it in a script:

  ```astro
  <build-reveal>
    <h1 data-build="type">Hello</h1>
  </build-reveal>

  <script>
    import { defineBuildRevealElement } from 'build-reveal/element';
    defineBuildRevealElement();
  </script>
  ```

- **React and Vue**: use the [React](react.md) and [Vue](vue.md) components instead. They take care of refs and options for you.

## TypeScript

Importing `build-reveal/element` adds the element to `HTMLElementTagNameMap`, so `document.querySelector('build-reveal')` is typed as `BuildRevealElement`, with its options, methods and `phase`.
