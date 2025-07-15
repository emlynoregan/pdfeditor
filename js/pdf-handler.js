/**
 * PDF Handler for PDF Editor
 * Handles PDF rendering, form field extraction, and PDF modification
 */
class PDFHandler {
    constructor() {
        this.currentPDF = null;
        this.currentPage = 1;
        this.totalPages = 0;
        this.scale = 1.0;
        this.canvas = null;
        this.context = null;
        this.formFields = [];
        this.pdfDocument = null;
        this.pdfBytes = null;
        
        // Initialize PDF.js
        this.initializePDFJS();
        
        // Add resize listener to update overlay positioning
        window.addEventListener('resize', () => {
            if (this.canvas) {
                // Small delay to ensure layout is updated
                setTimeout(() => this.updateFormFieldOverlays(), 100);
            }
        });
    }

    /**
     * Initialize PDF.js worker
     */
    initializePDFJS() {
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
    }

    /**
     * Load PDF from file
     * @param {File} file - PDF file
     * @returns {Promise<Object>} PDF data
     */
    async loadPDFFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    const pdfData = await this.loadPDFFromArrayBuffer(arrayBuffer);
                    resolve(pdfData);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Load PDF from ArrayBuffer
     * @param {ArrayBuffer} arrayBuffer - PDF data
     * @returns {Promise<Object>} PDF data
     */
    async loadPDFFromArrayBuffer(arrayBuffer) {
        try {
            // Create a copy of the ArrayBuffer as Uint8Array to avoid detachment issues
            const uint8Array = new Uint8Array(arrayBuffer);
            this.pdfBytes = new Uint8Array(uint8Array); // Store a copy to avoid detachment
            
            // Load with PDF.js for rendering
            this.pdfDocument = await pdfjsLib.getDocument({
                data: uint8Array,
                cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
                cMapPacked: true
            }).promise;

            this.totalPages = this.pdfDocument.numPages;
            this.currentPage = 1;

            // Extract form fields
            await this.extractFormFields();

            return {
                totalPages: this.totalPages,
                formFields: this.formFields
            };
        } catch (error) {
            console.error('Error loading PDF:', error);
            throw new Error('Failed to load PDF: ' + error.message);
        }
    }

    /**
     * Load PDF from base64 string
     * @param {string} base64Data - Base64 encoded PDF
     * @returns {Promise<Object>} PDF data
     */
    async loadPDFFromBase64(base64Data) {
        try {
            // Convert base64 to ArrayBuffer
            const binaryString = atob(base64Data);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Use the ArrayBuffer conversion method
            return await this.loadPDFFromArrayBuffer(bytes.buffer);
        } catch (error) {
            console.error('Error loading PDF from base64:', error);
            throw new Error('Failed to load PDF from base64: ' + error.message);
        }
    }

