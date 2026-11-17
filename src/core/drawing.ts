import type { Point } from './motion';

export interface BuildCursor {
  label?: string;
  color?: string;
  hue?: number;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const POINTER_PATH = 'M3.2 2.6 17.1 9.3 10.9 11.2 8.9 17.3Z';
const CORNERS = ['nw', 'ne', 'sw', 'se'] as const;
const HUE_SHIFTS = [0, 60, -60, 120, -120, 180];

export const translate = ({ x, y }: Point) => `translate3d(${x}px, ${y}px, 0)`;

export function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string) {
  const el = document.createElement(tag);
  el.className = className;
  return el;
}

export function pointerIcon() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'pointer');
  svg.setAttribute('viewBox', '0 0 20 20');

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', POINTER_PATH);
  svg.append(path);
  return svg;
}

export function tint<T extends HTMLElement>(el: T, cursor: BuildCursor | undefined, index: number) {
  el.classList.add('tinted');
  const { color, hue } = cursor ?? {};
  if (color) el.style.setProperty('--build-reveal-cursor-color', color);
  else el.style.setProperty('--build-reveal-cursor-hue', String(hue ?? HUE_SHIFTS[index % HUE_SHIFTS.length]));
  return el;
}

export function selectionFrame() {
  const frame = element('div', 'frame');
  frame.append(...CORNERS.map((corner) => element('i', `handle ${corner}`)));
  return frame;
}

export function cursorElement(label?: string) {
  const pointer = element('div', 'cursor');
  pointer.append(pointerIcon());
  if (label) pointer.append(Object.assign(element('span', 'label'), { textContent: label }));
  return pointer;
}
