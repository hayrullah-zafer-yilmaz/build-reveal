import { intersectionOf, type Edges } from '../core/geometry';
import { composedParent } from './targets';

interface Delta {
  left: number;
  top: number;
}

const COMFORT_MARGIN = 24;
const SCROLLABLE = /(auto|scroll|overlay)/;

const pixels = (value: string) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function axisDelta(start: number, end: number, viewStart: number, viewEnd: number, margin: number) {
  if (start >= viewStart + margin && end <= viewEnd - margin) return 0;
  if (end - start <= viewEnd - viewStart - margin * 2) return (start + end) / 2 - (viewStart + viewEnd) / 2;
  return start - (viewStart + margin);
}

export function scrollDelta(target: Edges, view: Edges, margin = COMFORT_MARGIN): Delta {
  return {
    left: axisDelta(target.left, target.right, view.left, view.right, margin),
    top: axisDelta(target.top, target.bottom, view.top, view.bottom, margin)
  };
}

function limited(delta: Delta, position: Delta, max: Delta): Delta {
  const within = (value: number, at: number, limit: number) => {
    const allowed = Math.min(Math.max(value, -at), Math.max(0, limit - at));
    return Math.abs(allowed) < 1 ? 0 : allowed;
  };

  return {
    left: within(delta.left, position.left, max.left),
    top: within(delta.top, position.top, max.top)
  };
}

function padded(edges: Edges, style: CSSStyleDeclaration): Edges {
  return {
    left: edges.left + pixels(style.scrollPaddingLeft),
    top: edges.top + pixels(style.scrollPaddingTop),
    right: edges.right - pixels(style.scrollPaddingRight),
    bottom: edges.bottom - pixels(style.scrollPaddingBottom)
  };
}

function margined(edges: Edges, style: CSSStyleDeclaration): Edges {
  return {
    left: edges.left - pixels(style.scrollMarginLeft),
    top: edges.top - pixels(style.scrollMarginTop),
    right: edges.right + pixels(style.scrollMarginRight),
    bottom: edges.bottom + pixels(style.scrollMarginBottom)
  };
}

function scrollPortOf(el: Element): Edges {
  const rect = el.getBoundingClientRect();
  const left = rect.left + el.clientLeft;
  const top = rect.top + el.clientTop;
  return { left, top, right: left + el.clientWidth, bottom: top + el.clientHeight };
}

function isScroller(el: Element, style: CSSStyleDeclaration) {
  return (
    (SCROLLABLE.test(style.overflowY) && el.scrollHeight > el.clientHeight) ||
    (SCROLLABLE.test(style.overflowX) && el.scrollWidth > el.clientWidth)
  );
}

const moved = (edges: Edges, { left, top }: Delta): Edges => ({
  left: edges.left - left,
  top: edges.top - top,
  right: edges.right - left,
  bottom: edges.bottom - top
});

function scrollElement(el: Element, delta: Delta, behavior: ScrollBehavior) {
  if (typeof el.scrollBy === 'function') {
    el.scrollBy({ ...delta, behavior });
  } else {
    el.scrollLeft += delta.left;
    el.scrollTop += delta.top;
  }
}

export function bringIntoView(el: Element, area: Edges, behavior: ScrollBehavior) {
  let target = margined(el.getBoundingClientRect(), getComputedStyle(el));
  let requested = false;

  for (let node = composedParent(el); node && node !== document.documentElement; node = composedParent(node)) {
    const style = getComputedStyle(node);
    if (style.position === 'fixed') return requested;
    if (!isScroller(node, style)) continue;

    const view = intersectionOf(padded(scrollPortOf(node), style), area);
    const delta = limited(
      scrollDelta(target, view),
      { left: node.scrollLeft, top: node.scrollTop },
      { left: node.scrollWidth - node.clientWidth, top: node.scrollHeight - node.clientHeight }
    );
    if (!delta.left && !delta.top) continue;

    scrollElement(node, delta, behavior);
    target = moved(target, delta);
    requested = true;
  }

  const root = document.documentElement;
  const delta = limited(
    scrollDelta(target, padded(area, getComputedStyle(root))),
    { left: scrollX, top: scrollY },
    { left: root.scrollWidth - root.clientWidth, top: root.scrollHeight - root.clientHeight }
  );
  if ((delta.left || delta.top) && typeof window.scrollBy === 'function') {
    window.scrollBy({ ...delta, behavior });
    requested = true;
  }

  return requested;
}
