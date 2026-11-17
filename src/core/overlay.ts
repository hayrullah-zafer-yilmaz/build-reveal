import type { CaretState, CursorState, FrameState, Point, RevealScene } from './timeline';
import { overlayStyleSheet } from './styles';

export interface BuildCursor {
  label?: string;
  color?: string;
  hue?: number;
}

export interface Overlay {
  render(scene: RevealScene | null): void;
  destroy(): void;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const POINTER_PATH = 'M3.2 2.6 17.1 9.3 10.9 11.2 8.9 17.3Z';
const CORNERS = ['nw', 'ne', 'sw', 'se'] as const;
const HUE_SHIFTS = [0, 60, -60, 120, -120, 180];

const HOST_STYLE: Partial<CSSStyleDeclaration> = {
  position: 'absolute',
  inset: '0',
  zIndex: '9000',
  pointerEvents: 'none'
};

const translate = ({ x, y }: Point) => `translate3d(${x}px, ${y}px, 0)`;

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string) {
  const el = document.createElement(tag);
  el.className = className;
  return el;
}

function pointerIcon() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'pointer');
  svg.setAttribute('viewBox', '0 0 20 20');

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', POINTER_PATH);
  svg.append(path);
  return svg;
}

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

  function tinted(el: HTMLElement, cursor: number) {
    el.classList.add('tinted');
    const { color, hue } = cursors[cursor] ?? {};
    if (color) el.style.setProperty('--build-reveal-cursor-color', color);
    else el.style.setProperty('--build-reveal-cursor-hue', String(hue ?? HUE_SHIFTS[cursor % HUE_SHIFTS.length]));
    return el;
  }

  const frames = keyedPool<number, FrameState>(layer, ({ cursor }) => {
    const frame = tinted(element('div', 'frame'), cursor);
    frame.append(...CORNERS.map((corner) => element('i', `handle ${corner}`)), element('span', 'size'));
    return frame;
  });

  const carets = keyedPool<number, CaretState>(layer, ({ cursor }) =>
    tinted(element('i', 'caret'), cursor)
  );

  const pointers = keyedPool<number, CursorState>(layer, ({ cursor }) => {
    const pointer = tinted(element('div', 'cursor'), cursor);
    pointer.append(pointerIcon());

    const label = cursors[cursor]?.label;
    if (label) pointer.append(Object.assign(element('span', 'label'), { textContent: label }));
    return pointer;
  });

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
