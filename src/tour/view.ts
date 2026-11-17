import { cursorElement, element, selectionFrame, tint, translate, type BuildCursor } from '../core/drawing';
import type { Box, Point } from '../core/motion';
import type { CursorPose, Ripple } from './plan';
import type { Size } from './placement';
import { tourStyleSheet } from './styles';

export interface TourText {
  next: string;
  back: string;
  done: string;
  close: string;
  tour: string;
  progress: (step: number, total: number) => string;
}

export interface FrameScene {
  box: Box;
  selected: boolean;
  opacity: number;
}

export interface GhostScene {
  box: Box;
  text: string;
  style: readonly (readonly [string, string])[];
  multiline: boolean;
  blink: boolean;
}

export interface TourScene {
  cursor: CursorPose | null;
  frame: FrameScene | null;
  leaving: FrameScene | null;
  ripple: (Ripple & Point) | null;
  ghost: GhostScene | null;
  panel: Point | null;
}

export interface PanelContent {
  caption: string;
  progress: string;
  first: boolean;
  last: boolean;
}

export interface ViewHandlers {
  next(): void;
  back(): void;
  close(): void;
  hover(over: boolean): void;
  key(event: KeyboardEvent): void;
}

export interface TourView {
  readonly panel: HTMLElement;
  setContent(content: PanelContent): void;
  setTyped(text: string | null, blink: boolean): void;
  setDocked(docked: boolean): void;
  announce(text: string): void;
  panelSize(): Size;
  origin(): Point;
  hasFocus(): boolean;
  focusPanel(): void;
  render(scene: TourScene): void;
  close(): void;
  remove(): void;
}

const HOST_STYLE: Partial<CSSStyleDeclaration> = {
  position: 'fixed',
  inset: '0',
  zIndex: 'var(--build-reveal-tour-z-index, 2147483000)',
  pointerEvents: 'none',
  overflow: 'hidden'
};

const ISOLATED_EVENTS = ['pointerdown', 'mousedown', 'click', 'touchstart'];

const px = (value: number) => `${Math.round(value * 2) / 2}px`;

function button(className: string, text: string, onPress: () => void) {
  const el = element('button', className);
  el.type = 'button';
  el.textContent = text;
  el.addEventListener('click', onPress);
  return el;
}

