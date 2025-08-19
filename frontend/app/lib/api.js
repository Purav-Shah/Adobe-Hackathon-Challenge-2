import axios from 'axios'

// Configure axios base URL - use direct backend URL for now
const api = axios.create({
  baseURL: 'http://localhost:8000', // Direct backend URL
  timeout: 120000, // 2 minutes timeout for PDF processing
})

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url, config.data ? 'with data' : 'no data')
    return config
  },
  (error) => {
    console.error('API Request Error:', error)
    return Promise.reject(error)
  }
)

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url)
    return response
  },
  (error) => {
    console.error('API Response Error:', error.response?.status, error.response?.data, error.message)
    return Promise.reject(error)
  }
)

// Upload multiple PDFs
export const uploadPDFs = async (files) => {
  try {
    console.log('Starting upload for', files.length, 'files')
    
    const formData = new FormData()
    files.forEach(file => {
      formData.append('files', file)
      console.log('Added file to FormData:', file.name, file.size, 'bytes')
    })

    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 300000, // 5 minutes for large files
    })

    console.log('Upload successful:', response.data)
    return response.data
  } catch (error) {
    console.error('Upload API error:', error)
    
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Backend server is not running. Please start the backend server.')
    }
    
    if (error.code === 'ERR_NETWORK') {
      throw new Error('Network error. Please check your connection and ensure the backend is running.')
    }
    
    if (error.response?.status === 413) {
      throw new Error('File too large. Please try a smaller PDF file.')
    }
    
    if (error.response?.status === 500) {
      throw new Error(`Server error: ${error.response.data?.detail || 'Unknown server error'}`)
    }
    
    throw new Error(error.response?.data?.detail || `Upload failed: ${error.message}`)
  }
}

// Analyze current PDF and find related sections (server-side computation)
export const analyzeCurrentPDF = async (documentName) => {
  try {
    const response = await api.get(`/related-for-document/${documentName}`)
    return response.data
  } catch (error) {
    console.error('Analysis API error:', error)
    throw new Error(error.response?.data?.detail || 'Analysis failed')
  }
}

// Get list of uploaded documents
export const getDocuments = async () => {
  try {
    const response = await api.get('/documents')
    return response.data
  } catch (error) {
    console.error('Get documents API error:', error)
    throw new Error(error.response?.data?.detail || 'Failed to get documents')
  }
}

// Get related sections for a specific document
export const getRelatedSections = async (documentName, sectionText = null) => {
  try {
    const params = sectionText ? { section_text: sectionText } : {}
    const response = await api.get(`/related-sections/${documentName}`, { params })
    return response.data
  } catch (error) {
    console.error('Get related sections API error:', error)
    throw new Error(error.response?.data?.detail || 'Failed to get related sections')
  }
}

// Get related sections from all documents for current document
export const getRelatedSectionsForCurrent = async (currentDocumentName) => {
  try {
    const response = await api.get(`/related-for-document/${currentDocumentName}`)
    return response.data
  } catch (error) {
    console.error('Get related sections for current error:', error)
    throw new Error('Failed to get related sections')
  }
}

// Get sections from a specific document
export const getDocumentSections = async (documentName) => {
  try {
    const response = await api.get(`/sections/${documentName}`)
    return response.data
  } catch (error) {
    console.error('Get document sections API error:', error)
    throw new Error(error.response?.data?.detail || 'Failed to get document sections')
  }
}

// Health check
export const healthCheck = async () => {
  try {
    const response = await api.get('/health')
    return response.data
  } catch (error) {
    console.error('Health check API error:', error)
    throw new Error('Service unavailable')
  }
}

// Insights
export const getInsights = async (selectedText, topK = 5) => {
  try {
    const response = await api.post('/insights', { selected_text: selectedText, top_k: topK })
    return response.data
  } catch (error) {
    console.error('Insights API error:', error)
    throw new Error(error.response?.data?.detail || 'Failed to generate insights')
  }
}

// Audio generation
export const generateAudio = async (text) => {
  try {
    const response = await api.post('/audio', { text })
    return response.data
  } catch (error) {
    console.error('Audio API error:', error)
    throw new Error(error.response?.data?.detail || 'Failed to generate audio')
  }
}
