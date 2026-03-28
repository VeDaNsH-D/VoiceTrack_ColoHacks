const axios = require("axios");
const env = require("../config/env");
const logger = require("../utils/logger");

function buildTtsUrl() {
  return `${env.ttsBaseUrl.replace(/\/$/, "")}${env.ttsPath.startsWith("/") ? env.ttsPath : `/${env.ttsPath}`}`;
}

function toAbsoluteAudioUrl(audioUrl) {
  if (typeof audioUrl !== "string" || !audioUrl.trim()) {
    return null;
  }

  if (/^https?:\/\//i.test(audioUrl)) {
    return audioUrl;
  }

  const normalizedBaseUrl = env.ttsBaseUrl.replace(/\/$/, "");
  const normalizedPath = audioUrl.startsWith("/") ? audioUrl : `/${audioUrl}`;

  return `${normalizedBaseUrl}${normalizedPath}`;
}

async function generateSpeech(text, language = null) {
  const cleanedText = typeof text === "string" ? text.trim() : "";

  if (!cleanedText) {
    return null;
  }

  try {
    const payload = { text: cleanedText };

    if (typeof language === "string" && language.trim()) {
      payload.language = language.trim();
    }

    const response = await axios.post(buildTtsUrl(), payload, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: env.ttsTimeoutMs,
    });

    const audioUrl = response?.data?.audioUrl || response?.data?.audio_path || null;
    const normalizedAudioUrl = toAbsoluteAudioUrl(audioUrl);

    if (!normalizedAudioUrl) {
      logger.warn("TTS service returned no usable audio URL", {
        ttsUrl: buildTtsUrl(),
        responseData: response?.data,
      });
      return null;
    }

    return normalizedAudioUrl;
  } catch (error) {
    logger.warn("TTS generation failed", {
      ttsUrl: buildTtsUrl(),
      error: error.message,
      status: error.response?.status,
      responseData: error.response?.data,
    });
    return null;
  }
}

module.exports = {
  generateSpeech,
  toAbsoluteAudioUrl,
};
