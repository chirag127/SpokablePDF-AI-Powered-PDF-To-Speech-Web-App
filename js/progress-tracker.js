/**
 * Progress Tracker Module
 * Manages and displays processing progress
 */

import { estimateETA, formatDuration, calculatePercentage } from './utils.js';

/**
 * Progress Tracker Class
 * Tracks and reports progress for long-running operations
 */
export class ProgressTracker {
    constructor(options = {}) {
        this.totalSteps = options.totalSteps || 0;
        this.currentStep = 0;
        this.stage = options.stage || 'initializing';
        this.startTime = null;
        this.endTime = null;
        this.paused = false;
        this.pauseTime = null;
        this.totalPausedTime = 0;
        this.listeners = [];
        this.batchStatuses = new Map();
        this.errors = [];
    }

    /**
     * Start tracking
     * @param {number} totalSteps - Total number of steps
     */
    start(totalSteps) {
        this.totalSteps = totalSteps;
        this.currentStep = 0;
        this.startTime = Date.now();
        this.endTime = null;
        this.paused = false;
        this.totalPausedTime = 0;
        this.errors = [];
        this.notifyListeners();
    }

    /**
     * Update current step
     * @param {number} step - Current step number
     * @param {Object} data - Additional data
     */
    updateStep(step, data = {}) {
        this.currentStep = step;
        if (data.stage) {
            this.stage = data.stage;
        }
        this.notifyListeners();
    }

    /**
     * Increment step
     * @param {Object} data - Additional data
     */
    increment(data = {}) {
        this.currentStep++;
        if (data.stage) {
            this.stage = data.stage;
        }
        this.notifyListeners();
    }

    /**
     * Set current stage
     * @param {string} stage - Stage name
     */
    setStage(stage) {
        this.stage = stage;
        this.notifyListeners();
    }

    /**
     * Update batch status
     * @param {string} batchId - Batch identifier
     * @param {string} status - Status (pending, processing, success, failed)
     * @param {Object} data - Additional data
     */
    updateBatchStatus(batchId, status, data = {}) {
        this.batchStatuses.set(batchId, {
            status,
            timestamp: Date.now(),
            ...data
        });
        this.notifyListeners();
    }

    /**
     * Add error
     * @param {string} message - Error message
     * @param {Object} details - Error details
     */
    addError(message, details = {}) {
        this.errors.push({
            message,
            timestamp: Date.now(),
            ...details
        });
        this.notifyListeners();
    }

    /**
     * Pause tracking
     */
    pause() {
        if (!this.paused) {
            this.paused = true;
            this.pauseTime = Date.now();
            this.notifyListeners();
        }
    }

    /**
     * Resume tracking
     */
    resume() {
        if (this.paused && this.pauseTime) {
            const pauseDuration = Date.now() - this.pauseTime;
            this.totalPausedTime += pauseDuration;
            this.paused = false;
            this.pauseTime = null;
            this.notifyListeners();
        }
    }

    /**
     * Complete tracking
     */
    complete() {
        this.currentStep = this.totalSteps;
        this.endTime = Date.now();
        this.stage = 'complete';
        this.notifyListeners();
    }

    /**
     * Fail tracking
     * @param {string} reason - Failure reason
     */
    fail(reason) {
        this.endTime = Date.now();
        this.stage = 'failed';
        this.addError(reason);
        this.notifyListeners();
    }

    /**
     * Get current progress percentage
     * @returns {number} Percentage (0-100)
     */
    getPercentage() {
        return calculatePercentage(this.currentStep, this.totalSteps);
    }

    /**
     * Get elapsed time in milliseconds
     * @returns {number} Elapsed time
     */
    getElapsedTime() {
        if (!this.startTime) return 0;

        const endPoint = this.endTime || Date.now();
        const elapsed = endPoint - this.startTime - this.totalPausedTime;

        if (this.paused && this.pauseTime) {
            return elapsed - (Date.now() - this.pauseTime);
        }

        return elapsed;
    }

    /**
     * Get estimated time remaining
     * @returns {string} Formatted ETA
     */
    getETA() {
        if (this.currentStep === 0) return 'Calculating...';
        if (this.currentStep >= this.totalSteps) return 'Complete';

        const elapsed = this.getElapsedTime();
        return estimateETA(this.currentStep, this.totalSteps, elapsed);
    }

    /**
     * Get processing speed
     * @returns {string} Speed description
     */
    getSpeed() {
        if (this.currentStep === 0) return '-';

        const elapsed = this.getElapsedTime();
        const rate = (this.currentStep / elapsed) * 1000; // per second

        return `${rate.toFixed(2)} batches/sec`;
    }

    /**
     * Get current status
     * @returns {Object} Status object
     */
    getStatus() {
        const percentage = this.getPercentage();
        const elapsed = this.getElapsedTime();
        const eta = this.getETA();
        const speed = this.getSpeed();

        // Count batch statuses
        const batchStats = {
            pending: 0,
            processing: 0,
            success: 0,
            failed: 0
        };

        for (const [_, batch] of this.batchStatuses) {
            if (batchStats.hasOwnProperty(batch.status)) {
                batchStats[batch.status]++;
            }
        }

        return {
            stage: this.stage,
            currentStep: this.currentStep,
            totalSteps: this.totalSteps,
            percentage,
            elapsed,
            elapsedFormatted: formatDuration(elapsed),
            eta,
            speed,
            paused: this.paused,
            isComplete: this.currentStep >= this.totalSteps || this.stage === 'complete',
            isFailed: this.stage === 'failed',
            batchStats,
            errorCount: this.errors.length
        };
    }

