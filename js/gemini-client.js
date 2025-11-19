/**
 * Gemini API Client Module
 * Handles REST API calls to Google Gemini with retry/failover logic
 */

import { sleep, retryWithBackoff, redactApiKey } from './utils.js';
import { getSettingsManager } from './settings-manager.js';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Gemini API Client Class
 * Manages API calls with automatic retry and failover
 */
export class GeminiClient {
    constructor(options = {}) {
        this.settings = getSettingsManager();
        this.currentKeyIndex = 0; // 0 = primary, 1 = backup
        this.rateLimitState = {
            lastRequest: 0,
            requestCount: 0,
            resetTime: 0
        };

        // Override settings with options
        this.apiKeys = [
            options.apiKey || this.settings.getValue('apiKey'),
            options.backupApiKey || this.settings.getValue('backupApiKey')
        ].filter(k => k && k.length > 0);

        this.models = options.models || this.settings.getValue('models') || [];
        this.timeout = options.timeout || this.settings.getValue('apiTimeout') || 60000;
        this.maxRetries = options.maxRetries || this.settings.getValue('maxRetries') || 3;
        this.retryDelay = options.retryDelay || this.settings.getValue('retryDelay') || 2000;
        this.rateLimitDelay = options.rateLimitDelay || this.settings.getValue('rateLimitDelay') || 1000;
    }

    /**
     * Generate content using Gemini API
     * @param {string} prompt - Prompt text
     * @param {Object} options - Generation options
     * @returns {Promise<Object>} API response
     */
    async generateContent(prompt, options = {}) {
        const modelIndex = options.modelIndex || 0;
        const model = this.models[modelIndex];

        if (!model) {
            throw new Error('No model available');
        }

        // Build request body
        const requestBody = this.buildRequestBody(prompt, options);

        // Try with retry and failover
        try {
            return await this.callWithRetry(model, requestBody, modelIndex);
        } catch (error) {
            // If all retries failed with current model, try next model
            if (modelIndex < this.models.length - 1) {
                console.warn(`Model ${model} failed, trying next model...`);
                return await this.generateContent(prompt, {
                    ...options,
                    modelIndex: modelIndex + 1
                });
            }

            throw error;
        }
    }

    /**
     * Generate content with multimodal input (text + images)
     * @param {Array} parts - Array of content parts (text and/or images)
     * @param {Object} options - Generation options
     * @returns {Promise<Object>} API response
     */
    async generateMultimodal(parts, options = {}) {
        const modelIndex = options.modelIndex || 0;
        const model = this.models[modelIndex];

        if (!model) {
            throw new Error('No model available');
        }

        // Build multimodal request body
        const requestBody = {
            contents: [{
                parts: parts.map(part => {
                    if (part.type === 'text') {
                        return { text: part.content };
                    } else if (part.type === 'image') {
                        return {
                            inline_data: {
                                mime_type: part.mimeType || 'image/png',
                                data: part.data // base64 encoded
                            }
                        };
                    }
                    return part;
                })
            }],
            generationConfig: this.getGenerationConfig(options)
        };

        // Try with retry and failover
        try {
            return await this.callWithRetry(model, requestBody, modelIndex);
        } catch (error) {
            // If model doesn't support images, fall back to text-only
            if (error.message.includes('image') || error.message.includes('multimodal')) {
                console.warn('Model does not support images, falling back to text-only');
                const textParts = parts.filter(p => p.type === 'text');
                const combinedText = textParts.map(p => p.content).join('\n\n');
                return await this.generateContent(combinedText, options);
            }

            // Try next model if available
            if (modelIndex < this.models.length - 1) {
                console.warn(`Model ${model} failed, trying next model...`);
                return await this.generateMultimodal(parts, {
                    ...options,
                    modelIndex: modelIndex + 1
                });
            }

            throw error;
        }
    }

    /**
     * Call API with retry logic
     * @param {string} model - Model name
     * @param {Object} requestBody - Request body
     * @param {number} modelIndex - Current model index
     * @returns {Promise<Object>} API response
     */
    async callWithRetry(model, requestBody, modelIndex) {
        let lastError;

        for (let retry = 0; retry < this.maxRetries; retry++) {
            try {
                // Apply rate limiting
                await this.applyRateLimit();

                // Make API call
                const response = await this.makeRequest(model, requestBody);

                // Reset key index on success
                if (this.currentKeyIndex !== 0 && this.apiKeys.length > 1) {
                    console.log('Resetting to primary API key');
                    this.currentKeyIndex = 0;
                }

                return response;

            } catch (error) {
                lastError = error;

                // Handle rate limit errors
                if (error.status === 429) {
                    console.warn(`Rate limit hit (attempt ${retry + 1}/${this.maxRetries})`);

                    // Try backup key if available
                    if (this.currentKeyIndex === 0 && this.apiKeys.length > 1) {
                        console.log('Switching to backup API key');
                        this.currentKeyIndex = 1;
                        continue; // Retry with backup key immediately
                    }

                    // Wait longer for rate limit
                    const waitTime = this.retryDelay * Math.pow(2, retry) + this.rateLimitDelay;
                    await sleep(waitTime);
                    continue;
                }

                // Handle server errors (5xx)
                if (error.status >= 500 && error.status < 600) {
                    console.warn(`Server error ${error.status} (attempt ${retry + 1}/${this.maxRetries})`);

                    // Try backup key
                    if (this.currentKeyIndex === 0 && this.apiKeys.length > 1) {
                        this.currentKeyIndex = 1;
                    }

                    // Exponential backoff
                    const waitTime = this.retryDelay * Math.pow(2, retry);
                    await sleep(waitTime);
                    continue;
                }

                // Don't retry on client errors (4xx except 429)
                if (error.status >= 400 && error.status < 500 && error.status !== 429) {
                    throw error;
                }

                // Generic retry with backoff
                if (retry < this.maxRetries - 1) {
                    const waitTime = this.retryDelay * Math.pow(2, retry);
                    await sleep(waitTime);
                }
            }
        }

        throw lastError;
    }

