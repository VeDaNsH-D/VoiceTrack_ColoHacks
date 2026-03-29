import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { loginUser, signupUser } from '../services/api'
import type { AuthSession } from '../App'
import { FiArrowLeft } from 'react-icons/fi'

interface AuthProps {
  onLogin: (session: AuthSession) => void
  onBack: () => void
  language: 'EN' | 'HI'
  onSignupLanguageChange: (lang: 'EN' | 'HI') => void
}

type AuthStep = 'choice' | 'signup' | 'login'

interface InputFieldProps {
  label: string
  type?: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  autoFocus?: boolean
  prefix?: React.ReactNode
  maxLength?: number
}

const InputField: React.FC<InputFieldProps> = ({ label, type = 'text', placeholder, value, onChange, autoFocus, prefix, maxLength }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[11.5px] font-bold uppercase tracking-widest text-[#1A1A1A]/45">{label}</label>
    <div className="input-shell flex items-center gap-3">
      {prefix && <span className="text-[#1A1A1A] font-bold flex-shrink-0">{prefix}</span>}
      {prefix && <div className="w-px h-5 bg-[#1A1A1A]/12 flex-shrink-0" />}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(maxLength ? e.target.value.replace(/\D/g, '').slice(0, maxLength) : e.target.value)}
        className="input-field text-[15px]"
        autoFocus={autoFocus}
      />
    </div>
  </div>
)

