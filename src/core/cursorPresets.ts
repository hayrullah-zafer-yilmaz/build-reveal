import type { BuildCursor } from './overlay';

const COMPLEMENTARY_HUE = 180;
const HUE_STEP = 15;

export function complementaryCursors(count: number): BuildCursor[] {
  return Array.from({ length: count }, (_, index) => ({
    hue: COMPLEMENTARY_HUE + (index - (count - 1) / 2) * HUE_STEP
  }));
}
