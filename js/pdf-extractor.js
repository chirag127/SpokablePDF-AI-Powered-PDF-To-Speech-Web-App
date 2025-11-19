/**
 * PDF Extractor Module
 * Handles PDF text and image extraction using PDF.js
 */

import { formatBytes, detectLanguage, estimateTokenCount, showToast } from './utils.js';

/**
 * PDF Extractor Class
 * Extracts text and images from PDF files
 */
export class PDFExtractor {
    constructor() {
        this.pdfDoc = null;
        this.file = null;
        this.metadata = null;
    }

    /**
     * Load PDF file
     * @param {File} file - PDF file to load
     * @returns {Promise<Object>} PDF metadata
     */
    async loadFile(file) {
        if (!file || file.type !== 'application/pdf') {
            throw new Error('Invalid file type. Please select a PDF file.');
        }

        this.file = file;

        try {
            // Read file as ArrayBuffer
            const arrayBuffer = await this.readFileAsArrayBuffer(file);

            // Load PDF document
            const loadingTask = pdfjsLib.getDocument({
                data: arrayBuffer,
                cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
                cMapPacked: true
            });

            this.pdfDoc = await loadingTask.promise;

            // Extract metadata
            this.metadata = await this.extractMetadata();

            return this.metadata;
        } catch (error) {
            console.error('Error loading PDF:', error);
            throw new Error(`Failed to load PDF: ${error.message}`);
        }
    }

