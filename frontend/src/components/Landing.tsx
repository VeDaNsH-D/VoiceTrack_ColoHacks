import React from 'react'
import { motion } from 'framer-motion'
import { FiArrowRight, FiBarChart2, FiMic, FiCheckCircle } from 'react-icons/fi'

interface LandingProps {
  onGetStarted: () => void
  onDemo: () => void
  language: 'EN' | 'HI'
}

export const Landing: React.FC<LandingProps> = ({ onGetStarted, onDemo, language }) => {
  return (
    <div className="min-h-screen bg-app-gradient bg-grid-pattern flex flex-col items-center relative overflow-x-hidden font-sans pb-20">
      
      {/* Navigation Bar */}
      <nav className="w-full flex items-center justify-between px-6 py-5 lg:px-12 relative z-50">
        <div className="flex items-center gap-2">
          {/* Logo Icon */}
          <div className="w-8 h-8 text-[#1A1A1A]">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 20 H50 V60 C50 71 41 80 30 80 C24.47 80 20 75.53 20 70 V20 Z" fill="currentColor" />
              <path d="M50 45 C66.56 45 80 58.44 80 75 C80 91.56 66.56 100 50 100 V45 Z" fill="currentColor" />
              <path d="M50 45 L50 60 C41 60 41 50 50 45 Z" fill="#F8F5F2" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-[#1A1A1A]">VoiceTrace</span>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8 font-medium text-gray-700">
          <a href="#" className="hover:text-black transition-colors">{language === 'EN' ? 'Features' : 'सुविधाएँ'}</a>
          <a href="#" className="hover:text-black transition-colors">{language === 'EN' ? 'Analytics' : 'एनालिटिक्स'}</a>
          <a href="#" className="hover:text-black transition-colors">{language === 'EN' ? 'Pricing' : 'मूल्य निर्धारण'}</a>
          <a href="#" className="hover:text-black transition-colors">{language === 'EN' ? 'FAQ' : 'सामान्य प्रश्न'}</a>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={onDemo} className="hidden sm:block font-medium text-gray-700 hover:text-black transition-colors">
            {language === 'EN' ? 'Try Demo' : 'डेमो आजमाएं'}
          </button>
          <button 
            onClick={onGetStarted}
            className="bg-[#8A9B80] hover:bg-[#7a8a71] transition-colors text-[#F8F5F2] px-5 py-2.5 rounded-full font-semibold shadow-md"
          >
            {language === 'EN' ? 'Open App' : 'ऐप खोलें'}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="w-full max-w-6xl mx-auto flex flex-col items-center text-center mt-12 md:mt-20 px-6 relative z-40">
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-[#fce0c7] text-[#1A1A1A] px-4 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2 mb-8 shadow-sm border border-white/40"
        >
          {language === 'EN' ? 'New AI Voice Features are live 🎉' : 'नई AI वॉयस सुविधाएँ लाइव हैं 🎉'}
          <span className="text-gray-600 block w-[1px] h-4 bg-black/20 mx-1"></span>
          <button onClick={onGetStarted} className="flex items-center gap-1 hover:underline">
            {language === 'EN' ? 'Check it Out' : 'इसे देखें'} <FiArrowRight size={14} />
          </button>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-[#1A1A1A] max-w-4xl mb-6 leading-[1.1]"
        >
          {language === 'EN' ? (
            <>Perfectly <span className="text-gradient">Manage</span>,<br />Track with AI</>
          ) : (
            <>AI के साथ पूरी तरह<br /><span className="text-gradient">प्रबंधित</span> करें</>
          )}
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg md:text-xl text-gray-700 max-w-2xl mb-10 leading-relaxed"
        >
          {language === 'EN' 
            ? 'Master your business with AI tools that log sales, track inventory, and build customer relationships through voice commands in real time.'
            : 'AI टूल के साथ अपने व्यवसाय में महारत हासिल करें जो वास्तविक समय में वॉयस कमांड के माध्यम से बिक्री दर्ज करते हैं और इन्वेंट्री ट्रैक करते हैं।'
          }
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
        >
          <button 
            onClick={onDemo}
            className="bg-white border text-lg border-gray-200 text-[#1A1A1A] px-8 py-3.5 rounded-full font-semibold hover:bg-gray-50 transition-colors shadow-sm"
          >
            {language === 'EN' ? 'Learn More' : 'और जानें'}
          </button>
          
          <button 
            onClick={onGetStarted}
            className="bg-[#8A9B80] hover:bg-[#7a8a71] text-lg text-[#F8F5F2] px-8 py-3.5 rounded-full font-semibold shadow-lg transition-colors flex items-center justify-center gap-2"
          >
            {language === 'EN' ? 'Get Started' : 'शुरू करें'} <FiArrowRight size={20} />
          </button>
        </motion.div>
      </div>

      {/* Visual Mockup Section */}
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="w-full max-w-5xl mx-auto mt-20 relative h-[600px] flex justify-center perspective-[1000px] z-30 px-4"
      >
        {/* Left Floating Card */}
        <div className="absolute left-0 md:left-10 lg:left-24 top-24 z-20 hidden md:block w-72 transform -rotate-6">
          <div className="glass-card-float p-6 flex flex-col gap-4 transition-transform hover:-translate-y-2 hover:rotate-0 duration-300">
            <h3 className="font-bold text-[#1A1A1A] text-lg text-center">
              {language === 'EN' ? 'Tap to record sale!' : 'बिक्री दर्ज करने के लिए टैप करें!'}
            </h3>
            <div className="w-full bg-white/50 rounded-2xl h-24 flex items-center justify-center border border-white relative overflow-hidden">
              {/* Sound wave visual pattern */}
              <div className="flex items-center justify-center gap-1 w-full h-full opacity-30">
                {[...Array(15)].map((_, i) => (
                  <div key={i} className="w-1 bg-[#8A9B80] rounded-full" style={{ height: `${Math.random() * 80 + 10}%` }} />
                ))}
              </div>
              <button className="absolute bg-[#F8F5F2] text-[#8A9B80] p-4 rounded-full shadow-lg z-10 hover:scale-110 transition-transform">
                <FiMic size={24} />
              </button>
            </div>
            <div className="flex justify-between text-sm text-gray-500 font-medium px-2 mt-1">
              <span>Could</span>
              <span>You</span>
              <span>Say</span>
            </div>
          </div>
        </div>

        {/* Center Mobile Phone Mockup */}
        <div className="w-full max-w-[320px] h-full phone-mockup relative z-30 flex flex-col bg-[#F8F5F2]">
          {/* Phone Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-[#1a1a1a] rounded-b-xl z-50"></div>
          
          {/* Phone Content */}
          <div className="flex-1 overflow-hidden flex flex-col pt-10 px-5 relative h-full">
            {/* App Header bar */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#fce0c7] flex items-center justify-center font-bold text-[#1A1A1A] overflow-hidden border-2 border-white shadow-sm">
                  R
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Hello,</p>
                  <p className="text-sm font-bold text-[#1A1A1A]">Rahul Trader</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-white px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm text-sm font-bold">
                  <span className="text-[#8A9B80]">₹</span> 2.5K
                </div>
              </div>
            </div>

            {/* Calendar / Date row */}
            <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
              <div className="flex items-center justify-between text-sm font-bold mb-3">
                <span>&larr;</span>
                <span>March, 2026</span>
                <span>&rarr;</span>
              </div>
              <div className="flex justify-between text-xs text-center font-mediumtext-gray-400">
                <div className="flex flex-col gap-2"><span>M</span><span>16</span></div>
                <div className="flex flex-col gap-2"><span>T</span><span>17</span></div>
                <div className="flex flex-col gap-2"><span>W</span><span>18</span></div>
                <div className="flex flex-col gap-2 text-white"><span className="text-gray-400">T</span><span className="bg-[#8A9B80] w-6 h-6 flex items-center justify-center rounded-full">19</span></div>
                <div className="flex flex-col gap-2 opacity-40"><span>F</span><span>20</span></div>
                <div className="flex flex-col gap-2 opacity-40"><span>S</span><span>21</span></div>
                <div className="flex flex-col gap-2 opacity-40"><span>S</span><span>22</span></div>
              </div>
            </div>

            {/* AI Action Card */}
            <div className="bg-[#f2ebfd] rounded-2xl p-4 flex flex-col relative overflow-hidden mb-4">
              <div className="relative z-10 w-2/3">
                <p className="font-bold text-[#1A1A1A] mb-1">Daily AI Insights</p>
                <p className="text-xs text-gray-600 font-medium flex items-center gap-1 mb-3"><FiBarChart2 /> Inventory Low</p>
              </div>
              <button className="bg-white text-xs font-bold py-2 rounded-xl text-center shadow-sm relative z-10">
                View Details &rarr;
              </button>
              
              {/* Decorative circle bot dummy */}
              <div className="absolute right-[-10px] bottom-1 w-20 h-20 opacity-80 z-0">
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="50" cy="50" r="40" fill="#E6D9FA" />
                  <circle cx="35" cy="45" r="8" fill="#1A1A1A" />
                  <circle cx="65" cy="45" r="8" fill="#1A1A1A" />
                  <path d="M40 65 Q50 75 60 65" stroke="#1A1A1A" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            <div className="flex items-center justify-between mt-auto pb-4">
              <span className="font-bold text-lg">My Accuracy</span>
              <span className="text-sm font-medium text-gray-400">Pie Chart &or;</span>
            </div>
            {/* Bottom Gradient Overlay fade */}
            <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#F8F5F2] to-transparent z-40 block"></div>
          </div>
        </div>

        {/* Right Floating Card */}
        <div className="absolute right-0 md:right-4 lg:right-16 top-48 z-40 hidden md:block w-72 transform rotate-3">
          <div className="glass-card-float p-6 flex flex-col gap-3 transition-transform hover:-translate-y-2 hover:rotate-0 duration-300">
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-bold text-[#1A1A1A]">This Month</h3>
              <FiArrowRight size={18} className="text-gray-400 transform -rotate-45" />
            </div>
            
            <div className="bg-[#ebfae1] text-[#7a8a71] px-3 py-1.5 rounded-lg text-sm font-bold inline-flex items-center w-max gap-1">
              <FiCheckCircle size={14} /> +21% Sales
            </div>
            <p className="text-xs text-gray-500 font-medium pb-2 border-b border-gray-100">
              Total growth on smart inventory
            </p>
            
            {/* Dumb bars */}
            <div className="flex flex-col gap-2 mt-2">
              <div className="w-full bg-gray-100 h-6 rounded-full overflow-hidden">
                <div className="bg-[#e6d9fa] w-[80%] h-full"></div>
              </div>
              <div className="w-full bg-gray-100 h-6 rounded-full overflow-hidden">
                <div className="bg-[#c2f0eb] w-[45%] h-full"></div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
