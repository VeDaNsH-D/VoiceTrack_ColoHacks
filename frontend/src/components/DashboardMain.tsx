import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AnalyticsModal } from './AnalyticsModal.tsx'
import { getBusinessDetails, getInsights, getTransactionHistory, type HistoryEntry, type InsightsResult } from '../services/api'
import { FiTrendingUp, FiTrendingDown, FiArrowRight, FiTarget, FiAlertTriangle, FiCheckCircle, FiLayers, FiMic, FiCopy } from 'react-icons/fi'

interface DashboardMainProps {
  userId: string
  businessId: string
  businessCode?: string
  userName: string
  onRecordToday: () => void
  language: 'EN' | 'HI'
}

export const DashboardMain: React.FC<DashboardMainProps> = ({ userId, businessId, businessCode, userName, onRecordToday, language }) => {
  const [displayBalance, setDisplayBalance] = useState(0)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [businessIdCopied, setBusinessIdCopied] = useState(false)
  const [resolvedBusinessCode, setResolvedBusinessCode] = useState('')
  const [insights, setInsights] = useState<InsightsResult>({
    totals: { sales: 0, expenses: 0 },
    transactionCount: 0,
  })
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const finalBalance = insights.totals.sales - insights.totals.expenses
  const topItem = insights.topSellingItems?.[0]
  const lowConfidenceCount = insights.lowConfidenceCount || 0
  const forecastSales = insights.forecast?.nextDaySales || 0
  const anomalyCount = insights.anomalies
    ? Object.values(insights.anomalies).filter(Boolean).length
    : 0
  const latestDaily = insights.dailyLedger?.[insights.dailyLedger.length - 1]
  const dashboardBusinessIdentifier = resolvedBusinessCode || businessCode || ''
  const todayTransactions = latestDaily?.transactionCount || 0
  const avgTicket = insights.transactionCount > 0 ? insights.totals.sales / insights.transactionCount : 0
  const salesTrend = (insights.dailyLedger || []).slice(-10).map(day => Number(day.sales || 0))
  const profitTrend = (insights.dailyLedger || []).slice(-10).map(day => Number(day.profit || 0))
  const todayLabel = new Date().toLocaleDateString(language === 'HI' ? 'hi-IN' : 'en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const aiInsightMessage = insights.insightCards?.[0]?.message ||
    (language === 'EN'
      ? `Net balance is Rs ${Math.round(finalBalance).toLocaleString('en-IN')} from your latest entries.`
      : `आपके नवीनतम रिकॉर्ड से शुद्ध बैलेंस Rs ${Math.round(finalBalance).toLocaleString('en-IN')} है।`)

  const buildSparklinePath = (values: number[], width = 220, height = 56): string => {
    if (!values.length) {
      return `M0 ${height / 2} L${width} ${height / 2}`
    }

    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1

    return values
      .map((value, index) => {
        const x = (index / Math.max(1, values.length - 1)) * width
        const y = height - ((value - min) / range) * (height - 4) - 2
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`
      })
      .join(' ')
  }

  const loadInsights = React.useCallback(async () => {
    const scopedParams = {
      userId: userId || undefined,
      businessId: businessId || undefined,
    }

    const userFallbackParams = {
      userId: userId || undefined,
    }

    try {
      let response = await getInsights(scopedParams)
      let historyResponse = await getTransactionHistory({
        ...scopedParams,
        limit: 100,
      })

      const noScopedData =
        Number(response?.transactionCount || 0) === 0 &&
        Number(response?.totals?.sales || 0) === 0 &&
        Number(response?.totals?.expenses || 0) === 0

      if (businessId && userId && noScopedData) {
        response = await getInsights(userFallbackParams)
        historyResponse = await getTransactionHistory({
          ...userFallbackParams,
          limit: 100,
        })
      }

      setInsights(response)
      setHistory(historyResponse.transactions)
    } catch {
      setInsights({ totals: { sales: 0, expenses: 0 }, transactionCount: 0 })
      setHistory([])
    }
  }, [userId, businessId])

  useEffect(() => {
    void loadInsights()
    const onTransactionSaved = () => void loadInsights()
    window.addEventListener('voicetrack:transaction-saved', onTransactionSaved)
    return () => window.removeEventListener('voicetrack:transaction-saved', onTransactionSaved)
  }, [loadInsights])

  useEffect(() => {
    let isMounted = true

    const resolveBusinessCode = async () => {
      // Business codes are shareable IDs like BIZ-XXXXXX; never show raw object IDs here.
      if (businessCode?.startsWith('BIZ-')) {
        if (isMounted) {
          setResolvedBusinessCode(businessCode)
        }
        return
      }

      if (!userId && !businessId) {
        if (isMounted) {
          setResolvedBusinessCode('')
        }
        return
      }

      try {
        const details = await getBusinessDetails({
          userId: userId || undefined,
          businessId: businessId || undefined,
        })
        const code = details?.business?.businessCode || ''
        if (isMounted) {
          setResolvedBusinessCode(code)
        }
      } catch {
        if (isMounted) {
          setResolvedBusinessCode('')
        }
      }
    }

    void resolveBusinessCode()
    return () => {
      isMounted = false
    }
  }, [businessCode, userId, businessId])

  useEffect(() => {
    let animationFrame: number
    let frame = 0
    const totalFrames = 45
    const startValue = 0
    const delta = finalBalance - startValue

    const animate = () => {
      frame += 1
      const progress = Math.min(1, frame / totalFrames)
      const nextValue = startValue + delta * progress
      setDisplayBalance(nextValue)

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
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

  const handleCopyBusinessId = async () => {
    if (!dashboardBusinessIdentifier) {
      return
    }

    try {
      await navigator.clipboard.writeText(dashboardBusinessIdentifier)
      setBusinessIdCopied(true)
      window.setTimeout(() => setBusinessIdCopied(false), 1800)
    } catch {
      const tempInput = document.createElement('textarea')
      tempInput.value = dashboardBusinessIdentifier
      tempInput.style.position = 'fixed'
      tempInput.style.opacity = '0'
      document.body.appendChild(tempInput)
      tempInput.focus()
      tempInput.select()
      document.execCommand('copy')
      document.body.removeChild(tempInput)
      setBusinessIdCopied(true)
      window.setTimeout(() => setBusinessIdCopied(false), 1800)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full bg-[#f1f5f9] flex flex-col relative overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 left-[8%] h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute top-12 right-[10%] h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-56 w-80 rounded-full bg-slate-400/15 blur-3xl" />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 h-full min-h-0 overflow-y-auto scrollbar-hide px-5 pt-8 pb-28 space-y-5 max-w-6xl w-full mx-auto"
      >
        {/* Header row */}
        <motion.div
          variants={itemVariants}
          className="flex items-center justify-between rounded-2xl border border-slate-900/10 bg-white/60 px-4 py-3 backdrop-blur-md"
        >
          <div className="w-12" />
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-700/70">
            {language === 'EN' ? 'Dashboard' : 'डैशबोर्ड'}
          </div>
          <div className="text-[11px] font-semibold text-slate-600 bg-white/80 border border-slate-900/10 rounded-full px-3 py-1">
            {todayLabel}
          </div>
        </motion.div>

        {/* Greeting */}
        <motion.div variants={itemVariants} className="pt-1">
          <p className="text-[13px] text-slate-600 font-semibold uppercase tracking-[0.16em]">
            {language === 'EN' ? 'Hello,' : 'नमस्ते,'}
          </p>
          <h1 className="text-[32px] md:text-[44px] font-light tracking-[-0.03em] text-slate-950 leading-tight">
            {userName || 'User'} <span className="text-blue-600 font-semibold">✦</span>
          </h1>
          <p className="text-[13px] md:text-[14px] text-slate-600 font-medium mt-1 max-w-2xl">
            {language === 'EN' ? "Real-time performance snapshot from your backend ledger." : 'बैकएंड लेजर से रियल-टाइम प्रदर्शन स्नैपशॉट।'}
          </p>
        </motion.div>

        {dashboardBusinessIdentifier && (
          <motion.div variants={itemVariants}>
            <div className="rounded-[20px] border border-slate-900/10 bg-white/80 backdrop-blur-md px-4 py-3 flex items-center justify-between gap-3 shadow-[0_10px_26px_-18px_rgba(15,23,42,0.5)]">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  {language === 'EN' ? 'Business ID' : 'बिजनेस आईडी'}
                </p>
                <p className="text-[15px] md:text-[16px] font-semibold tracking-[0.03em] text-slate-900 truncate">
                  {dashboardBusinessIdentifier}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyBusinessId}
                className={`flex items-center gap-2 rounded-full px-3.5 py-2 border text-[12px] font-bold transition-all ${businessIdCopied ? 'bg-emerald-100 border-emerald-200 text-emerald-800' : 'bg-slate-900 border-slate-800 text-white hover:bg-slate-800'}`}
              >
                {businessIdCopied ? <FiCheckCircle size={14} /> : <FiCopy size={14} />}
                {businessIdCopied
                  ? (language === 'EN' ? 'Copied' : 'कॉपी हुआ')
                  : (language === 'EN' ? 'Copy' : 'कॉपी करें')}
              </button>
            </div>
          </motion.div>
        )}

        {/* Main Balance Card */}
        <motion.div variants={itemVariants}>
          <div className="rounded-[28px] p-6 md:p-7 relative overflow-hidden border border-white/20 bg-slate-900 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.75)]">
            {/* Decorative circles */}
            <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/[0.05]" />
            <div className="absolute -right-2 bottom-4 w-20 h-20 rounded-full bg-white/[0.04]" />
            <div className="absolute right-12 top-4 w-10 h-10 rounded-full bg-blue-400/20" />
            <div className="absolute -left-8 bottom-0 h-28 w-40 rounded-full bg-emerald-300/10 blur-2xl" />

            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/45 mb-1 relative z-10">
              {language === 'EN' ? 'Net Balance · This Month' : 'शुद्ध शेष · इस महीने'}
            </p>

            <div className="text-[44px] md:text-[56px] font-semibold tracking-[-0.03em] text-white leading-none relative z-10 flex items-end gap-1.5 mt-1">
              <span className="text-[28px] pb-2 text-white/60">₹</span>
              <span>
                {displayBalance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-4 relative z-10">
              <div className="flex items-center gap-1.5 bg-white/[0.1] rounded-full px-3 py-1.5 border border-white/10">
                <div className="w-2 h-2 rounded-full bg-emerald-300" />
                <span className="text-[11.5px] font-bold text-white/60">
                  {language === 'EN' ? `${insights.transactionCount} transactions` : `${insights.transactionCount} लेन-देन`}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* KPI Tiles */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
          <div className="bg-white/85 backdrop-blur-md p-4 rounded-[20px] border border-slate-900/10 shadow-[0_10px_26px_-18px_rgba(15,23,42,0.5)]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                {language === 'EN' ? 'Sales' : 'बिक्री'}
              </p>
              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center border border-emerald-200">
                <FiTrendingUp size={13} className="text-emerald-700" />
              </div>
            </div>
            <p className="text-[24px] font-semibold tracking-[-0.02em] text-slate-900">
              ₹{Math.round(insights.totals.sales).toLocaleString('en-IN')}
            </p>
            <span className="badge badge-green mt-2">
              <FiTrendingUp size={9} /> {language === 'EN' ? 'Credit' : 'क्रेडिट'}
            </span>
          </div>

          <div className="bg-white/85 backdrop-blur-md p-4 rounded-[20px] border border-slate-900/10 shadow-[0_10px_26px_-18px_rgba(15,23,42,0.5)]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                {language === 'EN' ? 'Expenses' : 'खर्च'}
              </p>
              <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center border border-rose-200">
                <FiTrendingDown size={13} className="text-rose-700" />
              </div>
            </div>
            <p className="text-[24px] font-semibold tracking-[-0.02em] text-slate-900">
              ₹{Math.round(insights.totals.expenses).toLocaleString('en-IN')}
            </p>
            <span className="badge badge-red mt-2">
              <FiTrendingDown size={9} /> {language === 'EN' ? 'Debit' : 'डेबिट'}
            </span>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="bg-white/80 backdrop-blur-md p-4 rounded-[20px] border border-slate-900/10 shadow-[0_10px_26px_-18px_rgba(15,23,42,0.45)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-2">
              {language === 'EN' ? 'Sales Trend (10 days)' : 'बिक्री रुझान (10 दिन)'}
            </p>
            <svg viewBox="0 0 220 56" className="w-full h-14">
              <path d={buildSparklinePath(salesTrend)} fill="none" stroke="#0066ff" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
            <p className="text-[12px] text-slate-600 mt-1">
              {language === 'EN' ? 'Live from daily ledger history' : 'डेली लेजर हिस्ट्री से लाइव'}
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-md p-4 rounded-[20px] border border-slate-900/10 shadow-[0_10px_26px_-18px_rgba(15,23,42,0.45)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-2">
              {language === 'EN' ? 'Profit Trend (10 days)' : 'प्रॉफिट रुझान (10 दिन)'}
            </p>
            <svg viewBox="0 0 220 56" className="w-full h-14">
              <path d={buildSparklinePath(profitTrend)} fill="none" stroke="#16a34a" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
            <p className="text-[12px] text-slate-600 mt-1">
              {language === 'EN' ? 'Tracks profitability momentum' : 'लाभ की गति को ट्रैक करता है'}
            </p>
          </div>
        </motion.div>

        {/* Dynamic Utility Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
          <div className="bg-white/85 backdrop-blur-md p-4 rounded-[20px] border border-slate-900/10 shadow-[0_10px_26px_-18px_rgba(15,23,42,0.5)]">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                {language === 'EN' ? 'Top Item' : 'टॉप आइटम'}
              </p>
              <div className="w-8 h-8 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center">
                <FiTarget size={13} className="text-blue-700" />
              </div>
            </div>
            <p className="text-[18px] font-semibold tracking-[-0.02em] text-slate-900 leading-tight">
              {topItem?.item ? topItem.item.toUpperCase() : (language === 'EN' ? 'No data yet' : 'अभी डेटा नहीं')}
            </p>
            <p className="text-[12px] text-slate-600 mt-1">
              {topItem
                ? `${Math.round(topItem.quantity)} units • ₹${Math.round(topItem.revenue).toLocaleString('en-IN')}`
                : (language === 'EN' ? 'Add more transactions for trends' : 'ट्रेंड के लिए और लेन-देन जोड़ें')}
            </p>
          </div>

          <div className="bg-white/85 backdrop-blur-md p-4 rounded-[20px] border border-slate-900/10 shadow-[0_10px_26px_-18px_rgba(15,23,42,0.5)]">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                {language === 'EN' ? 'Avg Ticket' : 'औसत टिकट'}
              </p>
              <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center">
                <FiLayers size={13} className="text-emerald-700" />
              </div>
            </div>
            <p className="text-[22px] font-semibold tracking-[-0.02em] text-slate-900">
              ₹{Math.round(avgTicket).toLocaleString('en-IN')}
            </p>
            <p className="text-[12px] text-slate-600 mt-1">
              {language === 'EN' ? `${insights.transactionCount} total transactions` : `${insights.transactionCount} कुल लेन-देन`}
            </p>
          </div>

          <div className="bg-white/85 backdrop-blur-md p-4 rounded-[20px] border border-slate-900/10 shadow-[0_10px_26px_-18px_rgba(15,23,42,0.5)]">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                {language === 'EN' ? 'Forecast (Next Day)' : 'अगले दिन का पूर्वानुमान'}
              </p>
              <div className="w-8 h-8 rounded-xl bg-violet-100 border border-violet-200 flex items-center justify-center">
                <FiTrendingUp size={13} className="text-violet-700" />
              </div>
            </div>
            <p className="text-[22px] font-semibold tracking-[-0.02em] text-slate-900">
              ₹{Math.round(forecastSales).toLocaleString('en-IN')}
            </p>
            <p className="text-[12px] text-slate-600 mt-1">
              {language === 'EN' ? `Trend: ${insights.forecast?.trend || 'flat'}` : `रुझान: ${insights.forecast?.trend || 'flat'}`}
            </p>
          </div>

          <div className="bg-white/85 backdrop-blur-md p-4 rounded-[20px] border border-slate-900/10 shadow-[0_10px_26px_-18px_rgba(15,23,42,0.5)]">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                {language === 'EN' ? 'Data Quality' : 'डेटा क्वालिटी'}
              </p>
              <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${lowConfidenceCount > 0 ? 'bg-rose-100 border-rose-200' : 'bg-emerald-100 border-emerald-200'}`}>
                {lowConfidenceCount > 0 ? (
                  <FiAlertTriangle size={13} className="text-[#b91c1c]" />
                ) : (
                  <FiCheckCircle size={13} className="text-[#166534]" />
                )}
              </div>
            </div>
            <p className="text-[22px] font-semibold tracking-[-0.02em] text-slate-900">{lowConfidenceCount}</p>
            <p className="text-[12px] text-slate-600 mt-1">
              {language === 'EN' ? 'entries need confirmation' : 'एंट्री को पुष्टि चाहिए'}
            </p>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white/80 backdrop-blur-md p-4 rounded-[20px] border border-slate-900/10 shadow-[0_10px_26px_-18px_rgba(15,23,42,0.45)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-1">
              {language === 'EN' ? 'Today Activity' : 'आज की गतिविधि'}
            </p>
            <p className="text-[24px] font-semibold text-slate-900 leading-none">{todayTransactions}</p>
            <p className="text-[12px] text-slate-600 mt-1">
              {language === 'EN' ? 'transactions logged today' : 'आज लॉग किए गए लेन-देन'}
            </p>
          </div>
          <div className="bg-white/80 backdrop-blur-md p-4 rounded-[20px] border border-slate-900/10 shadow-[0_10px_26px_-18px_rgba(15,23,42,0.45)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-1">
              {language === 'EN' ? 'Anomaly Flags' : 'असामान्यता फ्लैग'}
            </p>
            <p className="text-[24px] font-semibold text-slate-900 leading-none">{anomalyCount}</p>
            <p className="text-[12px] text-slate-600 mt-1">
              {language === 'EN' ? 'behavior checks triggered' : 'व्यवहार जाँच ट्रिगर'}
            </p>
          </div>

          <button
            onClick={onRecordToday}
            type="button"
            className="text-left bg-slate-900 p-4 rounded-[20px] border border-slate-800 shadow-[0_10px_26px_-18px_rgba(15,23,42,0.6)] hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-300">
                {language === 'EN' ? 'Quick Action' : 'त्वरित कार्य'}
              </p>
              <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
                <FiMic size={14} className="text-blue-300" />
              </div>
            </div>
            <p className="text-[20px] font-semibold text-white leading-tight">
              {language === 'EN' ? 'Record Today\'s Transaction' : 'आज का लेन-देन रिकॉर्ड करें'}
            </p>
            <p className="text-[12px] text-slate-300 mt-2">
              {language === 'EN' ? 'Open Voice Ledger and save entries instantly.' : 'वॉइस लेजर खोलें और तुरंत एंट्री सेव करें।'}
            </p>
          </button>
        </motion.div>

        {/* AI Insight Card */}
        <motion.div variants={itemVariants}>
          <div className="bg-white/82 backdrop-blur-md p-5 rounded-[22px] border border-slate-900/10 shadow-[0_10px_26px_-18px_rgba(15,23,42,0.45)] flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="status-dot status-dot-active" />
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  {language === 'EN' ? 'AI Insight' : 'AI इनसाइट'}
                </p>
              </div>
              <h3 className="text-[15px] font-semibold text-slate-900 leading-snug">
                {aiInsightMessage}
              </h3>
            </div>
            <button
              onClick={() => setShowAnalytics(true)}
              className="w-12 h-12 bg-slate-900 rounded-[18px] border border-slate-700 flex items-center justify-center flex-shrink-0 hover:scale-105 transition-transform shadow-md"
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
