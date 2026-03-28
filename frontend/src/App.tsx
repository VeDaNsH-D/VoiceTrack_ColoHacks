import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Landing } from './components/Landing'
import { Auth } from './components/Auth'
import { History } from './components/History'
import { DashboardMain } from './components/DashboardMain'
import { AIVoiceScreen } from './components/AIVoiceScreen'
import { Chatbot } from './components/Chatbot'
import { Sidebar } from './components/Sidebar'
import './App.css'
import './index.css'

export type ViewState = 'landing' | 'auth' | 'voice' | 'dashboard' | 'history' | 'chat'

export function App() {
  const [currentView, setCurrentView] = useState<ViewState>('landing')
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false)
  const [language, setLanguage] = useState<'EN' | 'HI'>('EN')
  const [userName, setUserName] = useState<string>('')
  const [userOccupation, setUserOccupation] = useState<string>('')

  const handleNavigate = (view: ViewState) => {
    setCurrentView(view)
    setIsSidebarOpen(false)
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'EN' ? 'HI' : 'EN')
  }

  const handleLogin = (name: string, occupation: string) => {
    setUserName(name)
    setUserOccupation(occupation)
    setCurrentView('voice')
  }

  const handleDemo = () => {
    setUserName('Guest')
    setUserOccupation('Tester')
    setCurrentView('voice')
  }

  return (
    <div className="h-screen bg-app-gradient flex flex-col overflow-hidden">
      
      {/* Global Sidebar Component */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        onNavigate={handleNavigate} 
        currentView={currentView} 
        language={language}
        toggleLanguage={toggleLanguage}
      />

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
              language={language}
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
            <Auth onLogin={handleLogin} onBack={() => setCurrentView('landing')} language={language} />
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
            <DashboardMain userName={userName} onToggleSidebar={toggleSidebar} language={language} />
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
            <AIVoiceScreen userName={userName} onToggleSidebar={toggleSidebar} language={language} />
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
            <History onToggleSidebar={toggleSidebar} language={language} />
          </motion.div>
        )}

        {currentView === 'chat' && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 overflow-hidden h-full relative"
          >
            <Chatbot onToggleSidebar={toggleSidebar} language={language} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
