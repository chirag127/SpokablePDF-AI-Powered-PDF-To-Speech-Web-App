/**
 * Storage Manager Module
 * Handles IndexedDB operations for storing PDFs, batches, and logs
 */

import { generateId, formatDate } from './utils.js';

const DB_NAME = 'ReadableSpokablePDF';
const DB_VERSION = 1;

// Object store names
const STORES = {
    FILES: 'files',
    BATCHES: 'batches',
    LOGS: 'logs',
    SESSIONS: 'sessions'
};

/**
 * Storage Manager Class
 * Manages IndexedDB operations
 */
export class StorageManager {
    constructor() {
        this.db = null;
    }

    /**
     * Initialize database
     * @returns {Promise<IDBDatabase>} Database instance
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                reject(new Error('Failed to open database'));
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object stores if they don't exist
                if (!db.objectStoreNames.contains(STORES.FILES)) {
                    const fileStore = db.createObjectStore(STORES.FILES, { keyPath: 'id' });
                    fileStore.createIndex('timestamp', 'timestamp', { unique: false });
                    fileStore.createIndex('filename', 'filename', { unique: false });
                }

                if (!db.objectStoreNames.contains(STORES.BATCHES)) {
                    const batchStore = db.createObjectStore(STORES.BATCHES, { keyPath: 'id' });
                    batchStore.createIndex('sessionId', 'sessionId', { unique: false });
                    batchStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                if (!db.objectStoreNames.contains(STORES.LOGS)) {
                    const logStore = db.createObjectStore(STORES.LOGS, { keyPath: 'id' });
                    logStore.createIndex('timestamp', 'timestamp', { unique: false });
                    logStore.createIndex('level', 'level', { unique: false });
                    logStore.createIndex('sessionId', 'sessionId', { unique: false });
                }

                if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
                    const sessionStore = db.createObjectStore(STORES.SESSIONS, { keyPath: 'id' });
                    sessionStore.createIndex('timestamp', 'timestamp', { unique: false });
                    sessionStore.createIndex('status', 'status', { unique: false });
                }
            };
        });
    }

    /**
     * Ensure database is initialized
     */
    async ensureInit() {
        if (!this.db) {
            await this.init();
        }
    }

    /**
     * Save file data
     * @param {Object} fileData - File data to save
     * @returns {Promise<string>} File ID
     */
    async saveFile(fileData) {
        await this.ensureInit();

        const file = {
            id: fileData.id || generateId(),
            filename: fileData.filename,
            size: fileData.size,
            pages: fileData.pages,
            extractedText: fileData.extractedText,
            metadata: fileData.metadata,
            timestamp: Date.now(),
            status: fileData.status || 'uploaded'
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORES.FILES], 'readwrite');
            const store = transaction.objectStore(STORES.FILES);
            const request = store.put(file);

