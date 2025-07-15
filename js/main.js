/**
 * Main application initialization and coordination
 * PDF Editor - Client-side PDF form filling application
 */

console.log('🚀 Main.js starting...');

// Global variables
let pdfHandler;
let uiManager;
let storageManager;
let isInitialized = false;
let eventListenersAttached = false;

/**
 * Clear potentially corrupted storage data
 */
async function clearCorruptedStorage() {
    try {
        // Clear IndexedDB
        if ('indexedDB' in window) {
            const deleteReq = indexedDB.deleteDatabase('PDFEditorDB');
            await new Promise((resolve) => {
                deleteReq.onsuccess = () => resolve();
                deleteReq.onerror = () => resolve(); // Don't fail if DB doesn't exist
            });
        }
        
        // Clear localStorage
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('pdfeditor_')) {
                localStorage.removeItem(key);
            }
        });
        
        console.log('✨ Storage cleared for fresh start');
    } catch (error) {
        console.log('⚠️ Storage cleanup had minor issues (this is normal):', error.message);
    }
}

/**
 * Initialize the application
 */
async function initializeApp() {
    // Prevent duplicate initialization
    if (isInitialized) {
        console.log('⚠️ App already initialized, skipping...');
        return;
    }

    console.log('🔧 Starting app initialization...');
    
    try {
        // Show loading overlay
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('hidden');
        }

        // Clear corrupted storage first
        await clearCorruptedStorage();
        
        // Initialize storage manager
        storageManager = new StorageManager();
        await storageManager.initialize();
        console.log('✅ Storage initialized');

        // Initialize PDF handler
        pdfHandler = new PDFHandler(storageManager);
        console.log('✅ PDF handler ready');

        // Initialize UI manager
        uiManager = new UIManager(pdfHandler, storageManager);
        await uiManager.initialize();
        console.log('✅ UI initialized');

        // Make globally available
        window.storageManager = storageManager;
        window.pdfHandler = pdfHandler;
        window.uiManager = uiManager;
        
        // UIManager now initializes asynchronously and checks for existing PDFs
        console.log('✅ UI initialized');

        setupEventListeners();
        
        // Hide loading overlay
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
        }

        console.log('🎉 App ready!');
        
        // Mark as initialized
        isInitialized = true;
        
    } catch (error) {
        console.error('❌ Initialization failed:', error.message);
        
        // Show error to user
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.innerHTML = `
                <div class="loading-content">
                    <div class="error-message">
                        <h3>❌ Initialization Error</h3>
                        <p>Failed to start: ${error.message}</p>
                        <button onclick="location.reload()" class="retry-btn">🔄 Retry</button>
                    </div>
                </div>
            `;
        }
    }
}

function setupEventListeners() {
    // Prevent duplicate event listeners
    if (eventListenersAttached) {
        console.log('⚠️ Event listeners already attached, skipping...');
        return;
    }

    // Note: PDF file input is handled by ui-manager.js to prevent conflicts

    // Form panel toggle
    const formPanelToggle = document.getElementById('form-panel-toggle');
    if (formPanelToggle) {
        formPanelToggle.removeEventListener('click', handleFormPanelToggle);
        formPanelToggle.addEventListener('click', handleFormPanelToggle);
        console.log('📋 Form panel toggle listener attached');
    }

    // Keyboard shortcuts
    document.removeEventListener('keydown', handleKeyboardShortcuts);
    document.addEventListener('keydown', handleKeyboardShortcuts);

    // Form panel overlay click
    const formPanelOverlay = document.getElementById('form-panel-overlay');
    if (formPanelOverlay) {
        formPanelOverlay.removeEventListener('click', handleFormPanelOverlayClick);
        formPanelOverlay.addEventListener('click', handleFormPanelOverlayClick);
        console.log('📋 Form panel overlay listener attached');
    }

    // Memory monitoring (only in development)
    if (window.location.hostname === 'localhost') {
        setInterval(() => {
            if (window.performance && window.performance.memory) {
                const memory = window.performance.memory;
                const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
                if (usedMB > 100) { // Only log if over 100MB
                    console.log('💾 Memory:', usedMB + 'MB');
                }
            }
        }, 30000); // Check every 30 seconds
    }

    eventListenersAttached = true;
    console.log('✅ Event listeners attached');
}

// Event handler functions to prevent duplicate listeners
function handleFormPanelToggle() {
    try {
        uiManager.toggleFormPanel();
    } catch (error) {
        console.error('❌ Panel toggle failed:', error.message);
    }
}

function handleKeyboardShortcuts(event) {
    try {
        if (event.key === 'Escape') {
            const formPanel = document.getElementById('form-panel');
            if (formPanel && !formPanel.classList.contains('hidden')) {
                uiManager.toggleFormPanel();
            }
        }
    } catch (error) {
        console.error('❌ Keyboard shortcut failed:', error.message);
    }
}

function handleFormPanelOverlayClick() {
    try {
        uiManager.toggleFormPanel();
    } catch (error) {
        console.error('❌ Overlay click failed:', error.message);
    }
}

// Error handling for uncaught errors
window.addEventListener('error', (event) => {
    console.error('💥 Uncaught error:', event.error?.message || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('💥 Unhandled promise rejection:', event.reason?.message || event.reason);
});

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

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('📋 DOM ready, starting app...');
    setupErrorHandling();
    setupPerformanceMonitoring();
    addDragDropStyles();
    setupDragAndDrop();
    initializeApp();
});

console.log('✅ Main.js loaded'); 