import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface AuthProps {
  onLogin: (name: string, occupation: string) => void
  onBack: () => void
}

type AuthStep = 'phone' | 'otp' | 'details'

export const Auth: React.FC<AuthProps> = ({ onLogin, onBack }) => {
  const [step, setStep] = useState<AuthStep>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [name, setName] = useState('')
  const [occupation, setOccupation] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (phone.length >= 10) {
      setIsLoading(true)
      setTimeout(() => {
        setIsLoading(false)
        setStep('otp')
      }, 800)
    }
  }

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length === 4) {
      setIsLoading(true)
      setTimeout(() => {
        setIsLoading(false)
        setStep('details')
      }, 600)
    }
  }

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim() && occupation.trim()) {
      onLogin(name.trim(), occupation.trim())
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
        onClick={() => {
          if (step === 'phone') onBack()
          else if (step === 'otp') setStep('phone')
          else setStep('otp')
        }}
        className="w-10 h-10 bg-[#E6DFD7] bg-opacity-60 rounded-full flex items-center justify-center hover:bg-opacity-100 transition-colors mt-6 z-10"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full relative -mt-10">
        <AnimatePresence mode="wait">
          {step === 'phone' && (
            <motion.div
              key="phone"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full"
            >
              <div className="mb-10 text-center">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[#8A9B80] to-[#A89873] rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                   <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F8F5F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                    <line x1="12" y1="18" x2="12.01" y2="18"></line>
                  </svg>
                </div>
                <h1 className="text-3xl font-semibold text-[#1A1A1A] tracking-tight mb-2">Welcome Back</h1>
                <p className="text-[#1A1A1A] opacity-60 text-sm">Enter your phone number to continue</p>
              </div>

              <form onSubmit={handlePhoneSubmit} className="space-y-6">
                <div className="glass-card p-4 flex items-center gap-3">
                  <span className="text-[#1A1A1A] font-semibold">+91</span>
                  <div className="w-px h-6 bg-[#1A1A1A] opacity-20"></div>
                  <input 
                    type="tel" 
                    placeholder="98765 43210"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="bg-transparent border-none outline-none w-full text-[#1A1A1A] placeholder:text-[#1A1A1A] placeholder:opacity-40 font-medium text-lg tracking-wide"
                    autoFocus
                  />
                </div>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={phone.length < 10 || isLoading}
                  className="w-full bg-[#161211] text-[#F8F5F2] py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex justify-center items-center"
                >
                  {isLoading ? <div className="w-6 h-6 border-2 border-[#F8F5F2] border-t-transparent rounded-full animate-spin"></div> : 'Send OTP'}
                </motion.button>
              </form>
            </motion.div>
          )}

          {step === 'otp' && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full"
            >
              <div className="mb-10 text-center">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[#8A9B80] to-[#A89873] rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                   <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F8F5F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </div>
                <h1 className="text-3xl font-semibold text-[#1A1A1A] tracking-tight mb-2">Verify OTP</h1>
                <p className="text-[#1A1A1A] opacity-60 text-sm">We've sent a 4-digit code to +91 {phone}</p>
              </div>

              <form onSubmit={handleOtpSubmit} className="space-y-6">
                <div className="glass-card p-4 flex items-center gap-3">
                  <input 
                    type="text" 
                    placeholder="1 2 3 4"
                    maxLength={4}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="bg-transparent border-none outline-none w-full text-center text-[#1A1A1A] placeholder:text-[#1A1A1A] placeholder:opacity-40 font-bold text-2xl tracking-[0.5em]"
                    autoFocus
                  />
                </div>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={otp.length < 4 || isLoading}
                  className="w-full bg-[#161211] text-[#F8F5F2] py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex justify-center items-center"
                >
                  {isLoading ? <div className="w-6 h-6 border-2 border-[#F8F5F2] border-t-transparent rounded-full animate-spin"></div> : 'Verify & Continue'}
                </motion.button>
              </form>
            </motion.div>
          )}

          {step === 'details' && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full"
            >
              <div className="mb-10 text-center">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[#8A9B80] to-[#A89873] rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                   <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F8F5F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
                <h1 className="text-3xl font-semibold text-[#1A1A1A] tracking-tight mb-2">Create Profile</h1>
                <p className="text-[#1A1A1A] opacity-60 text-sm">Tell us a bit about your business</p>
              </div>

              <form onSubmit={handleDetailsSubmit} className="space-y-4">
                <div className="glass-card p-4">
                  <p className="text-xs font-semibold text-[#1A1A1A] opacity-60 mb-1 uppercase tracking-wider">Your Name</p>
                  <input 
                    type="text" 
                    placeholder="e.g. Ramesh"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-transparent border-none outline-none w-full text-[#1A1A1A] placeholder:text-[#1A1A1A] placeholder:opacity-30 font-medium"
                    autoFocus
                  />
                </div>
                
                <div className="glass-card p-4">
                  <p className="text-xs font-semibold text-[#1A1A1A] opacity-60 mb-1 uppercase tracking-wider">Occupation</p>
                  <input 
                    type="text" 
                    placeholder="e.g. Tea Seller or Fruit Vendor"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    className="bg-transparent border-none outline-none w-full text-[#1A1A1A] placeholder:text-[#1A1A1A] placeholder:opacity-30 font-medium"
                  />
                </div>

                <div className="pt-2">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    disabled={!name.trim() || !occupation.trim()}
                    className="w-full bg-[#161211] text-[#F8F5F2] py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                  >
                    Start Recording
                  </motion.button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
