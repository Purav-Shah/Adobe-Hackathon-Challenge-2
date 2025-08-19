'use client'

import { useState, useMemo } from 'react'
import { FileText, Search, Filter, BookOpen, ChevronRight, Calendar, Hash } from 'lucide-react'

export default function UnifiedSectionsBrowser({ 
  uploadedDocuments, 
  onSectionClick, 
  onPDFSwitch,
  className = '' 
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDocument, setSelectedDocument] = useState('all')
  const [sortBy, setSortBy] = useState('relevance') // relevance, title, page, document

  if (!uploadedDocuments || uploadedDocuments.length === 0) {
    return (
      <div className={`bg-gray-800 rounded-xl border border-gray-700 p-6 text-center ${className}`}>
        <BookOpen className="mx-auto h-12 w-12 text-gray-500 mb-4" />
        <p className="text-gray-300">No documents uploaded yet</p>
        <p className="text-sm text-gray-400 mt-2">
          Upload some PDFs to see all sections
        </p>
      </div>
    )
  }

  // Collect all sections from all documents
  const allSections = useMemo(() => {
    const sections = []
    uploadedDocuments.forEach(doc => {
      if (doc.sections && Array.isArray(doc.sections)) {
        doc.sections.forEach(section => {
          sections.push({
            ...section,
            documentName: doc.filename,
            documentIndex: uploadedDocuments.findIndex(d => d.filename === doc.filename)
          })
        })
      }
    })
    return sections
  }, [uploadedDocuments])

  // Filter and sort sections
  const filteredSections = useMemo(() => {
    let filtered = allSections

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(section => 
        section.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        section.documentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        section.snippet?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by document
    if (selectedDocument !== 'all') {
      filtered = filtered.filter(section => 
        section.documentName === selectedDocument
      )
    }

    // Sort sections
    switch (sortBy) {
      case 'title':
        filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
        break
      case 'page':
        filtered.sort((a, b) => a.page - b.page)
        break
      case 'document':
        filtered.sort((a, b) => a.documentName.localeCompare(b.documentName))
        break
      case 'relevance':
      default:
        // Keep original order (relevance-based from backend)
        break
    }

    return filtered
  }, [allSections, searchTerm, selectedDocument, sortBy])

  const handleSectionClick = (section) => {
    if (onSectionClick) {
      onSectionClick(section)
    }
  }

  const handlePDFSwitch = (documentName) => {
    if (onPDFSwitch) {
      const doc = uploadedDocuments.find(d => d.filename === documentName)
      if (doc) {
        onPDFSwitch(doc)
      }
    }
  }

  const documentOptions = [
    { value: 'all', label: 'All Documents' },
    ...uploadedDocuments.map(doc => ({
      value: doc.filename,
      label: doc.filename
    }))
  ]

  const sortOptions = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'title', label: 'Title' },
    { value: 'page', label: 'Page' },
    { value: 'document', label: 'Document' }
  ]

  return (
    <div className={`bg-gray-800 rounded-xl border border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Hash className="h-5 w-5 text-adobe-red" />
            <h3 className="text-lg font-semibold text-white">All Sections</h3>
            <span className="chip bg-blue-900/50 text-blue-300 border-blue-700">
              {filteredSections.length} sections
            </span>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search sections by title, content, or document..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-adobe-red"
            />
          </div>

          {/* Filters Row */}
          <div className="flex space-x-3">
            {/* Document Filter */}
            <div className="flex-1">
              <select
                value={selectedDocument}
                onChange={(e) => setSelectedDocument(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-adobe-red"
              >
                {documentOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Filter */}
            <div className="flex-1">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-adobe-red"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    Sort by: {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Sections List */}
      <div className="max-h-96 overflow-y-auto">
        {filteredSections.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            {searchTerm || selectedDocument !== 'all' ? (
              <>
                <Search className="mx-auto h-8 w-8 mb-2" />
                <p>No sections match your filters</p>
                <p className="text-sm mt-1">Try adjusting your search or filters</p>
              </>
            ) : (
              <>
                <FileText className="mx-auto h-8 w-8 mb-2" />
                <p>No sections found</p>
                <p className="text-sm mt-1">Documents may not have been processed yet</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2 p-2">
            {filteredSections.map((section, index) => (
              <div
                key={`${section.documentName}-${section.page}-${index}`}
                className="p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors border border-gray-600 hover:border-adobe-red cursor-pointer"
                onClick={() => handleSectionClick(section)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-white mb-1 truncate">
                      {section.title || `Section ${section.page + 1}`}
                    </h4>
                    {section.snippet && (
                      <p className="text-sm text-gray-300 line-clamp-2">
                        {section.snippet}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 ml-2 flex-shrink-0" />
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center space-x-1">
                      <FileText className="h-3 w-3" />
                      <span className="truncate max-w-32">{section.documentName}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>Page {section.page + 1}</span>
                    </span>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handlePDFSwitch(section.documentName)
                    }}
                    className="text-xs text-adobe-red hover:text-red-400 hover:underline"
                  >
                    Switch to PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Footer */}
      <div className="p-3 bg-gray-700/50 border-t border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>
            Showing {filteredSections.length} of {allSections.length} sections
          </span>
          {searchTerm && (
            <span>
              Filtered by: "{searchTerm}"
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
