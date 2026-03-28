const mongoose = require("mongoose");
const Transaction = require("../../src/models/transaction.model");
const {
    buildTransactionSummary,
    buildPendingPreview,
    getConfirmKeyboard,
    buildTodaySummary,
} = require("../services/telegramReply");

const START_MESSAGE = [
    "👋 Welcome to VoiceTrace",
    "Send a voice or text transaction like:",
    "'Bought milk for 40 rupees'",
].join("\n");

const PROCESSING_MESSAGE = "⏳ Processing...";
const PARSE_ERROR_MESSAGE = "❌ Couldn\'t understand. Try again.";
const EDIT_PROMPT = "✍️ Send the corrected transaction text now.";
const CANCELLED_MESSAGE = "❎ Transaction discarded.";

function normalizeObjectId(value) {
    const text = String(value || "").trim();
    if (!text) {
        return null;
    }

    if (!mongoose.Types.ObjectId.isValid(text)) {
        return null;
    }

    return new mongoose.Types.ObjectId(text);
}

function getScopeFilter(userId, businessId) {
    const normalizedUserId = normalizeObjectId(userId);
    const normalizedBusinessId = normalizeObjectId(businessId);

    if (normalizedUserId) {
        return { userId: normalizedUserId };
    }

    if (normalizedBusinessId) {
        return { businessId: normalizedBusinessId };
    }

    return {};
}

function mapRecordToSummaryItems(entries) {
    const flattened = [];

    for (const entry of entries) {
        const createdAt = entry.createdAt;

        for (const sale of entry.sales || []) {
            flattened.push({
                item: sale.item,
                total: Number(sale.qty || 0) * Number(sale.price || 0),
                type: "credit",
                createdAt,
            });
        }

        for (const expense of entry.expenses || []) {
            flattened.push({
                item: expense.item,
                total: Number(expense.amount || 0),
                type: "debit",
                createdAt,
            });
        }
    }

    return flattened.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

async function fetchTodayTransactions({ userId, businessId }) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const scopeFilter = getScopeFilter(userId, businessId);

    const entries = await Transaction.find({
        ...scopeFilter,
        createdAt: { $gte: start, $lte: end },
    })
        .sort({ createdAt: -1 })
        .limit(25)
        .lean();

    return mapRecordToSummaryItems(entries);
}

function buildTransactionPayload(parsedTransaction) {
    const type = parsedTransaction.type === "credit" ? "credit" : "debit";
    const item = String(parsedTransaction.item || "").trim();
    const quantity = Math.max(1, Number(parsedTransaction.quantity || 1));
    const price = Math.max(0.01, Number(parsedTransaction.price || 0.01));
    const total = Math.max(0.01, Number(parsedTransaction.total || quantity * price));

    if (type === "credit") {
        return {
            sales: [{ item, qty: quantity, price }],
            expenses: [],
            normalizedTransaction: {
                item,
                quantity,
                price,
                total: quantity * price,
                type,
            },
        };
    }

    return {
        sales: [],
        expenses: [{ item, amount: total }],
        normalizedTransaction: {
            item,
            quantity,
            price,
            total,
            type,
        },
    };
}

async function savePendingTransaction({
    pendingData,
    saveRawLog,
    saveProcessedTransaction,
    defaultUserId,
    defaultBusinessId,
}) {
    const payload = buildTransactionPayload(pendingData.transaction);

    const rawLog = await saveRawLog({
        ...(defaultUserId ? { userId: defaultUserId } : {}),
        ...(defaultBusinessId ? { businessId: defaultBusinessId } : {}),
        text: pendingData.rawText,
        normalizedText: pendingData.rawText,
        source: pendingData.source === "voice" ? "stt" : "api",
        status: "processed",
        parseMeta: {
            confidence: 0.9,
            parserSource:
                pendingData.transaction.modelUsed === "fallback" ? "fallback" : "llm",
            needsClarification: false,
            clarificationQuestion: null,
        },
    });

    const record = await saveProcessedTransaction({
        ...(defaultUserId ? { userId: defaultUserId } : {}),
        ...(defaultBusinessId ? { businessId: defaultBusinessId } : {}),
        rawText: pendingData.rawText,
        normalizedText: pendingData.rawText,
        rawLogId: rawLog?._id || null,
        sales: payload.sales,
        expenses: payload.expenses,
        meta: {
            confidence: 0.9,
            source: pendingData.transaction.modelUsed === "fallback" ? "fallback" : "llm",
            needsClarification: false,
            clarificationQuestion: null,
        },
    });

    return {
        record,
        normalizedTransaction: payload.normalizedTransaction,
    };
}

