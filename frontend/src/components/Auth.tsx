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

type AuthStep = 'choice' | 'signup' | 'login'

export const Auth: React.FC<AuthProps> = ({ onLogin, onBack, language }) => {
  const [step, setStep] = useState<AuthStep>('choice')
  const [phone, setPhone] = useState('')
  const [loginIdentifier, setLoginIdentifier] = useState('')
  const [name, setName] = useState('')
  const [occupation, setOccupation] = useState('')
  const [password, setPassword] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [businessMode, setBusinessMode] = useState<'create' | 'join'>('create')
  const [businessCode, setBusinessCode] = useState('')
  const [businessPassword, setBusinessPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleStepChange = (next: AuthStep) => {
    setError('')
    setStep(next)
  }

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim() || !occupation.trim()) {
      setError(language === 'EN' ? 'Please fill name and occupation.' : 'कृपया नाम और पेशा भरें।')
      return
    }

    if (phone.length < 10) {
      setError(language === 'EN' ? 'Please enter a valid 10-digit phone number.' : 'कृपया सही 10 अंकों का फ़ोन नंबर डालें।')
      return
    }

    if (password.length < 6) {
      setError(language === 'EN' ? 'Password must be at least 6 characters.' : 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।')
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
      const authResult = await signupUser({
        name: name.trim(),
        phone: identifier,
        password,
        businessMode,
        businessName: businessMode === 'create' ? `${name.trim()}'s Business` : undefined,
        businessType: occupation.trim().toLowerCase(),
        businessCode: businessMode === 'join' ? businessCode.trim().toUpperCase() : undefined,
        businessPassword,
      })

      onLogin({
        userId: authResult.user._id,
        name: authResult.user.name || name.trim(),
        occupation: occupation.trim(),
        token: authResult.token,
        identifier,
        businessCode: authResult.user.businessId?.businessCode,
        businessId: authResult.user.businessId?._id,
      })
    } catch (apiError: unknown) {
      const isNetworkIssue = axios.isAxiosError(apiError) && !apiError.response
      const message = isNetworkIssue
        ? (language === 'EN'
            ? 'Cannot reach backend server. Start backend on http://localhost:5001 and try again.'
            : 'बैकएंड सर्वर तक पहुंच नहीं हो रही। कृपया backend को http://localhost:5001 पर चलाकर फिर प्रयास करें।')
        : ((axios.isAxiosError(apiError) ? apiError.response?.data?.message : undefined) ||
          (language === 'EN' ? 'Signup failed. Please try again.' : 'साइनअप असफल हुआ। कृपया दोबारा कोशिश करें।'))
      setError(String(message))
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const rawIdentifier = loginIdentifier.trim()
    if (!rawIdentifier || loginPassword.length < 6) {
      setError(language === 'EN' ? 'Enter valid login credentials.' : 'कृपया सही लॉगिन जानकारी भरें।')
      return
    }

    const normalizedIdentifier = /^\d{10}$/.test(rawIdentifier)
      ? `+91${rawIdentifier}`
      : rawIdentifier.toLowerCase()

    setIsLoading(true)

    try {
      const authResult = await loginUser({
        identifier: normalizedIdentifier,
        password: loginPassword,
      })

      onLogin({
        userId: authResult.user._id,
        name: authResult.user.name || 'User',
        occupation: authResult.user.businessId?.type || '',
        token: authResult.token,
        identifier: normalizedIdentifier,
        businessCode: authResult.user.businessId?.businessCode,
        businessId: authResult.user.businessId?._id,
      })
    } catch (apiError: unknown) {
      const isNetworkIssue = axios.isAxiosError(apiError) && !apiError.response
      const message = isNetworkIssue
        ? (language === 'EN'
            ? 'Cannot reach backend server. Start backend on http://localhost:5001 and try again.'
            : 'बैकएंड सर्वर तक पहुंच नहीं हो रही। कृपया backend को http://localhost:5001 पर चलाकर फिर प्रयास करें।')
        : ((axios.isAxiosError(apiError) ? apiError.response?.data?.message : undefined) ||
          (language === 'EN' ? 'Login failed. Please try again.' : 'लॉगिन असफल हुआ। कृपया दोबारा कोशिश करें।'))
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
          if (step === 'choice') {
            onBack()
          } else {
            handleStepChange('choice')
          }
        }}
        className="w-10 h-10 bg-[#E6DFD7] bg-opacity-60 rounded-full flex items-center justify-center hover:bg-opacity-100 transition-colors mt-6 z-10"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full relative -mt-10">
        <AnimatePresence mode="wait">
          {step === 'choice' && (
            <motion.div
              key="choice"
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
                  {language === 'EN' ? 'Choose Account Action' : 'अकाउंट विकल्प चुनें'}
                </h1>
                <p className="text-[#1A1A1A] opacity-60 text-sm">
                  {language === 'EN' ? 'Sign up for a new account or log in to an existing one.' : 'नया अकाउंट बनाएं या मौजूदा अकाउंट में लॉगिन करें।'}
                </p>
              </div>

              <div className="space-y-4">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => handleStepChange('signup')}
                  className="w-full bg-[#161211] text-[#F8F5F2] py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex justify-center items-center"
                >
                  {language === 'EN' ? 'Sign Up' : 'साइन अप'}
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => handleStepChange('login')}
                  className="w-full bg-transparent border border-[#161211]/20 text-[#161211] py-4 rounded-2xl font-semibold tracking-wide"
                >
                  {language === 'EN' ? 'Log In' : 'लॉगिन'}
                </motion.button>
              </div>
            </motion.div>
          )}

          {step === 'signup' && (
            <motion.div
              key="signup"
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
                  {language === 'EN' ? 'Sign Up' : 'साइन अप'}
                </h1>
                <p className="text-[#1A1A1A] opacity-60 text-sm">
                  {language === 'EN' ? 'Create your account without OTP verification.' : 'OTP के बिना अपना अकाउंट बनाएं।'}
                </p>
              </div>

              <form onSubmit={handleSignupSubmit} className="space-y-4">
                <div className="glass-card p-4">
                  <p className="text-xs font-semibold text-[#1A1A1A] opacity-60 mb-1 uppercase tracking-wider">
                    {language === 'EN' ? 'Phone Number' : 'फ़ोन नंबर'}
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-[#1A1A1A] font-semibold">+91</span>
                    <div className="w-px h-6 bg-[#1A1A1A] opacity-20"></div>
                    <input
                      type="tel"
                      placeholder="98765 43210"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      className="bg-transparent border-none outline-none w-full text-[#1A1A1A] placeholder:text-[#1A1A1A] placeholder:opacity-30 font-medium"
                    />
                  </div>
                </div>

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
                    disabled={phone.length < 10 || !name.trim() || !occupation.trim() || password.length < 6 || businessPassword.length < 6 || (businessMode === 'join' && !businessCode.trim()) || isLoading}
                    className="w-full bg-[#161211] text-[#F8F5F2] py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex justify-center items-center"
                  >
                    {isLoading ? <div className="w-6 h-6 border-2 border-[#F8F5F2] border-t-transparent rounded-full animate-spin"></div> : (language === 'EN' ? 'Create Account' : 'अकाउंट बनाएं')}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          )}

          {step === 'login' && (
            <motion.div
              key="login"
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
                  {language === 'EN' ? 'Log In' : 'लॉगिन'}
                </h1>
                <p className="text-[#1A1A1A] opacity-60 text-sm">
                  {language === 'EN' ? 'Use phone (10 digits) or email with password.' : 'पासवर्ड के साथ फ़ोन (10 अंक) या ईमेल डालें।'}
                </p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="glass-card p-4">
                  <p className="text-xs font-semibold text-[#1A1A1A] opacity-60 mb-1 uppercase tracking-wider">
                    {language === 'EN' ? 'Phone or Email' : 'फ़ोन या ईमेल'}
                  </p>
                  <input
                    type="text"
                    placeholder={language === 'EN' ? '9876543210 or name@email.com' : '9876543210 या name@email.com'}
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    className="bg-transparent border-none outline-none w-full text-[#1A1A1A] placeholder:text-[#1A1A1A] placeholder:opacity-30 font-medium"
                    autoFocus
                  />
                </div>

                <div className="glass-card p-4">
                  <p className="text-xs font-semibold text-[#1A1A1A] opacity-60 mb-1 uppercase tracking-wider">
                    {language === 'EN' ? 'Password' : 'पासवर्ड'}
                  </p>
                  <input
                    type="password"
                    placeholder="******"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="bg-transparent border-none outline-none w-full text-[#1A1A1A] placeholder:text-[#1A1A1A] placeholder:opacity-30 font-medium"
                  />
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
                    disabled={!loginIdentifier.trim() || loginPassword.length < 6 || isLoading}
                    className="w-full bg-[#161211] text-[#F8F5F2] py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex justify-center items-center"
                  >
                    {isLoading ? <div className="w-6 h-6 border-2 border-[#F8F5F2] border-t-transparent rounded-full animate-spin"></div> : (language === 'EN' ? 'Log In' : 'लॉगिन')}
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
