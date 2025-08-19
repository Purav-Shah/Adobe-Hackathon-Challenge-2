'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, Search, BookOpen, X, ChevronRight } from 'lucide-react'
import PDFViewer from './components/PDFViewer'
import RelatedSections from './components/RelatedSections'
import { uploadPDFs, getDocumentSections, getRelatedSectionsForCurrent, getInsights, generateAudio } from './lib/api'

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

      const result = await uploadPDFs(pdfFiles)
      setUploadedDocuments(prev => [...prev, ...result.files])
      
      // Switch to viewer tab after successful upload
      setActiveTab('viewer')
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Upload failed. Please try again.')
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
                <div className="space-y-3">
                  {uploadedDocuments.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-xl">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-white">{doc.filename}</p>
                          <p className="text-xs text-gray-400">{doc.sections_count} sections extracted</p>
                        </div>
                      </div>
                      <span className="chip bg-green-900/50 text-green-300 border-green-700">
                        {doc.status}
                      </span>
                    </div>
                  ))}
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
              <RelatedSections 
                relatedSections={relatedSections}
                uploadedDocuments={uploadedDocuments}
                onJump={handleRelatedJump}
              />

              <div className="card fade-in">
                <h3 className="text-lg font-semibold text-white mb-2">Insights</h3>
                {!selectedText && (
                  <p className="text-sm text-gray-300">Select text in the PDF to see insights.</p>
                )}
                {selectedText && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-200"><span className="font-medium">Selected:</span> {selectedText.slice(0, 180)}{selectedText.length>180?'…':''}</p>
                    <ul className="list-disc pl-5 space-y-1">
                      {insights.map((i, idx) => (
                        <li key={idx} className="text-sm text-gray-200">
                          <span className="font-medium capitalize">{i.type}:</span> {i.text}
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center space-x-2 pt-2">
                      <button onClick={handleGenerateAudio} className="btn-primary">Generate Audio Overview</button>
                      {audioUrl && (
                        <audio controls src={audioUrl} className="w-full" />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
