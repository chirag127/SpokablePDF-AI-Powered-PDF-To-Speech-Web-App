/**
 * PDF Generator Module
 * Handles PDF output generation using jsPDF
 */

import { formatDate, sanitizeFilename } from './utils.js';
import { getSettingsManager } from './settings-manager.js';

/**
 * PDF Generator Class
 * Generates PDF documents from transformed text
 */
export class PDFGenerator {
    constructor(options = {}) {
        this.settings = getSettingsManager();
        this.config = options.config || this.settings.getValue('pdfConfig') || {};
    }

    /**
     * Generate PDF from transformed text
     * @param {string} text - Transformed text content
     * @param {Object} metadata - Document metadata
     * @param {Object} options - Generation options
     * @returns {Promise<Blob>} PDF blob
     */
    async generate(text, metadata = {}, options = {}) {
        // Get jsPDF from global scope
        const { jsPDF } = window.jspdf;

        if (!jsPDF) {
            throw new Error('jsPDF library not loaded');
        }

        // Merge options with config
        const config = {
            ...this.config,
            ...options
        };

        // Create document
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: config.pageSize || 'letter'
        });

        // Set document properties
        if (metadata.title) {
            doc.setProperties({
                title: metadata.title,
                subject: 'Readable Spokable PDF',
                author: 'Readable Spokable PDF Converter',
                keywords: 'TTS, accessible, readable',
                creator: 'Readable Spokable PDF'
            });
        }

        // Set font
        doc.setFont(config.fontFamily || 'times', 'normal');
        doc.setFontSize(config.fontSize || 12);

        // Calculate margins and dimensions
        const margin = config.pageMargin || 20;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const contentWidth = pageWidth - (margin * 2);
        const lineHeight = config.lineHeight || 1.5;
        const lineSpacing = (config.fontSize || 12) * lineHeight;

        let currentY = margin;
        let pageNumber = 1;

        // Add title page if metadata provided
        if (metadata.title) {
            doc.setFontSize(24);
            doc.text(metadata.title, pageWidth / 2, pageHeight / 3, { align: 'center' });

            doc.setFontSize(14);
            if (metadata.originalFilename) {
                doc.text(`Original: ${metadata.originalFilename}`, pageWidth / 2, pageHeight / 2, { align: 'center' });
            }

            doc.setFontSize(12);
            doc.text(`Generated: ${formatDate(new Date(), 'YYYY-MM-DD HH:mm')}`, pageWidth / 2, pageHeight / 2 + 10, { align: 'center' });

            doc.addPage();
            currentY = margin;
            pageNumber++;
        }

        // Add table of contents if requested
        if (config.generateTOC) {
            const toc = this.generateTOC(text);
            if (toc.length > 0) {
                doc.setFontSize(18);
                doc.text('Table of Contents', margin, currentY);
                currentY += 15;

                doc.setFontSize(12);
                for (const item of toc) {
                    if (currentY > pageHeight - margin - 10) {
                        doc.addPage();
                        currentY = margin;
                        pageNumber++;
                    }

                    const tocLine = `${item.title} .................. ${item.page}`;
                    doc.text(tocLine, margin + (item.level * 5), currentY);
                    currentY += lineSpacing;
                }

                doc.addPage();
                currentY = margin;
                pageNumber++;
            }
        }

        // Split text into paragraphs
        const paragraphs = text.split(/\n\n+/);

        // Process each paragraph
        for (const paragraph of paragraphs) {
            if (!paragraph.trim()) continue;

            // Check if this is a heading
            const isHeading = this.isHeading(paragraph);

            if (isHeading) {
                // Add some space before heading
                if (currentY > margin + 10) {
                    currentY += lineSpacing * 1.5;
                }

                doc.setFont(config.fontFamily || 'times', 'bold');
                doc.setFontSize((config.fontSize || 12) + 2);
            }

            // Split paragraph into lines that fit the page width
            const lines = doc.splitTextToSize(paragraph, contentWidth);

            // Add lines to document
            for (const line of lines) {
                // Check if we need a new page
                if (currentY > pageHeight - margin - lineSpacing) {
                    if (config.addPageNumbers) {
                        doc.setFontSize(10);
                        doc.text(`Page ${pageNumber}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
                    }

                    doc.addPage();
                    currentY = margin;
                    pageNumber++;
                }

                // Add line
                doc.text(line, margin, currentY);
                currentY += lineSpacing;
            }

            // Reset font after heading
            if (isHeading) {
                doc.setFont(config.fontFamily || 'times', 'normal');
                doc.setFontSize(config.fontSize || 12);
                currentY += lineSpacing * 0.5;
            } else {
                // Add space after paragraph
                currentY += lineSpacing * 0.5;
            }
        }

        // Add final page number
        if (config.addPageNumbers) {
            doc.setFontSize(10);
            doc.text(`Page ${pageNumber}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        }

        // Return as blob
        return doc.output('blob');
    }

    /**
     * Generate table of contents from text
     * @param {string} text - Document text
     * @returns {Array} TOC entries
     */
    generateTOC(text) {
        const toc = [];
        const lines = text.split('\n');
        let pageEstimate = 1;
        let lineCount = 0;
        const linesPerPage = 40; // Rough estimate

        for (const line of lines) {
            lineCount++;

            // Estimate page number
            if (lineCount > linesPerPage) {
                pageEstimate++;
                lineCount = 0;
            }

            // Check for headings
            if (this.isHeading(line)) {
                const level = this.getHeadingLevel(line);
                const title = line.replace(/^#+\s*/, '').trim();

                toc.push({
                    title,
                    page: pageEstimate,
                    level
                });
            }
        }

        return toc;
    }

    /**
     * Check if line is a heading
     * @param {string} line - Line of text
     * @returns {boolean} True if heading
     */
    isHeading(line) {
        // Check for markdown-style headings
        if (/^#+\s+/.test(line)) return true;

        // Check for all-caps lines (common in transformed text)
        if (line.length > 3 && line.length < 100 && line === line.toUpperCase()) return true;

        // Check for lines ending with colon
        if (line.trim().endsWith(':') && line.length < 100) return true;

        return false;
    }

    /**
     * Get heading level
     * @param {string} line - Heading line
     * @returns {number} Level (0-6)
     */
    getHeadingLevel(line) {
        const match = line.match(/^(#+)\s+/);
        if (match) {
            return Math.min(match[1].length, 6);
        }
        return 0;
    }

    /**
     * Generate PDF with original content
     * @param {string} transformedText - Transformed text
     * @param {string} originalText - Original text
     * @param {Object} metadata - Document metadata
     * @returns {Promise<Blob>} PDF blob
     */
    async generateWithOriginal(transformedText, originalText, metadata = {}) {
        const { jsPDF } = window.jspdf;

        if (!jsPDF) {
            throw new Error('jsPDF library not loaded');
        }

        // Generate transformed content first
        const transformedBlob = await this.generate(transformedText, {
            ...metadata,
            title: metadata.title ? `${metadata.title} (Spoken Version)` : 'Spoken Version'
        });

        // Generate original content
        const originalBlob = await this.generate(originalText, {
            ...metadata,
            title: metadata.title ? `${metadata.title} (Original)` : 'Original'
        });

        // Merge PDFs (simplified - in production use a proper PDF merger)
        // For now, just return the transformed version
        return transformedBlob;
    }

    /**
     * Download PDF
     * @param {Blob} blob - PDF blob
     * @param {string} filename - Filename
     */
    download(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = sanitizeFilename(filename || 'readable-spokable.pdf');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Generate PDF and download
     * @param {string} text - Transformed text
     * @param {Object} metadata - Document metadata
     * @param {string} filename - Output filename
     * @returns {Promise<void>}
     */
    async generateAndDownload(text, metadata = {}, filename = null) {
        const blob = await this.generate(text, metadata);
        const outputFilename = filename ||
                              (metadata.originalFilename ?
                               metadata.originalFilename.replace('.pdf', '-spokable.pdf') :
                               'readable-spokable.pdf');
        this.download(blob, outputFilename);
    }

    /**
     * Export as text file
     * @param {string} text - Text content
     * @param {string} filename - Filename
     */
    exportAsText(text, filename = 'readable-spokable.txt') {
        const blob = new Blob([text], { type: 'text/plain' });
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
     * Preview PDF in new window
     * @param {Blob} blob - PDF blob
     */
    preview(blob) {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    }

    /**
     * Get estimated page count
     * @param {string} text - Text content
     * @returns {number} Estimated pages
     */
    estimatePageCount(text) {
        const config = this.config;
        const linesPerPage = 40; // Rough estimate based on typical settings
        const lines = text.split('\n').length;
        return Math.ceil(lines / linesPerPage);
    }

    /**
     * Update config
     * @param {Object} newConfig - New configuration
     */
    updateConfig(newConfig) {
        this.config = {
            ...this.config,
            ...newConfig
        };
    }
}

/**
 * Create PDF generator with current settings
 * @param {Object} options - Options
 * @returns {PDFGenerator} Generator instance
 */
export function createPDFGenerator(options = {}) {
    return new PDFGenerator(options);
}

export default PDFGenerator;