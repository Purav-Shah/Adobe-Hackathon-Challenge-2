# Adobe Hackathon Finale - Startup Guide

## Quick Start (Recommended)

### Option 1: Use Batch Files
1. **Start Backend**: Double-click `start-backend.bat`
2. **Start Frontend**: Double-click `start-frontend.bat` (in a new terminal)

### Option 2: Manual Commands

#### Start Backend Server
```bash
# Navigate to backend directory
cd "Adobe Hackathon Finale\backend"

# Create virtual environment (first time only)
python -m venv venv

# Activate virtual environment
venv\Scripts\activate

# Install dependencies (first time only)
pip install -r requirements.txt

# Start server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### Start Frontend Server
```bash
# Navigate to frontend directory (IMPORTANT: must be frontend folder)
cd "Adobe Hackathon Finale\frontend"

# Install dependencies (first time only)
npm install

# Start development server
npm run dev
```

## Access URLs
- **Backend API**: http://localhost:8000
- **Frontend App**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs

## Troubleshooting

### npm ENOENT Error
- **Problem**: npm can't find package.json
- **Solution**: Make sure you're in the `frontend` directory, not the root directory
- **Check**: Run `dir` and look for `package.json` file

### Backend Connection Issues
- **Problem**: Frontend can't connect to backend
- **Solution**: Ensure backend is running on port 8000 first
- **Check**: Visit http://localhost:8000/health

### Port Already in Use
- **Problem**: Port 8000 or 3000 is occupied
- **Solution**: Kill existing processes or change ports
- **Alternative**: Use `--port 8001` for backend or `--port 3001` for frontend

## File Structure
```
Adobe Hackathon Finale/
├── backend/           # Python FastAPI server
│   ├── main.py
│   ├── requirements.txt
│   └── venv/         # Virtual environment
├── frontend/          # Next.js React app
│   ├── package.json   # npm dependencies
│   ├── app/
│   └── node_modules/  # npm packages
├── start-backend.bat  # Backend startup script
├── start-frontend.bat # Frontend startup script
└── README-STARTUP.md  # This file
```
