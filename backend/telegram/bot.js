const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const TelegramBot = require("node-telegram-bot-api");
const logger = require("../src/utils/logger");
const {
    saveProcessedTransaction,
    saveRawLog,
} = require("../src/services/transaction.store");
const { parseTransactionFromText } = require("./services/llmParser");
const { speechToTextFromTelegramVoice } = require("./services/speechToText");
const {
    handleStartCommand,
    handleTodayCommand,
    handleTextMessage,
    handleCallbackQuery,
} = require("./handlers/messageHandler");
const { handleVoiceMessage } = require("./handlers/voiceHandler");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN || "";
const DEFAULT_USER_ID = process.env.TELEGRAM_DEFAULT_USER_ID || "";
const DEFAULT_BUSINESS_ID = process.env.TELEGRAM_DEFAULT_BUSINESS_ID || "";
const TELEGRAM_ENABLED = String(process.env.TELEGRAM_ENABLED || "true").toLowerCase() !== "false";

const pendingTransactions = new Map();
const editModeChats = new Set();

let botInstance = null;
let pollingConflictHandled = false;
let lastPollingErrorSignature = "";
let lastPollingErrorAt = 0;

function isPollingConflictError(error) {
    const message = String(error?.message || "");
    return message.includes("409 Conflict") || message.includes("terminated by other getUpdates request");
}

function toObjectIdOrNull(value) {
    const text = String(value || "").trim();
    if (!text || !mongoose.Types.ObjectId.isValid(text)) {
        return null;
    }
    return new mongoose.Types.ObjectId(text);
}

function registerHandlers(bot) {
    bot.onText(/^\/start$/, async (msg) => {
        await handleStartCommand({ bot, msg });
    });

    bot.onText(/^\/today$/, async (msg) => {
        await handleTodayCommand({
            bot,
            msg,
            defaultUserId: toObjectIdOrNull(DEFAULT_USER_ID),
            defaultBusinessId: toObjectIdOrNull(DEFAULT_BUSINESS_ID),
        });
    });

    bot.on("message", async (msg) => {
        const chatId = msg?.chat?.id;
        const text = String(msg?.text || "").trim();

        if (!chatId || !text) {
            return;
        }

        if (editModeChats.has(chatId) && !text.startsWith("/")) {
            try {
                await handleTextMessage({
                    bot,
                    msg,
                    parseTransactionFromText,
                    pendingTransactions,
                    editModeChats,
                });
            } catch (error) {
                logger.error("telegram_edit_message_failed", error);
            }
            return;
        }

        if (text.startsWith("/")) {
            return;
        }

        try {
            await handleTextMessage({
                bot,
                msg,
                parseTransactionFromText,
                pendingTransactions,
                editModeChats,
            });
        } catch (error) {
            logger.error("telegram_text_message_failed", error);
            await bot.sendMessage(chatId, "❌ Couldn\'t understand. Try again.");
        }
    });

    bot.on("voice", async (msg) => {
        const chatId = msg?.chat?.id;

        try {
            await handleVoiceMessage({
                bot,
                msg,
                botToken: TELEGRAM_BOT_TOKEN,
                speechToTextFromTelegramVoice,
                parseTransactionFromText,
                pendingTransactions,
                editModeChats,
            });
        } catch (error) {
            logger.error("telegram_voice_message_failed", error);
            if (chatId) {
                await bot.sendMessage(chatId, "❌ Couldn\'t understand. Try again.");
            }
        }
    });

    bot.on("callback_query", async (callbackQuery) => {
        const chatId = callbackQuery?.message?.chat?.id;

        try {
            await handleCallbackQuery({
                bot,
                callbackQuery,
                pendingTransactions,
                editModeChats,
                saveRawLog,
                saveProcessedTransaction,
                defaultUserId: toObjectIdOrNull(DEFAULT_USER_ID),
                defaultBusinessId: toObjectIdOrNull(DEFAULT_BUSINESS_ID),
            });
        } catch (error) {
            logger.error("telegram_callback_failed", error);
            if (chatId) {
                await bot.sendMessage(chatId, "❌ Couldn\'t understand. Try again.");
            }
        }
    });

    bot.on("polling_error", async (error) => {
        const signature = String(error?.message || "unknown_polling_error");
        const now = Date.now();

        if (isPollingConflictError(error)) {
            if (pollingConflictHandled) {
                return;
            }

            pollingConflictHandled = true;
            logger.warn("telegram_polling_conflict_detected", {
                message:
                    "Another process is already polling this bot token. Stopping polling in this instance to avoid repeated 409 errors.",
            });

            try {
                await bot.stopPolling();
                logger.info("telegram_polling_stopped_after_conflict");
            } catch (stopError) {
                logger.error("telegram_stop_after_conflict_failed", stopError);
            }
            return;
        }

        if (signature === lastPollingErrorSignature && now - lastPollingErrorAt < 15000) {
            return;
        }

        lastPollingErrorSignature = signature;
        lastPollingErrorAt = now;

        logger.error("telegram_polling_error", error);
    });

    bot.on("error", (error) => {
        logger.error("telegram_bot_error", error);
    });
}

function initTelegramBot() {
    if (botInstance) {
        return botInstance;
    }

    if (!TELEGRAM_ENABLED) {
        logger.info("Telegram bot disabled via TELEGRAM_ENABLED=false");
        return null;
    }

    if (!TELEGRAM_BOT_TOKEN) {
        logger.warn("TELEGRAM_BOT_TOKEN is not configured. Telegram bot will not start.");
        return null;
    }

    botInstance = new TelegramBot(TELEGRAM_BOT_TOKEN, {
        polling: true,
    });

    registerHandlers(botInstance);

    logger.info("Telegram bot started in polling mode", {
        hasDefaultUserId: Boolean(DEFAULT_USER_ID),
        hasDefaultBusinessId: Boolean(DEFAULT_BUSINESS_ID),
    });

    return botInstance;
}

async function stopTelegramBot() {
    if (!botInstance) {
        return;
    }

    try {
        await botInstance.stopPolling();
        logger.info("Telegram bot stopped");
    } catch (error) {
        logger.error("telegram_stop_failed", error);
    } finally {
        botInstance = null;
        pollingConflictHandled = false;
        lastPollingErrorSignature = "";
        lastPollingErrorAt = 0;
        pendingTransactions.clear();
        editModeChats.clear();
    }
}

if (require.main === module) {
    initTelegramBot();
}

module.exports = {
    initTelegramBot,
    stopTelegramBot,
};
