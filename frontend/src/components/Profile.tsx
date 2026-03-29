import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { FiUser, FiMail, FiSettings, FiLogOut, FiGlobe, FiEdit2, FiCheck, FiX, FiMenu } from 'react-icons/fi'

interface ProfileProps {
    userId: string
    userName: string
    userEmail?: string
    language: 'EN' | 'HI'
    onLogout: () => void
    onLanguageChange: (lang: 'EN' | 'HI') => void
    onToggleSidebar: () => void
}

interface EditableFieldProps {
    label: string
    value: string
    isEditing: boolean
    onEdit: () => void
    onSave: (value: string) => void
    onCancel: () => void
    type?: 'text' | 'email'
    language?: 'EN' | 'HI'
}

const EditableField: React.FC<EditableFieldProps> = ({
    label,
    value,
    isEditing,
    onEdit,
    onSave,
    onCancel,
    type = 'text',
    language = 'EN',
}) => {
    const [tempValue, setTempValue] = useState(value)

    return (
        <div className="card-elevated p-5 flex items-center justify-between">
            <div className="flex-1">
                <label className="text-xs font-semibold tracking-widest text-[#8A9B80] uppercase">{label}</label>
                {isEditing ? (
                    <input
                        type={type}
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        className="input-shell mt-2 w-full"
                        autoFocus
                    />
                ) : (
                    <p className="mt-2 font-semibold text-[#1A1A1A]">
                        {value || (language === 'EN' ? 'Not provided' : 'प्रदान नहीं किया गया')}
                    </p>
                )}
            </div>
            <div className="ml-4 flex gap-1">
                {isEditing ? (
                    <>
                        <motion.button
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                                onSave(tempValue)
                                setTempValue(value)
                            }}
                            title="Save"
                            className="p-2 rounded-full hover:bg-green-50 transition-colors"
                        >
                            <FiCheck size={18} className="text-[#8A9B80]" />
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                                onCancel()
                                setTempValue(value)
                            }}
                            title="Cancel"
                            className="p-2 rounded-full hover:bg-red-50 transition-colors"
                        >
                            <FiX size={18} className="text-[#F85F54]" />
                        </motion.button>
                    </>
                ) : (
                    <motion.button
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onEdit}
                        title="Edit"
                        className="p-2 rounded-full hover:bg-[#EBF2E6] transition-colors"
                    >
                        <FiEdit2 size={18} className="text-[#8A9B80]" />
                    </motion.button>
                )}
            </div>
        </div>
    )
}

