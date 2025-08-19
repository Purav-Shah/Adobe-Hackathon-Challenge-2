'use client'

import { FileText, Link, TrendingUp } from 'lucide-react'

export default function RelatedSections({ relatedSections, uploadedDocuments, onJump }) {
  if (!relatedSections || relatedSections.length === 0) {
    return (
      <div className="card fade-in">
        <h3 className="text-lg font-semibold text-white mb-4">
          Related Sections
        </h3>
        <div className="text-center py-8">
          <TrendingUp className="mx-auto h-12 w-12 text-adobe-red mb-4" />
          <p className="text-gray-300">No related sections found</p>
          <p className="text-sm text-gray-400 mt-2">
            Upload some PDFs first to see related content
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="card fade-in">
      <h3 className="text-lg font-semibold text-white mb-4">
        Related Sections ({relatedSections.length})
      </h3>
      
      <div className="space-y-4">
        {relatedSections.map((section, index) => (
          <div key={index} className="p-4 bg-gray-700 rounded-xl border border-gray-600 hover:bg-gray-600 hover:border-red-500 transition-colors">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-white">
                  {section.source_document || section.document_name}
                </span>
              </div>
              <span className="chip">
                {section.similarity_score ? `${(section.similarity_score * 100).toFixed(0)}% match` : 'related'}
              </span>
            </div>
            
            <h4 className="font-medium text-white mb-2">
              {section.section_title || (section.sections?.[0]?.title || 'Section')}
            </h4>
            {section.snippet && (
              <p className="text-sm text-gray-200 mb-2">{section.snippet}</p>
            )}
            
            <p className="text-sm text-gray-300 mb-3">
              {section.relevance_explanation || 'Related section based on semantic similarity'}
            </p>
            
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Page {(section.page || 0) + 1}</span>
              <button onClick={() => onJump && onJump(section)} className="flex items-center space-x-1 text-adobe-red hover:text-red-400">
                <Link className="h-3 w-3" />
                <span>View</span>
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {uploadedDocuments.length > 0 && (
        <div className="mt-6 p-4 bg-red-900/20 rounded-xl border border-red-800">
          <h4 className="text-sm font-medium text-red-300 mb-2">
            Knowledge Base
          </h4>
          <p className="text-sm text-red-200">
            {uploadedDocuments.length} document(s) analyzed for related content
          </p>
        </div>
      )}
    </div>
  )
}
