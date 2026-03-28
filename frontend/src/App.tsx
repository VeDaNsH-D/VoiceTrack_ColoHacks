import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Landing } from './components/Landing'
import { Auth } from './components/Auth'
import { History } from './components/History'
import { DashboardMain } from './components/DashboardMain'
import { AIVoiceScreen } from './components/AIVoiceScreen'
import { Chatbot } from './components/Chatbot'
import { Sidebar } from './components/Sidebar'
import { setAuthToken } from './services/api'
import './App.css'
import './index.css'

export type ViewState = 'landing' | 'auth' | 'voice' | 'dashboard' | 'history' | 'chat'

export interface AuthSession {
  userId: string
  name: string
  occupation: string
  token: string
  identifier: string
  businessCode?: string
}

function getSavedSession(): AuthSession | null {
  const saved = localStorage.getItem('voicetrack.session')
  if (!saved) {
    return null
  }

  try {
    return JSON.parse(saved) as AuthSession
  } catch {
    localStorage.removeItem('voicetrack.session')
    return null
  }
}

export function App() {
  const [session, setSession] = useState<AuthSession | null>(() => {
    const restored = getSavedSession()
    if (restored?.token) {
      setAuthToken(restored.token)
    }
    return restored
  })
  const [currentView, setCurrentView] = useState<ViewState>(() => (getSavedSession() ? 'voice' : 'landing'))
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false)
  const [language, setLanguage] = useState<'EN' | 'HI'>('EN')
  const [userName, setUserName] = useState<string>(() => getSavedSession()?.name || '')
  const [userOccupation, setUserOccupation] = useState<string>(() => getSavedSession()?.occupation || '')

  const handleNavigate = (view: ViewState) => {
    if (view === 'landing') {
      setSession(null)
      setUserName('')
      setUserOccupation('')
      setAuthToken(null)
      localStorage.removeItem('voicetrack.session')
    }

    setCurrentView(view)
    setIsSidebarOpen(false)
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'EN' ? 'HI' : 'EN')
  }

  const handleLogin = (authSession: AuthSession) => {
    setSession(authSession)
    setUserName(authSession.name)
    setUserOccupation(authSession.occupation)
    setAuthToken(authSession.token)
    localStorage.setItem('voicetrack.session', JSON.stringify(authSession))
    setCurrentView('voice')
  }

  const handleDemo = () => {
    setAuthToken(null)
    setUserName('Guest')
    setUserOccupation('Tester')
    setSession({
      userId: 'demo-user',
      name: 'Guest',
      occupation: 'Tester',
      token: '',
      identifier: 'demo-user',
      businessCode: 'DEMO',
    })
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
            <DashboardMain userId={session?.userId || ''} businessCode={session?.businessCode} userName={userName} userOccupation={userOccupation} onToggleSidebar={toggleSidebar} language={language} />
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
            <AIVoiceScreen userId={session?.userId || ''} userName={userName} onToggleSidebar={toggleSidebar} language={language} />
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
            <History userId={session?.userId || ''} onToggleSidebar={toggleSidebar} language={language} />
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
            <Chatbot userId={session?.userId || ''} onToggleSidebar={toggleSidebar} language={language} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
