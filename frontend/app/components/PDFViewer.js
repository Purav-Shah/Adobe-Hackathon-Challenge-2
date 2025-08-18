'use client'

import { useEffect, useRef, useState } from 'react'
import axios from 'axios'

const PDFViewer = ({ pdfUrl, onTextSelected, targetPage }) => {
  const viewerRef = useRef(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [useFallback, setUseFallback] = useState(false)
  const [clientId, setClientId] = useState('')
  const viewerApiRef = useRef(null)

  useEffect(() => {
    if (!pdfUrl) return

    setIsLoading(true)
    setError(null)

    // Load Adobe PDF Embed API script
    const loadAdobeScript = () => {
      return new Promise((resolve, reject) => {
        // Check if already loaded
        if (window.AdobeDC && window.AdobeDC.View) {
          resolve()
          return
        }

        const script = document.createElement('script')
        script.src = 'https://acrobatservices.adobe.com/view-sdk/viewer.js'
        script.async = true
        
        script.onload = () => {
          // Wait for AdobeDC to be available
          let attempts = 0
          const maxAttempts = 50 // 5 seconds max
          
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

    // Initialize viewer
    const initializeViewer = async () => {
      try {
        // Fetch config to get Adobe Embed API key at runtime
        try {
          const cfg = await axios.get('/api/config')
          setClientId(cfg.data?.adobe_embed_api_key || '')
        } catch (e) {
          console.warn('Config fetch failed, proceeding without Adobe key')
        }

        await loadAdobeScript()
        
        // Wait for DOM to be ready and element to exist
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
        
        // Wait for Adobe DC View SDK to be ready
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
      }
    }

    // Initialize Adobe viewer
    const initializeAdobeViewer = () => {
      try {
        // Check if Adobe DC View SDK is ready
        if (typeof window.AdobeDC !== 'undefined') {
          const adobeDCView = new window.AdobeDC.View({
            clientId: clientId || ''
          })

          // Use the correct div ID that exists in the DOM
          const preview = adobeDCView.previewFile({
            content: { location: { url: pdfUrl } },
            metaData: { fileName: pdfUrl.split('/').pop() }
          }, { embedMode: 'IN_LINE', showDownloadPDF: false, showPrintPDF: false })

          // Capture Viewer APIs for navigation
          adobeDCView.getAPIs().then((apis) => {
            viewerApiRef.current = apis
          }).catch(() => {})
        } else {
          // Wait for Adobe DC View SDK to be ready
          document.addEventListener('adobe_dc_view_sdk.ready', function() {
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
          })
        }
      } catch (error) {
        console.error('Adobe viewer initialization error:', error)
        setError('Adobe viewer failed to initialize')
      }
    }

    initializeViewer()
  }, [pdfUrl, clientId])

  // Basic text selection detection (best-effort; may not work inside embedded iframe)
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

  // Fallback viewer for when Adobe API fails
  if (useFallback) {
    return (
      <div className="w-full h-full">
        <iframe
          src={pdfUrl}
          className="w-full h-full min-h-[600px] border border-gray-300 rounded-lg"
          title="PDF Viewer"
        />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading PDF viewer...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
        <div className="text-center">
          <p className="text-red-500 mb-2">PDF Viewer Error</p>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <div className="space-y-2">
            <button 
              onClick={() => setUseFallback(true)}
              className="text-blue-500 hover:underline block"
            >
              Use Browser PDF Viewer
            </button>
            <a 
              href={pdfUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-green-500 hover:underline block"
            >
              Open PDF in new tab
            </a>
            <button 
              onClick={() => window.location.reload()}
              className="text-purple-500 hover:underline block"
            >
              Retry Adobe viewer
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full">
      <div 
        id="adobe-dc-view" 
        ref={viewerRef}
        className="w-full h-full min-h-[600px] border border-gray-300 rounded-lg"
      />
    </div>
  )
}

export default PDFViewer
