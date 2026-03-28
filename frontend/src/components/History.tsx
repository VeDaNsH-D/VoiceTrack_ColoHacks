import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface HistoryProps {
  onToggleSidebar: () => void
  language: 'EN' | 'HI'
}

type Period = 'Today' | 'This Week' | 'This Month' | 'Custom'
type PeriodHI = 'आज' | 'इस सप्ताह' | 'इस महीने' | 'कस्टम'

export const History: React.FC<HistoryProps> = ({ onToggleSidebar, language }) => {
  const [activePeriod, setActivePeriod] = useState<Period>('Today')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Mock data for history based on vendor voice records
  const allHistoryData = [
    { id: 1, date: 'Today, 2:30 PM', period: 'Today', text: 'Sold 5 dozen bananas and spent ₹200 on transport.', revenue: 300, expense: 200 },
    { id: 2, date: 'Today, 10:00 AM', period: 'Today', text: 'Morning stock arrived. Paid ₹500 advance.', revenue: 0, expense: 500 },
    { id: 3, date: 'Yesterday, 6:00 PM', period: 'This Week', text: 'Good day. Sold all apples for ₹800. No expenses.', revenue: 800, expense: 0 },
    { id: 4, date: 'Monday, 4:15 PM', period: 'This Week', text: 'Paid rent ₹500 and sold mixed fruits worth ₹1200.', revenue: 1200, expense: 500 },
    { id: 5, date: 'Mar 15, 8:00 PM', period: 'This Month', text: 'Big event nearby. Handled ₹2500 in sales, paid helpers ₹400.', revenue: 2500, expense: 400 },
    { id: 6, date: 'Mar 10, 1:00 PM', period: 'This Month', text: 'Rain disrupted evening. Sales ₹600.', revenue: 600, expense: 0 },
  ]

  const filteredData = allHistoryData.filter(item => {
    if (activePeriod === 'Today') return item.period === 'Today'
    if (activePeriod === 'This Week') return item.period === 'Today' || item.period === 'This Week'
    if (activePeriod === 'This Month') return true
    // If Custom, filter by simple string inclusion or logic. We mock it showing items that fall inside bounds.
    if (activePeriod === 'Custom') {
      if (!startDate || !endDate) return false // Require both to show
      return true // For mockup, showing all when custom range is populated.
    }
    return true
  })

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
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all shadow-sm ${
                  activePeriod === period 
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
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.2, delay: idx * 0.05 }}
                  className="glass-card p-5"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[11px] font-bold text-[#1A1A1A] opacity-50 tracking-wide uppercase">{item.date}</span>
                    <div className="flex gap-2">
                      <span className="text-xs font-semibold text-[#8A9B80] bg-[#8A9B80] bg-opacity-20 px-2 py-1 rounded">+₹{item.revenue}</span>
                      {item.expense > 0 && (
                        <span className="text-xs font-semibold text-[#F85F54] bg-[#F85F54] bg-opacity-10 px-2 py-1 rounded">-₹{item.expense}</span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm font-medium text-[#1A1A1A] leading-relaxed">
                    "{item.text}"
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
