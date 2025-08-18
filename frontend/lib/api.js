import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 120000, // 2 minutes timeout for PDF processing
})

export const uploadPDFs = async (files) => {
  const formData = new FormData()
  files.forEach((file) => {
    formData.append('files', file)
  })
  
  try {
    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  } catch (error) {
    console.error('Upload API error:', error)
    throw new Error('Upload failed')
  }
}

export const analyzeCurrentPDF = async (documentName) => {
  try {
    const response = await api.post('/analyze-current', { document_name: documentName })
    return response.data
  } catch (error) {
    console.error('Analysis API error:', error)
    throw new Error('Analysis failed')
  }
}

export const getDocuments = async () => {
  try {
    const response = await api.get('/documents')
    return response.data
  } catch (error) {
    console.error('Documents API error:', error)
    throw new Error('Failed to fetch documents')
  }
}

export const getRelatedSections = async (documentName) => {
  try {
    const response = await api.get(`/related-sections/${documentName}`)
    return response.data
  } catch (error) {
    console.error('Related sections API error:', error)
    throw new Error('Failed to fetch related sections')
  }
}

export const getDocumentSections = async (documentName) => {
  try {
    const response = await api.get(`/sections/${documentName}`)
    return response.data
  } catch (error) {
    console.error('Document sections API error:', error)
    throw new Error('Failed to fetch document sections')
  }
}

export const healthCheck = async () => {
  try {
    const response = await api.get('/health')
    return response.data
  } catch (error) {
    console.error('Health check error:', error)
    throw new Error('Backend not available')
  }
}
