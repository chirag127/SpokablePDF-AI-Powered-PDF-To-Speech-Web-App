/**
 * Main Application Module
 * Orchestrates all components and handles user interactions
 */

import {
    showToast,
    formatBytes,
    setVisible,
    getElement,
    checkBrowserSupport
} from './utils.js';
import { PDFExtractor } from './pdf-extractor.js';
import { getStorageManager } from './storage-manager.js';
import { getSettingsManager, getThemeManager } from './settings-manager.js';
import { createGeminiClient } from './gemini-client.js';
import { createTextProcessor } from './text-processor.js';
import { createProgressTracker, createProgressUI } from './progress-tracker.js';
import { createPDFGenerator } from './pdf-generator.js';
import { createBatchProcessor } from './batch-processor.js';
import { getLogger } from './logger.js';
import { createWalkthrough } from './walkthrough.js';

/**
 * Main Application Class
 */
class App {
    constructor() {
        // Managers
        this.settings = getSettingsManager();
        this.theme = getThemeManager();
        this.storage = getStorageManager();

        // Components
        this.pdfExtractor = new PDFExtractor();
        this.geminiClient = null;
        this.textProcessor = null;
        this.progressTracker = null;
        this.progressUI = null;
        this.pdfGenerator = null;
        this.batchProcessor = null;
        this.walkthrough = null;
        this.logger = null;

        // State
        this.currentFile = null;
        this.extractedData = null;
        this.sessionId = null;
        this.isProcessing = false;

        // DOM elements
        this.elements = {};
    }

    /**
     * Initialize application
     */
    async init() {
        console.log('Initializing Readable Spokable PDF...');

        // Check browser support
        const support = checkBrowserSupport();
        if (!support.indexedDB || !support.localStorage || !support.fileReader) {
            showToast('Your browser does not support required features', 'danger', 5000);
            return;
        }

        // Initialize storage
        try {
            await this.storage.init();
        } catch (error) {
            console.error('Failed to initialize storage:', error);
        }

        // Cache DOM elements
        this.cacheElements();

        // Initialize components
        this.initializeComponents();

        // Setup event listeners
        this.setupEventListeners();

        // Initialize theme
        this.theme.init();

        // Check if first time user
        this.checkFirstTime();

        console.log('Application initialized');
    }

    /**
     * Cache DOM elements
     */
    cacheElements() {
        // File upload elements
        this.elements.uploadArea = getElement('uploadArea');
        this.elements.fileInput = getElement('fileInput');
        this.elements.fileInfo = getElement('fileInfo');
        this.elements.fileName = getElement('fileName');
        this.elements.filePages = getElement('filePages');
        this.elements.fileSize = getElement('fileSize');
        this.elements.detectedLang = getElement('detectedLang');
        this.elements.textLength = getElement('textLength');
        this.elements.wordCount = getElement('wordCount');

        // Action buttons
        this.elements.processBtn = getElement('processBtn');
        this.elements.clearBtn = getElement('clearBtn');

        // Progress elements
        this.elements.progressSection = getElement('progressSection');
        this.elements.stageText = getElement('stageText');
        this.elements.progressFill = getElement('progressFill');
        this.elements.progressPercentage = getElement('progressPercentage');
        this.elements.currentBatch = getElement('currentBatch');
        this.elements.totalBatches = getElement('totalBatches');
        this.elements.eta = getElement('eta');
        this.elements.speed = getElement('speed');
        this.elements.batchList = getElement('batchList');
        this.elements.pauseBtn = getElement('pauseBtn');
        this.elements.cancelBtn = getElement('cancelBtn');
        this.elements.downloadPartialBtn = getElement('downloadPartialBtn');

        // Results elements
        this.elements.resultsSection = getElement('resultsSection');
        this.elements.previewContainer = getElement('previewContainer');
        this.elements.downloadFinalBtn = getElement('downloadFinalBtn');
        this.elements.downloadTextBtn = getElement('downloadTextBtn');
        this.elements.previewAudioBtn = getElement('previewAudioBtn');
        this.elements.startNewBtn = getElement('startNewBtn');

        // Theme toggle
        this.elements.themeToggle = document.querySelector('.theme-toggle');

        // Mobile nav toggle
        this.elements.navToggle = document.querySelector('.nav-toggle');
        this.elements.navMenu = document.querySelector('.nav-menu');

        // Walkthrough
        this.elements.showWalkthroughBtn = getElement('showWalkthroughBtn');
        this.elements.walkthroughModal = getElement('walkthroughModal');
    }

