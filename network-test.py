#!/usr/bin/env python3
"""
Network Configuration Test for NAS Cloud
This script helps you check your network setup for mobile access.
"""

import socket
import subprocess
import sys
import platform

def get_network_ip():
    """Get the local network IP address"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
            return local_ip
    except Exception as e:
        print(f"Error getting network IP: {e}")
        return None

def check_port_availability(port=8000):
    """Check if port is available"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('0.0.0.0', port))
            return True
    except OSError:
        return False

def check_firewall_windows(port=8000):
    """Check Windows Firewall rules for the port"""
    try:
        result = subprocess.run(
            ['netsh', 'advfirewall', 'firewall', 'show', 'rule', f'name=NAS-Cloud-{port}'],
            capture_output=True, text=True, shell=True
        )
        return "NAS-Cloud" in result.stdout
    except Exception:
        return False

def create_firewall_rule_windows(port=8000):
    """Create Windows Firewall rule for the port"""
    try:
        # Inbound rule
        subprocess.run([
            'netsh', 'advfirewall', 'firewall', 'add', 'rule',
            f'name=NAS-Cloud-{port}-Inbound',
            'dir=in', 'action=allow', 'protocol=TCP',
            f'localport={port}'
        ], check=True, shell=True)
        
        # Outbound rule  
        subprocess.run([
            'netsh', 'advfirewall', 'firewall', 'add', 'rule',
            f'name=NAS-Cloud-{port}-Outbound', 
            'dir=out', 'action=allow', 'protocol=TCP',
            f'localport={port}'
        ], check=True, shell=True)
        
        return True
    except Exception as e:
        print(f"Error creating firewall rule: {e}")
        return False

def main():
    print("=" * 60)
    print("🌐 NAS Cloud Network Configuration Test")
    print("=" * 60)
    
    # Get network information
    network_ip = get_network_ip()
    port = 8000
    
    if network_ip:
        print(f"✅ Network IP detected: {network_ip}")
        print(f"📱 Mobile access URL: http://{network_ip}:{port}")
    else:
        print("❌ Could not detect network IP")
        return
    
    # Check port availability
    if check_port_availability(port):
        print(f"✅ Port {port} is available")
    else:
        print(f"❌ Port {port} is in use - try a different port")
        return
    
    # Platform-specific checks
    system = platform.system()
    
    if system == "Windows":
        print("\n🔥 Windows Firewall Check:")
        if check_firewall_windows(port):
            print(f"✅ Firewall rule exists for port {port}")
        else:
            print(f"⚠️  No firewall rule found for port {port}")
            print("💡 You may need to create a firewall rule.")
            
            response = input("Would you like to create a firewall rule now? (y/n): ")
            if response.lower() == 'y':
                print("🔧 Creating firewall rule... (requires admin privileges)")
                if create_firewall_rule_windows(port):
                    print("✅ Firewall rule created successfully!")
                else:
                    print("❌ Failed to create firewall rule. Try running as administrator.")
    
    print("\n📋 Setup Instructions:")
    print("=" * 40)
    print("1. Make sure your laptop and phone are on the same WiFi network")
    print("2. Start NAS Cloud on your laptop")
    print(f"3. On your phone, open browser and go to: http://{network_ip}:{port}")
    print("4. If it doesn't work, check your firewall settings")
    
    if system == "Windows":
        print("\n🛡️  Windows Firewall Manual Setup:")
        print("- Open Windows Defender Firewall")
        print("- Click 'Advanced settings'")
        print("- Create new Inbound Rule:")
        print("  • Rule Type: Port")
        print(f"  • Port: {port}")
        print("  • Protocol: TCP")
        print("  • Action: Allow the connection")
        print(f"  • Name: NAS-Cloud-{port}")
    
    print("\n🔍 Troubleshooting:")
    print("- Ensure both devices are on the same network")
    print("- Check if antivirus software is blocking connections")
    print("- Try disabling Windows Firewall temporarily to test")
    print("- Some routers have AP isolation - check router settings")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    main()
