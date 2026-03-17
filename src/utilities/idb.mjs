export const dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open('failover-visualiser', 1);
    request.onupgradeneeded = function(event) {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('configs')) {
            db.createObjectStore('configs', { keyPath: 'id' });
        }
    };
    request.onsuccess = function(event) {
        resolve(event.target.result);
    };
    request.onerror = function(event) {
        reject(event.target.error);
    };
});

export async function idbGetStore(storeName, mode) {
    const db = await dbPromise;
    const tx = db.transaction(storeName, mode);
    return tx.objectStore(storeName);
}

export async function idbStoreAction(storeName, mode, action, ...actionArgs) {
    const store = await idbGetStore(storeName, mode);
    return new Promise((resolve, reject) => {
        const request = store[action](...actionArgs);
        request.onsuccess = function(event) {
            resolve(event.target.result);
        };
        request.onerror = function(event) {
            reject(event.target.error);
        };
    });
}

export function idbGet(storeName, key) {
    return idbStoreAction(storeName, 'readonly', 'get', key);
}

export function idbPut(storeName, value) {
    return idbStoreAction(storeName, 'readwrite', 'put', value);
}

export function idbDelete(storeName, key) {
    return idbStoreAction(storeName, 'readwrite', 'delete', key);
}

export function idbGetAll(storeName) {
    return idbStoreAction(storeName, 'readonly', 'getAll');
}
