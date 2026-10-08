import { isRecord, isSafeKey, own } from '../lib/guards';
import { err, ok, type Result } from '../lib/result';
import { migrate } from './migrate';
import { MEMORY_VERSION, type HubMemoryV1 } from './schema';
import type { MemoryStore, MemoryStoreError } from './store';

export const EXPORT_VERSION = 1;

export interface HubExport {
  readonly app: 'learning-hub';
  readonly kind: 'hub-export';
  readonly exportVersion: typeof EXPORT_VERSION;
  readonly memoryVersion: number;
  readonly exportedAt: string;
  readonly data: HubMemoryV1;
}

export type ImportErrorKind = 'not-json' | 'wrong-file' | 'newer-file' | 'corrupt';

export interface ImportError {
  readonly kind: ImportErrorKind;
  readonly message: string;
}

export class MemoryExportError extends Error {
  override readonly name = 'MemoryExportError';
  readonly userMessage =
    'Data could not be exported because some saved data could not be read. Your data was not changed.';

  constructor(options?: { cause?: unknown }) {
    super(
      'Data could not be exported because some saved data could not be read. Your data was not changed.',
      options,
    );
  }
}

const IMPORT_MESSAGES: Readonly<Record<ImportErrorKind, string>> = {
  'not-json': 'This file could not be read. Choose a file that was made with "Export data".',
  'wrong-file': 'This file is not a Learning Hub data export.',
  'newer-file': 'This file comes from a newer version of the app. Update the app and try again.',
  corrupt: 'Some data in this file could not be read, so nothing was imported.',
};

const importError = (kind: ImportErrorKind): ImportError => ({
  kind,
  message: IMPORT_MESSAGES[kind],
});

export function buildExport(memory: HubMemoryV1, now: number): HubExport {
  const clean = migrate(memory, now);
  if (!clean.ok) throw new MemoryExportError({ cause: clean.error });
  return {
    app: 'learning-hub',
    kind: 'hub-export',
    exportVersion: EXPORT_VERSION,
    memoryVersion: MEMORY_VERSION,
    exportedAt: new Date(now).toISOString(),
    data: clean.value,
  };
}

export function serializeExport(memory: HubMemoryV1, now: number): string {
  return JSON.stringify(buildExport(memory, now), null, 2);
}

export function exportFileName(now: number): string {
  const d = new Date(now);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `learning-hub-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
}

export function parseImport(text: string, now: number): Result<HubMemoryV1, ImportError> {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return err(importError('not-json'));
  }
  if (
    !isRecord(data) ||
    own(data, 'app') !== 'learning-hub' ||
    own(data, 'kind') !== 'hub-export'
  ) {
    return err(importError('wrong-file'));
  }
  const exportVersion = own(data, 'exportVersion');
  if (typeof exportVersion !== 'number' || exportVersion > EXPORT_VERSION)
    return err(importError('newer-file'));
  const migrated = migrate(own(data, 'data'), now);
  if (!migrated.ok) {
    return err(importError(migrated.error.kind === 'future-version' ? 'newer-file' : 'corrupt'));
  }
  return ok(migrated.value);
}

export interface ImportPreview {
  readonly mistakes: number;
  readonly courses: number;
  readonly sessions: number;
  readonly newMistakes: number;
}

export function previewImport(current: HubMemoryV1, incoming: HubMemoryV1): ImportPreview {
  const known = new Set(current.mistakes.map((m) => m.id));
  return {
    mistakes: incoming.mistakes.length,
    courses: incoming.courses.length,
    sessions: incoming.sessions.length,
    newMistakes: incoming.mistakes.filter((m) => !known.has(m.id)).length,
  };
}

function newerByUpdatedAt<T extends { updatedAt: number }>(a: T, b: T): T {
  return b.updatedAt >= a.updatedAt ? b : a;
}

function newerSession(
  a: HubMemoryV1['sessions'][number],
  b: HubMemoryV1['sessions'][number],
): HubMemoryV1['sessions'][number] {
  return b.at >= a.at ? b : a;
}

export function mergeMemory(current: HubMemoryV1, incoming: HubMemoryV1, now: number): HubMemoryV1 {
  const mistakes = new Map<string, HubMemoryV1['mistakes'][number]>();
  for (const m of [...current.mistakes, ...incoming.mistakes]) {
    const prev = mistakes.get(m.id);
    mistakes.set(m.id, prev ? newerByUpdatedAt(prev, m) : m);
  }

  const courses = new Map<string, HubMemoryV1['courses'][number]>();
  for (const c of [...current.courses, ...incoming.courses]) {
    const prev = courses.get(c.slug);
    courses.set(c.slug, prev ? newerByUpdatedAt(prev, c) : c);
  }

  const sessions = new Map<string, HubMemoryV1['sessions'][number]>();
  for (const s of [...current.sessions, ...incoming.sessions]) {
    const prev = sessions.get(s.id);
    sessions.set(s.id, prev ? newerSession(prev, s) : s);
  }

  const interleave = { ...current.interleave };
  for (const key of Object.keys(incoming.interleave)) {
    if (!isSafeKey(key)) continue;
    const inc = incoming.interleave[key];
    if (!inc) continue;
    const cur = interleave[key];
    if (!cur || inc.updatedAt >= cur.updatedAt) interleave[key] = inc;
  }

  const mergeById = <T extends { id: string; updatedAt?: number }>(a: T[], b: T[]): T[] => {
    const map = new Map<string, T>();
    for (const item of [...a, ...b]) {
      const prev = map.get(item.id);
      if (!prev) map.set(item.id, item);
      else if ((item.updatedAt ?? 0) >= (prev.updatedAt ?? 0)) map.set(item.id, item);
    }
    return [...map.values()];
  };

  const exports = [current.lastExportAt, incoming.lastExportAt].filter(
    (t): t is number => t !== null,
  );

  return {
    version: MEMORY_VERSION,
    createdAt: Math.min(current.createdAt, incoming.createdAt),
    updatedAt: now,
    mistakes: [...mistakes.values()],
    courses: [...courses.values()],
    sessions: [...sessions.values()],
    mindmap: mergeById(current.mindmap, incoming.mindmap),
    ankiDecks: mergeById(current.ankiDecks, incoming.ankiDecks),
    feynman: mergeById(current.feynman, incoming.feynman),
    interleave,
    voice: mergeById(current.voice, incoming.voice),
    lastExportAt: exports.length > 0 ? Math.max(...exports) : null,
  };
}

export type ImportMode = 'merge' | 'replace';

export async function applyImport(
  store: Pick<MemoryStore, 'get' | 'replace' | 'backup' | 'flush'>,
  incoming: HubMemoryV1,
  mode: ImportMode,
  now: number,
): Promise<Result<HubMemoryV1, MemoryStoreError>> {
  const backup = await store.backup();
  if (!backup.ok) return backup;
  const next = mode === 'merge' ? mergeMemory(store.get(), incoming, now) : incoming;
  store.replace(next);
  const saved = await store.flush();
  return saved.ok ? ok(store.get()) : saved;
}

export function markExported(memory: HubMemoryV1, now: number): HubMemoryV1 {
  return { ...memory, lastExportAt: now };
}

/** Ensures exported JSON never contains settings or keys. */
export function exportExcludesSecrets(text: string): boolean {
  return !/\bapiKey\b/i.test(text) && !/sk-[a-zA-Z0-9]{8,}/.test(text);
}
