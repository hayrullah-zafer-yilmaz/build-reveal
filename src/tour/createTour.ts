import type { BuildCursor } from '../core/drawing';
import { toBox, type Edges } from '../core/geometry';
import {
  bottomRight,
  EXIT_DURATION,
  FRAME_FADE,
  framed,
  MAX_FRAME_GAP_MS,
  MIN_SPEED,
  minimumJerk,
  progressBetween,
  REDUCED_MOTION_QUERY,
  type Box,
  type Point
} from '../core/motion';
import {
  canTypeInto,
  contentBoxOf,
  displayedText,
  ghostSourceOf,
  hidePlaceholder,
  type GhostSource
} from './ghostText';
import {
  DOCK_BREAKPOINT,
  dockedPanel,
  dockEdge,
  PANEL_MARGIN,
  placePanel,
  viewportEdges,
  type Size
} from './placement';
import {
  cursorAt,
  exitPose,
  keystrokesOf,
  planStep,
  readingTime,
  rippleAt,
  selectionAt,
  typedAt,
  type CursorPose,
  type Keystrokes,
  type StepPlan
} from './plan';
import { bringIntoView } from './scroll';
import {
  assertValidTarget,
  clipsOf,
  fieldOf,
  isEditable,
  isShown,
  resolveTarget,
  visibleEdges,
  type TourTarget
} from './targets';
import {
  createTourView,
  type FrameScene,
  type GhostScene,
  type TourScene,
  type TourText,
  type TourView
} from './view';

export type { BuildCursor } from '../core/drawing';
export type { TourTarget } from './targets';

export interface TourStep {
  target: TourTarget;
  caption: string;
  click?: boolean;
  type?: string;
}

export interface TourLabels {
  next?: string;
  back?: string;
  done?: string;
  close?: string;
  tour?: string;
  progress?: (step: number, total: number) => string;
}

export interface TourOptions {
  autoplay?: boolean;
  speed?: number;
  cursor?: BuildCursor;
  labels?: TourLabels;
  onStep?: (index: number) => void;
  onEnd?: (completed: boolean) => void;
}

export interface Tour {
  readonly step: number;
  readonly active: boolean;
  start(index?: number): void;
  next(): void;
  back(): void;
  goTo(index: number): void;
  stop(): void;
  destroy(): void;
}

type Phase = 'resolving' | 'scrolling' | 'playing' | 'reading';

type Direction = 1 | -1;

interface StepRun {
  index: number;
  direction: Direction;
  phase: Phase;
  element: Element | null;
  clips: Element[];
  waited: number;
  stable: number;
  lastEdges: Edges | null;
  plan: StepPlan | null;
  startedAt: number;
  origin: Point | null;
  sameTarget: boolean;
  keys: Keystrokes | null;
  ghost: GhostSource | null;
  release: (() => void) | null;
  read: number;
}

interface Measured {
  edges: Edges;
  target: Box;
  frame: Box;
}

interface Leaving {
  element: Element;
  clips: Element[];
  since: number;
}

interface Typing {
  ghost: GhostScene | null;
  panel: string | null;
  done: boolean;
}

const DEFAULT_TEXT: TourText = {
  next: 'Next',
  back: 'Back',
  done: 'Done',
  close: 'Close tour',
  tour: 'Guided tour',
  progress: (step, total) => `${step} / ${total}`
};

const TARGET_WAIT_MS = 3000;
const SCROLL_MIN_MS = 100;
const SCROLL_LIMIT_MS = 1500;
const STABLE_FRAMES = 3;
const IDLE_POLL_MS = 200;
const SETTLE_MS = 500;
const MAX_REAL_GAP_MS = 1000;
const FIELD_INSET = 10;
const CLEARANCE = { plain: 28, labelled: 46 };

let activeTour: Tour | null = null;

function textOf(labels: TourLabels = {}): TourText {
  return {
    next: labels.next ?? DEFAULT_TEXT.next,
    back: labels.back ?? DEFAULT_TEXT.back,
    done: labels.done ?? DEFAULT_TEXT.done,
    close: labels.close ?? DEFAULT_TEXT.close,
    tour: labels.tour ?? DEFAULT_TEXT.tour,
    progress: labels.progress ?? DEFAULT_TEXT.progress
  };
}

