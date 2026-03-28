import React from 'react'
import { motion } from 'framer-motion'
import { FiMic, FiSquare, FiCheck, FiEdit2, FiX, FiRotateCcw } from 'react-icons/fi'
import { getAudioPermission, startRecording, stopRecording } from '../utils/audio'
import {
  processVoiceNarration,
  undoLastVoiceTransaction,
  type VoiceNarrationResult,
} from '../services/api'

interface AIVoiceScreenProps {
  userId: string
  userName: string
  onToggleSidebar: () => void
  language: 'EN' | 'HI'
}

type VoiceStage = 'idle' | 'listening' | 'processing' | 'understanding' | 'ready'

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: any) => void) | null
  onerror: ((event: any) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
  }
}

function getStageText(stage: VoiceStage, language: 'EN' | 'HI') {
  if (language === 'HI') {
    if (stage === 'listening') return 'Listening...'
    if (stage === 'processing') return 'Processing...'
    if (stage === 'understanding') return 'Understanding...'
    if (stage === 'ready') return 'Ready'
    return 'Tap mic to start'
  }

  if (stage === 'listening') return 'Listening...'
  if (stage === 'processing') return 'Processing...'
  if (stage === 'understanding') return 'Understanding...'
  if (stage === 'ready') return 'Ready'
  return 'Tap mic to start'
}

function buildResultSummary(result: VoiceNarrationResult, language: 'EN' | 'HI') {
  if (!result.transactions.length) {
    return language === 'EN' ? 'No transactions detected.' : 'कोई ट्रांजैक्शन नहीं मिला।'
  }

  const lines = [language === 'EN' ? '🧾 Transactions' : '🧾 ट्रांजैक्शन', '']

  result.transactions.forEach((tx) => {
    const approxTag = tx.approx ? ' ~' : ''
    lines.push(`• ${tx.item} -> ₹${Number(tx.total)}${approxTag}`)
  })

  lines.push('')
  lines.push(
    language === 'EN'
      ? `Total entries: ${result.transactions.length}`
      : `कुल एंट्री: ${result.transactions.length}`
  )

  return lines.join('\n')
}

