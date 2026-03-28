import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AnalyticsModal } from './AnalyticsModal.tsx'
import { getInsights, getTransactionHistory, type HistoryEntry, type InsightsResult } from '../services/api'
import { FiTrendingUp, FiTrendingDown, FiArrowRight } from 'react-icons/fi'

interface DashboardMainProps {
  userId: string
  businessId: string
  userName: string
  onToggleSidebar: () => void
  language: 'EN' | 'HI'
}

export const DashboardMain: React.FC<DashboardMainProps> = ({ userId, businessId, userName, onToggleSidebar, language }) => {
  const [displayBalance, setDisplayBalance] = useState(0)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [insights, setInsights] = useState<InsightsResult>({
    totals: { sales: 0, expenses: 0 },
    transactionCount: 0,
  })
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const finalBalance = Math.max(0, insights.totals.sales - insights.totals.expenses)

  const loadInsights = React.useCallback(async () => {
    try {
      const response = await getInsights(userId || undefined)
      const historyResponse = await getTransactionHistory({ userId: userId || undefined, limit: 100 })
      setInsights(response)
      setHistory(historyResponse.transactions)
    } catch {
      setInsights({ totals: { sales: 0, expenses: 0 }, transactionCount: 0 })
      setHistory([])
    }
  }, [userId])

  useEffect(() => {
    void loadInsights()
    const onTransactionSaved = () => void loadInsights()
    window.addEventListener('voicetrack:transaction-saved', onTransactionSaved)
    return () => window.removeEventListener('voicetrack:transaction-saved', onTransactionSaved)
  }, [loadInsights])

  useEffect(() => {
    let animationFrame: number
    let currentValue = 0
    const increment = finalBalance / 45
    const animate = () => {
      currentValue += increment
      if (currentValue < finalBalance) {
        setDisplayBalance(currentValue)
        animationFrame = requestAnimationFrame(animate)
      } else {
        setDisplayBalance(finalBalance)
      }
    }
    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [finalBalance])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
  }
  const itemVariants = {
    hidden: { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-screen bg-app-gradient flex flex-col relative overflow-hidden"
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 overflow-y-auto scrollbar-hide px-5 pt-10 pb-32 space-y-5"
      >
        {/* Header row */}
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <button
            onClick={onToggleSidebar}
            className="w-11 h-11 rounded-full glass-card flex items-center justify-center shadow-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="text-[12px] font-bold uppercase tracking-widest text-[#1A1A1A]/40">
            {language === 'EN' ? 'Dashboard' : 'डैशबोर्ड'}
          </div>
          <div className="w-11" />
        </motion.div>

        {/* Greeting */}
        <motion.div variants={itemVariants}>
          <p className="text-[14px] text-[#1A1A1A]/50 font-semibold">
            {language === 'EN' ? 'Hello,' : 'नमस्ते,'}
          </p>
          <h1 className="text-[34px] font-extrabold tracking-tight text-[#1A1A1A] leading-tight">
            {userName || 'User'} <span className="text-[#8A9B80]">✦</span>
          </h1>
          <p className="text-[13.5px] text-[#1A1A1A]/50 font-medium mt-0.5">
            {language === 'EN' ? "Here's your ledger overview." : 'आपका लेजर ओवरव्यू।'}
          </p>
        </motion.div>

        {/* Main Balance Card */}
        <motion.div variants={itemVariants}>
          <div className="card-dark rounded-[26px] p-6 relative overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/[0.04]" />
            <div className="absolute -right-2 bottom-4 w-20 h-20 rounded-full bg-white/[0.03]" />
            <div className="absolute right-12 top-4 w-10 h-10 rounded-full bg-[#8A9B80]/15" />

            <p className="text-[11px] font-bold uppercase tracking-widest text-white/35 mb-1 relative z-10">
              {language === 'EN' ? 'Net Balance · This Month' : 'शुद्ध शेष · इस महीने'}
            </p>

            <div className="text-[52px] font-extrabold tracking-tight text-white leading-none relative z-10 flex items-end gap-1.5 mt-1">
              <span className="text-[28px] pb-2 text-white/60">₹</span>
              <span>
                {displayBalance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-4 relative z-10">
              <div className="flex items-center gap-1.5 bg-white/[0.08] rounded-full px-3 py-1.5">
                <div className="w-2 h-2 rounded-full bg-[#8A9B80]" />
                <span className="text-[11.5px] font-bold text-white/60">
                  {language === 'EN' ? `${insights.transactionCount} transactions` : `${insights.transactionCount} लेन-देन`}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* KPI Tiles */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
          <div className="card-elevated p-4 rounded-[20px]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#1A1A1A]/40">
                {language === 'EN' ? 'Sales' : 'बिक्री'}
              </p>
              <div className="w-7 h-7 rounded-xl bg-[#EBF2E6] flex items-center justify-center">
                <FiTrendingUp size={13} className="text-[#5c7255]" />
              </div>
            </div>
            <p className="text-[24px] font-extrabold tracking-tight text-[#1A1A1A]">
              ₹{Math.round(insights.totals.sales).toLocaleString('en-IN')}
            </p>
            <span className="badge badge-green mt-2">
              <FiTrendingUp size={9} /> {language === 'EN' ? 'Credit' : 'क्रेडिट'}
            </span>
          </div>

          <div className="card-elevated p-4 rounded-[20px]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#1A1A1A]/40">
                {language === 'EN' ? 'Expenses' : 'खर्च'}
              </p>
              <div className="w-7 h-7 rounded-xl bg-[#F85F54]/10 flex items-center justify-center">
                <FiTrendingDown size={13} className="text-[#c0392b]" />
              </div>
            </div>
            <p className="text-[24px] font-extrabold tracking-tight text-[#1A1A1A]">
              ₹{Math.round(insights.totals.expenses).toLocaleString('en-IN')}
            </p>
            <span className="badge badge-red mt-2">
              <FiTrendingDown size={9} /> {language === 'EN' ? 'Debit' : 'डेबिट'}
            </span>
          </div>
        </motion.div>

        {/* AI Insight Card */}
        <motion.div variants={itemVariants}>
          <div className="glass-card p-5 rounded-[22px] flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="status-dot status-dot-active" />
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#1A1A1A]/40">
                  {language === 'EN' ? 'AI Insight' : 'AI इनसाइट'}
                </p>
              </div>
              <h3 className="text-[15px] font-bold text-[#1A1A1A] leading-snug">
                {language === 'EN'
                  ? `Net balance is ₹${Math.round(finalBalance).toLocaleString('en-IN')} from your latest entries.`
                  : `आपके नवीनतम रिकॉर्ड से शुद्ध बैलेंस ₹${Math.round(finalBalance).toLocaleString('en-IN')} है।`}
              </h3>
            </div>
            <button
              onClick={() => setShowAnalytics(true)}
              className="w-12 h-12 bg-[#1A1A1A] rounded-[18px] flex items-center justify-center flex-shrink-0 hover:scale-105 transition-transform shadow-md"
            >
              <FiArrowRight size={18} className="text-white -rotate-45" />
            </button>
          </div>
        </motion.div>
      </motion.div>

      {showAnalytics && (
        <AnalyticsModal
          onClose={() => setShowAnalytics(false)}
          insights={insights}
          history={history}
          userId={userId}
          businessId={businessId}
          language={language}
        />
      )}
    </motion.div>
  )
}
