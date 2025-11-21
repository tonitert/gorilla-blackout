const DB_NAME = 'gorillaBlackoutDB';
const DB_VERSION = 1;
const STORE_NAME = 'gameState';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
	if (dbPromise) {
		return dbPromise;
	}

	dbPromise = new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => {
			reject(request.error);
		};

		request.onsuccess = () => {
			resolve(request.result);
		};

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME);
			}
		};
	});

	return dbPromise;
}

export async function setItem<T>(key: string, value: T): Promise<void> {
	try {
		const db = await openDB();
		const transaction = db.transaction(STORE_NAME, 'readwrite');
		const store = transaction.objectStore(STORE_NAME);
		console.log(value);
		store.put(value, key);

		return new Promise((resolve, reject) => {
			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error);
		});
	} catch (error) {
		console.error('Error setting item in IndexedDB:', error);
		throw error;
	}
}

export async function getItem<T>(key: string): Promise<T | undefined> {
	try {
		const db = await openDB();
		const transaction = db.transaction(STORE_NAME, 'readonly');
		const store = transaction.objectStore(STORE_NAME);
		const request = store.get(key);

		return new Promise((resolve, reject) => {
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	} catch (error) {
		console.error('Error getting item from IndexedDB:', error);
		return undefined;
	}
}

export async function removeItem(key: string): Promise<void> {
	try {
		const db = await openDB();
		const transaction = db.transaction(STORE_NAME, 'readwrite');
		const store = transaction.objectStore(STORE_NAME);
		store.delete(key);

		return new Promise((resolve, reject) => {
			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error);
		});
	} catch (error) {
		console.error('Error removing item from IndexedDB:', error);
		throw error;
	}
}

export async function clear(): Promise<void> {
	try {
		const db = await openDB();
		const transaction = db.transaction(STORE_NAME, 'readwrite');
		const store = transaction.objectStore(STORE_NAME);
		store.clear();

		return new Promise((resolve, reject) => {
			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error);
		});
	} catch (error) {
		console.error('Error clearing IndexedDB:', error);
		throw error;
	}
}
