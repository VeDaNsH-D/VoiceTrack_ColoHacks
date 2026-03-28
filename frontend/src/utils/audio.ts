// src/utils/audio.ts

export const getAudioPermission = async (): Promise<MediaStream> => {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })
  } catch (error) {
    throw new Error('Microphone access denied')
  }
}

export const startRecording = (stream: MediaStream): MediaRecorder => {
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'audio/webm;codecs=opus',
  })

  return mediaRecorder
}

export const stopRecording = (mediaRecorder: MediaRecorder): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const chunks: BlobPart[] = []

    mediaRecorder.ondataavailable = (e) => chunks.push(e.data)
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' })
      resolve(blob)
    }
    mediaRecorder.onerror = (event) => reject(event)

    mediaRecorder.stop()
  })
}

export const blobToWav = (blob: Blob): Promise<Blob> => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioContext.decodeAudioData(
        e.target?.result as ArrayBuffer,
        (audioBuffer) => {
          const offlineContext = new OfflineAudioContext(
            audioBuffer.numberOfChannels,
            audioBuffer.length,
            audioBuffer.sampleRate
          )
          const source = offlineContext.createBufferSource()
          source.buffer = audioBuffer
          source.connect(offlineContext.destination)
          source.start(0)

          offlineContext.startRendering().then((renderedBuffer) => {
            const wav = encodeWAV(renderedBuffer)
            const blob = new Blob([wav], { type: 'audio/wav' })
            resolve(blob)
          })
        }
      )
    }
    reader.readAsArrayBuffer(blob)
  })
}

const encodeWAV = (audioBuffer: AudioBuffer): ArrayBuffer => {
  const numOfChan = audioBuffer.numberOfChannels
  const sampleRate = audioBuffer.sampleRate
  const format = 1 // PCM
  const bitDepth = 16

  const bytesPerSample = bitDepth / 8
  const blockAlign = numOfChan * bytesPerSample

  const channelData: Float32Array[] = []
  let interleaved = new Float32Array(audioBuffer.length * numOfChan)

  for (let i = 0; i < numOfChan; i++) {
    channelData[i] = audioBuffer.getChannelData(i)
  }

  let offset = 0
  const len = audioBuffer.length
  while (offset < len) {
    for (let i = 0; i < numOfChan; i++) {
      let s = Math.max(-1, Math.min(1, channelData[i][offset]))
      interleaved[offset * numOfChan + i] =
        s < 0 ? s * 0x8000 : s * 0x7fff
    }
    offset++
  }

  const dataLength = len * numOfChan * 2
  const buffer = new ArrayBuffer(44 + dataLength)
  const view = new DataView(buffer)

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + dataLength, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, format, true)
  view.setUint16(22, numOfChan, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitDepth, true)
  writeString(36, 'data')
  view.setUint32(40, dataLength, true)

  let index = 44
  const volume = 0.8
  while (index < buffer.byteLength) {
    view.setInt16(index, interleaved[Math.floor((index - 44) / 2)] * volume, true)
    index += 2
  }

  return buffer
}

export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export const validateAudioDuration = (blob: Blob): Promise<boolean> => {
  return new Promise((resolve) => {
    const audio = new Audio()
    const reader = new FileReader()

    reader.onload = (e) => {
      audio.src = e.target?.result as string
      audio.onloadedmetadata = () => {
        // Max 3 minutes as per requirement
        resolve(audio.duration <= 180)
      }
    }

    reader.readAsDataURL(blob)
  })
}
