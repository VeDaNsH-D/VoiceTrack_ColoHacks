const mongoose = require("mongoose");
const User = require("../models/user.model");
const { extractWithLLM } = require("../services/llm-extraction.service");
const {
  saveProcessedTransaction,
  saveRawLog,
  listTransactions,
  deleteTransactionById,
} = require("../services/transaction.store");
const { sendSuccess, sendError } = require("../utils/apiResponse");

function normalizeObjectId(value) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const trimmed = value.trim();

  if (mongoose.Types.ObjectId.isValid(trimmed)) {
    return new mongoose.Types.ObjectId(trimmed);
  }

  return null;
}

async function resolveUserAndBusinessIds(userId, businessId) {
  const normalizedUserId = normalizeObjectId(userId);
  const normalizedBusinessId = normalizeObjectId(businessId);

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

async function resolveBusinessScope(userId) {
  const normalizedUserId = typeof userId === "string" ? userId.trim() : "";

  if (!mongoose.Types.ObjectId.isValid(normalizedUserId)) {
    return {
      filterByUser: false,
      userId: normalizedUserId,
      businessId: "",
    };
  }

  const user = await User.findById(normalizedUserId).select("businessId").lean();
  return {
    filterByUser: !user?.businessId,
    userId: normalizedUserId,
    businessId: user?.businessId ? String(user.businessId) : "",
  };
}

function normalizeParserSource(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "rules" || normalized === "fallback") {
    return normalized;
  }
  return "llm";
}

function buildEntryScopeMatcher(scopedUserId, scopedBusinessId) {
  return (entry) => {
    const entryBusinessId = entry.businessId
      ? String(entry.businessId._id || entry.businessId)
      : "";
    const entryUserId = entry.userId
      ? String(entry.userId._id || entry.userId)
      : "";

    if (scopedBusinessId && scopedUserId) {
      // Include business-wide entries and legacy user-only entries.
      return entryBusinessId === scopedBusinessId || entryUserId === scopedUserId;
    }

    if (scopedBusinessId) {
      return entryBusinessId === scopedBusinessId;
    }

    if (scopedUserId) {
      return entryUserId === scopedUserId;
    }

    return true;
  };
}

/**
 * Convert LLM extraction output to transaction format
 */
function convertLLMToTransactionFormat(llmResult) {
  const sales = [];
  const expenses = [];

  const toFiniteNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };

  for (const transaction of llmResult.transactions || []) {
    const quantity = toFiniteNumber(transaction.quantity);
    const pricePerUnit = toFiniteNumber(transaction.price_per_unit);
    const total = toFiniteNumber(transaction.total);
    const computedTotal = total > 0
      ? total
      : (quantity > 0 && pricePerUnit > 0 ? quantity * pricePerUnit : 0);

    if (transaction.type === "sale") {
      sales.push({
        item: transaction.item,
        qty: quantity > 0 ? quantity : null,
        price: pricePerUnit > 0 ? pricePerUnit : null,
        total: computedTotal > 0 ? computedTotal : null
      });
    } else if (transaction.type === "expense") {
      expenses.push({
        item: transaction.item,
        amount: computedTotal > 0 ? computedTotal : null,
        qty: quantity > 0 ? quantity : null,
        price: pricePerUnit > 0 ? pricePerUnit : null
      });
    }
  }

  return { sales, expenses };
}

async function processText(req, res, next) {
  try {
    const { text, userId, businessId, save = true } = req.body || {};

    if (typeof text !== "string" || !text.trim()) {
      return sendError(res, "text is required", 400, { code: "INVALID_TEXT" });
    }

    // Use LLM-first extraction
    let llmResult;
    try {
      llmResult = await extractWithLLM(text);
    } catch (error) {
      console.error("[PROCESSTEXT] LLM extraction failed:", error.message);
      return sendError(res, `Extraction failed: ${error.message}`, 500, {
        code: "EXTRACTION_FAILED",
        details: error.message
      });
    }

    // Convert LLM output to transaction format
    const { sales, expenses } = convertLLMToTransactionFormat(llmResult);

    // Prepare response
    const result = {
      transactions: llmResult.transactions,
      sales,
      expenses,
      meta: {
        source: llmResult.model || "llm",
        confidence: llmResult.confidence,
        needs_clarification: llmResult.needs_clarification,
        clarification_question: llmResult.clarification_question,
        language: llmResult.language
      }
    };

    // Save to database if requested
    if (save !== false) {
      const rawLogPayload = {
        text,
        normalizedText: text, // LLM-first doesn't need normalization
        source: "api",
        status: llmResult.needs_clarification ? "clarification_needed" : "processed",
        parseMeta: {
          confidence: llmResult.confidence,
          parserSource: normalizeParserSource(llmResult.model),
          needsClarification: llmResult.needs_clarification,
          clarificationQuestion: llmResult.clarification_question,
          language: llmResult.language
        }
      };

      const rawLog = await saveRawLog(rawLogPayload);
      const resolvedIds = await resolveUserAndBusinessIds(userId, businessId);

      await saveProcessedTransaction({
        ...(resolvedIds.userId ? { userId: resolvedIds.userId } : {}),
        ...(resolvedIds.businessId ? { businessId: resolvedIds.businessId } : {}),
        rawText: text,
        normalizedText: text,
        rawLogId: rawLog?._id || null,
        sales,
        expenses,
        meta: {
          confidence: llmResult.confidence,
          source: normalizeParserSource(llmResult.model),
          needsClarification: llmResult.needs_clarification,
          clarificationQuestion: llmResult.clarification_question,
          language: llmResult.language
        }
      });
    }

    return sendSuccess(res, result, "Transaction extracted successfully");
  } catch (error) {
    next(error);
  }
}

