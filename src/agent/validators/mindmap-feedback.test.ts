import { describe, expect, it } from 'vitest';
import { parseMindmapFeedback, validateMindmapFeedbackRecord } from './mindmap-feedback';

const minimalValid = {
  read: {
    core: 'Graphs and trees.',
    clusters: [{ name: 'Graphs', nodes: ['vertices', 'edges'] }],
    relations: [{ from: 'Graphs', to: 'Trees', label: 'special case' }],
    unreadable: ['smudged word top-right'],
  },
  scores: {
    structure: 6,
    chunking: 5,
    relations: 4,
    coverage: 7,
    overall: 5,
  },
  strengths: ['Clear center'],
  issues: [{ type: 'relations', detail: 'Few cross-links between chunks.' }],
  missing: ['Hamilton path'],
  nextDrill: 'Redraw with three labeled cross-links.',
};

describe('validateMindmapFeedbackRecord', () => {
  it('accepts a minimal valid payload', () => {
    const result = validateMindmapFeedbackRecord(minimalValid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.scores.overall).toBe(5);
      expect(result.value.issues[0]?.type).toBe('relations');
    }
  });

  it('rejects missing read.core', () => {
    const result = validateMindmapFeedbackRecord({
      ...minimalValid,
      read: {
        clusters: minimalValid.read.clusters,
        relations: minimalValid.read.relations,
        unreadable: minimalValid.read.unreadable,
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('read.core');
  });

  it('rejects wrong issue type', () => {
    const result = validateMindmapFeedbackRecord({
      ...minimalValid,
      issues: [{ type: 'lecture', detail: 'Too much text.' }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('issues[0].type');
  });

  it('rejects out-of-range scores', () => {
    const result = validateMindmapFeedbackRecord({
      ...minimalValid,
      scores: { ...minimalValid.scores, overall: 11 },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('scores.overall');
  });

  it('rejects non-integer scores', () => {
    const result = validateMindmapFeedbackRecord({
      ...minimalValid,
      scores: { ...minimalValid.scores, chunking: 6.5 },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('scores.chunking');
  });

  it('enforces strength cap', () => {
    const result = validateMindmapFeedbackRecord({
      ...minimalValid,
      strengths: ['a', 'b', 'c', 'd'],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('strengths');
  });

  it('enforces issue cap', () => {
    const issues = Array.from({ length: 6 }, (_, i) => ({
      type: 'gap',
      detail: `issue ${i}`,
    }));
    const result = validateMindmapFeedbackRecord({ ...minimalValid, issues });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('issues');
  });

  it('enforces missing cap', () => {
    const missing = Array.from({ length: 6 }, (_, i) => `item ${i}`);
    const result = validateMindmapFeedbackRecord({ ...minimalValid, missing });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('missing');
  });

  it('requires null or string relation labels', () => {
    const result = validateMindmapFeedbackRecord({
      ...minimalValid,
      read: {
        ...minimalValid.read,
        relations: [{ from: 'a', to: 'b', label: 3 }],
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('label');
  });
});

describe('parseMindmapFeedback', () => {
  it('parses markdown-fenced JSON', () => {
    const text = `Here is the feedback:\n\`\`\`json\n${JSON.stringify(minimalValid)}\n\`\`\``;
    const result = parseMindmapFeedback(text);
    expect(result.ok).toBe(true);
  });

  it('parses JSON buried in prose', () => {
    const result = parseMindmapFeedback(`Done. ${JSON.stringify(minimalValid)} Thanks.`);
    expect(result.ok).toBe(true);
  });

  it('rejects malformed JSON', () => {
    const result = parseMindmapFeedback('{"read": {');
    expect(result.ok).toBe(false);
  });

  it('rejects non-object JSON', () => {
    const result = parseMindmapFeedback('[1,2,3]');
    expect(result.ok).toBe(false);
  });
});
