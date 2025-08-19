'use client'

import { useEffect, useRef, useState } from 'react'
import axios from 'axios'

const PDFViewer = ({ pdfUrl, onTextSelected, targetPage }) => {
  const viewerRef = useRef(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [viewerType, setViewerType] = useState('browser') // 'browser', 'pdfjs', 'iframe', 'adobe'
  const [clientId, setClientId] = useState('')
  const viewerApiRef = useRef(null)

  // Utility function to convert relative URLs to absolute backend URLs
  const getAbsoluteUrl = (url) => {
    if (url.startsWith('/files/')) {
      return `http://localhost:8000${url}`
    }
    return url
  }

  // Browser native PDF viewer (most reliable and fastest)
  const BrowserPDFViewer = () => {
    const absoluteUrl = getAbsoluteUrl(pdfUrl)
    const [isPdfLoading, setIsPdfLoading] = useState(true)

    return (
      <div className="w-full h-full">
        {/* Loading state */}
        {isPdfLoading && (
          <div className="flex items-center justify-center h-64 bg-gray-800 rounded-lg mb-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-adobe-red mx-auto mb-2"></div>
              <p className="text-sm text-gray-300">Loading PDF...</p>
            </div>
          </div>
        )}
        
        {/* Direct PDF link for immediate access */}
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {isPdfLoading ? 'Loading PDF...' : 'PDF loaded'}
          </span>
          <a 
            href={absoluteUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-adobe-red hover:text-red-400 hover:underline"
          >
            Open in new tab
          </a>
        </div>
        
        {/* Fast PDF display */}
        <iframe
          src={absoluteUrl}
          className="w-full h-full min-h-[600px] rounded-lg border border-gray-600"
          title="PDF Viewer"
          onLoad={() => {
            console.log('PDF loaded instantly in browser viewer')
            setIsPdfLoading(false)
          }}
          onError={() => {
            console.log('PDF failed to load in iframe')
            setIsPdfLoading(false)
          }}
          style={{ 
            background: 'white',
            border: 'none',
            display: isPdfLoading ? 'none' : 'block'
          }}
        />
        
        {/* Fallback for browsers that don't support iframe PDFs */}
        <div className="mt-2 text-center">
          <p className="text-xs text-gray-500">
            If PDF doesn't display, 
            <a 
              href={absoluteUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-adobe-red hover:text-red-400 hover:underline ml-1"
            >
              click here to open directly
            </a>
          </p>
        </div>
      </div>
    )
  }

  // Simple iframe fallback
  const IframePDFViewer = () => {
    const absoluteUrl = getAbsoluteUrl(pdfUrl)

    return (
      <div className="w-full h-full">
        <iframe
          src={absoluteUrl}
          className="w-full h-full min-h-[600px] border border-gray-600 rounded-lg"
          title="PDF Viewer"
          onLoad={() => console.log('PDF loaded in iframe')}
        />
      </div>
    )
  }

  // PDF.js viewer (most reliable alternative)
  const PDFJSViewer = () => {
    const canvasRef = useRef(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(0)
    const [scale, setScale] = useState(1.0)
    const [pdfjsError, setPdfjsError] = useState(null)

    useEffect(() => {
      if (!pdfUrl) return

      const loadPDFJS = async () => {
        try {
          setPdfjsError(null)
          
          // Load PDF.js from CDN
          const pdfjsLib = window['pdfjs-dist/build/pdf']
          if (!pdfjsLib) {
            const script = document.createElement('script')
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
            script.onload = () => loadPDFJS()
            document.head.appendChild(script)
            return
          }

          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

          // Convert relative URL to absolute backend URL
          const absoluteUrl = getAbsoluteUrl(pdfUrl)
          console.log('PDF.js loading from:', absoluteUrl)

          const loadingTask = pdfjsLib.getDocument(absoluteUrl)
          const pdf = await loadingTask.promise
          setTotalPages(pdf.numPages)

          const page = await pdf.getPage(currentPage)
          const viewport = page.getViewport({ scale })
          const canvas = canvasRef.current
          const context = canvas.getContext('2d')

          canvas.height = viewport.height
          canvas.width = viewport.width

          const renderContext = {
            canvasContext: context,
            viewport: viewport
          }

          await page.render(renderContext).promise
          console.log('PDF.js rendered successfully')
        } catch (error) {
          console.error('PDF.js error:', error)
          setPdfjsError(error.message)
          
          // If it's a network error, fallback to browser viewer
          if (error.message.includes('500') || error.message.includes('network')) {
            console.log('Falling back to browser viewer due to network error')
            setViewerType('browser')
          }
        }
      }

      loadPDFJS()
    }, [pdfUrl, currentPage, scale])

    const changePage = (delta) => {
      const newPage = currentPage + delta
      if (newPage >= 1 && newPage <= totalPages) {
        setCurrentPage(newPage)
      }
    }

    const changeScale = (delta) => {
      const newScale = Math.max(0.5, Math.min(3.0, scale + delta))
      setScale(newScale)
    }

    if (pdfjsError) {
      return (
        <div className="text-center py-8">
          <p className="text-red-400 mb-4">PDF.js Error: {pdfjsError}</p>
          <button
            onClick={() => setViewerType('browser')}
            className="bg-adobe-red text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Switch to Browser Viewer
          </button>
        </div>
      )
    }

    return (
      <div className="w-full h-full">
        <div className="mb-4 flex items-center justify-between bg-gray-700 p-2 rounded-lg">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => changePage(-1)}
              disabled={currentPage <= 1}
              className="px-3 py-1 bg-gray-600 text-white rounded disabled:bg-gray-800 disabled:text-gray-500"
            >
              ←
            </button>
            <span className="text-sm text-gray-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => changePage(1)}
              disabled={currentPage >= totalPages}
              className="px-3 py-1 bg-gray-600 text-white rounded disabled:bg-gray-800 disabled:text-gray-500"
            >
              →
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => changeScale(-0.2)}
              className="px-2 py-1 bg-gray-600 text-white rounded"
            >
              -
            </button>
            <span className="text-sm text-gray-300">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => changeScale(0.2)}
              className="px-2 py-1 bg-gray-600 text-white rounded"
            >
              +
            </button>
          </div>
        </div>
        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            className="border border-gray-600 rounded-lg shadow-lg"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        </div>
      </div>
    )
  }

  // Adobe PDF Embed API (fallback)
  const AdobePDFViewer = () => {
    useEffect(() => {
      if (!pdfUrl) return

      setIsLoading(true)
      setError(null)

      // Load Adobe PDF Embed API script
      const loadAdobeScript = () => {
        return new Promise((resolve, reject) => {
          if (window.AdobeDC && window.AdobeDC.View) {
            resolve()
            return
          }

          const script = document.createElement('script')
          script.src = 'https://acrobatservices.adobe.com/view-sdk/viewer.js'
          script.async = true
          
          script.onload = () => {
            let attempts = 0
            const maxAttempts = 50
            
            const checkAdobeDC = () => {
              attempts++
              if (window.AdobeDC && window.AdobeDC.View) {
                resolve()
              } else if (attempts < maxAttempts) {
                setTimeout(checkAdobeDC, 100)
              } else {
                reject(new Error('Adobe PDF Embed API failed to load'))
              }
            }
            checkAdobeDC()
          }
          
          script.onerror = () => {
            reject(new Error('Failed to load Adobe PDF Embed API'))
          }
          
          document.head.appendChild(script)
        })
      }

      const initializeViewer = async () => {
        try {
          await loadAdobeScript()
          
          const waitForElement = () => {
            return new Promise((resolve) => {
              const checkElement = () => {
                const element = document.getElementById('adobe-dc-view')
                if (element) {
                  resolve()
                } else {
                  setTimeout(checkElement, 100)
                }
              }
              checkElement()
            })
          }

          await waitForElement()
          
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
              initializeAdobeViewer()
            })
          } else {
            initializeAdobeViewer()
          }

          setIsLoading(false)
        } catch (error) {
          console.error('Error initializing Adobe PDF viewer:', error)
          setError(error.message)
          setIsLoading(false)
          setViewerType('browser') // Fallback to browser viewer
        }
      }

      const initializeAdobeViewer = () => {
        try {
          if (typeof window.AdobeDC !== 'undefined') {
            const adobeDCView = new window.AdobeDC.View({
              clientId: clientId || ''
            })

            const preview = adobeDCView.previewFile({
              content: { location: { url: pdfUrl } },
              metaData: { fileName: pdfUrl.split('/').pop() }
            }, { embedMode: 'IN_LINE', showDownloadPDF: false, showPrintPDF: false })

            adobeDCView.getAPIs().then((apis) => {
              viewerApiRef.current = apis
            }).catch(() => {})
          }
        } catch (error) {
          console.error('Adobe viewer initialization error:', error)
          setError('Adobe viewer failed to initialize')
          setViewerType('browser')
        }
      }

      initializeViewer()
    }, [pdfUrl, clientId])

    return (
      <div className="w-full h-full">
        <div 
          id="adobe-dc-view" 
          ref={viewerRef}
          className="w-full h-full min-h-[600px] border border-gray-600 rounded-lg"
        />
      </div>
    )
  }

  // Navigate to target page if requested and APIs available
  useEffect(() => {
    const apis = viewerApiRef.current
    if (!apis) return
    if (!targetPage || Number.isNaN(targetPage)) return
    try {
      apis.setCurrentPage(targetPage)
    } catch (e) {
      // ignore
    }
  }, [targetPage])

  // Basic text selection detection
  useEffect(() => {
    if (typeof onTextSelected !== 'function') return

    const handler = () => {
      try {
        const sel = window.getSelection && window.getSelection()
        const text = (sel && sel.toString()) || ''
        if (text && text.trim().length > 0) {
          onTextSelected(text.trim())
        }
      } catch (e) {
        // ignore
      }
    }

    document.addEventListener('mouseup', handler)
    document.addEventListener('keyup', handler)
    return () => {
      document.removeEventListener('mouseup', handler)
      document.removeEventListener('keyup', handler)
    }
  }, [onTextSelected])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-800 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-adobe-red mx-auto mb-4"></div>
          <p className="text-gray-300">Loading PDF viewer...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-800 rounded-lg">
        <div className="text-center">
          <p className="text-adobe-red mb-2">PDF Viewer Error</p>
          <p className="text-sm text-gray-300 mb-4">{error}</p>
          <div className="space-y-2">
            <button 
              onClick={() => setViewerType('browser')}
              className="text-adobe-red hover:underline block"
            >
              Use Browser PDF Viewer
            </button>
            <button 
              onClick={() => setViewerType('iframe')}
              className="text-green-400 hover:underline block"
            >
              Use Iframe Viewer
            </button>
            <a 
              href={pdfUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-purple-400 hover:underline block"
            >
              Open PDF in new tab
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Viewer type selector
  const ViewerSelector = () => (
    <div className="mb-4 p-3 bg-gray-700 rounded-lg border border-gray-600">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-300">PDF Viewer Type:</span>
        <div className="flex space-x-2">
          <button
            onClick={() => setViewerType('browser')}
            className={`px-3 py-1 text-xs rounded ${
              viewerType === 'browser' 
                ? 'bg-adobe-red text-white' 
                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
            }`}
            title="Fastest - loads immediately"
          >
            🚀 Browser
          </button>
          <button
            onClick={() => setViewerType('pdfjs')}
            className={`px-3 py-1 text-xs rounded ${
              viewerType === 'pdfjs' 
                ? 'bg-adobe-red text-white' 
                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
            }`}
            title="Advanced features, slower loading"
          >
            📄 PDF.js
          </button>
          <button
            onClick={() => setViewerType('iframe')}
            className={`px-3 py-1 text-xs rounded ${
              viewerType === 'iframe' 
                ? 'bg-adobe-red text-white' 
                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
            }`}
            title="Basic functionality"
          >
            🖼️ Iframe
          </button>
          <button
            onClick={() => setViewerType('adobe')}
            className={`px-3 py-1 text-xs rounded ${
              viewerType === 'adobe' 
                ? 'bg-adobe-red text-white' 
                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
            }`}
            title="Advanced features, requires API key"
          >
            🎨 Adobe
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-400">
        {viewerType === 'browser' && '🚀 Fastest - loads immediately, no processing delays'}
        {viewerType === 'pdfjs' && '📄 Advanced features with zoom & navigation, slower loading'}
        {viewerType === 'iframe' && '🖼️ Simple iframe viewer, basic functionality'}
        {viewerType === 'adobe' && '🎨 Adobe PDF Embed API with advanced features'}
      </p>
    </div>
  )

  return (
    <div className="w-full h-full">
      <ViewerSelector />
      
      {viewerType === 'browser' && <BrowserPDFViewer />}
      {viewerType === 'pdfjs' && <PDFJSViewer />}
      {viewerType === 'iframe' && <IframePDFViewer />}
      {viewerType === 'adobe' && <AdobePDFViewer />}
    </div>
  )
}

export default PDFViewer