export function createTourView(
  cursor: BuildCursor | undefined,
  text: TourText,
  handlers: ViewHandlers
): TourView {
  const written = new WeakMap<HTMLElement, Map<string, string>>();

  function write(el: HTMLElement, name: string, value: string) {
    let values = written.get(el);
    if (!values) written.set(el, (values = new Map()));
    if (values.get(name) === value) return;

    values.set(name, value);
    el.style.setProperty(name, value);
  }

  const host = document.createElement('div');
  host.setAttribute('data-build-tour', '');
  Object.assign(host.style, HOST_STYLE);

  const shadow = host.attachShadow({ mode: 'open' });
  shadow.adoptedStyleSheets = [tourStyleSheet()];

  const drawing = element('div', 'drawing');
  drawing.setAttribute('aria-hidden', 'true');
  const leavingFrame = tint(selectionFrame(), cursor, 0);
  const frame = tint(selectionFrame(), cursor, 0);
  const ghost = element('div', 'ghost');
  const ghostText = document.createTextNode('');
  const ghostCaret = tint(element('i', 'ghost-caret'), cursor, 0);
  const ripple = tint(element('i', 'ripple'), cursor, 0);
  const pointer = tint(cursorElement(cursor?.label), cursor, 0);
  ghost.append(ghostText, ghostCaret);
  drawing.append(leavingFrame, frame, ghost, ripple, pointer);

  const panel = element('div', 'panel');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', text.tour);
  panel.tabIndex = -1;
  const caption = element('p', 'caption');
  const typed = element('kbd', 'typed');
  const typedText = document.createTextNode('');
  const typedCaret = tint(element('i', 'ghost-caret'), cursor, 0);
  typed.append(typedText, typedCaret);
  typed.hidden = true;
  const bar = element('div', 'bar');
  const progress = element('span', 'progress');
  const back = button('back', text.back, () => {
    if (back.getAttribute('aria-disabled') !== 'true') handlers.back();
  });
  const next = button('next', text.next, handlers.next);
  const close = button('close', '×', handlers.close);
  close.setAttribute('aria-label', text.close);
  const status = element('p', 'status');
  status.setAttribute('role', 'status');
  bar.append(progress, back, next);
  panel.append(caption, typed, bar, close, status);

  panel.addEventListener('keydown', handlers.key);
  panel.addEventListener('pointerenter', () => handlers.hover(true));
  panel.addEventListener('pointerleave', () => handlers.hover(false));
  ISOLATED_EVENTS.forEach((type) => panel.addEventListener(type, (event) => event.stopPropagation()));

  shadow.append(drawing, panel);
  (document.body ?? document.documentElement).append(host);

  let ghostStyle: GhostScene['style'] | null = null;

  function show(el: HTMLElement, visible: boolean) {
    write(el, 'visibility', visible ? 'visible' : 'hidden');
    return visible;
  }

  function place(el: HTMLElement, box: Box, opacity: number) {
    write(el, 'width', px(box.width));
    write(el, 'height', px(box.height));
    write(el, 'transform', translate({ x: Math.round(box.x * 2) / 2, y: Math.round(box.y * 2) / 2 }));
    write(el, 'opacity', String(Math.round(opacity * 1000) / 1000));
  }

  function drawFrame(el: HTMLElement, scene: FrameScene | null) {
    if (!show(el, !!scene) || !scene) return;
    place(el, scene.box, scene.opacity);
    el.classList.toggle('selected', scene.selected);
  }

  function drawCursor(pose: CursorPose | null) {
    if (!show(pointer, !!pose) || !pose) return;
    write(pointer, 'transform', `${translate(pose)} scale(${Math.round(pose.scale * 1000) / 1000})`);
    write(pointer, 'opacity', String(Math.round(pose.opacity * 1000) / 1000));
  }

  function drawRipple(scene: TourScene['ripple']) {
    if (!show(ripple, !!scene) || !scene) return;
    const size = scene.radius * 2;
    place(ripple, { x: scene.x - scene.radius, y: scene.y - scene.radius, width: size, height: size }, scene.opacity);
  }

  function drawGhost(scene: GhostScene | null) {
    if (!show(ghost, !!scene) || !scene) {
      ghostText.data = '';
      return;
    }

    if (ghostStyle !== scene.style) {
      scene.style.forEach(([name, value]) => ghost.style.setProperty(name, value));
      ghost.classList.toggle('multiline', scene.multiline);
      ghostStyle = scene.style;
    }

    place(ghost, scene.box, 1);
    ghostCaret.classList.toggle('blink', scene.blink);
    if (ghostText.data === scene.text) return;

    ghostText.data = scene.text;
    if (scene.multiline) ghost.scrollTop = ghost.scrollHeight;
    else ghost.scrollLeft = ghost.scrollWidth;
  }

  function drawPanel(at: Point | null) {
    panel.classList.toggle('shown', !!at);
    if (at) write(panel, 'transform', translate({ x: Math.round(at.x), y: Math.round(at.y) }));
  }

  return {
    panel,

    setContent(content) {
      caption.textContent = content.caption;
      progress.textContent = content.progress;
      back.setAttribute('aria-disabled', String(content.first));
      next.textContent = content.last ? text.done : text.next;
    },

    setTyped(value, blink) {
      typed.hidden = value === null;
      if (typedText.data !== (value ?? '')) typedText.data = value ?? '';
      typedCaret.classList.toggle('blink', blink);
    },

    setDocked(docked) {
      panel.classList.toggle('docked', docked);
    },

    announce(message) {
      status.textContent = message;
    },

    panelSize() {
      return { width: panel.offsetWidth, height: panel.offsetHeight };
    },

    origin() {
      const { left, top } = host.getBoundingClientRect();
      return { x: left, y: top };
    },

    hasFocus() {
      return shadow.activeElement !== null;
    },

    focusPanel() {
      panel.focus({ preventScroll: true });
    },

    render(scene) {
      drawFrame(leavingFrame, scene.leaving);
      drawFrame(frame, scene.frame);
      drawGhost(scene.ghost);
      drawRipple(scene.ripple);
      drawCursor(scene.cursor);
      drawPanel(scene.panel);
    },

    close() {
      panel.classList.remove('shown');
      panel.classList.add('closed');
      panel.inert = true;
    },

    remove() {
      host.remove();
    }
  };
}
