import subprocess
import time
import webbrowser
import sys
import os

def main():
    print("📄 Starting PDF Editor Local Development Server...")
    
    # Check if we're in the correct directory
    if not os.path.exists('README.md'):
        print("❌ Please run this script from the pdfeditor directory")
        sys.exit(1)
    
    try:
        # Start server  
        print("🌐 Starting development server...")
        server_process = subprocess.Popen(['python', '-m', 'http.server', '8000'])
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
        server_process.terminate()
        print("👋 Development server stopped!")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        print("📋 Make sure Python is installed and available in PATH")
        sys.exit(1)

if __name__ == "__main__":
    main() 