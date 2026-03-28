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
