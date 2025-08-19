'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, Search, BookOpen, X, ChevronRight, Hash, Library } from 'lucide-react'
import PDFViewer from './components/PDFViewer'
import RelatedSections from './components/RelatedSections'
import ChatInterface from './components/ChatInterface'
import EnhancedInsights from './components/EnhancedInsights'
import PDFSwitcher from './components/PDFSwitcher'
import UnifiedSectionsBrowser from './components/UnifiedSectionsBrowser'
import { uploadPDFs, uploadPDFsSimple, getDocumentSections, getRelatedSectionsForCurrent, getInsights, generateAudio } from './lib/api'

export default function Home() {
  const [uploadedDocuments, setUploadedDocuments] = useState([])
  const [currentPDF, setCurrentPDF] = useState(null)
  const [currentPDFUrl, setCurrentPDFUrl] = useState('')
  const [currentSections, setCurrentSections] = useState([])
  const [relatedSections, setRelatedSections] = useState([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [activeTab, setActiveTab] = useState('upload')
  const [selectedText, setSelectedText] = useState('')
  const [insights, setInsights] = useState([])
  const [audioUrl, setAudioUrl] = useState('')
  const [targetPage, setTargetPage] = useState(null)

  const onDrop = useCallback(async (acceptedFiles) => {
    try {
      const pdfFiles = acceptedFiles.filter(file => file.name.toLowerCase().endsWith('.pdf'))
      if (pdfFiles.length === 0) return

      console.log('Attempting to upload', pdfFiles.length, 'PDF files')
      
      // Test backend connection first
      try {
        const healthResponse = await fetch('http://localhost:8000/health')
        if (!healthResponse.ok) {
          throw new Error(`Backend health check failed: ${healthResponse.status}`)
        }
        console.log('Backend connection successful')
      } catch (healthError) {
        console.error('Backend connection failed:', healthError)
        alert('Cannot connect to backend server. Please ensure the backend is running on http://localhost:8000')
        return
      }

      // Use simple upload first for testing (no PDF processing)
      console.log('Using simple upload for testing...')
      const result = await uploadPDFsSimple(pdfFiles)
      setUploadedDocuments(prev => [...prev, ...result.files])
      
      // Automatically switch to viewer tab and load the first PDF
      if (result.files.length > 0) {
        setActiveTab('viewer')
        // Load the first uploaded PDF to show its sections
        const firstFile = acceptedFiles[0]
        handleCurrentPDFChange(firstFile)
      }
    } catch (error) {
      console.error('Upload failed:', error)
      
      // Show more specific error messages
      if (error.message.includes('Backend server is not running')) {
        alert('Backend server is not running. Please start the backend server first.')
      } else if (error.message.includes('Network error')) {
        alert('Network connection error. Please check your internet connection and ensure the backend is running.')
      } else if (error.message.includes('File too large')) {
        alert('The PDF file is too large. Please try a smaller file.')
      } else {
        alert(`Upload failed: ${error.message}`)
      }
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: true
  })

  const handleCurrentPDFChange = async (file) => {
    setCurrentPDF(file)
    setCurrentSections([])
    setRelatedSections([])

    try {
      setIsAnalyzing(true)
      
      // First upload the current PDF
      const uploadResult = await uploadPDFs([file])
      console.log('Upload result:', uploadResult)
      
      // Get the filename from the uploaded file
      const filename = file.name
      // Preview using backend-served URL so the viewer can fetch it (after upload)
      setCurrentPDFUrl(`/files/${encodeURIComponent(filename)}`)
      
      // Get sections for the current PDF
      const sectionsResult = await getDocumentSections(filename)
      setCurrentSections(sectionsResult.sections || [])
      
      // Get related sections from other documents
      const relatedResult = await getRelatedSectionsForCurrent(filename)
      setRelatedSections(relatedResult.related_sections || [])
      
      // Switch to viewer tab when changing PDFs
      setActiveTab('viewer')
      
    } catch (error) {
      console.error('Analysis failed:', error)
      alert('PDF analysis failed. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSectionClick = (section) => {
    // Scroll to section in PDF viewer
    // This would be implemented in the PDFViewer component
    console.log('Navigate to section:', section)
  }

  const handleTextSelected = async (text) => {
    try {
      const clean = (text || '').trim()
      setSelectedText(clean)
      setAudioUrl('')
      setInsights([])
      if (clean && clean.length > 10) {
        const result = await getInsights(clean, 5)
        setInsights(result.insights || [])
      }
    } catch (e) {
      console.error('Insights failed:', e)
    }
  }

  const handleRelatedJump = (item) => {
    try {
      const pageNum = (item.page || 0) + 1
      const url = `/files/${encodeURIComponent(item.source_document)}`
      setCurrentPDF({ name: item.source_document })
      setCurrentPDFUrl(url)
      setTargetPage(pageNum)
      setActiveTab('viewer')
    } catch (e) {
      console.error('Navigate failed:', e)
    }
  }

  const handlePDFSwitch = async (doc) => {
    try {
      // Create a file object from the document info
      const file = new File([], doc.filename, { type: 'application/pdf' })
      await handleCurrentPDFChange(file)
    } catch (e) {
      console.error('PDF switch failed:', e)
      alert('Failed to switch to the selected PDF. Please try again.')
    }
  }

  const handleGenerateAudio = async () => {
    try {
      if (!selectedText) return
      const outline = insights.map(i => `- ${i.type}: ${i.text}`).join('\n')
      const prompt = `Overview based on selected text and related insights.\nSelected: ${selectedText}\n${outline}`
      const result = await generateAudio(prompt)
      setAudioUrl(result.audio_url)
    } catch (e) {
      alert(e.message || 'Audio generation failed')
    }
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-adobe-black text-white border-b-4 border-adobe-red sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-adobe-red" />
              <h1 className="ml-3 text-xl font-semibold text-white">
                Adobe Hackathon Finale
              </h1>
            </div>
            <div className="text-sm text-gray-300">
              Intelligent PDF Reading Application
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-800/80 backdrop-blur p-1 rounded-xl mb-8 border border-gray-700 shadow-sm">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'upload'
                ? 'bg-red-900 text-white shadow border border-red-700'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Upload className="inline-block w-4 h-4 mr-2" />
            Upload Documents
          </button>
          <button
            onClick={() => setActiveTab('viewer')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'viewer'
                ? 'bg-red-900 text-white shadow border border-red-700'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            <FileText className="inline-block w-4 h-4 mr-2" />
            PDF Viewer
          </button>
          <button
            onClick={() => setActiveTab('sections')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'sections'
                ? 'bg-red-900 text-white shadow border border-red-700'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Hash className="inline-block w-4 h-4 mr-2" />
            All Sections
          </button>
        </div>

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className="space-y-6">
            <div className="card fade-in">
              <h2 className="text-lg font-semibold text-white mb-4">
                Upload Your PDF Documents
              </h2>
              <p className="text-gray-300 mb-6">
                Upload multiple PDFs to represent documents you've read in the past. 
                These will be analyzed to find related content when you read new documents.
              </p>
              
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center transition-colors ${
                  isDragActive
                    ? 'border-adobe-red bg-red-900/20'
                    : 'border-gray-500 hover:border-adobe-red bg-gray-800/50'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="mx-auto h-12 w-12 text-adobe-red" />
                <p className="mt-4 text-sm text-gray-300">
                  {isDragActive
                    ? 'Drop the PDFs here...'
                    : 'Drag and drop PDF files here, or click to select files'}
                </p>
                <p className="mt-2 text-xs text-gray-400">
                  Supports multiple PDF files
                </p>
              </div>
            </div>

            {/* Uploaded Documents List */}
            {uploadedDocuments.length > 0 && (
              <div className="card fade-in">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Uploaded Documents ({uploadedDocuments.length})
                </h3>
                
                {/* Sections Summary */}
                <div className="mb-4 p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                  <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span>Sections Summary</span>
                  </h4>
                  <div className="text-xs text-gray-400">
                    <p>Total sections extracted: <span className="text-white font-medium">
                      {uploadedDocuments.reduce((total, doc) => total + (doc.sections_count || 0), 0)}
                    </span></p>
                    <p>Documents processed: <span className="text-white font-medium">{uploadedDocuments.length}</span></p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {uploadedDocuments.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-xl">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-white">{doc.filename}</p>
                          <p className="text-xs text-gray-500">{doc.sections_count} sections extracted</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="chip bg-green-900/50 text-green-300 border-green-700">
                          {doc.status}
                        </span>
                        <button
                          onClick={() => {
                            setActiveTab('viewer')
                            // Find the file object to load
                            const fileInput = document.getElementById('pdf-upload')
                            if (fileInput && fileInput.files.length > 0) {
                              handleCurrentPDFChange(fileInput.files[0])
                            }
                          }}
                          className="text-xs text-adobe-red hover:text-red-400 hover:underline"
                        >
                          View Sections
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Quick Actions */}
                <div className="mt-4 p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Quick Actions:</h4>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setActiveTab('viewer')}
                      className="text-xs bg-adobe-red text-white px-3 py-1 rounded hover:bg-red-700 transition-colors"
                    >
                      Go to PDF Viewer
                    </button>
                    <button
                      onClick={() => setActiveTab('sections')}
                      className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                    >
                      Browse All Sections
                    </button>
                    <button
                      onClick={() => {
                        // Refresh sections for all documents
                        console.log('Refreshing sections for all documents...')
                      }}
                      className="text-xs bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-500 transition-colors"
                    >
                      Refresh Sections
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Viewer Tab */}
        {activeTab === 'viewer' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* PDF Viewer */}
            <div className="lg:col-span-2">
              <div className="card fade-in">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">PDF Viewer</h2>
                  <div className="flex space-x-2">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleCurrentPDFChange(file)
                      }}
                      className="hidden"
                      id="pdf-upload"
                    />
                    <label htmlFor="pdf-upload" className="btn-secondary cursor-pointer">
                      Open New PDF
                    </label>
                  </div>
                </div>

                {currentPDF ? (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-300">
                      <FileText className="h-4 w-4" />
                      <span>{currentPDF.name}</span>
                      {isAnalyzing && (
                        <span className="chip">
                          Analyzing...
                        </span>
                      )}
                    </div>
                    
                    <PDFViewer pdfUrl={currentPDFUrl} onTextSelected={handleTextSelected} targetPage={targetPage} />
                    
                    {/* Current Document Sections */}
                    {currentSections.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-md font-semibold text-white mb-3">
                          Document Sections
                        </h3>
                        <div className="space-y-2">
                          {currentSections.map((section, index) => (
                            <div
                              key={index}
                              onClick={() => handleSectionClick(section)}
                              className="flex items-center justify-between p-3 bg-gray-700 rounded-xl cursor-pointer hover:bg-gray-600 transition-colors border border-gray-600 hover:border-red-500"
                            >
                              <div>
                                <p className="text-sm font-medium text-white">{section.title}</p>
                                <p className="text-xs text-gray-400">Page {section.page + 1}</p>
                              </div>
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="mx-auto h-12 w-12 text-gray-500" />
                    <p className="mt-4 text-gray-300">No PDF selected</p>
                    <p className="text-sm text-gray-400">Upload a PDF to start reading</p>
                  </div>
                )}
              </div>
            </div>

            {/* Related Sections Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              <PDFSwitcher
                uploadedDocuments={uploadedDocuments}
                currentPDF={currentPDF}
                onPDFSelect={handlePDFSwitch}
                onSectionClick={(section, doc) => {
                  // Navigate to the section in the PDF
                  setCurrentPDF({ name: doc.filename })
                  setCurrentPDFUrl(`/files/${encodeURIComponent(doc.filename)}`)
                  setTargetPage(section.page + 1)
                }}
                className="mb-4"
              />

              <RelatedSections 
                relatedSections={relatedSections}
                uploadedDocuments={uploadedDocuments}
                onJump={handleRelatedJump}
              />

              <EnhancedInsights 
                selectedText={selectedText}
                onGenerateAudio={setAudioUrl}
              />
            </div>
          </div>
        )}

        {/* Sections Tab */}
        {activeTab === 'sections' && (
          <div className="space-y-6">
            <div className="card fade-in">
              <h2 className="text-lg font-semibold text-white mb-4">
                Browse All Document Sections
              </h2>
              <p className="text-gray-300 mb-6">
                Explore and search through all sections from all uploaded documents. 
                Find specific content, switch between PDFs, and navigate to relevant sections.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* PDF Switcher */}
              <div className="lg:col-span-1">
                <PDFSwitcher
                  uploadedDocuments={uploadedDocuments}
                  currentPDF={currentPDF}
                  onPDFSelect={handlePDFSwitch}
                  onSectionClick={(section, doc) => {
                    // Navigate to the section in the PDF
                    setCurrentPDF({ name: doc.filename })
                    setCurrentPDFUrl(`/files/${encodeURIComponent(doc.filename)}`)
                    setTargetPage(section.page + 1)
                    setActiveTab('viewer')
                  }}
                />
              </div>

              {/* Unified Sections Browser */}
              <div className="lg:col-span-2">
                <UnifiedSectionsBrowser
                  uploadedDocuments={uploadedDocuments}
                  onSectionClick={(section) => {
                    // Navigate to the section in the PDF
                    const doc = uploadedDocuments.find(d => d.filename === section.documentName)
                    if (doc) {
                      setCurrentPDF({ name: doc.filename })
                      setCurrentPDFUrl(`/files/${encodeURIComponent(doc.filename)}`)
                      setTargetPage(section.page + 1)
                      setActiveTab('viewer')
                    }
                  }}
                  onPDFSwitch={handlePDFSwitch}
                />
              </div>
            </div>
          </div>
        )}
      </main>
      
      {/* AI Chat Interface */}
      <ChatInterface 
        selectedText={selectedText}
        documentContext={currentPDF?.name || ''}
      />
    </div>
  )
}
