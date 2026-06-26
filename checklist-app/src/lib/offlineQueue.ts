const QUEUE_KEY = 'digitallog_offline_queue';

type QueuedSave = {
  instanceId: string;
  responses: { nodeId: string; value: string; isComplete?: boolean }[];
  queuedAt: number;
};

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

export function queueSave(item: QueuedSave): void {
  if (typeof localStorage === 'undefined') return;
  const q: QueuedSave[] = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  // Replace any earlier queued save for the same instance
  const filtered = q.filter((x) => x.instanceId !== item.instanceId);
  filtered.push(item);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
}

export function getQueuedSaves(): QueuedSave[] {
  if (typeof localStorage === 'undefined') return [];
  return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
}

export async function flushQueue(onProgress?: (msg: string) => void): Promise<number> {
  const q = getQueuedSaves();
  if (!q.length) return 0;
  let flushed = 0;
  for (const item of q) {
    try {
      const res = await fetch(`/api/instances/${item.instanceId}/responses`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ responses: item.responses }),
      });
      if (res.ok) {
        flushed++;
        const remaining = getQueuedSaves().filter((x) => x.instanceId !== item.instanceId);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
        onProgress?.(`Synced draft for ${item.instanceId.slice(0, 6)}`);
      }
    } catch {
      break;
    }
  }
  return flushed;
}

export function installOfflineListeners(onOnline: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => onOnline();
  window.addEventListener('online', handler);
  return () => window.removeEventListener('online', handler);
}