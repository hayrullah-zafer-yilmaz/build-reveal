import { createOverlay, type BuildCursor, type Overlay } from './overlay';
import { isBuildRevealEnabled, onBuildRevealSettingsChange } from './settings';
import { adoptStageStyles } from './styles';
import {
  createTimeline,
  progressBetween,
  REVEAL_DURATION,
  type Box,
  type BuildPlanEntry,
  type BuildStep,
  type BuildTimeline,
  type CaretState
} from './timeline';
import { createTypedText, type TypedText } from './typedText';

export type BuildRevealTrigger = 'visible' | 'manual';

export type BuildRevealPhase = 'idle' | 'pending' | 'playing' | 'done';

export interface BuildRevealOptions {
  cursors?: number | readonly BuildCursor[];
  speed?: number;
  trigger?: BuildRevealTrigger;
  progressive?: boolean;
  hold?: boolean;
  disabled?: boolean;
  onComplete?: () => void;
}

export interface BuildReveal {
  readonly phase: BuildRevealPhase;
  play(): Promise<void>;
  finish(): void;
  update(options: BuildRevealOptions): void;
  destroy(): void;
}

type TargetState = 'pending' | 'revealing' | 'done';

interface BuildTarget {
  el: HTMLElement;
  typesText: boolean;
  parent: BuildTarget | null;
  included: HTMLElement[];
  clips: HTMLElement[];
  text: TypedText | null;
  state: TargetState;
  planned: boolean;
  box: Box;
}

type BuildSteps = readonly BuildStep<BuildTarget>[];

type RectReader = (el: HTMLElement) => DOMRect;

type Edges = Pick<DOMRect, 'left' | 'top' | 'right' | 'bottom'>;

type ResolvedOptions = Required<Omit<BuildRevealOptions, 'onComplete'>> &
  Pick<BuildRevealOptions, 'onComplete'>;

export const BUILD_TARGET_CLASS = 'build-reveal-target';

const DEFAULT_OPTIONS: ResolvedOptions = {
  cursors: 3,
  speed: 1,
  trigger: 'visible',
  progressive: false,
  hold: false,
  disabled: false
};

const TARGET_SELECTOR = `[data-build], .${BUILD_TARGET_CLASS}`;
const STAGE_ATTRIBUTE = 'data-build-stage';
const STAGE_SELECTOR = `[${STAGE_ATTRIBUTE}]`;
const PLAYING_ATTRIBUTE = 'data-build-playing';
const INCLUDED_PART_SELECTOR = '[data-build-include]';
const STATE_ATTRIBUTE = 'data-build-state';
const PENDING_TARGET_SELECTOR = `[${STATE_ATTRIBUTE}='pending']`;
const DURATION_PROPERTY = '--build-reveal-duration';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const VISIBILITY_THRESHOLDS = Array.from({ length: 11 }, (_, step) => step / 10);
const MIN_VISIBLE_RATIO = 0.3;
const MIN_VISIBLE_VIEWPORT_SHARE = 0.5;
const START_DELAY_MS = 120;
const OBSTRUCTION_RETRY_MS = 150;
const OBSTRUCTION_LIMIT_MS = 4000;
const MAX_FRAME_GAP_MS = 48;
const MIN_SPEED = 0.1;
const CARET_THICKNESS = 2;
const MIN_VISIBLE_SIZE = 8;
const EMPTY_BOX: Box = { x: 0, y: 0, width: 0, height: 0 };

const canObserve = () => typeof IntersectionObserver === 'function';

function definedOptions(options: BuildRevealOptions) {
  return Object.fromEntries(
    Object.entries(options).filter(([, value]) => value !== undefined)
  ) as BuildRevealOptions;
}

function resolveCursors(cursors: ResolvedOptions['cursors']): readonly BuildCursor[] {
  if (typeof cursors === 'number') {
    return Array.from({ length: Math.max(1, Math.round(cursors)) }, () => ({}));
  }
  return cursors.length ? cursors : [{}];
}

function cached<K, V>(read: (key: K) => V) {
  const values = new Map<K, V>();

  return (key: K) => {
    const known = values.get(key);
    if (known !== undefined) return known;

    const value = read(key);
    values.set(key, value);
    return value;
  };
}

