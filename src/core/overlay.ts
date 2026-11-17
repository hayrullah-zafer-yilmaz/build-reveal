import { cursorElement, element, selectionFrame, tint, translate, type BuildCursor } from './drawing';
import { overlayStyleSheet } from './styles';
import type { CaretState, CursorState, FrameState, RevealScene } from './timeline';

export type { BuildCursor } from './drawing';

export interface Overlay {
  render(scene: RevealScene | null): void;
  destroy(): void;
}

const HOST_STYLE: Partial<CSSStyleDeclaration> = {
  position: 'absolute',
  inset: '0',
  zIndex: '9000',
  pointerEvents: 'none'
};

function keyedPool<K, S>(layer: HTMLElement, create: (state: S) => HTMLElement) {
  const live = new Map<K, HTMLElement>();

  return {
    sync(states: readonly S[], keyOf: (state: S) => K, update: (el: HTMLElement, state: S) => void) {
      const seen = new Set<K>();

      for (const state of states) {
        const key = keyOf(state);
        let el = live.get(key);
        if (!el) {
          el = create(state);
          live.set(key, el);
          layer.append(el);
        }
        seen.add(key);
        update(el, state);
      }

      for (const [key, el] of live) {
        if (seen.has(key)) continue;
        el.remove();
        live.delete(key);
      }
    }
  };
}

export function createOverlay(stage: HTMLElement, cursors: readonly BuildCursor[]): Overlay {
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.setAttribute('data-build-overlay', '');
  Object.assign(host.style, HOST_STYLE);

  const shadow = host.attachShadow({ mode: 'open' });
  shadow.adoptedStyleSheets = [overlayStyleSheet()];
  const layer = shadow.appendChild(document.createElement('div'));
  stage.append(host);

  const tinted = <T extends HTMLElement>(el: T, cursor: number) => tint(el, cursors[cursor], cursor);

  const frames = keyedPool<number, FrameState>(layer, ({ cursor }) => {
    const frame = tinted(selectionFrame(), cursor);
    frame.append(element('span', 'size'));
    return frame;
  });

  const carets = keyedPool<number, CaretState>(layer, ({ cursor }) =>
    tinted(element('i', 'caret'), cursor)
  );

  const pointers = keyedPool<number, CursorState>(layer, ({ cursor }) =>
    tinted(cursorElement(cursors[cursor]?.label), cursor)
  );

  function render(scene: RevealScene | null) {
    frames.sync(
      scene?.frames ?? [],
      ({ id }) => id,
      (el, { box, opacity, size, measured, selected }) => {
        el.classList.toggle('measured', measured);
        el.classList.toggle('selected', selected);
        el.style.width = `${box.width}px`;
        el.style.height = `${box.height}px`;
        el.style.opacity = String(opacity);
        el.style.transform = translate(box);

        const label = el.lastElementChild!;
        if (label.textContent !== size) label.textContent = size;
      }
    );

    carets.sync(
      scene?.carets ?? [],
      ({ id }) => id,
      (el, { width, height, ...position }) => {
        el.style.width = `${width}px`;
        el.style.height = `${height}px`;
        el.style.transform = translate(position);
      }
    );

    pointers.sync(
      scene?.cursors ?? [],
      ({ cursor }) => cursor,
      (el, { opacity, ...position }) => {
        el.style.opacity = String(opacity);
        el.style.transform = translate(position);
      }
    );
  }

  return {
    render,
    destroy() {
      host.remove();
    }
  };
}
