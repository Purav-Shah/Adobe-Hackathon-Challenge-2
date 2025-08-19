'use client'

import { useState } from 'react'
import { Lightbulb, Sparkles, Brain, Zap, Target, TrendingUp, BookOpen, MessageSquare } from 'lucide-react'
import { getInsights, generateAudio } from '../lib/api'

export default function EnhancedInsights({ selectedText, onGenerateAudio }) {
  const [insights, setInsights] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [audioUrl, setAudioUrl] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const generateInsights = async () => {
    if (!selectedText || selectedText.trim().length < 10) return
    
    setIsLoading(true)
    try {
      const result = await getInsights(selectedText, 5)
      setInsights(result.insights || [])
      setShowSuggestions(true)
    } catch (error) {
      console.error('Failed to generate insights:', error)
      setInsights([{ type: 'error', text: 'Failed to generate insights. Please try again.' }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateAudio = async () => {
    if (!selectedText || insights.length === 0) return
    
    try {
      const outline = insights.map(i => `- ${i.type}: ${i.text}`).join('\n')
      const prompt = `Overview based on selected text and related insights.\nSelected: ${selectedText}\n${outline}`
      const result = await generateAudio(prompt)
      setAudioUrl(result.audio_url)
      if (onGenerateAudio) onGenerateAudio(result.audio_url)
    } catch (error) {
      console.error('Audio generation failed:', error)
      alert('Audio generation failed. Please try again.')
    }
  }

  const insightIcons = {
    'key_takeaway': <Target className="h-4 w-4" />,
    'example': <BookOpen className="h-4 w-4" />,
    'connection': <TrendingUp className="h-4 w-4" />,
    'summary': <Brain className="h-4 w-4" />,
    'question': <MessageSquare className="h-4 w-4" />,
    'error': <Zap className="h-4 w-4" />
  }

  const insightColors = {
    'key_takeaway': 'bg-blue-900/30 text-blue-300 border-blue-700',
    'example': 'bg-green-900/30 text-green-300 border-green-700',
    'connection': 'bg-purple-900/30 text-purple-300 border-purple-700',
    'summary': 'bg-yellow-900/30 text-yellow-300 border-yellow-700',
    'question': 'bg-orange-900/30 text-orange-300 border-orange-700',
    'error': 'bg-red-900/30 text-red-300 border-red-700'
  }

  return (
    <div className="card fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full">
            <Lightbulb className="h-5 w-5 text-yellow-900" />
          </div>
          <h3 className="text-lg font-semibold text-white">AI Insights</h3>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            title="Toggle suggestions"
          >
            <Sparkles className="h-4 w-4 text-yellow-400" />
          </button>
        </div>
      </div>

      {!selectedText && (
        <div className="text-center py-8">
          <Lightbulb className="h-12 w-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">Select text in the PDF to generate AI insights</p>
        </div>
      )}

      {selectedText && (
        <div className="space-y-4">
          {/* Selected Text Display */}
          <div className="bg-gray-700 p-3 rounded-lg border border-gray-600">
            <div className="flex items-center space-x-2 mb-2">
              <Sparkles className="h-4 w-4 text-yellow-400" />
              <span className="text-sm font-medium text-gray-300">Selected Text</span>
            </div>
            <p className="text-sm text-gray-200">
              {selectedText.slice(0, 200)}{selectedText.length > 200 ? '...' : ''}
            </p>
          </div>

          {/* Generate Insights Button */}
          <button
            onClick={generateInsights}
            disabled={isLoading || !selectedText.trim()}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Generating Insights...</span>
              </>
            ) : (
              <>
                <Brain className="h-4 w-4" />
                <span>Generate AI Insights</span>
              </>
            )}
          </button>

          {/* Insights Display */}
          {insights.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-md font-semibold text-white flex items-center space-x-2">
                <Zap className="h-4 w-4 text-yellow-400" />
                <span>Generated Insights</span>
              </h4>
              
              <div className="space-y-2">
                {insights.map((insight, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${insightColors[insight.type] || 'bg-gray-700 text-gray-300 border-gray-600'}`}
                  >
                    <div className="flex items-start space-x-2">
                      <div className="mt-0.5">
                        {insightIcons[insight.type] || <Lightbulb className="h-4 w-4" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-xs font-medium capitalize bg-black/20 px-2 py-1 rounded">
                            {insight.type.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-sm">{insight.text}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Audio Generation */}
              <div className="pt-3 border-t border-gray-600">
                <button
                  onClick={handleGenerateAudio}
                  className="w-full bg-gradient-to-r from-adobe-red to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Generate Audio Summary</span>
                </button>
                
                {audioUrl && (
                  <div className="mt-3">
                    <audio controls src={audioUrl} className="w-full" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {showSuggestions && (
            <div className="bg-gray-700/50 p-3 rounded-lg border border-gray-600">
              <h5 className="text-sm font-medium text-gray-300 mb-2 flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-yellow-400" />
                <span>Suggested Questions</span>
              </h5>
              <div className="space-y-1 text-xs text-gray-400">
                <p>• "What are the main points here?"</p>
                <p>• "How does this relate to other content?"</p>
                <p>• "What are the key takeaways?"</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
