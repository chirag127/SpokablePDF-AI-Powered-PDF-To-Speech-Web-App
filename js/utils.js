/**
 * Utility Functions for Readable Spokable PDF
 * Provides common helper functions used throughout the application
 */

/**
 * Format bytes to human-readable string
 * @param {number} bytes - Number of bytes
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted string (e.g., "1.5 MB")
 */
export function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format milliseconds to human-readable duration
 * @param {number} ms - Milliseconds
 * @returns {string} Formatted duration (e.g., "2h 30m 15s")
 */
export function formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;

    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

    return parts.join(' ');
}

/**
 * Estimate ETA based on progress and elapsed time
 * @param {number} completed - Number of items completed
 * @param {number} total - Total number of items
 * @param {number} elapsed - Elapsed time in milliseconds
 * @returns {string} Estimated time remaining
 */
export function estimateETA(completed, total, elapsed) {
    if (completed === 0) return 'Calculating...';
    if (completed >= total) return 'Complete';

    const rate = completed / elapsed;
    const remaining = total - completed;
    const etaMs = remaining / rate;

    return formatDuration(etaMs);
}

/**
 * Estimate token count for text (rough approximation)
 * @param {string} text - Text to estimate
 * @returns {number} Estimated token count
 */
export function estimateTokenCount(text) {
    // Rough estimate: ~4 characters per token on average
    // This is a simplification; actual tokenization varies by model
    return Math.ceil(text.length / 4);
}

/**
 * Chunk text into batches with overlap
 * @param {string} text - Text to chunk
 * @param {number} batchSize - Target batch size in tokens
 * @param {number} overlapSize - Overlap size in tokens
 * @returns {Array<{text: string, start: number, end: number}>} Array of chunks
 */
export function chunkText(text, batchSize = 10000, overlapSize = 200) {
    const chunks = [];

    // Convert tokens to approximate character count
    const batchChars = batchSize * 4;
    const overlapChars = overlapSize * 4;

    let start = 0;

    while (start < text.length) {
        const end = Math.min(start + batchChars, text.length);
        const chunkText = text.substring(start, end);

        chunks.push({
            text: chunkText,
            start,
            end,
            tokens: estimateTokenCount(chunkText)
        });

        // Move start position forward, accounting for overlap
        start = end - overlapChars;

        // Prevent infinite loop if overlap is larger than batch
        if (start >= end) start = end;
    }

    return chunks;
}

/**
 * Debounce function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;

    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };

        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
    let inThrottle;

    return function executedFunction(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after delay
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise} Result of function or throws error
 */
export async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            if (i < maxRetries - 1) {
                const delay = baseDelay * Math.pow(2, i);
                await sleep(delay);
            }
        }
    }

    throw lastError;
}

/**
 * Generate unique ID
 * @returns {string} Unique identifier
 */
export function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Parse JSON safely
 * @param {string} json - JSON string to parse
 * @param {*} defaultValue - Default value if parsing fails
 * @returns {*} Parsed object or default value
 */
export function safeJSONParse(json, defaultValue = null) {
    try {
        return JSON.parse(json);
    } catch (e) {
        return defaultValue;
    }
}

/**
 * Deep clone object
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;

    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Array) return obj.map(item => deepClone(item));

    const clonedObj = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            clonedObj[key] = deepClone(obj[key]);
        }
    }

    return clonedObj;
}

/**
 * Detect language from text (simple heuristic)
 * @param {string} text - Text to analyze
 * @returns {string} Detected language code
 */
export function detectLanguage(text) {
    // Very basic detection - just check for common English words
    const englishWords = ['the', 'and', 'is', 'in', 'to', 'of', 'a', 'for'];
    const sample = text.toLowerCase().substring(0, 1000);

    let englishWordCount = 0;
    for (const word of englishWords) {
        if (sample.includes(` ${word} `)) {
            englishWordCount++;
        }
    }

    // If more than half the common words are found, likely English
    return englishWordCount > englishWords.length / 2 ? 'English' : 'Unknown';
}

/**
 * Sanitize filename
 * @param {string} filename - Filename to sanitize
 * @returns {string} Sanitized filename
 */
