import {
  isFiniteNumber,
  isNonEmptyString,
  isRecord,
  isString,
  own,
  type UnknownRecord,
} from '../lib/guards';
import { err, ok, type Result } from '../lib/result';
import {
  emptyMemory,
  MEMORY_VERSION,
  OUTCOMES,
  type CardState,
  type HubMemoryV1,
  type Outcome,
} from './schema';

export interface MigrationError {
  readonly kind: 'corrupt' | 'future-version';
  readonly message: string;
  readonly details: readonly string[];
}

const isOutcome = (v: unknown): v is Outcome =>
  typeof v === 'string' && (OUTCOMES as readonly string[]).includes(v);

const isTime = (v: unknown): v is number => isFiniteNumber(v) && v >= 0;
const isCount = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;

function parseCard(raw: unknown): CardState | null {
  if (!isRecord(raw)) return null;
  const problemId = own(raw, 'problemId');
  const ease = own(raw, 'ease');
  const intervalDays = own(raw, 'intervalDays');
  const reps = own(raw, 'reps');
  const lapses = own(raw, 'lapses');
  const dueAt = own(raw, 'dueAt');
  const lastSeenAt = own(raw, 'lastSeenAt');
  const lastOutcome = own(raw, 'lastOutcome');
  if (
    !isNonEmptyString(problemId) ||
    !isFiniteNumber(ease) ||
    !isCount(intervalDays) ||
    !isCount(reps) ||
    !isCount(lapses) ||
    !isTime(dueAt) ||
    !isTime(lastSeenAt) ||
    !isOutcome(lastOutcome)
  ) {
    return null;
  }
  return {
    problemId,
    ease,
    intervalDays,
    reps,
    lapses,
    dueAt,
    lastSeenAt,
    lastOutcome,
  };
}

function collectArray(raw: unknown, errors: string[], label: string): unknown[] {
  if (!Array.isArray(raw)) {
    errors.push(`${label} is not a list`);
    return [];
  }
  return raw;
}

function readV1(raw: UnknownRecord): Result<HubMemoryV1, MigrationError> {
  const errors: string[] = [];
  const createdAt = own(raw, 'createdAt');
  const updatedAt = own(raw, 'updatedAt');
  const lastExportAt = own(raw, 'lastExportAt');
  if (!isTime(createdAt)) errors.push('createdAt is not valid');
  if (!isTime(updatedAt)) errors.push('updatedAt is not valid');
  if (lastExportAt !== null && lastExportAt !== undefined && !isTime(lastExportAt)) {
    errors.push('lastExportAt is not valid');
  }

  const mistakes = collectArray(own(raw, 'mistakes'), errors, 'mistakes');
  const courses = collectArray(own(raw, 'courses'), errors, 'courses');
  const sessions = collectArray(own(raw, 'sessions'), errors, 'sessions');
  const mindmap = collectArray(own(raw, 'mindmap'), errors, 'mindmap');
  const ankiDecks = collectArray(own(raw, 'ankiDecks'), errors, 'ankiDecks');
  const feynman = collectArray(own(raw, 'feynman'), errors, 'feynman');
  const voice = collectArray(own(raw, 'voice'), errors, 'voice');

  const interleaveRaw = own(raw, 'interleave');
  const interleave: HubMemoryV1['interleave'] = {};
  if (interleaveRaw !== undefined && interleaveRaw !== null) {
    if (!isRecord(interleaveRaw)) errors.push('interleave is not an object');
    else {
      for (const key of Object.keys(interleaveRaw)) {
        const entry = own(interleaveRaw, key);
        if (isRecord(entry) && isString(own(entry, 'dateKey'))) {
          interleave[key] = entry as unknown as HubMemoryV1['interleave'][string];
        }
      }
    }
  }

  for (const m of mistakes) {
    if (!isRecord(m) || !isNonEmptyString(own(m, 'id'))) errors.push('mistakes entry invalid');
    else {
      const card = parseCard(own(m, 'card'));
      if (!card) errors.push(`mistakes.${String(own(m, 'id'))} card invalid`);
    }
  }

  if (errors.length > 0 || !isTime(createdAt) || !isTime(updatedAt)) {
    return err({ kind: 'corrupt', message: 'Saved data could not be read.', details: errors });
  }

  return ok({
    version: MEMORY_VERSION,
    createdAt,
    updatedAt,
    mistakes: mistakes as HubMemoryV1['mistakes'],
    courses: courses as HubMemoryV1['courses'],
    sessions: sessions as HubMemoryV1['sessions'],
    mindmap: mindmap as HubMemoryV1['mindmap'],
    ankiDecks: ankiDecks as HubMemoryV1['ankiDecks'],
    feynman: feynman as HubMemoryV1['feynman'],
    interleave,
    voice: voice as HubMemoryV1['voice'],
    lastExportAt: isTime(lastExportAt) ? lastExportAt : null,
  });
}

type Step = (data: unknown, now: number) => unknown;

const STEPS: readonly Step[] = [(_data, now) => emptyMemory(now)];

function versionOf(raw: unknown): number | null {
  if (raw === undefined || raw === null) return 0;
  if (!isRecord(raw)) return null;
  const v = own(raw, 'version');
  return Number.isSafeInteger(v) && (v as number) >= 0 ? (v as number) : null;
}

export function migrate(raw: unknown, now: number): Result<HubMemoryV1, MigrationError> {
  let version = versionOf(raw);
  if (version === null) {
    return err({
      kind: 'corrupt',
      message: 'Saved data could not be read.',
      details: ['missing or bad version'],
    });
  }
  if (version > MEMORY_VERSION) {
    return err({
      kind: 'future-version',
      message: 'Saved data comes from a newer version of the app.',
      details: [`version ${version}`],
    });
  }
  let data = raw;
  while (version < MEMORY_VERSION) {
    const step = STEPS[version];
    if (!step) {
      return err({
        kind: 'corrupt',
        message: 'Saved data could not be read.',
        details: ['no migration'],
      });
    }
    data = step(data, now);
    version++;
  }
  if (!isRecord(data)) {
    return err({
      kind: 'corrupt',
      message: 'Saved data could not be read.',
      details: ['not an object'],
    });
  }
  return readV1(data);
}

/** Validates export `data` envelope field. */
export function migrateExportData(raw: unknown, now: number): Result<HubMemoryV1, MigrationError> {
  return migrate(raw, now);
}
