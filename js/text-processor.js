/**
 * Text Processor Module
 * Handles text batching, chunking, and transformation coordination
 */

import { chunkText, estimateTokenCount, generateId } from './utils.js';
import { getSettingsManager } from './settings-manager.js';
import { createGeminiClient } from './gemini-client.js';

/**
 * Text Processor Class
 * Manages text transformation pipeline
 */
export class TextProcessor {
    constructor(options = {}) {
        this.settings = getSettingsManager();
        this.client = options.client || createGeminiClient();
        this.batchSize = options.batchSize || this.settings.getValue('batchSize') || 10000;
        this.overlapSize = options.overlapSize || this.settings.getValue('overlapSize') || 200;
    }

    /**
     * Process text through transformation pipeline
     * @param {string} text - Text to process
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} Processing results
     */
    async process(text, options = {}) {
        // Create batches
        const batches = this.createBatches(text);

        // Process batches
        const results = [];
        const errors = [];

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];

            try {
                // Notify progress
                if (options.onProgress) {
                    options.onProgress({
                        stage: 'processing',
                        batchNumber: i + 1,
                        totalBatches: batches.length,
                        percentage: ((i + 1) / batches.length) * 100
                    });
                }

                // Transform batch
                const transformed = await this.transformBatch(batch, options);

                results.push({
                    batchId: batch.id,
                    batchNumber: i + 1,
                    originalText: batch.text,
                    transformedText: transformed.text,
                    model: transformed.model,
                    success: true
                });

            } catch (error) {
                console.error(`Error processing batch ${i + 1}:`, error);

                errors.push({
                    batchId: batch.id,
                    batchNumber: i + 1,
                    error: error.message,
                    originalText: batch.text
                });

                results.push({
                    batchId: batch.id,
                    batchNumber: i + 1,
                    originalText: batch.text,
                    transformedText: null,
                    error: error.message,
                    success: false
                });
            }
        }

        // Combine results
        const transformedText = results
            .filter(r => r.success)
            .map(r => r.transformedText)
            .join('\n\n');

        return {
            originalText: text,
            transformedText,
            batches: results,
            errors,
            stats: {
                totalBatches: batches.length,
                successfulBatches: results.filter(r => r.success).length,
                failedBatches: errors.length,
                successRate: (results.filter(r => r.success).length / batches.length) * 100
            }
        };
    }

    /**
     * Create batches from text
     * @param {string} text - Text to batch
     * @returns {Array} Array of batch objects
     */
    createBatches(text) {
        const chunks = chunkText(text, this.batchSize, this.overlapSize);

        return chunks.map((chunk, index) => ({
            id: generateId(),
            batchNumber: index + 1,
            text: chunk.text,
            start: chunk.start,
            end: chunk.end,
            tokens: chunk.tokens
        }));
    }

    /**
     * Transform a single batch
     * @param {Object} batch - Batch object
     * @param {Object} options - Transformation options
     * @returns {Promise<Object>} Transformation result
     */
    async transformBatch(batch, options = {}) {
        const prompt = this.buildPrompt(batch.text, options);

        const response = await this.client.generateContent(prompt, {
            systemPrompt: options.systemPrompt || this.settings.getValue('prompts.system'),
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
    buildPrompt(text, options = {}) {
        const basePrompt = options.transformationPrompt ||
                          this.settings.getValue('prompts.textTransformation');

        return `${basePrompt}\n\n---\n\n${text}`;
    }

    /**
     * Process text with images
     * @param {string} text - Text content
     * @param {Array} images - Array of image objects
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} Processing results
     */
    async processWithImages(text, images, options = {}) {
        // Create batches
        const batches = this.createBatches(text);

        // Map images to batches based on position in text
        const batchesWithImages = this.assignImagesToBatches(batches, images);

        // Process each batch
        const results = [];
        const errors = [];

        for (let i = 0; i < batchesWithImages.length; i++) {
            const batch = batchesWithImages[i];

            try {
                if (options.onProgress) {
                    options.onProgress({
                        stage: 'processing_with_images',
                        batchNumber: i + 1,
                        totalBatches: batchesWithImages.length,
                        percentage: ((i + 1) / batchesWithImages.length) * 100
                    });
                }

                let transformed;

                if (batch.images && batch.images.length > 0) {
                    // Process with multimodal API
                    transformed = await this.transformBatchWithImages(batch, options);
                } else {
                    // Process text-only
                    transformed = await this.transformBatch(batch, options);
                }

                results.push({
                    batchId: batch.id,
                    batchNumber: i + 1,
                    originalText: batch.text,
                    transformedText: transformed.text,
                    images: batch.images,
                    model: transformed.model,
                    success: true
                });

            } catch (error) {
                console.error(`Error processing batch ${i + 1}:`, error);

                errors.push({
                    batchId: batch.id,
                    batchNumber: i + 1,
                    error: error.message
                });

                results.push({
                    batchId: batch.id,
                    batchNumber: i + 1,
                    originalText: batch.text,
                    transformedText: null,
                    error: error.message,
                    success: false
                });
            }
        }

        const transformedText = results
            .filter(r => r.success)
            .map(r => r.transformedText)
            .join('\n\n');

        return {
            originalText: text,
            transformedText,
            batches: results,
            errors,
            stats: {
                totalBatches: batchesWithImages.length,
                successfulBatches: results.filter(r => r.success).length,
                failedBatches: errors.length,
                successRate: (results.filter(r => r.success).length / batchesWithImages.length) * 100
            }
        };
    }

    /**
     * Assign images to batches based on text position
     * @param {Array} batches - Text batches
     * @param {Array} images - Image objects with pageNum
     * @returns {Array} Batches with assigned images
     */
    assignImagesToBatches(batches, images) {
        // Simple strategy: distribute images evenly across batches
        // In a real implementation, you'd use page numbers or text positions

        const batchesPerImage = Math.ceil(batches.length / Math.max(images.length, 1));

        return batches.map((batch, index) => {
            const imageIndex = Math.floor(index / batchesPerImage);
            const assignedImages = images[imageIndex] ? [images[imageIndex]] : [];

            return {
                ...batch,
                images: assignedImages
            };
        });
    }

    /**
     * Transform batch with images using multimodal API
     * @param {Object} batch - Batch with images
     * @param {Object} options - Transformation options
     * @returns {Promise<Object>} Transformation result
     */
    async transformBatchWithImages(batch, options = {}) {
        const parts = [];

        // Add text part
        const textPrompt = this.buildPrompt(batch.text, options);
        parts.push({
            type: 'text',
            content: textPrompt
        });

        // Add image parts
        if (batch.images) {
            for (const image of batch.images) {
                const imagePrompt = options.imagePrompt ||
                                   this.settings.getValue('prompts.figureDescription');

                parts.push({
                    type: 'text',
                    content: `\n\n${imagePrompt}`
                });

                parts.push({
                    type: 'image',
                    data: image.base64,
                    mimeType: image.mimeType || 'image/png'
                });
            }
        }

        return await this.client.generateMultimodal(parts, options);
    }

    /**
     * Detect and transform specific content types
     * @param {string} text - Text to analyze
     * @param {Object} options - Transformation options
     * @returns {Promise<string>} Transformed text
     */
    async transformSpecialContent(text, options = {}) {
        const rules = this.settings.getValue('rules');
        let transformed = text;

        // Detect code blocks
        const codeBlockRegex = /```[\s\S]*?```|`[^`]+`/g;
        const codeBlocks = text.match(codeBlockRegex) || [];

        for (const codeBlock of codeBlocks) {
            const codePrompt = this.settings.getValue('prompts.codeDescription');
            const codeText = codeBlock.replace(/```/g, '').trim();

            try {
                const response = await this.client.generateContent(
                    `${codePrompt}\n\n${codeText}`,
                    options
                );

                transformed = transformed.replace(codeBlock, response.text);
            } catch (error) {
                console.warn('Could not transform code block:', error);
            }
        }

        // Detect tables (simple markdown table detection)
        const tableRegex = /\|.+\|[\s\S]*?\n\|[-:\s|]+\|[\s\S]*?(?=\n\n|\n$|$)/g;
        const tables = text.match(tableRegex) || [];

        for (const table of tables) {
            const tablePrompt = this.settings.getValue('prompts.tableConversion');

            try {
                const response = await this.client.generateContent(
                    `${tablePrompt}\n\n${table}`,
                    options
                );

                transformed = transformed.replace(table, response.text);
            } catch (error) {
                console.warn('Could not transform table:', error);
            }
        }

        // Detect math notation
        const mathRegex = /\$\$[\s\S]*?\$\$|\$[^$]+\$/g;
        const mathBlocks = text.match(mathRegex) || [];

        for (const mathBlock of mathBlocks) {
            const mathPrompt = this.settings.getValue('prompts.mathNotation');
            const mathText = mathBlock.replace(/\$/g, '').trim();

            try {
                const response = await this.client.generateContent(
                    `${mathPrompt}\n\n${mathText}`,
                    options
                );

                transformed = transformed.replace(mathBlock, response.text);
            } catch (error) {
                console.warn('Could not transform math notation:', error);
            }
        }

        return transformed;
    }

    /**
     * Apply transformation rules
     * @param {string} text - Text to process
     * @returns {string} Processed text
     */
    applyRules(text) {
        const rules = this.settings.getValue('rules');
        let processed = text;

        if (rules.expandAcronyms) {
            // Basic acronym expansion (would need a dictionary in production)
            processed = processed.replace(/\bAPI\b/g, 'Application Programming Interface');
            processed = processed.replace(/\bHTTP\b/g, 'Hypertext Transfer Protocol');
            processed = processed.replace(/\bURL\b/g, 'Uniform Resource Locator');
        }

        if (rules.insertPauseMarkers) {
            // Add commas for better TTS rhythm
            processed = processed.replace(/\. ([A-Z])/g, '. , $1');
            processed = processed.replace(/([.!?])\s+/g, '$1 , ');
        }

        if (rules.simplifyJargon) {
            // Simplify common technical terms
            processed = processed.replace(/\binterface\b/gi, 'connection point');
            processed = processed.replace(/\bimplementation\b/gi, 'way it works');
        }

        return processed;
    }

    /**
     * Estimate processing time
     * @param {string} text - Text to process
     * @returns {Object} Time estimates
     */
    estimateProcessingTime(text) {
        const batches = this.createBatches(text);
        const tokensPerBatch = this.batchSize;

        // Rough estimates (adjust based on actual API performance)
        const secondsPerBatch = 5; // Average API call time
        const totalSeconds = batches.length * secondsPerBatch;

        return {
            batches: batches.length,
            estimatedSeconds: totalSeconds,
            estimatedMinutes: Math.ceil(totalSeconds / 60),
            tokensPerBatch,
            totalTokens: estimateTokenCount(text)
        };
    }
}

/**
 * Create text processor with current settings
 * @param {Object} options - Options
 * @returns {TextProcessor} Processor instance
 */
export function createTextProcessor(options = {}) {
    return new TextProcessor(options);
}

export default TextProcessor;