import React, { useState } from 'react'
import { motion } from 'framer-motion'

interface ChatbotProps {
  onToggleSidebar: () => void
  language: 'EN' | 'HI'
}

export const Chatbot: React.FC<ChatbotProps> = ({ onToggleSidebar, language }) => {
  const [inputText, setInputText] = useState('')
  const [messages, setMessages] = useState([
    { id: 1, sender: 'ai', text: language === 'EN' ? 'Hi! I am your VoiceTrace business assistant. I know all your past transactions. What would you like to know today?' : 'नमस्ते! मैं आपका VoiceTrace बिजनेस असिस्टेंट हूँ। मैं आपके पिछले सभी लेन-देन जानता हूँ। आज आप क्या जानना चाहेंगे?' },
    { id: 2, sender: 'user', text: language === 'EN' ? 'How much did I spend on transport this week?' : 'मैंने इस सप्ताह परिवहन पर कितना खर्च किया?' },
    { id: 3, sender: 'ai', text: language === 'EN' ? 'Based on your voice records from Tuesday and Thursday, you spent ₹200 and ₹150 on transport, totaling ₹350 this week.' : 'मंगलवार और गुरुवार के आपके वॉयस रिकॉर्ड के आधार पर, आपने परिवहन पर ₹200 और ₹150 खर्च किए, जो इस सप्ताह कुल ₹350 है।' },
  ])

  // Update messages completely if language changes (mock hot reload)
  React.useEffect(() => {
    setMessages([
      { id: 1, sender: 'ai', text: language === 'EN' ? 'Hi! I am your VoiceTrace business assistant. I know all your past transactions. What would you like to know today?' : 'नमस्ते! मैं आपका VoiceTrace बिजनेस असिस्टेंट हूँ। मैं आपके पिछले सभी लेन-देन जानता हूँ। आज आप क्या जानना चाहेंगे?' },
      { id: 2, sender: 'user', text: language === 'EN' ? 'How much did I spend on transport this week?' : 'मैंने इस सप्ताह परिवहन पर कितना खर्च किया?' },
      { id: 3, sender: 'ai', text: language === 'EN' ? 'Based on your voice records from Tuesday and Thursday, you spent ₹200 and ₹150 on transport, totaling ₹350 this week.' : 'मंगलवार और गुरुवार के आपके वॉयस रिकॉर्ड के आधार पर, आपने परिवहन पर ₹200 और ₹150 खर्च किए, जो इस सप्ताह कुल ₹350 है।' },
    ])
  }, [language])

  const handleSend = () => {
    if (!inputText.trim()) return
    
    // Add user message
    const newMessages = [...messages, { id: Date.now(), sender: 'user', text: inputText }]
    setMessages(newMessages)
    setInputText('')

    // Mock AI RAG Response
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        sender: 'ai', 
        text: language === 'EN' 
          ? 'Analyzing your ledger... Based on recent data, I recommend stocking 20% more apples tomorrow to match expected demand!'
          : 'आपके लेजर का विश्लेषण किया जा रहा है... हाल के डेटा के आधार पर, मैं अपेक्षित मांग से मेल खाने के लिए कल 20% अधिक सेब स्टॉक करने की सलाह देता हूँ!'
      }])
    }, 1200)
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
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          <span className="text-[13px] font-bold text-[#1A1A1A] tracking-wide uppercase">
            {language === 'EN' ? 'Assistant' : 'सहायक'}
          </span>
        </div>
      </div>

      {/* Chat Area */}
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
            
            <div className={`max-w-[75%] p-4 rounded-3xl text-[15px] font-medium leading-relaxed tracking-wide shadow-sm ${
              msg.sender === 'user' 
                ? 'bg-[#1A1A1A] text-[#F8F5F2] rounded-tr-sm' 
                : 'glass-card rounded-tl-sm text-[#1A1A1A]'
            }`}>
              {msg.text}
            </div>
          </motion.div>
        ))}
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
            className="flex-1 bg-transparent border-none outline-none px-4 text-[#1A1A1A] font-medium placeholder:text-[#1A1A1A]/40"
          />
          <button 
            onClick={handleSend}
            className="w-12 h-12 bg-[#1A1A1A] rounded-full flex items-center justify-center hover:scale-105 transition-transform flex-shrink-0 shadow-md"
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
