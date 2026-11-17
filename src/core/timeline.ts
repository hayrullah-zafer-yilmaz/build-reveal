export interface Point {
  x: number;
  y: number;
}

export interface Box extends Point {
  width: number;
  height: number;
}

export interface BuildPlanEntry<T> {
  target: T;
  box: Box;
  parent: T | null;
  typedLength: number;
}

export interface BuildStep<T> {
  id: number;
  target: T;
  cursor: number;
  enters: boolean;
  depart: number;
  drawStart: number;
  drawEnd: number;
  revealStart: number;
  typeStart: number;
  typeEnd: number;
  settled: number;
  end: number;
}

export interface CursorState extends Point {
  cursor: number;
  opacity: number;
}

export interface FrameState {
  id: number;
  cursor: number;
  box: Box;
  size: string;
  opacity: number;
  measured: boolean;
  selected: boolean;
}

export interface CaretState extends Box {
  id: number;
  cursor: number;
}

export interface BuildScene {
  cursors: CursorState[];
  frames: FrameState[];
}

export interface RevealScene extends BuildScene {
  carets: CaretState[];
}

export interface BuildTimeline<T> {
  readonly steps: readonly BuildStep<T>[];
  readonly end: number;
  add(entries: BuildPlanEntry<T>[], startAt: number): void;
  sceneAt(time: number, boxOf: (target: T) => Box): BuildScene;
}

interface CursorLane<T> {
  steps: BuildStep<T>[];
  freeAt: number;
  at: Point | null;
}

export const REVEAL_DURATION = 380;

const FRAME_PADDING = 6;
const ROW_TOLERANCE = 16;
const STAGGER = 70;
const ENTER_DURATION = 400;
const ENTER_OFFSET: Point = { x: 44, y: 60 };
const EXIT_DURATION = 360;
const EXIT_DRIFT: Point = { x: 14, y: 20 };
const REENTRY_GAP = ENTER_DURATION + EXIT_DURATION;
const FRAME_FADE = 240;
const TRAILING = Math.max(FRAME_FADE, EXIT_DURATION);
const HOLD = 120;
const REVEAL_AT = 0.7;
const TYPE_AT = 0.8;
const CHILD_DELAY = 0.5;
const ARC = 0.12;
const SIZE_LABEL_AFTER = 0.3;
const SIZE_LABEL_MIN_HEIGHT = 28;

const TRAVEL = { base: 150, perPixel: 0.32, min: 200, max: 480 };
const DRAW = { base: 200, perPixel: 0.16, min: 280, max: 480 };
const TYPING = { perCharacter: 10, min: 220, max: 800 };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const progressBetween = (time: number, start: number, end: number) =>
  end > start ? clamp((time - start) / (end - start), 0, 1) : Number(time >= end);

const minimumJerk = (t: number) => t * t * t * (10 + t * (6 * t - 15));

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

const framed = (box: Box): Box => ({
  x: box.x - FRAME_PADDING,
  y: box.y - FRAME_PADDING,
  width: box.width + FRAME_PADDING * 2,
  height: box.height + FRAME_PADDING * 2
});

const bottomRight = (box: Box): Point => ({ x: box.x + box.width, y: box.y + box.height });

const shifted = (point: Point, by: Point, amount = 1): Point => ({
  x: point.x + by.x * amount,
  y: point.y + by.y * amount
});

const distance = (from: Point, to: Point) => Math.hypot(to.x - from.x, to.y - from.y);

const travelDuration = (from: Point, to: Point) =>
  clamp(TRAVEL.base + distance(from, to) * TRAVEL.perPixel, TRAVEL.min, TRAVEL.max);

const drawDuration = (box: Box) =>
  clamp(DRAW.base + Math.hypot(box.width, box.height) * DRAW.perPixel, DRAW.min, DRAW.max);

const typingDuration = (length: number) =>
  clamp(length * TYPING.perCharacter, TYPING.min, TYPING.max);

function arcBetween(from: Point, to: Point, t: number, bend: number): Point {
  const eased = minimumJerk(t);
  const lift = Math.sin(Math.PI * eased) * ARC * bend;

  return {
    x: from.x + (to.x - from.x) * eased - (to.y - from.y) * lift,
    y: from.y + (to.y - from.y) * eased + (to.x - from.x) * lift
  };
}

function readingOrder<T>(entries: BuildPlanEntry<T>[]) {
  const rows: BuildPlanEntry<T>[][] = [];

  for (const entry of [...entries].sort((a, b) => a.box.y - b.box.y)) {
    const row = rows.at(-1);
    if (row && entry.box.y - row[0]!.box.y <= ROW_TOLERANCE) row.push(entry);
    else rows.push([entry]);
  }

  return rows.flatMap((row) => row.sort((a, b) => a.box.x - b.box.x));
}

function approach<T>(
  { freeAt, at }: CursorLane<T>,
  cursor: number,
  frame: Box,
  earliest: number,
  startAt: number
) {
  const enters = !at || earliest - freeAt > REENTRY_GAP;
  const travel = at && !enters ? travelDuration(at, frame) : ENTER_DURATION;
  const depart = Math.max(freeAt, earliest - travel, startAt);
  return { cursor, enters, depart, arrive: depart + travel };
}