function deepActiveElement() {
  let focused = document.activeElement;
  while (focused?.shadowRoot?.activeElement) focused = focused.shadowRoot.activeElement;
  return focused;
}

const local = (edges: Edges, origin: Point): Edges => ({
  left: edges.left - origin.x,
  top: edges.top - origin.y,
  right: edges.right - origin.x,
  bottom: edges.bottom - origin.y
});

const hasArea = ({ left, top, right, bottom }: Edges) => right > left && bottom > top;

const sameEdges = (a: Edges, b: Edges) =>
  Math.abs(a.left - b.left) < 0.5 &&
  Math.abs(a.top - b.top) < 0.5 &&
  Math.abs(a.right - b.right) < 0.5 &&
  Math.abs(a.bottom - b.bottom) < 0.5;

const centerOf = ({ x, y, width, height }: Box): Point => ({ x: x + width / 2, y: y + height / 2 });

const lerp = (from: Point, to: Point, t: number): Point => ({
  x: from.x + (to.x - from.x) * t,
  y: from.y + (to.y - from.y) * t
});

function measured(edges: Edges): Measured {
  const target = toBox(edges);
  return { edges, target, frame: framed(target) };
}

export function createTour(steps: readonly TourStep[], options: TourOptions = {}): Tour {
  steps.forEach(({ target }) => assertValidTarget(target));

  const text = textOf(options.labels);
  const pace = Math.max(options.speed ?? 1, MIN_SPEED);
  const clearance = options.cursor?.label ? CLEARANCE.labelled : CLEARANCE.plain;
  const reducedMotion = globalThis.matchMedia?.(REDUCED_MOTION_QUERY);
  const cleanups: (() => void)[] = [];

  let index = -1;
  let active = false;
  let destroyed = false;
  let autoplay = false;
  let hovering = false;
  let panelShown = false;
  let view: TourView | null = null;
  let run: StepRun | null = null;
  let leaving: Leaving | null = null;
  let pose: CursorPose | null = null;
  let panelAt: Point | null = null;
  let panelFrom: Point | null = null;
  let exitAt: number | null = null;
  let exitFrom: CursorPose | null = null;
  let announcement: string | null = null;
  let restoreFocusTo: HTMLElement | SVGElement | null = null;
  let clock = 0;
  let lastFrameAt = 0;
  let frameRequest = 0;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  let busyUntil = 0;
  let signature = '';

  const motion = () => (reducedMotion?.matches ? 0 : 1);

  const isDocked = () => innerWidth <= DOCK_BREAKPOINT;

  const stepAt = (at: number) => steps[at]!;

  function listen(
    target: EventTarget,
    type: string,
    listener: (event: Event) => void,
    listenerOptions?: AddEventListenerOptions
  ) {
    target.addEventListener(type, listener, listenerOptions);
    cleanups.push(() => target.removeEventListener(type, listener, listenerOptions));
  }

  function detach() {
    cleanups.splice(0).forEach((cleanup) => cleanup());
  }

  function scheduleFrame() {
    if (frameRequest || !view) return;
    clearTimeout(idleTimer);
    idleTimer = undefined;
    frameRequest = requestAnimationFrame(tick);
  }

  function scheduleIdle() {
    if (frameRequest || idleTimer) return;
    idleTimer = setTimeout(() => {
      idleTimer = undefined;
      scheduleFrame();
    }, IDLE_POLL_MS);
  }

  function stopLoop() {
    cancelAnimationFrame(frameRequest);
    frameRequest = 0;
    clearTimeout(idleTimer);
    idleTimer = undefined;
    lastFrameAt = 0;
  }

  function attach() {
    const passive = { capture: true, passive: true };
    ['scroll', 'pointerdown', 'keydown', 'input'].forEach((type) =>
      listen(document, type, scheduleFrame, passive)
    );
    listen(window, 'resize', scheduleFrame);
    listen(document, 'keydown', onDocumentKey);
  }

  function measure(element: Element, clips: readonly Element[], origin: Point) {
    const edges = local(visibleEdges(element, clips), origin);
    return hasArea(edges) ? measured(edges) : null;
  }

  function scrollArea(): Edges {
    const area = viewportEdges();
    if (!view || !isDocked()) return area;
    return { ...area, bottom: area.bottom - view.panelSize().height - PANEL_MARGIN * 2 };
  }

  function releaseGhost(current: StepRun | null) {
    if (!current) return;
    current.release?.();
    current.release = null;
    current.ghost = null;
  }

  function show(target: number, direction: Direction) {
    if (!view) return;

    const previous = run;
    releaseGhost(previous);
    if (previous?.element) leaving = { element: previous.element, clips: previous.clips, since: clock };
    panelFrom = panelAt;
    index = target;

    const step = stepAt(target);
    const current: StepRun = {
      index: target,
      direction,
      phase: 'resolving',
      element: null,
      clips: [],
      waited: 0,
      stable: 0,
      lastEdges: null,
      plan: null,
      startedAt: clock,
      origin: null,
      sameTarget: false,
      keys: null,
      ghost: null,
      release: null,
      read: 0
    };
    run = current;

    const progress = text.progress(target + 1, steps.length);
    view.setContent({
      caption: step.caption,
      progress,
      first: target === 0,
      last: target === steps.length - 1
    });
    view.setTyped(null, false);
    announcement = `${progress}. ${step.caption}`;

    options.onStep?.(target);
    if (run !== current || !active) return;

    resolve(current);
    scheduleFrame();
  }

  function resolve(current: StepRun) {
    const element = resolveTarget(stepAt(current.index).target);
    if (!element || !isShown(element)) return false;

    current.element = element;
    current.clips = clipsOf(element);
    current.sameTarget = pose !== null && leaving?.element === element;
    if (current.sameTarget) leaving = null;
    current.waited = 0;

    if (bringIntoView(element, scrollArea(), motion() ? 'smooth' : 'instant')) current.phase = 'scrolling';
    else begin(current);
    return true;
  }

  function begin(current: StepRun) {
    const step = stepAt(current.index);
    const element = current.element!;
    const origin = view!.origin();
    const target =
      measure(element, current.clips, origin) ?? measured(local(element.getBoundingClientRect(), origin));

    current.phase = 'playing';
    current.waited = 0;
    current.startedAt = clock;
    current.origin = pose;

    if (step.type !== undefined) {
      current.keys = keystrokesOf(step.type);
      const field = fieldOf(element);
      const source = field && ghostSourceOf(field);
      current.ghost = source && canTypeInto(source) ? source : null;
      if (!current.ghost) view!.setTyped('', false);
    }

    current.plan = planStep({
      from: pose,
      frame: target.frame,
      rest: restPoint(current, target, origin),
      click: !!step.click,
      typedLength: step.type?.length ?? 0,
      motion: motion(),
      sameTarget: current.sameTarget
    });
  }

  function restPoint(current: StepRun, target: Measured, origin: Point): Point {
    const step = stepAt(current.index);
    if (current.ghost) {
      const box = contentBoxOf(current.ghost);
      return { x: box.x - origin.x + box.width - FIELD_INSET, y: box.y - origin.y + box.height / 2 };
    }
    return step.click || step.type !== undefined ? centerOf(target.target) : bottomRight(target.frame);
  }

  function follow(current: StepRun) {
    if (current.element?.isConnected) return;

    const again = resolveTarget(stepAt(current.index).target);
    if (!again || !isShown(again)) return;
    current.element = again;
    current.clips = clipsOf(again);
  }

  function skip(current: StepRun) {
    const forward = current.direction === 1 || current.index === 0;
    const target = forward ? current.index + 1 : current.index - 1;
    if (target >= steps.length) end(true);
    else show(target, forward ? 1 : -1);
  }

  function advance(current: StepRun, realGap: number) {
    current.waited += realGap;

    if (current.phase === 'resolving') {
      if (!resolve(current) && current.waited >= TARGET_WAIT_MS) skip(current);
      return;
    }

    follow(current);

    if (current.phase === 'scrolling') {
      const edges = current.element!.getBoundingClientRect();
      current.stable = current.lastEdges && sameEdges(edges, current.lastEdges) ? current.stable + 1 : 0;
      current.lastEdges = edges;
      const settled = current.stable >= STABLE_FRAMES && current.waited >= SCROLL_MIN_MS;
      if (settled || current.waited >= SCROLL_LIMIT_MS) begin(current);
      return;
    }

    if (current.phase === 'playing') {
      if (clock - current.startedAt >= current.plan!.settled) {
        current.phase = 'reading';
        current.read = 0;
      }
      return;
    }

    if (!autoplay || hovering) return;
    const step = stepAt(current.index);
    current.read += realGap;
    if (current.read >= readingTime(`${step.caption} ${step.type ?? ''}`)) next();
  }

  function typing(current: StepRun, time: number, origin: Point): Typing | null {
    const plan = current.plan;
    if (!current.keys || !plan) return null;

    const typed = typedAt(current.keys, plan, time);
    const done = time >= plan.typeEnd;

    if (current.ghost && !canTypeInto(current.ghost)) releaseGhost(current);
    if (!current.ghost) return { ghost: null, panel: typed, done };
    if (time < plan.typeStart) return { ghost: null, panel: null, done };

    current.release ??= hidePlaceholder(current.ghost.field);
    const box = contentBoxOf(current.ghost);
    return {
      ghost: {
        box: { ...box, x: box.x - origin.x, y: box.y - origin.y },
        text: displayedText(current.ghost, typed),
        style: current.ghost.style,
        multiline: current.ghost.multiline,
        blink: done
      },
      panel: null,
      done
    };
  }

  function fading(origin: Point): FrameScene | null {
    if (!leaving) return null;

    const fade = progressBetween(clock, leaving.since, leaving.since + FRAME_FADE * motion());
    const box = fade < 1 ? measure(leaving.element, leaving.clips, origin) : null;
    if (!box) {
      leaving = null;
      return null;
    }
    return { box: box.frame, selected: true, opacity: 1 - fade };
  }

  function panelPosition(
    plan: StepPlan | null,
    target: Measured | null,
    viewport: Edges,
    size: Size,
    docked: boolean,
    time: number
  ): Point | null {
    if (!panelShown) {
      if (!plan || time < plan.drawEnd) return null;
      panelShown = true;
    }

    const edges = target?.edges ?? null;
    const goal = docked
      ? dockedPanel(dockEdge(edges, viewport, size.height), size, viewport)
      : placePanel(edges, size, viewport, clearance);

    if (!plan) return (panelAt ??= goal);

    const glide = docked || !panelFrom ? 1 : minimumJerk(progressBetween(time, 0, plan.drawEnd));
    panelAt = panelFrom && glide < 1 ? lerp(panelFrom, goal, glide) : goal;
    return panelAt;
  }

  function render() {
    const tourView = view!;
    const current = run;
    const origin = tourView.origin();
    const viewport = local(viewportEdges(), origin);
    const docked = isDocked();
    const size = tourView.panelSize();
    const plan = current?.plan ?? null;
    const time = clock - (current?.startedAt ?? clock);
    const target =
      current?.element && current.phase !== 'resolving' ? measure(current.element, current.clips, origin) : null;

    let frame: FrameScene | null = null;
    let ripple: TourScene['ripple'] = null;
    let typed: Typing | null = null;

    if (current && plan && target) {
      const rest = restPoint(current, target, origin);
      const selection = selectionAt(plan, time, target.frame);
      const ring = stepAt(current.index).click ? rippleAt(plan, time) : null;
      pose = cursorAt(plan, time, current.origin, target.frame, rest, current.sameTarget, current.index % 2 ? -1 : 1);
      frame = selection && { ...selection, opacity: 1 };
      ripple = ring && { ...ring, ...rest };
      typed = typing(current, time, origin);
    }

    if (exitAt !== null && exitFrom) {
      pose = exitPose(exitFrom, progressBetween(clock, exitAt, exitAt + EXIT_DURATION * motion()));
    }

    const leavingFrame = fading(origin);
    const panel = active ? panelPosition(plan, target, viewport, size, docked, time) : null;

    tourView.setDocked(docked);
    if (typed) tourView.setTyped(typed.panel, typed.done);
    tourView.render({ cursor: pose, frame, leaving: leavingFrame, ripple, ghost: typed?.ghost ?? null, panel });

    if (announcement && panel) {
      tourView.announce(announcement);
      announcement = null;
    }

    const next = [
      target && Object.values(target.edges).map(Math.round).join(),
      panel && `${Math.round(panel.x)},${Math.round(panel.y)}`
    ].join('|');
    const changed = next !== signature;
    signature = next;
    return changed;
  }

  function isBusy(now: number) {
    if (exitAt !== null || leaving || announcement || now < busyUntil) return true;
    return !!run && run.phase !== 'reading';
  }

  function tick(now: number) {
    frameRequest = 0;
    if (!view) return;

    const gap = lastFrameAt ? now - lastFrameAt : 0;
    lastFrameAt = now;
    clock += Math.min(gap, MAX_FRAME_GAP_MS) * pace;

    if (run && active) advance(run, Math.min(gap, MAX_REAL_GAP_MS));
    if (!view) return;

    if (render()) busyUntil = now + SETTLE_MS;

    if (exitAt !== null && clock - exitAt >= Math.max(EXIT_DURATION, FRAME_FADE) * motion()) {
      finishExit();
      return;
    }

    if (isBusy(now)) scheduleFrame();
    else scheduleIdle();
  }

  function restoreFocus() {
    const previous = restoreFocusTo;
    restoreFocusTo = null;

    const focused = deepActiveElement();
    const inPanel = view?.hasFocus() ?? false;
    if (!inPanel && focused && focused !== document.body) return;
    if (previous?.isConnected) previous.focus({ preventScroll: true });
  }

  function finishExit() {
    stopLoop();
    view?.remove();
    view = null;
    exitAt = null;
    exitFrom = null;
    leaving = null;
    pose = null;
    panelAt = null;
    panelFrom = null;
    panelShown = false;
    signature = '';
  }

  function end(completed: boolean) {
    if (!active) return;

    active = false;
    if (activeTour === tour) activeTour = null;

    const current = run;
    releaseGhost(current);
    if (current?.element) leaving = { element: current.element, clips: current.clips, since: clock };
    run = null;
    index = -1;
    exitFrom = pose;
    exitAt = clock;

    detach();
    restoreFocus();
    view?.close();

    if (!motion() || !pose) finishExit();
    else scheduleFrame();

    options.onEnd?.(completed);
  }

  function onDocumentKey(event: Event) {
    const key = event as KeyboardEvent;
    if (key.key !== 'Escape' || !active || key.defaultPrevented || key.isComposing) return;

    const focused = deepActiveElement();
    if (focused && !view?.hasFocus() && isEditable(focused)) return;
    end(false);
  }

  function onPanelKey(event: KeyboardEvent) {
    if (event.key === 'ArrowRight' || (event.key === 'Enter' && event.target === view?.panel)) next();
    else if (event.key === 'ArrowLeft') back();
    else return;

    event.preventDefault();
    event.stopPropagation();
  }

  function start(at = 0) {
    if (destroyed || !steps.length || typeof document === 'undefined') return;
    if (active) {
      goTo(at);
      return;
    }

    if (activeTour && activeTour !== tour) activeTour.stop();
    if (view) finishExit();

    const focused = deepActiveElement();
    restoreFocusTo =
      (focused instanceof HTMLElement || focused instanceof SVGElement) && focused !== document.body
        ? focused
        : null;
    active = true;
    activeTour = tour;
    autoplay = options.autoplay ?? false;
    hovering = false;

    view = createTourView(options.cursor, text, {
      next,
      back,
      close: () => end(false),
      hover: (over) => {
        hovering = over;
      },
      key: onPanelKey
    });
    attach();
    view.focusPanel();
    show(Number.isInteger(at) ? Math.min(Math.max(at, 0), steps.length - 1) : 0, 1);
  }

  function next() {
    if (!active) return;
    if (index >= steps.length - 1) end(true);
    else show(index + 1, 1);
  }

  function back() {
    if (!active || index <= 0) return;
    autoplay = false;
    show(index - 1, -1);
  }

  function goTo(target: number) {
    if (!active || !Number.isInteger(target) || target < 0 || target >= steps.length) return;
    show(target, target < index ? -1 : 1);
  }

  function destroy() {
    if (destroyed) return;

    destroyed = true;
    if (activeTour === tour) activeTour = null;
    releaseGhost(run);
    if (active) restoreFocus();
    active = false;
    run = null;
    index = -1;
    detach();
    finishExit();
  }

  const tour: Tour = {
    get step() {
      return index;
    },
    get active() {
      return active;
    },
    start,
    next,
    back,
    goTo,
    stop: () => end(false),
    destroy
  };

  return tour;
}