async function listHistory(req, res, next) {
  try {
    const { userId, businessId, startDate, endDate } = req.query || {};
    const parsedLimit = Number(req.query?.limit || 50);
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 1000)
      : 50;

    const allTransactions = await listTransactions();
    const resolved = await resolveUserAndBusinessIds(
      typeof userId === "string" ? userId : "",
      typeof businessId === "string" ? businessId : ""
    );
    const scopedUserId = resolved?.userId ? String(resolved.userId) : "";
    const scopedBusinessId = resolved?.businessId ? String(resolved.businessId) : "";
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    const matchesDateRange = (entry) => {
      const createdAt = new Date(entry.createdAt || entry.updatedAt || Date.now());

      if (start && !Number.isNaN(start.getTime()) && createdAt < start) {
        return false;
      }

      if (end && !Number.isNaN(end.getTime()) && createdAt > end) {
        return false;
      }

      return true;
    };

    const toHistoryEntry = (entry) => ({
      id: String(entry._id || entry.id || ""),
      createdAt: entry.createdAt,
      rawText: entry.rawText,
      normalizedText: entry.normalizedText,
      sales: entry.sales || [],
      expenses: entry.expenses || [],
      totals: entry.totals || {
        salesAmount: (entry.sales || []).reduce(
          (sum, sale) => sum + Number(sale.qty || 0) * Number(sale.price || 0),
          0
        ),
        expenseAmount: (entry.expenses || []).reduce(
          (sum, expense) => sum + Number(expense.amount || 0),
          0
        ),
        netAmount: 0,
      },
      meta: entry.meta || null,
    });

    const sortByRecent = (left, right) =>
      new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();

    const entryMatchesScope = buildEntryScopeMatcher(scopedUserId, scopedBusinessId);

    const scopedEntries = allTransactions.filter(
      (entry) => entryMatchesScope(entry) && matchesDateRange(entry)
    );

    const filtered = scopedEntries
      .sort(sortByRecent)
      .slice(0, limit)
      .map(toHistoryEntry)
      .map((entry) => ({
        ...entry,
        totals: {
          ...entry.totals,
          netAmount:
            Number(entry.totals.salesAmount || 0) -
            Number(entry.totals.expenseAmount || 0),
        },
      }));

    return sendSuccess(res, {
      count: filtered.length,
      transactions: filtered,
    }, "Transaction history fetched");
  } catch (error) {
    next(error);
  }
}

async function deleteHistoryEntry(req, res, next) {
  try {
    const transactionId = String(req.params?.transactionId || "").trim();
    const { userId, businessId } = req.query || {};

    if (!transactionId) {
      return sendError(res, "transactionId is required", 400, {
        code: "INVALID_TRANSACTION_ID",
      });
    }

    const resolved = await resolveUserAndBusinessIds(
      typeof userId === "string" ? userId : "",
      typeof businessId === "string" ? businessId : ""
    );
    const scopedUserId = resolved?.userId ? String(resolved.userId) : "";
    const scopedBusinessId = resolved?.businessId ? String(resolved.businessId) : "";
    const entryMatchesScope = buildEntryScopeMatcher(scopedUserId, scopedBusinessId);

    const allTransactions = await listTransactions();
    const targetEntry = allTransactions.find((entry) => {
      const entryId = String(entry._id || entry.id || "");
      return entryId === transactionId && entryMatchesScope(entry);
    });

    if (!targetEntry) {
      return sendError(res, "Transaction not found", 404, {
        code: "TRANSACTION_NOT_FOUND",
      });
    }

    const deleted = await deleteTransactionById(transactionId);
    if (!deleted) {
      return sendError(res, "Unable to delete transaction", 500, {
        code: "TRANSACTION_DELETE_FAILED",
      });
    }

    return sendSuccess(res, { id: transactionId }, "Transaction deleted");
  } catch (error) {
    next(error);
  }
}

async function saveTransaction(req, res, next) {
  try {
    const { userId, businessId, rawText, normalizedText, sales, expenses, meta } = req.body || {};

    const rawLogPayload = {
      text: rawText,
      normalizedText,
      source: "api",
      status: "processed",
      parseMeta: {
        confidence: meta?.confidence || 0.9,
        parserSource: normalizeParserSource(meta?.source),
        needsClarification: false,
        clarificationQuestion: null,
      },
    };

    const rawLog = await saveRawLog(rawLogPayload);
    const resolvedIds = await resolveUserAndBusinessIds(userId, businessId);

    const entry = await saveProcessedTransaction({
      ...(resolvedIds.userId ? { userId: resolvedIds.userId } : {}),
      ...(resolvedIds.businessId ? { businessId: resolvedIds.businessId } : {}),
      rawText,
      normalizedText,
      rawLogId: rawLog?._id || null,
      sales: sales || [],
      expenses: expenses || [],
      meta: {
        confidence: meta?.confidence || 0.9,
        source: normalizeParserSource(meta?.source),
        needsClarification: false,
        clarificationQuestion: null,
      },
    });

    return sendSuccess(res, entry, "Transaction saved", 201);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  processText,
  listHistory,
  saveTransaction,
  deleteHistoryEntry,
};
