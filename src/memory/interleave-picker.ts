import { weightedChoice, type Rng } from '../lib/random';

export interface InterleaveItem {
  readonly id: string;
  readonly topicId: string;
  readonly pool: string;
  readonly priority: number;
}

export interface PickInterleaveInput {
  readonly items: readonly InterleaveItem[];
  readonly rng: Rng;
}

/**
 * Orders items for a study block: higher priority first, never two adjacent items
 * with the same topic when another topic is available. Deterministic for a seeded rng.
 */
export function pickInterleaveOrder(input: PickInterleaveInput): InterleaveItem[] {
  const remaining = [...input.items].sort((a, b) => b.priority - a.priority);
  const out: InterleaveItem[] = [];
  while (remaining.length > 0) {
    const lastTopic = out.at(-1)?.topicId;
    const varied = lastTopic
      ? remaining.filter((i) => i.topicId !== lastTopic)
      : remaining;
    const pool = varied.length > 0 ? varied : remaining;
    const choice = weightedChoice(
      pool.map((item) => ({ item, weight: Math.max(0.1, item.priority) })),
      input.rng,
    );
    if (!choice) break;
    out.push(choice);
    const idx = remaining.findIndex((i) => i.id === choice.id);
    if (idx >= 0) remaining.splice(idx, 1);
  }
  return out;
}
