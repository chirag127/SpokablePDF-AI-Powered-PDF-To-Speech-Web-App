/**
 * Settings Manager Module
 * Handles application settings persistence using LocalStorage
 */

import { deepClone, safeJSONParse } from './utils.js';

const SETTINGS_KEY = 'readable-spokable-pdf-settings';
const THEME_KEY = 'readable-spokable-pdf-theme';

/**
 * Default settings configuration
 */
const DEFAULT_SETTINGS = {
    // API Configuration
    apiKey: '',
    backupApiKey: '',
    apiTimeout: 60000, // 60 seconds

    // Model Configuration
    models: [
        'gemini-3-pro-preview',
        'gemini-2.5-pro',
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
        'gemini-2.0-flash'
    ],

    // Batch Processing
    batchSize: 10000, // tokens
    overlapSize: 200, // tokens
    maxRetries: 3,
    retryDelay: 2000, // milliseconds
    parallelChunks: 3,
    turboMode: false,
    rateLimitDelay: 1000, // milliseconds
    autoRetry: true,

    // AI Generation Parameters
    temperature: 1.0,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 4000,
    presencePenalty: 0,
    frequencyPenalty: 0,

    // Transformation Prompts
    prompts: {
        system: 'You are an expert at converting technical documentation into natural, spoken language optimized for text-to-speech systems.',

        textTransformation: 'Convert the following text into a natural, spoken format that is easy to listen to. Maintain accuracy while making it conversational. Expand acronyms on first use. Convert formulas and special symbols into spoken words. Convert tables into narrative sentences. Describe figures and images clearly. Replace code blocks with descriptive explanations of what the code does (do not read code line-by-line). Preserve the logical order and headings. Add natural transitions between sections. Remove inline citations and footnotes. Make the output TTS-friendly with good rhythm (commas and pauses).',

        tableConversion: 'Convert the following table into easy-to-listen narrative sentences. Describe each row clearly, mentioning the column headers for context. Make it flow naturally as if explaining the data to someone.',

        codeDescription: 'Describe what the following code does in plain English. Explain its purpose, key functions, and logic flow without reading the code line-by-line. Make it understandable for someone listening.',

        mathNotation: 'Convert the following mathematical notation into spoken form. For example, "x²" becomes "x squared", "∑" becomes "sum of", "∫" becomes "integral of". Make all symbols and formulas pronounceable.',

        figureDescription: 'Describe the following figure or image in detail. Explain what it shows, its key elements, and its significance in the context. Make it clear and informative for someone who cannot see it.',

        listFormatting: 'Convert the following list into a natural spoken format. Use clear transitions like "first", "next", "finally" to make the sequence easy to follow.'
    },

    // Transformation Rules
    rules: {
        preserveEnglish: true,
        expandAcronyms: true,
        simplifyJargon: true,
        addPhoneticHints: false,
        insertPauseMarkers: true,
        includeImages: true
    },

    // PDF Output Configuration
    pdfConfig: {
        fontSize: 12,
        lineHeight: 1.5,
        pageMargin: 20, // mm
        fontFamily: 'Times New Roman',
        pageSize: 'Letter', // Letter, A4, Legal
        addPageNumbers: true,
        generateTOC: true,
        includeOriginal: false
    },

    // Language Settings
    inputLanguage: 'English',
    outputLanguage: 'English',

    // Date Format
    dateFormat: 'YYYY-MM-DD',

    // Feature Flags
    features: {
        enableDiagnostics: true,
        enableLogs: true,
        enableAutoSave: true,
        enableNotifications: true
    },

    // Last Updated
    lastUpdated: Date.now()
};

/**
 * Settings Manager Class
 */
export class SettingsManager {
    constructor() {
        this.settings = null;
        this.listeners = [];
    }

    /**
     * Initialize settings
     * @returns {Object} Current settings
     */
    init() {
        this.settings = this.load();
        return this.settings;
    }

