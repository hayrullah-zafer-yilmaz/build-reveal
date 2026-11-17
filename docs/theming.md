# Theming

The cursors, frames and labels are drawn in an overlay with its own styles, so your page's CSS doesn't change them. You style them with a few CSS custom properties and the `cursors` option.

## CSS custom properties

Set them on the stage or on any ancestor, such as `:root`:

| Property | Default | What it changes |
| --- | --- | --- |
| `--build-reveal-color` | `#4f46e5` | The accent color of frames, cursors and labels. |
| `--build-reveal-surface` | `#fff` | The fill of the frames' corner handles. Match your background. |
| `--build-reveal-frame-border` | `1.5px` | The width of the frame border. |
| `--build-reveal-blur` | `6px` | How blurred targets are before they fade in. |
| `--build-reveal-ease` | `cubic-bezier(0.22, 1, 0.36, 1)` | The easing of the fade-in. |

```css
:root {
  --build-reveal-color: #0f766e;
}

.dark {
  --build-reveal-color: #a78bfa;
  --build-reveal-surface: #0b1020;
}
```

## Cursor colors and labels

By default each cursor gets its own color by shifting the accent color's hue: 0°, 60°, −60°, 120°, −120° and 180°. Use the `cursors` option to give cursors a label, a fixed color or your own hue shift:

```js
createBuildReveal(stage, {
  cursors: [
    { label: 'Ada', color: '#0ea5e9' },
    { label: 'Linus', hue: 150 },
    { label: 'Grace' }
  ]
});
```

`complementaryCursors(count)` returns cursors in hues opposite the accent color. They stand out on a page that already uses your brand color everywhere:

```js
import { complementaryCursors, createBuildReveal } from 'build-reveal';

createBuildReveal(stage, { cursors: complementaryCursors(2) });
```

Labels and the size badge use white text, so pick colors that keep white text readable.

Hue shifts use [relative color syntax](https://developer.mozilla.org/docs/Web/CSS/CSS_colors/Relative_colors). Browsers without it use the accent color for every cursor; fixed `color`s work everywhere.

## Speed

`speed` scales the whole animation, including the fade-in: `speed: 2` is twice as fast and `speed: 0.5` half as fast.

## Guided tours

A tour is drawn above the whole page rather than inside a stage, so set its properties on `:root` or `body`. Besides the ones above, tours use `--build-reveal-text` for the panel's text color and `--build-reveal-tour-z-index` for their stacking order. See [Guided tours](tour.md#theming).