    /**
     * Initialize components
     */
    initializeComponents() {
        this.logger = getLogger();
        this.geminiClient = createGeminiClient();
        this.textProcessor = createTextProcessor({ client: this.geminiClient });
        this.pdfGenerator = createPDFGenerator();
        this.batchProcessor = createBatchProcessor({ client: this.geminiClient });

        // Initialize progress tracking
        this.progressTracker = createProgressTracker();
        this.progressUI = createProgressUI(this.elements);
        this.progressUI.connect(this.progressTracker);

        // Initialize walkthrough
        this.walkthrough = createWalkthrough('walkthroughModal');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // File upload
        if (this.elements.uploadArea) {
            this.elements.uploadArea.addEventListener('click', () => {
                this.elements.fileInput?.click();
            });

            this.elements.uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                this.elements.uploadArea.classList.add('drag-over');
            });

            this.elements.uploadArea.addEventListener('dragleave', () => {
                this.elements.uploadArea.classList.remove('drag-over');
            });

            this.elements.uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                this.elements.uploadArea.classList.remove('drag-over');

                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleFileSelect(files[0]);
                }
            });
        }

        if (this.elements.fileInput) {
            this.elements.fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.handleFileSelect(file);
                }
            });
        }

        // Action buttons
        if (this.elements.processBtn) {
            this.elements.processBtn.addEventListener('click', () => {
                this.startProcessing();
            });
        }

        if (this.elements.clearBtn) {
            this.elements.clearBtn.addEventListener('click', () => {
                this.clearFile();
            });
        }

        // Progress buttons
        if (this.elements.pauseBtn) {
            this.elements.pauseBtn.addEventListener('click', () => {
                this.togglePause();
            });
        }

        if (this.elements.cancelBtn) {
            this.elements.cancelBtn.addEventListener('click', () => {
                this.cancelProcessing();
            });
        }

        if (this.elements.downloadPartialBtn) {
            this.elements.downloadPartialBtn.addEventListener('click', () => {
                this.downloadPartial();
            });
        }

        // Results buttons
        if (this.elements.downloadFinalBtn) {
            this.elements.downloadFinalBtn.addEventListener('click', () => {
                this.downloadFinal();
            });
        }

        if (this.elements.downloadTextBtn) {
            this.elements.downloadTextBtn.addEventListener('click', () => {
                this.downloadAsText();
            });
        }

        if (this.elements.previewAudioBtn) {
            this.elements.previewAudioBtn.addEventListener('click', () => {
                this.previewAudio();
            });
        }

        if (this.elements.startNewBtn) {
            this.elements.startNewBtn.addEventListener('click', () => {
                this.startNew();
            });
        }

        // Theme toggle
        if (this.elements.themeToggle) {
            this.elements.themeToggle.addEventListener('click', () => {
                this.theme.toggle();
                this.updateThemeIcon();
            });
        }

        // Mobile navigation
        if (this.elements.navToggle) {
            this.elements.navToggle.addEventListener('click', () => {
                this.elements.navMenu?.classList.toggle('active');
            });
        }

        // Walkthrough
        if (this.elements.showWalkthroughBtn) {
            this.elements.showWalkthroughBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showWalkthrough();
            });
        }

        // Modal close handlers
        this.setupModalHandlers();
    }

    /**
     * Setup modal handlers
     */
    setupModalHandlers() {
        const modals = document.querySelectorAll('.modal');

        modals.forEach(modal => {
            const overlay = modal.querySelector('.modal-overlay');
            const closeBtn = modal.querySelector('.modal-close');
            const dismissBtns = modal.querySelectorAll('[data-dismiss-modal]');

            if (overlay) {
                overlay.addEventListener('click', () => {
                    modal.classList.remove('active');
                });
            }

            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    modal.classList.remove('active');
                });
            }

            dismissBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    modal.classList.remove('active');
                });
            });
        });
    }

    /**
     * Check if first time user
     */
    checkFirstTime() {
        const hasSeenWalkthrough = localStorage.getItem('hasSeenWalkthrough');
        const hasApiKey = this.settings.validateApiKey();

        if (!hasSeenWalkthrough || !hasApiKey) {
            // Show callout
            const callout = getElement('firstTimeCallout');
            if (callout) {
                callout.style.display = 'flex';
            }
        }
    }

    /**
     * Handle file selection
     * @param {File} file - Selected file
     */
    async handleFileSelect(file) {
        try {
            showToast('Loading PDF...', 'info');

            // Load file
            await this.pdfExtractor.loadFile(file);
            this.currentFile = file;

            // Extract text
            this.extractedData = await this.pdfExtractor.extractAll((progress) => {
                console.log(`Extracting: ${progress.percentage.toFixed(0)}%`);
            });

            // Display file info
            this.displayFileInfo();

            showToast('PDF loaded successfully!', 'success');

        } catch (error) {
            console.error('Error loading file:', error);
            showToast(`Error: ${error.message}`, 'danger', 5000);
        }
    }

    /**
     * Display file information
     */
    displayFileInfo() {
        if (!this.extractedData) return;

        const metadata = this.extractedData.metadata;

        if (this.elements.fileName) {
            this.elements.fileName.textContent = metadata.filename;
        }

        if (this.elements.filePages) {
            this.elements.filePages.textContent = metadata.pages;
        }

        if (this.elements.fileSize) {
            this.elements.fileSize.textContent = formatBytes(metadata.size);
        }

        if (this.elements.detectedLang) {
            this.elements.detectedLang.textContent = this.extractedData.language;
        }

        if (this.elements.textLength) {
            this.elements.textLength.textContent = `${this.extractedData.characterCount.toLocaleString()} characters`;
        }

        if (this.elements.wordCount) {
            this.elements.wordCount.textContent = this.extractedData.wordCount.toLocaleString();
        }

        // Show file info, hide upload area
        setVisible(this.elements.uploadArea, false);
        setVisible(this.elements.fileInfo, true);
    }

    /**
     * Clear current file
     */
    clearFile() {
        this.currentFile = null;
        this.extractedData = null;
        this.pdfExtractor.close();

        // Reset UI
        setVisible(this.elements.uploadArea, true);
        setVisible(this.elements.fileInfo, false);

        if (this.elements.fileInput) {
            this.elements.fileInput.value = '';
        }
    }

    /**
     * Start processing
     */
    async startProcessing() {
        // Validate
        if (!this.extractedData) {
            showToast('Please upload a PDF first', 'warning');
            return;
        }

        if (!this.settings.validateApiKey()) {
            showToast('Please set your API key in Settings', 'warning');
            setTimeout(() => {
                window.location.href = 'pages/settings.html';
            }, 2000);
            return;
        }

        this.isProcessing = true;
        this.sessionId = Date.now().toString();

        // Show progress section
        setVisible(this.elements.fileInfo, false);
        setVisible(this.elements.progressSection, true);

        try {
            // Start progress tracking
            const estimate = this.textProcessor.estimateProcessingTime(this.extractedData.fullText);
            this.progressTracker.start(estimate.batches);
            this.progressTracker.setStage('processing');

            // Process text
            const result = await this.textProcessor.process(
                this.extractedData.fullText,
                {
                    onProgress: (progress) => {
                        this.progressTracker.updateStep(progress.batchNumber, {
                            stage: progress.stage || 'processing'
                        });

                        if (progress.batchId) {
                            this.progressTracker.updateBatchStatus(
                                progress.batchId,
                                progress.status || 'processing'
                            );
                        }
                    }
                }
            );

            // Save results
            this.processedResult = result;

            // Mark complete
            this.progressTracker.complete();

            // Show results
            setTimeout(() => {
                this.showResults(result);
            }, 1000);

        } catch (error) {
            console.error('Processing error:', error);
            this.progressTracker.fail(error.message);
            showToast(`Processing failed: ${error.message}`, 'danger', 5000);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Show results
     * @param {Object} result - Processing result
     */
    showResults(result) {
        setVisible(this.elements.progressSection, false);
        setVisible(this.elements.resultsSection, true);

        // Display preview
        if (this.elements.previewContainer) {
            const preview = result.transformedText.substring(0, 1000);
            this.elements.previewContainer.textContent = preview + '...';
        }

        // Update stats
        const resultBatches = getElement('resultBatches');
        const resultSuccessRate = getElement('resultSuccessRate');
        const resultTime = getElement('resultTime');
        const resultSize = getElement('resultSize');

        if (resultBatches) {
            resultBatches.textContent = result.stats.totalBatches;
        }

        if (resultSuccessRate) {
            resultSuccessRate.textContent = `${result.stats.successRate.toFixed(1)}%`;
        }

        if (resultTime) {
            const elapsed = this.progressTracker.getElapsedTime();
            resultTime.textContent = this.formatDuration(elapsed);
        }

        if (resultSize) {
            const bytes = new Blob([result.transformedText]).size;
            resultSize.textContent = formatBytes(bytes);
        }
    }

    /**
     * Format duration
     * @param {number} ms - Milliseconds
     * @returns {string} Formatted duration
     */
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Toggle pause
     */
    togglePause() {
        if (this.progressTracker.paused) {
            this.progressTracker.resume();
            showToast('Processing resumed', 'info');
        } else {
            this.progressTracker.pause();
            showToast('Processing paused', 'info');
        }
    }

    /**
     * Cancel processing
     */
    cancelProcessing() {
        if (confirm('Are you sure you want to cancel processing?')) {
            this.isProcessing = false;
            this.progressTracker.fail('Cancelled by user');
            showToast('Processing cancelled', 'warning');

            setTimeout(() => {
                this.startNew();
            }, 1000);
        }
    }

    /**
     * Download partial results
     */
    async downloadPartial() {
        showToast('Partial download not yet implemented', 'info');
    }

    /**
     * Download final PDF
     */
    async downloadFinal() {
        if (!this.processedResult) {
            showToast('No processed result available', 'warning');
            return;
        }

        try {
            showToast('Generating PDF...', 'info');

            await this.pdfGenerator.generateAndDownload(
                this.processedResult.transformedText,
                {
                    title: this.currentFile?.name.replace('.pdf', ''),
                    originalFilename: this.currentFile?.name
                }
            );

            showToast('PDF downloaded!', 'success');

        } catch (error) {
            console.error('Download error:', error);
            showToast(`Download failed: ${error.message}`, 'danger');
        }
    }

    /**
     * Download as text
     */
    downloadAsText() {
        if (!this.processedResult) {
            showToast('No processed result available', 'warning');
            return;
        }

        const filename = this.currentFile?.name.replace('.pdf', '-spokable.txt') || 'readable-spokable.txt';
        this.pdfGenerator.exportAsText(this.processedResult.transformedText, filename);
        showToast('Text file downloaded!', 'success');
    }

    /**
     * Preview with audio
     */
    previewAudio() {
        if (!this.processedResult) {
            showToast('No processed result available', 'warning');
            return;
        }

        // Use browser TTS
        if ('speechSynthesis' in window) {
            const preview = this.processedResult.transformedText.substring(0, 500);
            const utterance = new SpeechSynthesisUtterance(preview);
            speechSynthesis.speak(utterance);
            showToast('Playing audio preview...', 'info');
        } else {
            showToast('Text-to-speech not supported in your browser', 'warning');
        }
    }

    /**
     * Start new processing
     */
    startNew() {
        this.clearFile();
        setVisible(this.elements.resultsSection, false);
        setVisible(this.elements.progressSection, false);
        this.progressTracker.reset();
        this.processedResult = null;
    }

    /**
     * Show walkthrough
     */
    showWalkthrough() {
        if (this.walkthrough) {
            this.walkthrough.show();
        }
    }

    /**
     * Update theme icon
     */
    updateThemeIcon() {
        const icon = this.elements.themeToggle?.querySelector('.theme-icon');
        if (icon) {
            icon.textContent = this.theme.isDark() ? '☀️' : '🌙';
        }
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const app = new App();
        app.init();

        // Make app available globally for debugging
        window.app = app;
    });
} else {
    const app = new App();
    app.init();
    window.app = app;
}

export default App;