    /**
     * Load settings from LocalStorage
     * @returns {Object} Loaded settings
     */
    load() {
        try {
            const stored = localStorage.getItem(SETTINGS_KEY);
            if (stored) {
                const parsed = safeJSONParse(stored, null);
                if (parsed) {
                    // Merge with defaults to ensure new settings are included
                    return this.mergeWithDefaults(parsed);
                }
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }

        // Return defaults if loading fails
        return deepClone(DEFAULT_SETTINGS);
    }

    /**
     * Save settings to LocalStorage
     * @param {Object} settings - Settings to save (optional, uses current if not provided)
     * @returns {boolean} Success status
     */
    save(settings = null) {
        try {
            const toSave = settings || this.settings;
            toSave.lastUpdated = Date.now();

            localStorage.setItem(SETTINGS_KEY, JSON.stringify(toSave));

            if (settings) {
                this.settings = settings;
            }

            // Notify listeners
            this.notifyListeners(this.settings);

            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            return false;
        }
    }

    /**
     * Get current settings
     * @returns {Object} Current settings
     */
    get() {
        if (!this.settings) {
            this.init();
        }
        return deepClone(this.settings);
    }

    /**
     * Update settings
     * @param {Object} updates - Settings to update
     * @returns {Object} Updated settings
     */
    update(updates) {
        if (!this.settings) {
            this.init();
        }

        this.settings = this.deepMerge(this.settings, updates);
        this.save();

        return this.get();
    }

    /**
     * Get specific setting
     * @param {string} key - Setting key (supports dot notation)
     * @returns {*} Setting value
     */
    getValue(key) {
        if (!this.settings) {
            this.init();
        }

        return this.getNestedValue(this.settings, key);
    }

    /**
     * Set specific setting
     * @param {string} key - Setting key (supports dot notation)
     * @param {*} value - Setting value
     * @returns {boolean} Success status
     */
    setValue(key, value) {
        if (!this.settings) {
            this.init();
        }

        this.setNestedValue(this.settings, key, value);
        return this.save();
    }

    /**
     * Reset to default settings
     * @returns {Object} Default settings
     */
    reset() {
        this.settings = deepClone(DEFAULT_SETTINGS);
        this.save();
        return this.get();
    }

    /**
     * Reset specific section to defaults
     * @param {string} section - Section to reset (e.g., 'prompts', 'pdfConfig')
     * @returns {Object} Updated settings
     */
    resetSection(section) {
        if (!this.settings) {
            this.init();
        }

        if (DEFAULT_SETTINGS[section]) {
            this.settings[section] = deepClone(DEFAULT_SETTINGS[section]);
            this.save();
        }

        return this.get();
    }

    /**
     * Export settings as JSON
     * @returns {string} JSON string
     */
    export() {
        if (!this.settings) {
            this.init();
        }

        return JSON.stringify(this.settings, null, 2);
    }

    /**
     * Import settings from JSON
     * @param {string} json - JSON string
     * @returns {boolean} Success status
     */
    import(json) {
        try {
            const imported = JSON.parse(json);
            const merged = this.mergeWithDefaults(imported);
            this.settings = merged;
            this.save();
            return true;
        } catch (error) {
            console.error('Error importing settings:', error);
            return false;
        }
    }

    /**
     * Validate API key
     * @returns {boolean} True if API key is set and valid
     */
    validateApiKey() {
        const apiKey = this.getValue('apiKey');
        return typeof apiKey === 'string' &&
               apiKey.startsWith('AIza') &&
               apiKey.length > 30;
    }

    /**
     * Has backup API key
     * @returns {boolean} True if backup key is set
     */
    hasBackupKey() {
        const backupKey = this.getValue('backupApiKey');
        return typeof backupKey === 'string' &&
               backupKey.startsWith('AIza') &&
               backupKey.length > 30;
    }

    /**
     * Clear API keys
     */
    clearApiKeys() {
        this.setValue('apiKey', '');
        this.setValue('backupApiKey', '');
    }

    /**
     * Subscribe to settings changes
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback) {
        this.listeners.push(callback);

        // Return unsubscribe function
        return () => {
            const index = this.listeners.indexOf(callback);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    /**
     * Notify listeners of changes
     * @param {Object} settings - Updated settings
     */
    notifyListeners(settings) {
        for (const listener of this.listeners) {
            try {
                listener(deepClone(settings));
            } catch (error) {
                console.error('Error in settings listener:', error);
            }
        }
    }

    /**
     * Merge settings with defaults
     * @param {Object} settings - Settings to merge
     * @returns {Object} Merged settings
     */
    mergeWithDefaults(settings) {
        return this.deepMerge(deepClone(DEFAULT_SETTINGS), settings);
    }

    /**
     * Deep merge two objects
     * @param {Object} target - Target object
     * @param {Object} source - Source object
     * @returns {Object} Merged object
     */
    deepMerge(target, source) {
        const output = { ...target };

        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (source[key] instanceof Object && !Array.isArray(source[key])) {
                    output[key] = this.deepMerge(output[key] || {}, source[key]);
                } else {
                    output[key] = source[key];
                }
            }
        }

