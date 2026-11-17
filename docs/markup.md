# Marking content

## Stage and targets

The **stage** is the container you pass to `createBuildReveal()`, render with `<BuildReveal>` or write as `<build-reveal>`. The **targets** are the elements inside it that you mark. Only targets are hidden and animated; everything else stays as it is.

## Attributes

| Markup | Effect |
| --- | --- |
| `data-build` | A frame is drawn around the element, then it fades in. |
| `data-build="type"` | Same, and its text is typed in. |
| `class="build-reveal-target"` | Same as `data-build`. Handy when a component accepts a class but not data attributes. |
| `data-build-include` | On an element inside a target: makes the target's frame cover it too. |
| `data-build-skip` | On an element inside a typed target: its text isn't typed. |

The class name is also exported as `BUILD_TARGET_CLASS`.

## Order

Targets are revealed in reading order: top to bottom, and left to right within a row. Elements whose tops are within 16 pixels of each other count as one row. Several cursors work at once, so a target can start before the previous one is done. Use the `cursors` option to change how many.

## Nested targets

Targets can contain other targets. A child starts once its parent has begun to appear:

```html
<article data-build>
  <h2 data-build="type">Q3 report</h2>
  <p data-build="type">Revenue grew 12%.</p>
</article>
```

The card is framed first, then the heading and the paragraph are typed inside it.

## Typing

With `data-build="type"`, the target's text is typed letter by letter once its frame is drawn. Spaces aren't typed, and typing pauses briefly between words and after punctuation.

These parts aren't typed letter by letter, they appear as a whole:

- elements with `data-build-skip`
- `svg`, `style`, `script` and `[aria-hidden="true"]` elements
- icon fonts with the `material-icons` class or a `material-symbols` class

```html
<button data-build="type">
  <span class="icon" data-build-skip>★</span> Add to favorites
</button>
```

Text painted with a gradient (`background-clip: text`) is typed too.

Typing uses the [CSS Custom Highlight API](https://developer.mozilla.org/docs/Web/API/CSS_Custom_Highlight_API). In browsers without it, typed targets simply fade in.

## Frames that cover more

A frame covers the target's box. If part of the target sticks out, such as a badge positioned outside it, mark that part with `data-build-include` so the frame covers it too:

```html
<div class="avatar" data-build>
  <img src="ada.png" alt="Ada" />
  <span class="badge" data-build-include>3</span>
</div>
```

## Small and clipped elements

A target whose visible area is smaller than 8 × 8 pixels when its turn comes (because a scroll container clips it, for example) is shown right away, without a frame.

## Content that changes

- Targets added while the animation is waiting or playing are picked up automatically.
- To wait for content that is still loading, turn on `hold`. The animation stays open and new targets join it. Turn `hold` off when loading is done to let it finish.
- Targets added after the animation has finished are shown as they are.

## Nested stages

A stage inside another stage keeps its own targets. If it sits inside a target of the outer stage, it waits until that target starts to appear.

## What changes on the stage

While the reveal exists, the stage has a `data-build-stage` attribute and, if its `position` was `static`, `position: relative`. While the animation plays, an overlay that draws the cursors and frames (`<div data-build-overlay>`) is added as the stage's last child. The overlay is hidden from assistive technology and lets clicks through. `destroy()` undoes all of this.
