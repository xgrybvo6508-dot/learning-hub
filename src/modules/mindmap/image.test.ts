import { describe, expect, it } from 'vitest';
import { scaledDimensions, tileRects2x2 } from './image';

describe('scaledDimensions', () => {
  it('keeps small images unchanged', () => {
    expect(scaledDimensions(800, 600, 2048)).toEqual({ width: 800, height: 600 });
  });

  it('scales down so the long side is at most 2048', () => {
    const { width, height } = scaledDimensions(4000, 2000, 2048);
    expect(Math.max(width, height)).toBe(2048);
    expect(width / height).toBeCloseTo(2, 5);
  });
});

describe('tileRects2x2', () => {
  it('returns four overlapping tiles covering the image', () => {
    const rects = tileRects2x2(1000, 800, 0.15);
    expect(rects).toHaveLength(4);
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.width).toBeLessThanOrEqual(1000);
      expect(r.y + r.height).toBeLessThanOrEqual(800);
    }
    const last = rects[3];
    expect(last?.x).toBeGreaterThan(0);
    expect(last?.y).toBeGreaterThan(0);
  });
});
