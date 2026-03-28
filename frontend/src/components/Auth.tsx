import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { loginUser, signupUser } from '../services/api'
import type { AuthSession } from '../App'

interface AuthProps {
  onLogin: (session: AuthSession) => void
  onBack: () => void
  language: 'EN' | 'HI'
}

type AuthStep = 'phone' | 'otp' | 'details'

export const Auth: React.FC<AuthProps> = ({ onLogin, onBack, language }) => {
  const [step, setStep] = useState<AuthStep>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [name, setName] = useState('')
  const [occupation, setOccupation] = useState('')
  const [password, setPassword] = useState('')
  const [businessMode, setBusinessMode] = useState<'create' | 'join'>('create')
  const [businessCode, setBusinessCode] = useState('')
  const [businessPassword, setBusinessPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
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
    setError('')
    if (otp.length === 4) {
      setIsLoading(true)
      setTimeout(() => {
        setIsLoading(false)
        setStep('details')
      }, 600)
    }
  }

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim() || !occupation.trim() || password.length < 6) {
      setError(language === 'EN' ? 'Please fill all fields with a valid password.' : 'कृपया सभी फ़ील्ड भरें और सही पासवर्ड दें।')
      return
    }

    if (businessPassword.length < 6) {
      setError(language === 'EN' ? 'Business password must be at least 6 characters.' : 'बिजनेस पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।')
      return
    }

    if (businessMode === 'join' && !businessCode.trim()) {
      setError(language === 'EN' ? 'Business ID is required to join.' : 'जुड़ने के लिए बिजनेस आईडी आवश्यक है।')
      return
    }

    const identifier = `+91${phone}`

    setIsLoading(true)

    try {
      let authResult

      try {
        authResult = await signupUser({
          name: name.trim(),
          phone: identifier,
          password,
          businessMode,
          businessName: businessMode === 'create' ? `${name.trim()}'s Business` : undefined,
          businessType: occupation.trim().toLowerCase(),
          businessCode: businessMode === 'join' ? businessCode.trim().toUpperCase() : undefined,
          businessPassword,
        })
      } catch (signupError: unknown) {
        const status = axios.isAxiosError(signupError) ? signupError.response?.status : undefined
        if (status === 409) {
          authResult = await loginUser({
            identifier,
            password,
          })
        } else {
          throw signupError
        }
      }

      onLogin({
        userId: authResult.user._id,
        name: authResult.user.name || name.trim(),
        occupation: occupation.trim(),
        token: authResult.token,
        identifier,
        businessCode: authResult.user.businessId?.businessCode,
      })
    } catch (apiError: unknown) {
      const isNetworkIssue = axios.isAxiosError(apiError) && !apiError.response
      const message = isNetworkIssue
        ? (language === 'EN'
            ? 'Cannot reach backend server. Start backend on http://localhost:5001 and try again.'
            : 'बैकएंड सर्वर तक पहुंच नहीं हो रही। कृपया backend को http://localhost:5001 पर चलाकर फिर प्रयास करें।')
        : ((axios.isAxiosError(apiError) ? apiError.response?.data?.message : undefined) ||
          (language === 'EN' ? 'Authentication failed. Please try again.' : 'ऑथेंटिकेशन असफल हुआ। कृपया दोबारा कोशिश करें।'))
      setError(String(message))
    } finally {
      setIsLoading(false)
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
                <h1 className="text-3xl font-semibold text-[#1A1A1A] tracking-tight mb-2">
                  {language === 'EN' ? 'Welcome Back' : 'वापसी पर स्वागत है'}
                </h1>
                <p className="text-[#1A1A1A] opacity-60 text-sm">
                  {language === 'EN' ? 'Enter your phone number to continue' : 'जारी रखने के लिए अपना फ़ोन नंबर दर्ज करें'}
                </p>
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
                  {isLoading ? <div className="w-6 h-6 border-2 border-[#F8F5F2] border-t-transparent rounded-full animate-spin"></div> : (language === 'EN' ? 'Send OTP' : 'OTP भेजें')}
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
                <h1 className="text-3xl font-semibold text-[#1A1A1A] tracking-tight mb-2">
                  {language === 'EN' ? 'Verify OTP' : 'OTP सत्यापित करें'}
                </h1>
                <p className="text-[#1A1A1A] opacity-60 text-sm">
                  {language === 'EN' ? `We've sent a 4-digit code to +91 ${phone}` : `हमने +91 ${phone} पर 4-अंकीय कोड भेजा है`}
                </p>
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
                  {isLoading ? <div className="w-6 h-6 border-2 border-[#F8F5F2] border-t-transparent rounded-full animate-spin"></div> : (language === 'EN' ? 'Verify & Continue' : 'सत्यापित करें')}
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
                <h1 className="text-3xl font-semibold text-[#1A1A1A] tracking-tight mb-2">
                  {language === 'EN' ? 'Create Profile' : 'प्रोफ़ाइल बनाएं'}
                </h1>
                <p className="text-[#1A1A1A] opacity-60 text-sm">
                  {language === 'EN' ? 'Tell us a bit about your business' : 'हमें अपने व्यवसाय के बारे में थोड़ा बताएं'}
                </p>
              </div>

              <form onSubmit={handleDetailsSubmit} className="space-y-4">
                <div className="glass-card p-4">
                  <p className="text-xs font-semibold text-[#1A1A1A] opacity-60 mb-1 uppercase tracking-wider">
                    {language === 'EN' ? 'Your Name' : 'आपका नाम'}
                  </p>
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
                  <p className="text-xs font-semibold text-[#1A1A1A] opacity-60 mb-1 uppercase tracking-wider">
                    {language === 'EN' ? 'Occupation' : 'पेशा'}
                  </p>
                  <input 
                    type="text" 
                    placeholder="e.g. Tea Seller or Fruit Vendor"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    className="bg-transparent border-none outline-none w-full text-[#1A1A1A] placeholder:text-[#1A1A1A] placeholder:opacity-30 font-medium"
                  />
                </div>

                <div className="glass-card p-4">
                  <p className="text-xs font-semibold text-[#1A1A1A] opacity-60 mb-1 uppercase tracking-wider">
                    {language === 'EN' ? 'Password (min 6 chars)' : 'पासवर्ड (कम से कम 6 अक्षर)'}
                  </p>
                  <input
                    type="password"
                    placeholder="******"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-transparent border-none outline-none w-full text-[#1A1A1A] placeholder:text-[#1A1A1A] placeholder:opacity-30 font-medium"
                  />
                </div>

                <div className="glass-card p-4">
                  <p className="text-xs font-semibold text-[#1A1A1A] opacity-60 mb-2 uppercase tracking-wider">
                    {language === 'EN' ? 'Business Setup' : 'बिजनेस सेटअप'}
                  </p>

                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setBusinessMode('create')}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${businessMode === 'create' ? 'bg-[#161211] text-[#F8F5F2]' : 'bg-white/50 text-[#1A1A1A]/70'}`}
                    >
                      {language === 'EN' ? 'Create New' : 'नया बनाएं'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBusinessMode('join')}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${businessMode === 'join' ? 'bg-[#161211] text-[#F8F5F2]' : 'bg-white/50 text-[#1A1A1A]/70'}`}
                    >
                      {language === 'EN' ? 'Join Existing' : 'मौजूदा से जुड़ें'}
                    </button>
                  </div>

                  {businessMode === 'join' && (
                    <input
                      type="text"
                      placeholder={language === 'EN' ? 'Enter Business ID (e.g. BIZ-AB12CD)' : 'बिजनेस आईडी डालें (जैसे BIZ-AB12CD)'}
                      value={businessCode}
                      onChange={(e) => setBusinessCode(e.target.value.toUpperCase())}
                      className="bg-white/50 border border-white/40 rounded-xl px-3 py-2 w-full text-[#1A1A1A] placeholder:text-[#1A1A1A]/40 font-medium mb-2"
                    />
                  )}

                  <input
                    type="password"
                    placeholder={language === 'EN' ? 'Business Password' : 'बिजनेस पासवर्ड'}
                    value={businessPassword}
                    onChange={(e) => setBusinessPassword(e.target.value)}
                    className="bg-white/50 border border-white/40 rounded-xl px-3 py-2 w-full text-[#1A1A1A] placeholder:text-[#1A1A1A]/40 font-medium"
                  />

                  {businessMode === 'create' && (
                    <p className="text-xs text-[#1A1A1A]/55 mt-2">
                      {language === 'EN' ? 'A unique Business ID will be generated after signup.' : 'साइनअप के बाद यूनिक बिजनेस आईडी बनाई जाएगी।'}
                    </p>
                  )}
                </div>

                {error && (
                  <p className="text-sm font-semibold text-[#F85F54] px-1">
                    {error}
                  </p>
                )}

                <div className="pt-2">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    disabled={!name.trim() || !occupation.trim() || password.length < 6 || businessPassword.length < 6 || (businessMode === 'join' && !businessCode.trim()) || isLoading}
                    className="w-full bg-[#161211] text-[#F8F5F2] py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex justify-center items-center"
                  >
                    {isLoading ? <div className="w-6 h-6 border-2 border-[#F8F5F2] border-t-transparent rounded-full animate-spin"></div> : (language === 'EN' ? 'Start Recording' : 'रिकॉर्डिंग शुरू करें')}
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
