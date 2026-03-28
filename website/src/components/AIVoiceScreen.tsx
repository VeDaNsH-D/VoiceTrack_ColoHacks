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
  if (stage === 'listening') return language === 'EN' ? 'Listening…' : 'सुन रहा हूँ…'
  if (stage === 'processing') return language === 'EN' ? 'Processing…' : 'प्रोसेस हो रहा है…'
  if (stage === 'understanding') return language === 'EN' ? 'Understanding…' : 'समझ रहा हूँ…'
  if (stage === 'ready') return language === 'EN' ? 'Done ✓' : 'हो गया ✓'
  return language === 'EN' ? 'Tap to record' : 'रिकॉर्ड करने के लिए टैप करें'
}

function buildResultSummary(result: VoiceNarrationResult, language: 'EN' | 'HI') {
  if (!result.transactions.length) {
    return language === 'EN' ? 'No transactions detected.' : 'कोई ट्रांजैक्शन नहीं मिला।'
  }
  const lines = [language === 'EN' ? '🧾 Transactions' : '🧾 ट्रांजैक्शन', '']
  result.transactions.forEach(tx => {
    lines.push(`• ${tx.item} → ₹${Number(tx.total)}${tx.approx ? ' ~' : ''}`)
  })
  lines.push('', language === 'EN' ? `Total: ${result.transactions.length} entries` : `कुल: ${result.transactions.length} एंट्री`)
  return lines.join('\n')
}

