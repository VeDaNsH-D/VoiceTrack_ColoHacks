import React from 'react'
import { motion } from 'framer-motion'

interface BottomNavProps {
  currentView: string
  onNavigate: (view: string) => void
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, onNavigate }) => {
  const navItems = [
    {
      id: 'dashboard',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 13h2v8H3zm4-8h2v16H7zm4-2h2v18h-2zm4-1h2v19h-2zm4 4h2v15h-2z" />
        </svg>
      ),
    },
    {
      id: 'record',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 14c1.657 0 3-1.343 3-3V5c0-1.657-1.343-3-3-3S9 3.343 9 5v6c0 1.657 1.343 3 3 3z" />
          <path d="M17 11c0 2.76-2.239 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </svg>
      ),
    },
    {
      id: 'settings',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 8c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4zm0 9c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-charcoal border-t border-charcoal shadow-lg">
      <div className="flex items-center justify-around h-20">
        {navItems.map((item) => (
          <motion.button
            key={item.id}
            whileTap={{ scale: 0.9 }}
            onClick={() => onNavigate(item.id)}
            className={`flex-1 flex items-center justify-center h-full transition-all ${
              currentView === item.id ? 'text-sage' : 'text-neutral'
            }`}
          >
            <div className="relative">
              {currentView === item.id && (
                <motion.div
                  layoutId="active-nav"
                  className="absolute -top-6 left-1/2 -translate-x-1/2 w-8 h-1 bg-sage rounded-full"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              {item.icon}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
