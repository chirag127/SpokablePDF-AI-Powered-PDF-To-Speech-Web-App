/**
 * Logger Module
 * Handles application logging with IndexedDB persistence
 */

import { getStorageManager } from './storage-manager.js';
import { formatDate, redactApiKey } from './utils.js';

/**
 * Log levels
 */
export const LOG_LEVELS = {
    DEBUG: 'debug',
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error'
};

/**
 * Logger Class
 * Manages application logging
 */
export class Logger {
    constructor(options = {}) {
        this.sessionId = options.sessionId || null;
        this.storage = getStorageManager();
        this.consoleEnabled = options.consoleEnabled !== false;
        this.storageEnabled = options.storageEnabled !== false;
    }

    /**
     * Log debug message
     * @param {string} message - Log message
     * @param {Object} data - Additional data
     */
    debug(message, data = null) {
        this.log(LOG_LEVELS.DEBUG, message, data);
    }

    /**
     * Log info message
     * @param {string} message - Log message
     * @param {Object} data - Additional data
     */
    info(message, data = null) {
        this.log(LOG_LEVELS.INFO, message, data);
    }

    /**
     * Log warning message
     * @param {string} message - Log message
     * @param {Object} data - Additional data
     */
    warning(message, data = null) {
        this.log(LOG_LEVELS.WARNING, message, data);
    }

    /**
     * Log error message
     * @param {string} message - Log message
     * @param {Object} data - Additional data
     */
    error(message, data = null) {
        this.log(LOG_LEVELS.ERROR, message, data);
    }

    /**
     * Log API request
     * @param {string} method - HTTP method
     * @param {string} url - Request URL
     * @param {Object} headers - Request headers
     * @param {Object} body - Request body
     */
    async logApiRequest(method, url, headers, body) {
        const redactedHeaders = { ...headers };
        if (redactedHeaders['x-goog-api-key']) {
            redactedHeaders['x-goog-api-key'] = redactApiKey(redactedHeaders['x-goog-api-key']);
        }

        this.info('API Request', {
            method,
            url,
            headers: redactedHeaders,
            bodyPreview: body ? JSON.stringify(body).substring(0, 200) + '...' : null
        });
    }

    /**
     * Log API response
     * @param {number} status - Response status
     * @param {Object} data - Response data
     * @param {number} duration - Request duration in ms
     */
    async logApiResponse(status, data, duration) {
        const level = status >= 400 ? LOG_LEVELS.ERROR : LOG_LEVELS.INFO;

        this.log(level, `API Response: ${status}`, {
            status,
            duration,
            dataPreview: data ? JSON.stringify(data).substring(0, 200) + '...' : null
        });
    }

    /**
     * Log generic message
     * @param {string} level - Log level
     * @param {string} message - Log message
     * @param {Object} data - Additional data
     */
    async log(level, message, data = null) {
        const logEntry = {
            level,
            message,
            data,
            sessionId: this.sessionId,
            timestamp: Date.now()
        };

        // Console output
        if (this.consoleEnabled) {
            const method = level === LOG_LEVELS.ERROR ? 'error' :
                         level === LOG_LEVELS.WARNING ? 'warn' :
                         level === LOG_LEVELS.DEBUG ? 'debug' : 'log';

            const prefix = `[${formatDate(new Date(), 'HH:mm:ss')}] [${level.toUpperCase()}]`;

            if (data) {
                console[method](prefix, message, data);
            } else {
                console[method](prefix, message);
            }
        }

        // Storage
        if (this.storageEnabled) {
            try {
                await this.storage.saveLog(logEntry);
            } catch (error) {
                console.error('Failed to save log to storage:', error);
            }
        }
    }

    /**
     * Set session ID
     * @param {string} sessionId - Session identifier
     */
    setSession(sessionId) {
        this.sessionId = sessionId;
    }

    /**
     * Get session ID
     * @returns {string} Session identifier
     */
    getSession() {
        return this.sessionId;
    }
}

// Singleton logger instance
let loggerInstance = null;

/**
 * Get logger instance
 * @param {Object} options - Logger options
 * @returns {Logger} Logger instance
 */
export function getLogger(options = {}) {
    if (!loggerInstance) {
        loggerInstance = new Logger(options);
    }
    return loggerInstance;
}

/**
 * Create new logger instance
 * @param {Object} options - Logger options
 * @returns {Logger} New logger instance
 */
export function createLogger(options = {}) {
    return new Logger(options);
}

export default {
    Logger,
    LOG_LEVELS,
    getLogger,
    createLogger
};