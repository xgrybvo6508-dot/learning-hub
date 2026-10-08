import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../lib/random';
import { pickInterleaveOrder, type InterleaveItem } from './interleave-picker';

const items: InterleaveItem[] = [
  { id: 'a', topicId: 'logic', pool: 'mistake', priority: 10 },
  { id: 'b', topicId: 'logic', pool: 'course', priority: 5 },
  { id: 'c', topicId: 'graphs', pool: 'mindmap', priority: 8 },
  { id: 'd', topicId: 'sets', pool: 'anki', priority: 6 },
];

describe('interleave picker', () => {
  it('never places the same topic twice in a row when alternatives exist', () => {
    const order = pickInterleaveOrder({ items, rng: mulberry32(42) });
    expect(order.length).toBe(items.length);
    for (let i = 1; i < order.length; i++) {
      const prev = order[i - 1]?.topicId;
      const cur = order[i]?.topicId;
      const others = new Set(items.map((x) => x.topicId));
      if (others.size > 1 && prev === cur) {
        const couldAvoid = items.some(
          (x) => x.topicId !== prev && !order.slice(0, i).some((o) => o.id === x.id),
        );
        expect(couldAvoid).toBe(false);
      }
    }
  });

  it('is deterministic for the same seed', () => {
    const a = pickInterleaveOrder({ items, rng: mulberry32(7) });
    const b = pickInterleaveOrder({ items, rng: mulberry32(7) });
    expect(a.map((x) => x.id)).toEqual(b.map((x) => x.id));
  });

  it('returns empty for an empty pool', () => {
    expect(pickInterleaveOrder({ items: [], rng: mulberry32(1) })).toEqual([]);
  });
});
