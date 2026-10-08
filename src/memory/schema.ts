export const MEMORY_VERSION = 1;

export type Outcome = 'correct' | 'partial' | 'incorrect' | 'skipped';
export type Quality = 0 | 1 | 2 | 3 | 4 | 5;

export const OUTCOMES: readonly Outcome[] = ['correct', 'partial', 'incorrect', 'skipped'];
export const QUALITIES: readonly Quality[] = [0, 1, 2, 3, 4, 5];

/** SM-2 card state (mistake re-check and similar). */
export interface CardState {
  problemId: string;
  ease: number;
  intervalDays: number;
  reps: number;
  lapses: number;
  dueAt: number;
  lastSeenAt: number;
  lastOutcome: Outcome;
}

export type CauseCategory =
  | 'concept-gap'
  | 'misread'
  | 'careless'
  | 'wrong-method'
  | 'memory-lapse'
  | 'time-pressure';

export interface MistakeRecord {
  id: string;
  createdAt: number;
  updatedAt: number;
  wrong: string;
  cause: CauseCategory;
  fix: string;
  topic: string;
  courseSlug?: string;
  source?: string;
  card: CardState;
}

export interface CourseRecord {
  slug: string;
  updatedAt: number;
  body: string;
  progress: Record<string, { done: boolean }>;
}

export interface CourseSessionRecord {
  id: string;
  courseSlug: string;
  moduleId: string;
  at: number;
  minutes: number;
  note: string;
}

export interface MindmapHistoryRecord {
  id: string;
  drillId: string;
  mode: 'topic' | 'text';
  sourceText?: string;
  scores: Record<string, number>;
  strengths: string[];
  issues: string[];
  at: number;
  activeMs: number;
  thumbnailId: string | null;
}

export interface AnkiDeckRecord {
  id: string;
  topic: string;
  updatedAt: number;
  cards: Array<{ front: string; back: string; type: string; tags: string[] }>;
}

export interface FeynmanSessionRecord {
  id: string;
  updatedAt: number;
  audience: string;
  concept: string;
  status: 'open' | 'done';
  rounds: unknown[];
}

export interface InterleavePlanRecord {
  dateKey: string;
  updatedAt: number;
  plan: unknown;
}

export interface VoiceHistoryRecord {
  id: string;
  at: number;
  mode: 'research' | 'visualization';
  transcript: string;
  summary: string;
}

export interface HubMemoryV1 {
  version: typeof MEMORY_VERSION;
  createdAt: number;
  updatedAt: number;
  mistakes: MistakeRecord[];
  courses: CourseRecord[];
  sessions: CourseSessionRecord[];
  mindmap: MindmapHistoryRecord[];
  ankiDecks: AnkiDeckRecord[];
  feynman: FeynmanSessionRecord[];
  interleave: Record<string, InterleavePlanRecord>;
  voice: VoiceHistoryRecord[];
  lastExportAt: number | null;
}

export function emptyMemory(now: number): HubMemoryV1 {
  return {
    version: MEMORY_VERSION,
    createdAt: now,
    updatedAt: now,
    mistakes: [],
    courses: [],
    sessions: [],
    mindmap: [],
    ankiDecks: [],
    feynman: [],
    interleave: {},
    voice: [],
    lastExportAt: null,
  };
}
