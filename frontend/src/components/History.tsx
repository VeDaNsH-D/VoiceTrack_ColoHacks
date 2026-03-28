import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface HistoryProps {
  onNavigate: (view: 'landing' | 'auth' | 'voice' | 'dashboard' | 'history') => void
}

type Period = 'Today' | 'This Week' | 'This Month' | 'Custom'

export const History: React.FC<HistoryProps> = ({ onNavigate }) => {
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
        <div className="mb-6">
          <p className="text-[15px] font-medium text-[#1A1A1A] mb-1">History</p>
          <h1 className="text-3xl font-semibold text-[#1A1A1A] tracking-tight">
            Past Records
          </h1>
        </div>

        {/* Period Filter Pills */}
        <div className="flex items-center gap-2 w-full pb-4 hide-scrollbar overflow-x-auto">
          {(['Today', 'This Week', 'This Month', 'Custom'] as Period[]).map((period) => (
            <button
              key={period}
              onClick={() => setActivePeriod(period)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                activePeriod === period 
                  ? 'bg-[#1A1A1A] text-[#F8F5F2] shadow-md' 
                  : 'bg-white bg-opacity-40 text-[#1A1A1A] hover:bg-opacity-60'
              }`}
            >
              {period}
            </button>
          ))}
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
                <span className="text-[10px] uppercase font-bold text-[#1A1A1A] opacity-50 mr-2">From</span>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-sm font-medium text-[#1A1A1A] w-full outline-none" 
                />
              </div>
              <div className="flex-1 glass-card p-2 flex items-center px-3">
                <span className="text-[10px] uppercase font-bold text-[#1A1A1A] opacity-50 mr-2">To</span>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-sm font-medium text-[#1A1A1A] w-full outline-none" 
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-32 z-10">
        <AnimatePresence mode="popLayout">
          <div className="space-y-4">
            {filteredData.length === 0 ? (
               <motion.div 
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                 className="text-center py-10 opacity-60 text-sm font-medium"
               >
                 {activePeriod === 'Custom' && (!startDate || !endDate) 
                   ? 'Select a date range to view records.' 
                   : `No records for ${activePeriod.toLowerCase()}`
                 }
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

      {/* Modern Bottom Nav */}
      <div className="absolute bottom-0 w-full h-[100px] bg-[#161211] rounded-t-[40px] flex items-center justify-between px-10 z-50">
        <button 
          onClick={() => onNavigate('dashboard')}
          className="text-[#F8F5F2] opacity-60 hover:opacity-100 mt-2 transition-opacity"
        >
           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </button>
        
        <button 
          onClick={() => onNavigate('voice')}
          className="text-[#F8F5F2] opacity-60 hover:opacity-100 mt-2 transition-opacity"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
             <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
        </button>

        <button 
          className="text-[#F8F5F2] opacity-100 mt-2"
        >
          {/* History Icon */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </button>
      </div>
    </motion.div>
  )
}
