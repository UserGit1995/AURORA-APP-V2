/**
 * High-Capacity Persistent Storage Service for AURORA B2B
 * Uses native browser IndexedDB with localStorage fallback and fast serialization
 * to support unlimited products, categories, subcategories, micro-categories,
 * orders, and custom uploaded media without storage limits.
 */

const DB_NAME = 'aurora_distribuzione_db';
const DB_VERSION = 3;
const STORE_NAME = 'app_state_store';

class PersistentStorage {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private initDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        console.warn('IndexedDB not available in this environment');
        return reject(new Error('IndexedDB not supported'));
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        // Handle unexpected close/error
        db.onversionchange = () => {
          db.close();
          this.dbPromise = null;
        };
        resolve(db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB open error:', (event.target as IDBOpenDBRequest).error);
        this.dbPromise = null;
        reject((event.target as IDBOpenDBRequest).error);
      };
    });

    return this.dbPromise;
  }

  /**
   * Save item to IndexedDB and try to mirror in localStorage
   */
  async setItem<T>(key: string, value: T): Promise<void> {
    // 1. Try mirroring in localStorage first for immediate synchronous access
    try {
      const serialized = JSON.stringify(value);
      if (serialized.length < 4 * 1024 * 1024) {
        localStorage.setItem(key, serialized);
      }
    } catch {
      // localStorage full or quota exceeded, IndexedDB will take over
    }

    // 2. Persist to IndexedDB
    try {
      const db = await this.initDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const req = store.put(value, key);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn(`IndexedDB setItem notice for key "${key}":`, err);
    }
  }

  /**
   * Retrieve item from IndexedDB, falling back to localStorage
   */
  async getItem<T>(key: string, fallback: T): Promise<T> {
    // Try IndexedDB first
    try {
      const db = await this.initDB();
      const result = await new Promise<T | undefined>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const req = store.get(key);

        req.onsuccess = () => resolve(req.result as T | undefined);
        req.onerror = () => reject(req.error);
      });

      if (result !== undefined && result !== null) {
        return result;
      }
    } catch (err) {
      console.warn(`IndexedDB getItem notice for key "${key}":`, err);
    }

    // Fallback to localStorage
    try {
      const local = localStorage.getItem(key);
      if (local) {
        return JSON.parse(local) as T;
      }
    } catch (e) {
      console.warn(`localStorage parse notice for key "${key}":`, e);
    }

    return fallback;
  }

  /**
   * Synchronous load from localStorage (for immediate initial React state before async hydration)
   */
  getItemSync<T>(key: string, fallback: T): T {
    try {
      const local = localStorage.getItem(key);
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed !== undefined && parsed !== null) {
          return parsed as T;
        }
      }
    } catch {
      // ignore
    }
    return fallback;
  }

  /**
   * Remove item from both IndexedDB and localStorage
   */
  async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }

    try {
      const db = await this.initDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn(`IndexedDB removeItem notice for key "${key}":`, err);
    }
  }

  /**
   * Clear all persisted app data
   */
  async clearAll(): Promise<void> {
    try {
      localStorage.removeItem('aurora_admin_products');
      localStorage.removeItem('aurora_admin_categories');
      localStorage.removeItem('aurora_admin_orders');
      localStorage.removeItem('aurora_admin_settings');
      localStorage.removeItem('aurora_auth_user');
    } catch {
      // ignore
    }

    try {
      const db = await this.initDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('IndexedDB clear notice:', err);
    }
  }
}

export const persistentStorage = new PersistentStorage();
