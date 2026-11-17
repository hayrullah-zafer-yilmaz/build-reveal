# FAQ & troubleshooting

## The animation doesn't start

Check these in order:

1. **Reduced motion.** With reduced motion turned on in the system, the animation is skipped on purpose. To test it in Chrome, open DevTools › More tools › Rendering › *Emulate CSS media feature prefers-reduced-motion*.
2. **Turned off.** Is `disabled` set, or was `setBuildRevealEnabled(false)` called?
3. **Manual trigger.** With `trigger: 'manual'`, the animation waits for `play()`.
4. **Visibility.** It starts when at least 30% of the stage is visible, or when the visible part fills half the screen.
5. **Something on top.** If the middle of the stage is covered (by a modal or a cookie banner, for example), it waits up to 4 seconds and then starts anyway.
6. **No targets.** Only elements with `data-build` (or the `build-reveal-target` class) inside the stage are animated.

`reveal.phase` (or `element.phase`) tells you where it is: `'idle'` means the animation was skipped, `'pending'` that it's waiting to start.

## My content stays hidden

With `trigger: 'manual'`, targets stay hidden until you call `play()` or `finish()`.

## The content shows for a moment before the animation starts

The page was painted before the reveal was created:

- **Static HTML**: load the script in `<head>`, without `defer` or `async`, and use the `<build-reveal>` element. Targets are then hidden before the first paint.
- **Server-side rendering** (Next.js, Nuxt, SvelteKit, Angular, Astro): the server HTML is visible until the page hydrates. Content further down is hidden before anyone scrolls to it, so this only matters at the very top of the page. If it matters there, render that part only in the browser: `next/dynamic` with `ssr: false` in Next.js, `<ClientOnly>` in Nuxt.

## The text fades in instead of being typed

Typing uses the [CSS Custom Highlight API](https://developer.mozilla.org/docs/Web/API/CSS_Custom_Highlight_API) (Chrome and Edge 105+, Safari 17.2+, Firefox 140+). Older browsers fade the text in instead.

## Some elements appear without a frame

Targets whose visible area is smaller than 8 × 8 pixels, for example because a scroll container clips them, are shown right away.

## How long does the animation take?

It depends on how many targets there are and how many cursors share them. A cursor spends about a second on each target, more on long typed text. Use more `cursors` or a higher `speed` to make it shorter.

## Can I replay it?

Yes, call `play()` once it's done: through the `ref` in React and Vue, or `element.play()` on `<build-reveal>`.

## Does it work with content that loads later?

Yes. Targets added while the animation is waiting or playing join it. Turn on `hold` to keep it open until loading is done.

## My `:last-child` styles change during the animation

While the animation plays, its overlay is the stage's last child. For the stage's direct children, use `:last-of-type` or `:nth-last-child(1 of :not([data-build-overlay]))` instead.

## Does it affect SEO?

No. The content is in the HTML the whole time; the animation only changes how it's painted.

## Does it work with a strict Content Security Policy?

Yes. build-reveal doesn't add `<style>` or `<script>` elements, inline event handlers or HTML strings to your page. Its styles are added as constructable stylesheets, and all text is set as plain text. It works with `script-src 'self'`, `style-src 'self'` and Trusted Types (`require-trusted-types-for 'script'`), without `'unsafe-inline'` or a nonce.

Because text is never parsed as HTML, tour captions that come from user content can't run script: markup in them shows up as text.

## How do I use it in tests?

- **Unit tests in jsdom** (Jest, Vitest): jsdom has no `IntersectionObserver`, so the animation is skipped and everything is visible. If your setup mocks `IntersectionObserver`, call `setBuildRevealEnabled(false)` in it.
- **End-to-end tests**: turn the animation off so tests don't wait for it. Playwright and Selenium set `navigator.webdriver`, and Cypress adds `window.Cypress`:

  ```js
  import { setBuildRevealEnabled } from 'build-reveal';

  if (navigator.webdriver || 'Cypress' in window) setBuildRevealEnabled(false);
  ```

## `npm link` breaks with "Invalid hook call"

Linking can load two copies of React. To try a local build in another project, pack it instead:

```bash
npm run build
npm pack --pack-destination ~/Desktop
cd ../your-app
npm install ~/Desktop/build-reveal-0.1.0.tgz
```

## Which browsers are supported?

Current Chrome, Edge, Firefox and Safari. The minimum versions are Chrome and Edge 93, Firefox 101 and Safari 16.4.
