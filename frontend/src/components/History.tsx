import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getTransactionHistory, type HistoryEntry } from '../services/api'
import { FiDownload, FiCalendar, FiInbox } from 'react-icons/fi'

interface HistoryProps {
  userId: string
  onToggleSidebar: () => void
  language: 'EN' | 'HI'
}

type Period = 'Today' | 'This Week' | 'This Month' | 'Custom'

const formatStatementDateTime = (value: string, language: 'EN' | 'HI') =>
  new Date(value).toLocaleString(language === 'EN' ? 'en-IN' : 'hi-IN', { dateStyle: 'medium', timeStyle: 'short' })

const formatCurrency = (value: number) => Number(value || 0).toFixed(2)

const escapeCsvValue = (value: string | number) => {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
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
      const response = await getTransactionHistory({ userId: userId || undefined, limit: 200 })
      setRecords(response.transactions)
    } catch { setRecords([]) }
    finally { setIsLoading(false) }
  }, [userId])

  React.useEffect(() => {
    void loadHistory()
    const onTransactionSaved = () => void loadHistory()
    window.addEventListener('voicetrack:transaction-saved', onTransactionSaved)
    return () => window.removeEventListener('voicetrack:transaction-saved', onTransactionSaved)
  }, [loadHistory])

  const filteredData = useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7); weekStart.setHours(0, 0, 0, 0)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    return records.filter(item => {
      const d = new Date(item.createdAt)
      if (activePeriod === 'Today') return d >= todayStart
      if (activePeriod === 'This Week') return d >= weekStart
      if (activePeriod === 'This Month') return d >= monthStart
      if (activePeriod === 'Custom') {
        if (!startDate || !endDate) return false
        const to = new Date(endDate); to.setHours(23, 59, 59, 999)
        return d >= new Date(startDate) && d <= to
      }
      return true
    })
  }, [records, activePeriod, startDate, endDate])

  const statementRangeLabel = useMemo(() => {
    if (activePeriod !== 'Custom') return activePeriod
    if (!startDate || !endDate) return language === 'EN' ? 'Custom range not selected' : 'कस्टम रेंज चयनित नहीं'
    const from = new Date(startDate).toLocaleDateString(language === 'EN' ? 'en-IN' : 'hi-IN', { dateStyle: 'medium' })
    const to = new Date(endDate).toLocaleDateString(language === 'EN' ? 'en-IN' : 'hi-IN', { dateStyle: 'medium' })
    return `${from} - ${to}`
  }, [activePeriod, startDate, endDate, language])

  const downloadStatementCsv = () => {
    if (!filteredData.length) return
    const sorted = [...filteredData].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    let runningBalance = 0
    const lines: string[] = []
    lines.push(escapeCsvValue('VoiceTrace Statement'))
    lines.push(`${escapeCsvValue('Generated On')},${escapeCsvValue(new Date().toLocaleString(language === 'EN' ? 'en-IN' : 'hi-IN'))}`)
    lines.push(`${escapeCsvValue('Period')},${escapeCsvValue(statementRangeLabel)}`)
    lines.push(`${escapeCsvValue('Records')},${escapeCsvValue(sorted.length)}`)
    lines.push('')
    lines.push(['Date & Time','Narration','Type','Debit (INR)','Credit (INR)','Net (INR)','Running Balance (INR)'].map(escapeCsvValue).join(','))
    sorted.forEach(entry => {
      const debit = Number(entry.totals.expenseAmount || 0)
      const credit = Number(entry.totals.salesAmount || 0)
      const net = Number(entry.totals.netAmount || 0)
      runningBalance += net
      const type = credit > 0 && debit > 0 ? 'Mixed' : credit > 0 ? 'Credit' : 'Debit'
      lines.push([formatStatementDateTime(entry.createdAt, language), entry.rawText || entry.normalizedText || '', type, formatCurrency(debit), formatCurrency(credit), formatCurrency(net), formatCurrency(runningBalance)].map(escapeCsvValue).join(','))
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `voicetrace-statement-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  const periods: Period[] = ['Today', 'This Week', 'This Month', 'Custom']
  const periodLabels: Record<Period, string> = { 'Today': 'आज', 'This Week': 'इस सप्ताह', 'This Month': 'इस महीने', 'Custom': 'कस्टम' }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-screen bg-app-gradient flex flex-col relative overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 pt-10 pb-4 flex-shrink-0 space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onToggleSidebar}
            className="w-11 h-11 rounded-full glass-card flex items-center justify-center shadow-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div>
            <h1 className="text-[20px] font-extrabold tracking-tight text-[#1A1A1A] text-right">
              {language === 'EN' ? 'History' : 'इतिहास'}
            </h1>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#1A1A1A]/40 text-right">
              {language === 'EN' ? 'Past Records' : 'पिछले रिकॉर्ड'}
            </p>
          </div>
        </div>

        {/* Period filter pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {periods.map(period => (
            <button
              key={period}
              onClick={() => setActivePeriod(period)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-[13px] font-bold transition-all flex-shrink-0 ${
                activePeriod === period
                  ? 'bg-[#1A1A1A] text-white shadow-md'
                  : 'bg-white/50 text-[#1A1A1A]/55 hover:bg-white/80 border border-white/60'
              }`}
            >
              {language === 'EN' ? period : periodLabels[period]}
            </button>
          ))}
        </div>

        {/* Custom date range */}
        <AnimatePresence>
          {activePeriod === 'Custom' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex gap-3"
            >
              {[
                { label: language === 'EN' ? 'From' : 'से', value: startDate, set: setStartDate },
                { label: language === 'EN' ? 'To' : 'तक', value: endDate, set: setEndDate },
              ].map(({ label, value, set }) => (
                <div key={label} className="flex-1 input-shell flex flex-col gap-1 !py-2.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#1A1A1A]/40">{label}</label>
                  <input type="date" value={value} onChange={e => set(e.target.value)} className="input-field text-[13px]" />
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Download button */}
        <div className="flex justify-end">
          <button
            onClick={downloadStatementCsv}
            disabled={isLoading || filteredData.length === 0 || (activePeriod === 'Custom' && (!startDate || !endDate))}
            className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white px-4 py-2.5 rounded-2xl text-[12px] font-bold tracking-wide disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#2A2523] transition-all shadow-sm"
          >
            <FiDownload size={13} />
            {language === 'EN' ? 'Download Statement' : 'स्टेटमेंट डाउनलोड करें'}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-5 pb-10">
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {activePeriod === 'Custom' && (!startDate || !endDate) ? (
              <div className="flex flex-col h-52 items-center justify-center gap-3 text-[#1A1A1A]/30">
                <FiCalendar size={32} />
                <p className="text-[14px] font-semibold text-center">
                  {language === 'EN' ? 'Select a date range to view records.' : 'रिकॉर्ड देखने के लिए तिथि सीमा चुनें।'}
                </p>
              </div>
            ) : isLoading ? (
              <div className="flex h-52 items-center justify-center">
                <div className="w-7 h-7 border-2 border-[#1A1A1A]/15 border-t-[#8A9B80] rounded-full animate-spin" />
              </div>
            ) : filteredData.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col h-52 items-center justify-center gap-3 text-[#1A1A1A]/30"
              >
                <FiInbox size={36} />
                <p className="text-[14px] font-semibold">
                  {language === 'EN' ? `No records for ${activePeriod.toLowerCase()}` : 'कोई रिकॉर्ड नहीं मिला'}
                </p>
              </motion.div>
            ) : (
              filteredData.map((item, idx) => {
                const netAmount = Number(item.totals.netAmount || 0)
                const isProfit = netAmount > 0
                const isLoss = netAmount < 0
                const amount = Math.round(Math.abs(netAmount))
                return (
                  <motion.div
                    layout
                    key={item.id || String(idx)}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.2, delay: idx * 0.04 }}
                    className="glass-card p-4 rounded-[20px]"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <span className="text-[11px] font-bold text-[#1A1A1A]/40 tracking-wide">
                        {formatStatementDateTime(item.createdAt, language)}
                      </span>
                      <span className={`badge flex-shrink-0 ${isProfit ? 'badge-green' : isLoss ? 'badge-red' : 'badge-neutral'}`}>
                        {isProfit ? `+₹${amount}` : isLoss ? `-₹${amount}` : `₹0`}
                      </span>
                    </div>
                    <p className="text-[13.5px] font-semibold text-[#1A1A1A]/80 leading-relaxed">
                      {item.rawText}
                    </p>
                  </motion.div>
                )
              })
            )}
          </div>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
