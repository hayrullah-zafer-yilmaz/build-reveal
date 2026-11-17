# Changelog

## 0.2.1 (2026-11-17)

- The README and the guided tours guide show a tour in action.

## 0.2.0 (2026-11-17)

- Guided tours (`build-reveal/tour`): a virtual cursor walks users through the real page, frames each element, explains it in a caption and acts out clicks and typing without touching the app. Works with the keyboard and screen readers, respects reduced motion, and docks to the bottom on small screens.
- The script tag build includes tours as `BuildReveal.createTour`.

## 0.1.1 (2026-11-17)

- The npm package page shows the English README. The Turkish README moved to `docs/README.tr.md`.

## 0.1.0 (2026-11-17)

First release.

- Reveal animation: virtual cursors frame each target, fade it in and type its text.
- Plain JavaScript API (`createBuildReveal`), a `<build-reveal>` custom element, a React component and hook, a Vue component and directive, and a script tag build.
- Plays when the stage is in view, waits while it is covered, and ends as soon as the user interacts.
- Respects `prefers-reduced-motion`, and can be switched off page-wide with `setBuildRevealEnabled`.
