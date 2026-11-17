import { describe, expect, it } from 'vitest';
import {
  cursorAt,
  keystrokesOf,
  planStep,
  readingTime,
  rippleAt,
  selectionAt,
  typedAt
} from '../src/tour/plan';

const frame = { x: 100, y: 100, width: 200, height: 60 };
const rest = { x: 200, y: 130 };

describe('planStep', () => {
  it('orders the phases: travel, draw, move to the action, press, type', () => {
    const plan = planStep({ from: { x: 0, y: 0 }, frame, rest, click: true, typedLength: 8, motion: 1, sameTarget: false });

    expect(plan.drawStart).toBeGreaterThan(0);
    expect(plan.drawEnd).toBeGreaterThan(plan.drawStart);
    expect(plan.actEnd).toBeGreaterThan(plan.drawEnd);
    expect(plan.pressEnd).toBeGreaterThan(plan.pressStart);
    expect(plan.typeStart).toBe(plan.pressEnd);
    expect(plan.typeEnd).toBeGreaterThan(plan.typeStart);
    expect(plan.settled).toBe(Math.max(plan.rippleEnd, plan.typeEnd));
  });

  it('collapses to the final scene without motion', () => {
    const plan = planStep({ from: null, frame, rest, click: true, typedLength: 8, motion: 0, sameTarget: false });
    const pose = cursorAt(plan, 0, null, frame, rest, false, 1);

    expect(plan.settled).toBe(0);
    expect(selectionAt(plan, 0, frame)).toEqual({ box: frame, selected: true });
    expect(pose.x).toBeCloseTo(rest.x);
    expect(pose.y).toBeCloseTo(rest.y);
    expect(pose.opacity).toBe(1);
    expect(rippleAt(plan, 0)).toBeNull();
  });

  it('skips travelling and drawing when the step stays on the same target', () => {
    const plan = planStep({ from: rest, frame, rest, click: false, typedLength: 0, motion: 1, sameTarget: true });

    expect(plan.drawEnd).toBe(0);
    expect(plan.settled).toBe(0);
    expect(selectionAt(plan, 0, frame)).toEqual({ box: frame, selected: true });
  });
});

describe('cursorAt', () => {
  it('fades in from an offset when the cursor enters', () => {
    const plan = planStep({ from: null, frame, rest, click: false, typedLength: 0, motion: 1, sameTarget: false });

    expect(cursorAt(plan, 0, null, frame, rest, false, 1).opacity).toBe(0);
    expect(cursorAt(plan, plan.drawStart, null, frame, rest, false, 1)).toMatchObject({ x: frame.x, y: frame.y, opacity: 1 });
  });

  it('drags from the top-left corner to the bottom-right corner while drawing', () => {
    const plan = planStep({ from: { x: 0, y: 0 }, frame, rest, click: false, typedLength: 0, motion: 1, sameTarget: false });
    const end = cursorAt(plan, plan.drawEnd - 0.001, { x: 0, y: 0 }, frame, rest, false, 1);

    expect(end.x).toBeCloseTo(frame.x + frame.width, 0);
    expect(end.y).toBeCloseTo(frame.y + frame.height, 0);
  });

  it('presses down while clicking and comes back up', () => {
    const plan = planStep({ from: { x: 0, y: 0 }, frame, rest, click: true, typedLength: 0, motion: 1, sameTarget: false });
    const middle = (plan.pressStart + plan.pressEnd) / 2;

    expect(cursorAt(plan, middle, { x: 0, y: 0 }, frame, rest, false, 1).scale).toBeLessThan(1);
    expect(cursorAt(plan, plan.pressEnd, { x: 0, y: 0 }, frame, rest, false, 1).scale).toBeCloseTo(1);
    expect(rippleAt(plan, middle)).not.toBeNull();
  });
});

describe('typing', () => {
  it('types letter by letter, never stops on a space, and ends with the full text', () => {
    const text = 'Fatura 2026';
    const keys = keystrokesOf(text);
    const plan = planStep({ from: null, frame, rest, click: false, typedLength: text.length, motion: 1, sameTarget: false });
    const samples = Array.from({ length: 60 }, (_, i) =>
      typedAt(keys, plan, plan.typeStart + ((plan.typeEnd - plan.typeStart) * i) / 59)
    );

    samples.forEach((typed, i) => {
      expect(text.startsWith(typed)).toBe(true);
      expect(typed.endsWith(' ')).toBe(false);
      expect(typed.length).toBeGreaterThanOrEqual(samples[i - 1]?.length ?? 0);
    });
    expect(typedAt(keys, plan, plan.typeStart)).toBe('');
    expect(samples.at(-1)).toBe(text);
  });

  it('gives longer captions more reading time, within limits', () => {
    expect(readingTime('Short')).toBe(2500);
    expect(readingTime('word '.repeat(10))).toBeGreaterThan(readingTime('word '.repeat(5)));
    expect(readingTime('word '.repeat(100))).toBe(10000);
  });
});
