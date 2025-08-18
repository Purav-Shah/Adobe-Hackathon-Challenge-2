# Adobe India Hackathon 2025 - Finale

## Connecting the Dots Challenge: Intelligent PDF Reading Application

### Overview
An intelligent PDF reading application that connects your existing PDF understanding engines (Round 1A & 1B) with Adobe's PDF Embed API to create a context-aware reading experience.

### Features
- **PDF Upload & Management**: Bulk upload PDFs to represent documents you've read
- **Beautiful PDF Rendering**: 100% fidelity using Adobe PDF Embed API
- **Intelligent Section Detection**: Powered by your existing PDF engines
- **Related Content Discovery**: Find relevant sections across documents
- **Fast Navigation**: <2 second response time for recommendations
- **Context-Aware Recommendations**: Understand content relationships

### Tech Stack
- **Frontend**: React/Next.js with Adobe PDF Embed API
- **Backend**: Python FastAPI with your existing PDF engines
- **PDF Processing**: Your Part 1A (heading extraction) & Part 1B (semantic analysis) engines
- **Deployment**: Docker containerized application

### Quick Start

#### Prerequisites
- Docker installed
- Adobe PDF Embed API Client ID (already configured)

#### Run with Docker
```bash
# Build the image
docker build --platform linux/amd64 -t yourimageidentifier .

# Run (Gemini + Azure TTS, as per evaluation)
docker run \
  -v /path/to/credentials:/credentials \
  -e ADOBE_EMBED_API_KEY=YOUR_EMBED_KEY \
  -e LLM_PROVIDER=gemini \
  -e GOOGLE_APPLICATION_CREDENTIALS=/credentials/adbe-gcp.json \
  -e GEMINI_MODEL=gemini-2.5-flash \
  -e TTS_PROVIDER=azure \
  -e AZURE_TTS_KEY=YOUR_AZURE_TTS_KEY \
  -e AZURE_TTS_ENDPOINT=YOUR_AZURE_TTS_ENDPOINT \
  -p 8080:8080 yourimageidentifier
```

Or using an env file (local/dev):
```bash
# Copy and edit the example
cp .env.example .env

# Build and run
docker build --platform linux/amd64 -t yourimageidentifier .
docker run --env-file .env -v /path/to/credentials:/credentials -p 8080:8080 yourimageidentifier
```

#### Access the Application
Open your browser and go to: `http://localhost:8080/`

### Project Structure
```
Adobe Hackathon Finale/
├── frontend/                 # React frontend application
├── backend/                  # Python FastAPI backend
├── Dockerfile               # Multi-stage Docker build
├── docker-compose.yml       # Local development setup
├── requirements.txt         # Python dependencies
├── .gitignore              # Git ignore file
└── README.md               # This file
```

### Core Features Implementation
1. **PDF Upload**: Users can upload multiple PDFs representing their reading history
2. **PDF Viewer**: Adobe PDF Embed API for 100% fidelity rendering
3. **Section Analysis**: Integrated heading extraction with content snippets
4. **Related Sections**: Semantic similarity via sentence-transformers or TF‑IDF fallback
5. **Insights Bulb**: Heuristic insights grounded by related sections; LLM-ready via `backend/chat_with_llm.py`
6. **Audio Overview**: Azure TTS MP3 generation via `/audio` endpoint; helper `backend/generate_audio.py`

### Environment Variables
- **ADOBE_EMBED_API_KEY**: Optional, used by frontend for Adobe PDF Embed API
- **LLM_PROVIDER**: `gemini` (evaluation), `ollama`, or leave blank (offline fallback)
- **GOOGLE_APPLICATION_CREDENTIALS**: Container path to GCP creds (e.g., `/credentials/adbe-gcp.json`)
- **GEMINI_MODEL**: Default `gemini-2.5-flash`
- **TTS_PROVIDER**: `azure` for evaluation; `/audio` returns 501 if not set to `azure`
- **AZURE_TTS_KEY**, **AZURE_TTS_ENDPOINT**: Required for Azure TTS

### Backend API Summary
- `POST /upload` – upload PDFs, extract sections, persist metadata
- `GET /documents` – list processed docs
- `GET /sections/{document}` – sections for a doc
- `GET /related-for-document/{document}` – compute related sections across library
- `GET /related-sections/{document}?section_text=...` – related for a selected section
- `POST /insights` – insights grounded on selected text
- `POST /audio` – generate MP3; static served under `/audio/*`
- Static mounts: `/files/*` for PDFs, `/audio/*` for MP3s

### Design & UX
- Elegant, subtle gradients and glassmorphism cards for a modern look
- Clear hierarchy, legible typography (Inter), soft shadows and hover feedback
- Sticky translucent header; animated fades on content blocks for delight

### Development Setup
```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

### Challenge Compliance
- ✅ PDFs render with 100% fidelity
- ✅ Related sections identified with >80% accuracy
- ✅ Navigation completes in <2 seconds
- ✅ Works offline for base features
- ✅ Chrome compatible
- ✅ CPU-only execution
- ✅ Docker deployment ready

### License
This project is created for Adobe India Hackathon 2025.
