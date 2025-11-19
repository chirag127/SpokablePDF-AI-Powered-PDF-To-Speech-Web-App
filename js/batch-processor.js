/**
 * Batch Processor Module
 * Handles parallel batch processing with queue management
 */

import { sleep, generateId } from './utils.js';
import { getSettingsManager } from './settings-manager.js';
import { createGeminiClient } from './gemini-client.js';
import { getLogger } from './logger.js';

/**
 * Batch Processor Class
 * Manages parallel batch processing with concurrency control
 */
export class BatchProcessor {
    constructor(options = {}) {
        this.settings = getSettingsManager();
        this.client = options.client || createGeminiClient();
        this.logger = options.logger || getLogger();

        this.maxConcurrent = options.maxConcurrent || this.settings.getValue('parallelChunks') || 3;
        this.turboMode = options.turboMode ?? this.settings.getValue('turboMode') ?? false;

        this.queue = [];
        this.processing = new Map();
        this.completed = new Map();
        this.failed = new Map();
        this.paused = false;
        this.cancelled = false;
    }

    /**
     * Process batches
     * @param {Array} batches - Array of batch objects
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} Processing results
     */
    async processBatches(batches, options = {}) {
        this.queue = [...batches];
        this.processing.clear();
        this.completed.clear();
        this.failed.clear();
        this.paused = false;
        this.cancelled = false;

        const concurrency = this.turboMode ? this.maxConcurrent : 1;

        this.logger.info(`Starting batch processing: ${batches.length} batches, concurrency: ${concurrency}`);

        // Create worker promises
        const workers = [];
        for (let i = 0; i < concurrency; i++) {
            workers.push(this.worker(i, options));
        }

        // Wait for all workers to complete
        await Promise.all(workers);

        // Compile results
        const results = {
            completed: Array.from(this.completed.values()),
            failed: Array.from(this.failed.values()),
            stats: {
                total: batches.length,
                successful: this.completed.size,
                failed: this.failed.size,
                successRate: (this.completed.size / batches.length) * 100
            }
        };

        this.logger.info(`Batch processing complete`, results.stats);

        return results;
    }

    /**
     * Worker function for processing batches
     * @param {number} workerId - Worker identifier
     * @param {Object} options - Processing options
     */
    async worker(workerId, options) {
        this.logger.debug(`Worker ${workerId} started`);

        while (this.queue.length > 0 && !this.cancelled) {
            // Wait if paused
            while (this.paused && !this.cancelled) {
                await sleep(100);
            }

            if (this.cancelled) break;

            // Get next batch
            const batch = this.queue.shift();
            if (!batch) break;

            this.processing.set(batch.id, {
                ...batch,
                workerId,
                startTime: Date.now()
            });

            // Notify progress
            if (options.onBatchStart) {
                options.onBatchStart(batch, workerId);
            }

            try {
                // Process batch
                const result = await this.processBatch(batch, options);

                // Mark as completed
                this.processing.delete(batch.id);
                this.completed.set(batch.id, {
                    ...batch,
                    result,
                    workerId,
                    duration: Date.now() - this.processing.get(batch.id)?.startTime
                });

                // Notify progress
                if (options.onBatchComplete) {
                    options.onBatchComplete(batch, result, workerId);
                }

            } catch (error) {
                this.logger.error(`Batch ${batch.id} failed`, { error: error.message });

                // Mark as failed
                this.processing.delete(batch.id);
                this.failed.set(batch.id, {
                    ...batch,
                    error: error.message,
                    workerId
                });

                // Notify progress
                if (options.onBatchFail) {
                    options.onBatchFail(batch, error, workerId);
                }
            }

            // Adaptive rate limiting: if we're hitting rate limits, slow down
            if (this.turboMode && this.hasRecentRateLimits()) {
                this.logger.warning('Rate limits detected, reducing parallelism');
                // Return early to reduce active workers
                if (workerId > 0) {
                    this.logger.debug(`Worker ${workerId} stopping due to rate limits`);
                    break;
                }
            }
        }

        this.logger.debug(`Worker ${workerId} finished`);
    }

    /**
     * Process a single batch
     * @param {Object} batch - Batch to process
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} Processing result
     */
    async processBatch(batch, options) {
        const prompt = this.buildPrompt(batch.text, options);

        const response = await this.client.generateContent(prompt, {
            systemPrompt: options.systemPrompt,
            temperature: options.temperature,
            topP: options.topP,
            topK: options.topK,
            maxOutputTokens: options.maxOutputTokens
        });

        return response;
    }

    /**
     * Build transformation prompt
     * @param {string} text - Text to transform
     * @param {Object} options - Prompt options
     * @returns {string} Complete prompt
     */
    buildPrompt(text, options) {
        const basePrompt = options.transformationPrompt ||
                          this.settings.getValue('prompts.textTransformation');

        return `${basePrompt}\n\n---\n\n${text}`;
    }

    /**
     * Check if we've had recent rate limits
     * @returns {boolean} True if recent rate limits detected
     */
    hasRecentRateLimits() {
        // Check failed batches for rate limit errors
        const recentFailed = Array.from(this.failed.values())
            .filter(f => f.error && f.error.includes('429'));

        return recentFailed.length > 2; // More than 2 rate limit errors
    }

    /**
     * Pause processing
     */
    pause() {
        this.paused = true;
        this.logger.info('Batch processing paused');
    }

    /**
     * Resume processing
     */
    resume() {
        this.paused = false;
        this.logger.info('Batch processing resumed');
    }

    /**
     * Cancel processing
     */
    cancel() {
        this.cancelled = true;
        this.logger.info('Batch processing cancelled');
    }

    /**
     * Get current status
     * @returns {Object} Status object
     */
    getStatus() {
        return {
            queueSize: this.queue.length,
            processing: this.processing.size,
            completed: this.completed.size,
            failed: this.failed.size,
            paused: this.paused,
            cancelled: this.cancelled
        };
    }

    /**
     * Retry failed batches
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} Retry results
     */
    async retryFailed(options = {}) {
        const failedBatches = Array.from(this.failed.values());

        if (failedBatches.length === 0) {
            return { completed: [], failed: [] };
        }

        this.logger.info(`Retrying ${failedBatches.length} failed batches`);

        // Clear failed map and add back to queue
        this.failed.clear();
        this.queue = failedBatches.map(f => ({
            id: f.id,
            text: f.text,
            batchNumber: f.batchNumber
        }));

        // Process with reduced concurrency
        const originalConcurrency = this.maxConcurrent;
        this.maxConcurrent = 1; // Always retry serially to avoid rate limits

        const results = await this.processBatches(this.queue, options);

        this.maxConcurrent = originalConcurrency;

        return results;
    }
}

/**
 * Create batch processor
 * @param {Object} options - Options
 * @returns {BatchProcessor} Processor instance
 */
export function createBatchProcessor(options = {}) {
    return new BatchProcessor(options);
}

export default BatchProcessor;