function clipsContent(el: Element) {
  const { overflowX, overflowY } = getComputedStyle(el);
  return overflowX !== 'visible' || overflowY !== 'visible';
}

function clippingAncestorsOf(
  el: HTMLElement,
  stage: HTMLElement,
  isClipping: (el: Element) => boolean
) {
  const clips: HTMLElement[] = [];

  for (let node = el.parentElement; node && node !== stage; node = node.parentElement) {
    if (isClipping(node)) clips.push(node);
  }

  return clips;
}

function includedPartsOf(el: HTMLElement) {
  return [...el.querySelectorAll<HTMLElement>(INCLUDED_PART_SELECTOR)].filter(
    (part) => part.parentElement?.closest(TARGET_SELECTOR) === el
  );
}

function unionOf(a: Edges, b: Edges): Edges {
  return {
    left: Math.min(a.left, b.left),
    top: Math.min(a.top, b.top),
    right: Math.max(a.right, b.right),
    bottom: Math.max(a.bottom, b.bottom)
  };
}

function intersectionOf(a: Edges, b: Edges): Edges {
  return {
    left: Math.max(a.left, b.left),
    top: Math.max(a.top, b.top),
    right: Math.min(a.right, b.right),
    bottom: Math.min(a.bottom, b.bottom)
  };
}

function caretBox(caret: DOMRect, stageRect: DOMRect): Box {
  const x = caret.left - stageRect.left;
  const y = caret.top - stageRect.top;

  return caret.height
    ? { x: x - CARET_THICKNESS / 2, y, width: CARET_THICKNESS, height: caret.height }
    : { x, y: y - CARET_THICKNESS / 2, width: caret.width, height: CARET_THICKNESS };
}

function isWellInView({
  isIntersecting,
  intersectionRatio,
  intersectionRect,
  rootBounds
}: IntersectionObserverEntry) {
  const viewportHeight = rootBounds?.height ?? globalThis.innerHeight;

  return (
    isIntersecting &&
    (intersectionRatio >= MIN_VISIBLE_RATIO ||
      intersectionRect.height >= viewportHeight * MIN_VISIBLE_VIEWPORT_SHARE)
  );
}

