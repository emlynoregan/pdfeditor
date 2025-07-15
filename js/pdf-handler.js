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
            const radioGroups = new Map();
            const individualRadioButtons = []; // Keep track of individual radio button widgets
            
            // Extract form fields from all pages
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
                                let group;
                                
                                if (!radioGroups.has(groupName)) {
                                    // Create new group with unique ID based on group name
                                    const groupId = `radio_group_${groupName}_${radioGroups.size}`;
                                    group = {
                                        name: groupName,
                                        displayName: field.displayName || field.name,
                                        type: 'radio',
                                        page: field.page,
                                        rect: field.rect, // Include rect from first radio button
                                        options: [],
                                        value: '',
                                        id: groupId,
                                        tooltip: field.tooltip,
                                        mappingName: field.mappingName,
                                        fullyQualifiedName: field.fullyQualifiedName
                                    };
                                    radioGroups.set(groupName, group);
                                } else {
                                    group = radioGroups.get(groupName);
                                }
                                
                                // Update group display name if current field has a better one
                                if (field.displayName && field.displayName !== field.name && 
                                    group.displayName === group.name) {
                                    group.displayName = field.displayName;
                                }
                                
                                if (field.radioOptions && field.radioOptions.length > 0) {
                                    field.radioOptions.forEach(option => {
                                        if (!group.options.includes(option)) {
                                            group.options.push(option);
                                        }
                                    });
                                }
                                
                                // Keep individual radio button for overlay positioning
                                const individualRadio = {
                                    ...field,
                                    id: `${field.id}_individual_${individualRadioButtons.length}`,
                                    groupId: group.id, // Use the group's ID, not the individual field's ID
                                    groupName: groupName,
                                    isIndividualRadio: true,
                                    originalFieldName: field.name // Store original field name for PDF matching
                                };
                                individualRadioButtons.push(individualRadio);
                                
                                // Also store original field names in the group for PDF matching
                                if (!group.originalFieldNames) {
                                    group.originalFieldNames = [];
                                }
                                if (!group.originalFieldNames.includes(field.name)) {
                                    group.originalFieldNames.push(field.name);
                                }
                                
                                // Don't add individual radio buttons to main formFields
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

            // Store individual radio buttons for overlay system
            this.individualRadioButtons = individualRadioButtons;

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
                // For radio buttons, options might be in buttonValue or similar
                if (annotation.buttonValue) {
                    radioOptions = [annotation.buttonValue];
                } else if (annotation.exportValue) {
                    radioOptions = [annotation.exportValue];
                }
            }

            // Extract more descriptive information
            const fieldName = annotation.fieldName || `field_${this.formFields.length + 1}`;
            const alternativeText = annotation.alternativeText || annotation.tooltip || 
                                    (annotation.contentsObj && annotation.contentsObj.str) || '';
            const mappingName = annotation.mappingName || annotation.exportName || '';
            const fullyQualifiedName = annotation.fullyQualifiedName || '';
            
            // Choose the most descriptive display name
            let displayName = fieldName;
            if (alternativeText && alternativeText.trim()) {
                displayName = alternativeText.trim();
            } else if (mappingName && mappingName.trim() && mappingName !== fieldName) {
                displayName = mappingName.trim();
            } else if (fullyQualifiedName && fullyQualifiedName.includes('.')) {
                // For hierarchical names like "form.section.fieldname", use the last part
                const parts = fullyQualifiedName.split('.');
                const lastPart = parts[parts.length - 1];
                if (lastPart && lastPart !== fieldName) {
                    displayName = lastPart;
                }
            }
            
            // Improve field name formatting for better readability
            if (displayName && displayName === fieldName) {
                // Handle common generic patterns
                if (displayName.match(/^Text\d+$/)) {
                    // Convert "Text3" to "Text Field 3"
                    displayName = displayName.replace(/^Text(\d+)$/, 'Text Field $1');
                } else if (displayName.match(/^Dropdown\d+$/)) {
                    // Convert "Dropdown1" to "Dropdown Field 1"
                    displayName = displayName.replace(/^Dropdown(\d+)$/, 'Dropdown Field $1');
                } else if (displayName.match(/^Group\d+[a-z]?$/)) {
                    // Convert "Group2" to "Group 2", "Group2a" to "Group 2a"
                    displayName = displayName.replace(/^Group(\d+)([a-z]?)$/, 'Group $1$2');
                } else {
                    // Convert common patterns to more readable names
                    displayName = displayName
                        .replace(/([A-Z])/g, ' $1') // Add space before capital letters
                        .replace(/[_-]/g, ' ') // Replace underscores and hyphens with spaces
                        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
                        .trim()
                        .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize first letter of each word
                }
            }
            
            // Set radio group name after displayName is calculated
            if (fieldType === 'radio') {
                radioGroup = displayName || fieldName || `radio_group_${this.formFields.length}`;
            }
            
            // Add context-based improvements
            let fieldContext = '';
            if (annotation.actions) {
                fieldContext = ' (Button)';
            } else if (annotation.isTooltipOnly) {
                fieldContext = ' (Tooltip)';
            } else if (fieldType === 'radio' && annotation.buttonValue) {
                fieldContext = ` (Option: ${annotation.buttonValue})`;
            }
            
            // Add context to display name if helpful
            if (fieldContext && !displayName.includes('Button') && !displayName.includes('Option')) {
                displayName = displayName + fieldContext;
            }
            
            // Add some smart context based on field position and type
            if (fieldType === 'text' && displayName.match(/^Text Field \d+$/)) {
                // Try to infer context from field position
                const x = rect[0];
                const y = rect[1];
                const width = rect[2] - rect[0];
                const height = rect[3] - rect[1];
                
                // Small text fields might be for codes, IDs, etc.
                if (width < 100) {
                    displayName = displayName.replace('Text Field', 'Code Field');
                } else if (width > 300) {
                    displayName = displayName.replace('Text Field', 'Long Text Field');
                } else if (height > 50) {
                    displayName = displayName.replace('Text Field', 'Multi-line Text Field');
                }
            }
            
            // Debug logging (disabled for production)
            // console.log(`🔍 "${fieldName}" → "${displayName}" (${fieldType})`);
            
            // Log only interesting properties
            // const interestingProps = [];
            // if (alternativeText) interestingProps.push(`alt: "${alternativeText}"`);
            // if (annotation.actions) interestingProps.push(`actions: ${Object.keys(annotation.actions)}`);
            // if (annotation.defaultFieldValue) interestingProps.push(`default: "${annotation.defaultFieldValue}"`);
            // if (annotation.options && annotation.options.length > 0) interestingProps.push(`options: [${annotation.options.join(', ')}]`);
            // if (annotation.buttonValue) interestingProps.push(`buttonValue: "${annotation.buttonValue}"`);
            // if (annotation.contentsObj && annotation.contentsObj.str) interestingProps.push(`contents: "${annotation.contentsObj.str}"`);
            
            // if (interestingProps.length > 0) {
            //     console.log(`   ${interestingProps.join(' • ')}`);
            // }
            // console.log(`   Position: [${Math.round(rect[0])}, ${Math.round(rect[1])}, ${Math.round(rect[2])}, ${Math.round(rect[3])}]`);
            // console.log(`   ─────────────────────────────────────────────────────────────────`);

            return {
                id: annotation.id || `field_${Date.now()}_${Math.random().toString(36).substr(2)}`,
                name: fieldName,
                displayName: displayName,
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
                maxLength: annotation.maxLength || null,
                tooltip: alternativeText,
                mappingName: mappingName,
                fullyQualifiedName: fullyQualifiedName
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
     * Render PDF page
     * @param {number} pageNum - Page number to render
     * @returns {Promise<void>}
     */
    async renderPage(pageNum = this.currentPage) {
        try {
            if (!this.pdfDocument) {
                throw new Error('No PDF loaded');
            }

            if (pageNum < 1 || pageNum > this.totalPages) {
                throw new Error(`Invalid page number: ${pageNum}. Must be between 1 and ${this.totalPages}`);
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
     * Update form field overlays on PDF
     */
    updateFormFieldOverlays() {
        const overlay = document.getElementById('form-overlay');
        if (!overlay || !this.canvas) return;

        // Clear existing overlays
        overlay.innerHTML = '';

        // Position overlay to match canvas exactly
        const canvasRect = this.canvas.getBoundingClientRect();
        const viewerRect = this.canvas.parentElement.getBoundingClientRect();
        
        overlay.style.left = `${canvasRect.left - viewerRect.left}px`;
        overlay.style.top = `${canvasRect.top - viewerRect.top}px`;
        overlay.style.width = `${this.canvas.width}px`;
        overlay.style.height = `${this.canvas.height}px`;
        
        // Debug overlay positioning
        console.log('Canvas rect:', canvasRect);
        console.log('Viewer rect:', viewerRect);
        console.log('Overlay position:', {
            left: `${canvasRect.left - viewerRect.left}px`,
            top: `${canvasRect.top - viewerRect.top}px`,
            width: `${this.canvas.width}px`,
            height: `${this.canvas.height}px`
        });

        // Get current page form fields (including individual radio buttons)
        const pageFields = this.formFields.filter(field => 
            field.page === this.currentPage && field.type !== 'radio'
        );
        
        // Add individual radio buttons for current page
        const radioButtons = (this.individualRadioButtons || []).filter(field => 
            field.page === this.currentPage
        );
        
        const allFields = [...pageFields, ...radioButtons];
        
        console.log(`Creating overlays for ${allFields.length} fields on page ${this.currentPage} (${pageFields.length} regular fields, ${radioButtons.length} radio buttons)`);
        
        allFields.forEach(field => {
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
        
        // Check if field has valid rect data
        if (!field.rect || !Array.isArray(field.rect) || field.rect.length < 4) {
            console.warn('Invalid field rect data:', field);
            // Set default position if rect is invalid
            div.style.left = '0px';
            div.style.top = '0px';
            div.style.width = '100px';
            div.style.height = '20px';
        } else {
            // Calculate position accounting for PDF coordinate system
            const fieldHeight = (field.rect[3] - field.rect[1]) * this.scale;
            const fieldWidth = (field.rect[2] - field.rect[0]) * this.scale;
            
            // PDF coordinate system is bottom-left origin, HTML is top-left
            // Need to flip Y coordinate
            const x = field.rect[0] * this.scale;
            const y = this.canvas.height - (field.rect[3] * this.scale);
            
            div.style.left = `${x}px`;
            div.style.top = `${y}px`;
            div.style.width = `${fieldWidth}px`;
            div.style.height = `${fieldHeight}px`;
            
            // Debug positioning
            console.log(`Field ${field.name}: rect=[${field.rect.join(', ')}], canvas height=${this.canvas.height}, pos=(${x}, ${y}), size=(${fieldWidth}, ${fieldHeight})`);
        }

        const input = this.createFormInput(field);
        div.appendChild(input);

        // Add type-specific classes
        if (field.type === 'radio' || field.isIndividualRadio) {
            div.classList.add('radio-field');
        }

        // Add filled class if field has a value
        if (field.isIndividualRadio) {
            // For individual radio buttons, check if this option is selected
            const groupField = this.formFields.find(f => f.id === field.groupId);
            const isSelected = groupField && groupField.value === (field.radioOptions && field.radioOptions.length > 0 ? field.radioOptions[0] : field.name);
            if (isSelected) {
                div.classList.add('filled');
            } else {
                div.classList.remove('filled');
            }
        } else if (field.value && field.value.toString().trim() !== '') {
            div.classList.add('filled');
        } else {
            div.classList.remove('filled');
        }

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
                
                if (field.isIndividualRadio) {
                    // For individual radio buttons in overlays
                    input.name = field.groupName;
                    input.value = field.radioOptions && field.radioOptions.length > 0 ? field.radioOptions[0] : field.name;
                    
                    // Check if this radio button should be selected
                    const groupField = this.formFields.find(f => f.id === field.groupId);
                    if (groupField && groupField.value === input.value) {
                        input.checked = true;
                    }
                } else {
                    // For grouped radio buttons (sidebar)
                    input.name = field.name;
                    input.value = field.value || '';
                }
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
        if (field.isIndividualRadio) {
            // Special handling for individual radio buttons
            input.addEventListener('click', (e) => {
                const groupField = this.formFields.find(f => f.id === field.groupId);
                
                if (groupField) {
                    // Check if this radio button was already selected BEFORE the click
                    const wasSelected = groupField.value === e.target.value;
                    
                    if (wasSelected) {
                        // Prevent default radio button behavior
                        e.preventDefault();
                        
                        // Clear the entire radio group
                        e.target.checked = false;
                        groupField.value = '';
                        this.updateFieldValue(field.groupId, '');
                        
                        // Clear all overlay radio buttons in this group
                        const overlayRadios = document.querySelectorAll(`input[name="${field.groupName}"]`);
                        overlayRadios.forEach(radio => {
                            radio.checked = false;
                        });
                        
                        // Clear sidebar radio buttons
                        const sidebarRadios = document.querySelectorAll(`input[name="radio-${field.groupId}"]`);
                        sidebarRadios.forEach(radio => {
                            radio.checked = false;
                        });
                        
                        // Update all individual radio overlays in this group
                        this.updateFormFieldOverlays();
                    } else {
                        // Select this radio button (normal behavior)
                        groupField.value = e.target.value;
                        this.updateFieldValue(field.groupId, e.target.value);
                        
                        // Update all overlay radio buttons in this group
                        const overlayRadios = document.querySelectorAll(`input[name="${field.groupName}"]`);
                        overlayRadios.forEach(radio => {
                            radio.checked = radio.value === e.target.value;
                        });
                        
                        // Update sidebar radio buttons
                        const sidebarRadios = document.querySelectorAll(`input[name="radio-${field.groupId}"]`);
                        sidebarRadios.forEach(radio => {
                            radio.checked = radio.value === e.target.value;
                        });
                        
                        // Update all individual radio overlays in this group
                        this.updateFormFieldOverlays();
                    }
                }
            });
        } else {
            input.addEventListener('input', (e) => {
                this.updateFieldValue(field.id, e.target.value);
            });

            input.addEventListener('change', (e) => {
                this.updateFieldValue(field.id, e.target.value);
            });
        }

        // Add focus and blur events to highlight the field
        input.addEventListener('focus', (e) => {
            const overlay = e.target.closest('.form-field-overlay');
            if (overlay) {
                overlay.classList.add('active');
            }
        });

        input.addEventListener('blur', (e) => {
            const overlay = e.target.closest('.form-field-overlay');
            if (overlay) {
                overlay.classList.remove('active');
            }
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
        
        // Dispatch events for each field to update all UI elements
        Object.keys(values).forEach(fieldId => {
            const field = this.formFields.find(f => f.id === fieldId);
            if (field) {
                window.dispatchEvent(new CustomEvent('fieldValueChanged', {
                    detail: { fieldId, value: values[fieldId], field }
                }));
            }
        });
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

            console.log('Available PDF fields:', fields.map(f => ({ name: f.getName(), type: f.constructor.name })));
            console.log('Form fields to fill:', this.formFields.map(f => ({ name: f.name, type: f.type, value: f.value })));

            // Fill form fields
            this.formFields.forEach(field => {
                // Process radio buttons regardless of value (to handle clearing)
                // Process other fields only if they have a value
                if (field.value || field.type === 'radio') {
                    try {
                        if (field.type === 'radio') {
                            // For radio button groups, we need to find the correct PDF field
                            // Radio buttons in PDFs are usually named after the group, not individual buttons
                            
                            // First, try to find a direct match by field name
                            let pdfField = fields.find(f => f.getName() === field.name);
                            
                            // If not found, try to find radio group by different naming patterns
                            if (!pdfField) {
                                // Try variations of the field name
                                const namesToTry = [
                                    field.name,
                                    field.displayName,
                                    field.fullyQualifiedName,
                                    field.mappingName
                                ].filter(name => name && name.trim());
                                
                                for (const name of namesToTry) {
                                    pdfField = fields.find(f => f.getName() === name);
                                    if (pdfField) break;
                                }
                            }
                            
                            // If still not found, try to find by checking individual radio buttons
                            if (!pdfField && this.individualRadioButtons) {
                                const relatedRadioButtons = this.individualRadioButtons.filter(rb => rb.groupId === field.id);
                                for (const radioButton of relatedRadioButtons) {
                                    pdfField = fields.find(f => f.getName() === radioButton.name || f.getName() === radioButton.originalFieldName);
                                    if (pdfField) break;
                                }
                            }
                            
                            // If still not found, try using original field names stored in the group
                            if (!pdfField && field.originalFieldNames && field.originalFieldNames.length > 0) {
                                for (const originalName of field.originalFieldNames) {
                                    pdfField = fields.find(f => f.getName() === originalName);
                                    if (pdfField) break;
                                }
                            }
                            
                            if (pdfField) {
                                const fieldType = pdfField.constructor.name;
                                console.log(`Filling radio field: ${field.name} (${fieldType}) with value: ${field.value || 'CLEARED'}`);
                                
                                if (fieldType.includes('RadioGroup') || fieldType.includes('Radio')) {
                                    try {
                                        if (field.value) {
                                            // Select the specified value
                                            pdfField.select(field.value);
                                        } else {
                                            // Clear the radio group by not selecting any option
                                            // Some PDF libraries might have a clear method, but select with empty/null often works
                                            try {
                                                pdfField.select('');
                                            } catch (error) {
                                                // If select('') doesn't work, try to clear by selecting nothing
                                                console.log(`Cannot clear radio group ${field.name} with empty string, trying alternative methods`);
                                                // Some PDFs might need specific clearing approach
                                                if (typeof pdfField.clear === 'function') {
                                                    pdfField.clear();
                                                }
                                            }
                                        }
                                    } catch (error) {
                                        console.warn(`Error ${field.value ? 'selecting' : 'clearing'} radio value for field ${field.name}:`, error);
                                        // Try alternative approach - find available options
                                        if (field.value && pdfField.getOptions) {
                                            const options = pdfField.getOptions();
                                            console.log('Available options:', options);
                                            if (options.includes(field.value)) {
                                                pdfField.select(field.value);
                                            }
                                        }
                                    }
                                } else if (typeof pdfField.select === 'function') {
                                    if (field.value) {
                                        pdfField.select(field.value);
                                    } else {
                                        try {
                                            pdfField.select('');
                                        } catch (error) {
                                            console.log(`Cannot clear field ${field.name} with select('')`);
                                        }
                                    }
                                }
                            } else {
                                console.warn(`Could not find PDF field for radio group: ${field.name}`);
                            }
                        } else {
                            // Handle non-radio fields
                            const pdfField = fields.find(f => f.getName() === field.name);
                            
                            if (pdfField) {
                                const fieldType = pdfField.constructor.name;
                                console.log(`Filling field: ${field.name} (${fieldType}) with value: ${field.value}`);
                                
                                // Check the actual constructor name for proper type detection
                                if (fieldType.includes('TextField') || fieldType.includes('Text')) {
                                    pdfField.setText(field.value);
                                } else if (fieldType.includes('CheckBox') || fieldType.includes('Button')) {
                                    if (field.value === 'Yes' || field.value === true) {
                                        pdfField.check();
                                    } else {
                                        pdfField.uncheck();
                                    }
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