            request.onsuccess = () => resolve(file.id);
            request.onerror = () => reject(new Error('Failed to save file'));
        });
    }

    /**
     * Get file by ID
     * @param {string} id - File ID
     * @returns {Promise<Object>} File data
     */
    async getFile(id) {
        await this.ensureInit();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORES.FILES], 'readonly');
            const store = transaction.objectStore(STORES.FILES);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error('Failed to get file'));
        });
    }

    /**
     * Get all files
     * @returns {Promise<Array>} Array of files
     */
    async getAllFiles() {
        await this.ensureInit();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORES.FILES], 'readonly');
            const store = transaction.objectStore(STORES.FILES);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(new Error('Failed to get files'));
        });
    }

    /**
     * Delete file
     * @param {string} id - File ID
     * @returns {Promise<void>}
     */
    async deleteFile(id) {
        await this.ensureInit();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORES.FILES], 'readwrite');
            const store = transaction.objectStore(STORES.FILES);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('Failed to delete file'));
        });
    }

    /**
     * Save batch data
     * @param {Object} batchData - Batch data to save
     * @returns {Promise<string>} Batch ID
     */
    async saveBatch(batchData) {
        await this.ensureInit();

        const batch = {
            id: batchData.id || generateId(),
            sessionId: batchData.sessionId,
            batchNumber: batchData.batchNumber,
            text: batchData.text,
            transformedText: batchData.transformedText,
            status: batchData.status || 'pending',
            model: batchData.model,
            retries: batchData.retries || 0,
            error: batchData.error || null,
            timestamp: Date.now()
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORES.BATCHES], 'readwrite');
            const store = transaction.objectStore(STORES.BATCHES);
            const request = store.put(batch);

            request.onsuccess = () => resolve(batch.id);
            request.onerror = () => reject(new Error('Failed to save batch'));
        });
    }

    /**
     * Get batch by ID
     * @param {string} id - Batch ID
     * @returns {Promise<Object>} Batch data
     */
    async getBatch(id) {
        await this.ensureInit();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORES.BATCHES], 'readonly');
            const store = transaction.objectStore(STORES.BATCHES);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error('Failed to get batch'));
        });
    }

    /**
     * Get batches by session ID
     * @param {string} sessionId - Session ID
     * @returns {Promise<Array>} Array of batches
     */
    async getBatchesBySession(sessionId) {
        await this.ensureInit();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORES.BATCHES], 'readonly');
            const store = transaction.objectStore(STORES.BATCHES);
            const index = store.index('sessionId');
            const request = index.getAll(sessionId);

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(new Error('Failed to get batches'));
        });
    }

    /**
     * Delete batch
     * @param {string} id - Batch ID
     * @returns {Promise<void>}
     */
    async deleteBatch(id) {
        await this.ensureInit();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORES.BATCHES], 'readwrite');
            const store = transaction.objectStore(STORES.BATCHES);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('Failed to delete batch'));
        });
    }

    /**
     * Save log entry
     * @param {Object} logData - Log entry data
     * @returns {Promise<string>} Log ID
     */
    async saveLog(logData) {
        await this.ensureInit();

        const log = {
            id: generateId(),
            sessionId: logData.sessionId,
            level: logData.level || 'info',
            message: logData.message,
            data: logData.data || null,
            timestamp: Date.now()
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORES.LOGS], 'readwrite');
            const store = transaction.objectStore(STORES.LOGS);
            const request = store.put(log);

            request.onsuccess = () => resolve(log.id);
            request.onerror = () => reject(new Error('Failed to save log'));
        });
    }

    /**
     * Get logs by session ID
     * @param {string} sessionId - Session ID
     * @returns {Promise<Array>} Array of logs
     */
    async getLogsBySession(sessionId) {
        await this.ensureInit();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORES.LOGS], 'readonly');
            const store = transaction.objectStore(STORES.LOGS);
            const index = store.index('sessionId');
            const request = index.getAll(sessionId);

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(new Error('Failed to get logs'));
        });
    }

    /**
     * Get all logs
     * @param {number} limit - Maximum number of logs to return
     * @returns {Promise<Array>} Array of logs
     */
    async getAllLogs(limit = 1000) {
        await this.ensureInit();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORES.LOGS], 'readonly');
            const store = transaction.objectStore(STORES.LOGS);
            const index = store.index('timestamp');
            const request = index.openCursor(null, 'prev');

            const logs = [];

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && logs.length < limit) {
                    logs.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(logs);
                }
            };

            request.onerror = () => reject(new Error('Failed to get logs'));
        });
    }

    /**
     * Clear old logs
     * @param {number} olderThan - Delete logs older than this timestamp
     * @returns {Promise<number>} Number of deleted logs
     */
    async clearOldLogs(olderThan) {
        await this.ensureInit();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORES.LOGS], 'readwrite');
            const store = transaction.objectStore(STORES.LOGS);
            const index = store.index('timestamp');
            const request = index.openCursor(IDBKeyRange.upperBound(olderThan));

            let count = 0;

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    count++;
                    cursor.continue();
                } else {
                    resolve(count);
                }
            };

            request.onerror = () => reject(new Error('Failed to clear logs'));
        });
    }

    /**
     * Save session data
     * @param {Object} sessionData - Session data to save
     * @returns {Promise<string>} Session ID
     */
    async saveSession(sessionData) {
        await this.ensureInit();

        const session = {
            id: sessionData.id || generateId(),
            fileId: sessionData.fileId,
            filename: sessionData.filename,
            status: sessionData.status || 'pending',
            progress: sessionData.progress || 0,
            totalBatches: sessionData.totalBatches || 0,
            completedBatches: sessionData.completedBatches || 0,
            failedBatches: sessionData.failedBatches || 0,
            startTime: sessionData.startTime || Date.now(),
            endTime: sessionData.endTime || null,
            settings: sessionData.settings || {},
            timestamp: Date.now()
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORES.SESSIONS], 'readwrite');
            const store = transaction.objectStore(STORES.SESSIONS);
            const request = store.put(session);

            request.onsuccess = () => resolve(session.id);
            request.onerror = () => reject(new Error('Failed to save session'));
        });
    }

    /**
     * Get session by ID
     * @param {string} id - Session ID
     * @returns {Promise<Object>} Session data
     */
    async getSession(id) {
        await this.ensureInit();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORES.SESSIONS], 'readonly');
            const store = transaction.objectStore(STORES.SESSIONS);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error('Failed to get session'));
        });
    }

    /**
     * Get all sessions
     * @returns {Promise<Array>} Array of sessions
     */
    async getAllSessions() {
        await this.ensureInit();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORES.SESSIONS], 'readonly');
            const store = transaction.objectStore(STORES.SESSIONS);
            const index = store.index('timestamp');
            const request = index.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(new Error('Failed to get sessions'));
        });
    }

    /**
     * Delete session and associated data
     * @param {string} id - Session ID
     * @returns {Promise<void>}
     */
    async deleteSession(id) {
        await this.ensureInit();

        // Delete session
        await new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORES.SESSIONS], 'readwrite');
            const store = transaction.objectStore(STORES.SESSIONS);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('Failed to delete session'));
        });

        // Delete associated batches
        const batches = await this.getBatchesBySession(id);
        for (const batch of batches) {
            await this.deleteBatch(batch.id);
        }

        // Delete associated logs
        const logs = await this.getLogsBySession(id);
        for (const log of logs) {
            await new Promise((resolve, reject) => {
                const transaction = this.db.transaction([STORES.LOGS], 'readwrite');
                const store = transaction.objectStore(STORES.LOGS);
                const request = store.delete(log.id);

                request.onsuccess = () => resolve();
                request.onerror = () => reject();
            });
        }
    }

    /**
     * Clear all data
     * @returns {Promise<void>}
     */
    async clearAll() {
        await this.ensureInit();

        const stores = [STORES.FILES, STORES.BATCHES, STORES.LOGS, STORES.SESSIONS];

        for (const storeName of stores) {
            await new Promise((resolve, reject) => {
                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.clear();

                request.onsuccess = () => resolve();
                request.onerror = () => reject(new Error(`Failed to clear ${storeName}`));
            });
        }
    }

    /**
     * Get database size estimate
     * @returns {Promise<Object>} Size information
     */
    async getStorageInfo() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            return {
                usage: estimate.usage,
                quota: estimate.quota,
                percentage: (estimate.usage / estimate.quota) * 100
            };
        }

        return {
            usage: 0,
            quota: 0,
            percentage: 0,
            unsupported: true
        };
    }

    /**
     * Export all data as JSON
     * @returns {Promise<Object>} All data
     */
    async exportData() {
        await this.ensureInit();

        const [files, sessions, logs] = await Promise.all([
            this.getAllFiles(),
            this.getAllSessions(),
            this.getAllLogs()
        ]);

        return {
            files,
            sessions,
            logs,
            exportDate: formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss'),
            version: DB_VERSION
        };
    }

    /**
     * Close database connection
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
}

// Singleton instance
let storageInstance = null;

/**
 * Get storage manager instance
 * @returns {StorageManager} Storage manager instance
 */
export function getStorageManager() {
    if (!storageInstance) {
        storageInstance = new StorageManager();
    }
    return storageInstance;
}

export default StorageManager;