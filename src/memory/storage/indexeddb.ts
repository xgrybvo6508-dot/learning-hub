import { StorageError, type KeyValueStore } from './adapter';

export const DB_NAME = 'learning-hub';
export const DB_VERSION = 1;

export const HUB_OBJECT_STORES = [
  'meta',
  'mistakes',
  'courses',
  'courseSessions',
  'mindmapHistory',
  'mindmapBlobs',
  'ankiDecks',
  'feynmanSessions',
  'interleavePlans',
  'voiceHistory',
] as const;

export type HubObjectStoreName = (typeof HUB_OBJECT_STORES)[number];

const OPEN_TIMEOUT_MS = 3000;

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () =>
      reject(new StorageError('read', 'A storage request failed.', { cause: req.error }));
  });
}

function transaction(
  db: IDBDatabase,
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let tx: IDBTransaction;
    try {
      tx = db.transaction(storeName, mode);
    } catch (e) {
      reject(new StorageError('write', 'Could not start a storage transaction.', { cause: e }));
      return;
    }
    const fail = (): void => {
      const quota = tx.error?.name === 'QuotaExceededError';
      reject(
        new StorageError(quota ? 'quota' : 'write', 'Could not save to IndexedDB.', {
          cause: tx.error,
        }),
      );
    };
    tx.oncomplete = () => resolve();
    tx.onerror = fail;
    tx.onabort = fail;
    run(tx.objectStore(storeName));
  });
}

function openDb(factory: IDBFactory, name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new StorageError('unavailable', 'IndexedDB did not open in time.')),
      OPEN_TIMEOUT_MS,
    );
    const done = (): void => clearTimeout(timer);
    let req: IDBOpenDBRequest;
    try {
      req = factory.open(name, DB_VERSION);
    } catch (e) {
      done();
      reject(new StorageError('unavailable', 'IndexedDB is not available.', { cause: e }));
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const store of HUB_OBJECT_STORES) {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store);
      }
    };
    req.onsuccess = () => {
      done();
      resolve(req.result);
    };
    req.onerror = () => {
      done();
      reject(
        new StorageError('unavailable', 'IndexedDB could not be opened.', { cause: req.error }),
      );
    };
    req.onblocked = () => {
      done();
      reject(new StorageError('unavailable', 'IndexedDB is blocked by another tab.'));
    };
  });
}

export interface HubIndexedDb {
  readonly kind: 'indexeddb';
  get(store: HubObjectStoreName, key: string): Promise<unknown>;
  set(store: HubObjectStoreName, key: string, value: unknown): Promise<void>;
  remove(store: HubObjectStoreName, key: string): Promise<void>;
  getAllKeys(store: HubObjectStoreName): Promise<string[]>;
  getAll(store: HubObjectStoreName): Promise<unknown[]>;
}

/** Opens the `learning-hub` multi-store database. */
export async function openHubIndexedDb(
  factory: IDBFactory | undefined = globalThis.indexedDB,
  name = DB_NAME,
): Promise<HubIndexedDb> {
  if (!factory) throw new StorageError('unavailable', 'IndexedDB is not available.');
  const db = await openDb(factory, name);
  return {
    kind: 'indexeddb',
    async get(store, key) {
      const tx = db.transaction(store, 'readonly');
      const value: unknown = await request(tx.objectStore(store).get(key));
      return value;
    },
    set: (store, key, value) => transaction(db, store, 'readwrite', (s) => s.put(value, key)),
    remove: (store, key) => transaction(db, store, 'readwrite', (s) => s.delete(key)),
    async getAllKeys(store) {
      const tx = db.transaction(store, 'readonly');
      const keys = await request(tx.objectStore(store).getAllKeys());
      return keys.filter((k): k is string => typeof k === 'string').sort();
    },
    async getAll(store) {
      const tx = db.transaction(store, 'readonly');
      const values: unknown[] = await request(tx.objectStore(store).getAll());
      return values;
    },
  };
}

/** Legacy single-store kv adapter used for quarantine keys on the `meta` store. */
export async function openIndexedDbStore(
  factory: IDBFactory | undefined = globalThis.indexedDB,
  name = DB_NAME,
): Promise<KeyValueStore> {
  const hub = await openHubIndexedDb(factory, name);
  const META = 'meta' as const;
  return {
    kind: 'indexeddb',
    get: (key) => hub.get(META, key),
    set: (key, value) => hub.set(META, key, value),
    remove: (key) => hub.remove(META, key),
    keys: () => hub.getAllKeys(META),
  };
}
