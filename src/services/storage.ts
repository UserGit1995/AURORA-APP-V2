/**
 * High-Capacity Persistent Storage Service for AURORA B2B
 * Uses native browser IndexedDB to support unlimited products, large base64 images from PC,
 * categories, subcategories, orders, and system settings without the 5MB localStorage limit.
 */

const DB_NAME = 'aurora_distribuzione_db';
const DB_VERSION = 2;
const STORE_NAME = 'app_state_store';

class PersistentStorage {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private initDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        console.warn('IndexedDB not available, using in-memory / fallback');
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
        resolve(db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB open error:', (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };
    });

    return this.dbPromise;
  }

  /**
   * Save item to IndexedDB and try to mirror in localStorage if size allows
   */
  async setItem<T>(key: string, value: T): Promise<void> {
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
      console.warn(`IndexedDB setItem error for key "${key}":`, err);
    }

    // Try mirroring in localStorage if JSON size fits (< 3MB)
    try {
      const serialized = JSON.stringify(value);
      if (serialized.length < 3 * 1024 * 1024) {
        localStorage.setItem(key, serialized);
      }
    } catch {
      // localStorage is full, but IndexedDB safely preserved the data!
    }
  }

  /**
   * Retrieve item from IndexedDB, falling back to localStorage
   */
  async getItem<T>(key: string, fallback: T): Promise<T> {
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
      console.warn(`IndexedDB getItem error for key "${key}":`, err);
    }

    // Fallback to localStorage
    try {
      const local = localStorage.getItem(key);
      if (local) {
        return JSON.parse(local) as T;
      }
    } catch (e) {
      console.warn(`localStorage parse error for key "${key}":`, e);
    }

    return fallback;
  }

  /**
   * Synchronous load from localStorage (for fast initial React state before IndexedDB hydration)
   */
  getItemSync<T>(key: string, fallback: T): T {
    try {
      const local = localStorage.getItem(key);
      if (local) {
        return JSON.parse(local) as T;
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
      const db = await this.initDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn(`IndexedDB removeItem error for key "${key}":`, err);
    }

    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }

  /**
   * Clear all persisted app data
   */
  async clearAll(): Promise<void> {
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
      console.warn('IndexedDB clear error:', err);
    }

    try {
      localStorage.removeItem('aurora_admin_products');
      localStorage.removeItem('aurora_admin_categories');
      localStorage.removeItem('aurora_admin_orders');
      localStorage.removeItem('aurora_admin_settings');
      localStorage.removeItem('aurora_auth_user');
    } catch {
      // ignore
    }
  }
}

export const persistentStorage = new PersistentStorage();
