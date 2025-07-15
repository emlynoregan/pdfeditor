console.log('📦 Storage.js starting...');

/**
 * Advanced Storage Manager for PDF Editor
 * Uses IndexedDB as primary storage with localStorage fallback
 * Stores PDFs as blobs for better efficiency and higher quotas
 */
class StorageManager {
    constructor() {
        this.db = null;
        this.isIndexedDBAvailable = false;
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) {
            return;
        }

        try {
            await this.initDB();
            this.isIndexedDBAvailable = true;
            console.log('✅ IndexedDB ready');
        } catch (error) {
            console.warn('⚠️ IndexedDB failed, using localStorage:', error.message);
            this.isIndexedDBAvailable = false;
        }

        this.isInitialized = true;
    }

    initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('PDFEditor', 1);

            request.onerror = (event) => {
                reject(new Error('IndexedDB failed: ' + event.target.error));
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                this.db.onerror = (error) => {
                    console.error('❌ IndexedDB error:', error);
                };
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create PDFs object store
                if (!db.objectStoreNames.contains('pdfs')) {
                    const pdfStore = db.createObjectStore('pdfs', { keyPath: 'id' });
                    pdfStore.createIndex('name', 'name', { unique: false });
                    pdfStore.createIndex('uploadDate', 'uploadDate', { unique: false });
                }

                // Create form fields object store
                if (!db.objectStoreNames.contains('formFields')) {
                    const fieldsStore = db.createObjectStore('formFields', { keyPath: ['pdfId', 'fieldName'] });
                    fieldsStore.createIndex('pdfId', 'pdfId', { unique: false });
                }
            };
        });
    }

    /**
     * Generate a unique ID for PDF files
     * @returns {string} Unique identifier
     */
    generateId() {
        return 'pdf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    async savePDF(pdfData) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (this.isIndexedDBAvailable) {
            return await this.savePDFIndexedDB(pdfData);
        } else {
            return await this.savePDFLocalStorage(pdfData);
        }
    }

    async savePDFIndexedDB(pdfData) {
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction(['pdfs'], 'readwrite');
                const store = transaction.objectStore('pdfs');
                
                // Convert base64 to blob for more efficient storage
                let dataToStore = pdfData;
                if (pdfData.data && typeof pdfData.data === 'string') {
                    dataToStore = {
                        ...pdfData,
                        blob: this.base64ToBlob(pdfData.data),
                        data: undefined // Remove base64 data
                    };
                }

                const request = store.put(dataToStore);

                request.onsuccess = () => resolve();
                request.onerror = (event) => {
                    console.error('❌ IndexedDB save failed:', event.target.error);
                    reject(new Error('Save failed: ' + event.target.error));
                };

                transaction.onerror = (event) => {
                    console.error('❌ Transaction failed:', event.target.error);
                    reject(new Error('Transaction failed: ' + event.target.error));
                };
            } catch (error) {
                console.error('❌ savePDFIndexedDB error:', error);
                reject(error);
            }
        });
    }

    async savePDFLocalStorage(pdfData) {
        try {
            const pdfs = this.getAllPDFsLocalStorage();
            
            // Convert blob to base64 if needed
            let dataToStore = pdfData;
            if (pdfData.blob && !pdfData.data) {
                dataToStore = {
                    ...pdfData,
                    data: await this.blobToBase64(pdfData.blob),
                    blob: undefined // Remove blob data
                };
            }

            pdfs.push(dataToStore);
            localStorage.setItem('pdfeditor_pdfs', JSON.stringify(pdfs));
        } catch (error) {
            console.error('❌ localStorage save failed:', error);
            throw error;
        }
    }

    async getAllPDFMetadata() {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (this.isIndexedDBAvailable) {
            return await this.getAllPDFMetadataIndexedDB();
        } else {
            return this.getAllPDFMetadataLocalStorage();
        }
    }

    async getAllPDFMetadataIndexedDB() {
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction(['pdfs'], 'readonly');
                const store = transaction.objectStore('pdfs');
                const request = store.getAll();

                request.onsuccess = (event) => {
                    const pdfs = event.target.result;
                    
                    // Filter out any null/undefined entries and return only metadata
                    const metadata = pdfs
                        .filter(pdf => pdf && pdf.id) // Remove null/undefined entries
                        .map(pdf => ({
                            id: pdf.id,
                            name: pdf.name || 'Untitled PDF',
                            uploadDate: pdf.uploadDate || new Date().toISOString(),
                            size: pdf.blob ? pdf.blob.size : (pdf.data ? pdf.data.length : 0),
                            metadata: pdf.metadata || { pages: 0, formFields: 0 }
                        }));
                    
                    resolve(metadata);
                };

                request.onerror = (event) => {
                    console.error('❌ Metadata fetch failed:', event.target.error);
                    reject(new Error('Failed to get metadata: ' + event.target.error));
                };
            } catch (error) {
                console.error('❌ getAllPDFMetadataIndexedDB error:', error);
                reject(error);
            }
        });
    }

    getAllPDFMetadataLocalStorage() {
        try {
            const pdfsJson = localStorage.getItem('pdfeditor_pdfs');
            if (!pdfsJson) {
                return [];
            }

            const pdfs = JSON.parse(pdfsJson);
            
            // Filter out any null/undefined entries and return only metadata
            const metadata = pdfs
                .filter(pdf => pdf && pdf.id) // Remove null/undefined entries
                .map(pdf => ({
                    id: pdf.id,
                    name: pdf.name || 'Untitled PDF',
                    uploadDate: pdf.uploadDate || new Date().toISOString(),
                    size: pdf.data ? pdf.data.length : 0,
                    metadata: pdf.metadata || { pages: 0, formFields: 0 }
                }));
            
            return metadata;
        } catch (error) {
            console.error('❌ Metadata from localStorage failed:', error);
            return [];
        }
    }

    async getPDF(id) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (this.isIndexedDBAvailable) {
            return await this.getPDFIndexedDB(id);
        } else {
            return this.getPDFLocalStorage(id);
        }
    }

    async getPDFIndexedDB(id) {
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction(['pdfs'], 'readonly');
                const store = transaction.objectStore('pdfs');
                const request = store.get(id);

                request.onsuccess = (event) => {
                    const pdf = event.target.result;
                    if (pdf) {
                        // Convert blob back to base64 for PDF.js
                        if (pdf.blob && !pdf.data) {
                            this.blobToBase64(pdf.blob).then(base64 => {
                                const result = {
                                    ...pdf,
                                    data: base64,
                                    blob: undefined
                                };
                                resolve(result);
                            }).catch(error => {
                                console.error('❌ Blob conversion failed:', error);
                                reject(error);
                            });
                        } else {
                            resolve(pdf);
                        }
                    } else {
                        resolve(null);
                    }
                };

                request.onerror = (event) => {
                    console.error('❌ PDF fetch failed:', event.target.error);
                    reject(new Error('Failed to get PDF: ' + event.target.error));
                };
            } catch (error) {
                console.error('❌ getPDFIndexedDB error:', error);
                reject(error);
            }
        });
    }

    getPDFLocalStorage(id) {
        try {
            const pdfs = this.getAllPDFsLocalStorage();
            return pdfs.find(p => p.id === id) || null;
        } catch (error) {
            console.error('❌ PDF from localStorage failed:', error);
            return null;
        }
    }

    // Helper methods...
    base64ToBlob(base64) {
        try {
            const byteCharacters = atob(base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            return new Blob([byteArray], { type: 'application/pdf' });
        } catch (error) {
            console.error('❌ base64ToBlob failed:', error);
            throw error;
        }
    }

    async blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = (error) => {
                console.error('❌ blobToBase64 failed:', error);
                reject(error);
            };
            reader.readAsDataURL(blob);
        });
    }

    getAllPDFsLocalStorage() {
        try {
            const pdfsJson = localStorage.getItem('pdfeditor_pdfs');
            if (!pdfsJson) {
                return [];
            }
            
            return JSON.parse(pdfsJson);
        } catch (error) {
            console.error('❌ Parse PDFs failed:', error);
            return [];
        }
    }

    async deletePDF(id) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (this.isIndexedDBAvailable) {
            await this.deletePDFIndexedDB(id);
        } else {
            this.deletePDFLocalStorage(id);
        }
        
        // Also delete form field values
        await this.clearFormFieldValues(id);
    }

    async deletePDFIndexedDB(id) {
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction(['pdfs'], 'readwrite');
                const store = transaction.objectStore('pdfs');
                const request = store.delete(id);

                request.onsuccess = () => resolve();
                request.onerror = (event) => {
                    console.error('❌ Delete from IndexedDB failed:', event.target.error);
                    reject(new Error('Delete failed: ' + event.target.error));
                };
            } catch (error) {
                console.error('❌ deletePDFIndexedDB error:', error);
                reject(error);
            }
        });
    }

    deletePDFLocalStorage(id) {
        try {
            const pdfs = this.getAllPDFsLocalStorage();
            const filteredPdfs = pdfs.filter(p => p.id !== id);
            localStorage.setItem('pdfeditor_pdfs', JSON.stringify(filteredPdfs));
        } catch (error) {
            console.error('❌ Delete from localStorage failed:', error);
            throw error;
        }
    }

    // Form field methods with minimal logging...
    async saveFormFieldValue(pdfId, fieldName, value) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (this.isIndexedDBAvailable) {
            return await this.saveFormFieldValueIndexedDB(pdfId, fieldName, value);
        } else {
            return this.saveFormFieldValueLocalStorage(pdfId, fieldName, value);
        }
    }

    async saveFormFieldValueIndexedDB(pdfId, fieldName, value) {
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction(['formFields'], 'readwrite');
                const store = transaction.objectStore('formFields');
                
                const fieldData = {
                    pdfId: pdfId,
                    fieldName: fieldName,
                    value: value,
                    savedAt: new Date().toISOString()
                };

                const request = store.put(fieldData);
                request.onsuccess = () => resolve();
                request.onerror = (event) => {
                    console.error('❌ Form field save failed:', event.target.error);
                    reject(new Error('Form field save failed: ' + event.target.error));
                };
            } catch (error) {
                console.error('❌ saveFormFieldValueIndexedDB error:', error);
                reject(error);
            }
        });
    }

    saveFormFieldValueLocalStorage(pdfId, fieldName, value) {
        try {
            const key = `pdfeditor_form_${pdfId}`;
            const formData = JSON.parse(localStorage.getItem(key) || '{}');
            formData[fieldName] = value;
            localStorage.setItem(key, JSON.stringify(formData));
        } catch (error) {
            console.error('❌ Form field localStorage save failed:', error);
            throw error;
        }
    }

    async saveFormFieldValues(pdfId, fieldValues) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (this.isIndexedDBAvailable) {
            return await this.saveFormFieldValuesIndexedDB(pdfId, fieldValues);
        } else {
            return this.saveFormFieldValuesLocalStorage(pdfId, fieldValues);
        }
    }

    async saveFormFieldValuesIndexedDB(pdfId, fieldValues) {
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction(['formFields'], 'readwrite');
                const store = transaction.objectStore('formFields');
                
                // Clear existing values for this PDF first
                const index = store.index('pdfId');
                const clearRequest = index.openKeyCursor(pdfId);
                
                clearRequest.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        store.delete(cursor.primaryKey);
                        cursor.continue();
                    } else {
                        // Now save the new values
                        const promises = Object.entries(fieldValues).map(([fieldName, value]) => {
                            return new Promise((resolveField) => {
                                const fieldData = {
                                    pdfId: pdfId,
                                    fieldName: fieldName,
                                    value: value,
                                    updatedAt: new Date().toISOString()
                                };
                                const addRequest = store.add(fieldData);
                                addRequest.onsuccess = () => resolveField();
                                addRequest.onerror = () => resolveField(); // Don't fail on individual fields
                            });
                        });
                        
                        Promise.all(promises).then(() => resolve());
                    }
                };

                clearRequest.onerror = (event) => {
                    console.error('❌ Form field clear failed:', event.target.error);
                    reject(new Error('Form field save failed: ' + event.target.error));
                };
            } catch (error) {
                console.error('❌ saveFormFieldValuesIndexedDB error:', error);
                reject(error);
            }
        });
    }

    saveFormFieldValuesLocalStorage(pdfId, fieldValues) {
        try {
            const key = `pdfeditor_form_${pdfId}`;
            localStorage.setItem(key, JSON.stringify(fieldValues));
        } catch (error) {
            console.error('❌ Form fields localStorage save failed:', error);
            throw error;
        }
    }

    async getFormFieldValues(pdfId) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (this.isIndexedDBAvailable) {
            return await this.getFormFieldValuesIndexedDB(pdfId);
        } else {
            return this.getFormFieldValuesLocalStorage(pdfId);
        }
    }

    async getFormFieldValuesIndexedDB(pdfId) {
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction(['formFields'], 'readonly');
                const store = transaction.objectStore('formFields');
                const index = store.index('pdfId');
                const request = index.getAll(pdfId);

                request.onsuccess = (event) => {
                    const fields = event.target.result;
                    const formData = {};
                    fields.forEach(field => {
                        formData[field.fieldName] = field.value;
                    });
                    resolve(formData);
                };

                request.onerror = (event) => {
                    console.error('❌ Form fields fetch failed:', event.target.error);
                    reject(new Error('Form fields fetch failed: ' + event.target.error));
                };
            } catch (error) {
                console.error('❌ getFormFieldValuesIndexedDB error:', error);
                reject(error);
            }
        });
    }

    getFormFieldValuesLocalStorage(pdfId) {
        try {
            const key = `pdfeditor_form_${pdfId}`;
            return JSON.parse(localStorage.getItem(key) || '{}');
        } catch (error) {
            console.error('❌ Form fields localStorage fetch failed:', error);
            return {};
        }
    }

    async clearFormFieldValues(pdfId) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (this.isIndexedDBAvailable) {
            return await this.clearFormFieldValuesIndexedDB(pdfId);
        } else {
            return this.clearFormFieldValuesLocalStorage(pdfId);
        }
    }

    async clearFormFieldValuesIndexedDB(pdfId) {
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction(['formFields'], 'readwrite');
                const store = transaction.objectStore('formFields');
                const index = store.index('pdfId');
                const request = index.getAll(pdfId);

                request.onsuccess = (event) => {
                    const fields = event.target.result;
                    let deletedCount = 0;
                    
                    fields.forEach(field => {
                        const deleteRequest = store.delete([field.pdfId, field.fieldName]);
                        deleteRequest.onsuccess = () => {
                            deletedCount++;
                            if (deletedCount === fields.length) {
                                resolve();
                            }
                        };
                    });

                    if (fields.length === 0) {
                        resolve();
                    }
                };

                request.onerror = (event) => {
                    console.error('❌ Clear form fields failed:', event.target.error);
                    reject(new Error('Clear form fields failed: ' + event.target.error));
                };
            } catch (error) {
                console.error('❌ clearFormFieldValuesIndexedDB error:', error);
                reject(error);
            }
        });
    }

    clearFormFieldValuesLocalStorage(pdfId) {
        try {
            const key = `pdfeditor_form_${pdfId}`;
            localStorage.removeItem(key);
        } catch (error) {
            console.error('❌ Clear form fields localStorage failed:', error);
            throw error;
        }
    }

    async clearAllPDFs() {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (this.isIndexedDBAvailable) {
            await this.clearAllPDFsIndexedDB();
        } else {
            this.clearAllPDFsLocalStorage();
        }
    }

    async clearAllPDFsIndexedDB() {
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction(['pdfs', 'formFields'], 'readwrite');
                
                const pdfStore = transaction.objectStore('pdfs');
                const fieldsStore = transaction.objectStore('formFields');
                
                const clearPDFs = pdfStore.clear();
                const clearFields = fieldsStore.clear();

                let completed = 0;
                const checkComplete = () => {
                    completed++;
                    if (completed === 2) {
                        resolve();
                    }
                };

                clearPDFs.onsuccess = checkComplete;
                clearFields.onsuccess = checkComplete;

                clearPDFs.onerror = clearFields.onerror = (event) => {
                    console.error('❌ Clear all failed:', event.target.error);
                    reject(new Error('Clear all failed: ' + event.target.error));
                };
            } catch (error) {
                console.error('❌ clearAllPDFsIndexedDB error:', error);
                reject(error);
            }
        });
    }

    clearAllPDFsLocalStorage() {
        try {
            // Clear all PDF data
            localStorage.removeItem('pdfeditor_pdfs');
            
            // Clear all form field data
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith('pdfeditor_form_')) {
                    localStorage.removeItem(key);
                }
            });
        } catch (error) {
            console.error('❌ Clear all localStorage failed:', error);
            throw error;
        }
    }

    getStorageUsage() {
        try {
            let totalSize = 0;
            
            // Calculate localStorage usage
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key) && key.startsWith('pdfeditor_')) {
                    totalSize += localStorage[key].length;
                }
            }
            
            return {
                used: totalSize,
                formattedUsed: this.formatBytes(totalSize),
                isIndexedDB: this.isIndexedDBAvailable
            };
        } catch (error) {
            console.error('❌ Storage usage calculation failed:', error);
            return { used: 0, formattedUsed: '0 B', isIndexedDB: false };
        }
    }

    /**
     * Get comprehensive storage information
     * @returns {Promise<Object>} Storage info with formatted size and file count
     */
    async getStorageInfo() {
        try {
            const usage = this.getStorageUsage();
            const metadata = await this.getAllPDFMetadata();
            
            return {
                formattedSize: usage.formattedUsed,
                totalFiles: metadata.length,
                usedBytes: usage.used,
                isIndexedDB: usage.isIndexedDB
            };
        } catch (error) {
            console.error('❌ getStorageInfo failed:', error);
            return {
                formattedSize: '0 B',
                totalFiles: 0,
                usedBytes: 0,
                isIndexedDB: false
            };
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

console.log('✅ Storage.js loaded'); 