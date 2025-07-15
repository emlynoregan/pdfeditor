# 📄 PDF Editor - Fill PDF Forms Online

A free, client-side PDF editor that allows users to upload, edit, fill forms, and download PDFs directly in their browser. No server uploads required - all processing happens locally on your device.

## ✨ Features

- **📁 PDF Upload & Management**: Upload multiple PDF files and manage them locally
- **📝 Form Filling**: Fill out PDF forms and text fields with an intuitive interface
- **💾 Local Storage**: PDFs are stored in your browser's local storage (no server upload)
- **⬇️ Download**: Download completed PDFs with filled-in forms
- **🔍 PDF Viewer**: View PDFs with zoom controls and page navigation
- **📱 Responsive Design**: Works on desktop, tablet, and mobile devices
- **🌐 PWA Support**: Install as a Progressive Web App
- **🔒 Privacy First**: All processing happens in your browser - no data sent to servers

## 🚀 Quick Start

### Local Development

1. Clone or download the repository
2. Navigate to the `pdfeditor` directory
3. Run the development server:
   ```bash
   python run_game.py
   ```
4. Open your browser to `http://localhost:8000`

### GitHub Pages Deployment

1. Upload the `pdfeditor` directory to your GitHub repository
2. Enable GitHub Pages in repository settings
3. Select the branch containing the `pdfeditor` directory
4. Your PDF editor will be available at `https://yourusername.github.io/repository-name/pdfeditor/`

## 🏗️ Project Structure

```
pdfeditor/
├── index.html              # Main HTML file
├── run_game.py             # Local development server
├── manifest.json           # PWA configuration
├── sw.js                   # Service worker for offline support
├── css/
│   ├── style.css          # Main styles
│   └── pdf-editor.css     # PDF editor specific styles
├── js/
│   ├── storage.js         # Local storage management
│   ├── pdf-handler.js     # PDF processing and form handling
│   ├── ui-manager.js      # UI interactions and modal management
│   └── main.js            # Application initialization
├── assets/
│   └── images/
│       ├── favicon.png    # App icon
│       └── oembed.png     # Social media preview image
└── README.md              # This file
```

## 💻 Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **PDF Processing**: 
  - [PDF.js](https://github.com/mozilla/pdf.js) - PDF rendering and viewing
  - [PDF-lib](https://github.com/Hopding/pdf-lib) - PDF modification and form filling
- **Storage**: Browser Local Storage (client-side only)
- **PWA**: Service Worker, Web App Manifest
- **Development**: Python HTTP server for local development

## 🎯 How to Use

### 1. Upload PDFs
- Click "Choose PDF Files" or drag and drop PDF files
- Files are stored locally in your browser
- Multiple files can be uploaded at once

### 2. Manage PDFs
- View all uploaded PDFs in the management interface
- See file details (size, pages, form fields)
- Delete individual files or clear all files

### 3. Edit PDFs
- Click "Edit" on any PDF to open the editor
- View the PDF with zoom and page navigation controls
- Fill out form fields using the right panel
- Changes are saved automatically

### 4. Download PDFs
- Click "Download PDF" to save the filled form
- The downloaded PDF includes all your form data
- Original PDF remains unchanged in storage

## 🔧 Configuration

### Storage Limits
- Default storage limit: 50MB
- Modify `MAX_STORAGE_SIZE` in `js/storage.js` to change the limit
- Storage usage is displayed in the interface

### PDF.js Configuration
- PDF.js version and CDN links are configured in `index.html`
- Worker script is loaded from CDN for better performance
- Custom PDF.js builds can be used by updating the script sources

## 🌟 Advanced Features

### Keyboard Shortcuts
- **Escape**: Return to PDF list (from editor)
- **Arrow Keys**: Navigate pages (in editor)
- **+/-**: Zoom in/out (in editor)
- **Ctrl+D**: Download PDF (in editor)

### Drag & Drop
- Drag PDF files directly onto the upload area
- Visual feedback during drag operations
- Supports multiple file selection

### Form Field Types
- **Text Fields**: Single-line and multi-line text input
- **Checkboxes**: Boolean yes/no selections
- **Radio Buttons**: Single selection from options
- **Dropdown Lists**: Select from predefined options
- **Signature Fields**: Digital signature support (future feature)

## 🔐 Privacy & Security

- **No Server Upload**: All PDF processing happens in your browser
- **Local Storage**: Files are stored in your browser's local storage
- **No Tracking**: No analytics or tracking scripts
- **HTTPS Ready**: Supports secure connections when deployed
- **CSP Compatible**: Content Security Policy friendly

## 📱 Progressive Web App

The PDF Editor can be installed as a PWA:

1. Visit the app in a compatible browser
2. Look for the "Install" prompt or use browser menu
3. The app will be available offline and can be launched from your home screen

### PWA Features
- **Offline Support**: Works without internet connection
- **App-like Experience**: Runs in standalone mode
- **File Sharing**: Can be set as a handler for PDF files
- **Shortcuts**: Quick access to upload and view functions

## 🔧 Development

### Prerequisites
- Python 3.x for local development server
- Modern web browser with JavaScript enabled
- Text editor or IDE for code editing

### Development Workflow
1. Make changes to HTML, CSS, or JavaScript files
2. Refresh the browser to see changes
3. Use browser developer tools for debugging
4. Test with various PDF files to ensure compatibility

### Adding New Features
- **New Form Field Types**: Extend `PDFHandler.processFormField()`
- **UI Improvements**: Modify CSS files and `UIManager` class
- **Storage Features**: Enhance `StorageManager` class
- **PDF Processing**: Utilize PDF.js and PDF-lib APIs

## 🐛 Troubleshooting

### Common Issues

**PDF Won't Load**
- Ensure the PDF is not password-protected
- Check file size (must be under storage limit)
- Verify PDF is not corrupted

**Form Fields Not Detected**
- Some PDFs may not have interactive form fields
- Try using a PDF with known form fields for testing
- Check browser console for error messages

**Storage Full**
- Delete unused PDFs from the management interface
- Clear browser cache and local storage
- Increase storage limit in configuration

**App Won't Install (PWA)**
- Ensure HTTPS connection (required for PWA)
- Check browser PWA support
- Verify manifest.json is accessible

## 📊 Browser Support

- **Chrome**: Full support including PWA features
- **Firefox**: Full support, limited PWA features
- **Safari**: Full support on iOS 14.3+
- **Edge**: Full support including PWA features
- **Mobile Browsers**: Responsive design works on all modern mobile browsers

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Make your changes
4. Test thoroughly with various PDF files
5. Commit your changes (`git commit -am 'Add new feature'`)
6. Push to the branch (`git push origin feature/new-feature`)
7. Create a Pull Request

## 📄 License

This project is open source and available under the MIT License. See the LICENSE file for more details.

## 🙏 Acknowledgments

- **PDF.js** - Mozilla's excellent PDF rendering library
- **PDF-lib** - Powerful PDF manipulation library
- **Modern Web Standards** - For making client-side PDF processing possible

---

**Note**: This is a client-side application. Your PDF files never leave your device, ensuring complete privacy and security.

For support or questions, please open an issue in the repository.
