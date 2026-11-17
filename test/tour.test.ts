import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { setBuildRevealEnabled } from '../src';
import { createTour, type Tour, type TourOptions, type TourStep } from '../src/tour';

const rects = new Map<Element, DOMRect>();
const tours: Tour[] = [];

function rectOf(x: number, y: number, width: number, height: number) {
  return { x, y, left: x, top: y, right: x + width, bottom: y + height, width, height, toJSON: () => ({}) } as DOMRect;
}

const VIEWPORT = rectOf(0, 0, 1024, 768);

function invoicePage() {
  document.body.innerHTML = `
    <button id="before">Help</button>
    <input id="search" placeholder="Search…" />
    <button id="filter">Filter</button>
    <button id="export">Export</button>
  `;
  const $ = (selector: string) => document.querySelector<HTMLElement>(selector)!;
  rects.set($('#search'), rectOf(40, 40, 300, 36));
  rects.set($('#filter'), rectOf(360, 40, 90, 36));
  rects.set($('#export'), rectOf(40, 400, 120, 36));
  return $;
}

const steps = (): TourStep[] => [
  { target: '#search', caption: 'Search for an invoice', type: 'Invoice 2026' },
  { target: '#filter', caption: 'Filter by date', click: true },
  { target: '#export', caption: 'Export it' }
];

function tourOf(tourSteps: TourStep[], options?: TourOptions) {
  const tour = createTour(tourSteps, options);
  tours.push(tour);
  return tour;
}

const host = () => document.querySelector('[data-build-tour]');
const shadow = () => host()!.shadowRoot!;
const panel = () => shadow().querySelector<HTMLElement>('.panel')!;
const panelButton = (name: 'back' | 'next' | 'close') => shadow().querySelector<HTMLButtonElement>(`.${name}`)!;
const textOf = (selector: string) => shadow().querySelector(selector)!.textContent;
const currentFrame = () => shadow().querySelectorAll<HTMLElement>('.frame')[1]!;
const press = (target: EventTarget, key: string) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true }));
const wait = (ms: number) => vi.advanceTimersByTimeAsync(ms);

function deepFocus() {
  let focused = document.activeElement;
  while (focused?.shadowRoot?.activeElement) focused = focused.shadowRoot.activeElement;
  return focused;
}

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance']
  });
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    return rects.get(this) ?? VIEWPORT;
  });
  vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
  document.adoptedStyleSheets = [];
});

afterEach(() => {
  tours.splice(0).forEach((tour) => tour.destroy());
  rects.clear();
  document.body.innerHTML = '';
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  setBuildRevealEnabled(true);
});

