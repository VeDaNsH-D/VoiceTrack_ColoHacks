import React, { useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { formatDuration, getAudioPermission, startRecording, validateAudioDuration } from '../utils/audio'

interface VoiceRecordingProps {
  onRecordingComplete: (blob: Blob, duration: number) => void
}

export const VoiceRecording: React.FC<VoiceRecordingProps> = ({ onRecordingComplete }) => {
  const [isRecording, setIsRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    getAudioPermission()
      .then((stream: MediaStream) => {
        streamRef.current = stream
        setHasPermission(true)
      })
      .catch(() => {
        setError('Please allow microphone access to continue')
      })

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop())
      }
    }
  }, [])

  const handleStartRecording = async () => {
    if (!hasPermission) {
      setError('Microphone access required')
      return
    }

    try {
      setIsRecording(true)
      setDuration(0)
      setError(null)

      if (!streamRef.current) {
        streamRef.current = await getAudioPermission()
      }

      const mediaRecorder = startRecording(streamRef.current)
      mediaRecorderRef.current = mediaRecorder

      timerRef.current = setInterval(() => {
        setDuration((d: number) => {
          if (d >= 180) {
            handleStopRecording()
            return 180
          }
          return d + 1
        })
      }, 1000) as unknown as NodeJS.Timeout
    } catch (err) {
      setError('Failed to start recording')
      setIsRecording(false)
    }
  }

  const handleStopRecording = async () => {
    if (!mediaRecorderRef.current) return

    return new Promise<void>((resolve) => {
      const recorder = mediaRecorderRef.current!

      const onDataAvailable = async (event: BlobEvent) => {
        recorder.removeEventListener('dataavailable', onDataAvailable)
        
        const blob = event.data
        const isValid = await validateAudioDuration(blob)
        
        if (isValid) {
          onRecordingComplete(blob, duration)
        } else {
          setError('Recording too long (max 3 minutes)')
        }

        resolve()
      }

      recorder.addEventListener('dataavailable', onDataAvailable)

      if (timerRef.current) {
        clearInterval(timerRef.current)
      }

      recorder.stop()
      setIsRecording(false)
    })
  }

  const handleCancel = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setDuration(0)
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-cream flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-dark">AI Assistant</h2>
        <button className="w-10 h-10 rounded-full hover:bg-peach transition-colors flex items-center justify-center">
          <svg className="w-5 h-5 text-dark" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2m0 2a8 8 0 100 16 8 8 0 000-16z" />
          </svg>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-32">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8 text-center"
        >
          <p className="text-sm text-neutral mb-2">Speak or type to manage money</p>
          <h1 className="text-3xl font-bold text-dark mb-4">How can I help you today?</h1>
        </motion.div>

        {/* Recording Visual */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative w-48 h-48 mb-12"
        >
          {isRecording && (
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="absolute inset-0 bg-sage rounded-full opacity-10"
            />
          )}
          
          <div className="absolute inset-0 bg-gradient-to-br from-peach via-cream to-peach rounded-full flex items-center justify-center shadow-lg">
            {!isRecording && (
              <div className="text-center">
                <svg className="w-20 h-20 mx-auto mb-2 text-dark opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14c1.657 0 3-1.343 3-3V5c0-1.657-1.343-3-3-3S9 3.343 9 5v6c0 1.657 1.343 3 3 3z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 11c0 2.76-2.239 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
                <p className="text-xs text-neutral">Ready to listen</p>
              </div>
            )}
            
            {isRecording && (
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <svg className="w-20 h-20 text-sage" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.657 0 3-1.343 3-3V5c0-1.657-1.343-3-3-3S9 3.343 9 5v6c0 1.657 1.343 3 3 3z" />
                  <path d="M17 11c0 2.76-2.239 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Recording Status */}
        {isRecording && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mb-8"
          >
            <p className="text-lg font-semibold text-dark mb-2">Recording...</p>
            <p className="text-2xl font-mono text-sage">{formatDuration(duration)}</p>
            <p className="text-xs text-neutral mt-2">Maximum 3 minutes</p>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-accent bg-opacity-10 border border-accent border-opacity-30 rounded-lg px-4 py-3 text-accent text-sm text-center mb-8 max-w-xs"
          >
            {error}
          </motion.div>
        )}

        {!isRecording && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleStartRecording}
            className="w-16 h-16 rounded-full bg-sage text-cream flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
          >
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.657 0 3-1.343 3-3V5c0-1.657-1.343-3-3-3S9 3.343 9 5v6c0 1.657 1.343 3 3 3z" />
              <path d="M17 11c0 2.76-2.239 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          </motion.button>
        )}

        {isRecording && (
          <div className="flex gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleStopRecording}
              className="w-16 h-16 rounded-full bg-sage text-cream flex items-center justify-center shadow-lg"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h12v12H6z" />
              </svg>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCancel}
              className="w-16 h-16 rounded-full bg-tan bg-opacity-20 border border-tan border-opacity-30 text-dark flex items-center justify-center"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
              </svg>
            </motion.button>
          </div>
        )}
      </div>
    </div>
  )
}
