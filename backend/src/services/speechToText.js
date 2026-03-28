const axios = require("axios");
const FormData = require("form-data");
const env = require("../config/env");

const MAX_AUDIO_BYTES = Number(process.env.VOICE_MAX_AUDIO_BYTES || 25 * 1024 * 1024);

function buildSttUrl() {
  const base = String(env.pythonServiceUrl || process.env.PYTHON_SERVICE_URL || "http://127.0.0.1:8001").replace(/\/$/, "");
  const path = String(env.sttPath || process.env.STT_PATH || "/stt");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

async function transcribeWithSarvamPipeline(audioBuffer, fileName, mimeType) {
  const form = new FormData();
  form.append("file", audioBuffer, {
    filename: fileName,
    contentType: mimeType,
  });

  const response = await axios.post(buildSttUrl(), form, {
    headers: form.getHeaders(),
    timeout: 180000,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });

  const payload = response?.data?.success ? response.data.data : response.data;
  const rawTranscript = String(payload?.raw_text || payload?.final_text || payload?.text || payload?.message || "").trim();
  const finalTranscript = String(payload?.final_text || payload?.text || rawTranscript).trim();

  if (!rawTranscript && !finalTranscript) {
    throw new Error("Sarvam STT returned empty transcript");
  }

  return {
    provider: String(payload?.source || "sarvam"),
    text: finalTranscript || rawTranscript,
    rawTranscript: rawTranscript || finalTranscript,
    confidence: Number(payload?.confidence || 0.75),
    meta: payload || null,
  };
}

async function transcribeAudioBuffer({
  audioBuffer,
  fileName = "recording.webm",
  mimeType = "audio/webm",
}) {
  if (!audioBuffer || !Buffer.isBuffer(audioBuffer) || audioBuffer.length === 0) {
    throw new Error("Audio buffer is required");
  }

  if (audioBuffer.length > MAX_AUDIO_BYTES) {
    throw new Error("Audio file is too large for 3-minute limit");
  }

  const sarvamResult = await transcribeWithSarvamPipeline(audioBuffer, fileName, mimeType);
  return {
    provider: sarvamResult.provider || "sarvam",
    text: sarvamResult.text,
    rawTranscript: sarvamResult.rawTranscript,
    confidence: sarvamResult.confidence,
    meta: sarvamResult.meta,
  };
}

module.exports = {
  transcribeAudioBuffer,
};
