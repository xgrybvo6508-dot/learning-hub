import type { HubIndexedDb } from './storage/indexeddb';
import { emptyMemory, type HubMemoryV1 } from './schema';

const SCHEMA_KEY = 'schema';

export async function loadFromHubDb(hub: HubIndexedDb): Promise<HubMemoryV1 | null> {
  const schema = await hub.get('meta', SCHEMA_KEY);
  if (schema === undefined) return null;
  const mistakes = (await hub.getAll('mistakes')) as HubMemoryV1['mistakes'];
  const courses = (await hub.getAll('courses')) as HubMemoryV1['courses'];
  const sessions = (await hub.getAll('courseSessions')) as HubMemoryV1['sessions'];
  const mindmap = (await hub.getAll('mindmapHistory')) as HubMemoryV1['mindmap'];
  const ankiDecks = (await hub.getAll('ankiDecks')) as HubMemoryV1['ankiDecks'];
  const feynman = (await hub.getAll('feynmanSessions')) as HubMemoryV1['feynman'];
  const voice = (await hub.getAll('voiceHistory')) as HubMemoryV1['voice'];

  const interleaveKeys = await hub.getAllKeys('interleavePlans');
  const interleave: HubMemoryV1['interleave'] = {};
  for (const dateKey of interleaveKeys) {
    const plan = await hub.get('interleavePlans', dateKey);
    if (plan !== undefined) interleave[dateKey] = plan as HubMemoryV1['interleave'][string];
  }

  const mem = schema as HubMemoryV1;
  return {
    ...mem,
    mistakes,
    courses,
    sessions,
    mindmap,
    ankiDecks,
    feynman,
    interleave,
    voice,
  };
}

export async function saveToHubDb(hub: HubIndexedDb, memory: HubMemoryV1): Promise<void> {
  const { mistakes, courses, sessions, mindmap, ankiDecks, feynman, interleave, voice, ...meta } =
    memory;
  await hub.set('meta', SCHEMA_KEY, { ...meta, version: memory.version });

  const syncStore = async (
    store:
      | 'mistakes'
      | 'courses'
      | 'courseSessions'
      | 'mindmapHistory'
      | 'ankiDecks'
      | 'feynmanSessions'
      | 'voiceHistory',
    items: Array<{ id?: string; slug?: string }>,
    keyOf: (item: { id?: string; slug?: string }) => string,
  ): Promise<void> => {
    const existing = new Set(await hub.getAllKeys(store));
    const next = new Set<string>();
    for (const item of items) {
      const key = keyOf(item);
      if (!key) continue;
      next.add(key);
      await hub.set(store, key, item);
    }
    for (const old of existing) {
      if (!next.has(old)) await hub.remove(store, old);
    }
  };

  await syncStore('mistakes', mistakes, (m) => m.id ?? '');
  await syncStore('courses', courses, (c) => c.slug ?? '');
  await syncStore('courseSessions', sessions, (s) => s.id ?? '');
  await syncStore('mindmapHistory', mindmap, (m) => m.id ?? '');
  await syncStore('ankiDecks', ankiDecks, (d) => d.id ?? '');
  await syncStore('feynmanSessions', feynman, (f) => f.id ?? '');
  await syncStore('voiceHistory', voice, (v) => v.id ?? '');

  const planKeys = await hub.getAllKeys('interleavePlans');
  const nextPlanKeys = new Set(Object.keys(interleave));
  for (const [dateKey, plan] of Object.entries(interleave)) {
    await hub.set('interleavePlans', dateKey, plan);
  }
  for (const old of planKeys) {
    if (!nextPlanKeys.has(old)) await hub.remove('interleavePlans', old);
  }
}

export function memorySnapshotForFallback(memory: HubMemoryV1): HubMemoryV1 {
  return structuredClone(memory);
}

export function emptyHubRaw(now: number): HubMemoryV1 {
  return emptyMemory(now);
}
