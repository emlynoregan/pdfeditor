/**
 * UI Manager for PDF Editor
 * Handles all UI interactions, modal management, and user interface updates
 */
class UIManager {
    constructor() {
        this.currentView = 'upload';
        this.currentPDFId = null;
        this.modals = {};
        this.initialize();
    }

    /**
     * Initialize UI manager
     */
    initialize() {
        this.setupEventListeners();
        this.setupModals();
        this.showUploadSection();
    }

    /**
     * Setup event listeners for UI elements
     */
    setupEventListeners() {
        // File upload
        const uploadBtn = document.getElementById('upload-btn');
        const fileInput = document.getElementById('pdf-file-input');
        const addMoreBtn = document.getElementById('add-more-btn');

        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => fileInput.click());
        }

        if (addMoreBtn) {
            addMoreBtn.addEventListener('click', () => fileInput.click());
        }

        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        }

        // PDF management
        const clearAllBtn = document.getElementById('clear-all-btn');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => this.handleClearAll());
        }

        // PDF editor controls
        const backBtn = document.getElementById('back-to-list-btn');
        const downloadBtn = document.getElementById('download-btn');
        const zoomInBtn = document.getElementById('zoom-in-btn');
        const zoomOutBtn = document.getElementById('zoom-out-btn');
        const prevPageBtn = document.getElementById('prev-page-btn');
        const nextPageBtn = document.getElementById('next-page-btn');

        if (backBtn) {
            backBtn.addEventListener('click', () => this.showPDFManagement());
        }

        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => this.handleDownload());
        }

        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => this.handleZoomIn());
        }

        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => this.handleZoomOut());
        }

        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', () => this.handlePrevPage());
        }

        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', () => this.handleNextPage());
        }

        // Modal buttons
        const aboutBtn = document.getElementById('about-btn');
        const helpBtn = document.getElementById('help-btn');

        if (aboutBtn) {
            aboutBtn.addEventListener('click', () => this.showModal('about'));
        }

        if (helpBtn) {
            helpBtn.addEventListener('click', () => this.showModal('help'));
        }

        // Custom events
        window.addEventListener('fieldValueChanged', (e) => {
            this.handleFieldValueChanged(e.detail);
        });
    }

    /**
     * Setup modal functionality
     */
    setupModals() {
        const modalIds = ['about-modal', 'help-modal'];
        
        modalIds.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) {
                this.modals[modalId] = modal;
                
                // Close button
                const closeBtn = modal.querySelector('.close-btn');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => this.hideModal(modalId));
                }
                
                // Click outside to close
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.hideModal(modalId);
                    }
                });
            }
        });

        // ESC key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAllModals();
            }
        });
    }

    /**
     * Handle file upload
     * @param {Event} event - File input change event
     */
    async handleFileUpload(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        this.showLoadingOverlay('Processing PDF files...');

        try {
            const storage = new StorageManager();
            const pdfHandler = new PDFHandler();
            let successCount = 0;
            let errorCount = 0;

            for (const file of files) {
                try {
                    if (file.type !== 'application/pdf') {
                        throw new Error('Only PDF files are supported');
                    }

                    // Read file as base64
                    const base64Data = await this.fileToBase64(file);
                    
                    // Load PDF to extract metadata
                    const pdfData = await pdfHandler.loadPDFFromFile(file);
                    
                    // Create PDF object for storage
                    const pdfObject = {
                        id: storage.generateId(),
                        name: file.name,
                        data: base64Data,
                        metadata: {
                            size: file.size,
                            type: file.type,
                            pages: pdfData.totalPages,
                            formFields: pdfData.formFields.length
                        }
                    };

                    // Save to storage
                    await storage.savePDF(pdfObject);
                    successCount++;
                } catch (error) {
                    console.error('Error processing file:', file.name, error);
                    errorCount++;
                }
            }

            // Clear file input
            event.target.value = '';

            // Show results
            if (successCount > 0) {
                this.showNotification(`Successfully uploaded ${successCount} PDF(s)`, 'success');
                this.showPDFManagement();
            }

            if (errorCount > 0) {
                this.showNotification(`Failed to upload ${errorCount} file(s)`, 'error');
            }

        } catch (error) {
            console.error('Error uploading files:', error);
            this.showNotification('Failed to upload files: ' + error.message, 'error');
        } finally {
            this.hideLoadingOverlay();
        }
    }

    /**
     * Convert file to base64
     * @param {File} file - File to convert
     * @returns {Promise<string>} Base64 string
     */
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Handle clear all PDFs
     */
    async handleClearAll() {
        if (!confirm('Are you sure you want to delete all PDF files? This cannot be undone.')) {
            return;
        }

        try {
            const storage = new StorageManager();
            await storage.clearAll();
            this.showNotification('All PDFs cleared successfully', 'success');
            this.showUploadSection();
        } catch (error) {
            console.error('Error clearing PDFs:', error);
            this.showNotification('Failed to clear PDFs: ' + error.message, 'error');
        }
    }

    /**
     * Handle PDF download
     */
    async handleDownload() {
        if (!this.currentPDFId) return;

        this.showLoadingOverlay('Generating PDF...');

        try {
            const storage = new StorageManager();
            const pdfData = storage.getPDF(this.currentPDFId);
            
            if (!pdfData) {
                throw new Error('PDF not found');
            }

            // Use the existing PDFHandler instance that has the form field values
            if (!window.pdfHandler) {
                throw new Error('PDF handler not initialized');
            }
            
            // Generate filled PDF using the current PDFHandler instance
            const filledPdfBytes = await window.pdfHandler.generateFilledPDF();
            
            // Download the PDF
            const blob = new Blob([filledPdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `filled_${pdfData.name}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showNotification('PDF downloaded successfully', 'success');
        } catch (error) {
            console.error('Error downloading PDF:', error);
            this.showNotification('Failed to download PDF: ' + error.message, 'error');
        } finally {
            this.hideLoadingOverlay();
        }
    }

    /**
     * Handle zoom in
     */
    handleZoomIn() {
        window.pdfHandler?.setZoom(window.pdfHandler.scale + 0.25);
        this.updateZoomDisplay();
    }

    /**
     * Handle zoom out
     */
    handleZoomOut() {
        window.pdfHandler?.setZoom(window.pdfHandler.scale - 0.25);
        this.updateZoomDisplay();
    }

    /**
     * Handle previous page
     */
    handlePrevPage() {
        window.pdfHandler?.previousPage();
        this.updatePageDisplay();
    }

    /**
     * Handle next page
     */
    handleNextPage() {
        window.pdfHandler?.nextPage();
        this.updatePageDisplay();
    }

    /**
     * Handle form field value changes
     * @param {Object} detail - Field change details
     */
    handleFieldValueChanged(detail) {
        // Update the sidebar form field input
        const fieldInput = document.getElementById(`field-${detail.fieldId}`);
        if (fieldInput) {
            // Update the value without losing focus
            if (fieldInput.type === 'checkbox') {
                fieldInput.checked = detail.value === 'Yes' || detail.value === true;
            } else if (fieldInput.tagName === 'SELECT') {
                fieldInput.value = detail.value;
            } else {
                // For text inputs and textareas, only update if the value is different
                // and the field is not currently focused to avoid interrupting typing
                if (fieldInput.value !== detail.value && document.activeElement !== fieldInput) {
                    fieldInput.value = detail.value;
                }
            }
        }
        
        // Update the PDF overlay input
        const overlayInput = document.querySelector(`#form-overlay [data-field-id="${detail.fieldId}"]`);
        if (overlayInput) {
            if (overlayInput.type === 'checkbox') {
                overlayInput.checked = detail.value === 'Yes' || detail.value === true;
            } else if (overlayInput.tagName === 'SELECT') {
                overlayInput.value = detail.value;
            } else {
                // For text inputs and textareas, only update if the value is different
                // and the field is not currently focused to avoid interrupting typing
                if (overlayInput.value !== detail.value && document.activeElement !== overlayInput) {
                    overlayInput.value = detail.value;
                }
            }
            
            // Update the filled state of the overlay
            const overlay = overlayInput.closest('.form-field-overlay');
            if (overlay) {
                if (detail.value && detail.value.toString().trim() !== '') {
                    overlay.classList.add('filled');
                } else {
                    overlay.classList.remove('filled');
                }
            }
        }
    }

    /**
     * Show upload section
     */
    showUploadSection() {
        this.hideAllSections();
        this.hideLoadingOverlay(); // Ensure loading overlay is hidden
        this.showElement('upload-section');
        this.currentView = 'upload';
    }

    /**
     * Show PDF management section
     */
    async showPDFManagement() {
        this.hideAllSections();
        this.hideLoadingOverlay(); // Ensure loading overlay is hidden
        this.showElement('pdf-management');
        this.currentView = 'management';
        await this.updatePDFList();
    }

    /**
     * Show PDF editor section
     * @param {string} pdfId - PDF ID to edit
     */
    async showPDFEditor(pdfId) {
        this.hideAllSections();
        this.showElement('pdf-editor');
        this.currentView = 'editor';
        this.currentPDFId = pdfId;
        await this.loadPDFInEditor(pdfId);
    }

    /**
     * Load PDF in editor
     * @param {string} pdfId - PDF ID
     */
    async loadPDFInEditor(pdfId) {
        this.showLoadingOverlay('Loading PDF...');

        try {
            const storage = new StorageManager();
            const pdfData = storage.getPDF(pdfId);
            
            if (!pdfData) {
                throw new Error('PDF not found');
            }

            // Update PDF name
            const nameElement = document.getElementById('current-pdf-name');
            if (nameElement) {
                nameElement.textContent = pdfData.name;
            }

            // Load PDF
            if (!window.pdfHandler) {
                window.pdfHandler = new PDFHandler();
            }

            // Set the current PDF ID for form field persistence
            window.pdfHandler.currentPDFId = pdfId;

            await window.pdfHandler.loadPDFFromBase64(pdfData.data);
            await window.pdfHandler.renderPage(1);

            // Update controls
            this.updatePageDisplay();
            this.updateZoomDisplay();
            this.updateFormFieldPanel();
            
            // Load saved form field values after everything is ready
            // Use nextTick to ensure DOM is fully updated
            setTimeout(() => {
                window.pdfHandler.loadFieldValuesFromStorage();
            }, 50);

        } catch (error) {
            console.error('Error loading PDF in editor:', error);
            this.showNotification('Failed to load PDF: ' + error.message, 'error');
            this.showPDFManagement();
        } finally {
            this.hideLoadingOverlay();
        }
    }

    /**
     * Update PDF list
     */
    async updatePDFList() {
        const listContainer = document.getElementById('pdf-list');
        if (!listContainer) return;

        try {
            const storage = new StorageManager();
            const pdfs = storage.getAllPDFs();

            if (pdfs.length === 0) {
                listContainer.innerHTML = '<p class="text-center">No PDF files uploaded yet.</p>';
                return;
            }

            listContainer.innerHTML = pdfs.map(pdf => this.createPDFListItem(pdf)).join('');
        } catch (error) {
            console.error('Error updating PDF list:', error);
            listContainer.innerHTML = '<p class="text-center">Error loading PDFs.</p>';
        }
    }

    /**
     * Create PDF list item HTML
     * @param {Object} pdf - PDF data
     * @returns {string} HTML string
     */
    createPDFListItem(pdf) {
        const uploadDate = new Date(pdf.metadata.uploadDate).toLocaleDateString();
        const storage = new StorageManager();
        const fileSize = storage.formatBytes(pdf.metadata.size);
        
        return `
            <div class="pdf-item" data-pdf-id="${pdf.id}">
                <div class="pdf-item-header">
                    <div class="pdf-item-title">${pdf.name}</div>
                    <div class="pdf-item-actions">
                        <button class="pdf-item-action edit" onclick="uiManager.editPDF('${pdf.id}')">Edit</button>
                        <button class="pdf-item-action delete" onclick="uiManager.deletePDF('${pdf.id}')">Delete</button>
                    </div>
                </div>
                <div class="pdf-item-info">
                    <div class="pdf-item-size">${fileSize} • ${pdf.metadata.pages} pages</div>
                    <div class="pdf-item-date">Uploaded: ${uploadDate}</div>
                    <div class="pdf-item-fields">${pdf.metadata.formFields} form fields</div>
                </div>
            </div>
        `;
    }

    /**
     * Edit PDF
     * @param {string} pdfId - PDF ID
     */
    async editPDF(pdfId) {
        await this.showPDFEditor(pdfId);
    }

    /**
     * Delete PDF
     * @param {string} pdfId - PDF ID
     */
    async deletePDF(pdfId) {
        const storage = new StorageManager();
        const pdf = storage.getPDF(pdfId);
        
        if (!pdf) return;

        if (!confirm(`Are you sure you want to delete "${pdf.name}"? This cannot be undone.`)) {
            return;
        }

        try {
            await storage.deletePDF(pdfId);
            this.showNotification('PDF deleted successfully', 'success');
            await this.updatePDFList();
        } catch (error) {
            console.error('Error deleting PDF:', error);
            this.showNotification('Failed to delete PDF: ' + error.message, 'error');
        }
    }

    /**
     * Update page display
     */
    updatePageDisplay() {
        const pageInfo = document.getElementById('page-info');
        if (pageInfo && window.pdfHandler) {
            const info = window.pdfHandler.getPageInfo();
            pageInfo.textContent = `Page ${info.currentPage} of ${info.totalPages}`;
        }
    }

    /**
     * Update zoom display
     */
    updateZoomDisplay() {
        const zoomLevel = document.getElementById('zoom-level');
        if (zoomLevel && window.pdfHandler) {
            const info = window.pdfHandler.getPageInfo();
            zoomLevel.textContent = `${Math.round(info.scale * 100)}%`;
        }
    }

    /**
     * Update form field panel
     */
    updateFormFieldPanel() {
        const fieldsList = document.getElementById('form-fields-list');
        if (!fieldsList || !window.pdfHandler) return;

        const formFields = window.pdfHandler.formFields;
        
        if (formFields.length === 0) {
            fieldsList.innerHTML = '<p class="no-fields">No form fields detected in this PDF.</p>';
            return;
        }

        fieldsList.innerHTML = formFields.map(field => this.createFormFieldItem(field)).join('');
        
        // Add event listeners for form field inputs
        formFields.forEach(field => {
            if (field.type === 'radio') {
                // Handle radio button groups
                const radioInputs = document.querySelectorAll(`input[name="radio-${field.id}"]`);
                radioInputs.forEach(radio => {
                    radio.addEventListener('click', (e) => {
                        // Check if this radio button was already selected BEFORE the click
                        const currentGroupValue = window.pdfHandler.formFields.find(f => f.id === field.id)?.value;
                        const wasSelected = currentGroupValue === e.target.value;
                        
                        if (wasSelected) {
                            // Prevent default radio button behavior
                            e.preventDefault();
                            
                            // Clear the entire radio group
                            e.target.checked = false;
                            window.pdfHandler.updateFieldValue(field.id, '');
                            
                            // Clear all sidebar radio buttons in this group
                            const sidebarRadios = document.querySelectorAll(`input[name="radio-${field.id}"]`);
                            sidebarRadios.forEach(sidebarRadio => {
                                sidebarRadio.checked = false;
                            });
                            
                            // Clear overlay radio buttons
                            const overlayRadios = document.querySelectorAll(`input[name="${field.name}"]`);
                            overlayRadios.forEach(overlayRadio => {
                                overlayRadio.checked = false;
                            });
                            
                            // Update overlays
                            window.pdfHandler.updateFormFieldOverlays();
                        } else {
                            // Select this radio button (normal behavior)
                            window.pdfHandler.updateFieldValue(field.id, e.target.value);
                            
                            // Update all sidebar radio buttons in this group
                            const sidebarRadios = document.querySelectorAll(`input[name="radio-${field.id}"]`);
                            sidebarRadios.forEach(sidebarRadio => {
                                sidebarRadio.checked = sidebarRadio.value === e.target.value;
                            });
                            
                            // Update overlay radio buttons
                            const overlayRadios = document.querySelectorAll(`input[name="${field.name}"]`);
                            overlayRadios.forEach(overlayRadio => {
                                overlayRadio.checked = overlayRadio.value === e.target.value;
                            });
                            
                            // Update overlays
                            window.pdfHandler.updateFormFieldOverlays();
                        }
                    });
                });
            } else {
                const input = document.getElementById(`field-${field.id}`);
                if (input) {
                    // Handle different input types
                    if (field.type === 'checkbox') {
                        input.addEventListener('change', (e) => {
                            const value = e.target.checked ? 'Yes' : 'No';
                            window.pdfHandler.updateFieldValue(field.id, value);
                        });
                    } else if (field.type === 'select') {
                        // Special handling for select elements
                        input.addEventListener('change', (e) => {
                            window.pdfHandler.updateFieldValue(field.id, e.target.value);
                        });
                    } else {
                        input.addEventListener('input', (e) => {
                            window.pdfHandler.updateFieldValue(field.id, e.target.value);
                        });
                        input.addEventListener('change', (e) => {
                            window.pdfHandler.updateFieldValue(field.id, e.target.value);
                        });
                    }
                }
            }
        });
    }

    /**
     * Create form field item HTML
     * @param {Object} field - Form field data
     * @returns {string} HTML string
     */
    createFormFieldItem(field) {
        const fieldTypeClass = field.type + '-field';
        
        let inputHtml = '';
        switch (field.type) {
            case 'text':
                inputHtml = field.multiline 
                    ? `<textarea class="form-field-input-panel" id="field-${field.id}" ${field.readonly ? 'readonly' : ''}>${field.value || ''}</textarea>`
                    : `<input type="text" class="form-field-input-panel" id="field-${field.id}" value="${field.value || ''}" ${field.readonly ? 'readonly' : ''} ${field.maxLength ? `maxlength="${field.maxLength}"` : ''}>`;
                break;
            case 'checkbox':
                inputHtml = `<input type="checkbox" class="form-field-input-panel" id="field-${field.id}" ${field.value === 'Yes' || field.value === true ? 'checked' : ''} ${field.readonly ? 'disabled' : ''}><label for="field-${field.id}">Check this box</label>`;
                break;
            case 'radio':
                // For radio buttons, create actual radio button options
                if (field.options && field.options.length > 0) {
                    const radioOptions = field.options.map((option, index) => 
                        `<label class="radio-option">
                            <input type="radio" name="radio-${field.id}" value="${option}" ${option === field.value ? 'checked' : ''}>
                            <span>${option}</span>
                        </label>`
                    ).join('');
                    
                    inputHtml = `
                        <div class="radio-field-container">
                            <div class="radio-options">
                                ${radioOptions}
                            </div>
                            <small class="field-note">Radio button group: ${field.displayName || field.name}</small>
                        </div>
                    `;
                } else {
                    // Fallback for radio buttons without options
                    inputHtml = `
                        <div class="radio-field-container">
                            <input type="text" class="form-field-input-panel" id="field-${field.id}" value="${field.value || ''}" ${field.readonly ? 'readonly' : ''} placeholder="Enter radio button value">
                            <small class="field-note">Radio button group: ${field.displayName || field.name}</small>
                        </div>
                    `;
                }
                break;
            case 'select':
                if (field.options && field.options.length > 0) {
                    const options = [
                        '<option value="">Select an option...</option>',
                        ...field.options.map(option => 
                            `<option value="${option}" ${option === field.value ? 'selected' : ''}>${option}</option>`
                        )
                    ].join('');
                    inputHtml = `<select class="form-field-input-panel" id="field-${field.id}" ${field.readonly ? 'disabled' : ''}>${options}</select>`;
                } else {
                    // Fallback to text input if no options
                    inputHtml = `<input type="text" class="form-field-input-panel" id="field-${field.id}" value="${field.value || ''}" ${field.readonly ? 'readonly' : ''} placeholder="No options available">`;
                }
                break;
            default:
                inputHtml = `<input type="text" class="form-field-input-panel" id="field-${field.id}" value="${field.value || ''}" ${field.readonly ? 'readonly' : ''}>`;
        }

        // Build field info with additional details
        let fieldInfo = `Page ${field.page} • ${field.type} field`;
        
        // Add technical field name if different from display name
        if (field.name && field.displayName && field.name !== field.displayName) {
            fieldInfo += ` • Field: ${field.name}`;
        }
        
        // Add tooltip if available
        let tooltipHtml = '';
        if (field.tooltip && field.tooltip.trim()) {
            tooltipHtml = `<span class="field-tooltip" title="${field.tooltip}">ℹ️</span>`;
        }

        return `
            <div class="form-field-item ${fieldTypeClass}">
                <label class="form-field-label" for="field-${field.id}">
                    ${field.displayName || field.name || 'Unnamed Field'}
                    ${field.required ? '<span class="text-red-500">*</span>' : ''}
                    ${tooltipHtml}
                </label>
                ${inputHtml}
                <div class="form-field-info">
                    ${fieldInfo}
                </div>
            </div>
        `;
    }

    /**
     * Show modal
     * @param {string} modalType - Modal type (about, help)
     */
    showModal(modalType) {
        const modalId = modalType + '-modal';
        const modal = this.modals[modalId];
        if (modal) {
            modal.classList.add('active');
        }
    }

    /**
     * Hide modal
     * @param {string} modalId - Modal ID
     */
    hideModal(modalId) {
        const modal = this.modals[modalId];
        if (modal) {
            modal.classList.remove('active');
        }
    }

    /**
     * Hide all modals
     */
    hideAllModals() {
        Object.values(this.modals).forEach(modal => {
            modal.classList.remove('active');
        });
    }

    /**
     * Show loading overlay
     * @param {string} message - Loading message
     */
    showLoadingOverlay(message = 'Loading...') {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.querySelector('p').textContent = message;
            overlay.classList.remove('hidden');
        }
    }

    /**
     * Hide loading overlay
     */
    hideLoadingOverlay() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }

    /**
     * Show notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, info)
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            color: white;
            font-weight: 500;
            z-index: 1100;
            max-width: 400px;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;

        // Set background color based on type
        switch (type) {
            case 'success':
                notification.style.backgroundColor = '#10b981';
                break;
            case 'error':
                notification.style.backgroundColor = '#ef4444';
                break;
            default:
                notification.style.backgroundColor = '#3b82f6';
        }

        notification.textContent = message;
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after delay
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    /**
     * Hide all sections
     */
    hideAllSections() {
        const sections = ['upload-section', 'pdf-management', 'pdf-editor'];
        sections.forEach(id => this.hideElement(id));
    }

    /**
     * Show element
     * @param {string} id - Element ID
     */
    showElement(id) {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = 'block';
        }
    }

    /**
     * Hide element
     * @param {string} id - Element ID
     */
    hideElement(id) {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = 'none';
        }
    }
}

// Export for use in other modules
window.UIManager = UIManager; 