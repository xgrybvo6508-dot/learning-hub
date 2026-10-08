import { describe, expect, it } from 'vitest';
import {
  applyImport,
  buildExport,
  exportExcludesSecrets,
  mergeMemory,
  parseImport,
  previewImport,
  serializeExport,
} from './export';
import type { ImportErrorKind } from './export';
import { migrate } from './migrate';
import { emptyMemory, type HubMemoryV1 } from './schema';
import { BACKUP_KEY, createMemoryStore, MemoryStoreError } from './store';
import { createFakeStore } from './storage/fake';

const T0 = Date.UTC(2026, 9, 8, 12);

function memoryWithMistake(): HubMemoryV1 {
  const base = emptyMemory(T0);
  return {
    ...base,
    mistakes: [
      {
        id: 'm1',
        createdAt: T0,
        updatedAt: T0,
        wrong: 'x',
        cause: 'misread',
        fix: 'y',
        topic: 'logic',
        card: {
          problemId: 'm1',
          ease: 2.5,
          intervalDays: 1,
          reps: 1,
          lapses: 0,
          dueAt: T0 + 86_400_000,
          lastSeenAt: T0,
          lastOutcome: 'incorrect',
        },
      },
    ],
    courses: [{ slug: 'demo', updatedAt: T0, body: '# Course', progress: { 'item-1': { done: true } } }],
  };
}

describe('hub export', () => {
  it('round-trips a valid export through JSON and migration', () => {
    const memory = memoryWithMistake();
    const text = serializeExport(memory, T0);
    const parsed = parseImport(text, T0 + 1000);
    const clean = migrate(memory, T0);
    expect(clean.ok).toBe(true);
    expect(parsed).toEqual(clean);
    expect(JSON.parse(text)).toEqual(buildExport(memory, T0));
    expect(exportExcludesSecrets(text)).toBe(true);
  });

  it('previews counts and new mistake ids', () => {
    const current = memoryWithMistake();
    const incoming = {
      ...memoryWithMistake(),
      mistakes: [
        ...current.mistakes,
        {
          ...current.mistakes[0]!,
          id: 'm2',
          updatedAt: T0 + 1,
        },
      ],
    };
    expect(previewImport(current, incoming)).toEqual({
      mistakes: 2,
      courses: 1,
      sessions: 0,
      newMistakes: 1,
    });
  });

  it('merge keeps newer course progress by updatedAt', () => {
    const a = memoryWithMistake();
    const b = {
      ...emptyMemory(T0),
      courses: [
        {
          slug: 'demo',
          updatedAt: T0 + 100,
          body: '# Updated',
          progress: { 'item-1': { done: false } },
        },
      ],
    };
    const merged = mergeMemory(a, b, T0 + 200);
    expect(merged.courses[0]?.progress['item-1']?.done).toBe(false);
    expect(merged.courses[0]?.body).toBe('# Updated');
  });

  it('rejects invalid and unrelated files', () => {
    const expectKind = (text: string, kind: ImportErrorKind): void => {
      const result = parseImport(text, T0);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe(kind);
    };
    expectKind('not json', 'not-json');
    expectKind(JSON.stringify({ app: 'other' }), 'wrong-file');
  });

  it('applyImport backs up before merge', async () => {
    const local = createFakeStore();
    const store = createMemoryStore({
      hub: null,
      primary: local,
      local,
      clock: { now: () => T0 },
      scheduler: {
        setTimeout: (fn) => {
          fn();
          return 0;
        },
        clearTimeout: () => undefined,
      },
      debounceMs: 0,
    });
    await store.load();
    const incoming = memoryWithMistake();
    const result = await applyImport(store, incoming, 'replace', T0);
    expect(result.ok).toBe(true);
    expect(await local.get(BACKUP_KEY)).toBeDefined();
  });

  it('returns backup error without changing memory', async () => {
    const local = createFakeStore();
    local.failing.add('set');
    const store = createMemoryStore({
      hub: null,
      primary: local,
      local,
      clock: { now: () => T0 },
    });
    await store.load();
    const before = store.get();
    const result = await applyImport(store, memoryWithMistake(), 'merge', T0);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(MemoryStoreError);
    expect(store.get()).toEqual(before);
  });
});
