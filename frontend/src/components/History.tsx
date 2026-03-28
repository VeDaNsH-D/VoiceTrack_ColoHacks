import React from 'react'
import { motion } from 'framer-motion'

interface HistoryProps {
  onNavigate: (view: 'landing' | 'auth' | 'voice' | 'dashboard' | 'history') => void
}

export const History: React.FC<HistoryProps> = ({ onNavigate }) => {
  // Mock data for history based on vendor voice records
  const historyData = [
    { id: 1, date: 'Today, 2:30 PM', text: 'Sold 5 dozen bananas and spent ₹200 on transport.', revenue: 300, expense: 200 },
    { id: 2, date: 'Yesterday, 6:00 PM', text: 'Good day. Sold all apples for ₹800. No expenses.', revenue: 800, expense: 0 },
    { id: 3, date: 'Mar 25, 4:15 PM', text: 'Paid rent ₹500 and sold mixed fruits worth ₹1200.', revenue: 1200, expense: 500 },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-screen bg-app-gradient flex flex-col relative overflow-hidden"
    >
      <div className="px-6 pt-12 pb-6 flex items-start justify-between z-10">
        <div>
          <p className="text-[15px] font-medium text-[#1A1A1A] mb-1">History</p>
          <h1 className="text-3xl font-semibold text-[#1A1A1A] tracking-tight">
            Past Records
          </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-32 z-10">
        <div className="space-y-4">
          {historyData.map((item, idx) => (
            <motion.div 
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="glass-card p-5"
            >
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-bold text-[#1A1A1A] opacity-60 tracking-wide uppercase">{item.date}</span>
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
          ))}
        </div>
      </div>

      {/* Bottom Nav overlay */}
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
