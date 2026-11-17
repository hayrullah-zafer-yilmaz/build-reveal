export const DRAWING_CSS = `
:host {
  --accent: var(--build-reveal-color, #4f46e5);
  --surface: var(--build-reveal-surface, #fff);
  --frame-border: var(--build-reveal-frame-border, 1.5px);
}

.tinted {
  --tint: var(--build-reveal-cursor-color, var(--accent));
}
@supports (color: oklch(from red l c h)) {
  .tinted {
    --tint: var(
      --build-reveal-cursor-color,
      oklch(from var(--accent) l c calc(h + var(--build-reveal-cursor-hue, 0)))
    );
  }
}

.frame,
.caret,
.cursor {
  position: absolute;
  top: 0;
  left: 0;
  will-change: transform;
}

.frame {
  box-sizing: border-box;
  border: var(--frame-border) solid var(--tint);
  border-radius: 2px;
  background: color-mix(in srgb, var(--tint) 7%, transparent);
  transition: background-color 0.3s;
}
.frame.selected {
  background-color: transparent;
}

.handle {
  --near: calc(var(--frame-border) / -2);
  --far: calc(100% + var(--frame-border) / 2);

  position: absolute;
  box-sizing: border-box;
  width: 7px;
  height: 7px;
  border: 1.5px solid var(--tint);
  border-radius: 1.5px;
  background: var(--surface);
  transform: translate(-50%, -50%) scale(0);
  transition: transform 0.24s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.frame.selected .handle {
  transform: translate(-50%, -50%) scale(1);
}
.handle.nw {
  top: var(--near);
  left: var(--near);
}
.handle.ne {
  top: var(--near);
  left: var(--far);
}
.handle.sw {
  top: var(--far);
  left: var(--near);
}
.handle.se {
  top: var(--far);
  left: var(--far);
}

.caret {
  border-radius: 1px;
  background: var(--tint);
}

.pointer {
  display: block;
  width: 20px;
  height: 20px;
  overflow: visible;
  fill: var(--tint);
  stroke: #fff;
  stroke-width: 1.5;
  stroke-linejoin: round;
  filter: drop-shadow(0 1px 1.5px rgb(16 24 40 / 0.35));
  translate: -3.2px -2.6px;
}

.label {
  position: absolute;
  top: 15px;
  left: 12px;
  padding: 0.125rem 0.4375rem;
  border-radius: 0.125rem 0.375rem 0.375rem;
  background: var(--tint);
  color: #fff;
  font-size: 0.6875rem;
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
}
`;

export function sheetOf(css: string) {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(css);
  return sheet;
}
