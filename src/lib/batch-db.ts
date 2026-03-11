import { openDB, type IDBPDatabase } from 'idb';
import type { BatchItem, BatchSession, BatchState } from '@/types/batch';

const DB_NAME = 'stt_batch_lab';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('batch_sessions')) {
          db.createObjectStore('batch_sessions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('batch_items')) {
          const store = db.createObjectStore('batch_items', { keyPath: 'id' });
          store.createIndex('batchId', 'batchId', { unique: false });
        }
      },
    });
  }
  return dbPromise;
}

export async function createBatchSession(
  session: BatchSession,
  items: BatchItem[],
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['batch_sessions', 'batch_items'], 'readwrite');
  await tx.objectStore('batch_sessions').put(session);
  const itemStore = tx.objectStore('batch_items');
  // Write items in chunks to avoid blocking
  for (const item of items) {
    itemStore.put(item);
  }
  await tx.done;
}

export async function updateBatchItem(item: BatchItem): Promise<void> {
  const db = await getDB();
  await db.put('batch_items', item);
}

export async function updateBatchSession(session: Partial<BatchSession> & { id: string }): Promise<void> {
  const db = await getDB();
  const existing = await db.get('batch_sessions', session.id);
  if (existing) {
    await db.put('batch_sessions', { ...existing, ...session });
  }
}

export async function loadBatchSession(batchId: string): Promise<{ session: BatchSession; items: BatchItem[] } | null> {
  const db = await getDB();
  const session = await db.get('batch_sessions', batchId) as BatchSession | undefined;
  if (!session) return null;
  const items = await db.getAllFromIndex('batch_items', 'batchId', batchId) as BatchItem[];
  items.sort((a, b) => a.index - b.index);
  return { session, items };
}

export async function getLatestUnfinishedBatch(): Promise<{ session: BatchSession; items: BatchItem[] } | null> {
  const db = await getDB();
  const allSessions = await db.getAll('batch_sessions') as BatchSession[];
  const unfinished = allSessions
    .filter(s => s.state === 'running' || s.state === 'paused')
    .sort((a, b) => new Date(b.config.createdAt).getTime() - new Date(a.config.createdAt).getTime());

  if (unfinished.length === 0) return null;
  return loadBatchSession(unfinished[0].id);
}

export async function deleteBatchSession(batchId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['batch_sessions', 'batch_items'], 'readwrite');
  await tx.objectStore('batch_sessions').delete(batchId);
  const itemStore = tx.objectStore('batch_items');
  const items = await itemStore.index('batchId').getAllKeys(batchId);
  for (const key of items) {
    itemStore.delete(key);
  }
  await tx.done;
}

export async function updateBatchState(batchId: string, state: BatchState): Promise<void> {
  await updateBatchSession({
    id: batchId,
    state,
    ...(state === 'paused' ? { pausedAt: new Date().toISOString() } : {}),
  });
}
