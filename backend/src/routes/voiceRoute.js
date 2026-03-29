const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const Transaction = require("../models/transaction.model");
const User = require("../models/user.model");
const { sendSuccess, sendError } = require("../utils/apiResponse");
const { transcribeAudioBuffer } = require("../services/speechToText");
const { parseMultipleTransactions } = require("../services/multiTransactionParser");
const { generateSpeech } = require("../services/ttsService");
const { generateVoiceReply } = require("../services/assistantReply");
const {
  evaluateExtractionConfidence,
} = require("../services/confidenceEngine");
const { extractIntent, inferIntentFromRules } = require("../services/intentService");
const { handleQuery } = require("../services/queryService");
const { generateResponse } = require("../services/responseService");
const { getRelevantContext } = require("../services/vectorService");
const {
  saveProcessedTransaction,
  saveRawLog,
} = require("../services/transaction.store");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.VOICE_MAX_AUDIO_BYTES || 25 * 1024 * 1024),
  },
});

function toObjectIdOrNull(value) {
  const text = String(value || "").trim();
  if (!text || !mongoose.Types.ObjectId.isValid(text)) {
    return null;
  }
  return new mongoose.Types.ObjectId(text);
}

async function resolveUserAndBusinessIds(userId, businessId) {
  const normalizedUserId = toObjectIdOrNull(userId);
  const normalizedBusinessId = toObjectIdOrNull(businessId);

  if (normalizedBusinessId) {
    return {
      userId: normalizedUserId,
      businessId: normalizedBusinessId,
    };
  }

  if (normalizedUserId) {
    const user = await User.findById(normalizedUserId).select("businessId").lean();
    return {
      userId: normalizedUserId,
      businessId: user?.businessId || null,
    };
  }

  return {
    userId: null,
    businessId: null,
  };
}

function mapTransactionsToSchema(transactions) {
  const sales = [];
  const expenses = [];

  transactions.forEach((tx) => {
    if (tx.type === "credit") {
      sales.push({
        item: tx.item,
        qty: Math.max(1, Number(tx.quantity || 1)),
        price: Math.max(0.01, Number(tx.price || tx.total || 0.01)),
      });
      return;
    }

    expenses.push({
      item: tx.item,
      amount: Math.max(0.01, Number(tx.total || tx.price || 0.01)),
    });
  });

  return { sales, expenses };
}

function buildRecordedResponse(transactions) {
  const lines = ["🧾 Transactions Recorded:", ""];
  transactions.forEach((tx) => {
    lines.push(`• ${tx.item} -> ₹${Number(tx.total || 0)}`);
  });
  lines.push("", `Total entries: ${transactions.length}`);
  return lines.join("\n");
}

function detectLanguage(text) {
  const input = String(text || "");

  if (/[\u0900-\u097F]/.test(input)) {
    return "hi";
  }

  if (/\b(aaj|kal|kitna|kitni|kitne|tumne|maal|becha|bika|biki|hai|haan|nahi)\b/i.test(input)) {
    return "hi";
  }

  return "en";
}

function isSimpleGreeting(text) {
  const normalized = String(text || "").trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  const compact = normalized.replace(/[!,.?]/g, "").trim();
  return /^(hi+|hello+|hey+|namaste|namaskar|नमस्ते|नमस्कार)$/.test(compact);
}

function buildSimpleGreetingReply(language) {
  if (language === "hi") {
    return "नमस्ते! बताइए आपको क्या चाहिए।";
  }

  return "Hi! Ask me what you need.";
}