    /**
     * Make API request
     * @param {string} model - Model name
     * @param {Object} requestBody - Request body
     * @returns {Promise<Object>} API response
     */
    async makeRequest(model, requestBody) {
        const apiKey = this.apiKeys[this.currentKeyIndex];

        if (!apiKey) {
            throw new Error('No API key available');
        }

        const url = `${GEMINI_BASE_URL}/models/${model}:generateContent`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // Update rate limit state
            this.rateLimitState.lastRequest = Date.now();
            this.rateLimitState.requestCount++;

            if (!response.ok) {
                const errorBody = await response.text();
                let errorMessage = `API request failed: ${response.status} ${response.statusText}`;

                try {
                    const errorData = JSON.parse(errorBody);
                    errorMessage = errorData.error?.message || errorMessage;
                } catch (e) {
                    // Use default error message
                }

                const error = new Error(errorMessage);
                error.status = response.status;
                error.response = errorBody;
                throw error;
            }

            const data = await response.json();

            // Extract text from response
            if (data.candidates && data.candidates.length > 0) {
                const candidate = data.candidates[0];
                if (candidate.content && candidate.content.parts) {
                    const text = candidate.content.parts
                        .map(part => part.text)
                        .join('');

                    return {
                        text,
                        model,
                        finishReason: candidate.finishReason,
                        raw: data
                    };
                }
            }

            throw new Error('Invalid response format from API');

        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                const timeoutError = new Error(`Request timeout after ${this.timeout}ms`);
                timeoutError.status = 408;
                throw timeoutError;
            }

            throw error;
        }
    }

    /**
     * Build request body
     * @param {string} prompt - Prompt text
     * @param {Object} options - Generation options
     * @returns {Object} Request body
     */
    buildRequestBody(prompt, options) {
        const systemPrompt = options.systemPrompt || this.settings.getValue('prompts.system');

        // Combine system prompt with user prompt
        const fullPrompt = systemPrompt
            ? `${systemPrompt}\n\n${prompt}`
            : prompt;

        return {
            contents: [{
                parts: [{ text: fullPrompt }]
            }],
            generationConfig: this.getGenerationConfig(options)
        };
    }

    /**
     * Get generation config
     * @param {Object} options - Override options
     * @returns {Object} Generation config
     */
    getGenerationConfig(options) {
        return {
            temperature: options.temperature ?? this.settings.getValue('temperature') ?? 1.0,
            topP: options.topP ?? this.settings.getValue('topP') ?? 0.95,
            topK: options.topK ?? this.settings.getValue('topK') ?? 40,
            maxOutputTokens: options.maxOutputTokens ?? this.settings.getValue('maxOutputTokens') ?? 4000,
            // Note: presencePenalty and frequencyPenalty may not be supported by all models
        };
    }

    /**
     * Apply rate limiting
     * @returns {Promise<void>}
     */
    async applyRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.rateLimitState.lastRequest;

        if (timeSinceLastRequest < this.rateLimitDelay) {
            const waitTime = this.rateLimitDelay - timeSinceLastRequest;
            await sleep(waitTime);
        }
    }

    /**
     * List available models
     * @returns {Promise<Array>} Array of model info
     */
    async listModels() {
        const apiKey = this.apiKeys[this.currentKeyIndex];

        if (!apiKey) {
            throw new Error('No API key available');
        }

        const url = `${GEMINI_BASE_URL}/models`;

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'x-goog-api-key': apiKey
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to list models: ${response.status}`);
            }

            const data = await response.json();
            return data.models || [];

        } catch (error) {
            console.error('Error listing models:', error);
            throw error;
        }
    }

    /**
     * Test API key validity
     * @param {string} apiKey - API key to test
     * @returns {Promise<boolean>} True if valid
     */
    async testApiKey(apiKey) {
        try {
            const url = `${GEMINI_BASE_URL}/models`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'x-goog-api-key': apiKey
                }
            });

            return response.ok;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get current API key (redacted)
     * @returns {string} Redacted API key
     */
    getCurrentKey() {
        const key = this.apiKeys[this.currentKeyIndex];
        return key ? redactApiKey(key) : 'No key';
    }

    /**
     * Get rate limit state
     * @returns {Object} Rate limit state
     */
    getRateLimitState() {
        return { ...this.rateLimitState };
    }

    /**
     * Reset rate limit state
     */
    resetRateLimitState() {
        this.rateLimitState = {
            lastRequest: 0,
            requestCount: 0,
            resetTime: 0
        };
    }
}

/**
 * Create Gemini client with current settings
 * @returns {GeminiClient} Client instance
 */
export function createGeminiClient(options = {}) {
    return new GeminiClient(options);
}

export default GeminiClient;