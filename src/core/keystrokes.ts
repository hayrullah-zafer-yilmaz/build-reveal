export const WHITESPACE = /\s/;

const PUNCTUATION = /[.,;:!?]/;
const WORD_PAUSE = 1.8;
const PUNCTUATION_PAUSE = 2.6;

function keystrokeJitter(index: number) {
  const noise = Math.sin(index * 12.9898) * 43758.5453;
  return 0.7 + 0.6 * (noise - Math.floor(noise));
}

export function keystrokeWeight(previous: string, index: number) {
  const pause = PUNCTUATION.test(previous)
    ? PUNCTUATION_PAUSE
    : WHITESPACE.test(previous)
      ? WORD_PAUSE
      : 1;
  return pause * keystrokeJitter(index);
}

export function cumulativeShares(weights: number[]) {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let reached = 0;
  return weights.map((weight) => (reached += weight) / total);
}

export function countReached(thresholds: number[], progress: number) {
  let low = 0;
  let high = thresholds.length;

  while (low < high) {
    const middle = (low + high) >> 1;
    if (thresholds[middle]! <= progress) low = middle + 1;
    else high = middle;
  }

  return low;
}
