# Changelog

## 0.1.0 (2026-11-17)

First release.

- Reveal animation: virtual cursors frame each target, fade it in and type its text.
- Plain JavaScript API (`createBuildReveal`), a `<build-reveal>` custom element, a React component and hook, a Vue component and directive, and a script tag build.
- Plays when the stage is in view, waits while it is covered, and ends as soon as the user interacts.
- Respects `prefers-reduced-motion`, and can be switched off page-wide with `setBuildRevealEnabled`.