describe('createTour', () => {
  it('starts on the first step, focuses the panel and announces the step', async () => {
    invoicePage();
    const onStep = vi.fn();
    const tour = tourOf(steps(), { onStep });

    tour.start();

    expect(tour.active).toBe(true);
    expect(tour.step).toBe(0);
    expect(onStep).toHaveBeenCalledWith(0);
    expect(deepFocus()).toBe(panel());
    expect(textOf('.caption')).toBe('Search for an invoice');
    expect(textOf('.progress')).toBe('1 / 3');

    await wait(3000);
    expect(panel().classList.contains('shown')).toBe(true);
    expect(textOf('[role="status"]')).toBe('1 / 3. Search for an invoice');
  });

  it('moves between steps with next, back and goTo', () => {
    invoicePage();
    const onStep = vi.fn();
    const tour = tourOf(steps(), { onStep });

    tour.start();
    tour.next();
    expect(tour.step).toBe(1);
    expect(textOf('.caption')).toBe('Filter by date');

    tour.back();
    tour.goTo(2);
    expect(textOf('.progress')).toBe('3 / 3');
    expect(panelButton('next').textContent).toBe('Done');
    expect(onStep.mock.calls.map(([index]) => index)).toEqual([0, 1, 0, 2]);
  });

  it('ends as completed after the last step, restores focus and cleans up', async () => {
    const $ = invoicePage();
    $('#before').focus();
    const onEnd = vi.fn();
    const tour = tourOf(steps(), { onEnd });

    tour.start();
    await wait(2000);
    panelButton('next').click();
    panelButton('next').click();
    panelButton('next').click();

    expect(onEnd).toHaveBeenCalledWith(true);
    expect(tour.active).toBe(false);
    expect(tour.step).toBe(-1);
    expect(document.activeElement).toBe($('#before'));

    await wait(1000);
    expect(host()).toBeNull();
  });

  it('ends as not completed with the close button or Escape', () => {
    invoicePage();
    const onEnd = vi.fn();
    const tour = tourOf(steps(), { onEnd });

    tour.start();
    panelButton('close').click();
    expect(onEnd).toHaveBeenLastCalledWith(false);

    tour.start();
    press(document.body, 'Escape');
    expect(onEnd).toHaveBeenCalledTimes(2);
    expect(onEnd).toHaveBeenLastCalledWith(false);
  });

  it('leaves Escape alone while the user types in a page field', () => {
    const $ = invoicePage();
    const tour = tourOf(steps());

    tour.start();
    $('#search').focus();
    press($('#search'), 'Escape');

    expect(tour.active).toBe(true);
  });

  it('handles arrow keys inside the panel only', () => {
    invoicePage();
    const tour = tourOf(steps());

    tour.start();
    press(document.body, 'ArrowRight');
    expect(tour.step).toBe(0);

    press(panel(), 'ArrowRight');
    expect(tour.step).toBe(1);

    press(panel(), 'ArrowLeft');
    expect(tour.step).toBe(0);
  });

  it('keeps clicks in the panel away from the page', () => {
    invoicePage();
    const outside = vi.fn();
    document.addEventListener('click', outside);
    onTestFinished(() => document.removeEventListener('click', outside));
    const tour = tourOf(steps());

    tour.start();
    panelButton('next').click();

    expect(tour.step).toBe(1);
    expect(outside).not.toHaveBeenCalled();
  });

  it('waits for a target that appears late and skips one that never does', async () => {
    invoicePage();
    const onStep = vi.fn();
    const tour = tourOf(
      [
        { target: '#late', caption: 'Late' },
        { target: '#missing', caption: 'Missing' },
        { target: '#filter', caption: 'Filter' }
      ],
      { onStep }
    );

    tour.start();
    await wait(1000);
    document.body.append(Object.assign(document.createElement('button'), { id: 'late' }));
    await wait(1000);
    expect(tour.step).toBe(0);
    expect(currentFrame().style.visibility).toBe('visible');

    tour.next();
    await wait(3200);
    expect(tour.step).toBe(2);
    expect(onStep.mock.calls.map(([index]) => index)).toEqual([0, 1, 2]);
  });

  it('accepts selectors, elements and functions, and rejects invalid selectors right away', async () => {
    const $ = invoicePage();
    const tour = tourOf([
      { target: $('#search'), caption: 'Element' },
      { target: () => $('#filter'), caption: 'Function' },
      { target: '#export', caption: 'Selector' }
    ]);

    tour.start();
    for (const expected of ['translate3d(34px, 34px, 0px)', 'translate3d(354px, 34px, 0px)', 'translate3d(34px, 394px, 0px)']) {
      await wait(1500);
      expect(currentFrame().style.transform).toBe(expected);
      tour.next();
    }

    expect(() => createTour([{ target: 'button[', caption: 'Broken' }])).toThrow();
  });

  it('only shows actions: it never clicks, focuses or types into the page', async () => {
    const $ = invoicePage();
    const pageEvents = vi.fn();
    for (const type of ['click', 'pointerdown', 'mousedown', 'focus', 'input', 'change', 'keydown']) {
      $('#search').addEventListener(type, pageEvents);
      $('#filter').addEventListener(type, pageEvents);
    }
    const tour = tourOf(steps());

    tour.start();
    await wait(1500);
    expect($('#search').hasAttribute('data-build-tour-typing')).toBe(true);
    expect(textOf('.ghost')!.length).toBeGreaterThan(0);

    await wait(2000);
    expect(textOf('.ghost')).toBe('Invoice 2026');

    tour.next();
    expect($('#search').hasAttribute('data-build-tour-typing')).toBe(false);
    await wait(2000);

    expect(pageEvents).not.toHaveBeenCalled();
    expect(($('#search') as HTMLInputElement).value).toBe('');
    expect($('#search').getAttribute('placeholder')).toBe('Search…');
  });

  it('lines the ghost text up with the field text, whatever clientLeft reports', async () => {
    const $ = invoicePage();
    const search = $('#search');
    search.style.border = '2px solid';
    search.style.padding = '0 10px';
    Object.defineProperty(search, 'clientLeft', { configurable: true, value: 12 });
    const tour = tourOf(steps());

    tour.start();
    await wait(3500);

    expect(shadow().querySelector<HTMLElement>('.ghost')!.style.transform).toBe('translate3d(52px, 42px, 0px)');
  });

  it('types into the panel when the field already has a value', async () => {
    const $ = invoicePage();
    ($('#search') as HTMLInputElement).value = 'draft';
    const tour = tourOf(steps());

    tour.start();
    await wait(3500);

    expect(textOf('.typed')).toBe('Invoice 2026');
    expect(textOf('.ghost')).toBe('');
    expect(($('#search') as HTMLInputElement).value).toBe('draft');
  });

  it('shows each step complete right away when the user prefers reduced motion', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('reduce'),
      media: query,
      addEventListener() {},
      removeEventListener() {}
    }));
    invoicePage();
    const tour = tourOf(steps());

    tour.start();
    await wait(50);

    expect(currentFrame().classList.contains('selected')).toBe(true);
    expect(textOf('.ghost')).toBe('Invoice 2026');
    expect(panel().classList.contains('shown')).toBe(true);
  });

  it('keeps working when animations are switched off globally', async () => {
    setBuildRevealEnabled(false);
    invoicePage();
    const tour = tourOf(steps());

    tour.start();
    await wait(3000);

    expect(tour.active).toBe(true);
    expect(panel().classList.contains('shown')).toBe(true);
  });

  it('advances by itself with autoplay, waits while hovered and stops after Back', async () => {
    invoicePage();
    const tour = tourOf(steps(), { autoplay: true });

    tour.start();
    await wait(5500);
    expect(tour.step).toBe(1);

    panel().dispatchEvent(new Event('pointerenter'));
    await wait(10000);
    expect(tour.step).toBe(1);

    panel().dispatchEvent(new Event('pointerleave'));
    tour.back();
    await wait(12000);
    expect(tour.step).toBe(0);
  });

  it('rests between frames once idle and follows the target as soon as the page scrolls', async () => {
    const $ = invoicePage();
    const tour = tourOf(steps());

    tour.start();
    await wait(4000);
    const frames = vi.spyOn(window, 'requestAnimationFrame');
    while (!frames.mock.calls.length) await wait(1);
    await wait(20);

    const before = currentFrame().style.transform;
    rects.set($('#search'), rectOf(40, 240, 300, 36));
    await wait(20);
    expect(currentFrame().style.transform).toBe(before);

    document.dispatchEvent(new Event('scroll'));
    await wait(20);
    expect(currentFrame().style.transform).toBe('translate3d(34px, 234px, 0px)');
  });

  it('scrolls a target outside the viewport into view', () => {
    const $ = invoicePage();
    rects.set($('#export'), rectOf(40, 2000, 120, 36));
    const root = document.documentElement;
    Object.defineProperty(root, 'scrollHeight', { configurable: true, value: 4000 });
    Object.defineProperty(root, 'clientHeight', { configurable: true, value: 768 });
    onTestFinished(() => {
      Reflect.deleteProperty(root, 'scrollHeight');
      Reflect.deleteProperty(root, 'clientHeight');
    });
    const tour = tourOf(steps());

    tour.start(2);

    expect(window.scrollBy).toHaveBeenCalledWith({ left: 0, top: 1634, behavior: 'smooth' });
  });

  it('runs one tour at a time', () => {
    invoicePage();
    const onEnd = vi.fn();
    const first = tourOf(steps(), { onEnd });
    const second = tourOf(steps());

    first.start();
    second.start();

    expect(first.active).toBe(false);
    expect(onEnd).toHaveBeenCalledWith(false);
    expect(second.active).toBe(true);
    expect(document.querySelectorAll('[data-build-tour]')).toHaveLength(1);
  });

  it('removes everything on destroy without calling onEnd', () => {
    invoicePage();
    const onEnd = vi.fn();
    const tour = tourOf(steps(), { onEnd });

    tour.start();
    tour.destroy();
    tour.start();

    expect(host()).toBeNull();
    expect(tour.active).toBe(false);
    expect(onEnd).not.toHaveBeenCalled();
  });

  it('uses custom labels', () => {
    invoicePage();
    const tour = tourOf(steps(), {
      labels: {
        next: 'İleri',
        back: 'Geri',
        done: 'Bitti',
        close: 'Turu kapat',
        tour: 'Rehberli tur',
        progress: (step, total) => `Adım ${step}/${total}`
      }
    });

    tour.start();
    expect(panelButton('next').textContent).toBe('İleri');
    expect(panelButton('back').textContent).toBe('Geri');
    expect(panelButton('close').getAttribute('aria-label')).toBe('Turu kapat');
    expect(panel().getAttribute('aria-label')).toBe('Rehberli tur');
    expect(textOf('.progress')).toBe('Adım 1/3');

    tour.goTo(2);
    expect(panelButton('next').textContent).toBe('Bitti');
  });
});
