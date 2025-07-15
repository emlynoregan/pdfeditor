import subprocess
import time
import webbrowser
import sys
import os
from http.server import HTTPServer, SimpleHTTPRequestHandler
import threading

class CacheControlHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add cache control headers
        if self.path.endswith('.html') or self.path == '/':
            # Don't cache HTML files
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        else:
            # Cache other files for a short time
            self.send_header('Cache-Control', 'max-age=300')
        super().end_headers()

def start_server():
    """Start the HTTP server in a separate thread"""
    server = HTTPServer(('', 8000), CacheControlHandler)
    server.serve_forever()

def main():
    print("📄 Starting PDF Editor Local Development Server...")
    
    # Check if we're in the correct directory
    if not os.path.exists('README.md'):
        print("❌ Please run this script from the pdfeditor directory")
        sys.exit(1)
    
    try:
        # Start server in a separate thread
        print("🌐 Starting development server...")
        server_thread = threading.Thread(target=start_server, daemon=True)
        server_thread.start()
        time.sleep(2)
        
        print("✅ Server started!")
        print("🔗 Opening PDF Editor at http://localhost:8000")
        webbrowser.open('http://localhost:8000')
        
        print("\n📄 PDF Editor Development Server Running")
        print("📝 Application will be available at: http://localhost:8000")
        print("🔧 Make changes to files and refresh browser to see updates")
        print("💡 Upload PDF files to test form filling functionality")
        print("⏹️  Press Ctrl+C to stop server...")
        
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\n🛑 Stopping server...")
        print("👋 Development server stopped!")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        print("📋 Make sure Python is installed and available in PATH")
        sys.exit(1)

if __name__ == "__main__":
    main() 