import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ViewState } from '../App'
import {
  FiBarChart2,
  FiMic,
  FiMessageSquare,
  FiMap,
  FiClock,
  FiZap,
  FiGlobe,
  FiLogOut,
  FiX,
  FiChevronsLeft,
  FiChevronsRight,
} from 'react-icons/fi'

interface SidebarProps {
  isOpen: boolean
  isCollapsed: boolean
  onClose: () => void
  onToggleCollapsed: () => void
  onNavigate: (view: ViewState) => void
  currentView: ViewState
  language: 'EN' | 'HI'
  toggleLanguage: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  isCollapsed,
  onClose,
  onToggleCollapsed,
  onNavigate,
  currentView,
  language,
  toggleLanguage,
}) => {
  const navItems: Array<{ view: ViewState; label: string; icon: React.ReactNode }> = [
    { view: 'dashboard', label: language === 'EN' ? 'Performance Dashboard' : 'प्रदर्शन डैशबोर्ड', icon: <FiBarChart2 size={18} /> },
    { view: 'voice', label: language === 'EN' ? 'Voice Ledger' : 'वॉयस लेजर', icon: <FiMic size={18} /> },
    { view: 'chat', label: language === 'EN' ? 'Context Chatbot' : 'कॉन्टेक्स्ट चैटबॉट', icon: <FiMessageSquare size={18} /> },
    { view: 'insights', label: language === 'EN' ? 'AI Insights' : 'AI इनसाइट्स', icon: <FiZap size={18} /> },
    { view: 'localMap', label: language === 'EN' ? 'Demand Intelligence Map' : 'डिमांड इंटेलिजेंस मैप', icon: <FiMap size={18} /> },
    { view: 'history', label: language === 'EN' ? 'Ledger History' : 'लेजर इतिहास', icon: <FiClock size={18} /> },
  ]

  const DesktopSidebarContent = (
    <div className="h-full flex flex-col p-5">
      <div className={`mb-6 ${isCollapsed ? '' : 'px-2'}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white grid place-items-center font-bold text-xs">VT</div>
          {!isCollapsed && (
            <div>
              <p className="text-[16px] font-extrabold text-[#0f172a] tracking-tight">VoiceTrack</p>
              <p className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider">
                {language === 'EN' ? 'Operations Suite' : 'ऑपरेशन सूट'}
              </p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex flex-col gap-1.5">
        {navItems.map(item => (
          <button
            key={item.view}
            onClick={() => {
              onNavigate(item.view)
              onClose()
            }}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'gap-3 px-3.5'} py-3 rounded-xl text-left transition-all ${currentView === item.view
                ? 'bg-[#0f172a] text-white shadow-sm'
                : 'text-[#334155] hover:bg-[#e2e8f0]'
              }`}
            title={item.label}
          >
            <span className={currentView === item.view ? 'text-[#93c5fd]' : 'text-[#475569]'}>{item.icon}</span>
            {!isCollapsed && <span className="text-[14px] font-semibold">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className={`mt-auto pt-5 border-t border-[#cbd5e1] flex flex-col gap-2 ${isCollapsed ? 'items-center' : ''}`}>
        <button
          onClick={toggleLanguage}
          className={`flex items-center ${isCollapsed ? 'justify-center w-10 h-10' : 'justify-between w-full px-3.5 py-3'} rounded-xl bg-[#e2e8f0] hover:bg-[#dbe3ee] text-[#0f172a]`}
          title={language === 'EN' ? 'Language' : 'भाषा'}
        >
          <div className={`flex items-center ${isCollapsed ? '' : 'gap-2'}`}>
            <FiGlobe size={16} />
            {!isCollapsed && <span className="text-[13px] font-semibold">{language === 'EN' ? 'Language' : 'भाषा'}</span>}
          </div>
          {!isCollapsed && <span className="text-[12px] font-bold">{language}</span>}
        </button>

        <button
          onClick={() => {
            onNavigate('landing')
            onClose()
          }}
          className={`flex items-center ${isCollapsed ? 'justify-center w-10 h-10' : 'gap-2 w-full px-3.5 py-3'} rounded-xl text-[#b91c1c] hover:bg-[#fee2e2]`}
          title={language === 'EN' ? 'Sign Out' : 'साइन आउट'}
        >
          <FiLogOut size={16} />
          {!isCollapsed && <span className="text-[13px] font-semibold">{language === 'EN' ? 'Sign Out' : 'साइन आउट'}</span>}
        </button>
      </div>
    </div>
  )

  const MobileSidebarContent = (
    <div className="h-full flex flex-col p-5">
      <div className="mb-6 px-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white grid place-items-center font-bold text-xs">VT</div>
          <div>
            <p className="text-[16px] font-extrabold text-[#0f172a] tracking-tight">VoiceTrack</p>
            <p className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider">
              {language === 'EN' ? 'Operations Suite' : 'ऑपरेशन सूट'}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-1.5">
        {navItems.map(item => (
          <button
            key={item.view}
            onClick={() => {
              onNavigate(item.view)
              onClose()
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all ${currentView === item.view
                ? 'bg-[#0f172a] text-white shadow-sm'
                : 'text-[#334155] hover:bg-[#e2e8f0]'
              }`}
          >
            <span className={currentView === item.view ? 'text-[#93c5fd]' : 'text-[#475569]'}>{item.icon}</span>
            <span className="text-[14px] font-semibold">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-5 border-t border-[#cbd5e1] flex flex-col gap-2">
        <button
          onClick={toggleLanguage}
          className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl bg-[#e2e8f0] hover:bg-[#dbe3ee] text-[#0f172a]"
        >
          <div className="flex items-center gap-2">
            <FiGlobe size={16} />
            <span className="text-[13px] font-semibold">{language === 'EN' ? 'Language' : 'भाषा'}</span>
          </div>
          <span className="text-[12px] font-bold">{language}</span>
        </button>

        <button
          onClick={() => {
            onNavigate('landing')
            onClose()
          }}
          className="w-full flex items-center gap-2 px-3.5 py-3 rounded-xl text-[#b91c1c] hover:bg-[#fee2e2]"
        >
          <FiLogOut size={16} />
          <span className="text-[13px] font-semibold">{language === 'EN' ? 'Sign Out' : 'साइन आउट'}</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      <aside className={`hidden md:flex fixed top-0 left-0 h-screen bg-[#f1f5f9] border-r border-[#dbe3ee] z-40 transition-[width] duration-200 ${isCollapsed ? 'w-24' : 'w-72'}`}>
        <button
          onClick={onToggleCollapsed}
          type="button"
          className="absolute top-8 -right-3 w-7 h-7 rounded-full bg-white border border-[#cbd5e1] hover:bg-[#e2e8f0] text-[#334155] flex items-center justify-center shadow-sm"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <FiChevronsRight size={14} /> : <FiChevronsLeft size={14} />}
        </button>
        {DesktopSidebarContent}
      </aside>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/40 z-[100] md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="fixed top-0 left-0 bottom-0 w-[86%] max-w-[320px] bg-[#f1f5f9] border-r border-[#dbe3ee] z-[101] md:hidden"
            >
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white text-[#334155] grid place-items-center"
                aria-label="Close sidebar"
                type="button"
              >
                <FiX size={16} />
              </button>
              {MobileSidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