        return output;
    }

    /**
     * Get nested value from object using dot notation
     * @param {Object} obj - Object to search
     * @param {string} path - Dot notation path
     * @returns {*} Value or undefined
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) =>
            current && current[key] !== undefined ? current[key] : undefined,
            obj
        );
    }

    /**
     * Set nested value in object using dot notation
     * @param {Object} obj - Object to modify
     * @param {string} path - Dot notation path
     * @param {*} value - Value to set
     */
    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            return current[key];
        }, obj);

        target[lastKey] = value;
    }

    /**
     * Get default settings
     * @returns {Object} Default settings
     */
    static getDefaults() {
        return deepClone(DEFAULT_SETTINGS);
    }
}

/**
 * Theme Manager
 */
export class ThemeManager {
    constructor() {
        this.currentTheme = null;
    }

    /**
     * Initialize theme
     */
    init() {
        const saved = localStorage.getItem(THEME_KEY);
        this.currentTheme = saved || 'light';
        this.apply(this.currentTheme);
    }

    /**
     * Get current theme
     * @returns {string} Theme name
     */
    get() {
        if (!this.currentTheme) {
            this.init();
        }
        return this.currentTheme;
    }

    /**
     * Set theme
     * @param {string} theme - Theme name ('light' or 'dark')
     */
    set(theme) {
        this.currentTheme = theme;
        this.apply(theme);
        localStorage.setItem(THEME_KEY, theme);
    }

    /**
     * Toggle theme
     * @returns {string} New theme
     */
    toggle() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.set(newTheme);
        return newTheme;
    }

    /**
     * Apply theme to document
     * @param {string} theme - Theme name
     */
    apply(theme) {
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    }

    /**
     * Check if dark mode
     * @returns {boolean} True if dark mode
     */
    isDark() {
        return this.get() === 'dark';
    }
}

// Singleton instances
let settingsInstance = null;
let themeInstance = null;

/**
 * Get settings manager instance
 * @returns {SettingsManager} Settings manager
 */
export function getSettingsManager() {
    if (!settingsInstance) {
        settingsInstance = new SettingsManager();
        settingsInstance.init();
    }
    return settingsInstance;
}

/**
 * Get theme manager instance
 * @returns {ThemeManager} Theme manager
 */
export function getThemeManager() {
    if (!themeInstance) {
        themeInstance = new ThemeManager();
        themeInstance.init();
    }
    return themeInstance;
}

export default {
    SettingsManager,
    ThemeManager,
    getSettingsManager,
    getThemeManager,
    DEFAULT_SETTINGS
};