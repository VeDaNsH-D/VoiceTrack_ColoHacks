import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  askAssistant,
  processTransactionText,
  sendConversationAudio,
  saveStructuredTransaction,
  synthesizeAssistantAudio,
  transcribeAudioForAssistant,
} from '../services/api'
import { blobToWav, getAudioPermission, startRecording, stopRecording } from '../utils/audio'

interface ChatbotProps {
  userId: string
  onToggleSidebar: () => void
  language: 'EN' | 'HI'
}

type ChatMessage = {
  id: number
  sender: 'ai' | 'user'
  text: string
  audioUrl?: string | null
}

type ChatMode = 'insights' | 'ledger'

function getWelcomeMessage(language: 'EN' | 'HI'): string {
  if (language === 'EN') {
    return 'Hi! I am your VoiceTrace business assistant. I know all your past transactions. Use the tabs above to switch between Insights and Ledger Transaction, or say "switch to insights mode" / "switch to ledger mode". What would you like to know today?'
  }

  return 'नमस्ते! मैं आपका VoiceTrace बिजनेस असिस्टेंट हूँ। मैं आपके पिछले सभी लेन-देन जानता हूँ। ऊपर दिए गए टैब से Insights और Ledger Transaction मोड बदल सकते हैं, या आवाज में बोलें "इनसाइट्स मोड" या "लेजर मोड"। आज आप क्या जानना चाहेंगे?'
}

