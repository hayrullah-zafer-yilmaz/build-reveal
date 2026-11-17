import { DRAWING_CSS, sheetOf } from '../core/drawingStyles';

const TOUR_CSS = `
:host {
  --text: var(--build-reveal-text, #1f2937);
  --muted: color-mix(in srgb, var(--text) 62%, transparent);
}

.drawing {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.drawing > * {
  visibility: hidden;
}
.cursor {
  transform-origin: 0 0;
}

.ghost {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  overflow: hidden;
  white-space: pre;
}
.ghost.multiline {
  display: block;
  white-space: pre-wrap;
  overflow-wrap: break-word;
}
.ghost-caret {
  display: inline-block;
  flex: none;
  width: 2px;
  height: 1.15em;
  margin-inline-start: 1px;
  border-radius: 1px;
  background: var(--tint);
  vertical-align: text-bottom;
}
.ghost-caret.blink {
  animation: build-reveal-blink 1.06s steps(1, end) infinite;
}
@keyframes build-reveal-blink {
  50% {
    opacity: 0;
  }
}

.ripple {
  position: absolute;
  top: 0;
  left: 0;
  box-sizing: border-box;
  border: 2px solid var(--tint);
  border-radius: 50%;
}

.panel {
  position: absolute;
  top: 0;
  left: 0;
  box-sizing: border-box;
  width: max-content;
  max-width: min(22rem, calc(100% - 24px));
  padding: 0.875rem 1rem 0.75rem;
  border-radius: 0.75rem;
  background: var(--surface);
  color: var(--text);
  box-shadow: 0 0.75rem 2rem rgb(16 24 40 / 0.18), 0 0 0 1px rgb(16 24 40 / 0.06);
  font: 400 0.875rem/1.45 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  letter-spacing: normal;
  word-spacing: normal;
  text-transform: none;
  text-align: start;
  pointer-events: none;
  opacity: 0;
  outline: none;
  transition: opacity 0.18s;
}
.panel.shown {
  opacity: 1;
  pointer-events: auto;
}
.panel.closed {
  opacity: 0;
  pointer-events: none;
  transition: none;
}
.panel.docked {
  width: calc(100% - 24px);
  max-width: none;
}
.panel:focus-visible {
  box-shadow: 0 0.75rem 2rem rgb(16 24 40 / 0.18), 0 0 0 2px var(--accent);
}

.caption {
  margin: 0 1.75rem 0.625rem 0;
}
.typed {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  margin: 0 0 0.625rem;
  padding: 0.125rem 0.5rem;
  border-radius: 0.375rem;
  background: color-mix(in srgb, var(--accent) 9%, transparent);
  font: 600 0.8125rem/1.6 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.typed[hidden] {
  display: none;
}

.bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.progress {
  margin-inline-end: auto;
  color: var(--muted);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
}

button {
  margin: 0;
  border: 1px solid transparent;
  border-radius: 0.5rem;
  padding: 0.375rem 0.75rem;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.2;
  cursor: pointer;
}
button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.back {
  background: transparent;
  color: var(--text);
  border-color: color-mix(in srgb, var(--text) 18%, transparent);
}
.back[aria-disabled='true'] {
  opacity: 0.4;
  cursor: default;
}
.next {
  background: var(--accent);
  color: #fff;
}
.close {
  position: absolute;
  top: 0.5rem;
  inset-inline-end: 0.5rem;
  width: 1.625rem;
  height: 1.625rem;
  padding: 0;
  border-radius: 0.375rem;
  background: transparent;
  color: var(--muted);
  font-size: 1.125rem;
  line-height: 1;
}
.close:hover {
  background: color-mix(in srgb, var(--text) 8%, transparent);
}

.status {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .panel {
    transition: none;
  }
  .ghost-caret.blink {
    animation: none;
  }
}

@media (forced-colors: active) {
  .panel {
    border: 1px solid CanvasText;
  }
  .next {
    border-color: ButtonText;
  }
}
`;

let tourSheet: CSSStyleSheet | null = null;

export function tourStyleSheet() {
  tourSheet ??= sheetOf(DRAWING_CSS + TOUR_CSS);
  return tourSheet;
}
