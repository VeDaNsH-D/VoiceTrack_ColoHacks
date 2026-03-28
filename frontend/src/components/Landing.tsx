import React from 'react'
import { motion } from 'framer-motion'
import { FiArrowRight, FiBarChart2, FiMic, FiCheckCircle, FiZap } from 'react-icons/fi'

interface LandingProps {
  onGetStarted: () => void
  onDemo: () => void
  language: 'EN' | 'HI'
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 22 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: [0.25, 0.1, 0.25, 1] },
})

export const Landing: React.FC<LandingProps> = ({ onGetStarted, onDemo, language }) => {
  return (
    <div className="min-h-screen bg-app-gradient bg-grid-pattern flex flex-col items-center relative overflow-x-hidden font-sans pb-28">

      {/* ── Navigation ─────────────────────────────── */}
      <nav className="w-full flex items-center justify-between px-6 py-5 lg:px-14 relative z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 text-[#1A1A1A]">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 20 H50 V60 C50 71 41 80 30 80 C24.47 80 20 75.53 20 70 V20 Z" fill="currentColor" />
              <path d="M50 45 C66.56 45 80 58.44 80 75 C80 91.56 66.56 100 50 100 V45 Z" fill="currentColor" />
              <path d="M50 45 L50 60 C41 60 41 50 50 45 Z" fill="#F0EBE4" />
            </svg>
          </div>
          <span className="text-[18px] font-extrabold tracking-tight text-[#1A1A1A]">VoiceTrace</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-[14.5px] font-semibold text-[#1A1A1A]/60">
          <a href="#" className="hover:text-[#1A1A1A] transition-colors">{language === 'EN' ? 'Features' : 'सुविधाएँ'}</a>
          <a href="#" className="hover:text-[#1A1A1A] transition-colors">{language === 'EN' ? 'Analytics' : 'एनालिटिक्स'}</a>
          <a href="#" className="hover:text-[#1A1A1A] transition-colors">{language === 'EN' ? 'Pricing' : 'मूल्य'}</a>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onDemo}
            className="hidden sm:block text-[14px] font-semibold text-[#1A1A1A]/60 hover:text-[#1A1A1A] transition-colors"
          >
            {language === 'EN' ? 'Demo' : 'डेमो'}
          </button>
          <button
            onClick={onGetStarted}
            className="btn-sage text-[14px] !py-2.5 !px-5 flex items-center gap-1.5"
          >
            {language === 'EN' ? 'Open App' : 'ऐप खोलें'}
            <FiArrowRight size={14} />
          </button>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────── */}
      <div className="w-full max-w-6xl mx-auto flex flex-col items-center text-center mt-10 md:mt-16 px-6 relative z-40">

        {/* Announcement pill */}
        <motion.div {...fadeUp(0)} className="flex items-center gap-2 mb-8">
          <div className="flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-white/80 px-4 py-2 rounded-full shadow-sm">
            <span className="status-dot status-dot-active" />
            <span className="text-[13px] font-semibold text-[#1A1A1A]/70">
              {language === 'EN' ? 'New: Real-time AI Voice Features' : 'नया: AI वॉयस फ़ीचर लाइव'}
            </span>
            <span className="w-px h-4 bg-[#1A1A1A]/15 mx-0.5" />
            <button onClick={onGetStarted} className="text-[13px] font-bold text-[#8A9B80] flex items-center gap-1 hover:underline">
              {language === 'EN' ? 'Try it' : 'आज़माएँ'} <FiArrowRight size={12} />
            </button>
          </div>
        </motion.div>

        <motion.h1 {...fadeUp(0.08)} className="text-5xl md:text-6xl lg:text-[76px] font-extrabold tracking-tight text-[#1A1A1A] max-w-4xl mb-6 leading-[1.08]">
          {language === 'EN' ? (
            <>Your Business,<br /><span className="text-gradient">Voice-Ledgered</span></>
          ) : (
            <>आपका व्यवसाय,<br /><span className="text-gradient">वॉयस-लेजर्ड</span></>
          )}
        </motion.h1>

        <motion.p {...fadeUp(0.15)} className="text-[17px] md:text-[18px] text-[#1A1A1A]/60 font-medium max-w-2xl mb-10 leading-relaxed">
          {language === 'EN'
            ? 'Speak naturally. VoiceTrace logs your sales, tracks inventory and builds daily insights — all in real time.'
            : 'सामान्य रूप से बोलें। VoiceTrace बिक्री दर्ज करता है, इन्वेंट्री ट्रैक करता है और रोज़ाना इनसाइट तैयार करता है।'}
        </motion.p>

        <motion.div {...fadeUp(0.22)} className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button onClick={onGetStarted} className="btn-primary !text-[16px] !px-8 !py-4 flex items-center justify-center gap-2">
            {language === 'EN' ? 'Get Started Free' : 'मुफ्त शुरू करें'}
            <FiArrowRight size={18} />
          </button>
          <button onClick={onDemo} className="btn-ghost !text-[16px] !py-4 !px-7">
            {language === 'EN' ? 'Watch Demo' : 'डेमो देखें'}
          </button>
        </motion.div>

        {/* Social proof */}
        <motion.div {...fadeUp(0.3)} className="flex items-center gap-3 mt-8">
          <div className="flex -space-x-2">
            {['#FFCBA4', '#B5D5A8', '#A8C5DA', '#D5B8F0'].map((c, i) => (
              <div key={i} className="w-7 h-7 rounded-full border-2 border-white" style={{ background: c }} />
            ))}
          </div>
          <p className="text-[13px] text-[#1A1A1A]/50 font-medium">
            {language === 'EN' ? '2,400+ vendors trust VoiceTrace' : '2,400+ विक्रेता VoiceTrace पर भरोसा करते हैं'}
          </p>
        </motion.div>
      </div>

      {/* ── Phone Mockup Section ────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-5xl mx-auto mt-20 relative h-[580px] flex justify-center z-30 px-4"
        style={{ perspective: '900px' }}
      >
        {/* Left Floating Card */}
        <div className="absolute left-0 md:left-8 lg:left-20 top-20 z-20 hidden md:block w-68">
          <motion.div
            initial={{ opacity: 0, x: -20, rotate: -8 }}
            animate={{ opacity: 1, x: 0, rotate: -5 }}
            transition={{ duration: 0.7, delay: 0.55 }}
            whileHover={{ rotate: -1, y: -6, transition: { duration: 0.3 } }}
            className="glass-card-float p-5 flex flex-col gap-4 w-[260px]"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#F0EBE4] flex items-center justify-center">
                <FiMic size={15} className="text-[#8A9B80]" />
              </div>
              <span className="text-[13px] font-bold text-[#1A1A1A]">
                {language === 'EN' ? 'Recording…' : 'रिकॉर्डिंग…'}
              </span>
            </div>
            <div className="w-full bg-[#1A1A1A] rounded-2xl h-16 flex items-center justify-center gap-[3px] px-3 overflow-hidden">
              {Array.from({ length: 22 }).map((_, i) => {
                const h = [20,35,55,70,48,80,60,40,75,55,30,65,80,45,60,50,30,70,45,60,35,55][i] || 30
                return <div key={i} className="w-[3px] rounded-full bg-gradient-to-t from-[#F85F54] to-[#F5A623] opacity-90" style={{ height: `${h}%` }} />
              })}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[12px] text-[#1A1A1A]/50 font-medium">
                {language === 'EN' ? '"Sold 5kg tomato…"' : '"5 किलो टमाटर बेचा…"'}
              </span>
              <div className="w-6 h-6 rounded-full bg-[#8A9B80] flex items-center justify-center">
                <FiCheckCircle size={12} className="text-white" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Center Phone Mockup */}
        <div className="w-full max-w-[295px] h-full phone-mockup relative z-30 flex flex-col" style={{ transform: 'rotateY(-4deg) rotateX(2deg)' }}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-[#1a1a1a] rounded-b-2xl z-50" />
          <div className="flex-1 overflow-hidden flex flex-col pt-9 px-4 relative h-full bg-[#F5F0EB]">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#fce0c7] flex items-center justify-center font-bold text-[#1A1A1A] text-sm border-2 border-white shadow-sm">R</div>
                <div>
                  <p className="text-[10px] text-[#1A1A1A]/50 font-semibold leading-none">Hello,</p>
                  <p className="text-[13px] font-bold text-[#1A1A1A] leading-tight">Rahul Trader</p>
                </div>
              </div>
              <div className="bg-white px-3 py-1.5 rounded-full flex items-center gap-1 shadow-sm">
                <span className="text-[#8A9B80] text-[12px] font-bold">₹</span>
                <span className="text-[12px] font-bold text-[#1A1A1A]">18.5K</span>
              </div>
            </div>

            {/* Balance card */}
            <div className="bg-[#1A1A1A] rounded-[18px] p-4 mb-3 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/5" />
              <div className="absolute -right-2 top-8 w-12 h-12 rounded-full bg-white/3" />
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">This Month</p>
              <p className="text-[26px] font-extrabold tracking-tight text-white">₹18,500</p>
              <div className="flex items-center gap-1.5 mt-2">
                <div className="status-dot status-dot-active" style={{ background: '#8A9B80' }} />
                <span className="text-[10px] text-white/50 font-semibold">24 transactions logged</span>
              </div>
            </div>

            {/* AI Insight card */}
            <div className="bg-[#f0eafd] rounded-[18px] p-3.5 flex flex-col gap-2 mb-3 relative overflow-hidden">
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-lg bg-white/50 flex items-center justify-center flex-shrink-0">
                  <FiZap size={13} className="text-[#8A6FC3]" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[#1A1A1A]">Daily AI Insight</p>
                  <p className="text-[10px] text-[#1A1A1A]/50 font-medium flex items-center gap-1"><FiBarChart2 size={9} /> Potato stock running low</p>
                </div>
              </div>
              <button className="bg-white text-[10px] font-bold py-1.5 rounded-lg text-center shadow-sm w-full text-[#1A1A1A]">
                View Details →
              </button>
            </div>

            {/* Mini stats */}
            <div className="flex gap-2">
              <div className="flex-1 bg-white rounded-[14px] px-3 py-2.5 shadow-sm">
                <p className="text-[9px] font-bold text-[#1A1A1A]/40 uppercase tracking-wide">Sales</p>
                <p className="text-[14px] font-extrabold text-[#1A1A1A]">₹24K</p>
              </div>
              <div className="flex-1 bg-white rounded-[14px] px-3 py-2.5 shadow-sm">
                <p className="text-[9px] font-bold text-[#1A1A1A]/40 uppercase tracking-wide">Exp.</p>
                <p className="text-[14px] font-extrabold text-[#F85F54]">₹5.5K</p>
              </div>
            </div>

            {/* fade overlay */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#F5F0EB] to-transparent z-40" />
          </div>
        </div>

        {/* Right Floating Card */}
        <div className="absolute right-0 md:right-4 lg:right-14 top-44 z-40 hidden md:block">
          <motion.div
            initial={{ opacity: 0, x: 20, rotate: 6 }}
            animate={{ opacity: 1, x: 0, rotate: 4 }}
            transition={{ duration: 0.7, delay: 0.65 }}
            whileHover={{ rotate: 0, y: -6, transition: { duration: 0.3 } }}
            className="glass-card-float p-5 flex flex-col gap-3 w-[240px]"
          >
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-[#1A1A1A] text-[14px]">{language === 'EN' ? 'Monthly Growth' : 'मासिक वृद्धि'}</h3>
              <FiArrowRight size={15} className="text-[#1A1A1A]/40 -rotate-45" />
            </div>
            <div className="badge badge-green">
              <FiCheckCircle size={11} /> +21% Sales
            </div>
            <p className="text-[11px] text-[#1A1A1A]/50 font-medium pb-2 border-b border-[#1A1A1A]/08">
              {language === 'EN' ? 'Smart inventory helped cut waste' : 'स्मार्ट इन्वेंट्री से बचत हुई'}
            </p>
            <div className="flex flex-col gap-2 mt-1">
              {[['Vegetables', '80%', '#8A9B80'], ['Grains', '60%', '#A8D0C5'], ['Dairy', '45%', '#D5B8F0']].map(([label, w, bg]) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-[#1A1A1A]/50 w-20 flex-shrink-0">{label}</span>
                  <div className="flex-1 bg-[#1A1A1A]/06 h-4 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: w, background: bg }} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* ── Feature Strips ──────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.6 }}
        className="w-full max-w-5xl mx-auto mt-16 px-6 grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        {[
          { icon: <FiMic size={20} className="text-[#8A9B80]" />, title: language === 'EN' ? 'Speak to Log' : 'बोलकर दर्ज करें', desc: language === 'EN' ? 'Record sales in any language, no typing needed.' : 'किसी भी भाषा में बिक्री दर्ज करें।' },
          { icon: <FiBarChart2 size={20} className="text-[#8A6FC3]" />, title: language === 'EN' ? 'Smart Insights' : 'स्मार्ट इनसाइट्स', desc: language === 'EN' ? 'AI analyses your data and surfaces what matters.' : 'AI आपका डेटा विश्लेषण करता है।' },
          { icon: <FiZap size={20} className="text-[#F5A623]" />, title: language === 'EN' ? 'Instant Ledger' : 'त्वरित लेजर', desc: language === 'EN' ? 'Every transaction auto-saved and categorised.' : 'हर लेन-देन अपने आप सहेजा जाता है।' },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="card-elevated p-6 flex flex-col gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#F5F0EB] flex items-center justify-center flex-shrink-0">
              {icon}
            </div>
            <h3 className="font-bold text-[#1A1A1A] text-[15px]">{title}</h3>
            <p className="text-[13px] text-[#1A1A1A]/55 font-medium leading-relaxed">{desc}</p>
          </div>
        ))}
      </motion.div>
    </div>
  )
}
