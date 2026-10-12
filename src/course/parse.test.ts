import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { countPieces, parseCourseMarkdown } from './parse';

const dataDir = join(import.meta.dirname, '../../data/courses');

function load(name: string): string {
  return readFileSync(join(dataDir, `${name}.md`), 'utf8');
}

describe('parseCourseMarkdown', () => {
  it('parses bundled courses with expected piece counts', () => {
    for (const [name, expected] of [
      ['cursor', 45],
      ['discrete', 57],
      ['claude', 41],
    ] as const) {
      const result = parseCourseMarkdown({
        markdown: load(name),
        courseId: name,
        builtin: true,
      });
      expect(result).not.toHaveProperty('kind');
      if ('kind' in result) return;
      expect(countPieces(result)).toBe(expected);
      expect(result.color).toMatch(/^#/);
      expect(result.image).toContain('images/');
    }
  });

  it('marks claude pieces from Пройдено list', () => {
    const result = parseCourseMarkdown({
      markdown: load('claude'),
      courseId: 'claude',
      builtin: true,
    });
    if ('kind' in result) throw new Error('parse failed');
    const cla13 = result.modules.flatMap((m) => m.pieces).find((p) => p.id === 'CLA-1.3');
    expect(cla13?.initiallyDone).toBe(true);
  });

  it('ignores sections without module id', () => {
    const md = `---
color: "#111111"
image: "images/x.svg"
---
# Test
## Что осталось
### FAKE-1 · Nope
## MOD-1 · Real
### MOD-1.1 · One
- **Цель:** goal
`;
    const result = parseCourseMarkdown({ markdown: md, courseId: 'test' });
    if ('kind' in result) throw new Error('parse failed');
    expect(result.modules).toHaveLength(1);
    expect(result.modules[0]?.id).toBe('MOD-1');
  });
});