    /**
     * Get batch statuses
     * @returns {Array} Array of batch status objects
     */
    getBatches() {
        return Array.from(this.batchStatuses.entries()).map(([id, status]) => ({
            id,
            ...status
        }));
    }

    /**
     * Get errors
     * @returns {Array} Array of errors
     */
    getErrors() {
        return [...this.errors];
    }

    /**
     * Subscribe to progress updates
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
     * Notify all listeners
     */
    notifyListeners() {
        const status = this.getStatus();

        for (const listener of this.listeners) {
            try {
                listener(status);
            } catch (error) {
                console.error('Error in progress listener:', error);
            }
        }
    }

    /**
     * Reset tracker
     */
    reset() {
        this.totalSteps = 0;
        this.currentStep = 0;
        this.stage = 'initializing';
        this.startTime = null;
        this.endTime = null;
        this.paused = false;
        this.pauseTime = null;
        this.totalPausedTime = 0;
        this.batchStatuses.clear();
        this.errors = [];
        this.notifyListeners();
    }

    /**
     * Export progress data
     * @returns {Object} Progress data
     */
    export() {
        return {
            status: this.getStatus(),
            batches: this.getBatches(),
            errors: this.getErrors(),
            timeline: {
                startTime: this.startTime,
                endTime: this.endTime,
                pauseTime: this.pauseTime,
                totalPausedTime: this.totalPausedTime
            }
        };
    }
}

/**
 * Progress UI Manager
 * Updates DOM elements with progress information
 */
export class ProgressUI {
    constructor(elements) {
        this.elements = elements || {};
        this.tracker = null;
    }

    /**
     * Connect to progress tracker
     * @param {ProgressTracker} tracker - Progress tracker instance
     */
    connect(tracker) {
        this.tracker = tracker;

        // Subscribe to updates
        this.unsubscribe = tracker.subscribe((status) => {
            this.update(status);
        });
    }

    /**
     * Disconnect from tracker
     */
    disconnect() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
        this.tracker = null;
    }

    /**
     * Update UI elements
     * @param {Object} status - Status object
     */
    update(status) {
        // Update stage text
        if (this.elements.stageText) {
            this.elements.stageText.textContent = this.formatStage(status.stage);
        }

        // Update progress bar
        if (this.elements.progressFill) {
            this.elements.progressFill.style.width = `${status.percentage}%`;
        }

        // Update percentage text
        if (this.elements.progressPercentage) {
            this.elements.progressPercentage.textContent = `${Math.round(status.percentage)}%`;
        }

        // Update batch counter
        if (this.elements.currentBatch) {
            this.elements.currentBatch.textContent = status.currentStep;
        }
        if (this.elements.totalBatches) {
            this.elements.totalBatches.textContent = status.totalSteps;
        }

        // Update ETA
        if (this.elements.eta) {
            this.elements.eta.textContent = status.eta;
        }

        // Update speed
        if (this.elements.speed) {
            this.elements.speed.textContent = status.speed;
        }

        // Update batch list
        if (this.elements.batchList && this.tracker) {
            this.updateBatchList();
        }

        // Update pause button
        if (this.elements.pauseBtn) {
            if (status.paused) {
                this.elements.pauseBtn.innerHTML = '<span class="btn-icon">▶️</span> Resume';
            } else {
                this.elements.pauseBtn.innerHTML = '<span class="btn-icon">⏸️</span> Pause';
            }
        }
    }

    /**
     * Format stage name for display
     * @param {string} stage - Stage identifier
     * @returns {string} Formatted stage name
     */
    formatStage(stage) {
        const stages = {
            'initializing': 'Initializing...',
            'extracting': 'Extracting text from PDF...',
            'batching': 'Creating batches...',
            'processing': 'Transforming content...',
            'generating': 'Generating PDF...',
            'saving': 'Saving to storage...',
            'complete': '✅ Complete!',
            'failed': '❌ Failed'
        };

        return stages[stage] || stage;
    }

    /**
     * Update batch list in UI
     */
    updateBatchList() {
        if (!this.elements.batchList || !this.tracker) return;

        const batches = this.tracker.getBatches();

        // Clear existing content
        this.elements.batchList.innerHTML = '';

        // Add batch items
        for (const batch of batches) {
            const item = document.createElement('div');
            item.className = 'batch-item';

            const statusDot = document.createElement('span');
            statusDot.className = `batch-status ${batch.status}`;

            const batchInfo = document.createElement('span');
            batchInfo.textContent = `Batch ${batch.batchNumber || batch.id}`;

            item.appendChild(statusDot);
            item.appendChild(batchInfo);

            if (batch.error) {
                const errorIcon = document.createElement('span');
                errorIcon.textContent = ' ⚠️';
                errorIcon.title = batch.error;
                item.appendChild(errorIcon);
            }

            this.elements.batchList.appendChild(item);
        }
    }

    /**
     * Show progress section
     */
    show() {
        if (this.elements.progressSection) {
            this.elements.progressSection.style.display = 'block';
        }
    }

    /**
     * Hide progress section
     */
    hide() {
        if (this.elements.progressSection) {
            this.elements.progressSection.style.display = 'none';
        }
    }
}

/**
 * Create progress tracker
 * @param {Object} options - Options
 * @returns {ProgressTracker} Tracker instance
 */
export function createProgressTracker(options = {}) {
    return new ProgressTracker(options);
}

/**
 * Create progress UI manager
 * @param {Object} elements - DOM elements
 * @returns {ProgressUI} UI manager instance
 */
export function createProgressUI(elements) {
    return new ProgressUI(elements);
}

export default {
    ProgressTracker,
    ProgressUI,
    createProgressTracker,
    createProgressUI
};