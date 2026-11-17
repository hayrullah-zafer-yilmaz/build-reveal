import { countReached, cumulativeShares, keystrokeWeight, WHITESPACE } from '../core/keystrokes';
import {
  arcBetween,
  bottomRight,
  clamp,
  distance,
  drawDuration,
  easeOutCubic,
  ENTER_DURATION,
  ENTER_OFFSET,
  EXIT_DRIFT,
  minimumJerk,
  progressBetween,
  shifted,
  travelDuration,
  type Box,
  type Point
} from '../core/motion';

export interface StepPlan {
  enters: boolean;
  drawStart: number;
  drawEnd: number;
  actEnd: number;
  pressStart: number;
  pressEnd: number;
  rippleEnd: number;
  typeStart: number;
  typeEnd: number;
  settled: number;
}

export interface CursorPose extends Point {
  opacity: number;
  scale: number;
}

export interface Keystrokes {
  text: string;
  ends: number[];
  thresholds: number[];
}

export interface StepInput {
  from: Point | null;
  frame: Box;
  rest: Point;
  click: boolean;
  typedLength: number;
  motion: number;
  sameTarget: boolean;
}

export interface Ripple {
  radius: number;
  opacity: number;
}

const PRESS_DURATION = 180;
const PRESS_DEPTH = 0.14;
const RIPPLE_DURATION = 480;
const RIPPLE_RADIUS = { from: 4, to: 22 };
const TYPING = { perCharacter: 85, min: 450, max: 2400 };
const READING = { base: 1200, perWord: 280, min: 2500, max: 10000 };

const topLeft = ({ x, y }: Box): Point => ({ x, y });

const legDuration = (from: Point, to: Point) => (distance(from, to) < 1 ? 0 : travelDuration(from, to));

export const typingDuration = (length: number) =>
  length ? clamp(length * TYPING.perCharacter, TYPING.min, TYPING.max) : 0;

export function planStep({ from, frame, rest, click, typedLength, motion, sameTarget }: StepInput): StepPlan {
  const enters = !from;
  const travel = sameTarget ? 0 : from ? travelDuration(from, topLeft(frame)) : ENTER_DURATION;
  const drawStart = travel * motion;
  const drawEnd = drawStart + (sameTarget ? 0 : drawDuration(frame)) * motion;
  const legStart = sameTarget && from ? from : bottomRight(frame);
  const actEnd = drawEnd + legDuration(legStart, rest) * motion;
  const pressEnd = actEnd + (click ? PRESS_DURATION : 0) * motion;
  const rippleEnd = actEnd + (click ? RIPPLE_DURATION : 0) * motion;
  const typeEnd = pressEnd + typingDuration(typedLength) * motion;

  return {
    enters,
    drawStart,
    drawEnd,
    actEnd,
    pressStart: actEnd,
    pressEnd,
    rippleEnd,
    typeStart: pressEnd,
    typeEnd,
    settled: Math.max(rippleEnd, typeEnd)
  };
}

export function cursorAt(
  plan: StepPlan,
  time: number,
  from: Point | null,
  frame: Box,
  rest: Point,
  sameTarget: boolean,
  bend: number
): CursorPose {
  const start = topLeft(frame);
  const end = bottomRight(frame);

  if (!sameTarget && time < plan.drawStart) {
    const origin = from ?? shifted(start, ENTER_OFFSET);
    const t = progressBetween(time, 0, plan.drawStart);
    return { ...arcBetween(origin, start, t, bend), opacity: from ? 1 : easeOutCubic(t), scale: 1 };
  }

  if (!sameTarget && time < plan.drawEnd) {
    const t = minimumJerk(progressBetween(time, plan.drawStart, plan.drawEnd));
    return { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t, opacity: 1, scale: 1 };
  }

  const legStart = sameTarget && from ? from : end;
  const point = arcBetween(legStart, rest, progressBetween(time, plan.drawEnd, plan.actEnd), -bend);
  const press = Math.sin(Math.PI * progressBetween(time, plan.pressStart, plan.pressEnd));
  return { ...point, opacity: 1, scale: 1 - PRESS_DEPTH * press };
}

export function selectionAt(plan: StepPlan, time: number, frame: Box) {
  if (time < plan.drawStart) return null;

  const t = minimumJerk(progressBetween(time, plan.drawStart, plan.drawEnd));
  return {
    box: { x: frame.x, y: frame.y, width: frame.width * t, height: frame.height * t },
    selected: time >= plan.drawEnd
  };
}

export function rippleAt(plan: StepPlan, time: number): Ripple | null {
  if (plan.rippleEnd <= plan.pressStart || time < plan.pressStart || time >= plan.rippleEnd) return null;

  const t = progressBetween(time, plan.pressStart, plan.rippleEnd);
  return {
    radius: RIPPLE_RADIUS.from + (RIPPLE_RADIUS.to - RIPPLE_RADIUS.from) * easeOutCubic(t),
    opacity: 1 - t
  };
}

export function keystrokesOf(text: string): Keystrokes {
  const ends: number[] = [];
  const weights: number[] = [];
  let previous = '';
  let offset = 0;

  for (const character of text) {
    offset += character.length;
    if (!WHITESPACE.test(character)) {
      ends.push(offset);
      weights.push(keystrokeWeight(previous, weights.length));
    }
    previous = character;
  }

  return { text, ends, thresholds: cumulativeShares(weights) };
}

export function typedAt(keys: Keystrokes, plan: StepPlan, time: number) {
  const progress = progressBetween(time, plan.typeStart, plan.typeEnd);
  if (progress >= 1) return keys.text;

  const typed = countReached(keys.thresholds, progress);
  return keys.text.slice(0, typed ? keys.ends[typed - 1] : 0);
}

export function readingTime(text: string) {
  const words = text.split(/\s+/).filter(Boolean).length;
  return clamp(READING.base + words * READING.perWord, READING.min, READING.max);
}

export function exitPose(from: CursorPose, t: number): CursorPose {
  return { ...shifted(from, EXIT_DRIFT, easeOutCubic(t)), opacity: from.opacity * (1 - t), scale: 1 };
}