    /**
     * Read file as ArrayBuffer
     * @param {File} file - File to read
     * @returns {Promise<ArrayBuffer>} File contents
     */
    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));

            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Extract PDF metadata
     * @returns {Promise<Object>} Metadata object
     */
    async extractMetadata() {
        if (!this.pdfDoc) {
            throw new Error('No PDF document loaded');
        }

        const info = await this.pdfDoc.getMetadata();
        const numPages = this.pdfDoc.numPages;

        return {
            filename: this.file.name,
            size: this.file.size,
            sizeFormatted: formatBytes(this.file.size),
            pages: numPages,
            info: info.info || {},
            metadata: info.metadata ? info.metadata.getAll() : {},
            created: this.file.lastModified ? new Date(this.file.lastModified) : null
        };
    }

    /**
     * Extract all text from PDF
     * @param {Function} progressCallback - Called with progress updates
     * @returns {Promise<Object>} Extracted text and metadata
     */
    async extractText(progressCallback = null) {
        if (!this.pdfDoc) {
            throw new Error('No PDF document loaded');
        }

        const numPages = this.pdfDoc.numPages;
        const pages = [];
        let fullText = '';

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            try {
                // Load page
                const page = await this.pdfDoc.getPage(pageNum);

                // Extract text content
                const textContent = await page.getTextContent();

                // Combine text items
                const pageText = textContent.items
                    .map(item => item.str)
                    .join(' ')
                    .trim();

                pages.push({
                    pageNum,
                    text: pageText,
                    length: pageText.length
                });

                fullText += pageText + '\n\n';

                // Call progress callback
                if (progressCallback) {
                    progressCallback({
                        current: pageNum,
                        total: numPages,
                        percentage: (pageNum / numPages) * 100
                    });
                }
            } catch (error) {
                console.error(`Error extracting text from page ${pageNum}:`, error);
                pages.push({
                    pageNum,
                    text: '',
                    length: 0,
                    error: error.message
                });
            }
        }

        // Detect language from first 5000 characters
        const language = detectLanguage(fullText.substring(0, 5000));

        // Count words (rough estimate)
        const wordCount = fullText.split(/\s+/).filter(w => w.length > 0).length;

        return {
            fullText: fullText.trim(),
            pages,
            language,
            characterCount: fullText.length,
            wordCount,
            estimatedTokens: estimateTokenCount(fullText)
        };
    }

    /**
     * Extract images from PDF
     * @param {Function} progressCallback - Called with progress updates
     * @returns {Promise<Array>} Array of extracted images
     */
    async extractImages(progressCallback = null) {
        if (!this.pdfDoc) {
            throw new Error('No PDF document loaded');
        }

        const numPages = this.pdfDoc.numPages;
        const images = [];

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            try {
                const page = await this.pdfDoc.getPage(pageNum);
                const operatorList = await page.getOperatorList();

                // Look for image operators
                for (let i = 0; i < operatorList.fnArray.length; i++) {
                    const fn = operatorList.fnArray[i];
                    const args = operatorList.argsArray[i];

                    // Check if this is an image operator
                    if (fn === pdfjsLib.OPS.paintImageXObject ||
                        fn === pdfjsLib.OPS.paintInlineImageXObject) {

                        try {
                            const imageName = args[0];
                            const pageImages = await page.objs.get(imageName);

                            if (pageImages) {
                                images.push({
                                    pageNum,
                                    imageName,
                                    data: pageImages,
                                    index: images.length
                                });
                            }
                        } catch (imgError) {
                            console.warn(`Could not extract image from page ${pageNum}:`, imgError);
                        }
                    }
                }

                if (progressCallback) {
                    progressCallback({
                        current: pageNum,
                        total: numPages,
                        percentage: (pageNum / numPages) * 100
                    });
                }
            } catch (error) {
                console.error(`Error extracting images from page ${pageNum}:`, error);
            }
        }

        return images;
    }

    /**
     * Extract images as base64
     * @param {Function} progressCallback - Called with progress updates
     * @returns {Promise<Array>} Array of base64 encoded images
     */
    async extractImagesAsBase64(progressCallback = null) {
        const images = await this.extractImages(progressCallback);
        const base64Images = [];

        for (const img of images) {
            try {
                const base64 = await this.convertImageToBase64(img.data);
                base64Images.push({
                    pageNum: img.pageNum,
                    imageName: img.imageName,
                    base64,
                    mimeType: 'image/png'
                });
            } catch (error) {
                console.warn('Could not convert image to base64:', error);
            }
        }

        return base64Images;
    }

    /**
     * Convert image data to base64
     * @param {Object} imageData - Image data from PDF.js
     * @returns {Promise<string>} Base64 encoded image
     */
    async convertImageToBase64(imageData) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Set canvas dimensions
            canvas.width = imageData.width || 100;
            canvas.height = imageData.height || 100;

            // Create ImageData
            const imgData = ctx.createImageData(canvas.width, canvas.height);

            if (imageData.data) {
                imgData.data.set(new Uint8ClampedArray(imageData.data));
                ctx.putImageData(imgData, 0, 0);
            }

            // Convert to base64
            try {
                const base64 = canvas.toDataURL('image/png').split(',')[1];
                resolve(base64);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Extract text and images together with context
     * @param {Function} progressCallback - Called with progress updates
     * @returns {Promise<Object>} Combined extraction results
     */
    async extractAll(progressCallback = null) {
        if (!this.pdfDoc) {
            throw new Error('No PDF document loaded');
        }

        const numPages = this.pdfDoc.numPages;
        const pages = [];
        let fullText = '';

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            try {
                const page = await this.pdfDoc.getPage(pageNum);

                // Extract text
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                    .map(item => item.str)
                    .join(' ')
                    .trim();

                // Extract images (simplified for this context)
                const pageData = {
                    pageNum,
                    text: pageText,
                    images: [], // Will be populated if images exist
                    length: pageText.length
                };

                pages.push(pageData);
                fullText += pageText + '\n\n';

                if (progressCallback) {
                    progressCallback({
                        stage: 'Extracting content',
                        current: pageNum,
                        total: numPages,
                        percentage: (pageNum / numPages) * 100
                    });
                }
            } catch (error) {
                console.error(`Error extracting content from page ${pageNum}:`, error);
                pages.push({
                    pageNum,
                    text: '',
                    images: [],
                    length: 0,
                    error: error.message
                });
            }
        }

        const language = detectLanguage(fullText.substring(0, 5000));
        const wordCount = fullText.split(/\s+/).filter(w => w.length > 0).length;

        return {
            fullText: fullText.trim(),
            pages,
            language,
            characterCount: fullText.length,
            wordCount,
            estimatedTokens: estimateTokenCount(fullText),
            metadata: this.metadata
        };
    }

    /**
     * Close PDF document
     */
    close() {
        if (this.pdfDoc) {
            this.pdfDoc.destroy();
            this.pdfDoc = null;
        }
        this.file = null;
        this.metadata = null;
    }

    /**
     * Get page count
     * @returns {number} Number of pages
     */
    getPageCount() {
        return this.pdfDoc ? this.pdfDoc.numPages : 0;
    }

    /**
     * Check if PDF is loaded
     * @returns {boolean} True if PDF is loaded
     */
    isLoaded() {
        return this.pdfDoc !== null;
    }
}

/**
 * Quick extraction function for simple use cases
 * @param {File} file - PDF file
 * @returns {Promise<Object>} Extracted content
 */
export async function extractPDFContent(file) {
    const extractor = new PDFExtractor();

    try {
        await extractor.loadFile(file);
        const content = await extractor.extractAll();
        return content;
    } finally {
        extractor.close();
    }
}

export default PDFExtractor;