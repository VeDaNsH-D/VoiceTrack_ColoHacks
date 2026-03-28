import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  askAssistant,
  synthesizeAssistantAudio,
  transcribeAudioForAssistant,
} from '../services/api'
import { FiPlus, FiMic, FiFeather, FiTrendingUp, FiCheckCircle } from 'react-icons/fi'
import { blobToWav, getAudioPermission, startRecording, stopRecording } from '../utils/audio'

interface ChatbotProps {
  userId: string
  userName: string
  language: 'EN' | 'HI'
}

type ChatMessage = {
  id: number
  sender: 'ai' | 'user'
  text: string
  audioUrl?: string | null
}

export const Chatbot: React.FC<ChatbotProps> = ({ userId, userName, language }) => {
  const MAX_RECORDING_MS = 180000
  const [inputText, setInputText] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isSending, setIsSending] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isAudioProcessing, setIsAudioProcessing] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioReplyRef = useRef<HTMLAudioElement | null>(null)
  const autoStopTimerRef = useRef<number | null>(null)
  const showProcessingIndicator = isSending || isAudioProcessing

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    return () => {
      if (autoStopTimerRef.current) window.clearTimeout(autoStopTimerRef.current)
      streamRef.current?.getTracks().forEach((track) => track.stop())
      audioReplyRef.current?.pause()
    }
  }, [])

  const clearAutoStopTimer = () => {
    if (autoStopTimerRef.current) {
      window.clearTimeout(autoStopTimerRef.current)
      autoStopTimerRef.current = null
    }
  }

  const playReplyAudio = (audioUrl: string) => {
    if (!audioUrl) {
      return
    }

    audioReplyRef.current?.pause()
    const audio = new Audio(audioUrl)
    audioReplyRef.current = audio
    void audio.play().catch(() => {
      // Autoplay may fail due to browser policies.
    })
  }

  const fetchAssistantReply = async (message: string): Promise<{ text: string; audioUrl: string | null }> => {
    const response = await askAssistant({ userId: userId || 'guest-user', message })
    const reply = response.clarificationQuestion || response.reply

    let audioUrl: string | null = null
    try {
      audioUrl = await synthesizeAssistantAudio({
        text: reply,
        language: language === 'EN' ? 'en' : 'hi',
      })
    } catch {
      audioUrl = null
    }

    return { text: reply, audioUrl }
  }

  const handleSend = async (forcedText?: string) => {
    const textToSend = forcedText || inputText
    if (!textToSend.trim() || isSending || isRecording || isAudioProcessing) return

    const userMsg: ChatMessage = { id: Date.now(), sender: 'user', text: textToSend }
    setMessages(prev => [...prev, userMsg])
    setInputText('')
    setIsSending(true)

    try {
      const assistant = await fetchAssistantReply(textToSend)
      setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', text: assistant.text, audioUrl: assistant.audioUrl }])
      if (assistant.audioUrl) {
        playReplyAudio(assistant.audioUrl)
      }
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1, sender: 'ai',
        text: language === 'EN' ? 'I could not reach the backend. Please try again.' : 'मैं बैकएंड तक नहीं पहुंच सका। कृपया फिर से प्रयास करें।',
      }])
    } finally {
      setIsSending(false)
    }
  }

  const startVoiceInput = async () => {
    if (isSending || isRecording || isAudioProcessing) {
      return
    }

    try {
      if (!streamRef.current) {
        streamRef.current = await getAudioPermission()
      }

      const recorder = startRecording(streamRef.current)
      mediaRecorderRef.current = recorder
      recorder.onstart = () => setIsRecording(true)
      recorder.start()
      autoStopTimerRef.current = window.setTimeout(() => {
        void stopVoiceInput(true)
      }, MAX_RECORDING_MS)
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'ai',
        text: language === 'EN' ? 'Please allow microphone access to send audio.' : 'ऑडियो भेजने के लिए कृपया माइक्रोफोन एक्सेस दें।',
      }])
    }
  }

  const stopVoiceInput = async (fromAutoStop = false) => {
    if (!mediaRecorderRef.current) {
      return
    }

    clearAutoStopTimer()
    const recorder = mediaRecorderRef.current
    setIsRecording(false)
    setIsAudioProcessing(true)

    try {
      const blob = await stopRecording(recorder)
      mediaRecorderRef.current = null

      const wavBlob = await blobToWav(blob)
      const stt = await transcribeAudioForAssistant({ audioBlob: wavBlob })
      const transcript = String(stt.transcript || '').trim()

      if (!transcript) {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          sender: 'ai',
          text: fromAutoStop
            ? (language === 'EN' ? 'Reached 3 minute max recording limit. I processed what I captured.' : '3 मिनट की अधिकतम रिकॉर्डिंग सीमा पूरी हुई। मैंने रिकॉर्ड किया हुआ ऑडियो प्रोसेस कर दिया।')
            : (language === 'EN' ? 'I could not hear anything clearly. Please try once more.' : 'मुझे ऑडियो साफ़ सुनाई नहीं दिया। कृपया एक बार फिर बोलें।'),
        }])
        return
      }

      setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: transcript }])

      const assistant = await fetchAssistantReply(transcript)
      setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', text: assistant.text, audioUrl: assistant.audioUrl }])
      if (assistant.audioUrl) {
        playReplyAudio(assistant.audioUrl)
      }
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'ai',
        text: language === 'EN' ? 'I could not process your audio clearly. Please try again.' : 'मैं आपका ऑडियो साफ़ प्रोसेस नहीं कर सका। कृपया फिर से कोशिश करें।',
      }])
    } finally {
      setIsAudioProcessing(false)
    }
  }

  const chips = [
    { icon: '💡', label: language === 'EN' ? 'Analyze Sales' : 'बिक्री का विश्लेषण' },
    { icon: '📸', label: language === 'EN' ? 'Check Margins' : 'मार्जिन जांचें' },
    { icon: '🔍', label: language === 'EN' ? 'Find Anomalies' : 'विसंगतियाँ खोजें' },
    { icon: '🎵', label: language === 'EN' ? 'Business Tip' : 'बिजनेस टिप' },
  ]

  return (
    <div className="h-full bg-transparent flex flex-col relative overflow-hidden">
      {/* ── Top Bar ──────────────────────────────────── */}
      <div className="flex items-center justify-between px-8 pt-8 pb-4 flex-shrink-0 z-10 w-full max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          <span className="text-[13px] font-bold text-[#1A1A1A]">{language === 'EN' ? 'Assistant v2.6' : 'सहायक v2.6'}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <h2 className="text-[14px] font-bold text-[#1A1A1A] tracking-wider uppercase opacity-50 absolute left-1/2 -translate-x-1/2">
          VoiceTrace 
        </h2>
        <button className="bg-[#1A1A1A] text-white px-5 py-2.5 rounded-full text-[13px] font-bold shadow-md flex items-center gap-2 active:scale-95 transition-transform">
          ✨ {language === 'EN' ? 'Upgrade' : 'अपग्रेड'}
        </button>
      </div>

      {/* ── Main Content Area ────────────────────────── */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-8 pb-8 w-full max-w-4xl mx-auto flex flex-col">
        {messages.length === 0 ? (
          /* Empty State Welcome Dashboard */
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center flex-1 mt-10"
          >
            <h1 className="text-[44px] font-extrabold tracking-tight text-[#1A1A1A] leading-[1.1] text-center mb-16 max-w-2xl mt-4">
              <span className="text-[#1A1A1A]/50 font-bold">Hi {userName ? userName.split(' ')[0] : 'User'},</span> Ready to Achieve<br />Great Things?
            </h1>

            <div className="grid grid-cols-3 gap-5 w-full relative">
              {/* 3D Mascot Illustration placeholder */}
              <div className="absolute -top-[70px] right-4 w-24 h-24 pointer-events-none drop-shadow-2xl z-10 hidden md:block">
                {/* Floating mascot avatar */}
                <div className="w-full h-full bg-gradient-to-br from-[#1A1A1A] to-[#2A2523] rounded-[24px] rounded-br-[8px] shadow-[0_20px_40px_rgba(0,0,0,0.3)] border border-white/20 flex flex-col items-center justify-center relative float-animation select-none">
                  <div className="flex gap-2.5 mb-2.5">
                     <div className="w-4 h-4 bg-[#8A9B80] rounded-full animate-pulse" />
                     <div className="w-4 h-4 bg-[#8A9B80] rounded-full animate-pulse delay-75" />
                  </div>
                  <div className="w-10 h-1.5 bg-white/20 rounded-full" />
                  {/* Tooltip */}
                  <div className="absolute right-[90%] -top-3 bg-white px-3 py-2 rounded-[16px] rounded-br-[4px] shadow-xl whitespace-nowrap border border-black/5 mr-2">
                    <p className="text-[12px] font-bold text-[#1A1A1A]">Hey there! 👋</p>
                    <p className="text-[11px] font-semibold text-[#1A1A1A]/60">Need a boost?</p>
                  </div>
                </div>
              </div>

              {/* Card 1 */}
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] flex flex-col hover:-translate-y-1 transition-transform cursor-pointer" onClick={() => handleSend("Tell me about Voice Ledger")}>
                <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center mb-6 text-orange-500">
                  <FiFeather size={24} />
                </div>
                <p className="text-[15px] font-semibold text-[#1A1A1A] leading-snug mb-6 flex-1">
                  Speak naturally to log your sales and expenses instantly — all in sync.
                </p>
                <p className="text-[12px] font-bold text-[#1A1A1A]/40 uppercase tracking-wide">Fast Start</p>
              </div>

              {/* Card 2 */}
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] flex flex-col hover:-translate-y-1 transition-transform cursor-pointer" onClick={() => handleSend("Analyze my latest performance")}>
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 text-blue-600">
                  <FiTrendingUp size={24} />
                </div>
                
                <p className="text-[15px] font-semibold text-[#1A1A1A] leading-snug mb-6 flex-1">
                  Stay connected, discover profit margins, anomaly warnings, and trends seamlessly.
                </p>
                <p className="text-[12px] font-bold text-[#1A1A1A]/40 uppercase tracking-wide">Collaborate</p>
              </div>

              {/* Card 3 */}
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] flex flex-col hover:-translate-y-1 transition-transform cursor-pointer" onClick={() => handleSend("What are my priorities today?")}>
                <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center mb-6 text-green-600">
                  <FiCheckCircle size={24} />
                </div>

                <p className="text-[15px] font-semibold text-[#1A1A1A] leading-snug mb-6 flex-1">
                  Organize your time efficiently, get proactive coaching, and stay focused.
                </p>
                <p className="text-[12px] font-bold text-[#1A1A1A]/40 uppercase tracking-wide">Planning</p>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Active Chat Interface */
          <div className="flex flex-col gap-6 pt-4">
            <AnimatePresence initial={false}>
              {messages.map(msg => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className={`flex w-full items-start gap-4 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'ai' && (
                    <div className="w-9 h-9 rounded-full bg-[#1A1A1A] text-white flex-shrink-0 flex items-center justify-center mt-1">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    </div>
                  )}

                  <div className={`max-w-[75%] px-6 py-4 text-[15px] font-medium leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[#1A1A1A] text-[#F8F5F2] rounded-[24px] rounded-tr-[8px] shadow-sm'
                      : 'bg-white text-[#1A1A1A] rounded-[24px] rounded-tl-[8px] shadow-[0_4px_16px_rgba(0,0,0,0.04)] border border-[#1A1A1A]/5'
                  }`}>
                    {msg.text}
                    {msg.sender === 'ai' && msg.audioUrl && (
                      <audio src={msg.audioUrl} controls className="w-full mt-3" />
                    )}
                  </div>

                  {msg.sender === 'user' && (
                    <div className="w-9 h-9 rounded-full bg-[#1A1A1A]/10 text-[#1A1A1A] flex-shrink-0 flex items-center justify-center mt-1 font-bold text-xs uppercase">
                      {userName ? userName[0] : 'U'}
                    </div>
                  )}
                </motion.div>
              ))}

              {/* AI typing indicator */}
              {showProcessingIndicator && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-full bg-[#1A1A1A] text-white flex-shrink-0 flex items-center justify-center mt-1">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  </div>
                  <div className="bg-white px-6 py-5 rounded-[24px] rounded-tl-[8px] shadow-[0_4px_16px_rgba(0,0,0,0.04)] border border-[#1A1A1A]/5 flex items-center gap-1.5">
                    {[0, 0.2, 0.4].map(delay => (
                      <div key={delay} className="w-2.5 h-2.5 rounded-full bg-[#1A1A1A]/30 animate-pulse" style={{ animationDelay: `${delay}s` }} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={bottomRef} className="h-4" />
          </div>
        )}
      </div>

      {/* ── Giant Bottom Input Panel ───────────────────── */}
      <div className="w-full px-8 pb-8 flex-shrink-0 z-20 bg-transparent flex justify-center">
        <div className="max-w-4xl w-full">
          {/* Main Floating Container */}
          <div className="bg-white/90 backdrop-blur-xl rounded-[32px] p-5 border border-white shadow-[0_20px_60px_rgba(0,0,0,0.08)] flex flex-col gap-4">
            
            {/* Header row in input panel */}
            <div className="flex items-center justify-between px-2">
               <div className="flex items-center gap-1.5 text-[#1A1A1A]/50 text-[11px] font-bold uppercase tracking-widest">
                  ✨ Unlock more with Pro Plan
               </div>
               <div className="flex items-center gap-1.5 text-[#1A1A1A]/50 text-[11px] font-bold uppercase tracking-widest flex items-center gap-1">
                 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 2v20"/></svg>
                 Powered by Assistant v2.6
               </div>
            </div>

            {/* Actual Input Row */}
            <div className="bg-white rounded-[24px] p-2 flex items-center border border-[#1A1A1A]/10 shadow-sm transition-all focus-within:shadow-[0_8px_24px_rgba(0,0,0,0.06)] focus-within:border-[#1A1A1A]/20">
              <button className="w-12 h-12 flex items-center justify-center text-[#1A1A1A]/40 hover:text-[#1A1A1A] transition-colors flex-shrink-0 ml-1">
                <FiPlus size={24} />
              </button>
              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && void handleSend()}
                placeholder={language === 'EN' ? 'Example : "Explain quantum computing in simple terms"' : 'उदाहरण : "सरल शब्दों में लाभ मार्जिन समझाएं"'}
                disabled={isSending || isRecording || isAudioProcessing}
                className="flex-1 bg-transparent border-none outline-none px-3 text-[16px] font-medium text-[#1A1A1A] placeholder:text-[#1A1A1A]/40"
              />
              <button
                onClick={isRecording ? () => void stopVoiceInput() : () => void startVoiceInput()}
                disabled={isSending || isAudioProcessing}
                className={`w-12 h-12 flex items-center justify-center transition-colors flex-shrink-0 ${isRecording ? 'text-[#F85F54]' : 'text-[#1A1A1A]/40 hover:text-[#1A1A1A]'} disabled:opacity-40`}
              >
                <FiMic size={20} />
              </button>
              <button
                onClick={() => void handleSend()}
                disabled={isSending || isRecording || isAudioProcessing || !inputText.trim()}
                className="w-12 h-12 bg-[#1A1A1A] text-white rounded-full flex items-center justify-center flex-shrink-0 shadow-md disabled:opacity-40 transition-transform active:scale-95 disabled:active:scale-100 mr-1"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>

            {/* Quick Action Chips */}
            <div className="flex items-center gap-3 px-2 overflow-x-auto scrollbar-hide py-1">
              {chips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(chip.label)}
                  className="bg-[#1A1A1A] hover:bg-[#2A2523] text-white rounded-full px-4 py-2 text-[13px] font-bold flex items-center gap-2 flex-shrink-0 transition-colors shadow-sm"
                >
                  <span className="opacity-80">{chip.icon}</span>
                  {chip.label}
                </button>
              ))}
              <button className="bg-[#1A1A1A] hover:bg-[#2A2523] text-white rounded-full w-9 h-9 flex items-center justify-center flex-shrink-0 transition-colors shadow-sm">
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
