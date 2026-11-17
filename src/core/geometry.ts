import type { Box } from './motion';

export type Edges = Pick<DOMRect, 'left' | 'top' | 'right' | 'bottom'>;

export function unionOf(a: Edges, b: Edges): Edges {
  return {
    left: Math.min(a.left, b.left),
    top: Math.min(a.top, b.top),
    right: Math.max(a.right, b.right),
    bottom: Math.max(a.bottom, b.bottom)
  };
}

export function intersectionOf(a: Edges, b: Edges): Edges {
  return {
    left: Math.max(a.left, b.left),
    top: Math.max(a.top, b.top),
    right: Math.min(a.right, b.right),
    bottom: Math.min(a.bottom, b.bottom)
  };
}

export function toBox({ left, top, right, bottom }: Edges): Box {
  return { x: left, y: top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}

export function clipsContent(el: Element) {
  const { overflowX, overflowY } = getComputedStyle(el);
  return overflowX !== 'visible' || overflowY !== 'visible';
}

export function clippingAncestorsOf(
  el: HTMLElement,
  boundary: HTMLElement,
  isClipping: (el: Element) => boolean
) {
  const clips: HTMLElement[] = [];

  for (let node = el.parentElement; node && node !== boundary; node = node.parentElement) {
    if (isClipping(node)) clips.push(node);
  }

  return clips;
}
