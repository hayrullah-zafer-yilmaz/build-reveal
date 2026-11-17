# API reference

## Entry points

| Import | Contents |
| --- | --- |
| `build-reveal` | `createBuildReveal`, `complementaryCursors`, `setBuildRevealEnabled`, `isBuildRevealEnabled`, `BUILD_TARGET_CLASS` and the types |
| `build-reveal/element` | `defineBuildRevealElement`, `BUILD_REVEAL_COMPLETE_EVENT` and the `BuildRevealElement` type |
| `build-reveal/react` | `BuildReveal`, `useBuildReveal`, their types, and everything from `build-reveal` |
| `build-reveal/vue` | `BuildReveal`, `vBuildReveal`, and everything from `build-reveal` |
| `build-reveal/tour` | `createTour` and its types |
| `<script src="https://unpkg.com/build-reveal@0.2">` | Registers `<build-reveal>` and puts everything else, `createTour` included, on `window.BuildReveal` |

The package ships ES modules and CommonJS with TypeScript types. A framework entry never loads the other frameworks, and the reveal and the tour don't load each other.

## createBuildReveal(stage, options?)

```ts
function createBuildReveal(stage: HTMLElement, options?: BuildRevealOptions): BuildReveal;
```

Turns `stage` into a stage: its targets are hidden right away and revealed when the animation plays. If the animation can't run (see [phases](#phases)), nothing is hidden.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `cursors` | `number \| BuildCursor[]` | `3` | How many cursors work in parallel, or one [`BuildCursor`](#buildcursor) per cursor. |
| `speed` | `number` | `1` | Speed multiplier: `2` is twice as fast. The minimum is `0.1`. |
| `trigger` | `'visible' \| 'manual'` | `'visible'` | `'visible'` plays when the stage is well in view. `'manual'` waits for `play()`, and targets stay hidden until then. |
| `progressive` | `boolean` | `false` | Reveal each target when it scrolls into view, instead of all visible targets at once. |
| `hold` | `boolean` | `false` | Keep the animation open: targets added meanwhile join it. Set it back to `false` to let it finish. |
| `disabled` | `boolean` | `false` | Skip the animation. Turning it on during the animation finishes it. |
| `onComplete` | `() => void` | | Called each time the animation finishes or is cut short. Not called when it is skipped or destroyed. |

*Well in view* means that at least 30% of the stage is visible, or that its visible part fills half the screen's height.

## BuildReveal

The object returned by `createBuildReveal()`.