function cursorAt<T>(
  lane: BuildStep<T>[],
  cursor: number,
  time: number,
  boxOf: (target: T) => Box
): CursorState | null {
  const index = lane.filter((step) => step.depart <= time).length - 1;
  const step = lane[index];
  if (!step) return null;

  const frame = framed(boxOf(step.target));

  if (time < step.drawStart) {
    const previous = step.enters ? undefined : lane[index - 1];
    const from = previous
      ? bottomRight(framed(boxOf(previous.target)))
      : shifted(frame, ENTER_OFFSET);
    const t = progressBetween(time, step.depart, step.drawStart);
    const position = arcBetween(from, frame, t, cursor % 2 ? -1 : 1);

    return { cursor, ...position, opacity: previous ? 1 : easeOutCubic(t) };
  }

  if (time < step.drawEnd) {
    const t = minimumJerk(progressBetween(time, step.drawStart, step.drawEnd));
    return { cursor, x: frame.x + frame.width * t, y: frame.y + frame.height * t, opacity: 1 };
  }

  const rest = bottomRight(frame);
  const next = lane[index + 1];
  if (time < step.end || (next && !next.enters)) return { cursor, ...rest, opacity: 1 };

  const t = progressBetween(time, step.end, step.end + EXIT_DURATION);
  if (t >= 1) return null;

  return { cursor, ...shifted(rest, EXIT_DRIFT, easeOutCubic(t)), opacity: 1 - t };
}

function frameAt<T>(
  step: BuildStep<T>,
  time: number,
  boxOf: (target: T) => Box
): FrameState | null {
  if (time < step.drawStart || time >= step.end + FRAME_FADE) return null;

  const box = boxOf(step.target);
  const drag = progressBetween(time, step.drawStart, step.drawEnd);
  const t = minimumJerk(drag);
  const frame = framed(box);

  return {
    id: step.id,
    cursor: step.cursor,
    box: { x: frame.x, y: frame.y, width: frame.width * t, height: frame.height * t },
    size: `${Math.round(box.width * t)} × ${Math.round(box.height * t)}`,
    opacity: 1 - progressBetween(time, step.end, step.end + FRAME_FADE),
    measured: drag >= SIZE_LABEL_AFTER && box.height >= SIZE_LABEL_MIN_HEIGHT,
    selected: time >= step.drawEnd
  };
}

export function createTimeline<T>(cursorCount: number): BuildTimeline<T> {
  const lanes: CursorLane<T>[] = Array.from({ length: Math.max(1, cursorCount) }, () => ({
    steps: [],
    freeAt: 0,
    at: null
  }));
  const steps: BuildStep<T>[] = [];
  const stepByTarget = new Map<T, BuildStep<T>>();
  const lastDrawBySiblings = new Map<T | null, number>();
  let end = 0;

  function readyAt({ parent }: BuildPlanEntry<T>, startAt: number) {
    const parentStep = parent === null ? undefined : stepByTarget.get(parent);
    const parentReady = parentStep ? parentStep.revealStart + REVEAL_DURATION * CHILD_DELAY : 0;
    const siblingReady = (lastDrawBySiblings.get(parent) ?? -Infinity) + STAGGER;
    return Math.max(startAt, parentReady, siblingReady);
  }

  function nextReady(queue: BuildPlanEntry<T>[], unplaced: Set<T>, startAt: number) {
    let pick = 0;
    let earliest = Infinity;

    queue.forEach((entry, index) => {
      if (entry.parent !== null && unplaced.has(entry.parent)) return;

      const ready = readyAt(entry, startAt);
      if (ready < earliest) {
        pick = index;
        earliest = ready;
      }
    });

    return pick;
  }

  function place(entry: BuildPlanEntry<T>, startAt: number) {
    const { target, box, parent, typedLength } = entry;
    const frame = framed(box);
    const earliest = readyAt(entry, startAt);

    const { cursor, enters, depart, arrive } = lanes
      .map((lane, index) => approach(lane, index, frame, earliest, startAt))
      .reduce((best, next) => (next.arrive < best.arrive ? next : best));

    const draw = drawDuration(frame);
    const drawEnd = arrive + draw;
    const revealStart = arrive + draw * REVEAL_AT;
    const typeStart = arrive + draw * TYPE_AT;
    const typeEnd = typedLength ? typeStart + typingDuration(typedLength) : typeStart;

    const step: BuildStep<T> = {
      id: steps.length,
      target,
      cursor,
      enters,
      depart,
      drawStart: arrive,
      drawEnd,
      revealStart,
      typeStart,
      typeEnd,
      settled: Math.max(drawEnd, revealStart + REVEAL_DURATION, typeEnd),
      end: Math.max(drawEnd, typeEnd) + HOLD
    };

    const lane = lanes[cursor]!;
    lane.steps.push(step);
    lane.freeAt = step.end;
    lane.at = bottomRight(frame);

    steps.push(step);
    stepByTarget.set(target, step);
    lastDrawBySiblings.set(parent, step.drawStart);
    end = Math.max(end, step.end + TRAILING, step.settled);
  }

  return {
    steps,

    get end() {
      return end;
    },

    add(entries, startAt) {
      const queue = readingOrder(entries);
      const unplaced = new Set(queue.map((entry) => entry.target));

      while (queue.length) {
        const [entry] = queue.splice(nextReady(queue, unplaced, startAt), 1);
        if (!entry) break;

        unplaced.delete(entry.target);
        place(entry, startAt);
      }
    },

    sceneAt(time, boxOf) {
      return {
        cursors: lanes
          .map((lane, cursor) => cursorAt(lane.steps, cursor, time, boxOf))
          .filter((state) => state !== null),
        frames: steps.map((step) => frameAt(step, time, boxOf)).filter((frame) => frame !== null)
      };
    }
  };
}
