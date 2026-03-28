const { extractIntent, inferIntentFromRules } = require("../services/intentService");
const { handleQuery } = require("../services/queryService");
const { generateResponse } = require("../services/responseService");
const { generateSpeech } = require("../services/ttsService");
const { getRelevantContext } = require("../services/vectorService");
const logger = require("../utils/logger");

const FILLER_WORDS = new Set([
  "uh",
  "um",
  "hmm",
  "huh",
  "ah",
  "er",
  "like",
  "matlab",
]);

function cleanInput(message, sttProvider) {
  const normalizedProvider = String(sttProvider || "").toLowerCase();

  let cleanedMessage = String(message || "").trim().toLowerCase();

  if (!cleanedMessage) {
    return "";
  }

  cleanedMessage = cleanedMessage
    .split(/\s+/)
    .filter((word) => !FILLER_WORDS.has(word))
    .join(" ");

  if (normalizedProvider === "whisper") {
    cleanedMessage = cleanedMessage
      .replace(/[^\p{L}\p{N}\s?.!,]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  return cleanedMessage;
}

function detectLanguage(message) {
  const input = String(message || "");

  if (/[\u0900-\u097F]/.test(input)) {
    return "hi";
  }

  if (/\b(aaj|kal|kitna|kitni|kitne|tumne|maal|becha|bika|biki|hai|haan|nahi)\b/i.test(input)) {
    return "hi";
  }

  return "en";
}

async function resolveIntent(message) {
  try {
    return await extractIntent(message);
  } catch (error) {
    logger.warn("Intent extraction failed, using rule-based fallback", {
      input: message,
      error: error.message,
      code: error.code,
    });
    return inferIntentFromRules(message);
  }
}

async function chat(req, res) {
  const {
    userId,
    message,
    source = "voice",
    sttProvider = "sarvam",
  } = req.body || {};

  if (typeof userId !== "string" || !userId.trim()) {
    return res.status(400).json({ error: "Something went wrong" });
  }

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Something went wrong" });
  }

  try {
    const cleanedMessage = cleanInput(message, sttProvider);

    if (!cleanedMessage) {
      return res.status(400).json({ error: "Something went wrong" });
    }

    const intentData = await resolveIntent(cleanedMessage);
    const queryResult = await handleQuery(userId.trim(), intentData);
    const contextDocs = await getRelevantContext(userId.trim(), cleanedMessage);
    const context = contextDocs.join("\n");
    const responsePayload = await generateResponse(cleanedMessage, queryResult, context);
    const reply = typeof responsePayload?.reply === "string"
      ? responsePayload.reply.trim()
      : "";

    if (!reply) {
      throw new Error("Empty reply generated");
    }

    const language = detectLanguage(cleanedMessage);
    const audioUrl = await generateSpeech(reply, language);

    logger.info("Voice chat response generated", {
      userId: userId.trim(),
      input: message,
      cleanedInput: cleanedMessage,
      reply,
      source,
      sttProvider,
      retrievedContextCount: contextDocs.length,
      audioGenerated: Boolean(audioUrl),
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({
      reply,
      audioUrl,
    });
  } catch (error) {
    logger.error("Chat controller error", {
      userId,
      input: message,
      source,
      sttProvider,
      error: error.message,
      code: error.code,
      details: error.details,
    });

    return res.status(500).json({
      error: "Something went wrong",
    });
  }
}

module.exports = {
  chat,
  cleanInput,
  detectLanguage,
};
