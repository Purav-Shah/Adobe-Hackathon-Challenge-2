'use client'

import { useState } from 'react'
import { FileText, ChevronDown, ChevronUp, Search, BookOpen, Eye, ChevronRight } from 'lucide-react'

export default function PDFSwitcher({ 
  uploadedDocuments, 
  currentPDF, 
  onPDFSelect, 
  onSectionClick,
  className = '' 
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDocument, setSelectedDocument] = useState(null)

  if (!uploadedDocuments || uploadedDocuments.length === 0) {
    return null
  }

  const filteredDocuments = uploadedDocuments.filter(doc => 
    doc.filename.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const currentDoc = uploadedDocuments.find(doc => 
    doc.filename === currentPDF?.name
  )

  const handleDocumentSelect = (doc) => {
    setSelectedDocument(selectedDocument?.filename === doc.filename ? null : doc)
  }

  const handlePDFSwitch = (doc) => {
    onPDFSelect(doc)
    setSelectedDocument(null)
    setIsExpanded(false)
  }

  return (
    <div className={`bg-gray-800 rounded-xl border border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-5 w-5 text-adobe-red" />
            <h3 className="text-lg font-semibold text-white">Document Library</h3>
            <span className="chip bg-adobe-red/20 text-adobe-red border-adobe-red/30">
              {uploadedDocuments.length} PDFs
            </span>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
        </div>
        
        {/* Search */}
        <div className="mt-3 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-adobe-red"
          />
        </div>
      </div>

      {/* Document List */}
      {isExpanded && (
        <div className="max-h-96 overflow-y-auto">
          {filteredDocuments.length === 0 ? (
            <div className="p-4 text-center text-gray-400">
              No documents match your search
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {filteredDocuments.map((doc, index) => (
                <div key={index} className="space-y-2">
                  {/* Document Item */}
                  <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
                    <div className="flex items-center space-x-3 flex-1">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {doc.filename}
                        </p>
                        <p className="text-xs text-gray-400">
                          {doc.sections_count || 0} sections
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {currentDoc?.filename === doc.filename && (
                        <span className="chip bg-green-900/50 text-green-300 border-green-700 text-xs">
                          Current
                        </span>
                      )}
                      <button
                        onClick={() => handleDocumentSelect(doc)}
                        className="text-xs text-adobe-red hover:text-red-400 hover:underline"
                      >
                        {selectedDocument?.filename === doc.filename ? 'Hide' : 'Sections'}
                      </button>
                      <button
                        onClick={() => handlePDFSwitch(doc)}
                        className="btn-secondary text-xs px-2 py-1"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </button>
                    </div>
                  </div>

                  {/* Document Sections (expandable) */}
                  {selectedDocument?.filename === doc.filename && doc.sections && (
                    <div className="ml-6 space-y-1">
                      {doc.sections.map((section, sectionIndex) => (
                        <div
                          key={sectionIndex}
                          onClick={() => onSectionClick && onSectionClick(section, doc)}
                          className="flex items-center justify-between p-2 bg-gray-600 rounded cursor-pointer hover:bg-gray-500 transition-colors border border-gray-500 hover:border-adobe-red"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-200 truncate">
                              {section.title || `Section ${sectionIndex + 1}`}
                            </p>
                            <p className="text-xs text-gray-400">
                              Page {section.page + 1}
                            </p>
                          </div>
                          <ChevronRight className="h-3 w-3 text-gray-400" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Stats */}
      {!isExpanded && (
        <div className="p-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-adobe-red">
                {uploadedDocuments.length}
              </p>
              <p className="text-xs text-gray-400">Documents</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">
                {uploadedDocuments.reduce((total, doc) => total + (doc.sections_count || 0), 0)}
              </p>
              <p className="text-xs text-gray-400">Total Sections</p>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(true)}
            className="w-full mt-3 text-sm text-adobe-red hover:text-red-400 hover:underline"
          >
            Click to expand and browse documents
          </button>
        </div>
      )}
    </div>
  )
}
