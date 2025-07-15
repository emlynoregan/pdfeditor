/**
 * Advanced Storage Manager for PDF Editor
 * Uses IndexedDB as primary storage with localStorage fallback
 * Stores PDFs as blobs for better efficiency and higher quotas
 */
class StorageManager {
    constructor() {
        this.dbName = 'PDFEditorDB';
        this.dbVersion = 1;
        this.db = null;
        this.useIndexedDB = true;
        this.STORAGE_KEY = 'pdfeditor_files'; // localStorage fallback key
        
        // Initialize database
        this.initDB();
    }

    /**
     * Initialize IndexedDB
     */
    async initDB() {
        try {
            // Check if IndexedDB is supported
            if (!window.indexedDB) {
                console.warn('IndexedDB not supported, falling back to localStorage');
                this.useIndexedDB = false;
                return;
            }

            return new Promise((resolve, reject) => {
                const request = indexedDB.open(this.dbName, this.dbVersion);

                request.onerror = () => {
                    console.warn('IndexedDB failed to open, falling back to localStorage:', request.error);
                    this.useIndexedDB = false;
                    resolve();
                };

                request.onsuccess = () => {
                    this.db = request.result;
                    console.log('IndexedDB initialized successfully');
                    resolve();
                };

                request.onupgradeneeded = (event) => {
                    const db = event.target.result;

                    // Create object store for PDFs
                    if (!db.objectStoreNames.contains('pdfs')) {
                        const pdfStore = db.createObjectStore('pdfs', { keyPath: 'id' });
                        pdfStore.createIndex('name', 'name', { unique: false });
                        pdfStore.createIndex('uploadDate', 'metadata.uploadDate', { unique: false });
                    }

                    // Create object store for form field values
                    if (!db.objectStoreNames.contains('formFields')) {
                        db.createObjectStore('formFields', { keyPath: 'pdfId' });
                    }
                };
            });
        } catch (error) {
            console.warn('IndexedDB initialization failed, using localStorage:', error);
            this.useIndexedDB = false;
        }
    }

    /**
     * Convert base64 to blob
     * @param {string} base64 - Base64 string
     * @param {string} mimeType - MIME type
     * @returns {Blob} Blob object
     */
    base64ToBlob(base64, mimeType = 'application/pdf') {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    }

    /**
     * Convert blob to base64
     * @param {Blob} blob - Blob object
     * @returns {Promise<string>} Base64 string
     */
    async blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Get all stored PDF files
     * @returns {Promise<Array>} Array of PDF file objects
     */
    async getAllPDFs() {
        if (this.useIndexedDB && this.db) {
            return this.getAllPDFsIndexedDB();
        } else {
            return this.getAllPDFsLocalStorage();
        }
    }