export function createBuildReveal(stage: HTMLElement, options: BuildRevealOptions = {}): BuildReveal {
  let config: ResolvedOptions = { ...DEFAULT_OPTIONS, ...definedOptions(options) };
  let phase: BuildRevealPhase = 'idle';
  let destroyed = false;
  let targets: BuildTarget[] = [];
  let timeline: BuildTimeline<BuildTarget> | null = null;
  let overlay: Overlay | null = null;
  let clock = 0;
  let lastFrameAt = 0;
  let frameRequest = 0;
  let startTimer: ReturnType<typeof setTimeout> | undefined;
  let targetObserver: IntersectionObserver | null = null;
  let targetWatcher: MutationObserver | null = null;
  let stageObserver: IntersectionObserver | null = null;
  const targetByElement = new Map<HTMLElement, BuildTarget>();
  const reducedMotion = globalThis.matchMedia?.(REDUCED_MOTION_QUERY);
  let ownsPosition = false;
  let playRun = 0;
  const cleanups: (() => void)[] = [];

  const pace = () => Math.max(config.speed, MIN_SPEED);

  const canAnimate = () =>
    !destroyed &&
    isBuildRevealEnabled() &&
    !config.disabled &&
    !reducedMotion?.matches &&
    canObserve();

  function listen<T extends EventTarget>(
    target: T,
    types: string[],
    listener: (event: Event) => void,
    listenerOptions?: AddEventListenerOptions
  ) {
    types.forEach((type) => target.addEventListener(type, listener, listenerOptions));
    cleanups.push(() =>
      types.forEach((type) => target.removeEventListener(type, listener, listenerOptions))
    );
  }

  function adoptTargets(scope: HTMLElement) {
    const adopted: BuildTarget[] = [];

    const candidates = scope.matches(TARGET_SELECTOR)
      ? [scope, ...scope.querySelectorAll<HTMLElement>(TARGET_SELECTOR)]
      : scope.querySelectorAll<HTMLElement>(TARGET_SELECTOR);

    for (const el of candidates) {
      if (targetByElement.has(el) || el.closest(STAGE_SELECTOR) !== stage) continue;

      const parentEl = el.parentElement?.closest<HTMLElement>(TARGET_SELECTOR);
      const target: BuildTarget = {
        el,
        typesText: el.dataset.build === 'type',
        parent: (parentEl && targetByElement.get(parentEl)) ?? null,
        included: [],
        clips: [],
        text: null,
        state: 'pending',
        planned: false,
        box: EMPTY_BOX
      };

      targetByElement.set(el, target);
      setState(target, 'pending');
      adopted.push(target);
    }

    targets.push(...adopted);
    return adopted;
  }

  function followNewTargets(adopted: BuildTarget[]) {
    if (phase !== 'playing' || !adopted.length) return;

    if (config.progressive) adopted.forEach((target) => targetObserver?.observe(target.el));
    else planTargets(adopted);

    completeIfIdle();
  }

  function adoptAddedNodes(records: MutationRecord[]) {
    const added = records
      .flatMap((record) => [...record.addedNodes])
      .filter((node): node is HTMLElement => node instanceof HTMLElement);

    followNewTargets(added.flatMap(adoptTargets));
  }

  function watchNewTargets() {
    targetWatcher = new MutationObserver(adoptAddedNodes);
    targetWatcher.observe(stage, { childList: true, subtree: true });
  }

  function isSettled(target: BuildTarget) {
    return target.state === 'done' || !target.el.isConnected;
  }

  function setState(target: BuildTarget, state: TargetState) {
    target.state = state;
    if (state === 'done') target.el.removeAttribute(STATE_ATTRIBUTE);
    else target.el.setAttribute(STATE_ATTRIBUTE, state);
  }

  function reveal(target: BuildTarget) {
    target.text?.begin();
    setState(target, 'revealing');
  }

  function settle(target: BuildTarget) {
    target.text?.dispose();
    target.text = null;
    setState(target, 'done');
  }

  function isVisibleEnough({ box }: BuildTarget) {
    return box.width >= MIN_VISIBLE_SIZE && box.height >= MIN_VISIBLE_SIZE;
  }

  function measure(target: BuildTarget, stageRect: DOMRect, rectOf: RectReader) {
    if (!target.el.isConnected) return target.box;

    const outer = target.included.reduce<Edges>(
      (edges, part) => unionOf(edges, part.getBoundingClientRect()),
      target.el.getBoundingClientRect()
    );
    const { left, top, right, bottom } = target.clips.reduce<Edges>(
      (edges, clip) => intersectionOf(edges, rectOf(clip)),
      outer
    );

    target.box = {
      x: left - stageRect.left,
      y: top - stageRect.top,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top)
    };
    return target.box;
  }

  function measureOnce(stageRect: DOMRect) {
    const clipRectOf = cached((el: HTMLElement) => el.getBoundingClientRect());
    return cached((target: BuildTarget) => measure(target, stageRect, clipRectOf));
  }

  function prepare() {
    adoptTargets(stage);
    watchNewTargets();
    phase = 'pending';
  }

  function planTargets(batch: BuildTarget[]) {
    if (!timeline) return;

    const unplanned = batch.filter((target) => !target.planned && target.state === 'pending');
    const isClipping = cached(clipsContent);
    const boxOf = measureOnce(stage.getBoundingClientRect());

    for (const target of unplanned) {
      target.included = includedPartsOf(target.el);
      target.clips = clippingAncestorsOf(target.el, stage, isClipping);
      boxOf(target);
    }

    const entries: BuildPlanEntry<BuildTarget>[] = [];
    const hidden: BuildTarget[] = [];

    for (const target of unplanned) {
      if (!isVisibleEnough(target)) {
        hidden.push(target);
        continue;
      }

      target.planned = true;
      target.text = target.typesText ? createTypedText(target.el) : null;
      entries.push({
        target,
        box: target.box,
        parent: target.parent,
        typedLength: target.text?.length ?? 0
      });
    }

    hidden.forEach(settle);
    if (!entries.length) return;

    timeline.add(entries, clock);
    runLoop();
  }

  function withPendingAncestors(target: BuildTarget) {
    const chain: BuildTarget[] = [];

    for (let node: BuildTarget | null = target; node; node = node.parent) {
      if (node.planned || node.state !== 'pending') break;
      chain.push(node);
    }

    return chain;
  }

  function observeTargets() {
    targetObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(isWellInView)
          .map((entry) => targetByElement.get(entry.target as HTMLElement))
          .filter((target) => target !== undefined);
        const batch = [...new Set(visible.flatMap(withPendingAncestors))];

        batch.forEach((target) => targetObserver?.unobserve(target.el));
        planTargets(batch);
        completeIfIdle();
      },
      { threshold: VISIBILITY_THRESHOLDS }
    );

    targets.forEach((target) => targetObserver?.observe(target.el));
  }

  function advanceTyping(steps: BuildSteps, time: number, stageRect: DOMRect) {
    return steps.flatMap(({ id, cursor, target, typeStart, typeEnd }): CaretState[] => {
      if (!target.text || target.state !== 'revealing' || time < typeStart) return [];

      const caret = target.text.update(progressBetween(time, typeStart, typeEnd));
      return caret ? [{ id, cursor, ...caretBox(caret, stageRect) }] : [];
    });
  }

  function advanceTargets(steps: BuildSteps, time: number) {
    for (const { target, revealStart, settled } of steps) {
      if (target.state === 'pending' && time >= revealStart) reveal(target);
      if (target.state === 'revealing' && time >= settled) settle(target);
    }
  }

  function render(time: number) {
    if (!timeline) return;

    const stageRect = stage.getBoundingClientRect();
    const { cursors, frames } = timeline.sceneAt(time, measureOnce(stageRect));
    const carets = advanceTyping(timeline.steps, time, stageRect);

    advanceTargets(timeline.steps, time);
    overlay?.render({ cursors, frames, carets });
  }

  function tick(now: number) {
    clock += lastFrameAt ? Math.min(now - lastFrameAt, MAX_FRAME_GAP_MS) * pace() : 0;
    lastFrameAt = now;

    render(clock);

    if (timeline && clock < timeline.end) {
      frameRequest = requestAnimationFrame(tick);
      return;
    }

    frameRequest = 0;
    overlay?.render(null);
    completeIfIdle();
  }

  function runLoop() {
    if (frameRequest) return;

    lastFrameAt = 0;
    frameRequest = requestAnimationFrame(tick);
  }

  async function play() {
    if (!canAnimate() || phase === 'playing') return;
    if (phase !== 'pending') prepare();

    const run = ++playRun;
    phase = 'playing';
    stage.setAttribute(PLAYING_ATTRIBUTE, '');
    overlay = createOverlay(stage, resolveCursors(config.cursors));
    cancelScheduledStart();
    await document.fonts?.ready;
    if (phase !== 'playing' || run !== playRun) return;

    timeline = createTimeline(resolveCursors(config.cursors).length);
    clock = 0;

    if (config.progressive) {
      observeTargets();
      return;
    }

    planTargets(targets);
    completeIfIdle();
  }

  function stop() {
    cancelAnimationFrame(frameRequest);
    frameRequest = 0;
    cancelScheduledStart();
    targetObserver?.disconnect();
    targetObserver = null;
    targetWatcher?.disconnect();
    targetWatcher = null;
    timeline = null;
    targets.forEach(settle);
    targets = [];
    targetByElement.clear();
    overlay?.destroy();
    overlay = null;
    stage.removeAttribute(PLAYING_ATTRIBUTE);
  }

  function completeIfIdle() {
    if (phase !== 'playing' || frameRequest || config.hold) return;
    if (targets.every(isSettled)) finish();
  }

  function finish() {
    if (phase !== 'pending' && phase !== 'playing') return;

    stop();
    phase = 'done';
    config.onComplete?.();
  }

  function visibleCenter() {
    const rect = stage.getBoundingClientRect();
    const left = Math.max(rect.left, 0);
    const top = Math.max(rect.top, 0);
    const right = Math.min(rect.right, globalThis.innerWidth);
    const bottom = Math.min(rect.bottom, globalThis.innerHeight);

    return right > left && bottom > top ? { x: (left + right) / 2, y: (top + bottom) / 2 } : null;
  }

  function isUnobstructed() {
    const center = document.hidden ? null : visibleCenter();
    if (!center) return false;

    const root = stage.getRootNode();
    const hit = (root instanceof ShadowRoot ? root : document).elementFromPoint(center.x, center.y);
    return !!hit && (stage.contains(hit) || hit.contains(stage));
  }

  function isInsidePendingTarget() {
    return !!stage.parentElement?.closest(PENDING_TARGET_SELECTOR);
  }

  function scheduleStart() {
    if (phase !== 'pending' || startTimer) return;

    let deadline = performance.now() + OBSTRUCTION_LIMIT_MS;
    const attempt = () => {
      startTimer = undefined;
      if (phase !== 'pending') return;

      if (isInsidePendingTarget()) {
        deadline = performance.now() + OBSTRUCTION_LIMIT_MS;
      } else if (isUnobstructed() || performance.now() > deadline) {
        void play();
        return;
      }

      startTimer = setTimeout(attempt, OBSTRUCTION_RETRY_MS);
    };

    startTimer = setTimeout(attempt, START_DELAY_MS);
  }

  function cancelScheduledStart() {
    clearTimeout(startTimer);
    startTimer = undefined;
  }

  function onVisibilityChange(entries: IntersectionObserverEntry[]) {
    const entry = entries.at(-1);
    if (!entry) return;

    if (isWellInView(entry)) {
      scheduleStart();
    } else if (!entry.isIntersecting) {
      cancelScheduledStart();
      if (phase === 'playing') finish();
    }
  }

  function observeStage() {
    if (config.trigger !== 'visible' || stageObserver || !canObserve()) return;

    stageObserver = new IntersectionObserver(onVisibilityChange, {
      threshold: VISIBILITY_THRESHOLDS
    });
    stageObserver.observe(stage);
  }

  function unobserveStage() {
    stageObserver?.disconnect();
    stageObserver = null;
    cancelScheduledStart();
  }

  function finishOnInteraction(event: Event) {
    if (event.type === 'pointerdown' && (event as PointerEvent).pointerType === 'touch') return;

    const insideStage = event.composedPath().includes(stage);
    if (insideStage || phase === 'playing') finish();
  }

  function finishOnInnerScroll() {
    if (phase === 'playing' && !config.progressive) finish();
  }

  function finishIfNotAllowed() {
    if (!canAnimate()) finish();
  }

  function applySpeed() {
    stage.style.setProperty(DURATION_PROPERTY, `${Math.round(REVEAL_DURATION / pace())}ms`);
  }

  function update(next: BuildRevealOptions) {
    const previous = config;
    config = { ...config, ...definedOptions(next) };

    if (config.speed !== previous.speed) applySpeed();
    if (config.trigger !== previous.trigger) {
      if (config.trigger === 'visible') observeStage();
      else unobserveStage();
    }
    if (config.disabled && !previous.disabled) finishIfNotAllowed();
    if (previous.hold && !config.hold && targetWatcher) {
      adoptAddedNodes(targetWatcher.takeRecords());
      completeIfIdle();
    }
  }

  function destroy() {
    if (destroyed) return;

    destroyed = true;
    stop();
    unobserveStage();
    phase = 'done';
    cleanups.splice(0).forEach((cleanup) => cleanup());
    stage.removeAttribute(STAGE_ATTRIBUTE);
    stage.style.removeProperty(DURATION_PROPERTY);
    if (ownsPosition) stage.style.removeProperty('position');
    if (stage.getAttribute('style') === '') stage.removeAttribute('style');
  }

  const rootNode = stage.getRootNode();
  adoptStageStyles(rootNode instanceof ShadowRoot ? rootNode : document);
  stage.setAttribute(STAGE_ATTRIBUTE, '');
  if (getComputedStyle(stage).position === 'static') {
    stage.style.position = 'relative';
    ownsPosition = true;
  }
  applySpeed();

  listen(document, ['pointerdown', 'click', 'keydown'], finishOnInteraction, {
    capture: true,
    passive: true
  });
  listen(stage, ['scroll'], finishOnInnerScroll, { capture: true, passive: true });
  listen(stage, ['focusin'], finish);
  if (reducedMotion) listen(reducedMotion, ['change'], finishIfNotAllowed);
  cleanups.push(onBuildRevealSettingsChange(finishIfNotAllowed));

  if (canAnimate()) prepare();
  observeStage();

  return {
    get phase() {
      return phase;
    },
    play,
    finish,
    update,
    destroy
  };
}
