export interface Point {
  x: number;
  y: number;
}

export interface Box extends Point {
  width: number;
  height: number;
}

export const FRAME_PADDING = 6;
export const ENTER_DURATION = 400;
export const ENTER_OFFSET: Point = { x: 44, y: 60 };
export const EXIT_DURATION = 360;
export const EXIT_DRIFT: Point = { x: 14, y: 20 };
export const FRAME_FADE = 240;
export const MIN_SPEED = 0.1;
export const MAX_FRAME_GAP_MS = 48;
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const ARC = 0.12;
const TRAVEL = { base: 150, perPixel: 0.32, min: 200, max: 480 };
const DRAW = { base: 200, perPixel: 0.16, min: 280, max: 480 };

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const progressBetween = (time: number, start: number, end: number) =>
  end > start ? clamp((time - start) / (end - start), 0, 1) : Number(time >= end);

export const minimumJerk = (t: number) => t * t * t * (10 + t * (6 * t - 15));

export const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

export const framed = (box: Box): Box => ({
  x: box.x - FRAME_PADDING,
  y: box.y - FRAME_PADDING,
  width: box.width + FRAME_PADDING * 2,
  height: box.height + FRAME_PADDING * 2
});

export const bottomRight = (box: Box): Point => ({ x: box.x + box.width, y: box.y + box.height });

export const shifted = (point: Point, by: Point, amount = 1): Point => ({
  x: point.x + by.x * amount,
  y: point.y + by.y * amount
});

export const distance = (from: Point, to: Point) => Math.hypot(to.x - from.x, to.y - from.y);

export const travelDuration = (from: Point, to: Point) =>
  clamp(TRAVEL.base + distance(from, to) * TRAVEL.perPixel, TRAVEL.min, TRAVEL.max);

export const drawDuration = (box: Box) =>
  clamp(DRAW.base + Math.hypot(box.width, box.height) * DRAW.perPixel, DRAW.min, DRAW.max);

export function arcBetween(from: Point, to: Point, t: number, bend: number): Point {
  const eased = minimumJerk(t);
  const lift = Math.sin(Math.PI * eased) * ARC * bend;

  return {
    x: from.x + (to.x - from.x) * eased - (to.y - from.y) * lift,
    y: from.y + (to.y - from.y) * eased + (to.x - from.x) * lift
  };
}
