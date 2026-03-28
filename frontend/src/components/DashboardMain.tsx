import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AnalyticsModal } from './AnalyticsModal.tsx'
import { getInsights, getTransactionHistory, type HistoryEntry, type InsightsResult } from '../services/api'

interface DashboardMainProps {
  userId: string
  businessCode?: string
  userName: string
  userOccupation: string
  onToggleSidebar: () => void
  language: 'EN' | 'HI'
}

export const DashboardMain: React.FC<DashboardMainProps> = ({ userId, businessCode, userName, userOccupation, onToggleSidebar, language }) => {
  const [displayBalance, setDisplayBalance] = useState(0)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [insights, setInsights] = useState<InsightsResult>({
    totals: { sales: 0, expenses: 0 },
    transactionCount: 0,
  })
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const finalBalance = Math.max(0, insights.totals.sales - insights.totals.expenses)

  useEffect(() => {
    let mounted = true

    const loadInsights = async () => {
      try {
        const response = await getInsights(userId || undefined)
        const historyResponse = await getTransactionHistory({
          userId: userId || undefined,
          limit: 100,
        })
        if (mounted) {
          setInsights(response)
          setHistory(historyResponse.transactions)
        }
      } catch {
        if (mounted) {
          setInsights({
            totals: { sales: 0, expenses: 0 },
            transactionCount: 0,
          })
          setHistory([])
        }
      }
    }

    loadInsights()

    return () => {
      mounted = false
    }
  }, [userId])

  // Animate balance
  useEffect(() => {
    let animationFrame: number
    let currentValue = 0
    const increment = finalBalance / 40

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
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
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
        className="flex-1 overflow-y-auto px-6 py-10 pb-32 relative z-10"
      >
        {/* Top Handle to Close Dashboard overlay */}
        <motion.div variants={itemVariants} className="mb-6 flex justify-start mt-4">
          <button 
            onClick={onToggleSidebar}
            className="w-10 h-10 bg-white bg-opacity-60 rounded-full flex items-center justify-center hover:bg-opacity-100 transition-colors shadow-sm"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </motion.div>

        {/* Greeting & Subtitle */}
        <motion.div variants={itemVariants} className="mb-8">
          <h1 className="text-4xl font-semibold tracking-tight text-[#1A1A1A] mb-2 leading-tight">
            {language === 'EN' ? 'Hello,' : 'नमस्ते,'} <br /><span className="text-[#8A9B80]">{userName || 'User'}</span>
          </h1>
          <p className="text-[#1A1A1A]/60 font-medium">
            {language === 'EN' ? 'AI manages your ledger so you can focus on sales.' : 'AI आपका लेजर प्रबंधित करता है ताकि आप बिक्री पर ध्यान दे सकें।'}
          </p>
          {userOccupation && (
            <p className="text-[#1A1A1A]/50 text-sm mt-1">
              {language === 'EN' ? `Business type: ${userOccupation}` : `व्यवसाय प्रकार: ${userOccupation}`}
            </p>
          )}
          {businessCode && (
            <p className="text-[#1A1A1A]/60 text-xs mt-1 font-semibold tracking-wide">
              {language === 'EN' ? `Business ID: ${businessCode}` : `बिजनेस आईडी: ${businessCode}`}
            </p>
          )}
        </motion.div>

        {/* Balance Card Container */}
        <motion.div variants={itemVariants} className="mb-4">
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-4">
            {language === 'EN' ? 'Your ledger and monthly progress' : 'आपका लेजर और मासिक प्रगति'}
          </h2>
          <div className="w-full glass-card rounded-3xl p-6 relative overflow-hidden group shadow-lg">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#1A1A1A_1px,transparent_1px)] [background-size:16px_16px]"></div>
            
            <div className="relative z-10 flex flex-col items-center">
              <span className="text-[13px] font-bold uppercase tracking-wider text-[#1A1A1A]/50 mb-2">
                {language === 'EN' ? 'this month' : 'इस महीने'}
              </span>
              <div className="text-[54px] font-semibold text-[#1A1A1A] tracking-tighter flex items-end">
                <span className="text-3xl pb-2 mr-1">₹</span>
                {displayBalance.toLocaleString('en-IN', {
                  maximumFractionDigits: 0,
                })}
                <span className="text-[#8B8B8B] text-4xl pb-[6px]">.05</span>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-[#8A9B80]/10 px-3 py-1.5 rounded-full mt-4">
                <div className="w-2 h-2 rounded-full bg-[#8A9B80]"></div>
                <span className="text-sm font-semibold text-[#8A9B80]">
                  {language === 'EN' ? `${insights.transactionCount} transactions processed` : `${insights.transactionCount} लेन-देन प्रोसेस हुए`}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* AI Insight Card */}
        <motion.div variants={itemVariants} className="glass-card flex items-center justify-between p-5">
          <div>
            <p className="text-[13px] font-medium text-[#1A1A1A] opacity-80 mb-1">AI insight</p>
            <h3 className="text-[15px] font-medium text-[#1A1A1A] leading-tight max-w-[200px]">
              {language === 'EN'
                ? `Net balance is ₹${Math.round(finalBalance).toLocaleString('en-IN')} from your latest entries.`
                : `आपके नवीनतम रिकॉर्ड से शुद्ध बैलेंस ₹${Math.round(finalBalance).toLocaleString('en-IN')} है।`}
            </h3>
          </div>
          
          <button 
            onClick={() => setShowAnalytics(true)}
            className="w-[52px] h-[52px] bg-[#161211] rounded-[20px] flex items-center justify-center flex-shrink-0 hover:scale-105 transition-all shadow-md"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F8F5F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17L17 7M17 7H7M17 7V17" />
            </svg>
          </button>
        </motion.div>
      </motion.div>

      {/* Analytics Modal overlay */}
      {showAnalytics && (
        <AnalyticsModal
          onClose={() => setShowAnalytics(false)}
          insights={insights}
          history={history}
          language={language}
        />
      )}

      {/* Removed traditional bottom nav explicitly since this is an overlay */}
    </motion.div>
  )
}