| Member | Description |
| --- | --- |
| `phase` | The current [phase](#phases). |
| `play()` | Starts the animation now, without waiting for visibility, or replays it once it is done. Returns a promise that resolves when it has started. Does nothing while playing or if the animation can't run. |
| `finish()` | Ends a waiting or running animation, shows everything and calls `onComplete`. |
| `update(options)` | Changes options. Options you leave out keep their value. `speed`, `trigger`, `hold` and `disabled` apply immediately; `cursors` and `progressive` from the next play. |
| `destroy()` | Shows everything, removes all listeners and restores the stage. Doesn't call `onComplete`. |

### Phases

| Phase | Meaning |
| --- | --- |
| `'idle'` | The animation was skipped when the reveal was created: `disabled` is set, the user prefers reduced motion, the global switch is off, or there is no `IntersectionObserver` (as in jsdom). Nothing is hidden. `play()` starts it if it can run by then. |
| `'pending'` | Targets are hidden and the animation is waiting to start. |
| `'playing'` | Cursors are revealing the targets. |
| `'done'` | Everything is visible. `play()` replays the animation. |

### When it ends early

While playing, the animation ends and everything is shown when the user:

- clicks anywhere, taps, or presses a key (a touch that turns into a scroll doesn't count);
- moves focus into the stage;
- scrolls inside the stage (except with `progressive`);
- scrolls the stage completely out of view.

While waiting, a click, tap or key press inside the stage, or focus moving into it, shows everything. In both phases it also ends when the user turns on reduced motion, the global switch is turned off or `disabled` is set.

## BuildCursor

| Field | Type | Description |
| --- | --- | --- |
| `label` | `string` | Name shown next to the pointer. |
| `color` | `string` | Any CSS color. Takes precedence over `hue`. |
| `hue` | `number` | Hue shift in degrees from the accent color. |

Without a `color` or `hue`, cursors are shifted 0°, 60°, −60°, 120°, −120° and 180° from the accent color, in that order. See [Theming](theming.md).

## complementaryCursors(count)

Returns `count` cursors in hues opposite the accent color, 15° apart:

```js
import { complementaryCursors, createBuildReveal } from 'build-reveal';

createBuildReveal(stage, { cursors: complementaryCursors(3) });
```

## setBuildRevealEnabled(value) and isBuildRevealEnabled()

A switch for the whole page. Turning it off finishes running animations and skips new ones. Turning it back on applies to reveals created afterwards and to `play()` calls.

```js
import { setBuildRevealEnabled } from 'build-reveal';

setBuildRevealEnabled(userSettings.animations);
```

## BUILD_TARGET_CLASS

`'build-reveal-target'`, the class name that marks a target like `data-build` does.

## Web Component

`defineBuildRevealElement(tagName = 'build-reveal')` registers the element. The [Web Component guide](frameworks/web-component.md) lists its attributes, properties, methods and the `complete` event (`BUILD_REVEAL_COMPLETE_EVENT`).

## React

| Export | Description |
| --- | --- |
| `<BuildReveal>` | Renders the stage. Props: every option, `as` (default `'div'`), `children`, and any HTML attribute. `ref` receives a `BuildRevealHandle`. |
| `useBuildReveal(ref, options?)` | Makes an element you render the stage. Returns a `BuildRevealHandle`. |
| `BuildRevealHandle` | `{ play(): Promise<void>; finish(): void }` |
| `BuildRevealProps` | The props of `<BuildReveal>`. |

See the [React guide](frameworks/react.md).

## Vue

| Export | Description |
| --- | --- |
| `<BuildReveal>` | Renders the stage. Props: every option except `onComplete`, plus `tag` (default `'div'`). Emits `complete`. Exposes `play()` and `finish()` to template refs. |
| `vBuildReveal` | Directive that makes its element the stage: `v-build-reveal="options"`. |

See the [Vue guide](frameworks/vue.md).

## Tour

```ts
function createTour(steps: TourStep[], options?: TourOptions): Tour;
```

`createTour` doesn't touch the page until `start()` is called.

| `TourStep` field | Type | Description |
| --- | --- | --- |
| `target` | `string \| Element \| () => Element \| null` | A CSS selector, an element, or a function that returns one. An invalid selector throws when the tour is created. |
| `caption` | `string` | Text of the step. |
| `click` | `boolean` | Act out a click. Nothing is clicked. |
| `type` | `string` | Act out typing this text, in the field or in the panel. The field's value never changes. |

| `TourOptions` field | Default | Description |
| --- | --- | --- |
| `autoplay` | `false` | Advance after a reading delay. Waits while the pointer is over the panel; turns off after Back. |
| `speed` | `1` | Playback speed multiplier. |
| `cursor` | | A [`BuildCursor`](#buildcursor): `label`, `color`, `hue`. |
| `labels` | English | `next`, `back`, `done`, `close`, `tour` (the panel's accessible name) and `progress(step, total)`. |
| `onStep(index)` | | Called when a step is shown, before its target is looked for. |
| `onEnd(completed)` | | Called when the tour ends: `true` after the last step, `false` when closed early. Not called by `destroy()`. |

| `Tour` member | Description |
| --- | --- |
| `start(index?)` | Starts at the first step, or at `index`. While running, it moves to `index`. Ends any other running tour. |
| `next()` | Next step, or ends the tour on the last one. |
| `back()` | Previous step. |
| `goTo(index)` | Moves to a step. |
| `stop()` | Ends the tour and calls `onEnd(false)`. |
| `destroy()` | Removes the tour from the page right away, without calling `onEnd`. |
| `step` | Index of the current step, or `-1` when the tour isn't running. |
| `active` | Whether the tour is running. |

A target that isn't on the page is waited for up to 3 seconds, then the step is skipped. See the [Guided tours guide](tour.md).

## Types

`BuildRevealOptions`, `BuildReveal`, `BuildRevealPhase`, `BuildRevealTrigger`, `BuildCursor`, `BuildRevealElement`, `BuildRevealHandle`, `BuildRevealProps`, `Tour`, `TourStep`, `TourOptions`, `TourLabels` and `TourTarget`.
