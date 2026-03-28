// src/components/TranscriptionDisplay.tsx
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FiCopy } from 'react-icons/fi'
import { TranscriptionResult } from '../types'
import { getConfidenceLabel } from '../utils/formatting'

interface TranscriptionDisplayProps {
  result: TranscriptionResult
  audioBlob: Blob
}

export const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({
  result,
  audioBlob,
}: TranscriptionDisplayProps) => {
  const [copied, setCopied] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string>('')

  useEffect(() => {
    const url = URL.createObjectURL(audioBlob)
    setAudioUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [audioBlob])

  const handleCopy = () => {
    navigator.clipboard.writeText(result.cleaned)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const highlightNumbers = (text: string) => {
    return text.split(/(\d+(?:\.\d{1,2})?|\₹\s*\d+)/g).map((part, idx) =>
      /^\d+(?:\.\d{1,2})?$/.test(part) || /^\₹\s*\d+$/.test(part) ? (
        <span key={idx} className="bg-warning bg-opacity-30 font-semibold text-dark px-1 rounded">
          {part}
        </span>
      ) : (
        <span key={idx}>{part}</span>
      )
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-light border border-neutral border-opacity-20 rounded-lg p-6 space-y-4"
    >
      {/* Confidence & Metadata */}
      <div className="flex items-center justify-between pb-4 border-b border-neutral border-opacity-10">
        <div>
          <p className="text-xs text-neutral mb-1">📍 Confidence</p>
          <p className="font-semibold text-dark">
            {getConfidenceLabel(result.confidence)}
          </p>
        </div>
        <div>
          <p className="text-xs text-neutral mb-1 text-right">⚡ Processing Time</p>
          <p className="font-semibold text-dark text-right">
            {result.processingTime}ms
          </p>
        </div>
        {result.usedFallback && (
          <div className="bg-warning bg-opacity-10 border border-warning border-opacity-30 rounded px-2 py-1">
            <p className="text-xs text-warning font-medium">Using Backup STT</p>
          </div>
        )}
      </div>

      {/* Original Transcript */}
      <div>
        <p className="text-xs text-neutral mb-2 font-medium">🎙️ Your Voice (Original)</p>
        <div className="bg-white rounded p-4 border border-neutral border-opacity-10">
          <p className="text-sm text-dark leading-relaxed italic">"{result.raw}"</p>
        </div>
      </div>

      {/* Cleaned Transcript with Highlights */}
      <div>
        <p className="text-xs text-neutral mb-2 font-medium">✨ Cleaned & Highlighted</p>
        <div className="bg-white rounded p-4 border border-neutral border-opacity-10">
          <p className="text-sm text-dark leading-relaxed">
            {highlightNumbers(result.cleaned)}
          </p>
        </div>
        <p className="text-xs text-neutral mt-2">
          🟠 Highlighted numbers are automatically detected for ledger extraction
        </p>
      </div>

      {/* Audio Playback */}
      <div>
        <p className="text-xs text-neutral mb-2 font-medium">🔊 Audio Playback</p>
        <div className="flex items-center gap-3 bg-white rounded p-3 border border-neutral border-opacity-10">
          <audio src={audioUrl} controls className="flex-1 h-10" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-neutral border-opacity-10">
        <button
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-2 bg-primary text-white rounded py-2 hover:bg-opacity-90 transition text-sm font-medium"
        >
          <FiCopy className="w-4 h-4" />
          {copied ? 'Copied!' : 'Copy Transcript'}
        </button>
      </div>
    </motion.div>
  )
}