async function parseAndPreparePending({
    bot,
    chatId,
    text,
    parseTransactionFromText,
    pendingTransactions,
    editModeChats,
    source,
    showProcessing = true,
}) {
    if (showProcessing) {
        await bot.sendMessage(chatId, PROCESSING_MESSAGE);
    }

    const parsed = await parseTransactionFromText(text);

    pendingTransactions.set(chatId, {
        transaction: parsed,
        rawText: text,
        source,
    });

    editModeChats.delete(chatId);

    await bot.sendMessage(chatId, buildPendingPreview(parsed, text), {
        reply_markup: getConfirmKeyboard(),
    });
}

async function handleStartCommand({ bot, msg }) {
    const chatId = msg?.chat?.id;
    if (!chatId) {
        return;
    }

    await bot.sendMessage(chatId, START_MESSAGE);
}

async function handleTodayCommand({ bot, msg, defaultUserId, defaultBusinessId }) {
    const chatId = msg?.chat?.id;
    if (!chatId) {
        return;
    }

    try {
        const items = await fetchTodayTransactions({
            userId: defaultUserId,
            businessId: defaultBusinessId,
        });
        await bot.sendMessage(chatId, buildTodaySummary(items));
    } catch (_) {
        await bot.sendMessage(chatId, "❌ Could not fetch today\'s transactions.");
    }
}

async function handleTextMessage({
    bot,
    msg,
    parseTransactionFromText,
    pendingTransactions,
    editModeChats,
}) {
    const chatId = msg?.chat?.id;
    const text = String(msg?.text || "").trim();

    if (!chatId || !text) {
        return;
    }

    if (text.startsWith("/")) {
        return;
    }

    try {
        await parseAndPreparePending({
            bot,
            chatId,
            text,
            parseTransactionFromText,
            pendingTransactions,
            editModeChats,
            source: "text",
        });
    } catch (_) {
        await bot.sendMessage(chatId, PARSE_ERROR_MESSAGE);
    }
}

async function handleCallbackQuery({
    bot,
    callbackQuery,
    pendingTransactions,
    editModeChats,
    saveRawLog,
    saveProcessedTransaction,
    defaultUserId,
    defaultBusinessId,
}) {
    const chatId = callbackQuery?.message?.chat?.id;
    const callbackId = callbackQuery?.id;
    const data = callbackQuery?.data;

    if (!chatId || !data) {
        return;
    }

    if (callbackId) {
        await bot.answerCallbackQuery(callbackId);
    }

    if (data === "tx_cancel") {
        pendingTransactions.delete(chatId);
        editModeChats.delete(chatId);
        await bot.sendMessage(chatId, CANCELLED_MESSAGE);
        return;
    }

    if (data === "tx_edit") {
        if (!pendingTransactions.has(chatId)) {
            await bot.sendMessage(chatId, "ℹ️ No pending transaction to edit.");
            return;
        }

        editModeChats.add(chatId);
        await bot.sendMessage(chatId, EDIT_PROMPT);
        return;
    }

    if (data === "tx_confirm") {
        const pendingData = pendingTransactions.get(chatId);
        if (!pendingData) {
            await bot.sendMessage(chatId, "ℹ️ No pending transaction to confirm.");
            return;
        }

        try {
            const { normalizedTransaction } = await savePendingTransaction({
                pendingData,
                saveRawLog,
                saveProcessedTransaction,
                defaultUserId,
                defaultBusinessId,
            });

            pendingTransactions.delete(chatId);
            editModeChats.delete(chatId);

            await bot.sendMessage(chatId, buildTransactionSummary(normalizedTransaction));
        } catch (_) {
            await bot.sendMessage(chatId, "❌ Failed to store transaction.");
        }
    }
}

module.exports = {
    handleStartCommand,
    handleTodayCommand,
    handleTextMessage,
    handleCallbackQuery,
    parseAndPreparePending,
};
