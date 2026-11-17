import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineBuildRevealElement, type BuildRevealElement } from '../src/element';

vi.stubGlobal(
  'IntersectionObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
);
document.adoptedStyleSheets = [];
defineBuildRevealElement();

afterEach(() => {
  document.body.innerHTML = '';
});

function mount(html = '<p data-build>one</p>') {
  const el = document.createElement('build-reveal');
  el.innerHTML = html;
  document.body.append(el);
  return el;
}

describe('<build-reveal>', () => {
  it('becomes a stage when connected', () => {
    const el = mount();

    expect(el.hasAttribute('data-build-stage')).toBe(true);
    expect(el.querySelectorAll('[data-build-state="pending"]')).toHaveLength(1);
    expect(el.phase).toBe('pending');
  });

  it('reflects option properties to attributes', () => {
    const el = mount();
    el.speed = 1.5;
    el.trigger = 'manual';
    el.hold = true;

    expect(el.getAttribute('speed')).toBe('1.5');
    expect(el.getAttribute('trigger')).toBe('manual');
    expect(el.hasAttribute('hold')).toBe(true);

    el.hold = false;
    expect(el.hasAttribute('hold')).toBe(false);
  });

  it('keeps properties set before the element was defined', () => {
    const el = document.createElement('late-reveal') as BuildRevealElement;
    el.cursors = [{ label: 'Ada' }];
    el.speed = 2;
    document.body.append(el);

    defineBuildRevealElement('late-reveal');

    expect(Object.hasOwn(el, 'cursors')).toBe(false);
    expect(el.cursors).toEqual([{ label: 'Ada' }]);
    expect(el.getAttribute('speed')).toBe('2');
  });

  it('dispatches complete when it finishes', () => {
    const el = mount();
    const onComplete = vi.fn();
    el.addEventListener('complete', onComplete);

    el.finish();

    expect(onComplete).toHaveBeenCalledOnce();
    expect(el.querySelector('[data-build-state]')).toBeNull();
  });
});