export const Profile: React.FC<ProfileProps> = ({
    userId,
    userName,
    userEmail,
    language,
    onLogout,
    onLanguageChange,
    onToggleSidebar,
}) => {
    const [editingName, setEditingName] = useState(false)
    const [editingEmail, setEditingEmail] = useState(false)
    const [displayName, setDisplayName] = useState(userName)
    const [displayEmail, setDisplayEmail] = useState(userEmail || '')
    const [currentLanguage, setCurrentLanguage] = useState(language)
    const [notificationMessage, setNotificationMessage] = useState('')

    const showNotification = (message: string) => {
        setNotificationMessage(message)
        setTimeout(() => setNotificationMessage(''), 3000)
    }

    const handleSaveName = (newName: string) => {
        if (newName.trim()) {
            setDisplayName(newName)
            setEditingName(false)
            showNotification(language === 'EN' ? 'Name updated successfully!' : 'नाम सफलतापूर्वक अपडेट किया गया!')
        }
    }

    const handleSaveEmail = (newEmail: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (newEmail.trim() === '' || emailRegex.test(newEmail)) {
            setDisplayEmail(newEmail)
            setEditingEmail(false)
            showNotification(
                newEmail ? (language === 'EN' ? 'Email updated successfully!' : 'ईमेल सफलतापूर्वक अपडेट किया गया!')
                    : (language === 'EN' ? 'Email removed!' : 'ईमेल हटा दिया गया!')
            )
        } else {
            showNotification(language === 'EN' ? 'Enter a valid email address' : 'एक वैध ईमेल पता दर्ज करें')
        }
    }

    const handleLanguageChange = (newLang: 'EN' | 'HI') => {
        setCurrentLanguage(newLang)
        onLanguageChange(newLang)
        showNotification(
            newLang === 'EN' ? 'Language set to English' : 'भाषा हिंदी में सेट की गई'
        )
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.08, delayChildren: 0.1 },
        },
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 12 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    }

    const todayLabel = new Date().toLocaleDateString(language === 'HI' ? 'hi-IN' : 'en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    })

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full bg-[#F5F0EB] flex flex-col relative overflow-hidden"
        >
            {/* Ambient Background */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-20 right-[10%] h-72 w-72 rounded-full bg-[#F5A623]/8 blur-3xl" />
                <div className="absolute bottom-1/4 left-[5%] h-64 w-64 rounded-full bg-[#8A9B80]/8 blur-3xl" />
            </div>

            {/* Top Bar */}
            <div className="relative z-10 flex items-center justify-between px-5 pt-6 pb-4 flex-shrink-0 max-w-7xl w-full mx-auto">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onToggleSidebar}
                    className="md:hidden w-10 h-10 rounded-full border border-[#1A1A1A]/10 bg-white/60 backdrop-blur flex items-center justify-center"
                >
                    <FiMenu size={18} className="text-[#1A1A1A]" />
                </motion.button>
                <div className="hidden md:block w-10" />

                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur border border-[#1A1A1A]/10">
                    <span className="text-xs font-bold text-[#1A1A1A]/60 tracking-[0.15em] uppercase">
                        {language === 'EN' ? 'Profile' : 'प्रोफ़ाइल'}
                    </span>
                </div>

                <div className="text-xs font-semibold text-[#1A1A1A]/60 bg-white/60 backdrop-blur border border-[#1A1A1A]/10 rounded-full px-3 py-1">
                    {todayLabel}
                </div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex-1 overflow-y-auto px-5 pb-6">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="max-w-two-xl mx-auto space-y-5"
                >
                    {/* User Avatar & Quick Info */}
                    <motion.div variants={itemVariants} className="card-elevated p-8 flex flex-col items-center text-center">
                        <motion.div
                            whileHover={{ scale: 1.08 }}
                            className="w-20 h-20 rounded-full bg-gradient-to-br from-[#8A9B80] to-[#F5A623]/70 flex items-center justify-center mb-4"
                        >
                            <FiUser size={40} className="text-white" />
                        </motion.div>
                        <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A1A]">{displayName}</h1>
                        <p className="text-xs font-semibold tracking-widest text-[#8A9B80] uppercase mt-1">{userId.substring(0, 8)}...</p>
                    </motion.div>

                    {/* Account Information Section */}
                    <motion.div variants={itemVariants} className="space-y-4">
                        <h2 className="text-sm font-bold tracking-widest text-[#1A1A1A]/60 uppercase flex items-center gap-2">
                            <FiUser size={16} className="text-[#8A9B80]" />
                            {language === 'EN' ? 'Account Details' : 'खाता विवरण'}
                        </h2>
                        <div className="space-y-3">
                            <EditableField
                                label={language === 'EN' ? 'Full Name' : 'पूरा नाम'}
                                value={displayName}
                                isEditing={editingName}
                                onEdit={() => setEditingName(true)}
                                onSave={handleSaveName}
                                onCancel={() => setEditingName(false)}
                                language={language}
                            />
                            <EditableField
                                label={language === 'EN' ? 'Email Address' : 'ईमेल पता'}
                                value={displayEmail}
                                isEditing={editingEmail}
                                onEdit={() => setEditingEmail(true)}
                                onSave={handleSaveEmail}
                                onCancel={() => setEditingEmail(false)}
                                type="email"
                                language={language}
                            />
                        </div>
                    </motion.div>

                    {/* Settings Section */}
                    <motion.div variants={itemVariants} className="space-y-4">
                        <h2 className="text-sm font-bold tracking-widest text-[#1A1A1A]/60 uppercase flex items-center gap-2">
                            <FiSettings size={16} className="text-[#8A9B80]" />
                            {language === 'EN' ? 'Preferences' : 'वरीयताएं'}
                        </h2>
                        
                        {/* Language Setting */}
                        <div className="card-elevated p-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#EBF2E6] flex items-center justify-center">
                                    <FiGlobe size={18} className="text-[#8A9B80]" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold tracking-widest text-[#1A1A1A]/60 uppercase">{language === 'EN' ? 'Language' : 'भाषा'}</p>
                                    <p className="text-sm font-semibold text-[#1A1A1A] mt-1">
                                        {currentLanguage === 'EN' ? 'English' : 'हिंदी (हिन्दी)'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleLanguageChange('EN')}
                                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                                        currentLanguage === 'EN'
                                            ? 'bg-[#1A1A1A] text-white shadow-md'
                                            : 'bg-[#EBF2E6] text-[#1A1A1A] hover:bg-[#8A9B80]/20'
                                    }`}
                                >
                                    EN
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleLanguageChange('HI')}
                                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                                        currentLanguage === 'HI'
                                            ? 'bg-[#1A1A1A] text-white shadow-md'
                                            : 'bg-[#EBF2E6] text-[#1A1A1A] hover:bg-[#8A9B80]/20'
                                    }`}
                                >
                                    HI
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>

                    {/* Account Stats */}
                    <motion.div variants={itemVariants} className="space-y-4">
                        <h2 className="text-sm font-bold tracking-widest text-[#1A1A1A]/60 uppercase">
                            {language === 'EN' ? 'Account Overview' : 'खाता सारांश'}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="card-elevated p-5 text-center">
                                <p className="text-xs font-semibold tracking-widest text-[#8A9B80] uppercase">
                                    {language === 'EN' ? 'Member Since' : 'सदस्य बने'}
                                </p>
                                <p className="text-lg font-bold text-[#1A1A1A] mt-3">
                                    {new Date().toLocaleDateString(language === 'EN' ? 'en-IN' : 'hi-IN', {
                                        month: 'short',
                                        year: '2-digit',
                                    })}
                                </p>
                            </div>
                            <div className="card-elevated p-5 text-center">
                                <p className="text-xs font-semibold tracking-widest text-[#8A9B80] uppercase">
                                    {language === 'EN' ? 'Status' : 'स्थिति'}
                                </p>
                                <p className="text-lg font-bold text-[#1A1A1A] mt-3">
                                    {language === 'EN' ? 'Active' : 'सक्रिय'}
                                </p>
                            </div>
                            <div className="card-elevated p-5 text-center">
                                <p className="text-xs font-semibold tracking-widest text-[#8A9B80] uppercase">
                                    {language === 'EN' ? 'Region' : 'क्षेत्र'}
                                </p>
                                <p className="text-lg font-bold text-[#1A1A1A] mt-3">
                                    {language === 'EN' ? 'India' : 'भारत'}
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Notification */}
                    {notificationMessage && (
                        <motion.div
                            initial={{ opacity: 0, y: -12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            className="card-elevated p-4 text-center text-[#8A9B80] font-semibold"
                        >
                            {notificationMessage}
                        </motion.div>
                    )}
                </motion.div>
            </div>

            {/* Logout Button Footer */}
            <motion.div
                variants={itemVariants}
                className="relative z-10 px-5 pb-6 flex-shrink-0"
            >
                <motion.button
                    whileHover={{ scale: 1.02, boxShadow: '0 12px 40px rgba(248, 95, 84, 0.15)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onLogout}
                    className="btn-primary w-full flex items-center justify-center gap-2 bg-[#F85F54] hover:bg-[#E74C41] text-white"
                >
                    <FiLogOut size={20} />
                    {language === 'EN' ? 'Logout' : 'लॉगआउट'}
                </motion.button>
            </motion.div>
        </motion.div>
    )
}
