# NAS Cloud - Build Instructions

This document explains how to build NAS Cloud as a standalone executable using PyInstaller.

## Prerequisites

### Required Software
- **Node.js** (v16 or later) - for building the React frontend
- **Python** (v3.8 or later) - for the FastAPI backend
- **Git** (optional) - for version control

### Installation Links
- Node.js: https://nodejs.org/
- Python: https://python.org/

## Quick Build

### Windows
```batch
# Run the automated build script
build-windows.bat
```

### Linux
```bash
# Make the script executable
chmod +x build-linux.sh

# Run the automated build script
./build-linux.sh
```

## Manual Build Steps

If you prefer to build manually or need to troubleshoot:

### 1. Build React Frontend
```bash
cd frontend
npm install
npm run build
cd ..
```

### 2. Setup Python Environment
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate.bat

# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
pip install pyinstaller
cd ..
```

### 3. Build Executable
```bash
# Make sure virtual environment is activated
# Windows: backend\venv\Scripts\activate.bat
# Linux: source backend/venv/bin/activate

pyinstaller nas-cloud.spec --clean --noconfirm
```

## Output

After building, you'll find:
- **Executable**: `dist/NAS-Cloud.exe` (Windows) or `dist/NAS-Cloud` (Linux)
- **Distribution folder**: `dist/` - This entire folder can be distributed

## Running the Application

### Development Mode
```bash
# Windows
run-dev.bat

# Linux
chmod +x run-dev.sh
./run-dev.sh
```

### Production (Built Executable)
```bash
# Windows
dist\NAS-Cloud.exe

# Linux
./dist/NAS-Cloud
```

## Features of the Built Application

- ✅ **Self-contained**: No need to install Python or Node.js on target machines
- ✅ **Auto-opens browser**: Automatically opens http://127.0.0.1:8000 in default browser
- ✅ **Portable**: Single executable file (with dependencies in same folder)
- ✅ **Cross-platform**: Works on Windows and Linux
- ✅ **Integrated**: React frontend and FastAPI backend in one application

## Troubleshooting

### Common Issues

1. **"React build not found"**
   - Make sure to run `npm run build` in the frontend directory first
   - Check that `frontend/dist` folder exists

2. **"Module not found" errors**
   - Ensure all Python dependencies are installed: `pip install -r requirements.txt`
   - Try adding missing modules to `hiddenimports` in `nas-cloud.spec`

3. **"Port already in use"**
   - The application automatically finds a free port starting from 8000
   - If issues persist, check for other applications using ports 8000-8099

4. **Executable won't start**
   - Run from command line to see error messages
   - Check that all required files are in the `dist` folder

### Build Optimization

To reduce executable size:
1. Remove unused dependencies from `requirements.txt`
2. Add more modules to `excludes` list in `nas-cloud.spec`
3. Use UPX compression (already enabled in spec file)

## Distribution

To distribute your application:

1. **Single Machine**: Copy the entire `dist/` folder
2. **Installer**: Use tools like NSIS (Windows) or create .deb/.rpm packages (Linux)
3. **Portable**: Zip the `dist/` folder for easy distribution

## Security Notes

- The application runs locally on 127.0.0.1 (localhost only)
- For remote access, consider setting up proper authentication and HTTPS
- Database and user files are stored in the application directory