export const Chatbot: React.FC<ChatbotProps> = ({ userId, onToggleSidebar, language }) => {
  const [inputText, setInputText] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, sender: 'ai', text: getWelcomeMessage(language) },
  ])
  const [isSending, setIsSending] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isAudioProcessing, setIsAudioProcessing] = useState(false)
  const [chatMode, setChatMode] = useState<ChatMode>('insights')
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const audioReplyRef = React.useRef<HTMLAudioElement | null>(null)
  const showProcessingIndicator = isSending || isAudioProcessing

  // Update messages completely if language changes (mock hot reload)
  React.useEffect(() => {
    setMessages([
      { id: 1, sender: 'ai', text: getWelcomeMessage(language) },
    ])
  }, [language])

  React.useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      audioReplyRef.current?.pause()
    }
  }, [])

  const playReplyAudio = React.useCallback((audioUrl: string) => {
    if (!audioUrl) {
      return
    }

    audioReplyRef.current?.pause()
    const audio = new Audio(audioUrl)
    audioReplyRef.current = audio
    void audio.play().catch(() => {
      // Autoplay can fail in some browsers; controls are still shown on the message.
    })
  }, [])

  const appendErrorReply = React.useCallback(() => {
    setMessages(prev => [
      ...prev,
      {
        id: Date.now() + 1,
        sender: 'ai',
        text:
          language === 'EN'
            ? 'I could not reach the backend right now. Please try once more.'
            : 'मैं अभी बैकएंड तक नहीं पहुंच सका। कृपया फिर से प्रयास करें।',
      },
    ])
  }, [language])

  const appendAssistantMessage = React.useCallback((text: string, audioUrl: string | null = null) => {
    setMessages(prev => [
      ...prev,
      {
        id: Date.now() + 1,
        sender: 'ai',
        text,
        audioUrl,
      },
    ])

    if (audioUrl) {
      playReplyAudio(audioUrl)
    }
  }, [playReplyAudio])

  const buildModeSwitchReply = React.useCallback((nextMode: ChatMode) => {
    if (language === 'EN') {
      return nextMode === 'insights'
        ? 'Switched to Insights mode. Ask about sales, profit, top product, or transaction count.'
        : 'Switched to Ledger Transaction mode. You can now add sale or expense entries.'
    }

    return nextMode === 'insights'
      ? 'इनसाइट्स मोड चालू हो गया। अब आप बिक्री, प्रॉफिट, टॉप प्रोडक्ट या ट्रांजैक्शन काउंट पूछ सकते हैं।'
      : 'लेजर ट्रांजैक्शन मोड चालू हो गया। अब आप बिक्री या खर्च की एंट्री जोड़ सकते हैं।'
  }, [language])

  const detectModeFromVoiceCommand = React.useCallback((value: string): ChatMode | null => {
    const text = String(value || '').toLowerCase().trim()
    if (!text) {
      return null
    }

    const switchCue = /(switch|change|set|select|choose|open|go to|mode|tab|chalu|kar do|kardo|bada(lo)?|badlo|बदल|सेट|चुनो|चालू|मोड|मोड में|मोड पर)/i
    const directInsights = /^(insights?|analytics?|इनसाइट्स?|इनसाइट)$/i
    const directLedger = /^(ledger|लेजर|लेज़र|ledger transaction|transaction mode|लेजर ट्रांजैक्शन)$/i

    const insightsTarget = /(insight|insights|analytics|analysis|इनसाइट|इनसाइट्स|एनालिटिक्स)/i
    const ledgerTarget = /(ledger|लेजर|लेज़र|transaction mode|ledger transaction|लेजर ट्रांजैक्शन|entry mode|add transaction)/i

    if (directInsights.test(text)) {
      return 'insights'
    }

    if (directLedger.test(text)) {
      return 'ledger'
    }

    if (switchCue.test(text) && insightsTarget.test(text)) {
      return 'insights'
    }

    if (switchCue.test(text) && ledgerTarget.test(text)) {
      return 'ledger'
    }

    return null
  }, [])

  const fetchAssistantReply = React.useCallback(async (messageToSend: string) => {
    const response = await askAssistant({
      userId: userId || 'guest-user',
      message: messageToSend,
    })

    const groundedReply = response.clarificationQuestion || response.reply
    let audioUrl: string | null = null

    try {
      audioUrl = await synthesizeAssistantAudio({
        text: groundedReply,
        language: language === 'EN' ? 'en' : 'hi',
      })
    } catch {
      audioUrl = null
    }

    appendAssistantMessage(groundedReply, audioUrl)
  }, [appendAssistantMessage, language, userId])

  const summarizeLedgerTextResult = React.useCallback((payload: Awaited<ReturnType<typeof processTransactionText>>) => {
    if (payload.meta?.needs_clarification) {
      return payload.meta?.clarification_question || (
        language === 'EN'
          ? 'Please share item, quantity and amount clearly.'
          : 'कृपया आइटम, मात्रा और रकम साफ़ बताइए।'
      )
    }

    const sales = payload.sales || []
    const expenses = payload.expenses || []

    if (!sales.length && !expenses.length) {
      return language === 'EN'
        ? 'I could not find a complete transaction. Please try again with item, quantity and amount.'
        : 'मुझे पूरा ट्रांजैक्शन नहीं मिला। कृपया आइटम, मात्रा और रकम के साथ दोबारा बताइए।'
    }

    const salesPart = sales
      .map((sale) => `${sale.qty} ${sale.item} @ ₹${sale.price}`)
      .join(', ')
    const expensePart = expenses
      .map((expense) => `${expense.item}: ₹${expense.amount}`)
      .join(', ')

    if (language === 'EN') {
      if (salesPart && expensePart) {
        return `Noted. Sales: ${salesPart}. Expenses: ${expensePart}.`
      }
      if (salesPart) {
        return `Noted sale entry: ${salesPart}.`
      }
      return `Noted expense entry: ${expensePart}.`
    }

    if (salesPart && expensePart) {
      return `नोट कर लिया। बिक्री: ${salesPart}। खर्च: ${expensePart}।`
    }
    if (salesPart) {
      return `नोट कर लिया। बिक्री एंट्री: ${salesPart}।`
    }
    return `नोट कर लिया। खर्च एंट्री: ${expensePart}।`
  }, [language])

  const runLedgerTextPipeline = React.useCallback(async (messageToSend: string) => {
    const processed = await processTransactionText({
      text: messageToSend,
      userId: userId || 'guest-user',
    })

    const sales = processed.sales || []
    const expenses = processed.expenses || []
    const hasEntries = sales.length > 0 || expenses.length > 0
    const needsClarification = Boolean(processed.meta?.needs_clarification)

    if (!needsClarification && hasEntries) {
      await saveStructuredTransaction({
        userId: userId || 'guest-user',
        rawText: messageToSend,
        normalizedText: messageToSend,
        sales,
        expenses,
        meta: processed.meta,
      })

      window.dispatchEvent(
        new CustomEvent('voicetrack:transaction-saved', {
          detail: {
            userId: userId || 'guest-user',
            transcript: messageToSend,
            finalized: true,
          },
        })
      )
    }

    const reply = summarizeLedgerTextResult(processed)
    let audioUrl: string | null = null
    try {
      audioUrl = await synthesizeAssistantAudio({
        text: reply,
        language: language === 'EN' ? 'en' : 'hi',
      })
    } catch {
      audioUrl = null
    }
    appendAssistantMessage(reply, audioUrl)
  }, [appendAssistantMessage, language, summarizeLedgerTextResult, userId])

  const handleSend = async () => {
    if (!inputText.trim()) return
    if (isSending || isRecording || isAudioProcessing) return

    // Add user message
    const newMessages: ChatMessage[] = [...messages, { id: Date.now(), sender: 'user', text: inputText }]
    setMessages(newMessages)
    const messageToSend = inputText
    setInputText('')
    setIsSending(true)

    try {
      if (chatMode === 'insights') {
        await fetchAssistantReply(messageToSend)
      } else {
        await runLedgerTextPipeline(messageToSend)
      }
    } catch {
      appendErrorReply()
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
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text:
            language === 'EN'
              ? 'Please allow microphone access to send audio.'
              : 'ऑडियो भेजने के लिए कृपया माइक्रोफोन एक्सेस दें।',
        },
      ])
    }
  }

  const stopVoiceInput = async () => {
    if (!mediaRecorderRef.current) {
      return
    }

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
        throw new Error('EMPTY_TRANSCRIPT')
      }

      const modeFromVoice = detectModeFromVoiceCommand(transcript)

      if (modeFromVoice) {
        setChatMode(modeFromVoice)
        setMessages(prev => [
          ...prev,
          {
            id: Date.now(),
            sender: 'user',
            text: transcript,
          },
        ])

        const switchReply = buildModeSwitchReply(modeFromVoice)
        let switchReplyAudioUrl: string | null = null
        try {
          switchReplyAudioUrl = await synthesizeAssistantAudio({
            text: switchReply,
            language: language === 'EN' ? 'en' : 'hi',
          })
        } catch {
          switchReplyAudioUrl = null
        }

        appendAssistantMessage(switchReply, switchReplyAudioUrl)
        return
      }

      if (chatMode === 'insights') {
        setMessages(prev => [
          ...prev,
          {
            id: Date.now(),
            sender: 'user',
            text: transcript,
          },
        ])
        await fetchAssistantReply(transcript)
      } else {
        const result = await sendConversationAudio({
          audioBlob: wavBlob,
          userId: userId || 'guest-user',
        })
        const transcript = String(result.transcript || '').trim()

        if (!transcript) {
          throw new Error('EMPTY_TRANSCRIPT')
        }

        const assistantReply = String(result.assistant?.reply || '').trim()
        const assistantAudioUrl = String(result.assistant?.audio_url || '').trim() || null

        setMessages(prev => [
          ...prev,
          {
            id: Date.now(),
            sender: 'user',
            text: transcript,
          },
          {
            id: Date.now() + 1,
            sender: 'ai',
            text:
              assistantReply ||
              (language === 'EN'
                ? 'I processed your transaction, but could not generate a spoken response.'
                : 'मैंने आपका ट्रांजैक्शन प्रोसेस कर लिया, लेकिन जवाब तैयार नहीं हो सका।'),
            audioUrl: assistantAudioUrl,
          },
        ])

        if (assistantAudioUrl) {
          playReplyAudio(assistantAudioUrl)
        }

        if (result.conversation_state?.saved_to_history) {
          window.dispatchEvent(
            new CustomEvent('voicetrack:transaction-saved', {
              detail: {
                userId: userId || 'guest-user',
                transcript,
                finalized: result.conversation_state?.finalized,
              },
            })
          )
        }
      }
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text:
            language === 'EN'
              ? 'I could not process your audio clearly. Please try again.'
              : 'मैं आपका ऑडियो साफ़ प्रोसेस नहीं कर सका। कृपया फिर से कोशिश करें।',
        },
      ])
    } finally {
      setIsAudioProcessing(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-screen bg-app-gradient flex flex-col relative overflow-hidden"
    >
      {/* Top Header */}
      <div className="flex items-center justify-center px-6 pt-12 pb-4 relative z-20">
        <button
          onClick={onToggleSidebar}
          className="absolute left-6 w-12 h-12 bg-white/40 rounded-full flex items-center justify-center hover:bg-white/80 transition-colors shadow-sm"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <div className="flex bg-[#EFEBE4] px-4 py-1.5 rounded-full items-center gap-2 shadow-sm border border-white/40">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A9B80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          <span className="text-[13px] font-bold text-[#1A1A1A] tracking-wide uppercase">
            {language === 'EN' ? 'Assistant' : 'सहायक'}
          </span>
        </div>
      </div>

      {/* Chat Area */}
      <div className="px-6 pt-2 z-20 w-full max-w-2xl mx-auto">
        <div className="glass-card rounded-full p-1.5 flex gap-1.5 border border-white/60 shadow-sm">
          <button
            onClick={() => setChatMode('insights')}
            disabled={isSending || isRecording || isAudioProcessing}
            className={`flex-1 rounded-full py-2 px-3 text-sm font-semibold transition-colors ${chatMode === 'insights' ? 'bg-[#1A1A1A] text-[#F8F5F2]' : 'bg-transparent text-[#1A1A1A]/70 hover:bg-white/50'}`}
          >
            {language === 'EN' ? 'Insights' : 'इनसाइट्स'}
          </button>
          <button
            onClick={() => setChatMode('ledger')}
            disabled={isSending || isRecording || isAudioProcessing}
            className={`flex-1 rounded-full py-2 px-3 text-sm font-semibold transition-colors ${chatMode === 'ledger' ? 'bg-[#1A1A1A] text-[#F8F5F2]' : 'bg-transparent text-[#1A1A1A]/70 hover:bg-white/50'}`}
          >
            {language === 'EN' ? 'Ledger Transaction' : 'लेजर ट्रांजैक्शन'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 pb-32 flex flex-col gap-6 z-10 w-full max-w-2xl mx-auto">
        {messages.map((msg) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={msg.id}
            className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'ai' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#8A9B80] to-[#E6DFD7] flex-shrink-0 mr-3 shadow-md border border-white/50" />
            )}

            <div className={`max-w-[75%] p-4 rounded-3xl text-[15px] font-medium leading-relaxed tracking-wide shadow-sm ${msg.sender === 'user'
              ? 'bg-[#1A1A1A] text-[#F8F5F2] rounded-tr-sm'
              : 'glass-card rounded-tl-sm text-[#1A1A1A]'
              }`}>
              {msg.text}
              {msg.sender === 'ai' && msg.audioUrl && (
                <audio src={msg.audioUrl} controls className="w-full mt-3" />
              )}
            </div>
          </motion.div>
        ))}

        {showProcessingIndicator && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex w-full justify-start"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#8A9B80] to-[#E6DFD7] flex-shrink-0 mr-3 shadow-md border border-white/50" />
            <div className="glass-card rounded-3xl rounded-tl-sm text-[#1A1A1A] max-w-[75%] px-4 py-3 shadow-sm">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-[#8A9B80] rounded-full animate-bounce [animation-delay:-0.2s]" />
                <span className="w-2 h-2 bg-[#8A9B80] rounded-full animate-bounce [animation-delay:-0.1s]" />
                <span className="w-2 h-2 bg-[#8A9B80] rounded-full animate-bounce" />
              </div>
              <p className="text-xs mt-2 text-[#1A1A1A]/60">
                {isAudioProcessing
                  ? (language === 'EN'
                    ? (chatMode === 'insights' ? 'Processing your question audio...' : 'Processing ledger audio...')
                    : (chatMode === 'insights' ? 'आपका सवाल ऑडियो प्रोसेस हो रहा है...' : 'लेजर ऑडियो प्रोसेस हो रहा है...'))
                  : (language === 'EN'
                    ? (chatMode === 'insights' ? 'Generating insight response...' : 'Saving ledger transaction...')
                    : (chatMode === 'insights' ? 'इनसाइट जवाब तैयार हो रहा है...' : 'लेजर ट्रांजैक्शन सेव हो रहा है...'))}
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom Input Area */}
      <div className="absolute bottom-0 w-full bg-gradient-to-t from-[#EAE6DF] via-[#EAE6DF]/90 to-transparent pt-12 pb-8 px-6 z-30">
        <div className="max-w-2xl mx-auto w-full glass-card rounded-full p-2 flex items-center shadow-lg border border-white/60">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={language === 'EN' ? "Ask about your business..." : "अपने व्यवसाय के बारे में पूछें..."}
            disabled={isSending || isRecording || isAudioProcessing}
            className="flex-1 bg-transparent border-none outline-none px-4 text-[#1A1A1A] font-medium placeholder:text-[#1A1A1A]/40"
          />
          <button
            onClick={isRecording ? () => void stopVoiceInput() : () => void startVoiceInput()}
            disabled={isSending || isAudioProcessing}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform flex-shrink-0 shadow-md mr-2 disabled:opacity-60 ${isRecording ? 'bg-[#F85F54] animate-pulse' : 'bg-[#8A9B80] hover:scale-105'}`}
          >
            {isAudioProcessing ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : isRecording ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <rect x="6" y="6" width="12" height="12" rx="1"></rect>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3z"></path>
                <path d="M19 11a7 7 0 0 1-14 0"></path>
                <line x1="12" y1="18" x2="12" y2="22"></line>
                <line x1="8" y1="22" x2="16" y2="22"></line>
              </svg>
            )}
          </button>
          <button
            onClick={handleSend}
            disabled={isSending || isRecording || isAudioProcessing}
            className="w-12 h-12 bg-[#1A1A1A] rounded-full flex items-center justify-center hover:scale-105 transition-transform flex-shrink-0 shadow-md disabled:opacity-60"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F8F5F2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  )
}