    /**
     * Extract form fields from PDF
     * @returns {Promise<Array>} Array of form fields
     */
    async extractFormFields() {
        try {
            this.formFields = [];
            const radioGroups = new Map(); // Track radio button groups
            
            // Get form fields from all pages
            for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
                const page = await this.pdfDocument.getPage(pageNum);
                const annotations = await page.getAnnotations();
                
                annotations.forEach(annotation => {
                    if (annotation.subtype === 'Widget') {
                        const field = this.processFormField(annotation, pageNum);
                        if (field) {
                            // Handle radio button grouping
                            if (field.type === 'radio') {
                                const groupName = field.radioGroup || field.name;
                                if (!radioGroups.has(groupName)) {
                                    radioGroups.set(groupName, {
                                        name: groupName,
                                        type: 'radio',
                                        page: field.page,
                                        options: [],
                                        value: '',
                                        id: field.id
                                    });
                                }
                                
                                // Add radio option to group
                                const group = radioGroups.get(groupName);
                                if (field.radioOptions && field.radioOptions.length > 0) {
                                    field.radioOptions.forEach(option => {
                                        if (!group.options.includes(option)) {
                                            group.options.push(option);
                                        }
                                    });
                                }
                                
                                // Don't add individual radio buttons to formFields
                                return;
                            }
                            
                            this.formFields.push(field);
                        }
                    }
                });
            }
            
            // Add grouped radio buttons to formFields
            radioGroups.forEach(group => {
                this.formFields.push(group);
            });

            return this.formFields;
        } catch (error) {
            console.error('Error extracting form fields:', error);
            return [];
        }
    }

    /**
     * Process individual form field
     * @param {Object} annotation - PDF annotation
     * @param {number} pageNum - Page number
     * @returns {Object|null} Processed form field
     */
    processFormField(annotation, pageNum) {
        try {
            const rect = annotation.rect;
            const fieldType = this.getFieldType(annotation);
            
            if (!fieldType) return null;

            // Process options for dropdown fields
            let options = [];
            if (annotation.options && Array.isArray(annotation.options)) {
                options = annotation.options.map(option => {
                    if (typeof option === 'string') {
                        return option;
                    } else if (option && typeof option === 'object') {
                        // Handle option objects with displayValue and exportValue
                        return option.displayValue || option.exportValue || option.value || String(option);
                    }
                    return String(option);
                });
            }

            // For radio buttons, try to get the group name and options
            let radioGroup = null;
            let radioOptions = [];
            if (fieldType === 'radio') {
                radioGroup = annotation.fieldName || annotation.alternativeText || `radio_group_${this.formFields.length}`;
                // For radio buttons, options might be in buttonValue or similar
                if (annotation.buttonValue) {
                    radioOptions = [annotation.buttonValue];
                } else if (annotation.exportValue) {
                    radioOptions = [annotation.exportValue];
                }
            }

            return {
                id: annotation.id || `field_${Date.now()}_${Math.random().toString(36).substr(2)}`,
                name: annotation.fieldName || `field_${this.formFields.length + 1}`,
                type: fieldType,
                page: pageNum,
                rect: rect,
                value: annotation.fieldValue || '',
                options: options,
                radioGroup: radioGroup,
                radioOptions: radioOptions,
                required: annotation.required || false,
                readonly: annotation.readonly || false,
                multiline: annotation.multiline || false,
                maxLength: annotation.maxLength || null
            };
        } catch (error) {
            console.error('Error processing form field:', error);
            return null;
        }
    }

    /**
     * Determine field type from annotation
     * @param {Object} annotation - PDF annotation
     * @returns {string|null} Field type
     */
    getFieldType(annotation) {
        const fieldType = annotation.fieldType;
        
        switch (fieldType) {
            case 'Tx':
                return 'text';
            case 'Ch':
                return annotation.options && annotation.options.length > 0 ? 'select' : 'text';
            case 'Btn':
                return annotation.checkBox ? 'checkbox' : 'radio';
            case 'Sig':
                return 'signature';
            default:
                return 'text';
        }
    }

    /**
     * Render PDF page to canvas
     * @param {number} pageNum - Page number to render
     * @returns {Promise<void>}
     */
    async renderPage(pageNum = this.currentPage) {
        try {
            if (!this.pdfDocument) {
                throw new Error('No PDF loaded');
            }

            const page = await this.pdfDocument.getPage(pageNum);
            const viewport = page.getViewport({ scale: this.scale });

            // Get canvas element
            this.canvas = document.getElementById('pdf-canvas');
            if (!this.canvas) {
                throw new Error('Canvas element not found');
            }

            this.context = this.canvas.getContext('2d');
            this.canvas.width = viewport.width;
            this.canvas.height = viewport.height;

            // Render page
            const renderContext = {
                canvasContext: this.context,
                viewport: viewport
            };

            await page.render(renderContext).promise;
            this.currentPage = pageNum;

            // Update form field overlays
            this.updateFormFieldOverlays();

        } catch (error) {
            console.error('Error rendering page:', error);
            throw new Error('Failed to render page: ' + error.message);
        }
    }

    /**
     * Update form field overlays on canvas
     */
    updateFormFieldOverlays() {
        const overlay = document.getElementById('form-overlay');
        if (!overlay || !this.canvas) return;

        // Clear existing overlays
        overlay.innerHTML = '';

        // Position overlay to match canvas
        const canvasRect = this.canvas.getBoundingClientRect();
        const viewerRect = this.canvas.parentElement.getBoundingClientRect();
        
        overlay.style.left = `${canvasRect.left - viewerRect.left}px`;
        overlay.style.top = `${canvasRect.top - viewerRect.top}px`;
        overlay.style.width = `${this.canvas.width}px`;
        overlay.style.height = `${this.canvas.height}px`;

        // Get current page form fields
        const pageFields = this.formFields.filter(field => field.page === this.currentPage);
        
        pageFields.forEach(field => {
            const fieldElement = this.createFormFieldOverlay(field);
            overlay.appendChild(fieldElement);
        });
    }

    /**
     * Create form field overlay element
     * @param {Object} field - Form field data
     * @returns {HTMLElement} Form field overlay element
     */
    createFormFieldOverlay(field) {
        const div = document.createElement('div');
        div.className = 'form-field-overlay';
        
        // Calculate position accounting for PDF coordinate system (bottom-left origin)
        const fieldHeight = (field.rect[3] - field.rect[1]) * this.scale;
        const fieldWidth = (field.rect[2] - field.rect[0]) * this.scale;
        
        div.style.left = `${field.rect[0] * this.scale}px`;
        div.style.top = `${this.canvas.height - (field.rect[3] * this.scale)}px`;
        div.style.width = `${fieldWidth}px`;
        div.style.height = `${fieldHeight}px`;

        const input = this.createFormInput(field);
        div.appendChild(input);

        return div;
    }

    /**
     * Create form input element
     * @param {Object} field - Form field data
     * @returns {HTMLElement} Form input element
     */
    createFormInput(field) {
        let input;

        switch (field.type) {
            case 'text':
                input = document.createElement(field.multiline ? 'textarea' : 'input');
                input.type = field.multiline ? undefined : 'text';
                input.value = field.value || '';
                if (field.maxLength) input.maxLength = field.maxLength;
                break;
            
            case 'checkbox':
                input = document.createElement('input');
                input.type = 'checkbox';
                input.checked = field.value === 'Yes' || field.value === true;
                input.className += ' checkbox';
                break;
            
            case 'radio':
                input = document.createElement('input');
                input.type = 'radio';
                input.name = field.name;
                input.value = field.value || '';
                break;
            
            case 'select':
                input = document.createElement('select');
                field.options.forEach(option => {
                    const optionElement = document.createElement('option');
                    optionElement.value = option;
                    optionElement.textContent = option;
                    if (option === field.value) optionElement.selected = true;
                    input.appendChild(optionElement);
                });
                break;
            
            default:
                input = document.createElement('input');
                input.type = 'text';
                input.value = field.value || '';
        }

        input.className = 'form-field-input';
        input.disabled = field.readonly;
        input.required = field.required;
        input.dataset.fieldId = field.id;

        // Add event listeners
        input.addEventListener('input', (e) => {
            this.updateFieldValue(field.id, e.target.value);
        });

        input.addEventListener('change', (e) => {
            this.updateFieldValue(field.id, e.target.value);
        });

        return input;
    }

    /**
     * Update form field value
     * @param {string} fieldId - Field ID
     * @param {string} value - New value
     */
    updateFieldValue(fieldId, value) {
        const field = this.formFields.find(f => f.id === fieldId);
        if (field) {
            field.value = value;
            // Trigger custom event for UI updates
            window.dispatchEvent(new CustomEvent('fieldValueChanged', {
                detail: { fieldId, value, field }
            }));
        }
    }

    /**
     * Get form field values
     * @returns {Object} Field values by ID
     */
    getFormFieldValues() {
        const values = {};
        this.formFields.forEach(field => {
            values[field.id] = field.value;
        });
        return values;
    }

    /**
     * Set form field values
     * @param {Object} values - Field values by ID
     */
    setFormFieldValues(values) {
        Object.keys(values).forEach(fieldId => {
            const field = this.formFields.find(f => f.id === fieldId);
            if (field) {
                field.value = values[fieldId];
            }
        });
        
        // Update UI
        this.updateFormFieldOverlays();
    }

    /**
     * Generate filled PDF
     * @returns {Promise<Uint8Array>} Filled PDF bytes
     */
    async generateFilledPDF() {
        try {
            // Load PDF with PDF-lib for modification
            // pdfBytes is now a Uint8Array, which PDFLib can handle directly
            const pdfDoc = await PDFLib.PDFDocument.load(this.pdfBytes);
            const form = pdfDoc.getForm();
            const fields = form.getFields();

            // Fill form fields
            this.formFields.forEach(field => {
                if (field.value) {
                    try {
                        const pdfField = fields.find(f => f.getName() === field.name);
                        
                        if (pdfField) {
                            const fieldType = pdfField.constructor.name;
                            
                            // Check the actual constructor name for proper type detection
                            if (fieldType.includes('TextField') || fieldType.includes('Text')) {
                                pdfField.setText(field.value);
                            } else if (fieldType.includes('CheckBox') || fieldType.includes('Button')) {
                                if (field.value === 'Yes' || field.value === true) {
                                    pdfField.check();
                                } else {
                                    pdfField.uncheck();
                                }
                            } else if (fieldType.includes('RadioGroup') || fieldType.includes('Radio')) {
                                pdfField.select(field.value);
                            } else if (fieldType.includes('Dropdown') || fieldType.includes('Choice')) {
                                pdfField.select(field.value);
                            } else {
                                // Try to determine field type by available methods
                                if (typeof pdfField.setText === 'function') {
                                    pdfField.setText(field.value);
                                } else if (typeof pdfField.select === 'function') {
                                    pdfField.select(field.value);
                                } else if (typeof pdfField.check === 'function') {
                                    if (field.value === 'Yes' || field.value === true) {
                                        pdfField.check();
                                    } else {
                                        pdfField.uncheck();
                                    }
                                }
                            }
                        }
                    } catch (error) {
                        console.warn('Error filling field:', field.name, error);
                    }
                }
            });

            // Generate PDF bytes
            const pdfBytes = await pdfDoc.save();
            return pdfBytes;
        } catch (error) {
            console.error('Error generating filled PDF:', error);
            throw new Error('Failed to generate filled PDF: ' + error.message);
        }
    }

    /**
     * Set zoom level
     * @param {number} scale - Zoom scale
     */
    setZoom(scale) {
        this.scale = Math.max(0.5, Math.min(3.0, scale));
        this.renderPage(this.currentPage);
    }

    /**
     * Go to next page
     */
    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.renderPage(this.currentPage + 1);
        }
    }

    /**
     * Go to previous page
     */
    previousPage() {
        if (this.currentPage > 1) {
            this.renderPage(this.currentPage - 1);
        }
    }

    /**
     * Go to specific page
     * @param {number} pageNum - Page number
     */
    goToPage(pageNum) {
        if (pageNum >= 1 && pageNum <= this.totalPages) {
            this.renderPage(pageNum);
        }
    }

    /**
     * Get current page info
     * @returns {Object} Page info
     */
    getPageInfo() {
        return {
            currentPage: this.currentPage,
            totalPages: this.totalPages,
            scale: this.scale
        };
    }
}

// Export for use in other modules
window.PDFHandler = PDFHandler; 