export const AIVoiceScreen: React.FC<AIVoiceScreenProps> = ({ userId, userName, onToggleSidebar, language }) => {
  const [stage, setStage] = React.useState<VoiceStage>('idle')
  const [isListening, setIsListening] = React.useState(false)
  const [error, setError] = React.useState('')
  const [liveTranscript, setLiveTranscript] = React.useState('')
  const [rawTranscript, setRawTranscript] = React.useState('')
  const [normalizedTranscript, setNormalizedTranscript] = React.useState('')
  const [result, setResult] = React.useState<VoiceNarrationResult | null>(null)
  const [resultSummary, setResultSummary] = React.useState('')
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null)
  const [editableTranscript, setEditableTranscript] = React.useState('')
  const [isEditMode, setIsEditMode] = React.useState(false)
  const [waveform, setWaveform] = React.useState<number[]>(Array.from({ length: 20 }, () => 0.2))

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null)
  const animationRef = React.useRef<number | null>(null)
  const analyserRef = React.useRef<AnalyserNode | null>(null)
  const audioContextRef = React.useRef<AudioContext | null>(null)
  const audioRef = React.useRef<HTMLAudioElement | null>(null)

  React.useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      recognitionRef.current?.stop()
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (audioContextRef.current) {
        void audioContextRef.current.close()
      }
      audioRef.current?.pause()
    }
  }, [])

  const playReplyAudio = React.useCallback((nextUrl?: string | null) => {
    const cleanUrl = String(nextUrl || '').trim()
    if (!cleanUrl) {
      return
    }

    audioRef.current?.pause()
    const audio = new Audio(cleanUrl)
    audioRef.current = audio
    void audio.play().catch(() => {
      // Browser autoplay policy may block playback; controls remain available below.
    })
  }, [])

  const beginLiveRecognition = React.useCallback(() => {
    const RecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!RecognitionCtor) {
      return
    }

    const recognition = new RecognitionCtor()
    recognition.lang = language === 'HI' ? 'hi-IN' : 'en-IN'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event: any) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        interim += event.results[i][0].transcript
      }
      setLiveTranscript(interim.trim())
    }

    recognition.onerror = () => {
      // Silent fail: audio recording still works even if browser speech recognition fails.
    }

    recognition.onend = () => {
      if (isListening) {
        recognition.start()
      }
    }

    recognition.start()
    recognitionRef.current = recognition
  }, [isListening, language])

  const stopLiveRecognition = React.useCallback(() => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
  }, [])

  const startWaveform = React.useCallback((stream: MediaStream) => {
    const audioContext = new AudioContext()
    const source = audioContext.createMediaStreamSource(stream)
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)

    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    const draw = () => {
      analyser.getByteFrequencyData(dataArray)
      const chunk = Math.floor(dataArray.length / 20)
      const bars = Array.from({ length: 20 }, (_, index) => {
        const start = index * chunk
        const end = Math.min(start + chunk, dataArray.length)
        let sum = 0
        for (let i = start; i < end; i += 1) {
          sum += dataArray[i]
        }
        const avg = sum / Math.max(1, end - start)
        return Math.max(0.12, Math.min(1, avg / 180))
      })

      setWaveform(bars)
      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    analyserRef.current = analyser
    audioContextRef.current = audioContext
  }, [])

  const stopWaveform = React.useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    setWaveform(Array.from({ length: 20 }, () => 0.2))

    if (audioContextRef.current) {
      void audioContextRef.current.close()
      audioContextRef.current = null
    }

    analyserRef.current = null
  }, [])

  const submitVoice = React.useCallback(async (audioBlob?: Blob, transcript?: string, forceSave?: boolean) => {
    setError('')
    setStage('processing')

    try {
      await new Promise((resolve) => setTimeout(resolve, 300))
      setStage('understanding')

      const narration = await processVoiceNarration({
        audioBlob,
        transcript,
        userId: userId || undefined,
        languageHint: language === 'HI' ? 'hi' : 'en',
        forceSave,
      })

      setResult(narration)
      setRawTranscript(narration.rawTranscript)
      setNormalizedTranscript(narration.normalizedTranscript)
      setEditableTranscript(narration.rawTranscript)
      setResultSummary(buildResultSummary(narration, language))
      setAudioUrl(narration.audioUrl || null)
      setStage('ready')

      playReplyAudio(narration.audioUrl)

      if (narration.status === 'recorded') {
        window.dispatchEvent(
          new CustomEvent('voicetrack:transaction-saved', {
            detail: {
              userId,
              transcript: narration.rawTranscript,
              finalized: true,
            },
          })
        )
      }
    } catch {
      setError(language === 'EN' ? 'Could not process voice narration.' : 'वॉइस नैरेशन प्रोसेस नहीं हुआ।')
      setStage('idle')
    }
  }, [language, playReplyAudio, userId])

  const startListening = React.useCallback(async () => {
    if (isListening || stage === 'processing' || stage === 'understanding') {
      return
    }

    try {
      setError('')
      setLiveTranscript('')

      if (!streamRef.current) {
        streamRef.current = await getAudioPermission()
      }

      const recorder = startRecording(streamRef.current)
      mediaRecorderRef.current = recorder

      recorder.onstart = () => {
        setIsListening(true)
        setStage('listening')
      }

      recorder.start()
      beginLiveRecognition()
      startWaveform(streamRef.current)
    } catch {
      setError(language === 'EN' ? 'Please allow microphone access.' : 'कृपया माइक्रोफोन एक्सेस दें।')
    }
  }, [beginLiveRecognition, isListening, language, stage, startWaveform])

  const stopListening = React.useCallback(async () => {
    if (!mediaRecorderRef.current) {
      return
    }

    try {
      stopLiveRecognition()
      stopWaveform()
      setIsListening(false)

      const blob = await stopRecording(mediaRecorderRef.current)
      mediaRecorderRef.current = null

      await submitVoice(blob, undefined, false)
    } catch {
      setError(language === 'EN' ? 'Audio capture failed. Try again.' : 'ऑडियो कैप्चर विफल रहा। फिर प्रयास करें।')
      setStage('idle')
      setIsListening(false)
    }
  }, [language, stopLiveRecognition, stopWaveform, submitVoice])

  const handleConfirmAll = async () => {
    if (!result) {
      return
    }

    await submitVoice(undefined, result.rawTranscript, true)
  }

  const handleEditSubmit = async () => {
    if (!editableTranscript.trim()) {
      return
    }

    setIsEditMode(false)
    await submitVoice(undefined, editableTranscript.trim(), false)
  }

  const handleCancel = () => {
    setResult(null)
    setRawTranscript('')
    setNormalizedTranscript('')
    setResultSummary('')
    setAudioUrl(null)
    setEditableTranscript('')
    setIsEditMode(false)
    setStage('idle')
  }

  const handleUndoLast = async () => {
    try {
      await undoLastVoiceTransaction({ userId })
      setError(language === 'EN' ? 'Last transaction undone.' : 'आखिरी ट्रांजैक्शन हटाया गया।')
    } catch {
      setError(language === 'EN' ? 'Nothing to undo right now.' : 'अभी हटाने के लिए कुछ नहीं है।')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-screen bg-app-gradient flex flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between px-6 pt-10 pb-4">
        <button
          onClick={onToggleSidebar}
          className="w-11 h-11 rounded-full bg-[#EFEBE4] flex items-center justify-center shadow-sm"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className="text-xs uppercase tracking-[0.22em] text-[#1A1A1A]/60 font-bold">
          VoiceTrace Assistant
        </div>

        <button
          onClick={() => void handleUndoLast()}
          className="w-11 h-11 rounded-full bg-[#EFEBE4] flex items-center justify-center shadow-sm"
          title="Undo last transaction"
        >
          <FiRotateCcw className="text-[#1A1A1A]" />
        </button>
      </div>

      <div className="px-6 pb-5">
        <div className="glass-card rounded-3xl p-6 border border-white/50">
          <h2 className="text-2xl font-semibold text-[#1A1A1A]">
            {language === 'EN' ? `Hi ${userName || 'there'}` : `नमस्ते ${userName || 'दोस्त'}`}
          </h2>
          <p className="text-sm text-[#1A1A1A]/60 mt-1">
            {language === 'EN'
              ? 'Speak naturally for up to 3 minutes. I will understand and extract all entries.'
              : '3 मिनट तक सामान्य तरीके से बोलें। मैं समझकर सभी एंट्री निकाल दूँगा।'}
          </p>

          <div className="mt-4 flex items-center gap-2">
            <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-white/70 border border-white/70 text-[#1A1A1A]/70">
              {getStageText(stage, language)}
            </span>
            <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-white/70 border border-white/70 text-[#1A1A1A]/70">
              {result ? `Confidence ${(result.overallConfidence * 100).toFixed(0)}%` : 'No result yet'}
            </span>
          </div>

          <div className="mt-6 rounded-2xl bg-[#12100F] border border-white/10 p-5">
            <div className="h-20 flex items-end gap-[4px]">
              {waveform.map((bar, idx) => (
                <motion.div
                  key={idx}
                  animate={{ height: `${Math.max(8, Math.round(bar * 70))}px` }}
                  transition={{ duration: 0.12 }}
                  className="flex-1 rounded-full bg-gradient-to-t from-[#F85F54] via-[#F9A26A] to-[#FDE3AE]"
                />
              ))}
            </div>

            <div className="mt-5 flex justify-center">
              <motion.button
                whileTap={stage === 'processing' || stage === 'understanding' ? {} : { scale: 0.93 }}
                whileHover={stage === 'processing' || stage === 'understanding' ? {} : { scale: 1.04 }}
                onClick={isListening ? () => void stopListening() : () => void startListening()}
                disabled={stage === 'processing' || stage === 'understanding'}
                className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-colors ${
                  stage === 'processing' || stage === 'understanding'
                    ? 'bg-[#2B2725] cursor-not-allowed'
                    : 'bg-[#F85F54]'
                }`}
              >
                {stage === 'processing' || stage === 'understanding' ? (
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : isListening ? (
                  <FiSquare className="text-white w-10 h-10" fill="white" />
                ) : (
                  <FiMic className="text-white w-10 h-10" />
                )}
              </motion.button>
            </div>
          </div>

          <div className="mt-4 grid md:grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/60 border border-white/60 p-4">
              <p className="text-xs uppercase tracking-wide text-[#1A1A1A]/55 font-semibold mb-1">
                Live Transcript
              </p>
              <p className="text-sm text-[#1A1A1A]/80 min-h-[56px]">
                {liveTranscript || (language === 'EN' ? 'Start speaking to see live text...' : 'लाइव टेक्स्ट देखने के लिए बोलना शुरू करें...')}
              </p>
            </div>

            <div className="rounded-2xl bg-white/60 border border-white/60 p-4">
              <p className="text-xs uppercase tracking-wide text-[#1A1A1A]/55 font-semibold mb-1">
                Raw Transcript
              </p>
              <p className="text-sm text-[#1A1A1A]/80 min-h-[56px]">
                {rawTranscript || (language === 'EN' ? 'Recorded transcript appears here.' : 'रिकॉर्डेड ट्रांसक्रिप्ट यहां दिखेगा।')}
              </p>
            </div>
          </div>

          {!!normalizedTranscript && (
            <div className="mt-3 rounded-2xl bg-[#FAF7F2] border border-[#E7DED3] p-4">
              <p className="text-xs uppercase tracking-wide text-[#1A1A1A]/55 font-semibold mb-1">Normalized Transcript</p>
              <p className="text-sm text-[#1A1A1A]/80">{normalizedTranscript}</p>
            </div>
          )}

          {!!resultSummary && (
            <div className="mt-3 rounded-2xl bg-[#141111] border border-white/10 p-4 text-[#F9F3EA] whitespace-pre-line text-sm">
              {resultSummary}
            </div>
          )}

          {!!audioUrl && (
            <div className="mt-3 rounded-2xl bg-white/70 border border-white/70 p-3">
              <p className="text-xs uppercase tracking-wide text-[#1A1A1A]/55 font-semibold mb-2">Speech Output</p>
              <audio src={audioUrl} controls className="w-full" />
            </div>
          )}

          {result?.status === 'needs_confirmation' && (
            <div className="mt-3 rounded-2xl bg-[#FFF6E8] border border-[#F3D8A4] p-4">
              <p className="text-sm text-[#6A4A10] font-medium">
                {result.confirmationMessage || (language === 'EN' ? 'I may have misunderstood. Please confirm.' : 'शायद मैं गलत समझा। कृपया पुष्टि करें।')}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => void handleConfirmAll()}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1D8B57] text-white text-sm"
                >
                  <FiCheck /> Confirm All
                </button>
                <button
                  onClick={() => setIsEditMode(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0F172A] text-white text-sm"
                >
                  <FiEdit2 /> Edit
                </button>
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#D64545] text-white text-sm"
                >
                  <FiX /> Cancel
                </button>
              </div>
            </div>
          )}

          {isEditMode && (
            <div className="mt-3 rounded-2xl bg-white/75 border border-white/70 p-4">
              <p className="text-sm font-semibold text-[#1A1A1A] mb-2">Edit Narration</p>
              <textarea
                value={editableTranscript}
                onChange={(event) => setEditableTranscript(event.target.value)}
                className="w-full min-h-[96px] rounded-lg border border-[#D6CDC1] px-3 py-2 text-sm bg-white"
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => void handleEditSubmit()}
                  className="px-3 py-2 rounded-lg bg-[#1D8B57] text-white text-sm"
                >
                  Re-parse
                </button>
                <button
                  onClick={() => setIsEditMode(false)}
                  className="px-3 py-2 rounded-lg bg-[#111827] text-white text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {!!error && (
            <p className="mt-3 text-sm font-semibold text-[#C0392B]">
              {error}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
