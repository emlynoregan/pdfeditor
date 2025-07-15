/**
 * Main application initialization and coordination
 * PDF Editor - Client-side PDF form filling application
 */

// Global variables
let uiManager = null;
let storageManager = null;
let pdfHandler = null;

/**
 * Initialize the application
 */
async function initializeApp() {
    try {
        console.log('🚀 Initializing PDF Editor...');
        
        // Show initialization loading
        showInitializationLoading();
        
        // Check for required dependencies
        if (!checkDependencies()) {
            hideInitializationLoading();
            showError('Required dependencies not loaded. Please refresh the page.');
            return;
        }

        // Initialize storage manager and wait for IndexedDB to be ready
        console.log('📦 Initializing storage...');
        storageManager = new StorageManager();
        await storageManager.initDB(); // Wait for IndexedDB initialization
        console.log('✅ Storage initialized');
        
        // Initialize UI manager
        uiManager = new UIManager();
        
        // Make uiManager globally accessible for onclick handlers
        window.uiManager = uiManager;

        // Check initial state
        await checkInitialState();

        // Setup keyboard shortcuts
        setupKeyboardShortcuts();

        // Setup panel toggle
        setupPanelToggle();

        // Setup service worker
        setupServiceWorker();

        console.log('✅ PDF Editor initialized successfully');
        
        // Hide initialization loading
        hideInitializationLoading();
        
        // Show welcome message if first time
        if (isFirstTime()) {
            showWelcomeMessage();
        }

    } catch (error) {
        console.error('❌ Error initializing PDF Editor:', error);
        hideInitializationLoading();
        showError('Failed to initialize application: ' + error.message);
    }
}

/**
 * Check if required dependencies are loaded
 * @returns {boolean} Whether dependencies are available
 */
function checkDependencies() {
    const required = [
        'pdfjsLib',
        'PDFLib',
        'StorageManager',
        'UIManager',
        'PDFHandler'
    ];

    const missing = required.filter(dep => !window[dep]);
    
    if (missing.length > 0) {
        console.error('Missing dependencies:', missing);
        return false;
    }

    return true;
}

/**
 * Check initial application state
 */
async function checkInitialState() {
    try {
        // Check storage info
        const storageInfo = await storageManager.getStorageInfo();
        console.log('📊 Storage info:', storageInfo);

        // Show appropriate initial view
        if (storageInfo.totalFiles > 0) {
            uiManager.showPDFManagement();
        } else {
            uiManager.showUploadSection();
        }

        // Check storage usage warning (removed since we don't have usagePercentage anymore)
        /*if (storageInfo.usagePercentage > 80) {
            uiManager.showNotification(
                `Storage is ${Math.round(storageInfo.usagePercentage)}% full. Consider deleting some files.`,
                'warning'
            );
        }*/

    } catch (error) {
        console.error('Error checking initial state:', error);
        uiManager.showUploadSection();
    }
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
        // Only handle shortcuts when no input is focused
        if (document.activeElement.tagName === 'INPUT' || 
            document.activeElement.tagName === 'TEXTAREA' ||
            document.activeElement.tagName === 'SELECT') {
            return;
        }

        switch (event.key) {
            case 'Escape':
                // First check if panel is visible and close it
                const formPanel = document.getElementById('form-panel');
                if (formPanel && formPanel.classList.contains('visible')) {
                    const toggleButton = document.getElementById('toggle-panel-btn');
                    const panelOverlay = document.getElementById('panel-overlay');
                    
                    formPanel.classList.remove('visible');
                    panelOverlay.classList.remove('visible');
                    toggleButton.classList.remove('active');
                    event.preventDefault();
                } else if (uiManager.currentView === 'editor') {
                    // Only handle back navigation if panel is not visible
                    uiManager.showPDFManagement();
                    event.preventDefault();
                }
                break;
                
            case 'ArrowLeft':
                if (uiManager.currentView === 'editor' && window.pdfHandler) {
                    window.pdfHandler.previousPage();
                    uiManager.updatePageDisplay();
                    event.preventDefault();
                }
                break;
                
            case 'ArrowRight':
                if (uiManager.currentView === 'editor' && window.pdfHandler) {
                    window.pdfHandler.nextPage();
                    uiManager.updatePageDisplay();
                    event.preventDefault();
                }
                break;
                
            case '+':
            case '=':
                if (uiManager.currentView === 'editor' && window.pdfHandler) {
                    window.pdfHandler.setZoom(window.pdfHandler.scale + 0.25);
                    uiManager.updateZoomDisplay();
                    event.preventDefault();
                }
                break;
                
            case '-':
                if (uiManager.currentView === 'editor' && window.pdfHandler) {
                    window.pdfHandler.setZoom(window.pdfHandler.scale - 0.25);
                    uiManager.updateZoomDisplay();
                    event.preventDefault();
                }
                break;
                
            case 'd':
                if (event.ctrlKey && uiManager.currentView === 'editor') {
                    uiManager.handleDownload();
                    event.preventDefault();
                }
                break;
        }
    });
}