    /**
     * Get all PDFs from IndexedDB
     */
    async getAllPDFsIndexedDB() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['pdfs'], 'readonly');
            const store = transaction.objectStore('pdfs');
            const request = store.getAll();

            request.onsuccess = async () => {
                const pdfs = request.result;
                // Convert blobs back to base64 for compatibility
                const convertedPdfs = await Promise.all(pdfs.map(async (pdf) => {
                    if (pdf.data instanceof Blob) {
                        pdf.data = await this.blobToBase64(pdf.data);
                    }
                    return pdf;
                }));
                resolve(convertedPdfs);
            };

            request.onerror = () => {
                console.error('Error reading from IndexedDB:', request.error);
                resolve([]);
            };
        });
    }

    /**
     * Get all PDFs from localStorage (fallback)
     */
    getAllPDFsLocalStorage() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return [];
        }
    }

    /**
     * Save a PDF file to storage
     * @param {Object} pdfData - PDF file data object
     * @returns {Promise<boolean>} Success status
     */
    async savePDF(pdfData) {
        if (this.useIndexedDB && this.db) {
            return this.savePDFIndexedDB(pdfData);
        } else {
            return this.savePDFLocalStorage(pdfData);
        }
    }

    /**
     * Save PDF to IndexedDB
     */
    async savePDFIndexedDB(pdfData) {
        return new Promise((resolve, reject) => {
            try {
                // Convert base64 to blob for efficient storage
                const blob = this.base64ToBlob(pdfData.data);
                
                const pdfObject = {
                    id: pdfData.id,
                    name: pdfData.name,
                    data: blob, // Store as blob instead of base64
                    metadata: {
                        ...pdfData.metadata,
                        uploadDate: new Date().toISOString(),
                        lastModified: new Date().toISOString()
                    }
                };

                const transaction = this.db.transaction(['pdfs'], 'readwrite');
                const store = transaction.objectStore('pdfs');
                const request = store.put(pdfObject);

                request.onsuccess = () => {
                    console.log('PDF saved to IndexedDB successfully');
                    resolve(true);
                };

                request.onerror = () => {
                    console.error('Error saving to IndexedDB:', request.error);
                    reject(new Error(`Failed to save PDF: ${request.error}`));
                };
            } catch (error) {
                console.error('Error preparing PDF for IndexedDB:', error);
                reject(error);
            }
        });
    }

    /**
     * Save PDF to localStorage (fallback)
     */
    savePDFLocalStorage(pdfData) {
        try {
            const pdfs = this.getAllPDFsLocalStorage();
            
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
            console.error('Error saving PDF to localStorage:', error);
            throw error;
        }
    }

    /**
     * Get a specific PDF by ID
     * @param {string} id - PDF ID
     * @returns {Promise<Object|null>} PDF data or null if not found
     */
    async getPDF(id) {
        if (this.useIndexedDB && this.db) {
            return this.getPDFIndexedDB(id);
        } else {
            return this.getPDFLocalStorage(id);
        }
    }

    /**
     * Get PDF from IndexedDB
     */
    async getPDFIndexedDB(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['pdfs'], 'readonly');
            const store = transaction.objectStore('pdfs');
            const request = store.get(id);

            request.onsuccess = async () => {
                const pdf = request.result;
                if (pdf && pdf.data instanceof Blob) {
                    // Convert blob back to base64 for compatibility
                    pdf.data = await this.blobToBase64(pdf.data);
                }
                resolve(pdf || null);
            };

            request.onerror = () => {
                console.error('Error retrieving PDF from IndexedDB:', request.error);
                resolve(null);
            };
        });
    }

    /**
     * Get PDF from localStorage (fallback)
     */
    getPDFLocalStorage(id) {
        try {
            const pdfs = this.getAllPDFsLocalStorage();
            return pdfs.find(pdf => pdf.id === id) || null;
        } catch (error) {
            console.error('Error retrieving PDF from localStorage:', error);
            return null;
        }
    }

    /**
     * Update PDF metadata or form data
     * @param {string} id - PDF ID
     * @param {Object} updates - Updates to apply
     * @returns {Promise<boolean>} Success status
     */
    async updatePDF(id, updates) {
        if (this.useIndexedDB && this.db) {
            return this.updatePDFIndexedDB(id, updates);
        } else {
            return this.updatePDFLocalStorage(id, updates);
        }
    }

    /**
     * Update PDF in IndexedDB
     */
    async updatePDFIndexedDB(id, updates) {
        return new Promise(async (resolve, reject) => {
            try {
                const existingPDF = await this.getPDFIndexedDB(id);
                if (!existingPDF) {
                    throw new Error('PDF not found');
                }

                // Convert base64 back to blob if needed
                let dataBlob = existingPDF.data;
                if (typeof existingPDF.data === 'string') {
                    dataBlob = this.base64ToBlob(existingPDF.data);
                }

                const updatedPDF = {
                    ...existingPDF,
                    ...updates,
                    data: dataBlob,
                    metadata: {
                        ...existingPDF.metadata,
                        ...updates.metadata,
                        lastModified: new Date().toISOString()
                    }
                };

                const transaction = this.db.transaction(['pdfs'], 'readwrite');
                const store = transaction.objectStore('pdfs');
                const request = store.put(updatedPDF);

                request.onsuccess = () => resolve(true);
                request.onerror = () => {
                    console.error('Error updating PDF in IndexedDB:', request.error);
                    reject(new Error(`Failed to update PDF: ${request.error}`));
                };
            } catch (error) {
                console.error('Error updating PDF:', error);
                reject(error);
            }
        });
    }

    /**
     * Update PDF in localStorage (fallback)
     */
    updatePDFLocalStorage(id, updates) {
        try {
            const pdfs = this.getAllPDFsLocalStorage();
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
            console.error('Error updating PDF in localStorage:', error);
            throw error;
        }
    }

    /**
     * Delete a PDF from storage
     * @param {string} id - PDF ID
     * @returns {Promise<boolean>} Success status
     */
    async deletePDF(id) {
        if (this.useIndexedDB && this.db) {
            await this.deletePDFIndexedDB(id);
        } else {
            this.deletePDFLocalStorage(id);
        }
        
        // Also clear form field values for this PDF
        await this.clearFormFieldValues(id);
        return true;
    }

    /**
     * Delete PDF from IndexedDB
     */
    async deletePDFIndexedDB(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['pdfs'], 'readwrite');
            const store = transaction.objectStore('pdfs');
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => {
                console.error('Error deleting PDF from IndexedDB:', request.error);
                reject(new Error(`Failed to delete PDF: ${request.error}`));
            };
        });
    }

    /**
     * Delete PDF from localStorage (fallback)
     */
    deletePDFLocalStorage(id) {
        try {
            const pdfs = this.getAllPDFsLocalStorage();
            const filteredPdfs = pdfs.filter(pdf => pdf.id !== id);
            
            if (filteredPdfs.length === pdfs.length) {
                throw new Error('PDF not found');
            }

            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredPdfs));
            return true;
        } catch (error) {
            console.error('Error deleting PDF from localStorage:', error);
            throw error;
        }
    }

    /**
     * Clear all PDFs from storage
     * @returns {Promise<boolean>} Success status
     */
    async clearAll() {
        if (this.useIndexedDB && this.db) {
            await this.clearAllIndexedDB();
        } else {
            localStorage.removeItem(this.STORAGE_KEY);
        }
        
        // Also clear all form field values
        await this.clearAllFormFieldValues();
        return true;
    }

    /**
     * Clear all from IndexedDB
     */
    async clearAllIndexedDB() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['pdfs', 'formFields'], 'readwrite');
            
            transaction.objectStore('pdfs').clear();
            transaction.objectStore('formFields').clear();

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => {
                console.error('Error clearing IndexedDB:', transaction.error);
                reject(new Error(`Failed to clear storage: ${transaction.error}`));
            };
        });
    }

    /**
     * Get storage usage statistics
     * @returns {Promise<Object>} Storage usage info
     */
    async getStorageInfo() {
        try {
            const pdfs = await this.getAllPDFs();
            const totalSize = pdfs.reduce((sum, pdf) => {
                return sum + (pdf.data ? pdf.data.length : 0);
            }, 0);

            return {
                totalFiles: pdfs.length,
                totalSize: totalSize,
                formattedSize: this.formatBytes(totalSize),
                storageType: this.useIndexedDB && this.db ? 'IndexedDB' : 'localStorage'
            };
        } catch (error) {
            console.error('Error getting storage info:', error);
            return {
                totalFiles: 0,
                totalSize: 0,
                formattedSize: '0 B',
                storageType: 'unknown'
            };
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
     * @returns {Promise<string>} JSON string of all PDFs
     */
    async exportData() {
        try {
            const pdfs = await this.getAllPDFs();
            return JSON.stringify(pdfs, null, 2);
        } catch (error) {
            console.error('Error exporting data:', error);
            throw error;
        }
    }

    /**
     * Import PDFs from backup
     * @param {string} jsonData - JSON string of PDFs
     * @returns {Promise<boolean>} Success status
     */
    async importData(jsonData) {
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

            // Save each PDF
            for (const pdf of pdfs) {
                await this.savePDF(pdf);
            }

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
    async saveFormFieldValues(pdfId, fieldValues) {
        if (this.useIndexedDB && this.db) {
            return this.saveFormFieldValuesIndexedDB(pdfId, fieldValues);
        } else {
            return this.saveFormFieldValuesLocalStorage(pdfId, fieldValues);
        }
    }

    /**
     * Save form field values to IndexedDB
     */
    async saveFormFieldValuesIndexedDB(pdfId, fieldValues) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['formFields'], 'readwrite');
            const store = transaction.objectStore('formFields');
            const request = store.put({ pdfId, fieldValues });

            request.onsuccess = () => resolve();
            request.onerror = () => {
                console.error('Error saving form fields to IndexedDB:', request.error);
                reject(new Error(`Failed to save form fields: ${request.error}`));
            };
        });
    }

    /**
     * Save form field values to localStorage (fallback)
     */
    saveFormFieldValuesLocalStorage(pdfId, fieldValues) {
        try {
            const key = `pdf-fields-${pdfId}`;
            localStorage.setItem(key, JSON.stringify(fieldValues));
        } catch (error) {
            console.error('Error saving form field values to localStorage:', error);
        }
    }

    /**
     * Load form field values for a PDF
     * @param {string} pdfId - PDF identifier
     * @returns {Promise<Object>} Field values by field ID
     */
    async loadFormFieldValues(pdfId) {
        if (this.useIndexedDB && this.db) {
            return this.loadFormFieldValuesIndexedDB(pdfId);
        } else {
            return this.loadFormFieldValuesLocalStorage(pdfId);
        }
    }

    /**
     * Load form field values from IndexedDB
     */
    async loadFormFieldValuesIndexedDB(pdfId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['formFields'], 'readonly');
            const store = transaction.objectStore('formFields');
            const request = store.get(pdfId);

            request.onsuccess = () => {
                const result = request.result;
                resolve(result ? result.fieldValues : {});
            };

            request.onerror = () => {
                console.error('Error loading form fields from IndexedDB:', request.error);
                resolve({});
            };
        });
    }

    /**
     * Load form field values from localStorage (fallback)
     */
    loadFormFieldValuesLocalStorage(pdfId) {
        try {
            const key = `pdf-fields-${pdfId}`;
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('Error loading form field values from localStorage:', error);
            return {};
        }
    }

    /**
     * Clear form field values for a PDF
     * @param {string} pdfId - PDF identifier
     */
    async clearFormFieldValues(pdfId) {
        if (this.useIndexedDB && this.db) {
            return this.clearFormFieldValuesIndexedDB(pdfId);
        } else {
            return this.clearFormFieldValuesLocalStorage(pdfId);
        }
    }

    /**
     * Clear form field values from IndexedDB
     */
    async clearFormFieldValuesIndexedDB(pdfId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['formFields'], 'readwrite');
            const store = transaction.objectStore('formFields');
            const request = store.delete(pdfId);

            request.onsuccess = () => resolve();
            request.onerror = () => {
                console.error('Error clearing form fields from IndexedDB:', request.error);
                resolve(); // Don't reject, just log error
            };
        });
    }

    /**
     * Clear form field values from localStorage (fallback)
     */
    clearFormFieldValuesLocalStorage(pdfId) {
        try {
            const key = `pdf-fields-${pdfId}`;
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Error clearing form field values from localStorage:', error);
        }
    }

    /**
     * Clear all form field values (cleanup)
     */
    async clearAllFormFieldValues() {
        if (this.useIndexedDB && this.db) {
            return this.clearAllFormFieldValuesIndexedDB();
        } else {
            return this.clearAllFormFieldValuesLocalStorage();
        }
    }

    /**
     * Clear all form field values from IndexedDB
     */
    async clearAllFormFieldValuesIndexedDB() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['formFields'], 'readwrite');
            const store = transaction.objectStore('formFields');
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => {
                console.error('Error clearing all form fields from IndexedDB:', request.error);
                resolve(); // Don't reject, just log error
            };
        });
    }

    /**
     * Clear all form field values from localStorage (fallback)
     */
    clearAllFormFieldValuesLocalStorage() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith('pdf-fields-')) {
                    localStorage.removeItem(key);
                }
            });
        } catch (error) {
            console.error('Error clearing all form field values from localStorage:', error);
        }
    }
}

// Export for use in other modules
window.StorageManager = StorageManager; 