function looksLikeNonTransactionQuery(text) {
  const value = String(text || "").trim().toLowerCase();
  if (!value) {
    return false;
  }

  const transactionActionMarkers = [
    "record",
    "add",
    "save",
    "becha",
    "bechi",
    "sold",
    "expense entry",
    "kharcha likh",
    "entry",
  ];

  const analyticsMarkers = [
    "profit",
    "loss",
    "expense",
    "expenses",
    "sales",
    "total",
    "top product",
    "transaction count",
    "insight",
    "trend",
    "fayda",
    "nuksan",
    "munafa",
    "ghata",
    "लाभ",
    "मुनाफा",
    "प्रॉफिट",
    "घाटा",
    "नुकसान",
    "bikri",
    "kul",
    "लेनदेन",
    "ट्रांजैक्शन",
    "ट्रांजेक्शन",
    "गिनती",
    "संख्या",
    "कितने ट्रांजैक्शन",
    "कितनी बिक्री",
    "kitna",
    "kitni",
  ];

  const questionMarkers = ["?", "what", "how", "why", "show", "tell", "kya", "kaise", "batao", "dikhao"];

  const hasTransactionAction = transactionActionMarkers.some((marker) => value.includes(marker));
  const hasAnalyticsIntent = analyticsMarkers.some((marker) => value.includes(marker));
  const hasQuestionShape = questionMarkers.some((marker) => value.includes(marker));

  const hasTransactionNumbers =
    /\b\d+(?:\.\d+)?\s*(?:rs|rupees|₹|qty|quantity|unit|pieces|pc|kg|ltr|litre|लीटर|किलो)\b/i.test(value) ||
    /\b\d+(?:\.\d+)?\s+\w+\s+(?:for|at|@|ke|का|की|के)\s*\d+(?:\.\d+)?\b/i.test(value);

  // Explicit transaction-like numeric utterances should stay in transaction flow.
  if (hasTransactionAction && hasTransactionNumbers && !hasQuestionShape) {
    return false;
  }

  if (hasTransactionAction && !hasQuestionShape) {
    return false;
  }

  return hasAnalyticsIntent || hasQuestionShape;
}

function shouldTreatAsNonTransactionQuery(text) {
  const cleaned = String(text || "").trim();
  if (!cleaned) {
    return false;
  }

  if (looksLikeNonTransactionQuery(cleaned)) {
    return true;
  }

  const inferred = inferIntentFromRules(cleaned);
  const intent = String(inferred?.intent || "UNKNOWN").toUpperCase();

  return intent !== "UNKNOWN";
}

async function resolveNonTransactionVoiceReply({ userId, transcript, languageHint }) {
  const cleanedTranscript = String(transcript || "").trim();
  if (!cleanedTranscript || !userId) {
    return null;
  }

  let intentData;
  try {
    intentData = await extractIntent(cleanedTranscript);
  } catch (_) {
    intentData = inferIntentFromRules(cleanedTranscript);
  }

  const intent = String(intentData?.intent || "UNKNOWN").toUpperCase();
  let queryResult = { type: "unknown", value: 0 };
  try {
    queryResult = await handleQuery(String(userId), intentData || {});
  } catch (_) {
    queryResult = { type: "unknown", value: 0 };
  }

  let contextDocs = [];
  try {
    contextDocs = await getRelevantContext(String(userId), cleanedTranscript);
  } catch (_) {
    contextDocs = [];
  }

  let response;
  try {
    response = await generateResponse(
      cleanedTranscript,
      queryResult,
      contextDocs.join("\n"),
      languageHint || detectLanguage(cleanedTranscript)
    );
  } catch (_) {
    response = {
      reply:
        (languageHint || detectLanguage(cleanedTranscript)) === "hi"
          ? "Main aapke sawal ka reply dene ke liye ready hoon. Kripya sawaal thoda specific batayein, jaise profit, expense ya sales."
          : "I can help with that. Please ask a specific question like profit, expense, or sales for today/week/month.",
    };
  }

  const replyText = String(response?.reply || "").trim();
  if (!replyText) {
    return null;
  }

  const audioUrl = await generateSpeech(replyText, languageHint || detectLanguage(cleanedTranscript));

  return {
    replyText,
    audioUrl,
    queryMeta: {
      intentResolved: intent !== "UNKNOWN",
      intent: intentData,
      queryResult,
      contextCount: contextDocs.length,
    },
  };
}

