import { describe, expect, it } from 'vitest';
import { dockEdge, placePanel } from '../src/tour/placement';
import { scrollDelta } from '../src/tour/scroll';

const view = { left: 0, top: 0, right: 1000, bottom: 800 };
const size = { width: 300, height: 120 };
const edges = (left: number, top: number, right: number, bottom: number) => ({ left, top, right, bottom });

describe('placePanel', () => {
  it('goes below the target, leaving room for the cursor', () => {
    expect(placePanel(edges(100, 100, 300, 160), size, view, 28)).toEqual({ x: 100, y: 188 });
  });

  it('goes above the target when there is no room below', () => {
    expect(placePanel(edges(100, 700, 300, 760), size, view, 28)).toEqual({ x: 100, y: 568 });
  });

  it('stays inside the viewport horizontally', () => {
    expect(placePanel(edges(900, 100, 980, 160), size, view, 28).x).toBe(688);
  });

  it('moves to the edge away from a target that leaves no room above or below', () => {
    expect(placePanel(edges(0, 50, 1000, 790), size, view, 28)).toEqual({ x: 12, y: 12 });
    expect(placePanel(edges(0, 10, 1000, 750), size, view, 28)).toEqual({ x: 12, y: 668 });
  });

  it('sits at the bottom center without a target', () => {
    expect(placePanel(null, size, view, 28)).toEqual({ x: 350, y: 668 });
  });
});

describe('dockEdge', () => {
  it('docks at the bottom when the target is above the panel', () => {
    expect(dockEdge(edges(0, 100, 100, 500), view, 120)).toBe('bottom');
  });

  it('moves to the top when the target would sit under the panel', () => {
    expect(dockEdge(edges(0, 700, 100, 760), view, 120)).toBe('top');
  });

  it('stays at the bottom when the target leaves no room at the top either', () => {
    expect(dockEdge(edges(0, 50, 100, 790), view, 120)).toBe('bottom');
  });
});

describe('scrollDelta', () => {
  it('does not scroll a target that is comfortably in view', () => {
    expect(scrollDelta(edges(100, 100, 300, 160), view)).toEqual({ left: 0, top: 0 });
  });

  it('centers a target that fits in the view', () => {
    expect(scrollDelta(edges(0, 1000, 100, 1100), view).top).toBe(650);
  });

  it('aligns the start of a target taller than the view', () => {
    expect(scrollDelta(edges(0, 1000, 100, 3000), view).top).toBe(976);
  });
});
