from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import os
import shutil
import json
from pathlib import Path
from typing import List, Optional
import uvicorn
from pdf_processor import PDFProcessor
from chat_with_llm import chat_with_llm
from dotenv import load_dotenv

# Load environment variables from a local .env if present (useful for local/dev)
load_dotenv()

app = FastAPI(title="Adobe Hackathon Finale - PDF Intelligence Engine")

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create necessary directories
UPLOAD_DIR = Path("uploads")
PROCESSED_DIR = Path("processed")
UPLOAD_DIR.mkdir(exist_ok=True)
PROCESSED_DIR.mkdir(exist_ok=True)
AUDIO_DIR = UPLOAD_DIR / "audio"
AUDIOS_MOUNT = "/audio"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

# Serve uploaded PDFs and generated audio files
app.mount("/files", StaticFiles(directory=str(UPLOAD_DIR)), name="files")
app.mount(AUDIOS_MOUNT, StaticFiles(directory=str(AUDIO_DIR)), name="audio")

# Initialize PDF processor
pdf_processor = PDFProcessor()

@app.get("/")
async def root():
    return {"message": "Adobe Hackathon Finale - PDF Intelligence Engine"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "PDF Intelligence Engine"}

@app.post("/upload-simple")
async def upload_pdfs_simple(files: List[UploadFile] = File(...)):
    """Upload multiple PDFs without processing (for testing)"""
    try:
        print(f"Simple upload of {len(files)} files...")
        uploaded_files = []
        
        for i, file in enumerate(files):
            if not file.filename.lower().endswith('.pdf'):
                continue
            
            print(f"Saving file {i+1}/{len(files)}: {file.filename}")
            
            # Save file
            file_path = UPLOAD_DIR / file.filename
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            uploaded_files.append({
                "filename": file.filename,
                "size_bytes": file_path.stat().st_size,
                "status": "saved"
            })
        
        return {
            "message": f"Successfully saved {len(uploaded_files)} PDFs",
            "files": uploaded_files
        }
    
    except Exception as e:
        print(f"Simple upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.post("/upload")
async def upload_pdfs(files: List[UploadFile] = File(...)):
    """Upload multiple PDFs for analysis and storage"""
    try:
        print(f"Starting upload of {len(files)} files...")
        uploaded_files = []
        
        for i, file in enumerate(files):
            if not file.filename.lower().endswith('.pdf'):
                print(f"Skipping non-PDF file: {file.filename}")
                continue
            
            print(f"Processing file {i+1}/{len(files)}: {file.filename}")
            
            # Save file
            file_path = UPLOAD_DIR / file.filename
            print(f"Saving file to {file_path}")
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            print(f"File saved, size: {file_path.stat().st_size} bytes")
            
            # Process the PDF to extract sections
            print(f"Extracting sections from {file.filename}...")
            try:
                sections = pdf_processor.extract_sections(str(file_path))
                print(f"Extracted {len(sections)} sections from {file.filename}")
            except Exception as e:
                print(f"Error extracting sections from {file.filename}: {e}")
                sections = []
            
            # Save processed data
            processed_data = {
                "filename": file.filename,
                "sections": sections,
                "file_path": str(file_path)
            }
            
            processed_file = PROCESSED_DIR / f"{file.filename}.json"
            with open(processed_file, "w", encoding="utf-8") as f:
                json.dump(processed_data, f, indent=2, ensure_ascii=False)
            
            uploaded_files.append({
                "filename": file.filename,
                "sections_count": len(sections),
                "status": "processed"
            })
            
            print(f"Completed processing {file.filename}")
        
        print(f"Upload completed successfully. Processed {len(uploaded_files)} files.")
        return {
            "message": f"Successfully uploaded {len(uploaded_files)} PDFs",
            "files": uploaded_files
        }
    
    except Exception as e:
        print(f"Upload failed with error: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.get("/documents")
async def list_documents():
    """List all uploaded and processed documents"""
    try:
        documents = []
        for json_file in PROCESSED_DIR.glob("*.json"):
            with open(json_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                documents.append({
                    "filename": data["filename"],
                    "sections_count": len(data["sections"]),
                    "uploaded_at": json_file.stat().st_mtime
                })
        
        return {"documents": documents}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list documents: {str(e)}")

@app.post("/analyze-current")
async def analyze_current_pdf(file: UploadFile = File(...)):
    """Analyze a current PDF and find related sections from uploaded documents"""
    try:
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="File must be a PDF")
        
        # Save current PDF temporarily
        temp_path = UPLOAD_DIR / f"current_{file.filename}"
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Extract sections from current PDF
        current_sections = pdf_processor.extract_sections(str(temp_path))
        
        # Find related sections from uploaded documents
        related_sections = pdf_processor.find_related_sections(
            current_sections, 
            str(PROCESSED_DIR)
        )
        
        # Clean up temp file
        temp_path.unlink()
        
        return {
            "current_pdf": file.filename,
            "current_sections": current_sections,
            "related_sections": related_sections
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.get("/related-sections/{document_name}")
async def get_related_sections(document_name: str, section_text: Optional[str] = None):
    """Get related sections for a specific document or section"""
    try:
        # Find the document
        doc_file = PROCESSED_DIR / f"{document_name}.json"
        if not doc_file.exists():
            raise HTTPException(status_code=404, detail="Document not found")
        
        with open(doc_file, "r", encoding="utf-8") as f:
            doc_data = json.load(f)
        
        if section_text:
            # Find related sections for specific section
            related = pdf_processor.find_related_sections_for_section(
                section_text, 
                str(PROCESSED_DIR)
            )
            return {"related_sections": related}
        else:
            # Return all sections
            return {"sections": doc_data["sections"]}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get related sections: {str(e)}")

@app.get("/sections/{document_name}")
async def get_document_sections(document_name: str):
    """Get all sections from a specific document"""
    try:
        doc_file = PROCESSED_DIR / f"{document_name}.json"
        if not doc_file.exists():
            raise HTTPException(status_code=404, detail="Document not found")
        
        with open(doc_file, "r", encoding="utf-8") as f:
            doc_data = json.load(f)
        
        return {"sections": doc_data["sections"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get sections: {str(e)}")
@app.get("/related-for-document/{document_name}")
async def related_for_document(document_name: str):
    """Compute related sections across all uploaded docs for the given document's sections."""
    try:
        doc_file = PROCESSED_DIR / f"{document_name}.json"
        if not doc_file.exists():
            raise HTTPException(status_code=404, detail="Document not found")

        with open(doc_file, "r", encoding="utf-8") as f:
            doc_data = json.load(f)

        current_sections = doc_data.get("sections", [])
        related_sections = pdf_processor.find_related_sections(current_sections, str(PROCESSED_DIR))

        return {"current_document": document_name, "related_sections": related_sections}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compute related sections: {str(e)}")


@app.get("/config")
async def get_config():
    """Expose runtime configuration needed by the frontend."""
    try:
        return {
            "adobe_embed_api_key": os.getenv("ADOBE_EMBED_API_KEY", ""),
            "llm_provider": os.getenv("LLM_PROVIDER", ""),
            "tts_provider": os.getenv("TTS_PROVIDER", "")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get config: {str(e)}")


@app.post("/chat")
async def chat_with_documents(payload: dict):
    """Chat with LLM about uploaded documents and selected content."""
    try:
        messages = payload.get("messages", [])
        selected_text = payload.get("selected_text", "")
        document_context = payload.get("document_context", "")
        
        if not messages:
            raise HTTPException(status_code=400, detail="messages are required")
        
        # Build system context from documents
        system_context = "You are an AI assistant helping with document analysis. "
        if document_context:
            system_context += f"Current document context: {document_context}. "
        if selected_text:
            system_context += f"Selected text: {selected_text}. "
        system_context += "Provide helpful, concise responses based on the document content."
        
        # Prepare messages for LLM
        llm_messages = [{"role": "system", "content": system_context}] + messages
        
        # Get response from LLM
        response = chat_with_llm(llm_messages)
        
        return {
            "response": response,
            "context": {
                "selected_text": selected_text,
                "document_context": document_context
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")

@app.post("/insights")
async def generate_insights(payload: dict):
    """Generate contextual insights based on selected text and uploaded documents.

    Request body: { "selected_text": str, "top_k": int }
    """
    try:
        selected_text = (payload or {}).get("selected_text", "").strip()
        top_k = int((payload or {}).get("top_k", 5))
        if not selected_text:
            raise HTTPException(status_code=400, detail="selected_text is required")

        # Use semantic related sections as grounding
        related = pdf_processor.find_related_sections_for_section(selected_text, str(PROCESSED_DIR))
        related = related[:max(1, top_k)]

        # Simple heuristic insights if no external LLM is configured
        insights = []
        keywords = [w for w in set(selected_text.lower().split()) if len(w) > 4]
        if keywords:
            insights.append({"type": "key_takeaway", "text": f"Focus area: {', '.join(sorted(keywords)[:5])}"})
        if related:
            insights.append({"type": "example", "text": f"Found {len(related)} related section(s) grounding this topic."})

        return {"insights": insights, "grounding": related}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate insights: {str(e)}")


@app.post("/audio")
async def generate_audio(payload: dict):
    """Generate an audio MP3 overview for the given text using configured TTS provider.

    Request body: { "text": str }
    """
    try:
        text = (payload or {}).get("text", "").strip()
        if not text:
            raise HTTPException(status_code=400, detail="text is required")

        provider = os.getenv("TTS_PROVIDER", "").lower()
        if provider != "azure":
            # For non-azure or missing provider, return 501 to indicate not implemented
            raise HTTPException(status_code=501, detail="TTS provider not configured or unsupported in this build. Set TTS_PROVIDER=azure.")

        # Lazy import to keep startup fast
        try:
            import azure.cognitiveservices.speech as speechsdk
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Azure TTS SDK not available: {e}")

        azure_key = os.getenv("AZURE_TTS_KEY", "").strip()
        azure_endpoint = os.getenv("AZURE_TTS_ENDPOINT", "").strip()
        if not azure_key or not azure_endpoint:
            raise HTTPException(status_code=500, detail="Azure TTS credentials not provided")

        speech_config = speechsdk.SpeechConfig(subscription=azure_key, endpoint=azure_endpoint)
        speech_config.set_speech_synthesis_output_format(speechsdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3)
        file_name = f"audio_{abs(hash(text))}.mp3"
        output_path = AUDIO_DIR / file_name
        audio_config = speechsdk.audio.AudioOutputConfig(filename=str(output_path))
        synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=audio_config)

        result = synthesizer.speak_text_async(text).get()
        if result.reason != speechsdk.ResultReason.SynthesizingAudioCompleted:
            raise HTTPException(status_code=500, detail="Audio synthesis failed")

        return {"audio_url": f"{AUDIOS_MOUNT}/{file_name}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate audio: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
