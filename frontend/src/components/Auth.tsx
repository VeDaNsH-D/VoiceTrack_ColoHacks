import React, { useState } from 'react'
import { motion } from 'framer-motion'

interface AuthProps {
  onLogin: (name: string) => void
  onBack: () => void
}

export const Auth: React.FC<AuthProps> = ({ onLogin, onBack }) => {
  const [name, setName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onLogin(name.trim())
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-app-gradient flex flex-col p-6 relative"
    >
      {/* Back Button */}
      <button 
        onClick={onBack}
        className="w-10 h-10 bg-[#E6DFD7] bg-opacity-60 rounded-full flex items-center justify-center hover:bg-opacity-100 transition-colors mt-6"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-10 text-center"
        >
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[#8A9B80] to-[#A89873] rounded-2xl flex items-center justify-center mb-6 shadow-lg">
             <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#F8F5F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <h1 className="text-3xl font-semibold text-[#1A1A1A] tracking-tight mb-2">Welcome Back</h1>
          <p className="text-[#1A1A1A] opacity-60 text-sm">Enter your name to access your ledger</p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="glass-card p-4 flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <input 
              type="text" 
              placeholder="Your Name (e.g. Ramesh)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-[#1A1A1A] placeholder:text-[#1A1A1A] placeholder:opacity-40 font-medium"
              autoFocus
            />
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={!name.trim()}
            className="w-full bg-[#161211] text-[#F8F5F2] py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue to Ledger
          </motion.button>
        </form>
      </div>
    </motion.div>
  )
}
