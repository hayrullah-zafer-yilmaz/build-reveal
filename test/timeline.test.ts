import { describe, expect, it } from 'vitest';
import { createTimeline, progressBetween, type BuildPlanEntry } from '../src/core/timeline';

const box = (x: number, y: number, width = 100, height = 40) => ({ x, y, width, height });

const entry = (
  target: string,
  at: ReturnType<typeof box>,
  parent: string | null = null,
  typedLength = 0
): BuildPlanEntry<string> => ({ target, box: at, parent, typedLength });

describe('progressBetween', () => {
  it('clamps to the 0..1 range', () => {
    expect(progressBetween(-5, 0, 10)).toBe(0);
    expect(progressBetween(5, 0, 10)).toBe(0.5);
    expect(progressBetween(50, 0, 10)).toBe(1);
  });

  it('jumps at the end of an empty interval', () => {
    expect(progressBetween(9, 10, 10)).toBe(0);
    expect(progressBetween(10, 10, 10)).toBe(1);
  });
});

describe('createTimeline', () => {
  it('plans targets in reading order', () => {
    const timeline = createTimeline<string>(1);
    timeline.add([entry('bottom', box(0, 200)), entry('right', box(300, 0)), entry('left', box(0, 4))], 0);

    expect(timeline.steps.map((step) => step.target)).toEqual(['left', 'right', 'bottom']);
  });

  it('reveals children only after their parent starts revealing', () => {
    const timeline = createTimeline<string>(3);
    timeline.add([entry('child', box(10, 10, 50, 20), 'parent'), entry('parent', box(0, 0, 400, 200))], 0);

    const [parent, child] = timeline.steps;
    expect(parent?.target).toBe('parent');
    expect(child!.drawStart).toBeGreaterThan(parent!.revealStart);
  });

  it('spreads work across cursors', () => {
    const timeline = createTimeline<string>(3);
    timeline.add(
      Array.from({ length: 6 }, (_, index) => entry(`item-${index}`, box(index * 120, 0))),
      0
    );

    expect(new Set(timeline.steps.map((step) => step.cursor)).size).toBe(3);
  });

  it('gives typed targets a typing window', () => {
    const timeline = createTimeline<string>(1);
    timeline.add([entry('text', box(0, 0), null, 40)], 0);

    const [step] = timeline.steps;
    expect(step!.typeEnd).toBeGreaterThan(step!.typeStart);
    expect(timeline.end).toBeGreaterThanOrEqual(step!.settled);
  });

  it('draws nothing once the timeline has ended', () => {
    const timeline = createTimeline<string>(2);
    timeline.add([entry('a', box(0, 0)), entry('b', box(200, 0))], 0);

    const scene = timeline.sceneAt(timeline.end + 1, () => box(0, 0));
    expect(scene).toEqual({ cursors: [], frames: [] });
  });

  it('appends later batches after the given start time', () => {
    const timeline = createTimeline<string>(1);
    timeline.add([entry('first', box(0, 0))], 0);
    timeline.add([entry('late', box(0, 100))], 5000);

    expect(timeline.steps[1]!.drawStart).toBeGreaterThanOrEqual(5000);
  });

  it('lets cursors fly in for batches added later', () => {
    const timeline = createTimeline<string>(1);
    timeline.add([entry('first', box(0, 0))], 0);
    timeline.add([entry('late', box(0, 300))], 5000);

    const late = timeline.steps[1]!;
    expect(late.depart).toBeGreaterThanOrEqual(5000);
    expect(late.drawStart).toBeGreaterThan(late.depart);
  });
});
