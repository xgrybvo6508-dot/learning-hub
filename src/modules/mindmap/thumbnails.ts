import type { HubIndexedDb } from '../../memory/storage/indexeddb';

export interface ThumbnailBlob {
  readonly mime: 'image/jpeg';
  readonly base64: string;
}

export async function saveThumbnailBlob(
  hub: HubIndexedDb | null,
  id: string,
  dataUrl: string,
): Promise<void> {
  if (!hub) return;
  const base64 = dataUrl.includes(',') ? (dataUrl.split(',')[1] ?? '') : dataUrl;
  const blob: ThumbnailBlob = { mime: 'image/jpeg', base64 };
  await hub.set('mindmapBlobs', id, blob);
}

export async function loadThumbnailBlob(
  hub: HubIndexedDb | null,
  id: string,
): Promise<string | null> {
  if (!hub) return null;
  const raw = await hub.get('mindmapBlobs', id);
  if (!raw || typeof raw !== 'object') return null;
  const base64 = (raw as ThumbnailBlob).base64;
  if (typeof base64 !== 'string' || base64.length === 0) return null;
  return `data:image/jpeg;base64,${base64}`;
}

export async function removeThumbnailBlob(hub: HubIndexedDb | null, id: string): Promise<void> {
  if (!hub) return;
  await hub.remove('mindmapBlobs', id);
}
