import { getBuiltinCourses } from '../course/bundled';
import { parseCourseMarkdown } from '../course/parse';
import type { Course } from '../course/types';
import { isRecord } from '../lib/guards';

const STORAGE_KEY = 'learning-hub-tracker:v1';

export type TrackerSnapshotV1 = {
  version: 1;
  donePieceIds: string[];
  customCourses: Course[];
  hiddenBuiltinIds: string[];
};

export type TrackerStore = {
  getCourses(): Course[];
  getDoneIds(): Set<string>;
  isDone(pieceId: string): boolean;
  setDone(pieceId: string, done: boolean): void;
  addCustomCourse(course: Course): void;
  removeCourse(courseId: string): void;
  exportJson(): string;
  importJson(raw: string): { ok: true } | { ok: false; message: string };
  subscribe(listener: () => void): () => void;
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export function createTrackerStore(storage: StorageLike): TrackerStore {
  let snapshot = loadSnapshot(storage);
  const listeners = new Set<() => void>();

  const notify = (): void => {
    for (const l of listeners) l();
  };

  const persist = (): void => {
    storage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    notify();
  };

  const getCourses = (): Course[] => {
    const hidden = new Set(snapshot.hiddenBuiltinIds);
    const builtins = getBuiltinCourses().filter((c) => !hidden.has(c.id));
    return [...builtins, ...snapshot.customCourses];
  };

  const seedInitialDone = (): void => {
    const done = new Set(snapshot.donePieceIds);
    let changed = false;
    for (const course of getCourses()) {
      for (const mod of course.modules) {
        for (const piece of mod.pieces) {
          if (piece.initiallyDone && !done.has(piece.id)) {
            done.add(piece.id);
            changed = true;
          }
        }
      }
    }
    if (changed) {
      snapshot = { ...snapshot, donePieceIds: [...done] };
      persist();
    }
  };

  seedInitialDone();

  return {
    getCourses,
    getDoneIds: () => new Set(snapshot.donePieceIds),
    isDone: (pieceId) => snapshot.donePieceIds.includes(pieceId),
    setDone(pieceId, done) {
      const set = new Set(snapshot.donePieceIds);
      if (done) set.add(pieceId);
      else set.delete(pieceId);
      snapshot = { ...snapshot, donePieceIds: [...set] };
      persist();
    },
    addCustomCourse(course) {
      snapshot = {
        ...snapshot,
        customCourses: [...snapshot.customCourses.filter((c) => c.id !== course.id), course],
      };
      seedInitialDone();
      persist();
    },
    removeCourse(courseId) {
      const builtin = getBuiltinCourses().some((c) => c.id === courseId);
      if (builtin) {
        const hidden = new Set(snapshot.hiddenBuiltinIds);
        hidden.add(courseId);
        snapshot = { ...snapshot, hiddenBuiltinIds: [...hidden] };
      } else {
        snapshot = {
          ...snapshot,
          customCourses: snapshot.customCourses.filter((c) => c.id !== courseId),
        };
      }
      persist();
    },
    exportJson() {
      return JSON.stringify(snapshot, null, 2);
    },
    importJson(raw) {
      try {
        const parsed: unknown = JSON.parse(raw);
        const migrated = migrateSnapshot(parsed);
        if (!migrated) {
          return { ok: false, message: 'Файл не похож на экспорт трекера.' };
        }
        snapshot = migrated;
        seedInitialDone();
        persist();
        return { ok: true };
      } catch {
        return { ok: false, message: 'Не удалось прочитать JSON.' };
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function loadSnapshot(storage: StorageLike): TrackerSnapshotV1 {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return emptySnapshot();
  try {
    const parsed: unknown = JSON.parse(raw);
    return migrateSnapshot(parsed) ?? emptySnapshot();
  } catch {
    return emptySnapshot();
  }
}

function emptySnapshot(): TrackerSnapshotV1 {
  return { version: 1, donePieceIds: [], customCourses: [], hiddenBuiltinIds: [] };
}

function migrateSnapshot(value: unknown): TrackerSnapshotV1 | null {
  if (!isRecord(value)) return null;
  const version = value.version;
  if (version !== 1) return null;
  const donePieceIds = value.donePieceIds;
  const customCourses = value.customCourses;
  const hiddenBuiltinIds = value.hiddenBuiltinIds;
  if (!Array.isArray(donePieceIds) || !Array.isArray(customCourses)) return null;
  if (!donePieceIds.every((id) => typeof id === 'string')) return null;
  if (!customCourses.every(isCourse)) return null;
  const hidden =
    Array.isArray(hiddenBuiltinIds) && hiddenBuiltinIds.every((id) => typeof id === 'string')
      ? hiddenBuiltinIds
      : [];
  return {
    version: 1,
    donePieceIds: [...donePieceIds],
    customCourses,
    hiddenBuiltinIds: [...hidden],
  };
}

function isCourse(value: unknown): value is Course {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'string' || typeof value.title !== 'string') return false;
  if (typeof value.color !== 'string' || typeof value.image !== 'string') return false;
  if (typeof value.builtin !== 'boolean' || !Array.isArray(value.modules)) return false;
  return value.modules.every(isModule);
}

function isModule(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'string' || typeof value.title !== 'string') return false;
  if (!Array.isArray(value.pieces)) return false;
  return value.pieces.every(isPiece);
}

function isPiece(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.goal === 'string' &&
    typeof value.initiallyDone === 'boolean'
  );
}

export function parseImportedCourse(markdown: string, courseId?: string): Course | null {
  const input = courseId
    ? { markdown, courseId, builtin: false as const }
    : { markdown, builtin: false as const };
  const result = parseCourseMarkdown(input);
  if ('kind' in result) return null;
  return result;
}
