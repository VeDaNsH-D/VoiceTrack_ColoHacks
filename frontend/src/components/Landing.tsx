import React from 'react'
import { motion } from 'framer-motion'

interface LandingProps {
  onGetStarted: () => void
  onDemo: () => void
}

export const Landing: React.FC<LandingProps> = ({ onGetStarted, onDemo }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen bg-app-gradient flex flex-col items-center justify-between relative overflow-hidden cursor-pointer"
      onClick={onGetStarted}
    >
      {/* Top Section - Logo */}
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-24 h-24 mb-6"
        >
          {/* Geometric 'b' matching the style from the image */}
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-[#1A1A1A]">
            {/* Top rounded rect */}
            <path d="M20 20 H50 V60 C50 71 41 80 30 80 C24.47 80 20 75.53 20 70 V20 Z" fill="currentColor" />
            
            {/* Bottom half circle forming the 'b' loop */}
            <path d="M50 45 C66.56 45 80 58.44 80 75 C80 91.56 66.56 100 50 100 V45 Z" fill="currentColor" />
            
            {/* Inner cutout text-match */}
            <path d="M50 45 L50 60 C41 60 41 50 50 45 Z" fill="#F8F5F2" />
          </svg>
        </motion.div>
      </div>

      {/* Bottom Section - Title & Sub */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full bg-[#161211] text-[#F8F5F2] rounded-t-[40px] p-8 pb-16 pt-12 flex flex-col items-start"
      >
        <p className="text-sm font-semibold mb-3 opacity-90 tracking-wide">VoiceTrace</p>
        <h1 className="text-4xl sm:text-5xl font-semibold leading-[1.1] tracking-tight mb-8">
          Grow your business<br />with smart AI.
        </h1>
        
        <div className="flex flex-col w-full gap-4 mt-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation()
              onGetStarted()
            }}
            className="w-full bg-[#F8F5F2] text-[#161211] py-4 rounded-2xl font-bold tracking-wide"
          >
            Get Started
          </motion.button>
          
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation()
              onDemo()
            }}
            className="w-full bg-transparent border border-white/20 text-[#F8F5F2] py-4 rounded-2xl font-semibold tracking-wide"
          >
            Try Demo
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}
