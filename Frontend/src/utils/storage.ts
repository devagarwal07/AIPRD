// Storage wrapper adding quota exceed handling and safe JSON operations.
// Falls back to in-memory map if localStorage is unavailable or quota is exceeded.
import { toast } from './toast';

interface SafeStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const memoryStore = new Map<string, string>();

function createMemoryStorage(): SafeStorageLike {
  return {
    getItem: (k) => memoryStore.get(k) ?? null,
    setItem: (k, v) => { memoryStore.set(k, v); },
    removeItem: (k) => { memoryStore.delete(k); },
  };
}

let quotaNotified = false;

export const safeStorage: SafeStorageLike = ((): SafeStorageLike => {
  if (typeof window === 'undefined' || !('localStorage' in window)) {
    return createMemoryStorage();
  }
  try {
    const testKey = '__pmcopilot_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
  } catch {
    return createMemoryStorage();
  }
  return {
    getItem(key) {
      try { return window.localStorage.getItem(key); } catch { return memoryStore.get(key) ?? null; }
    },
    setItem(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch (e: any) {
        const msg = e?.name || '';
        if (!quotaNotified && (msg.includes('QuotaExceeded') || msg.includes('QUOTA'))) {
          quotaNotified = true;
          toast.error('Storage full: consider deleting old snapshots or clearing browser data.');
        }
        // Fallback to memory so user can continue the session
        memoryStore.set(key, value);
      }
    },
    removeItem(key) {
      try { window.localStorage.removeItem(key); } catch { memoryStore.delete(key); }
    }
  };
})();

// Helper for JSON value retrieval with default fallback.
export function getJSON<T>(key: string, fallback: T): T {
  const raw = safeStorage.getItem(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export function setJSON(key: string, value: unknown) {
  try { safeStorage.setItem(key, JSON.stringify(value)); } catch {/* handled in wrapper */}
}
