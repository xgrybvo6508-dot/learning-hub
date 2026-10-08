import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import drillsMarkdown from '../../../content/courses/mindmapping-drills.md?raw';
import {
  allMindmapDrills,
  BUILTIN_FALLBACK_DRILLS,
  parseMindmappingDrillsMarkdown,
} from './drills';

describe('parseMindmappingDrillsMarkdown', () => {
  it('parses numbered drills from the bundled file', () => {
    const drills = parseMindmappingDrillsMarkdown(drillsMarkdown);
    expect(drills.length).toBeGreaterThanOrEqual(12);
    const first = drills.find((d) => d.id === 'drill-1');
    expect(first?.title).toContain('Чанкинг');
    expect(first?.minutes).toBe(5);
    expect(first?.instruction.length).toBeGreaterThan(20);
    expect(first?.success.length).toBeGreaterThan(10);
    expect(first?.aiNote.length).toBeGreaterThan(5);
  });

  it('reads the on-disk mindmapping-drills.md the same way', () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
    const disk = readFileSync(join(root, 'content/courses/mindmapping-drills.md'), 'utf8');
    expect(parseMindmappingDrillsMarkdown(disk).length).toBe(
      parseMindmappingDrillsMarkdown(drillsMarkdown).length,
    );
  });
});

describe('allMindmapDrills', () => {
  it('returns bundled drills plus course modules', () => {
    const drills = allMindmapDrills();
    expect(drills.some((d) => d.source === 'bundled')).toBe(true);
    expect(drills.some((d) => d.source === 'course')).toBe(true);
    expect(drills.length).toBeGreaterThan(BUILTIN_FALLBACK_DRILLS.length);
  });
});
