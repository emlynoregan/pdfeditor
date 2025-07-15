# 📄 PDF Editor - Fill PDF Forms Online

A free, client-side PDF editor that allows users to upload, edit, fill forms, and download PDFs directly in their browser. No server uploads required - all processing happens locally on your device.

> **💖 Built with Love**: This PDF editor was created by Emlyn O'Regan for Jodie O'Regan, demonstrating the power of modern web technologies for secure, client-side document processing.

> **✅ Latest Update**: All major functionality has been implemented and tested. The app now supports complete PDF upload, editing, form filling, and persistent storage workflow with robust error handling.

## ✨ Features

- **📁 PDF Upload & Management**: Upload multiple PDF files with drag-and-drop support
- **📝 Form Filling**: Fill out PDF forms with automatic saving and loading of field values
- **💾 Dual Storage System**: IndexedDB primary storage with localStorage fallback
- **⬇️ Download**: Download completed PDFs with filled-in forms
- **🔍 PDF Viewer**: View PDFs with zoom controls and page navigation
- **📱 Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **🌐 PWA Support**: Install as a Progressive Web App (service worker currently disabled)
- **🔒 Privacy First**: All processing happens in your browser - no data sent to servers
- **🛡️ Robust Error Handling**: Comprehensive error handling with fallback mechanisms
- **🔄 Auto-Save**: Form field values are automatically saved as you type
- **📊 Storage Management**: Monitor storage usage and manage uploaded PDFs

## 🚀 Quick Start

### Local Development

1. Clone or download the repository
2. Navigate to the `pdfeditor` directory
3. Run the development server:
   ```bash
   python run_game.py
   ```
4. Open your browser to `http://localhost:8000`
5. Upload a PDF with form fields to test the functionality

### GitHub Pages Deployment

1. Upload the `pdfeditor` directory to your GitHub repository
2. Enable GitHub Pages in repository settings
3. Select the branch containing the `pdfeditor` directory
4. Your PDF editor will be available at `https://yourusername.github.io/repository-name/pdfeditor/`

## 🏗️ Project Structure

```
pdfeditor/
├── index.html              # Main HTML file with cache-busting (v=1737022700)
├── run_game.py             # Local development server with custom headers
├── manifest.json           # PWA configuration
├── sw.js                   # Service worker (currently minimal/disabled)
├── css/
│   ├── style.css          # Main styles and responsive design
│   └── pdf-editor.css     # PDF editor specific styles
├── js/
│   ├── storage.js         # IndexedDB/localStorage dual storage system
│   ├── pdf-handler.js     # PDF processing, rendering, and form handling
│   ├── ui-manager.js      # UI interactions, modals, and view management
│   └── main.js            # Application initialization and coordination
├── assets/
│   └── images/
│       ├── favicon.png    # App icon
│       └── oembed.png     # Social media preview image
└── README.md              # This file
```

