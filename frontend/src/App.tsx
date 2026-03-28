import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Landing } from './components/Landing'
import { Auth } from './components/Auth'
import { History } from './components/History'
import { DashboardMain } from './components/DashboardMain'
import { AIVoiceScreen } from './components/AIVoiceScreen'
import './App.css'
import './index.css'

export type ViewState = 'landing' | 'auth' | 'voice' | 'dashboard' | 'history'

export function App() {
  const [currentView, setCurrentView] = useState<ViewState>('landing')
  const [userName, setUserName] = useState<string>('')

  const handleNavigate = (view: ViewState) => {
    setCurrentView(view)
  }

  const handleLogin = (name: string) => {
    setUserName(name)
    setCurrentView('voice')
  }

  const handleDemo = () => {
    setUserName('Guest')
    setCurrentView('voice')
  }

  return (
    <div className="h-screen bg-app-gradient flex flex-col overflow-hidden">
      <AnimatePresence mode="wait">
        {currentView === 'landing' && (
          <motion.div
            key="landing"
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 overflow-y-auto"
          >
            <Landing 
              onGetStarted={() => setCurrentView('auth')} 
              onDemo={handleDemo}
            />
          </motion.div>
        )}

        {currentView === 'auth' && (
          <motion.div
            key="auth"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 overflow-y-auto"
          >
            <Auth onLogin={handleLogin} onBack={() => setCurrentView('landing')} />
          </motion.div>
        )}

        {currentView === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 overflow-y-auto"
          >
            <DashboardMain userName={userName} onNavigate={handleNavigate} />
          </motion.div>
        )}

        {currentView === 'voice' && (
          <motion.div
            key="voice"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 overflow-hidden h-full relative"
          >
            <AIVoiceScreen userName={userName} onNavigate={handleNavigate} />
          </motion.div>
        )}

        {currentView === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 overflow-hidden h-full relative"
          >
            <History onNavigate={handleNavigate} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
