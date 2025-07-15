/**
 * Storage Manager for PDF Editor
 * Handles local storage operations for PDF files and metadata
 */
class StorageManager {
    constructor() {
        this.STORAGE_KEY = 'pdfeditor_files';
        this.MAX_STORAGE_SIZE = 50 * 1024 * 1024; // 50MB limit
    }

    /**
     * Get all stored PDF files
     * @returns {Array} Array of PDF file objects
     */
    getAllPDFs() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error reading from storage:', error);
            return [];
        }
    }

    /**
     * Save a PDF file to storage
     * @param {Object} pdfData - PDF file data object
     * @param {string} pdfData.id - Unique identifier
     * @param {string} pdfData.name - File name
     * @param {string} pdfData.data - Base64 encoded PDF data
     * @param {Object} pdfData.metadata - File metadata
     * @returns {boolean} Success status
     */
    savePDF(pdfData) {
        try {
            const pdfs = this.getAllPDFs();
            
            // Check storage size before saving
            if (!this.checkStorageSpace(pdfData.data)) {
                throw new Error('Storage limit exceeded. Please delete some files.');
            }

            // Remove existing file with same ID
            const existingIndex = pdfs.findIndex(pdf => pdf.id === pdfData.id);
            if (existingIndex !== -1) {
                pdfs.splice(existingIndex, 1);
            }

            // Add new file
            pdfs.push({
                id: pdfData.id,
                name: pdfData.name,
                data: pdfData.data,
                metadata: {
                    ...pdfData.metadata,
                    uploadDate: new Date().toISOString(),
                    lastModified: new Date().toISOString()
                }
            });

            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(pdfs));
            return true;
        } catch (error) {
            console.error('Error saving PDF:', error);
            throw error;
        }
    }

    /**
     * Get a specific PDF by ID
     * @param {string} id - PDF ID
     * @returns {Object|null} PDF data or null if not found
     */
    getPDF(id) {
        try {
            const pdfs = this.getAllPDFs();
            return pdfs.find(pdf => pdf.id === id) || null;
        } catch (error) {
            console.error('Error retrieving PDF:', error);
            return null;
        }
    }

    /**
     * Update PDF metadata or form data
     * @param {string} id - PDF ID
     * @param {Object} updates - Updates to apply
     * @returns {boolean} Success status
     */
    updatePDF(id, updates) {
        try {
            const pdfs = this.getAllPDFs();
            const index = pdfs.findIndex(pdf => pdf.id === id);
            
            if (index === -1) {
                throw new Error('PDF not found');
            }

            // Update the PDF
            pdfs[index] = {
                ...pdfs[index],
                ...updates,
                metadata: {
                    ...pdfs[index].metadata,
                    ...updates.metadata,
                    lastModified: new Date().toISOString()
                }
            };

            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(pdfs));
            return true;
        } catch (error) {
            console.error('Error updating PDF:', error);
            throw error;
        }
    }

    /**
     * Delete a PDF from storage
     * @param {string} id - PDF ID
     * @returns {boolean} Success status
     */
    deletePDF(id) {
        try {
            const pdfs = this.getAllPDFs();
            const filteredPdfs = pdfs.filter(pdf => pdf.id !== id);
            
            if (filteredPdfs.length === pdfs.length) {
                throw new Error('PDF not found');
            }

            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredPdfs));
            
            // Also clear form field values for this PDF
            this.clearFormFieldValues(id);
            
            return true;
        } catch (error) {
            console.error('Error deleting PDF:', error);
            throw error;
        }
    }

    /**
     * Clear all PDFs from storage
     * @returns {boolean} Success status
     */
    clearAll() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            
            // Also clear all form field values
            this.clearAllFormFieldValues();
            
            return true;
        } catch (error) {
            console.error('Error clearing storage:', error);
            throw error;
        }
    }

    /**
     * Get storage usage statistics
     * @returns {Object} Storage usage info
     */
    getStorageInfo() {
        try {
            const pdfs = this.getAllPDFs();
            const totalSize = pdfs.reduce((sum, pdf) => {
                return sum + (pdf.data ? pdf.data.length : 0);
            }, 0);

            return {
                totalFiles: pdfs.length,
                totalSize: totalSize,
                formattedSize: this.formatBytes(totalSize),
                availableSpace: this.MAX_STORAGE_SIZE - totalSize,
                usagePercentage: (totalSize / this.MAX_STORAGE_SIZE) * 100
            };
        } catch (error) {
            console.error('Error getting storage info:', error);
            return {
                totalFiles: 0,
                totalSize: 0,
                formattedSize: '0 B',
                availableSpace: this.MAX_STORAGE_SIZE,
                usagePercentage: 0
            };
        }
    }

    /**
     * Check if there's enough space for new data
     * @param {string} data - Data to check
     * @returns {boolean} Whether there's enough space
     */
    checkStorageSpace(data) {
        try {
            const currentSize = this.getStorageInfo().totalSize;
            const newDataSize = data ? data.length : 0;
            return (currentSize + newDataSize) <= this.MAX_STORAGE_SIZE;
        } catch (error) {
            console.error('Error checking storage space:', error);
            return false;
        }
    }

    /**
     * Format bytes into human readable format
     * @param {number} bytes - Bytes to format
     * @returns {string} Formatted string
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Export all PDFs as a backup
     * @returns {string} JSON string of all PDFs
     */
    exportData() {
        try {
            const pdfs = this.getAllPDFs();
            return JSON.stringify(pdfs, null, 2);
        } catch (error) {
            console.error('Error exporting data:', error);
            throw error;
        }
    }

    /**
     * Import PDFs from backup
     * @param {string} jsonData - JSON string of PDFs
     * @returns {boolean} Success status
     */
    importData(jsonData) {
        try {
            const pdfs = JSON.parse(jsonData);
            
            // Validate data structure
            if (!Array.isArray(pdfs)) {
                throw new Error('Invalid data format');
            }

            // Validate each PDF object
            pdfs.forEach(pdf => {
                if (!pdf.id || !pdf.name || !pdf.data) {
                    throw new Error('Invalid PDF object structure');
                }
            });

            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(pdfs));
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            throw error;
        }
    }

    /**
     * Generate unique ID for PDF
     * @returns {string} Unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Validate PDF data structure
     * @param {Object} pdfData - PDF data to validate
     * @returns {boolean} Whether data is valid
     */
    validatePDFData(pdfData) {
        return pdfData && 
               typeof pdfData.id === 'string' && 
               typeof pdfData.name === 'string' && 
               typeof pdfData.data === 'string' && 
               pdfData.metadata && 
               typeof pdfData.metadata === 'object';
    }

    /**
     * Save form field values for a PDF
     * @param {string} pdfId - PDF identifier
     * @param {Object} fieldValues - Field values by field ID
     */
    saveFormFieldValues(pdfId, fieldValues) {
        try {
            const key = `pdf-fields-${pdfId}`;
            localStorage.setItem(key, JSON.stringify(fieldValues));
        } catch (error) {
            console.error('Error saving form field values:', error);
        }
    }

    /**
     * Load form field values for a PDF
     * @param {string} pdfId - PDF identifier
     * @returns {Object} Field values by field ID
     */
    loadFormFieldValues(pdfId) {
        try {
            const key = `pdf-fields-${pdfId}`;
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('Error loading form field values:', error);
            return {};
        }
    }

    /**
     * Clear form field values for a PDF
     * @param {string} pdfId - PDF identifier
     */
    clearFormFieldValues(pdfId) {
        try {
            const key = `pdf-fields-${pdfId}`;
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Error clearing form field values:', error);
        }
    }

    /**
     * Clear all form field values (cleanup)
     */
    clearAllFormFieldValues() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith('pdf-fields-')) {
                    localStorage.removeItem(key);
                }
            });
        } catch (error) {
            console.error('Error clearing all form field values:', error);
        }
    }
}

// Export for use in other modules
window.StorageManager = StorageManager; 