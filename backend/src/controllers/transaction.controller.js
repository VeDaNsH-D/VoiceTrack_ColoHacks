const mongoose = require("mongoose");
const User = require("../models/user.model");
const { processTransactionText } = require("../services/extraction.service");
const {
  saveProcessedTransaction,
  saveRawLog,
  listTransactions,
} = require("../services/transaction.store");

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

async function processText(req, res, next) {
  try {
    const { text, userId, businessId, save = true } = req.body || {};

    if (typeof text !== "string" || !text.trim()) {
      return res.status(400).json({
        error: {
          message: "text is required",
          code: "INVALID_TEXT",
        },
      });
    }

    const { normalizedText, result } = await processTransactionText(text);

    const rawLogPayload = {
      text,
      normalizedText,
      source: "api",
      status: result.meta.needs_clarification ? "clarification" : "processed",
      parseMeta: {
        confidence: result.meta.confidence,
        parserSource: result.meta.source,
        needsClarification: result.meta.needs_clarification,
        clarificationQuestion: result.meta.clarification_question,
      },
    };

    if (save !== false) {
      const rawLog = await saveRawLog(rawLogPayload);
      const resolvedIds = await resolveUserAndBusinessIds(userId, businessId);

      await saveProcessedTransaction({
        ...(resolvedIds.userId ? { userId: resolvedIds.userId } : {}),
        ...(resolvedIds.businessId ? { businessId: resolvedIds.businessId } : {}),
        rawText: text,
        normalizedText,
        rawLogId: rawLog?._id || null,
        sales: result.sales,
        expenses: result.expenses,
        meta: {
          confidence: result.meta.confidence,
          source: result.meta.source,
          needsClarification: result.meta.needs_clarification,
          clarificationQuestion: result.meta.clarification_question,
        },
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function listHistory(req, res, next) {
  try {
    const { userId, startDate, endDate } = req.query || {};
    const parsedLimit = Number(req.query?.limit || 50);
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 200)
      : 50;

    const allTransactions = await listTransactions();
    const scope = await resolveBusinessScope(typeof userId === "string" ? userId : "");
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    const filtered = allTransactions
      .filter((entry) => {
        const entryUserId = entry.userId
          ? String(entry.userId._id || entry.userId)
          : "";
        const entryBusinessId = entry.businessId
          ? String(entry.businessId._id || entry.businessId)
          : "";

        if (scope.businessId) {
          if (entryBusinessId !== scope.businessId) {
            return false;
          }
        } else if (scope.filterByUser && scope.userId) {
          if (entryUserId !== scope.userId) {
            return false;
          }
        }

        const createdAt = new Date(entry.createdAt || entry.updatedAt || Date.now());

        if (start && !Number.isNaN(start.getTime()) && createdAt < start) {
          return false;
        }

        if (end && !Number.isNaN(end.getTime()) && createdAt > end) {
          return false;
        }

        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      )
      .slice(0, limit)
      .map((entry) => ({
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
      }))
      .map((entry) => ({
        ...entry,
        totals: {
          ...entry.totals,
          netAmount:
            Number(entry.totals.salesAmount || 0) -
            Number(entry.totals.expenseAmount || 0),
        },
      }));

    return res.status(200).json({
      count: filtered.length,
      transactions: filtered,
    });
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
      source: "client-save",
      status: "processed",
      parseMeta: {
        confidence: meta?.confidence || 0.9,
        parserSource: meta?.source || "llm",
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
        source: meta?.source || "llm",
        needsClarification: false,
        clarificationQuestion: null,
      },
    });

    return res.status(201).json(entry);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  processText,
  listHistory,
  saveTransaction,
};