export const Auth: React.FC<AuthProps> = ({ onLogin, onBack, language, onSignupLanguageChange }) => {
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
  const [signupLanguage, setSignupLanguage] = useState<'EN' | 'HI'>(language)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setSignupLanguage(language)
  }, [language])

  const handleStepChange = (next: AuthStep) => {
    setError('')
    setStep(next)
  }

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim() || !occupation.trim()) return setError(language === 'EN' ? 'Please fill name and occupation.' : 'कृपया नाम और पेशा भरें।')
    if (phone.length < 10) return setError(language === 'EN' ? 'Enter a valid 10-digit phone number.' : 'सही 10 अंकों का फ़ोन नंबर डालें।')
    if (password.length < 6) return setError(language === 'EN' ? 'Password must be at least 6 characters.' : 'पासवर्ड 6+ अक्षरों का होना चाहिए।')
    if (businessPassword.length < 6) return setError(language === 'EN' ? 'Business password must be at least 6 characters.' : 'बिजनेस पासवर्ड 6+ अक्षरों का होना चाहिए।')
    if (businessMode === 'join' && !businessCode.trim()) return setError(language === 'EN' ? 'Business ID is required to join.' : 'जुड़ने के लिए बिजनेस आईडी आवश्यक है।')

    const identifier = `+91${phone}`
    onSignupLanguageChange(signupLanguage)
    setIsLoading(true)
    try {
      const authResult = await signupUser({ name: name.trim(), phone: identifier, password, businessMode, businessName: businessMode === 'create' ? `${name.trim()}'s Business` : undefined, businessType: occupation.trim().toLowerCase(), businessCode: businessMode === 'join' ? businessCode.trim().toUpperCase() : undefined, businessPassword, preferredLanguage: signupLanguage })
      onLogin({ userId: authResult.user._id, name: authResult.user.name || name.trim(), token: authResult.token, identifier, businessCode: authResult.user.businessId?.businessCode || authResult.business?.businessCode, businessId: authResult.user.businessId?._id || authResult.business?._id, preferredLanguage: signupLanguage })
    } catch (apiError: unknown) {
      const isNetworkIssue = axios.isAxiosError(apiError) && !apiError.response
      setError(String(isNetworkIssue ? (language === 'EN' ? 'Cannot reach backend. Start server on localhost:5001.' : 'बैकएंड तक पहुंच नहीं हो रही।') : ((axios.isAxiosError(apiError) ? apiError.response?.data?.message : undefined) || (language === 'EN' ? 'Signup failed. Please try again.' : 'साइनअप असफल हुआ।'))))
    } finally { setIsLoading(false) }
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const rawIdentifier = loginIdentifier.trim()
    if (!rawIdentifier || loginPassword.length < 6) return setError(language === 'EN' ? 'Enter valid credentials.' : 'सही लॉगिन जानकारी भरें।')
    const normalizedIdentifier = /^\d{10}$/.test(rawIdentifier) ? `+91${rawIdentifier}` : rawIdentifier.toLowerCase()
    setIsLoading(true)
    try {
      const authResult = await loginUser({ identifier: normalizedIdentifier, password: loginPassword })
      onLogin({ userId: authResult.user._id, name: authResult.user.name || 'User', token: authResult.token, identifier: normalizedIdentifier, businessCode: authResult.user.businessId?.businessCode || authResult.business?.businessCode, businessId: authResult.user.businessId?._id || authResult.business?._id })
    } catch (apiError: unknown) {
      const isNetworkIssue = axios.isAxiosError(apiError) && !apiError.response
      setError(String(isNetworkIssue ? (language === 'EN' ? 'Cannot reach backend. Start server on localhost:5001.' : 'बैकएंड तक पहुंच नहीं हो रही।') : ((axios.isAxiosError(apiError) ? apiError.response?.data?.message : undefined) || (language === 'EN' ? 'Login failed. Please try again.' : 'लॉगिन असफल हुआ।'))))
    } finally { setIsLoading(false) }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-[#f1f5f9] flex flex-col relative overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 left-[8%] h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute top-12 right-[10%] h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center px-6 pt-10 pb-4 max-w-6xl w-full mx-auto">
        <button
          onClick={() => step === 'choice' ? onBack() : handleStepChange('choice')}
          className="w-10 h-10 rounded-full bg-white/70 border border-slate-900/10 flex items-center justify-center hover:bg-white transition-all shadow-sm"
        >
          <FiArrowLeft size={18} className="text-[#1A1A1A]" />
        </button>
        <div className="flex-1 flex justify-center">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 border border-slate-900/10 backdrop-blur">
            <div className="w-6 h-6 text-slate-900">
              <svg viewBox="0 0 100 100" fill="none">
                <path d="M20 20 H50 V60 C50 71 41 80 30 80 C24.47 80 20 75.53 20 70 V20 Z" fill="currentColor" />
                <path d="M50 45 C66.56 45 80 58.44 80 75 C80 91.56 66.56 100 50 100 V45 Z" fill="currentColor" />
              </svg>
            </div>
            <span className="text-[16px] font-extrabold text-slate-900 tracking-tight">VoiceTrace</span>
          </div>
        </div>
        <div className="w-10" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-center px-6 pb-16">
        <div className="max-w-sm mx-auto w-full">
          <AnimatePresence mode="wait">

            {/* ── Choice ─────────────────────────────── */}
            {step === 'choice' && (
              <motion.div
                key="choice"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.35 }}
                className="flex flex-col items-center text-center rounded-[28px] border border-slate-900/10 bg-white/75 backdrop-blur-md px-6 py-8 shadow-[0_12px_30px_-22px_rgba(15,23,42,0.55)]"
              >
                <div className="w-[72px] h-[72px] rounded-[22px] bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center mb-7 shadow-lg">
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#F8F5F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <h1 className="text-[30px] font-extrabold text-slate-900 tracking-tight mb-2">
                  {language === 'EN' ? 'Welcome back' : 'आपका स्वागत है'}
                </h1>
                <p className="text-[14px] text-slate-600 font-medium mb-10 max-w-[260px] leading-relaxed">
                  {language === 'EN' ? 'Sign up for a new account or log in to continue.' : 'नया अकाउंट बनाएं या मौजूदा से लॉगिन करें।'}
                </p>

                <div className="w-full space-y-3">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleStepChange('signup')}
                    className="btn-primary w-full text-[16px] !py-[15px]"
                  >
                    {language === 'EN' ? 'Create Account' : 'अकाउंट बनाएं'}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleStepChange('login')}
                    className="btn-ghost w-full text-[16px] !py-[15px] !rounded-full border border-slate-900/12"
                  >
                    {language === 'EN' ? 'Log In' : 'लॉगिन करें'}
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* ── Sign Up ─────────────────────────────── */}
            {step === 'signup' && (
              <motion.div
                key="signup"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.35 }}
                className="rounded-[28px] border border-slate-900/10 bg-white/78 backdrop-blur-md p-6 shadow-[0_12px_30px_-22px_rgba(15,23,42,0.55)]"
              >
                <div className="mb-8">
                  <h1 className="text-[28px] font-extrabold text-slate-900 tracking-tight mb-1">
                    {language === 'EN' ? 'Sign Up' : 'साइन अप'}
                  </h1>
                  <p className="text-[13.5px] text-slate-600 font-medium">
                    {language === 'EN' ? 'Create your account — no OTP needed.' : 'अपना अकाउंट बनाएं — OTP की जरूरत नहीं।'}
                  </p>
                </div>

                <form onSubmit={handleSignupSubmit} className="space-y-3">
                  <div className="flex flex-col gap-2">
                    <label className="text-[11.5px] font-bold uppercase tracking-widest text-slate-500">
                      {language === 'EN' ? 'Preferred Language' : 'पसंदीदा भाषा'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { code: 'EN', label: 'English' },
                        { code: 'HI', label: 'हिंदी' },
                      ] as const).map(option => (
                        <button
                          key={option.code}
                          type="button"
                          onClick={() => {
                            setSignupLanguage(option.code)
                            onSignupLanguageChange(option.code)
                          }}
                          className={`py-2.5 rounded-2xl text-[13px] font-bold transition-all border ${signupLanguage === option.code ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-900/10 hover:bg-slate-50'}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <InputField label={language === 'EN' ? 'Phone Number' : 'फ़ोन नंबर'} type="tel" placeholder="98765 43210" value={phone} onChange={setPhone} prefix="+91" maxLength={10} />
                  <InputField label={language === 'EN' ? 'Your Name' : 'आपका नाम'} placeholder="e.g. Ramesh" value={name} onChange={setName} autoFocus />
                  <InputField label={language === 'EN' ? 'Occupation' : 'पेशा'} placeholder="e.g. Tea Seller" value={occupation} onChange={setOccupation} />
                  <InputField label={language === 'EN' ? 'Password (min 6)' : 'पासवर्ड (6+ अक्षर)'} type="password" placeholder="••••••" value={password} onChange={setPassword} />

                  {/* Business setup */}
                  <div className="flex flex-col gap-3">
                    <label className="text-[11.5px] font-bold uppercase tracking-widest text-[#1A1A1A]/45">
                      {language === 'EN' ? 'Business' : 'बिजनेस'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['create', 'join'] as const).map(mode => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setBusinessMode(mode)}
                          className={`py-2.5 rounded-2xl text-[13px] font-bold transition-all border ${businessMode === mode ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-900/10 hover:bg-slate-50'}`}
                        >
                          {mode === 'create' ? (language === 'EN' ? 'Create New' : 'नया बनाएं') : (language === 'EN' ? 'Join Existing' : 'जुड़ें')}
                        </button>
                      ))}
                    </div>

                    {businessMode === 'join' && (
                      <div className="input-shell">
                        <input type="text" placeholder={language === 'EN' ? 'Business ID (e.g. BIZ-AB12CD)' : 'बिजनेस आईडी'} value={businessCode} onChange={e => setBusinessCode(e.target.value.toUpperCase())} className="input-field" />
                      </div>
                    )}

                    <div className="input-shell">
                      <input type="password" placeholder={language === 'EN' ? 'Business Password' : 'बिजनेस पासवर्ड'} value={businessPassword} onChange={e => setBusinessPassword(e.target.value)} className="input-field" />
                    </div>

                    {businessMode === 'create' && (
                      <p className="text-[11.5px] text-[#1A1A1A]/45 font-medium">
                        {language === 'EN' ? 'A unique Business ID is generated after signup.' : 'साइनअप के बाद यूनिक बिजनेस आईडी बनाई जाएगी।'}
                      </p>
                    )}
                  </div>

                  {error && (
                    <div className="bg-[#F85F54]/10 border border-[#F85F54]/20 rounded-2xl px-4 py-3">
                      <p className="text-[13px] font-semibold text-[#c0392b]">{error}</p>
                    </div>
                  )}

                  <div className="pt-1">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      type="submit"
                      disabled={phone.length < 10 || !name.trim() || !occupation.trim() || password.length < 6 || businessPassword.length < 6 || (businessMode === 'join' && !businessCode.trim()) || isLoading}
                      className="btn-primary w-full text-[15px] !py-4 flex items-center justify-center gap-2"
                    >
                      {isLoading
                        ? <><div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />{language === 'EN' ? 'Creating…' : 'बना रहे हैं…'}</>
                        : (language === 'EN' ? 'Create Account' : 'अकाउंट बनाएं')}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* ── Log In ─────────────────────────────── */}
            {step === 'login' && (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.35 }}
                className="rounded-[28px] border border-slate-900/10 bg-white/78 backdrop-blur-md p-6 shadow-[0_12px_30px_-22px_rgba(15,23,42,0.55)]"
              >
                <div className="mb-8">
                  <h1 className="text-[28px] font-extrabold text-slate-900 tracking-tight mb-1">
                    {language === 'EN' ? 'Welcome Back' : 'वापसी पर स्वागत'}
                  </h1>
                  <p className="text-[13.5px] text-slate-600 font-medium">
                    {language === 'EN' ? 'Use your phone number or email to sign in.' : 'फ़ोन या ईमेल से लॉगिन करें।'}
                  </p>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-3">
                  <InputField label={language === 'EN' ? 'Phone or Email' : 'फ़ोन या ईमेल'} placeholder={language === 'EN' ? '9876543210 or name@email.com' : '9876543210 या ईमेल'} value={loginIdentifier} onChange={setLoginIdentifier} autoFocus />
                  <InputField label={language === 'EN' ? 'Password' : 'पासवर्ड'} type="password" placeholder="••••••" value={loginPassword} onChange={setLoginPassword} />

                  {error && (
                    <div className="bg-[#F85F54]/10 border border-[#F85F54]/20 rounded-2xl px-4 py-3">
                      <p className="text-[13px] font-semibold text-[#c0392b]">{error}</p>
                    </div>
                  )}

                  <div className="pt-1">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      type="submit"
                      disabled={!loginIdentifier.trim() || loginPassword.length < 6 || isLoading}
                      className="btn-primary w-full text-[15px] !py-4 flex items-center justify-center gap-2"
                    >
                      {isLoading
                        ? <><div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />{language === 'EN' ? 'Signing In…' : 'लॉगिन हो रहा है…'}</>
                        : (language === 'EN' ? 'Log In' : 'लॉगिन करें')}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
