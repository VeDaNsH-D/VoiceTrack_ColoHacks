import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  askAssistant,
  type ConversationResult,
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
  const MAX_RECORDING_MS = 180000
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
  const autoStopTimerRef = React.useRef<number | null>(null)
  const showProcessingIndicator = isSending || isAudioProcessing

  // Update messages completely if language changes (mock hot reload)
  React.useEffect(() => {
    setMessages([
      { id: 1, sender: 'ai', text: getWelcomeMessage(language) },
    ])
  }, [language])

  React.useEffect(() => {
    return () => {
      if (autoStopTimerRef.current) window.clearTimeout(autoStopTimerRef.current)
      streamRef.current?.getTracks().forEach((track) => track.stop())
      audioReplyRef.current?.pause()
    }
  }, [])

  const clearAutoStopTimer = React.useCallback(() => {
    if (autoStopTimerRef.current) {
      window.clearTimeout(autoStopTimerRef.current)
      autoStopTimerRef.current = null
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

  const formatPipelineSummary = React.useCallback((payload?: ConversationResult['pipeline_results']) => {
    if (!payload?.has_context) {
      return ''
    }

    const txCount = Number(payload.insights?.transaction_count || 0)
    const sales = Number(payload.insights?.totals?.sales || 0)
    const expenses = Number(payload.insights?.totals?.expenses || 0)
    const topItem = (payload.insights?.top_items || [])[0]

    const dashboardAvailable = Boolean(payload.dashboard?.available)
    const dashboardRevenue = Number(payload.dashboard?.summary?.kpis?.revenue || 0)
    const dashboardProfit = Number(payload.dashboard?.summary?.kpis?.profit || 0)
    const nextDay = Number(payload.dashboard?.summary?.predictions?.nextDaySales || 0)

    const heatmapAvailable = Boolean(payload.heatmap?.available)
    const primaryAreaName = String(payload.heatmap?.primary_area?.name || payload.heatmap?.top_areas?.[0]?.name || '').trim()
    const primaryAreaTx = Number(payload.heatmap?.primary_area?.transaction_count || 0)

    const recentTx = (payload.transaction_history?.recent_transactions || []).slice(0, 2)

    if (language === 'EN') {
      const lines = [
        `Pipeline Summary:`,
        `Insights: ${txCount} transactions, sales \u20b9${Math.round(sales)}, expenses \u20b9${Math.round(expenses)}${topItem ? `, top item ${topItem}` : ''}.`,
      ]

      if (dashboardAvailable) {
        lines.push(`Dashboard: revenue \u20b9${Math.round(dashboardRevenue)}, profit \u20b9${Math.round(dashboardProfit)}, next-day projection \u20b9${Math.round(nextDay)}.`)
      }

      if (heatmapAvailable) {
        lines.push(`Heatmap: ${primaryAreaName || 'top hotspot'}${primaryAreaTx > 0 ? ` with ${primaryAreaTx} local transactions` : ''}.`)
      }

      if (recentTx.length) {
        lines.push(`History sample: ${recentTx.join(' | ')}`)
      }

      return lines.join('\n')
    }

    const lines = [
      `Pipeline Summary:`,
      `Insights: ${txCount} ट्रांजैक्शन, सेल्स \u20b9${Math.round(sales)}, खर्च \u20b9${Math.round(expenses)}${topItem ? `, टॉप आइटम ${topItem}` : ''}.`,
    ]

    if (dashboardAvailable) {
      lines.push(`Dashboard: revenue \u20b9${Math.round(dashboardRevenue)}, profit \u20b9${Math.round(dashboardProfit)}, अगले दिन का अनुमान \u20b9${Math.round(nextDay)}.`)
    }

    if (heatmapAvailable) {
      lines.push(`Heatmap: ${primaryAreaName || 'top hotspot'}${primaryAreaTx > 0 ? ` में ${primaryAreaTx} लोकल ट्रांजैक्शन` : ''}.`)
    }

    if (recentTx.length) {
      lines.push(`History sample: ${recentTx.join(' | ')}`)
    }

    return lines.join('\n')
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

  const sendTextMessage = React.useCallback(async (messageToSend: string) => {
    if (!messageToSend.trim()) return
    if (isSending || isRecording || isAudioProcessing) return

    setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: messageToSend }])
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
  }, [appendErrorReply, chatMode, fetchAssistantReply, isAudioProcessing, isRecording, isSending, runLedgerTextPipeline])

  const handleSend = async () => {
    if (!inputText.trim()) return
    const messageToSend = inputText
    setInputText('')
    await sendTextMessage(messageToSend)
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
        const pipelineSummary = formatPipelineSummary(result.pipeline_results)

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
              [
                assistantReply ||
                (language === 'EN'
                  ? 'I processed your transaction, but could not generate a spoken response.'
                  : 'मैंने आपका ट्रांजैक्शन प्रोसेस कर लिया, लेकिन जवाब तैयार नहीं हो सका।'),
                pipelineSummary,
              ].filter(Boolean).join('\n\n'),
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
            fromAutoStop
              ? (language === 'EN'
                ? 'Reached 3 minute max recording limit. I processed what I captured.'
                : '3 मिनट की अधिकतम रिकॉर्डिंग सीमा पूरी हुई। मैंने रिकॉर्ड किया हुआ ऑडियो प्रोसेस कर दिया।')
              : (language === 'EN'
                ? 'I could not process your audio clearly. Please try again.'
                : 'मैं आपका ऑडियो साफ़ प्रोसेस नहीं कर सका। कृपया फिर से कोशिश करें।'),
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
      className="h-full bg-[#f4f7fa] flex flex-col relative overflow-hidden"
    >
      {/* Top Header */}
      <div className="flex items-center justify-center px-5 pt-8 pb-4 relative z-20 max-w-6xl w-full mx-auto">
        <button
          onClick={onToggleSidebar}
          className="absolute left-5 md:hidden w-10 h-10 rounded-xl border border-slate-900/10 bg-slate-900 text-white flex items-center justify-center shadow-sm"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <div className="flex bg-white px-4 py-2 rounded-full items-center gap-2 border border-slate-200">
          <span className="text-[11px] font-bold text-slate-700 tracking-[0.2em] uppercase">
            {language === 'EN' ? 'Context Chatbot' : 'कॉन्टेक्स्ट चैटबॉट'}
          </span>
        </div>
      </div>

      {/* Chat Area */}
      <div className="px-5 pt-1 z-20 w-full max-w-3xl mx-auto">
        <div className="bg-white rounded-full p-1.5 flex gap-1.5 border border-slate-200">
          <button
            onClick={() => setChatMode('insights')}
            disabled={isSending || isRecording || isAudioProcessing}
            className={`flex-1 rounded-full py-2 px-3 text-sm font-semibold transition-colors ${chatMode === 'insights' ? 'bg-slate-900 text-white' : 'bg-transparent text-slate-600 hover:bg-slate-100'}`}
          >
            {language === 'EN' ? 'Insights' : 'इनसाइट्स'}
          </button>
          <button
            onClick={() => setChatMode('ledger')}
            disabled={isSending || isRecording || isAudioProcessing}
            className={`flex-1 rounded-full py-2 px-3 text-sm font-semibold transition-colors ${chatMode === 'ledger' ? 'bg-slate-900 text-white' : 'bg-transparent text-slate-600 hover:bg-slate-100'}`}
          >
            {language === 'EN' ? 'Ledger Transaction' : 'लेजर ट्रांजैक्शन'}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 pb-36 flex flex-col gap-4 z-10 w-full max-w-3xl mx-auto">
        {messages.map((msg) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={msg.id}
            className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'ai' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#0066ff] to-[#93c5fd] flex-shrink-0 mr-3 border border-white/50" />
            )}

            <div className={`max-w-[82%] p-4 rounded-3xl text-[15px] font-medium leading-relaxed tracking-wide ${msg.sender === 'user'
              ? 'bg-slate-900 text-white rounded-tr-sm'
              : 'bg-white border border-slate-200 rounded-tl-sm text-slate-900'
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
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#0066ff] to-[#93c5fd] flex-shrink-0 mr-3 border border-white/50" />
            <div className="bg-white border border-slate-200 rounded-3xl rounded-tl-sm text-slate-900 max-w-[82%] px-4 py-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-[#0066ff] rounded-full animate-bounce [animation-delay:-0.2s]" />
                <span className="w-2 h-2 bg-[#0066ff] rounded-full animate-bounce [animation-delay:-0.1s]" />
                <span className="w-2 h-2 bg-[#0066ff] rounded-full animate-bounce" />
              </div>
              <p className="text-xs mt-2 text-slate-600">
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
      <div className="absolute bottom-0 w-full bg-gradient-to-t from-[#f4f7fa] via-[#f4f7fa]/95 to-transparent pt-8 pb-5 px-5 z-30">
        <div className="max-w-3xl mx-auto w-full bg-white rounded-full p-2 flex items-center border border-slate-200 shadow-sm">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={chatMode === 'insights'
              ? (language === 'EN' ? 'Ask about sales, trends, inventory...' : 'बिक्री, रुझान, इन्वेंटरी के बारे में पूछें...')
              : (language === 'EN' ? 'Narrate a sale or expense entry...' : 'बिक्री या खर्च एंट्री बोलें...')}
            disabled={isSending || isRecording || isAudioProcessing}
            className="flex-1 bg-transparent border-none outline-none px-4 text-slate-900 font-medium placeholder:text-slate-400"
          />
          <button
            onClick={isRecording ? () => void stopVoiceInput() : () => void startVoiceInput()}
            disabled={isSending || isAudioProcessing}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform flex-shrink-0 shadow-md mr-2 disabled:opacity-60 ${isRecording ? 'bg-[#0066ff] animate-pulse' : 'bg-[#0066ff] hover:scale-105'}`}
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
            className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center hover:scale-105 transition-transform flex-shrink-0 shadow-md disabled:opacity-60"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  )
}
