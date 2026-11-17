# Accessibility

build-reveal is decoration, so it's designed never to get in the user's way.

## Reduced motion

If the user has turned on reduced motion in their system settings (`prefers-reduced-motion: reduce`), the animation is skipped: nothing is hidden and nothing moves. If the setting is turned on during an animation, the animation ends at once.

## The user is in control

The animation ends and shows everything as soon as the user clicks, taps, presses a key, moves focus into the stage or scrolls the stage out of view. Keyboard users never tab onto hidden content: pressing Tab ends a running animation, and focus moving into a waiting stage reveals it.

Targets don't respond to clicks while they're hidden.

## Screen readers

The content is in the page the whole time. Hidden targets are only transparent, and typing is a visual effect, so screen readers can read everything right away. The overlay with the cursors and frames is hidden from assistive technology (`aria-hidden="true"`).

## A setting for your users

To offer a "reduce animations" option in your app, use the page-wide switch:

```js
import { setBuildRevealEnabled } from 'build-reveal';

setBuildRevealEnabled(settings.animations);
```

Turning it off ends running animations and skips new ones.

## Content is never left hidden

Whatever happens (the user interacts, the stage leaves the screen, the reveal is destroyed), every target ends up visible. The one exception is up to you: with `trigger: 'manual'`, targets stay hidden until you call `play()` or `finish()`, so make sure you call one of them.