export const AIVoiceScreen: React.FC<AIVoiceScreenProps> = ({ userId, userName, onToggleSidebar, language }) => {
  const MAX_RECORDING_MS = 180000
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
  const [waveform, setWaveform] = React.useState<number[]>(Array.from({ length: 28 }, () => 0.15))

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null)
  const animationRef = React.useRef<number | null>(null)
  const analyserRef = React.useRef<AnalyserNode | null>(null)
  const audioContextRef = React.useRef<AudioContext | null>(null)
  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const autoStopTimerRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    return () => {
      if (autoStopTimerRef.current) window.clearTimeout(autoStopTimerRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
      recognitionRef.current?.stop()
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      if (audioContextRef.current) void audioContextRef.current.close()
      audioRef.current?.pause()
    }
  }, [])

  const clearAutoStopTimer = React.useCallback(() => {
    if (autoStopTimerRef.current) {
      window.clearTimeout(autoStopTimerRef.current)
      autoStopTimerRef.current = null
    }
  }, [])

  const playReplyAudio = React.useCallback((nextUrl?: string | null) => {
    const cleanUrl = String(nextUrl || '').trim()
    if (!cleanUrl) return
    audioRef.current?.pause()
    const audio = new Audio(cleanUrl)
    audioRef.current = audio
    void audio.play().catch(() => {})
  }, [])

  const beginLiveRecognition = React.useCallback(() => {
    const RecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!RecognitionCtor) return
    const recognition = new RecognitionCtor()
    recognition.lang = language === 'HI' ? 'hi-IN' : 'en-IN'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.onresult = (event: any) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) interim += event.results[i][0].transcript
      setLiveTranscript(interim.trim())
    }
    recognition.onerror = () => {}
    recognition.onend = () => { if (isListening) recognition.start() }
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
      const chunk = Math.floor(dataArray.length / 28)
      const bars = Array.from({ length: 28 }, (_, idx) => {
        const start = idx * chunk
        const end = Math.min(start + chunk, dataArray.length)
        let sum = 0
        for (let i = start; i < end; i++) sum += dataArray[i]
        const avg = sum / Math.max(1, end - start)
        return Math.max(0.08, Math.min(1, avg / 160))
      })
      setWaveform(bars)
      animationRef.current = requestAnimationFrame(draw)
    }
    draw()
    analyserRef.current = analyser
    audioContextRef.current = audioContext
  }, [])

  const stopWaveform = React.useCallback(() => {
    if (animationRef.current) { cancelAnimationFrame(animationRef.current); animationRef.current = null }
    setWaveform(Array.from({ length: 28 }, () => 0.15))
    if (audioContextRef.current) { void audioContextRef.current.close(); audioContextRef.current = null }
    analyserRef.current = null
  }, [])

  const submitVoice = React.useCallback(async (audioBlob?: Blob, transcript?: string, forceSave?: boolean) => {
    setError('')
    setStage('processing')
    try {
      await new Promise(r => setTimeout(r, 300))
      setStage('understanding')
      const narration = await processVoiceNarration({ audioBlob, transcript, userId: userId || undefined, languageHint: language === 'HI' ? 'hi' : 'en', forceSave })
      setResult(narration)
      setRawTranscript(narration.rawTranscript)
      setNormalizedTranscript(narration.normalizedTranscript)
      setEditableTranscript(narration.rawTranscript)
      setResultSummary(buildResultSummary(narration, language))
      setAudioUrl(narration.audioUrl || null)
      setStage('ready')
      playReplyAudio(narration.audioUrl)
      if (narration.status === 'recorded') {
        window.dispatchEvent(new CustomEvent('voicetrack:transaction-saved', { detail: { userId, transcript: narration.rawTranscript, finalized: true } }))
      }
    } catch {
      setError(language === 'EN' ? 'Could not process voice narration.' : 'वॉइस नैरेशन प्रोसेस नहीं हुआ।')
      setStage('idle')
    }
  }, [language, playReplyAudio, userId])

  const startListening = React.useCallback(async () => {
    if (isListening || stage === 'processing' || stage === 'understanding') return
    try {
      setError('')
      setLiveTranscript('')
      if (!streamRef.current) streamRef.current = await getAudioPermission()
      const recorder = startRecording(streamRef.current)
      mediaRecorderRef.current = recorder
      recorder.onstart = () => { setIsListening(true); setStage('listening') }
      recorder.start()
      autoStopTimerRef.current = window.setTimeout(() => {
        void stopListening()
      }, MAX_RECORDING_MS)
      beginLiveRecognition()
      startWaveform(streamRef.current)
    } catch {
      setError(language === 'EN' ? 'Please allow microphone access.' : 'कृपया माइक्रोफोन एक्सेस दें।')
    }
  }, [beginLiveRecognition, isListening, language, stage, startWaveform])

  const stopListening = React.useCallback(async () => {
    if (!mediaRecorderRef.current) return
    try {
      clearAutoStopTimer()
      stopLiveRecognition()
      stopWaveform()
      setIsListening(false)
      const blob = await stopRecording(mediaRecorderRef.current)
      mediaRecorderRef.current = null
      await submitVoice(blob, undefined, false)
    } catch {
      setError(language === 'EN' ? 'Audio capture failed. Try again.' : 'ऑडियो कैप्चर विफल रहा।')
      setStage('idle')
      setIsListening(false)
    }
  }, [clearAutoStopTimer, language, stopLiveRecognition, stopWaveform, submitVoice])

  const handleConfirmAll = async () => { if (result) await submitVoice(undefined, result.rawTranscript, true) }
  const handleEditSubmit = async () => { if (!editableTranscript.trim()) return; setIsEditMode(false); await submitVoice(undefined, editableTranscript.trim(), false) }
  const handleCancel = () => { setResult(null); setRawTranscript(''); setNormalizedTranscript(''); setResultSummary(''); setAudioUrl(null); setEditableTranscript(''); setIsEditMode(false); setStage('idle') }
  const handleUndoLast = async () => {
    try { await undoLastVoiceTransaction({ userId }); setError(language === 'EN' ? 'Last transaction undone.' : 'आखिरी ट्रांजैक्शन हटाया गया।') }
    catch { setError(language === 'EN' ? 'Nothing to undo right now.' : 'अभी हटाने के लिए कुछ नहीं।') }
  }

  const isBusy = stage === 'processing' || stage === 'understanding'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full bg-transparent flex flex-col overflow-hidden relative"
    >
      {/* ── Top Bar ──────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 pt-6 pb-3 flex-shrink-0 z-10">
        <button
          onClick={onToggleSidebar}
          className="w-11 h-11 rounded-full glass-card flex items-center justify-center shadow-sm"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 border border-white/70 shadow-sm">
          <div className="w-5 h-5 text-[#1A1A1A]">
            <svg viewBox="0 0 100 100" fill="none">
              <path d="M20 20 H50 V60 C50 71 41 80 30 80 C24.47 80 20 75.53 20 70 V20 Z" fill="currentColor" />
              <path d="M50 45 C66.56 45 80 58.44 80 75 C80 91.56 66.56 100 50 100 V45 Z" fill="currentColor" />
            </svg>
          </div>
          <span className="text-[12px] font-bold text-[#1A1A1A]/60 tracking-wide uppercase">
            {language === 'EN' ? 'Voice Ledger' : 'वॉयस लेजर'}
          </span>
        </div>

        <button
          onClick={() => void handleUndoLast()}
          className="w-11 h-11 rounded-full glass-card flex items-center justify-center shadow-sm"
          title="Undo last"
        >
          <FiRotateCcw size={16} className="text-[#1A1A1A]/70" />
        </button>
      </div>

      {/* ── Scrollable Content ────────────────────────── */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-5 pb-10 space-y-4">

        {/* Greeting Card */}
        <div className="glass-card p-5">
          <h2 className="text-[22px] font-extrabold tracking-tight text-[#1A1A1A] leading-tight">
            {language === 'EN' ? `Hi, ${userName || 'there'} 👋` : `नमस्ते, ${userName || 'दोस्त'} 👋`}
          </h2>
          <p className="text-[13.5px] text-[#1A1A1A]/50 font-medium mt-1 leading-relaxed">
            {language === 'EN'
              ? "Speak naturally for up to 3 minutes. I'll extract all entries."
              : '3 मिनट तक सामान्य रूप से बोलें। मैं सभी एंट्री निकाल दूँगा।'}
          </p>

          <div className="flex items-center gap-2 mt-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 border border-white/70">
              <div className={`status-dot ${isBusy ? 'status-dot-processing' : isListening ? 'status-dot-active' : 'bg-[#1A1A1A]/20'}`} />
              <span className="text-[11.5px] font-bold text-[#1A1A1A]/60">{getStageText(stage, language)}</span>
            </div>
            {result && (
              <div className="px-3 py-1.5 rounded-full bg-[#8A9B80]/12 border border-[#8A9B80]/20">
                <span className="text-[11.5px] font-bold text-[#5c7255]">
                  {`${(result.overallConfidence * 100).toFixed(0)}% confidence`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Waveform + Mic Panel */}
        <div className="card-dark p-5 rounded-[24px]">
          {/* Waveform */}
          <div className="h-[72px] flex items-end gap-[3px] mb-6">
            {waveform.map((bar, idx) => (
              isListening ? (
                <motion.div
                  key={idx}
                  animate={{ height: `${Math.max(6, Math.round(bar * 64))}px` }}
                  transition={{ duration: 0.1 }}
                  className="flex-1 rounded-full bg-gradient-to-t from-[#F85F54] via-[#F9A26A] to-[#FDE3AE]"
                />
              ) : (
                <div
                  key={idx}
                  className="flex-1 rounded-full bg-white/10 waveform-bar-idle"
                  style={{
                    height: `${12 + Math.sin(idx * 0.6) * 8}px`,
                    '--duration': `${1.2 + (idx % 5) * 0.18}s`,
                    '--delay': `${(idx % 7) * 0.1}s`,
                  } as React.CSSProperties}
                />
              )
            ))}
          </div>

          {/* Mic button */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              {isListening && (
                <>
                  <div className="absolute inset-0 rounded-full bg-[#F85F54]/25 animate-ping" style={{ animationDuration: '1.2s' }} />
                  <div className="absolute -inset-3 rounded-full bg-[#F85F54]/12 animate-ping" style={{ animationDuration: '1.8s', animationDelay: '0.3s' }} />
                </>
              )}
              <motion.button
                whileTap={isBusy ? {} : { scale: 0.94 }}
                whileHover={isBusy ? {} : { scale: 1.05 }}
                onClick={isListening ? () => void stopListening() : () => void startListening()}
                disabled={isBusy}
                className={`relative w-[88px] h-[88px] rounded-full flex items-center justify-center shadow-2xl transition-colors ${
                  isBusy ? 'bg-white/10 cursor-not-allowed' : isListening ? 'bg-[#F85F54]' : 'bg-[#F85F54]'
                }`}
              >
                {isBusy ? (
                  <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : isListening ? (
                  <FiSquare className="text-white w-9 h-9" fill="white" />
                ) : (
                  <FiMic className="text-white w-9 h-9" />
                )}
              </motion.button>
            </div>
            <p className="text-[12px] text-white/40 font-semibold tracking-wide">
              {isListening
                ? (language === 'EN' ? 'Tap to stop' : 'रोकने के लिए टैप करें')
                : isBusy
                  ? (language === 'EN' ? 'Please wait…' : 'कृपया प्रतीक्षा करें…')
                  : (language === 'EN' ? 'Tap to start recording' : 'रिकॉर्डिंग शुरू करने के लिए टैप करें')}
            </p>
          </div>
        </div>

        {/* Transcript Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card p-4 rounded-[18px]">
            <p className="text-[10.5px] font-bold uppercase tracking-widest text-[#1A1A1A]/40 mb-2">
              {language === 'EN' ? 'Live' : 'लाइव'}
            </p>
            <p className="text-[13px] text-[#1A1A1A]/80 font-medium leading-relaxed min-h-[44px]">
              {liveTranscript || (language === 'EN' ? 'Start speaking…' : 'बोलना शुरू करें…')}
            </p>
          </div>
          <div className="glass-card p-4 rounded-[18px]">
            <p className="text-[10.5px] font-bold uppercase tracking-widest text-[#1A1A1A]/40 mb-2">
              {language === 'EN' ? 'Recorded' : 'रिकॉर्डड'}
            </p>
            <p className="text-[13px] text-[#1A1A1A]/80 font-medium leading-relaxed min-h-[44px]">
              {rawTranscript || (language === 'EN' ? 'Transcript appears here.' : 'ट्रांसक्रिप्ट यहाँ दिखेगा।')}
            </p>
          </div>
        </div>

        {/* Normalized transcript */}
        {!!normalizedTranscript && (
          <div className="glass-card p-4 rounded-[18px]">
            <p className="text-[10.5px] font-bold uppercase tracking-widest text-[#1A1A1A]/40 mb-1.5">
              {language === 'EN' ? 'Normalized' : 'नॉर्मलाइज़्ड'}
            </p>
            <p className="text-[13px] text-[#1A1A1A]/80 font-medium leading-relaxed">{normalizedTranscript}</p>
          </div>
        )}

        {/* Result summary */}
        {!!resultSummary && (
          <div className="card-dark p-5 rounded-[20px] text-[#F9F3EA] whitespace-pre-line text-[13.5px] font-medium leading-relaxed">
            {resultSummary}
          </div>
        )}

        {/* Audio playback */}
        {!!audioUrl && (
          <div className="glass-card p-4 rounded-[18px]">
            <p className="text-[10.5px] font-bold uppercase tracking-widest text-[#1A1A1A]/40 mb-2">
              {language === 'EN' ? 'AI Response' : 'AI प्रतिक्रिया'}
            </p>
            <audio src={audioUrl} controls className="w-full" style={{ height: 36 }} />
          </div>
        )}

        {/* Confirmation panel */}
        {result?.status === 'needs_confirmation' && (
          <div className="rounded-[20px] bg-[#FFF8EC] border border-[#F0D8A0] p-5">
            <p className="text-[14px] font-semibold text-[#6A4A10] leading-relaxed mb-4">
              {result.confirmationMessage || (language === 'EN' ? 'I may have misunderstood. Please confirm.' : 'शायद मैं गलत समझा। कृपया पुष्टि करें।')}
            </p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => void handleConfirmAll()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1D8B57] text-white text-[13px] font-bold shadow-sm">
                <FiCheck size={14} /> {language === 'EN' ? 'Confirm All' : 'सभी की पुष्टि करें'}
              </button>
              <button onClick={() => setIsEditMode(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1A1A1A] text-white text-[13px] font-bold">
                <FiEdit2 size={14} /> {language === 'EN' ? 'Edit' : 'संपादित करें'}
              </button>
              <button onClick={handleCancel} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F85F54] text-white text-[13px] font-bold">
                <FiX size={14} /> {language === 'EN' ? 'Cancel' : 'रद्द करें'}
              </button>
            </div>
          </div>
        )}

        {/* Edit mode */}
        {isEditMode && (
          <div className="glass-card p-5 rounded-[20px]">
            <p className="text-[13px] font-bold text-[#1A1A1A] mb-3">{language === 'EN' ? 'Edit Narration' : 'नैरेशन संपादित करें'}</p>
            <textarea
              value={editableTranscript}
              onChange={e => setEditableTranscript(e.target.value)}
              className="w-full min-h-[90px] rounded-2xl border border-[#1A1A1A]/10 bg-white px-4 py-3 text-[14px] font-medium text-[#1A1A1A] outline-none focus:border-[#8A9B80] focus:ring-2 focus:ring-[#8A9B80]/15 transition-all resize-none"
            />
            <div className="flex gap-2 mt-3">
              <button onClick={() => void handleEditSubmit()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1D8B57] text-white text-[13px] font-bold">
                {language === 'EN' ? 'Re-parse' : 'फिर से पार्स करें'}
              </button>
              <button onClick={() => setIsEditMode(false)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1A1A1A] text-white text-[13px] font-bold">
                {language === 'EN' ? 'Close' : 'बंद करें'}
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {!!error && (
          <div className="bg-[#F85F54]/10 border border-[#F85F54]/20 rounded-2xl px-4 py-3">
            <p className="text-[13px] font-bold text-[#c0392b]">{error}</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