/**
 * Setup panel toggle
 */
function setupPanelToggle() {
    const toggleButton = document.getElementById('toggle-panel-btn');
    const panelOverlay = document.getElementById('panel-overlay');
    
    if (toggleButton) {
        toggleButton.addEventListener('click', () => {
            const formPanel = document.getElementById('form-panel');
            const isVisible = formPanel.classList.contains('visible');
            
            if (isVisible) {
                // Hide panel
                formPanel.classList.remove('visible');
                panelOverlay.classList.remove('visible');
                toggleButton.classList.remove('active');
            } else {
                // Show panel
                formPanel.classList.add('visible');
                panelOverlay.classList.add('visible');
                toggleButton.classList.add('active');
            }
        });
    }
    
    // Close panel when clicking on overlay
    if (panelOverlay) {
        panelOverlay.addEventListener('click', () => {
            const formPanel = document.getElementById('form-panel');
            const toggleButton = document.getElementById('toggle-panel-btn');
            
            formPanel.classList.remove('visible');
            panelOverlay.classList.remove('visible');
            toggleButton.classList.remove('active');
        });
    }
}

/**
 * Setup service worker for PWA functionality
 */
function setupServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', async () => {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('✅ Service Worker registered:', registration);
            } catch (error) {
                console.log('❌ Service Worker registration failed:', error);
            }
        });
    }
}

/**
 * Check if this is the first time using the app
 * @returns {boolean} Whether it's first time
 */
function isFirstTime() {
    const hasVisited = localStorage.getItem('pdfeditor_hasVisited');
    if (!hasVisited) {
        localStorage.setItem('pdfeditor_hasVisited', 'true');
        return true;
    }
    return false;
}

/**
 * Show welcome message for first-time users
 */
function showWelcomeMessage() {
    setTimeout(() => {
        uiManager.showNotification(
            'Welcome to PDF Editor! Upload a PDF to get started.',
            'info'
        );
    }, 1000);
}

/**
 * Show error message
 * @param {string} message - Error message
 */
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #ef4444;
        color: white;
        padding: 2rem;
        border-radius: 0.5rem;
        z-index: 1000;
        max-width: 400px;
        text-align: center;
    `;
    errorDiv.innerHTML = `
        <h3>Error</h3>
        <p>${message}</p>
        <button onclick="location.reload()" style="background: white; color: #ef4444; border: none; padding: 0.5rem 1rem; border-radius: 0.25rem; margin-top: 1rem; cursor: pointer;">
            Reload Page
        </button>
    `;
    document.body.appendChild(errorDiv);
}

/**
 * Handle global errors
 */
function setupErrorHandling() {
    window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
        if (uiManager) {
            uiManager.showNotification(
                'An unexpected error occurred. Please try again.',
                'error'
            );
        }
    });

    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        if (uiManager) {
            uiManager.showNotification(
                'An unexpected error occurred. Please try again.',
                'error'
            );
        }
    });
}

/**
 * Performance monitoring
 */
function setupPerformanceMonitoring() {
    if ('performance' in window) {
        window.addEventListener('load', () => {
            const loadTime = performance.now();
            console.log(`📊 App loaded in ${Math.round(loadTime)}ms`);
        });
    }
}

/**
 * Setup drag and drop functionality
 */
function setupDragAndDrop() {
    const uploadSection = document.getElementById('upload-section');
    const uploadArea = uploadSection?.querySelector('.upload-area');
    
    if (!uploadArea) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, unhighlight, false);
    });

    uploadArea.addEventListener('drop', handleDrop, false);

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight(e) {
        uploadArea.classList.add('drag-over');
    }

    function unhighlight(e) {
        uploadArea.classList.remove('drag-over');
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        const fileInput = document.getElementById('pdf-file-input');
        if (fileInput && files.length > 0) {
            fileInput.files = files;
            fileInput.dispatchEvent(new Event('change'));
        }
    }
}

/**
 * Add drag and drop styles
 */
function addDragDropStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .upload-area.drag-over {
            border-color: #3b82f6 !important;
            background: #eff6ff !important;
            transform: scale(1.02);
        }
    `;
    document.head.appendChild(style);
}

/**
 * Show initialization loading overlay
 */
function showInitializationLoading() {
    const overlay = document.getElementById('loading-overlay');
    const text = overlay.querySelector('p');
    if (overlay) {
        if (text) text.textContent = 'Initializing PDF Editor...';
        overlay.classList.remove('hidden');
    }
}

/**
 * Hide initialization loading overlay
 */
function hideInitializationLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setupErrorHandling();
    setupPerformanceMonitoring();
    addDragDropStyles();
    setupDragAndDrop();
    initializeApp();
});

// Export for potential external use
window.PDFEditor = {
    uiManager: () => uiManager,
    storageManager: () => storageManager,
    pdfHandler: () => pdfHandler,
    reinitialize: initializeApp
}; 