async function saveLedgerEntry({
  userId,
  businessId,
  rawTranscript,
  normalizedText,
  modelUsed,
  overallConfidence,
  transactions,
}) {
  const { sales, expenses } = mapTransactionsToSchema(transactions);

  const rawLog = await saveRawLog({
    ...(userId ? { userId } : {}),
    ...(businessId ? { businessId } : {}),
    text: rawTranscript,
    normalizedText,
    source: "stt",
    status: "processed",
    parseMeta: {
      confidence: overallConfidence,
      parserSource: modelUsed === "fallback" ? "fallback" : "llm",
      needsClarification: false,
      clarificationQuestion: null,
    },
  });

  const saved = await saveProcessedTransaction({
    ...(userId ? { userId } : {}),
    ...(businessId ? { businessId } : {}),
    rawText: rawTranscript,
    normalizedText,
    rawLogId: rawLog?._id || null,
    sales,
    expenses,
    meta: {
      confidence: overallConfidence,
      source: modelUsed === "fallback" ? "fallback" : "llm",
      needsClarification: false,
      clarificationQuestion: null,
    },
  });

  return saved;
}

router.post("/process", upload.single("audio"), async (req, res, next) => {
  try {
    const bodyTranscript = String(req.body?.transcript || "").trim();
    const forceSave = String(req.body?.forceSave || "false").toLowerCase() === "true";
    const authUserId = req.user?.userId || null;
    const requestedUserId = authUserId || req.body?.userId || null;
    const resolvedIds = await resolveUserAndBusinessIds(requestedUserId, req.body?.businessId);
    const userId = resolvedIds.userId;
    const businessId = resolvedIds.businessId;

    if (!userId && !businessId) {
      return sendError(res, "User scope is required to register ledger history", 400, {
        code: "VOICE_USER_SCOPE_REQUIRED",
      });
    }

    let sttResult = null;
    let rawTranscript = bodyTranscript;

    if (!rawTranscript && req.file?.buffer) {
      sttResult = await transcribeAudioBuffer({
        audioBuffer: req.file.buffer,
        fileName: req.file.originalname || "recording.webm",
        mimeType: req.file.mimetype || "audio/webm",
        languageHint: req.body?.languageHint || "hi",
      });
      rawTranscript = sttResult.rawTranscript;
    }

    if (!rawTranscript) {
      return sendError(res, "Provide transcript text or audio file", 400, {
        code: "MISSING_TRANSCRIPT_INPUT",
      });
    }

    if (isSimpleGreeting(rawTranscript)) {
      const languageHint = req.body?.languageHint || detectLanguage(rawTranscript);
      const responseMessage = buildSimpleGreetingReply(languageHint);
      const audioUrl = await generateSpeech(responseMessage, languageHint);

      return sendSuccess(
        res,
        {
          status: "agent_reply",
          rawTranscript,
          normalizedTranscript: rawTranscript,
          transactions: [],
          overallConfidence: 1,
          responseMessage,
          audioUrl,
          stt: sttResult || null,
          parser: {
            modelUsed: "greeting",
          },
          assistantReply: {
            modelUsed: "greeting",
            languageStyle: languageHint,
          },
          savedToHistory: false,
        },
        "Simple greeting handled"
      );
    }

    if (shouldTreatAsNonTransactionQuery(rawTranscript)) {
      const assistantReply = await resolveNonTransactionVoiceReply({
        userId,
        transcript: rawTranscript,
        languageHint: req.body?.languageHint || null,
      });

      if (assistantReply) {
        return sendSuccess(
          res,
          {
            status: "agent_reply",
            rawTranscript,
            normalizedTranscript: rawTranscript,
            transactions: [],
            overallConfidence: 1,
            responseMessage: assistantReply.replyText,
            audioUrl: assistantReply.audioUrl,
            stt: sttResult || null,
            parser: {
              modelUsed: "assistant-query",
            },
            assistantReply: {
              modelUsed: "assistant-query",
              languageStyle: req.body?.languageHint || detectLanguage(rawTranscript),
            },
            queryMeta: assistantReply.queryMeta,
            savedToHistory: false,
          },
          "Voice query answered without transaction save"
        );
      }
    }

    const parsed = await parseMultipleTransactions({
      transcript: rawTranscript,
      rawTranscript,
    });

    const confidence = evaluateExtractionConfidence(parsed.transactions);

    const effectiveOverallConfidence = Number(
      Math.min(
        confidence.overallConfidence,
        typeof parsed.parserConfidence === "number" ? parsed.parserConfidence : confidence.overallConfidence
      ).toFixed(4)
    );

    const requiresClarification =
      confidence.requiresConfirmation ||
      Boolean(parsed.needsClarification) ||
      effectiveOverallConfidence < 0.7;

    if (!confidence.transactions.length) {
      return sendError(res, "No transactions detected from narration", 422, {
        code: "NO_TRANSACTIONS_DETECTED",
      });
    }

    if (requiresClarification && !forceSave) {
      const reply = await generateVoiceReply({
        rawTranscript,
        transactions: confidence.transactions,
        requiresConfirmation: true,
        clarificationQuestion: parsed.clarificationQuestion || null,
      });

      const confirmationMessage = reply.text;
      const confirmationAudioUrl = await generateSpeech(
        confirmationMessage,
        req.body?.languageHint || reply.ttsLanguage
      );

      return sendSuccess(
        res,
        {
          status: "needs_confirmation",
          rawTranscript,
          normalizedTranscript: rawTranscript,
          transactions: confidence.transactions,
          overallConfidence: effectiveOverallConfidence,
          confirmationMessage,
          audioUrl: confirmationAudioUrl,
          actionButtons: ["Confirm All", "Edit", "Cancel"],
          stt: sttResult || null,
          parser: {
            modelUsed: parsed.modelUsed,
          },
          assistantReply: {
            modelUsed: reply.modelUsed,
            languageStyle: reply.style,
          },
          confidenceMeta: {
            lowConfidenceCount: confidence.lowConfidenceCount,
          },
        },
        "Low confidence extraction, confirmation required"
      );
    }

    const saved = await saveLedgerEntry({
      userId,
      businessId,
      rawTranscript,
      normalizedText: rawTranscript,
      modelUsed: parsed.modelUsed,
      overallConfidence: effectiveOverallConfidence,
      transactions: confidence.transactions,
    });

    const reply = await generateVoiceReply({
      rawTranscript,
      transactions: confidence.transactions,
      requiresConfirmation: false,
      clarificationQuestion: null,
    });

    const responseMessage = reply.text || buildRecordedResponse(confidence.transactions);
    const responseAudioUrl = await generateSpeech(
      responseMessage,
      req.body?.languageHint || reply.ttsLanguage
    );

    return sendSuccess(
      res,
      {
        status: "recorded",
        recordId: String(saved?._id || ""),
        rawTranscript,
        normalizedTranscript: rawTranscript,
        transactions: confidence.transactions,
        overallConfidence: effectiveOverallConfidence,
        responseMessage,
        audioUrl: responseAudioUrl,
        stt: sttResult || null,
        parser: {
          modelUsed: parsed.modelUsed,
        },
        assistantReply: {
          modelUsed: reply.modelUsed,
          languageStyle: reply.style,
        },
      },
      "Voice narration processed and saved"
    );
  } catch (error) {
    next(error);
  }
});

router.post("/undo-last", async (req, res, next) => {
  try {
    const authUserId = req.user?.userId || null;
    const requestedUserId = authUserId || req.body?.userId || null;
    const resolvedIds = await resolveUserAndBusinessIds(requestedUserId, req.body?.businessId);
    const userId = resolvedIds.userId;
    const businessId = resolvedIds.businessId;

    const filter = {};
    if (userId) {
      filter.userId = userId;
    } else if (businessId) {
      filter.businessId = businessId;
    } else {
      return sendError(res, "User scope is required to undo ledger history", 400, {
        code: "VOICE_USER_SCOPE_REQUIRED",
      });
    }

    const deleted = await Transaction.findOneAndDelete(filter, {
      sort: { createdAt: -1 },
    }).lean();

    if (!deleted) {
      return sendError(res, "No transaction found to undo", 404, {
        code: "UNDO_NOT_FOUND",
      });
    }

    return sendSuccess(
      res,
      {
        undoneId: String(deleted._id),
        rawText: deleted.rawText,
      },
      "Last transaction undone"
    );
  } catch (error) {
    next(error);
  }
});

module.exports = router;
