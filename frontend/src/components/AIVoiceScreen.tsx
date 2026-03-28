import React from 'react'
import { motion } from 'framer-motion'

interface AIVoiceScreenProps {
  userName: string
  onNavigate: (view: 'landing' | 'auth' | 'voice' | 'dashboard' | 'history') => void
}

export const AIVoiceScreen: React.FC<AIVoiceScreenProps> = ({ userName, onNavigate }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-screen bg-app-gradient flex flex-col relative overflow-hidden"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 pt-12 pb-4">
        <button className="w-12 h-12 bg-[#EFEBE4] rounded-full flex items-center justify-center hover:bg-[#E3DCD3] transition-colors">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <span className="text-[15px] font-semibold text-[#1A1A1A]">AI Assistant</span>
        <button className="w-12 h-12 bg-[#EFEBE4] rounded-full flex items-center justify-center hover:bg-[#E3DCD3] transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="21" x2="4" y2="14"></line>
            <line x1="4" y1="10" x2="4" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12" y2="3"></line>
            <line x1="20" y1="21" x2="20" y2="16"></line>
            <line x1="20" y1="12" x2="20" y2="3"></line>
            <line x1="1" y1="14" x2="7" y2="14"></line>
            <line x1="9" y1="8" x2="15" y2="8"></line>
            <line x1="17" y1="16" x2="23" y2="16"></line>
          </svg>
        </button>
      </div>

      {/* Greeting */}
      <div className="px-6 text-center mt-6 z-10">
        <p className="text-[15px] font-medium text-[#1A1A1A] opacity-60 mb-2">Speak or type to manage ledger</p>
        <h1 className="text-4xl font-semibold text-[#1A1A1A] leading-tight tracking-tight">
          Hi {userName || 'Alex'}, how can I help you today?
        </h1>
      </div>

      {/* Growing gradient orb representing AI */}
      <div className="flex-1 flex items-center justify-center relative">
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="w-72 h-72 rounded-full relative"
          style={{
            background: 'radial-gradient(circle at 60% 40%, rgba(138,155,128,0.8) 0%, rgba(168,152,115,0.6) 50%, rgba(168,152,115,0) 80%)',
            boxShadow: '0 0 80px 40px rgba(168,152,115,0.2) inset, 0 0 40px 10px rgba(138,155,128,0.1)',
            filter: 'blur(4px)'
          }}
        >
          {/* Speckle/particle effect overlay simulated by small rotating dots */}
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#1A1A1A 1px, transparent 1px)', backgroundSize: '12px 12px' }}></div>
        </motion.div>
      </div>

      {/* Bottom Nav with cutout for Mic */}
      <div className="h-32 relative flex items-end">
        {/* Deep dark bottom nav background with center cutout */}
        <div className="absolute bottom-0 w-full h-[100px] bg-[#161211] rounded-t-[40px] flex items-center justify-between px-10">
          <button 
            onClick={() => onNavigate('dashboard')}
            className="text-[#F8F5F2] opacity-60 hover:opacity-100 mt-2 transition-opacity"
          >
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </button>
          
          <button 
            onClick={() => onNavigate('history')}
            className="text-[#F8F5F2] opacity-60 hover:opacity-100 mt-2 transition-opacity"
          >
            {/* History Icon */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </button>
        </div>

        {/* Floating Center Mic Button */}
        <div className="absolute left-1/2 bottom-[40px] -translate-x-1/2 z-10">
          <div className="bg-[#161211] rounded-full p-2">
            <motion.button 
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              className="w-16 h-16 bg-[#F85F54] rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(248,95,84,0.4)]"
            >
              <div className="w-5 h-5 rounded-sm bg-white border border-white"></div>
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
