import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Landing } from './components/Landing'
import { Auth } from './components/Auth'
import { HistoryLedger } from './components/HistoryLedger'
import { DashboardMain } from './components/DashboardMain'
import { AIInsightsPage } from './components/AIInsightsPage'
import { AIVoiceScreen } from './components/AIVoiceScreen'
import { Chatbot } from './components/Chatbot'
import { Profile } from './components/Profile'
import { Sidebar } from './components/Sidebar'
import { LocalDemandMapDashboard } from './components/LocalDemandMapDashboard.jsx'
import { setAuthToken } from './services/api'
import './App.css'
import './index.css'

export type ViewState = 'landing' | 'auth' | 'voice' | 'dashboard' | 'insights' | 'localMap' | 'history' | 'chat' | 'profile'

export interface AuthSession {
  userId: string
  name: string
  token: string
  identifier: string
  businessCode?: string
  businessId?: string
  preferredLanguage?: 'EN' | 'HI'
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
  const [currentView, setCurrentView] = useState<ViewState>(() => (getSavedSession() ? 'dashboard' : 'landing'))
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false)
  const [language, setLanguage] = useState<'EN' | 'HI'>(() => getSavedSession()?.preferredLanguage || 'EN')
  const [userName, setUserName] = useState<string>(() => getSavedSession()?.name || '')

  const handleNavigate = (view: ViewState) => {
    if (view === 'landing') {
      setSession(null)
      setUserName('')
      setAuthToken(null)
      localStorage.removeItem('voicetrack.session')
    }

    setCurrentView(view)
    setIsSidebarOpen(false)
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const toggleSidebarCollapsed = () => {
    setIsSidebarCollapsed(prev => !prev)
  }

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'EN' ? 'HI' : 'EN')
  }

  const handleLanguageChange = (nextLanguage: 'EN' | 'HI') => {
    setLanguage(nextLanguage)
  }

  const handleLogin = (authSession: AuthSession) => {
    setSession(authSession)
    setUserName(authSession.name)
    if (authSession.preferredLanguage) {
      setLanguage(authSession.preferredLanguage)
    }
    setAuthToken(authSession.token)
    localStorage.setItem('voicetrack.session', JSON.stringify(authSession))
    setCurrentView('dashboard')
  }

  const handleDemo = () => {
    setAuthToken(null)
    setUserName('Guest')
    setSession({
      userId: 'demo-user',
      name: 'Guest',
      token: '',
      identifier: 'demo-user',
      businessCode: 'DEMO',
      businessId: 'DEMO',
      preferredLanguage: 'EN',
    })
    setCurrentView('dashboard')
  }

  const isAppView = currentView !== 'landing' && currentView !== 'auth'

  return (
    <div className="h-screen bg-app-gradient flex flex-col overflow-hidden">

      {/* Global Sidebar Component */}
      {isAppView && (
        <Sidebar
          isOpen={isSidebarOpen}
          isCollapsed={isSidebarCollapsed}
          onClose={() => setIsSidebarOpen(false)}
          onToggleCollapsed={toggleSidebarCollapsed}
          onNavigate={handleNavigate}
          currentView={currentView}
          language={language}
          toggleLanguage={toggleLanguage}
        />
      )}

      <div className={`flex-1 min-h-0 ${isAppView ? (isSidebarCollapsed ? 'md:pl-24' : 'md:pl-72') : ''}`}>
        <AnimatePresence mode="wait">
          {currentView === 'landing' && (
            <motion.div
              key="landing"
              exit={{ opacity: 0, scale: 0.95 }}
              className="h-full min-h-0 overflow-y-auto"
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
              className="h-full min-h-0 overflow-y-auto"
            >
              <Auth
                onLogin={handleLogin}
                onBack={() => setCurrentView('landing')}
                language={language}
                onSignupLanguageChange={handleLanguageChange}
              />
            </motion.div>
          )}

          {currentView === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="h-full min-h-0 overflow-hidden"
            >
              <DashboardMain
                userId={session?.userId || ''}
                businessId={session?.businessId || ''}
                businessCode={session?.businessCode || ''}
                userName={userName}
                onRecordToday={() => setCurrentView('voice')}
                language={language}
              />
            </motion.div>
          )}

          {currentView === 'insights' && (
            <motion.div
              key="insights"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="h-full min-h-0 overflow-hidden"
            >
              <AIInsightsPage
                userId={session?.userId || ''}
                businessId={session?.businessId || ''}
                userName={userName}
                onToggleSidebar={toggleSidebar}
                language={language}
              />
            </motion.div>
          )}

          {currentView === 'localMap' && (
            <motion.div
              key="localMap"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="h-full min-h-0 overflow-hidden"
            >
              <LocalDemandMapDashboard />
            </motion.div>
          )}

          {currentView === 'voice' && (
            <motion.div
              key="voice"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="h-full min-h-0 overflow-hidden relative"
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
              className="h-full min-h-0 overflow-hidden relative"
            >
              <HistoryLedger
                userId={session?.userId || ''}
                businessId={session?.businessId || ''}
                onToggleSidebar={toggleSidebar}
                language={language}
              />
            </motion.div>
          )}

          {currentView === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="h-full min-h-0 overflow-hidden relative"
            >
              <Chatbot userId={session?.userId || ''} onToggleSidebar={toggleSidebar} language={language} />
            </motion.div>
          )}

          {currentView === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="h-full min-h-0 overflow-hidden relative"
            >
              <Profile
                userId={session?.userId || ''}
                userName={userName}
                language={language}
                onLogout={() => handleNavigate('landing')}
                onLanguageChange={handleLanguageChange}
                onToggleSidebar={toggleSidebar}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default App
