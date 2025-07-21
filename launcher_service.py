#!/usr/bin/env python3
"""
NAS Cloud Background Service Launcher
This script runs NAS Cloud as a background service with system tray integration.
"""

import subprocess
import time
import sys
import threading
import signal
import os
import socket
import warnings
from contextlib import closing
import webbrowser
from io import BytesIO
import base64

# System tray imports
try:
    import pystray
    from pystray import MenuItem as item
    from PIL import Image, ImageDraw
    TRAY_AVAILABLE = True
except ImportError:
    TRAY_AVAILABLE = False
    print("Warning: pystray not available. Install with: pip install pystray Pillow")

# Suppress bcrypt warnings about version detection
warnings.filterwarnings("ignore", message=".*bcrypt.*")
warnings.filterwarnings("ignore", message=".*trapped.*", category=UserWarning)

class NASCloudService:
    def __init__(self):
        self.server_process = None
        self.server_thread = None
        self.server_instance = None
        self.port = None
        self.network_ip = None
        self.running = False
        self.icon = None
        
    def get_network_ip(self):
        """Get the local network IP address"""
        try:
            # Connect to a remote address to determine local IP
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                s.connect(("8.8.8.8", 80))
                local_ip = s.getsockname()[0]
                return local_ip
        except Exception:
            return "127.0.0.1"  # Fallback to localhost

    def find_free_port(self, start_port=8000):
        """Find a free port starting from the given port"""
        port = start_port
        while port < start_port + 100:  # Try 100 ports
            with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
                if sock.connect_ex(('127.0.0.1', port)) != 0:
                    return port
            port += 1
        return start_port  # Fallback to original port

    def create_icon(self):
        """Create a simple icon for the system tray"""
        # Create a simple cloud icon
        width = height = 64
        color1 = "lightblue"
        color2 = "white"
        
        # Create an image
        image = Image.new('RGBA', (width, height), (0, 0, 0, 0))
        draw = ImageDraw.Draw(image)
        
        # Draw a simple cloud shape
        # Main cloud body
        draw.ellipse([10, 25, 35, 45], fill=color1)
        draw.ellipse([20, 20, 50, 40], fill=color1)
        draw.ellipse([35, 25, 55, 45], fill=color1)
        
        # Cloud highlights
        draw.ellipse([12, 27, 32, 42], fill=color2)
        draw.ellipse([22, 22, 48, 38], fill=color2)
        draw.ellipse([37, 27, 53, 42], fill=color2)
        
        return image

    def open_browser_local(self, info=None):
        """Open browser to local URL"""
        url = f'http://127.0.0.1:{self.port}'
        webbrowser.open(url)

    def open_browser_network(self, info=None):
        """Open browser to network URL"""
        url = f'http://{self.network_ip}:{self.port}'
        webbrowser.open(url)

    def show_info(self, info=None):
        """Show server information"""
        if self.running:
            info_text = f"""NAS Cloud is running!
            
Local URL: http://127.0.0.1:{self.port}
Network URL: http://{self.network_ip}:{self.port}

Click 'Open Local' or 'Open Network' to access the application."""
        else:
            info_text = "NAS Cloud is not running."
            
        # For Windows, we can use a simple message box
        try:
            import tkinter as tk
            from tkinter import messagebox
            
            # Create a temporary root window
            root = tk.Tk()
            root.withdraw()  # Hide the main window
            root.attributes('-topmost', True)  # Make it appear on top
            
            # Show the message box
            messagebox.showinfo("NAS Cloud Status", info_text)
            
            # Properly destroy the root window
            root.quit()
            root.destroy()
            
        except Exception as e:
            print(f"Could not show GUI message: {e}")
            print(info_text)

    def stop_server(self, info=None):
        """Stop the server without quitting the application"""
        print("Stopping NAS Cloud server...")
        self.running = False
        
        try:
            # If we have a server instance, try to shut it down gracefully
            if hasattr(self, 'server_instance') and self.server_instance:
                print("Stopping uvicorn server...")
                self.server_instance.should_exit = True
                self.server_instance.force_exit = True
                
            # Stop server process if running in development mode
            if self.server_process and self.server_process.poll() is None:
                print("Terminating server process...")
                self.server_process.terminate()
                try:
                    self.server_process.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    print("Force killing server process...")
                    self.server_process.kill()
                self.server_process = None
            
            # Wait for server thread to finish
            if hasattr(self, 'server_thread') and self.server_thread and self.server_thread.is_alive():
                print("Waiting for server thread to finish...")
                self.server_thread.join(timeout=2)
                
            print("Server stopped successfully.")
                
        except Exception as e:
            print(f"Error stopping server: {e}")

    def restart_server(self, info=None):
        """Restart the server"""
        print("Restarting NAS Cloud server...")
        self.stop_server()
        time.sleep(1)
        self.start_server()

    def quit_action(self, info=None):
        """Quit the application"""
        print("Shutting down NAS Cloud service...")
        self.stop_server()
        
        try:
            # Stop the system tray icon
            if self.icon:
                print("Stopping system tray...")
                self.icon.stop()
                
        except Exception as e:
            print(f"Error during shutdown: {e}")
        
        # Force exit to ensure cleanup
        print("Service shutdown complete.")
        os._exit(0)
        """Quit the application"""
        print("Shutting down NAS Cloud service...")
        self.running = False
        
        try:
            # If we have a server instance, try to shut it down gracefully
            if hasattr(self, 'server_instance') and self.server_instance:
                print("Stopping uvicorn server...")
                self.server_instance.should_exit = True
                self.server_instance.force_exit = True
                
            # Stop server process if running in development mode
            if self.server_process and self.server_process.poll() is None:
                print("Terminating server process...")
                self.server_process.terminate()
                try:
                    self.server_process.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    print("Force killing server process...")
                    self.server_process.kill()
            
            # Wait for server thread to finish
            if hasattr(self, 'server_thread') and self.server_thread and self.server_thread.is_alive():
                print("Waiting for server thread to finish...")
                self.server_thread.join(timeout=2)
            
            # Stop the system tray icon
            if self.icon:
                print("Stopping system tray...")
                self.icon.stop()
                
        except Exception as e:
            print(f"Error during shutdown: {e}")
        
        # Force exit to ensure cleanup
        print("Service shutdown complete.")
        os._exit(0)

    def start_server(self):
        """Start the FastAPI server"""
        try:
            # Find a free port and get network IP
            self.port = self.find_free_port(8000)
            self.network_ip = self.get_network_ip()
            
            print(f"Starting NAS Cloud service on port {self.port}")
            print(f"Local access: http://127.0.0.1:{self.port}")
            print(f"Network access: http://{self.network_ip}:{self.port}")
            
            # Start the FastAPI server
            if getattr(sys, 'frozen', False):
                # Running as compiled executable
                try:
                    # Add the backend path to sys.path for imports
                    backend_path = os.path.join(os.path.dirname(sys.executable), 'backend')
                    if backend_path not in sys.path:
                        sys.path.insert(0, backend_path)
                    
                    from backend.app.main import app
                    import uvicorn
                    
                    # Simple uvicorn run in thread
                    def run_server():
                        try:
                            import logging
                            # Disable uvicorn logging to avoid formatter issues
                            logging.getLogger("uvicorn").disabled = True
                            logging.getLogger("uvicorn.error").disabled = True
                            logging.getLogger("uvicorn.access").disabled = True
                            
                            # Create server instance that we can control
                            import uvicorn
                            if self.port is None:
                                self.port = 8000
                            config = uvicorn.Config(
                                app,
                                host="0.0.0.0",
                                port=self.port,
                                log_config=None,  # Disable log config
                                access_log=False
                            )
                            self.server_instance = uvicorn.Server(config)
                            self.server_instance.run()
                            
                        except Exception as e:
                            # Write error to a log file for debugging
                            with open("nas_cloud_error.log", "w") as f:
                                f.write(f"Server error: {e}\n")
                    
                    self.server_thread = threading.Thread(target=run_server, daemon=False)
                    self.server_thread.start()
                    self.running = True
                    
                    # Give the server time to start
                    import time
                    time.sleep(2)
                    
                except Exception as e:
                    with open("nas_cloud_error.log", "w") as f:
                        f.write(f"Error importing backend modules: {e}\n")
                    return False
                
            else:
                # Running in development
                env = os.environ.copy()
                env['PYTHONPATH'] = os.path.join(os.path.dirname(__file__), 'backend')
                
                # Start subprocess
                self.server_process = subprocess.Popen([
                    sys.executable, "-m", "uvicorn", 
                    "app.main:app", 
                    "--host", "0.0.0.0",  # Listen on all interfaces
                    "--port", str(self.port),
                    "--log-level", "warning"
                ], cwd=os.path.join(os.path.dirname(__file__), 'backend'), 
                   env=env,
                   stdout=subprocess.DEVNULL,  # Suppress output
                   stderr=subprocess.DEVNULL)
                
                self.running = True
                
            return True
            
        except Exception as e:
            with open("nas_cloud_error.log", "w") as f:
                f.write(f"Error starting server: {e}\n")
            return False

    def setup_tray(self):
        """Setup the system tray"""
        if not TRAY_AVAILABLE:
            print("System tray not available. Running in console mode.")
            return False
            
        # Create menu items
        if TRAY_AVAILABLE:
            menu = pystray.Menu(
                item('NAS Cloud Status', self.show_info),
                pystray.Menu.SEPARATOR,
                item('Open Local (127.0.0.1)', self.open_browser_local),
                item('Open Network', self.open_browser_network),
                pystray.Menu.SEPARATOR,
                item('Stop Server', self.stop_server),
                item('Restart Server', self.restart_server),
                pystray.Menu.SEPARATOR,
                item('Quit', self.quit_action)
            )
            
            # Create icon
            self.icon = pystray.Icon(
                "NAS Cloud",
                self.create_icon(),
                "NAS Cloud Service",
                menu
            )
            
            return True
        else:
            return False

    def run(self):
        """Main run method"""
        # Set up signal handlers
        signal.signal(signal.SIGINT, lambda s, f: self.quit_action())
        signal.signal(signal.SIGTERM, lambda s, f: self.quit_action())
        
        # Start the server
        if not self.start_server():
            print("Failed to start server")
            return
            
        # Setup system tray
        if self.setup_tray():
            print("NAS Cloud service started. Check system tray for controls.")
            # Run the icon (this blocks)
            self.icon.run()
        else:
            # Fallback: run without tray
            print("Running without system tray...")
            print(f"Local access: http://127.0.0.1:{self.port}")
            print(f"Network access: http://{self.network_ip}:{self.port}")
            print("Press Ctrl+C to stop")
            
            try:
                while self.running:
                    time.sleep(1)
            except KeyboardInterrupt:
                self.quit_action()

def main():
    service = NASCloudService()
    service.run()

if __name__ == "__main__":
    main()
