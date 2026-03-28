import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface AnalyticsModalProps {
  onClose: () => void
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({ onClose }) => {
  // Mock data representing the stacked bars in Image 2
  const barData = [
    { month: 'Apr', value1: 45, value2: 35, percentage: '12.4%' },
    { month: 'May', value1: 85, value2: 25, percentage: '18.7%' },
    { month: 'Jun', value1: 25, value2: 25, percentage: '6.3%' },
    { month: 'Jul', value1: 60, value2: 30, percentage: '14.9%' },
    { month: 'Aug', value1: 35, value2: 15, percentage: '9.8%' },
  ]

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
            <p className="text-[15px] font-medium text-[#1A1A1A] mb-1">Balance</p>
            <div className="text-[34px] font-semibold text-[#1A1A1A] tracking-tight flex items-end">
              <span className="text-2xl pb-[2px] mr-1">$</span>
              14 857
              <span className="text-[#8B8B8B] text-[28px] pb-[3px]">.05</span>
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
            {barData.map((data, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full">
                <span className="text-[11px] font-bold text-[#1A1A1A] mb-3">{data.percentage}</span>
                <div className="w-full flex justify-center">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: '100%' }}
                    transition={{ delay: 0.1 * idx, duration: 0.8, ease: "easeOut" }}
                    className="w-full max-w-[48px] flex flex-col justify-end gap-[4px] relative"
                    style={{ height: `${data.value1 + data.value2}%` }}
                  >
                    {/* Top block */}
                    <div 
                      className={`w-full rounded-[12px] opacity-70 ${idx === 1 || idx === 3 ? 'bg-[#E6DFD7]' : 'bg-[#E6DFD7]'}`}
                      style={{ height: `${(data.value2 / (data.value1 + data.value2)) * 100}%` }}
                    ></div>
                    {/* Bottom main block */}
                    <div 
                      className={`w-full rounded-[12px] ${idx === 1 || idx === 3 ? 'bg-[#8A9B80]' : 'bg-[#7A6452]'}`}
                      style={{ height: `${(data.value1 / (data.value1 + data.value2)) * 100}%` }}
                    ></div>
                  </motion.div>
                </div>
                <span className="text-[12px] font-medium text-[#8B8B8B] mt-4">{data.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Advice Bottom Card */}
        <div className="px-6 pb-12 pt-8">
          <p className="text-[13px] font-medium text-[#1A1A1A] opacity-80 mb-3">AI advice</p>
          <h2 className="text-3xl font-semibold text-[#1A1A1A] leading-[1.1] tracking-tight">
            Reduce raw material spending by 10% and save ₹1,800 each month.
          </h2>
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
