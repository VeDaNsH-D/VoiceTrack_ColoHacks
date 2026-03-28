import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getTransactionHistory, type HistoryEntry } from '../services/api'

interface HistoryProps {
  userId: string
  onToggleSidebar: () => void
  language: 'EN' | 'HI'
}

type Period = 'Today' | 'This Week' | 'This Month' | 'Custom'

const formatStatementDateTime = (value: string, language: 'EN' | 'HI') => {
  return new Date(value).toLocaleString(language === 'EN' ? 'en-IN' : 'hi-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const formatCurrency = (value: number) => Number(value || 0).toFixed(2)

const escapeCsvValue = (value: string | number) => {
  const text = String(value ?? '')
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export const History: React.FC<HistoryProps> = ({ userId, onToggleSidebar, language }) => {
  const [activePeriod, setActivePeriod] = useState<Period>('Today')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [records, setRecords] = useState<HistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const loadHistory = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await getTransactionHistory({
        userId: userId || undefined,
        limit: 200,
      })
      setRecords(response.transactions)
    } catch {
      setRecords([])
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  React.useEffect(() => {
    void loadHistory()

    const onTransactionSaved = () => {
      void loadHistory()
    }
    window.addEventListener('voicetrack:transaction-saved', onTransactionSaved)

    return () => {
      window.removeEventListener('voicetrack:transaction-saved', onTransactionSaved)
    }
  }, [loadHistory])

  const filteredData = useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - 7)
    weekStart.setHours(0, 0, 0, 0)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    return records.filter((item) => {
      const createdAt = new Date(item.createdAt)

      if (activePeriod === 'Today') {
        return createdAt >= todayStart
      }

      if (activePeriod === 'This Week') {
        return createdAt >= weekStart
      }

      if (activePeriod === 'This Month') {
        return createdAt >= monthStart
      }

      if (activePeriod === 'Custom') {
        if (!startDate || !endDate) {
          return false
        }

        const from = new Date(startDate)
        const to = new Date(endDate)
        to.setHours(23, 59, 59, 999)
        return createdAt >= from && createdAt <= to
      }

      return true
    })
  }, [records, activePeriod, startDate, endDate])

  const statementRangeLabel = useMemo(() => {
    if (activePeriod !== 'Custom') {
      return activePeriod
    }

    if (!startDate || !endDate) {
      return language === 'EN' ? 'Custom range not selected' : 'कस्टम रेंज चयनित नहीं है'
    }

    const from = new Date(startDate).toLocaleDateString(language === 'EN' ? 'en-IN' : 'hi-IN', { dateStyle: 'medium' })
    const to = new Date(endDate).toLocaleDateString(language === 'EN' ? 'en-IN' : 'hi-IN', { dateStyle: 'medium' })
    return `${from} - ${to}`
  }, [activePeriod, startDate, endDate, language])

  const downloadStatementCsv = () => {
    if (filteredData.length === 0) {
      return
    }

    const sorted = [...filteredData].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    let runningBalance = 0

    const lines: string[] = []
    lines.push(escapeCsvValue('VoiceTrace Statement'))
    lines.push(`${escapeCsvValue('Generated On')},${escapeCsvValue(new Date().toLocaleString(language === 'EN' ? 'en-IN' : 'hi-IN'))}`)
    lines.push(`${escapeCsvValue('Period')},${escapeCsvValue(statementRangeLabel)}`)
    lines.push(`${escapeCsvValue('Records')},${escapeCsvValue(sorted.length)}`)
    lines.push('')

    lines.push([
      'Date & Time',
      'Narration',
      'Type',
      'Debit (INR)',
      'Credit (INR)',
      'Net (INR)',
      'Running Balance (INR)',
    ].map(escapeCsvValue).join(','))

    sorted.forEach((entry) => {
      const debit = Number(entry.totals.expenseAmount || 0)
      const credit = Number(entry.totals.salesAmount || 0)
      const net = Number(entry.totals.netAmount || 0)
      runningBalance += net

      const type = credit > 0 && debit > 0
        ? 'Mixed'
        : credit > 0
          ? 'Credit'
          : 'Debit'

      lines.push([
        formatStatementDateTime(entry.createdAt, language),
        entry.rawText || entry.normalizedText || '',
        type,
        formatCurrency(debit),
        formatCurrency(credit),
        formatCurrency(net),
        formatCurrency(runningBalance),
      ].map(escapeCsvValue).join(','))
    })

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 10)
    anchor.href = url
    anchor.download = `voicetrace-statement-${stamp}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-screen bg-app-gradient flex flex-col relative overflow-hidden"
    >
      <div className="px-6 pt-12 pb-2 flex flex-col items-start justify-between z-10 w-full">
        <div className="w-full flex justify-between items-center mb-6">
          <button
            onClick={onToggleSidebar}
            className="w-10 h-10 bg-white bg-opacity-60 rounded-full flex items-center justify-center hover:bg-opacity-100 transition-colors shadow-sm"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <div className="flex flex-col items-end pt-1">
            <h1 className="text-xl font-bold tracking-wide">
              {language === 'EN' ? 'History' : 'इतिहास'}
            </h1>
            <p className="text-xs text-[#1A1A1A]/50 font-bold uppercase tracking-wider">
              {language === 'EN' ? 'Past Records' : 'पिछले रिकॉर्ड'}
            </p>
          </div>
        </div>

        <div className="w-full flex justify-end mb-3">
          <button
            type="button"
            onClick={downloadStatementCsv}
            disabled={isLoading || filteredData.length === 0 || (activePeriod === 'Custom' && (!startDate || !endDate))}
            className="inline-flex items-center gap-2 bg-[#161211] text-[#F8F5F2] px-4 py-2 rounded-xl text-xs font-semibold tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            {language === 'EN' ? 'Download Statement' : 'स्टेटमेंट डाउनलोड करें'}
          </button>
        </div>

        {/* Period Filter Pills */}
        <div className="w-full flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {(['Today', 'This Week', 'This Month', 'Custom'] as Period[]).map((period) => {
            const labelMap: Record<Period, string> = {
              'Today': 'आज',
              'This Week': 'इस सप्ताह',
              'This Month': 'इस महीने',
              'Custom': 'कस्टम'
            };
            return (
              <button
                key={period}
                onClick={() => setActivePeriod(period)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all shadow-sm ${activePeriod === period
                    ? 'bg-[#1A1A1A] text-[#F8F5F2]'
                    : 'bg-white/40 text-[#1A1A1A]/60 hover:bg-white/80'
                  }`}
              >
                {language === 'EN' ? period : labelMap[period]}
              </button>
            )
          })}
        </div>

        {/* Custom Date Range Inputs */}
        <AnimatePresence>
          {activePeriod === 'Custom' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full flex gap-3 pb-4"
            >
              <div className="flex-1 glass-card p-2 flex items-center px-3">
                <label className="text-xs font-bold text-[#1A1A1A]/60 uppercase ml-1 block mb-1">
                  {language === 'EN' ? 'From' : 'से'}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-white/50 border border-white/40 rounded-xl px-3 py-2 text-sm font-medium text-[#1A1A1A] outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#1A1A1A]/60 uppercase ml-1 block mb-1">
                  {language === 'EN' ? 'To' : 'तक'}
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-white/50 border border-white/40 rounded-xl px-3 py-2 text-sm font-medium text-[#1A1A1A] outline-none"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-32 z-10">
        <AnimatePresence mode="popLayout">
          <div className="space-y-4">
            {activePeriod === 'Custom' && (!startDate || !endDate) ? (
              <div className="flex h-40 items-center justify-center text-[#1A1A1A]/50 font-medium text-sm text-center px-8">
                {language === 'EN' ? 'Select a date range to view records.' : 'रिकॉर्ड देखने के लिए तिथि सीमा चुनें।'}
              </div>
            ) : isLoading ? (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-center py-10 opacity-60 text-sm font-medium"
              >
                {language === 'EN' ? 'Loading records...' : 'रिकॉर्ड लोड हो रहे हैं...'}
              </motion.div>
            ) : filteredData.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-center py-10 opacity-60 text-sm font-medium"
              >
                {language === 'EN' ? `No records for ${activePeriod.toLowerCase()}` : 'कोई रिकॉर्ड नहीं मिला'}
              </motion.div>
            ) : (
              filteredData.map((item, idx) => (
                <motion.div
                  layout
                  key={item.id || String(idx)}
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.2, delay: idx * 0.05 }}
                  className="glass-card p-5"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[11px] font-bold text-[#1A1A1A] opacity-50 tracking-wide uppercase">
                      {formatStatementDateTime(item.createdAt, language)}
                    </span>
                    {(() => {
                      const netAmount = Number(item.totals.netAmount || 0)
                      const isProfit = netAmount > 0
                      const isLoss = netAmount < 0
                      const amount = Math.round(Math.abs(netAmount))

                      const label = isProfit
                        ? (language === 'EN' ? `Net Profit: +₹${amount}` : `नेट लाभ: +₹${amount}`)
                        : isLoss
                          ? (language === 'EN' ? `Net Loss: -₹${amount}` : `नेट नुकसान: -₹${amount}`)
                          : (language === 'EN' ? 'Net: ₹0' : 'नेट: ₹0')

                      const classes = isProfit
                        ? 'text-xs font-semibold text-[#8A9B80] bg-[#8A9B80]/20 px-2 py-1 rounded'
                        : isLoss
                          ? 'text-xs font-semibold text-[#F85F54] bg-[#F85F54]/10 px-2 py-1 rounded'
                          : 'text-xs font-semibold text-[#1A1A1A]/70 bg-[#1A1A1A]/10 px-2 py-1 rounded'

                      return <span className={classes}>{label}</span>
                    })()}
                  </div>
                  <p className="text-sm font-medium text-[#1A1A1A] leading-relaxed">
                    {item.rawText}
                  </p>
                </motion.div>
              ))
            )}
          </div>
        </AnimatePresence>
      </div>

    </motion.div>
  )
}
