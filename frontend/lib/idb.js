/**
 * Minimal IndexedDB wrapper — no dependency, promise-based.
 * Database `Nox` v1: drafts (code), api (GET cache), recent (views).
 * Every op rejects outside the browser or when storage is unavailable;
 * callers treat failure as "cache missed", never as fatal.
 */

const DB_NAME = "Nox";
const DB_VERSION = 1;

let dbPromise = null;

function openDb() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB unavailable"));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("drafts")) {
          db.createObjectStore("drafts", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("api")) {
          db.createObjectStore("api", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("recent")) {
          db.createObjectStore("recent", { keyPath: "slug" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error("IDB open failed"));
    });
    // A failed open must not poison later calls (e.g. private mode).
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

function run(store, mode, op) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        let result;
        try {
          const tx = db.transaction(store, mode);
          result = op(tx.objectStore(store));
          tx.oncomplete = () => resolve(result?.result ?? result ?? null);
          tx.onerror = () => reject(tx.error ?? new Error("IDB transaction failed"));
        } catch (err) {
          reject(err);
        }
      })
  );
}

export const idbGet = (store, key) =>
  run(store, "readonly", (s) => s.get(key)).then((v) => v ?? null);

export const idbSet = (store, value) => run(store, "readwrite", (s) => s.put(value));

export const idbDel = (store, key) => run(store, "readwrite", (s) => s.delete(key));

export const idbAll = (store) =>
  run(store, "readonly", (s) => s.getAll()).then((v) => v ?? []);
