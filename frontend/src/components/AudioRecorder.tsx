// src/components/AudioRecorder.tsx
import React, { useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FiMic, FiX, FiCheck } from 'react-icons/fi'
import { formatDuration, getAudioPermission, startRecording, stopRecording, validateAudioDuration } from '../utils/audio'
import { useVoiceTraceStore } from '../store/store'

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob, duration: number) => void
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete }: AudioRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const { setIsRecording: setStoreRecording } = useVoiceTraceStore()

  useEffect(() => {
    getAudioPermission()
      .then((stream: MediaStream) => {
        streamRef.current = stream
        setHasPermission(true)
      })
      .catch(() => {
        setError('📱 Please allow microphone access to use VoiceTrace')
      })

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop())
      }
    }
  }, [])

  const handleStartRecording = async () => {
    if (!hasPermission) {
      setError('📱 Microphone access required')
      return
    }

    try {
      setIsRecording(true)
      setStoreRecording(true)
      setDuration(0)
      setError(null)

      if (!streamRef.current) {
        streamRef.current = await getAudioPermission()
      }

      const mediaRecorder = startRecording(streamRef.current)
      mediaRecorderRef.current = mediaRecorder

      // Timer
      timerRef.current = setInterval(() => {
        setDuration((d: number) => {
          if (d >= 180) {
            // 3 minute limit
            handleStopRecording()
            return 180
          }
          return d + 1
        })
      }, 1000) as unknown as NodeJS.Timeout
    } catch (err) {
      setError('❌ Failed to start recording')
      setIsRecording(false)
      setStoreRecording(false)
    }
  }

  const handleStopRecording = async () => {
    if (!mediaRecorderRef.current) return

    try {
      const blob = await stopRecording(mediaRecorderRef.current)

      // Validate duration
      const isValid = await validateAudioDuration(blob)
      if (!isValid) {
        setError('❌ Recording is too long (max 3 minutes)')
        setIsRecording(false)
        setStoreRecording(false)
        return
      }

      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }

      setIsRecording(false)
      setStoreRecording(false)

      // Notify parent
      onRecordingComplete(blob, duration)
    } catch (err) {
      setError('❌ Failed to stop recording')
      setIsRecording(false)
      setStoreRecording(false)
    }
  }

  const handleCancel = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    setIsRecording(false)
    setStoreRecording(false)
    setDuration(0)
    setError(null)
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-6">
      {/* Status Text */}
      {!isRecording && !error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <p className="text-lg font-medium text-dark mb-2">📢 Tell us about your day</p>
          <p className="text-sm text-neutral max-w-xs">
            Speak naturally. Tell us what you sold, what you spent, how your day was.
          </p>
        </motion.div>
      )}

      {/* Recording Display */}
      {isRecording && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <p className="text-sm text-neutral mb-4">🔴 Recording...</p>
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1.2 }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="inline-block mb-4"
          >
            <div className="w-20 h-20 rounded-full bg-danger bg-opacity-10 flex items-center justify-center">
              <FiMic className="w-10 h-10 text-danger" />
            </div>
          </motion.div>
          <p className="text-3xl font-bold text-dark font-mono">
            {formatDuration(duration)}
          </p>
          <p className="text-xs text-neutral mt-2">Max 3 minutes</p>
        </motion.div>
      )}

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-danger bg-opacity-10 border border-danger border-opacity-30 rounded-lg p-4 w-full max-w-sm text-center"
        >
          <p className="text-danger text-sm font-medium">{error}</p>
        </motion.div>
      )}

      {/* Controls */}
      <div className="flex gap-4">
        {!isRecording ? (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleStartRecording}
            disabled={!hasPermission}
            className="w-20 h-20 rounded-full bg-primary text-white shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center"
          >
            <FiMic className="w-10 h-10" />
          </motion.button>
        ) : (
          <>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleStopRecording}
              className="w-20 h-20 rounded-full bg-success text-white shadow-lg hover:shadow-xl flex items-center justify-center"
            >
              <FiCheck className="w-10 h-10" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleCancel}
              className="w-20 h-20 rounded-full bg-neutral text-white shadow-lg hover:shadow-xl flex items-center justify-center"
            >
              <FiX className="w-10 h-10" />
            </motion.button>
          </>
        )}
      </div>

      {/* Help Text */}
      <p className="text-xs text-neutral text-center max-w-xs">
        💡 Tip: Speak in your natural way. Mention items sold, prices, and any expenses.
      </p>
    </div>
  )
}
