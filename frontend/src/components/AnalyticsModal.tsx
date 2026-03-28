import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getAnalyticsDashboard } from '../services/api'
import type { HistoryEntry, InsightsResult } from '../services/api'

interface AnalyticsModalProps {
  onClose: () => void
  insights: InsightsResult
  history: HistoryEntry[]
  userId: string
  businessId: string
  language: 'EN' | 'HI'
}

function buildBarData(history: HistoryEntry[]) {
  const months = new Map<string, { month: string; sales: number; expenses: number }>()

  history.forEach((entry) => {
    const date = new Date(entry.createdAt)
    const key = `${date.getFullYear()}-${date.getMonth()}`
    const month = date.toLocaleString('en-IN', { month: 'short' })
    const existing = months.get(key) || { month, sales: 0, expenses: 0 }
    existing.sales += Number(entry.totals.salesAmount || 0)
    existing.expenses += Number(entry.totals.expenseAmount || 0)
    months.set(key, existing)
  })

  return Array.from(months.values()).slice(-5)
}

function buildAiAdvice(insights: InsightsResult, language: 'EN' | 'HI') {
  const balance = insights.totals.sales - insights.totals.expenses
  if (insights.transactionCount === 0) {
    return language === 'EN'
      ? 'Record a few transactions and I will start surfacing business insights here.'
      : 'कुछ ट्रांजैक्शन रिकॉर्ड करें, फिर मैं यहाँ बिजनेस इनसाइट्स दिखाऊँगा।'
  }

  if (balance >= 0) {
    return language === 'EN'
      ? `You are positive by ₹${Math.round(balance).toLocaleString('en-IN')}. Keep tracking daily sales to spot repeat winners.`
      : `आप ₹${Math.round(balance).toLocaleString('en-IN')} के पॉजिटिव बैलेंस पर हैं। रोज़ की बिक्री ट्रैक करते रहें ताकि बेस्ट-सेलर दिख सकें।`
  }

  return language === 'EN'
    ? `Expenses are ahead by ₹${Math.round(Math.abs(balance)).toLocaleString('en-IN')}. Review recent spends and tighten non-essential costs.`
    : `खर्च ₹${Math.round(Math.abs(balance)).toLocaleString('en-IN')} से आगे हैं। हाल की लागत देखें और गैर-ज़रूरी खर्च कम करें।`
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  onClose,
  insights,
  history,
  userId,
  businessId,
  language,
}) => {
  const barData = React.useMemo(() => buildBarData(history), [history])
  const peakValue = Math.max(1, ...barData.map((item) => item.sales + item.expenses))
  const aiAdvice = buildAiAdvice(insights, language)
  const balance = Math.max(0, insights.totals.sales - insights.totals.expenses)
  const [dashboard, setDashboard] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (!userId || !businessId) {
      setDashboard(null)
      return
    }

    let mounted = true
    setLoading(true)

    void getAnalyticsDashboard({ userId, businessId })
      .then((data) => {
        if (mounted) {
          setDashboard(data)
        }
      })
      .catch(() => {
        if (mounted) {
          setDashboard(null)
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [userId, businessId])

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-0 z-[100] bg-app-gradient flex flex-col"
      >
        {/* Header content matching Image 2 */}
        <div className="px-6 pt-12 pb-6 flex items-start justify-between">
          <div>
            <p className="text-[15px] font-medium text-[#1A1A1A] mb-1">
              {language === 'EN' ? 'Balance' : 'बैलेंस'}
            </p>
            <div className="text-[34px] font-semibold text-[#1A1A1A] tracking-tight flex items-end">
              <span className="text-2xl pb-[2px] mr-1">₹</span>
              {Math.round(balance).toLocaleString('en-IN')}
              <span className="text-[#8B8B8B] text-[28px] pb-[3px]">.00</span>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="w-12 h-12 bg-[#E6DFD7] bg-opacity-60 rounded-full flex items-center justify-center hover:bg-opacity-100 transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Chart area */}
        <div className="flex-1 flex flex-col justify-center px-6 mt-4">
          <div className="flex items-end justify-between h-[300px] gap-3">
            {barData.length > 0 ? barData.map((data, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full">
                <span className="text-[11px] font-bold text-[#1A1A1A] mb-3">
                  ₹{Math.round(data.sales - data.expenses).toLocaleString('en-IN')}
                </span>
                <div className="w-full flex justify-center">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: '100%' }}
                    transition={{ delay: 0.1 * idx, duration: 0.8, ease: "easeOut" }}
                    className="w-full max-w-[48px] flex flex-col justify-end gap-[4px] relative"
                    style={{ height: `${((data.sales + data.expenses) / peakValue) * 100}%` }}
                  >
                    {/* Top block */}
                    <div 
                      className="w-full rounded-[12px] opacity-70 bg-[#E6DFD7]"
                      style={{ height: `${((data.expenses || 0) / Math.max(1, data.sales + data.expenses)) * 100}%` }}
                    ></div>
                    {/* Bottom main block */}
                    <div 
                      className="w-full rounded-[12px] bg-[#8A9B80]"
                      style={{ height: `${((data.sales || 0) / Math.max(1, data.sales + data.expenses)) * 100}%` }}
                    ></div>
                  </motion.div>
                </div>
                <span className="text-[12px] font-medium text-[#8B8B8B] mt-4">{data.month}</span>
              </div>
            )) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-[#1A1A1A]/55">
                {language === 'EN' ? 'No analytics yet' : 'अभी कोई एनालिटिक्स नहीं'}
              </div>
            )}
          </div>
        </div>

        {/* AI Advice Bottom Card */}
        <div className="px-6 pb-6 pt-8">
          <p className="text-[13px] font-medium text-[#1A1A1A] opacity-80 mb-3">
            {language === 'EN' ? 'AI advice' : 'AI सलाह'}
          </p>
          <h2 className="text-3xl font-semibold text-[#1A1A1A] leading-[1.1] tracking-tight">
            {aiAdvice}
          </h2>
        </div>

        <div className="px-6 pb-28 space-y-4 overflow-y-auto">
          <div className="glass-card p-4 rounded-2xl">
            <p className="text-sm font-semibold text-[#1A1A1A] mb-2">Demand Prediction</p>
            {loading ? (
              <p className="text-xs text-[#1A1A1A]/60">Loading...</p>
            ) : (
              <div className="space-y-1 text-sm text-[#1A1A1A]/80">
                <p>Next day: ₹{Math.round(dashboard?.demandForecast?.nextDay?.predictedSales || 0).toLocaleString('en-IN')}</p>
                <p>Top forecast items: {(dashboard?.demandForecast?.itemWise || []).slice(0, 3).map((item: any) => item.itemName).join(', ') || 'N/A'}</p>
              </div>
            )}
          </div>

          <div className="glass-card p-4 rounded-2xl">
            <p className="text-sm font-semibold text-[#1A1A1A] mb-2">Profit Analysis</p>
            <div className="space-y-1 text-sm text-[#1A1A1A]/80">
              <p>High-margin items: {dashboard?.profitAnalysis?.margins?.highMarginItems?.length || 0}</p>
              <p>Low-margin items: {dashboard?.profitAnalysis?.margins?.lowMarginItems?.length || 0}</p>
              <p>Top profit item: {dashboard?.profitAnalysis?.topItems?.[0]?.itemName || 'N/A'}</p>
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl">
            <p className="text-sm font-semibold text-[#1A1A1A] mb-2">Pattern and Clustering</p>
            <div className="space-y-1 text-sm text-[#1A1A1A]/80">
              <p>Star products: {dashboard?.patterns?.clusters?.summary?.starProducts || 0}</p>
              <p>Average basket size: {dashboard?.patterns?.customerBehavior?.avgBasketSize || '0.00'}</p>
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl">
            <p className="text-sm font-semibold text-[#1A1A1A] mb-2">Association Intelligence</p>
            <p className="text-sm text-[#1A1A1A]/80">
              Combo suggestions: {(dashboard?.recommendations?.suggestions || []).slice(0, 2).map((s: any) => s.combo?.join(' + ')).join(' | ') || 'N/A'}
            </p>
          </div>

          <div className="glass-card p-4 rounded-2xl">
            <p className="text-sm font-semibold text-[#1A1A1A] mb-2">Anomaly Detection</p>
            <p className="text-sm text-[#1A1A1A]/80">Active alerts: {dashboard?.anomalies?.alerts?.length || 0}</p>
          </div>

          <div className="glass-card p-4 rounded-2xl">
            <p className="text-sm font-semibold text-[#1A1A1A] mb-2">Personalization and AI Coach</p>
            <p className="text-sm text-[#1A1A1A]/80">
              Learned frequent items: {dashboard?.personalization?.frequentItems?.length || 0}
            </p>
          </div>
        </div>

        {/* Bottom Nav overlay for fidelity (Image 2 also includes bottom nav) */}
        <div className="absolute bottom-0 w-full h-[100px] bg-[#161211] rounded-t-[40px] flex items-center justify-between px-10">
          <button className="text-[#F8F5F2] opacity-100 hover:opacity-100 mt-2">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </button>
          
          <button className="text-[#F8F5F2] opacity-60 hover:opacity-100 mt-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
               <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </button>

          <button className="text-[#F8F5F2] opacity-60 hover:opacity-100 mt-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
