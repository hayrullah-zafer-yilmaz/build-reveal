import { DRAWING_CSS, sheetOf } from './drawingStyles';

const STAGE_CSS = `
build-reveal {
  display: block;
}
[data-build-stage][data-build-playing] {
  isolation: isolate;
}
[data-build-stage] [data-build-state='revealing'] {
  transition:
    opacity var(--build-reveal-duration) var(--build-reveal-ease, cubic-bezier(0.22, 1, 0.36, 1)),
    filter var(--build-reveal-duration) var(--build-reveal-ease, cubic-bezier(0.22, 1, 0.36, 1));
}
[data-build-stage] [data-build-state='pending'] {
  opacity: 0 !important;
  filter: blur(var(--build-reveal-blur, 6px));
  pointer-events: none;
}
[data-build-stage] [data-build-masked] {
  mask-image: linear-gradient(
    90deg,
    #000 var(--build-reveal-typed, 0px),
    transparent var(--build-reveal-typed, 0px)
  );
}
::highlight(build-reveal-untyped) {
  color: transparent;
  text-decoration-color: transparent;
  text-shadow: none;
}
`;

const SIZE_BADGE_CSS = `
.size {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 50%;
  padding: 0.0625rem 0.375rem;
  border-radius: 0.25rem;
  background: var(--tint);
  color: #fff;
  font-size: 0.625rem;
  font-weight: 600;
  line-height: 1.5;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  opacity: 0;
  transform: translateX(-50%);
  transition: opacity 0.16s;
}
.frame.measured .size {
  opacity: 1;
}
`;

let stageSheet: CSSStyleSheet | null = null;
let overlaySheet: CSSStyleSheet | null = null;

export function adoptStageStyles(scope: Document | ShadowRoot) {
  stageSheet ??= sheetOf(STAGE_CSS);
  if (!scope.adoptedStyleSheets.includes(stageSheet)) {
    scope.adoptedStyleSheets = [...scope.adoptedStyleSheets, stageSheet];
  }
}

export function overlayStyleSheet() {
  overlaySheet ??= sheetOf(DRAWING_CSS + SIZE_BADGE_CSS);
  return overlaySheet;
}
