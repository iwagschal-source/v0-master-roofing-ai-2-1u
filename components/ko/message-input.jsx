"use client"

import { Paperclip, Mic, Send, X, FileText, Image as ImageIcon, File, Loader2 } from "lucide-react"
import { VoiceToggle } from "./voice-toggle"
import { useState, useRef } from "react"

/** @typedef {Object} MessageInputProps */

/** @param {Object} props */
export function MessageInput({
  onSubmit,
  onSubmitWithFiles,
  isRecording = false,
  onMicToggle,
  isVoiceEnabled = false,
  onToggleVoice,
  isThinking = false,
  onAttach,
  placeholder = "Ask KO…",
  disabled = false,
}) {

  const [inputValue, setInputValue] = useState("")
  const [attachedFiles, setAttachedFiles] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)

  // Handle file selection
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setIsUploading(true)

    const newFiles = []
    for (const file of files) {
      // Read file content for text files
      let content = null
      let preview = null

      if (file.type.startsWith('text/') ||
          file.name.endsWith('.csv') ||
          file.name.endsWith('.json') ||
          file.name.endsWith('.md')) {
        content = await file.text()
        preview = content.substring(0, 500) + (content.length > 500 ? '...' : '')
      } else if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file)
      }

      newFiles.push({
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        type: file.type,
        size: file.size,
        content,
        preview,
        file, // Keep original file for upload
      })
    }

    setAttachedFiles(prev => [...prev, ...newFiles])
    setIsUploading(false)

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFile = (fileId) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const getFileIcon = (file) => {
    if (file.type.startsWith('image/')) return <ImageIcon className="w-4 h-4" />
    if (file.name.endsWith('.csv') || file.name.endsWith('.json')) return <FileText className="w-4 h-4" />
    return <File className="w-4 h-4" />
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      console.log("Enter pressed")
      e.preventDefault()
      handleSubmit()
    }
  }

  /* const handleSubmit = () => {
    const text = inputValue.trim()
    if (!text) return

    // 1) render the user message immediately
    const userMessage = {
      id: crypto.randomUUID?.() ?? String(Date.now()),
      role: "user",
      content: text,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])

    // 2) trigger any "thinking" UI
    onSend && onSend()

    // 3) call API
    sendMessage(text)

    // 4) clear input
    setInputValue("")
  } */

  const handleSubmit = () => {
    const text = inputValue.trim()
    if (!text && attachedFiles.length === 0) return

    // If there are files, use the file-aware submit
    if (attachedFiles.length > 0 && onSubmitWithFiles) {
      onSubmitWithFiles(text, attachedFiles)
    } else if (text) {
      onSubmit?.(text)
    }

    setInputValue("")
    setAttachedFiles([])
  }

  const canSend = !disabled && (inputValue.trim().length > 0 || attachedFiles.length > 0)

  return (
    <div className="space-y-2">
      {/* Attached Files Preview */}
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 px-2">
          {attachedFiles.map(file => (
            <div
              key={file.id}
              className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-lg text-sm"
            >
              {getFileIcon(file)}
              <span className="text-foreground max-w-[150px] truncate">{file.name}</span>
              <span className="text-foreground-tertiary text-xs">{formatFileSize(file.size)}</span>
              <button
                onClick={() => removeFile(file.id)}
                className="text-foreground-secondary hover:text-foreground ml-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 bg-card rounded-xl px-4 py-3 border border-input hover:border-input-hover focus-within:border-input-hover transition-colors shadow-sm">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          accept=".csv,.json,.txt,.md,.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif"
          className="hidden"
        />

        {/* Attachment Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="text-foreground-secondary hover:text-foreground transition-colors disabled:opacity-50"
          aria-label="Attach file"
          title="Attach files (CSV, JSON, TXT, images, documents)"
        >
          {isUploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Paperclip className="w-5 h-5" />
          )}
        </button>

        {/* Text Input */}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={attachedFiles.length > 0 ? "Add a message about these files..." : placeholder}
          className="flex-1 bg-transparent outline-none text-foreground placeholder:text-foreground-secondary"
        />

        {/* Voice Toggle */}
        <VoiceToggle isActive={isVoiceEnabled} onToggle={onToggleVoice} />

        {/* Microphone Button */}
        <button
          onClick={() => onMicToggle?.()}
          className={`transition-colors ${isRecording ? "text-primary" : "text-foreground-secondary hover:text-foreground"}`}
          aria-label={isRecording ? "Stop recording and send" : "Start recording"}
        >
          <Mic className="w-5 h-5" />
        </button>

        {/* Send Button */}
        <button
          onClick={handleSubmit}
          disabled={!canSend}
          className="text-primary hover:text-primary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          aria-label="Send message"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