## 💻 Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **PDF Processing**: 
  - [PDF.js](https://github.com/mozilla/pdf.js) v3+ - PDF rendering and viewing
  - [PDF-lib](https://github.com/Hopding/pdf-lib) - PDF modification and form filling
- **Storage**: 
  - **Primary**: IndexedDB with structured object stores
  - **Fallback**: localStorage with JSON serialization
  - **Form Data**: Persistent form field values with timestamps
- **Architecture**: 
  - Modular class-based JavaScript
  - Event-driven UI management
  - Async/await pattern throughout
- **Development**: Python HTTP server with cache-control headers
- **Cache Management**: URL-based cache busting (current version: v=1737022700)

## 🎯 How to Use

### 1. Upload PDFs
- Click "Choose PDF Files" or drag and drop PDF files onto the upload area
- Files are processed and stored locally in IndexedDB (or localStorage fallback)
- Multiple files can be uploaded simultaneously
- Upload progress and error states are clearly indicated

### 2. Manage PDFs
- View all uploaded PDFs in the clean management interface
- See detailed file information (size, pages, form fields count, upload date)
- Delete individual files or clear all storage
- Monitor storage usage and remaining space

### 3. Edit PDFs
- Click "Edit" on any PDF to open the full-screen editor
- Navigate pages with intuitive controls
- Zoom in/out for detailed editing
- **Form Filling**: 
  - Fill form fields using the right-side panel
  - Values are auto-saved as you type
  - Field values persist between sessions
  - Supports text fields, checkboxes, radio buttons, and dropdowns

### 4. Download PDFs
- Click "Download PDF" to save the completed form
- Downloaded PDF includes all your filled form data
- Original PDF remains unchanged in storage
- Form field values are preserved for future editing

## 🔧 Recent Development & Fixes

### Major Fixes Completed ✅
- **Double Dialog Issue**: Fixed duplicate file upload dialogs caused by event listener conflicts
- **Storage Errors**: Resolved undefined PDF object errors with comprehensive null checks
- **Form Field Persistence**: Implemented complete save/load system for form field values
- **Cache Conflicts**: Simplified caching strategy, disabled problematic service worker
- **Missing Methods**: Added all required storage methods (saveFormFieldValues, loadFormFieldValues)
- **View Management**: Fixed app initialization to show appropriate view based on existing PDFs
- **Error Handling**: Added try-catch blocks and fallback mechanisms throughout

### Current Status
- ✅ **PDF Upload**: Working with drag-and-drop and file selection
- ✅ **PDF Management**: List view with file details and storage info
- ✅ **PDF Editor**: Full-screen editing with zoom and navigation
- ✅ **Form Filling**: Complete form field editing with auto-save
- ✅ **Data Persistence**: IndexedDB primary with localStorage fallback
- ✅ **Error Recovery**: Graceful handling of storage failures and corrupted data

## 🏪 Storage Architecture

### IndexedDB (Primary Storage)
```javascript
Database: PDFEditor
├── pdfs (Object Store)          # PDF files and metadata
│   ├── id (keyPath)            # Unique PDF identifier
│   ├── filename                # Original filename
│   ├── uploadDate             # ISO timestamp
│   ├── size                   # File size in bytes
│   └── blob                   # PDF file data
└── formFields (Object Store)   # Form field values
    ├── pdfId (index)          # Links to PDF
    ├── fieldName              # Form field identifier
    ├── value                  # Field value
    └── updatedAt              # Last modification time
```

### localStorage (Fallback)
```javascript
Keys:
├── pdfeditor_pdfs             # JSON array of PDF metadata
├── pdfeditor_pdf_{id}         # Individual PDF blob data (base64)
└── pdfeditor_form_{id}        # Form field values for PDF
```

## 📱 Progressive Web App

**Current Status**: PWA features available but service worker is simplified to avoid caching conflicts.

### Installation
1. Visit the app in a compatible browser
2. Look for browser's "Install" prompt
3. App will be available offline for core functionality

### PWA Features
- **Manifest**: App metadata and icon configuration
- **Responsive**: Works across all device sizes
- **Offline Core**: Basic functionality available without internet
- **App-like**: Standalone mode when installed

## 🔧 Development

### Prerequisites
- Python 3.x for local development server
- Modern web browser with JavaScript enabled
- PDF files with form fields for testing

### Development Workflow
1. Make changes to HTML, CSS, or JavaScript files
2. Update cache version in `index.html` if needed (increment `v=` parameter)
3. Refresh browser to see changes (cache-busting ensures updates are loaded)
4. Use browser developer tools for debugging
5. Test with various PDF files to ensure compatibility

### Testing Checklist
- [ ] Upload multiple PDFs of different sizes
- [ ] Fill form fields and verify auto-save
- [ ] Close and reopen app to test persistence
- [ ] Test both IndexedDB and localStorage modes
- [ ] Verify error handling with corrupted data
- [ ] Test responsive design on mobile devices

### Adding New Features
- **New Form Field Types**: Extend `PDFHandler.processFormField()`
- **UI Improvements**: Modify CSS files and `UIManager` class methods
- **Storage Features**: Enhance `StorageManager` with new object stores
- **PDF Processing**: Utilize additional PDF.js and PDF-lib APIs

## 🐛 Troubleshooting

### Common Issues

**PDF Won't Load**
- Ensure PDF is not password-protected
- Check file size (default limit: ~50MB in IndexedDB)
- Verify PDF file is not corrupted
- Check browser console for specific error messages

**Form Fields Not Detected**
- PDF must contain interactive form fields (not just fillable text)
- Try with known form PDFs (government forms work well)
- Some scanned PDFs may not have interactive fields

**Storage Issues**
- App automatically falls back to localStorage if IndexedDB fails
- Clear browser storage if encountering persistent errors
- Check available storage space in browser settings

**App Shows Upload Screen Despite Having PDFs**
- This was a known issue that has been fixed
- Refresh the page to trigger proper view initialization
- Check browser console for any remaining errors

**Service Worker Conflicts**
- Service worker is currently simplified to avoid caching issues
- If experiencing caching problems, disable service worker in dev tools
- Hard refresh (Ctrl+F5) to bypass all caches

## 📊 Browser Support

- **Chrome**: Full support including PWA and IndexedDB
- **Firefox**: Full support, comprehensive form field handling
- **Safari**: Full support on iOS 14.3+, excellent mobile experience
- **Edge**: Full support including all modern features
- **Mobile Browsers**: Responsive design optimized for touch interfaces

### Storage Support
- **IndexedDB**: Supported in all modern browsers
- **localStorage**: Universal fallback support
- **File API**: Required for PDF upload functionality

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Make your changes and test thoroughly
4. Update cache version in index.html if JS/CSS changes are made
5. Test with various PDF files and edge cases
6. Commit your changes (`git commit -am 'Add new feature'`)
7. Push to the branch (`git push origin feature/new-feature`)
8. Create a Pull Request

### Development Notes
- Current cache version: `v=1737022700`
- Service worker is intentionally minimal
- All storage methods include error handling and fallbacks
- Form field values are saved with timestamps for future features

## 📄 License

This project is open source and available under the MIT License. See the LICENSE file for more details.

## 🙏 Acknowledgments

- **PDF.js** - Mozilla's excellent PDF rendering library
- **PDF-lib** - Powerful PDF manipulation library for form filling
- **IndexedDB API** - For reliable client-side storage
- **Modern Web Standards** - Making client-side PDF processing possible

---

## 🔍 Technical Details

### Performance Optimizations
- **Lazy Loading**: PDF pages rendered on demand
- **Memory Management**: Efficient blob storage and retrieval
- **Async Operations**: Non-blocking UI with proper error handling
- **Cache Busting**: Ensures users get latest application updates

### Security Considerations
- **Client-Side Only**: No data transmission to external servers
- **Same-Origin Policy**: All resources served from same domain
- **Content Security**: No external script dependencies
- **Local Storage**: Data never leaves user's device

### Browser Storage Limits
- **IndexedDB**: Typically 50% of available disk space
- **localStorage**: Usually 5-10MB limit
- **Auto-Fallback**: Seamless switching between storage methods

---

**Status**: ✅ **Production Ready** - All core functionality implemented and tested  
**Last Updated**: January 2025  
**Version**: v1737022700

For support or questions, please open an issue in the repository.
