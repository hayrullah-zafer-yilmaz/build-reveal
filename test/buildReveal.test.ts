import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { createBuildReveal, setBuildRevealEnabled } from '../src';

type ObserverCallback = (entries: Partial<IntersectionObserverEntry>[]) => void;

const observers: { callback: ObserverCallback; observed: Set<Element> }[] = [];

function stageWith(html: string) {
  const stage = document.createElement('section');
  stage.innerHTML = html;
  document.body.append(stage);
  return stage;
}

function comeIntoView(el: Element) {
  const entry = {
    target: el,
    isIntersecting: true,
    intersectionRatio: 1,
    intersectionRect: el.getBoundingClientRect(),
    rootBounds: { height: 800 } as DOMRectReadOnly
  };
  observers.filter(({ observed }) => observed.has(el)).forEach(({ callback }) => callback([entry]));
}

function press(pointerType: 'mouse' | 'touch') {
  const event = new MouseEvent('pointerdown', { bubbles: true });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  return event;
}

class ObserverStub {
  readonly observed = new Set<Element>();

  constructor(readonly callback: ObserverCallback) {
    observers.push(this);
  }

  observe(el: Element) {
    this.observed.add(el);
  }

  unobserve(el: Element) {
    this.observed.delete(el);
  }

  disconnect() {
    this.observed.clear();
  }
}

vi.stubGlobal('IntersectionObserver', ObserverStub);
document.adoptedStyleSheets = [];

afterEach(() => {
  document.body.innerHTML = '';
  observers.length = 0;
  setBuildRevealEnabled(true);
});

describe('createBuildReveal', () => {
  it('hides targets until it plays and marks the stage', () => {
    const stage = stageWith('<p data-build>one</p><p class="build-reveal-target">two</p><p>three</p>');
    const reveal = createBuildReveal(stage, { trigger: 'manual' });

    expect(stage.hasAttribute('data-build-stage')).toBe(true);
    expect(stage.querySelectorAll('[data-build-state="pending"]')).toHaveLength(2);
    expect(reveal.phase).toBe('pending');
  });

  it('ignores targets that belong to a nested stage', () => {
    const stage = stageWith('<p data-build>outer</p><div data-build-stage><p data-build>inner</p></div>');
    createBuildReveal(stage, { trigger: 'manual' });

    expect(stage.querySelectorAll('[data-build-state="pending"]')).toHaveLength(1);
  });

  it('shows everything and reports completion on finish', () => {
    const onComplete = vi.fn();
    const stage = stageWith('<p data-build>one</p>');
    const reveal = createBuildReveal(stage, { trigger: 'manual', onComplete });

    reveal.finish();

    expect(stage.querySelector('[data-build-state]')).toBeNull();
    expect(onComplete).toHaveBeenCalledOnce();
    expect(reveal.phase).toBe('done');
  });

  it('finishes when the global switch is turned off', () => {
    const onComplete = vi.fn();
    const stage = stageWith('<p data-build>one</p>');
    createBuildReveal(stage, { trigger: 'manual', onComplete });

    setBuildRevealEnabled(false);

    expect(onComplete).toHaveBeenCalledOnce();
    expect(stage.querySelector('[data-build-state]')).toBeNull();
  });

  it('does nothing when disabled', () => {
    const stage = stageWith('<p data-build>one</p>');
    const reveal = createBuildReveal(stage, { disabled: true });

    expect(stage.querySelector('[data-build-state]')).toBeNull();
    expect(reveal.phase).toBe('idle');
  });

  it('shows everything where IntersectionObserver is missing, as in jsdom', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    onTestFinished(() => {
      vi.stubGlobal('IntersectionObserver', ObserverStub);
    });

    const stage = stageWith('<p data-build>one</p>');
    const reveal = createBuildReveal(stage);

    expect(reveal.phase).toBe('idle');
    expect(stage.querySelector('[data-build-state]')).toBeNull();
  });

  it('restores the stage on destroy', () => {
    const stage = stageWith('<p data-build>one</p>');
    createBuildReveal(stage, { trigger: 'manual', speed: 2 }).destroy();

    expect(stage.hasAttribute('data-build-stage')).toBe(false);
    expect(stage.hasAttribute('style')).toBe(false);
    expect(stage.querySelector('[data-build-state]')).toBeNull();
  });
});

describe('playback', () => {
  const box = { x: 0, y: 0, left: 0, top: 0, right: 100, bottom: 40, width: 100, height: 40 } as DOMRect;

  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance']
    });
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(box);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('reveals every target and completes', async () => {
    const onComplete = vi.fn();
    const stage = stageWith('<p data-build>one</p><p data-build="type">two</p>');
    const reveal = createBuildReveal(stage, { trigger: 'manual', onComplete });

    await reveal.play();
    expect(reveal.phase).toBe('playing');

    await vi.advanceTimersByTimeAsync(10_000);
    expect(reveal.phase).toBe('done');
    expect(stage.querySelector('[data-build-state]')).toBeNull();
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('still completes when play() is called again right after finish()', async () => {
    const stage = stageWith('<p data-build>one</p><p data-build>two</p>');
    const reveal = createBuildReveal(stage, { trigger: 'manual' });

    const first = reveal.play();
    reveal.finish();
    await Promise.all([first, reveal.play()]);
    await vi.advanceTimersByTimeAsync(10_000);

    expect(reveal.phase).toBe('done');
    expect(stage.querySelector('[data-build-state]')).toBeNull();
  });

  it('finishes on a mouse press anywhere', async () => {
    const reveal = createBuildReveal(stageWith('<p data-build>one</p>'), { trigger: 'manual' });
    await reveal.play();

    document.body.dispatchEvent(press('mouse'));

    expect(reveal.phase).toBe('done');
  });

  it('keeps playing through a touch that may turn into a scroll, and finishes on a tap', async () => {
    const reveal = createBuildReveal(stageWith('<p data-build>one</p>'), { trigger: 'manual' });
    await reveal.play();

    document.body.dispatchEvent(press('touch'));
    expect(reveal.phase).toBe('playing');

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(reveal.phase).toBe('done');
  });

  it('reveals a pending parent along with a child that scrolled into view first', async () => {
    const stage = stageWith('<div data-build><p data-build>child</p></div>');
    const reveal = createBuildReveal(stage, { trigger: 'manual', progressive: true });
    await reveal.play();

    comeIntoView(stage.querySelector('p')!);
    await vi.advanceTimersByTimeAsync(10_000);

    expect(stage.querySelector('[data-build-state]')).toBeNull();
    expect(reveal.phase).toBe('done');
  });

  it('starts right away when the stage is inside a shadow root', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.adoptedStyleSheets = [];
    shadow.innerHTML = '<section><p data-build>one</p></section>';
    const stage = shadow.querySelector('section')!;

    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: () => host });
    Object.defineProperty(shadow, 'elementFromPoint', { configurable: true, value: () => stage });
    onTestFinished(() => {
      Reflect.deleteProperty(document, 'elementFromPoint');
    });

    const reveal = createBuildReveal(stage);
    comeIntoView(stage);
    await vi.advanceTimersByTimeAsync(500);

    expect(reveal.phase).toBe('playing');
  });
});
