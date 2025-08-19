'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, MessageCircle, Bot, User, Lightbulb, Sparkles } from 'lucide-react'
import { chatWithLLM } from '../lib/api'

export default function ChatInterface({ selectedText, documentContext }) {
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toLocaleTimeString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await chatWithLLM(
        [...messages, userMessage],
        selectedText,
        documentContext
      )

      const assistantMessage = {
        role: 'assistant',
        content: response.response.choices[0].message.content,
        timestamp: new Date().toLocaleTimeString(),
        provider: response.response.provider
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}`,
        timestamp: new Date().toLocaleTimeString(),
        isError: true
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const suggestedQuestions = [
    "What are the main topics in this document?",
    "Can you summarize the key points?",
    "What are the important conclusions?",
    "How does this relate to other documents?",
    "What questions should I ask about this content?"
  ]

  const handleSuggestedQuestion = (question) => {
    setInputMessage(question)
    inputRef.current?.focus()
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-adobe-red to-red-700 hover:from-red-700 hover:to-red-800 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 group"
          title="Chat with AI Assistant"
        >
          <MessageCircle className="h-6 w-6" />
          <div className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs px-2 py-1 rounded-full font-bold animate-pulse">
            AI
          </div>
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 h-[500px] bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-adobe-red to-red-700 text-white p-4 rounded-t-2xl flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bot className="h-5 w-5" />
          <h3 className="font-semibold">AI Assistant</h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white/80 hover:text-white transition-colors"
        >
          ×
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Lightbulb className="h-12 w-12 text-yellow-400 mx-auto mb-3" />
            <h4 className="text-white font-medium mb-2">Ask me anything about your documents!</h4>
            <p className="text-gray-400 text-sm mb-4">
              I can help analyze content, find connections, and answer questions.
            </p>
            <div className="space-y-2">
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestedQuestion(question)}
                  className="block w-full text-left text-sm text-gray-300 hover:text-white hover:bg-gray-700 p-2 rounded-lg transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-adobe-red text-white'
                  : message.isError
                  ? 'bg-red-900/50 text-red-200 border border-red-700'
                  : 'bg-gray-700 text-white'
              }`}
            >
              <div className="flex items-center space-x-2 mb-1">
                {message.role === 'user' ? (
                  <User className="h-3 w-3" />
                ) : (
                  <Bot className="h-3 w-3" />
                )}
                <span className="text-xs opacity-70">
                  {message.role === 'user' ? 'You' : 'AI Assistant'}
                  {message.provider && ` (${message.provider})`}
                </span>
                <span className="text-xs opacity-50">{message.timestamp}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 text-white p-3 rounded-2xl">
              <div className="flex items-center space-x-2">
                <Bot className="h-3 w-3" />
                <span className="text-xs opacity-70">AI Assistant</span>
              </div>
              <div className="flex space-x-1 mt-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your documents..."
            className="flex-1 bg-gray-700 text-white border border-gray-600 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-adobe-red focus:border-transparent"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="bg-adobe-red hover:bg-red-700 disabled:bg-gray-600 text-white p-2 rounded-xl transition-colors disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        
        {selectedText && (
          <div className="mt-2 text-xs text-gray-400">
            <Sparkles className="inline h-3 w-3 mr-1" />
            Context: {selectedText.slice(0, 100)}{selectedText.length > 100 ? '...' : ''}
          </div>
        )}
      </div>
    </div>
  )
}
