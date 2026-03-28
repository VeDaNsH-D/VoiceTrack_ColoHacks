import React from 'react'
import { motion } from 'framer-motion'

interface AIVoiceScreenProps {
  userName: string
  onToggleSidebar: () => void
  language: 'EN' | 'HI'
}

export const AIVoiceScreen: React.FC<AIVoiceScreenProps> = ({ userName, onToggleSidebar, language }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-screen bg-app-gradient flex flex-col relative overflow-hidden"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 pt-12 pb-4">
        <button 
          onClick={onToggleSidebar}
          className="w-12 h-12 bg-[#EFEBE4] rounded-full flex items-center justify-center hover:bg-[#E3DCD3] transition-colors shadow-sm"
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
            {language === 'EN' ? 'AI Assistant' : 'AI सहायक'}
          </span>
        </div>
        <div className="w-12 h-12" />
      </div>

      {/* Hero Greeting Text (Moved up slightly) */}
      <div className="px-8 mt-4 mb-2 z-10 text-center">
        <h2 className="text-2xl font-semibold mb-2">
          {language === 'EN' ? `Hi ${userName || 'Alex'},` : `नमस्ते ${userName || 'Alex'},`}
        </h2>
        <p className="text-[#1A1A1A]/60 text-lg">
          {language === 'EN' ? 'how can I help you today?' : 'मैं आज आपकी कैसे मदद कर सकता हूँ?'}
        </p>
      </div>

      {/* Majestic Halo AI Interface */}
      <div className="flex-1 flex items-center justify-center relative perspective-[1000px]">
        
        {/* Core Dark Orb */}
        <motion.div 
          animate={{ 
            scale: [1, 1.05, 1], 
            filter: ['blur(8px)', 'blur(16px)', 'blur(8px)'],
            opacity: [0.9, 1, 0.9]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute w-28 h-28 rounded-full bg-gradient-to-tr from-[#0F0C0B] to-[#2B2B2B] shadow-[0_0_60px_15px_rgba(26,26,26,0.6)] z-10"
        />

        {/* Ring 1: Fast Axis */}
        <motion.div 
          animate={{ rotateZ: 360, rotateX: [60, 75, 60], rotateY: [0, 180, 360] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          className="absolute w-56 h-56 rounded-full border-[1.5px] border-[#1A1A1A] opacity-60 border-t-transparent shadow-[0_0_20px_rgba(26,26,26,0.3)]"
          style={{ transformStyle: 'preserve-3d' }}
        />

        {/* Ring 2: Slow Counter Axis */}
        <motion.div 
          animate={{ rotateZ: -360, rotateX: [70, 85, 70], rotateY: [360, 180, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          className="absolute w-48 h-48 rounded-full border-[2.5px] border-[#A89873] opacity-30 border-l-transparent shadow-[0_0_20px_rgba(168,152,115,0.2)]"
          style={{ transformStyle: 'preserve-3d' }}
        />

        {/* Ring 3: Delicate Outer Halo */}
        <motion.div 
          animate={{ rotateZ: 360, scale: [1, 1.05, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute w-72 h-72 rounded-full border-[1px] border-dashed border-[#1A1A1A] opacity-10"
        />

        {/* Center Spark */}
        <div className="w-8 h-8 rounded-full bg-white blur-md z-20 absolute" />
      </div>

      {/* Floating Center Mic Button */}
      <div className="absolute left-1/2 bottom-[40px] -translate-x-1/2 z-30">
        <div className="bg-[#161211] rounded-[32px] p-2 shadow-2xl border border-white/5">
          <motion.button 
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            className="w-16 h-16 bg-[#F85F54] rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(248,95,84,0.4)]"
          >
            <div className="w-5 h-5 rounded-sm bg-white border border-white"></div>
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
