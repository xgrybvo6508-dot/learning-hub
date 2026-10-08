import type { MindmapScoresSnapshot } from '../../memory/schema';

export const SCORE_CRITERIA = [
  'structure',
  'chunking',
  'relations',
  'coverage',
  'overall',
] as const;

export type ScoreCriterion = (typeof SCORE_CRITERIA)[number];

export const CRITERION_LABELS: Record<ScoreCriterion, string> = {
  structure: 'Structure',
  chunking: 'Chunking',
  relations: 'Relations',
  coverage: 'Coverage',
  overall: 'Overall',
};

export function sparklinePath(values: readonly number[], width: number, height: number): string {
  if (values.length === 0) return '';
  const pad = 2;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const step = values.length > 1 ? innerW / (values.length - 1) : 0;
  const points = values.map((v, i) => {
    const x = pad + i * step;
    const clamped = Math.max(0, Math.min(10, v));
    const y = pad + innerH - (clamped / 10) * innerH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return `M ${points.join(' L ')}`;
}

export function historySeries(
  records: ReadonlyArray<{ scores: MindmapScoresSnapshot }>,
  criterion: ScoreCriterion,
): number[] {
  return records.map((r) => r.scores[criterion]);
}
