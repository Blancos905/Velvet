/** Persistenza vetrina in IndexedDB (quota molto più ampia di `localStorage`). */

const DB_NAME = "luxury-salon-showcase";
const DB_VERSION = 1;
const STORE = "showcase";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB non disponibile"));
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

export async function salonShowcaseIdbGet(key: string): Promise<string | null> {
  const db = await openDb();
  try {
    return await new Promise<string | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const r = tx.objectStore(STORE).get(key);
      r.onsuccess = () => resolve((r.result as string | undefined) ?? null);
      r.onerror = () => reject(r.error ?? new Error("Lettura IndexedDB"));
      tx.onerror = () => reject(tx.error ?? new Error("Transazione IndexedDB"));
    });
  } finally {
    db.close();
  }
}

export async function salonShowcaseIdbSet(key: string, value: string): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Scrittura IndexedDB"));
      tx.onabort = () => reject(tx.error ?? new Error("Transazione IndexedDB annullata"));
      tx.objectStore(STORE).put(value, key);
    });
  } finally {
    db.close();
  }
}
