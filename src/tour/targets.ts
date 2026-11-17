import { clipsContent, intersectionOf, type Edges } from '../core/geometry';

export type TourTarget = string | Element | (() => Element | null | undefined);

export type TextField = HTMLInputElement | HTMLTextAreaElement;

const TEXT_INPUT_TYPES = new Set(['text', 'search', 'email', 'url', 'tel', 'password', 'number']);

export function assertValidTarget(target: TourTarget) {
  if (typeof target === 'string' && typeof document !== 'undefined') {
    document.createDocumentFragment().querySelector(target);
  }
}

export function resolveTarget(target: TourTarget): Element | null {
  const el =
    typeof target === 'string'
      ? document.querySelector(target)
      : typeof target === 'function'
        ? target()
        : target;
  return el?.isConnected ? el : null;
}

export function isShown(el: Element) {
  const { width, height } = el.getBoundingClientRect();
  return width > 0 && height > 0;
}

export function composedParent(node: Element): Element | null {
  if (node.parentElement) return node.parentElement;
  const root = node.parentNode;
  return root instanceof ShadowRoot ? root.host : null;
}

const isFixed = (el: Element) => getComputedStyle(el).position === 'fixed';

export function clipsOf(el: Element) {
  const clips: Element[] = [];
  if (isFixed(el)) return clips;

  for (let node = composedParent(el); node; node = composedParent(node)) {
    if (node === document.body || node === document.documentElement) break;
    if (clipsContent(node)) clips.push(node);
    if (isFixed(node)) break;
  }

  return clips;
}

export function visibleEdges(el: Element, clips: readonly Element[]): Edges {
  return clips.reduce<Edges>(
    (edges, clip) => intersectionOf(edges, clip.getBoundingClientRect()),
    el.getBoundingClientRect()
  );
}

export function isTextField(el: Element): el is TextField {
  return (
    el instanceof HTMLTextAreaElement ||
    (el instanceof HTMLInputElement && TEXT_INPUT_TYPES.has(el.type))
  );
}

export function fieldOf(el: Element): TextField | null {
  if (isTextField(el)) return el;

  const fields = [...el.querySelectorAll('input, textarea')].filter(isTextField);
  return fields.length === 1 ? (fields[0] ?? null) : null;
}

export function isEditable(el: Element) {
  return (
    isTextField(el) ||
    el instanceof HTMLSelectElement ||
    (el instanceof HTMLElement && el.isContentEditable)
  );
}