export function sanitizeFilename(filename) {
    return filename
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .replace(/__+/g, '_')
        .substring(0, 255);
}

/**
 * Download blob as file
 * @param {Blob} blob - Blob to download
 * @param {string} filename - Filename for download
 */
export function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = sanitizeFilename(filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type of toast (info, success, warning, danger)
 * @param {number} duration - Duration in milliseconds
 */
export function showToast(message, type = 'info', duration = 3000) {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    // Add styles
    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        padding: '1rem 1.5rem',
        borderRadius: '0.5rem',
        backgroundColor: type === 'success' ? '#10b981' :
                        type === 'warning' ? '#f59e0b' :
                        type === 'danger' ? '#ef4444' : '#06b6d4',
        color: 'white',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        zIndex: '10000',
        animation: 'slideIn 0.3s ease-out',
        maxWidth: '400px'
    });

    document.body.appendChild(toast);

    // Remove after duration
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => document.body.removeChild(toast), 300);
    }, duration);
}

/**
 * Validate API key format
 * @param {string} apiKey - API key to validate
 * @returns {boolean} True if valid format
 */
export function validateApiKey(apiKey) {
    // Basic validation: should start with "AIza" and be reasonably long
    return typeof apiKey === 'string' &&
           apiKey.startsWith('AIza') &&
           apiKey.length > 30;
}

/**
 * Redact API key for logging
 * @param {string} apiKey - API key to redact
 * @returns {string} Redacted key
 */
export function redactApiKey(apiKey) {
    if (!apiKey || apiKey.length < 10) return '[REDACTED]';
    return `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`;
}

/**
 * Calculate percentage
 * @param {number} value - Current value
 * @param {number} total - Total value
 * @returns {number} Percentage (0-100)
 */
export function calculatePercentage(value, total) {
    if (total === 0) return 0;
    return Math.min(100, Math.max(0, (value / total) * 100));
}

/**
 * Format date
 * @param {Date} date - Date to format
 * @param {string} format - Format string (YYYY-MM-DD, etc.)
 * @returns {string} Formatted date
 */
export function formatDate(date, format = 'YYYY-MM-DD') {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return format
        .replace('YYYY', year)
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds);
}

/**
 * Check if browser supports required features
 * @returns {Object} Feature support status
 */
export function checkBrowserSupport() {
    return {
        indexedDB: 'indexedDB' in window,
        localStorage: typeof Storage !== 'undefined',
        fileReader: typeof FileReader !== 'undefined',
        fetch: typeof fetch !== 'undefined',
        pdfjs: typeof pdfjsLib !== 'undefined'
    };
}

/**
 * Get element by ID with error handling
 * @param {string} id - Element ID
 * @returns {HTMLElement|null} Element or null
 */
export function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Element with id '${id}' not found`);
    }
    return element;
}

/**
 * Set element visibility
 * @param {string|HTMLElement} element - Element or ID
 * @param {boolean} visible - Whether to show or hide
 */
export function setVisible(element, visible) {
    const el = typeof element === 'string' ? getElement(element) : element;
    if (el) {
        el.style.display = visible ? '' : 'none';
    }
}

/**
 * Add CSS animation
 * @param {HTMLElement} element - Element to animate
 * @param {string} animationClass - Animation class name
 * @param {Function} callback - Callback after animation
 */
export function addAnimation(element, animationClass, callback) {
    element.classList.add(animationClass);

    const handleAnimationEnd = () => {
        element.classList.remove(animationClass);
        element.removeEventListener('animationend', handleAnimationEnd);
        if (callback) callback();
    };

    element.addEventListener('animationend', handleAnimationEnd);
}

export default {
    formatBytes,
    formatDuration,
    estimateETA,
    estimateTokenCount,
    chunkText,
    debounce,
    throttle,
    sleep,
    retryWithBackoff,
    generateId,
    safeJSONParse,
    deepClone,
    detectLanguage,
    sanitizeFilename,
    downloadBlob,
    showToast,
    validateApiKey,
    redactApiKey,
    calculatePercentage,
    formatDate,
    checkBrowserSupport,
    getElement,
    setVisible,
    addAnimation
};