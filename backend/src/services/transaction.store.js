const mongoose = require("mongoose");
const Transaction = require("../models/transaction.model");
const RawLog = require("../models/rawLog.model");
const { generateEmbedding } = require("./embeddingService");

const transactions = [];
const rawLogs = [];

function isMongoReady() {
  return mongoose.connection.readyState === 1;
}

function formatDateForSummary(value) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

function buildTransactionSummary(entry) {
  const summaryParts = [];
  const dateLabel = formatDateForSummary(entry?.createdAt);

  for (const sale of entry?.sales || []) {
    const quantity = Number(sale?.qty) || 0;
    const item = String(sale?.item || "").trim();
    const amount = quantity * (Number(sale?.price) || 0);

    if (item && quantity > 0) {
      summaryParts.push(`Sold ${quantity} ${item} for Rs ${amount} on ${dateLabel}`);
    }
  }

  for (const expense of entry?.expenses || []) {
    const item = String(expense?.item || "").trim();
    const amount = Number(expense?.amount) || 0;

    if (item && amount > 0) {
      summaryParts.push(`Spent Rs ${amount} on ${item} on ${dateLabel}`);
    }
  }

  if (!summaryParts.length) {
    const fallbackText = String(entry?.normalizedText || entry?.rawText || "").trim();
    return fallbackText || `Transaction recorded on ${dateLabel}`;
  }

  return summaryParts.join(". ");
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeLocation(location) {
  const lat = Number(location?.lat);
  const lng = Number(location?.lng);

  if (isFiniteNumber(lat) && isFiniteNumber(lng)) {
    return { lat, lng };
  }

  // Safe default so ledger saves do not fail when GPS is unavailable.
  return {
    lat: Number(process.env.DEFAULT_LOCATION_LAT || 20.5937),
    lng: Number(process.env.DEFAULT_LOCATION_LNG || 78.9629),
  };
}

async function enrichTransactionEntry(entry) {
  const summary = buildTransactionSummary(entry);
  const embedding = await generateEmbedding(summary);

  return {
    ...entry,
    location: normalizeLocation(entry?.location),
    summary,
    ...(Array.isArray(embedding) && embedding.length === 384 ? { embedding } : {}),
  };
}

async function saveProcessedTransaction(entry) {
  const enrichedEntry = await enrichTransactionEntry(entry);

  if (isMongoReady()) {
    return Transaction.create(enrichedEntry);
  }

  transactions.push({
    id: transactions.length + 1,
    createdAt: new Date().toISOString(),
    ...enrichedEntry,
  });

  return transactions[transactions.length - 1];
}

async function saveRawLog(entry) {
  if (isMongoReady()) {
    return RawLog.create(entry);
  }

  rawLogs.push({
    id: rawLogs.length + 1,
    createdAt: new Date().toISOString(),
    ...entry,
  });

  return rawLogs[rawLogs.length - 1];
}

async function listTransactions() {
  if (isMongoReady()) {
    return Transaction.find().sort({ createdAt: -1 }).lean();
  }

  return [...transactions];
}

async function deleteTransactionById(transactionId) {
  const normalizedId = String(transactionId || "").trim();

  if (!normalizedId) {
    return null;
  }

  if (isMongoReady()) {
    if (!mongoose.Types.ObjectId.isValid(normalizedId)) {
      return null;
    }

    return Transaction.findByIdAndDelete(normalizedId).lean();
  }

  const index = transactions.findIndex((entry) =>
    String(entry._id || entry.id || "") === normalizedId
  );

  if (index < 0) {
    return null;
  }

  const [deleted] = transactions.splice(index, 1);
  return deleted || null;
}

async function listRawLogs() {
  if (isMongoReady()) {
    return RawLog.find().sort({ createdAt: -1 }).lean();
  }

  return [...rawLogs];
}

module.exports = {
  saveProcessedTransaction,
  saveRawLog,
  listTransactions,
  deleteTransactionById,
  listRawLogs,
  buildTransactionSummary,
};
