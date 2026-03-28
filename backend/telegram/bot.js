const path = require("path");
const dotenv = require("dotenv");
const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");

const logger = require("../src/utils/logger");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const BACKEND_URL = (process.env.BACKEND_URL || "http://localhost:5001").replace(/\/$/, "");
const STT_URL = process.env.STT_URL || "http://localhost:8000/stt";
const FAILURE_MESSAGE = "Something went wrong";
const START_MESSAGE = "👋 VoiceTrack AI ready! Bol ya likh ke puch 😄";

let botInstance = null;

function logInfo(message, meta = {}) {
  logger.info(`Telegram bot: ${message}`, meta);
}

function logError(message, error, meta = {}) {
  logger.error(`Telegram bot: ${message}`, {
    ...meta,
    error: error?.message,
    status: error?.response?.status,
    data: error?.response?.data,
  });
}

function createHttpClient() {
  return axios.create({
    timeout: 30000,
  });
}

function getChatId(msg) {
  return msg?.chat?.id;
}

function getSender(msg) {
  return {
    id: msg?.from?.id,
    username: msg?.from?.username || null,
    firstName: msg?.from?.first_name || null,
  };
}

function getMessageMeta(msg, extra = {}) {
  return {
    chatId: getChatId(msg),
    messageId: msg?.message_id,
    sender: getSender(msg),
    ...extra,
  };
}

function getTelegramFileUrl(filePath) {
  return `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${filePath}`;
}

async function safelySendMessage(bot, chatId, text) {
  if (!chatId) {
    return;
  }

  try {
    await bot.sendMessage(chatId, text);
  } catch (error) {
    logError("failed to send message", error, { chatId, text });
  }
}

async function sendReply(bot, chatId, reply, audioUrl) {
  await bot.sendChatAction(chatId, "typing");
  await bot.sendMessage(chatId, reply);

  if (audioUrl) {
    await bot.sendChatAction(chatId, "record_voice");
    await bot.sendVoice(chatId, audioUrl);
  }
}

async function requestChatReply(http, chatId, message, source) {
  const payload = {
    userId: String(chatId),
    message,
    source,
  };

  const { data } = await http.post(`${BACKEND_URL}/chat`, payload);
  const reply = typeof data?.reply === "string" ? data.reply.trim() : "";
  const audioUrl =
    typeof data?.audioUrl === "string" && data.audioUrl.trim()
      ? data.audioUrl.trim()
      : null;

  if (!reply) {
    throw new Error("Chat backend returned an empty reply");
  }

  logInfo("chatbot reply", {
    chatId,
    source,
    reply,
    audioUrl,
  });

  return { reply, audioUrl };
}

async function transcribeVoice(http, fileUrl, meta = {}) {
  const { data } = await http.post(STT_URL, {
    audioUrl: fileUrl,
  });

  const text = typeof data?.text === "string" ? data.text.trim() : "";

  if (!text) {
    throw new Error("STT service returned empty text");
  }

  logInfo("stt output", {
    ...meta,
    text,
  });

  return text;
}

async function processIncomingMessage(bot, http, chatId, message, source, meta = {}) {
  const normalizedMessage = typeof message === "string" ? message.trim() : "";

  if (!chatId || !normalizedMessage) {
    return;
  }

  logInfo("processing message", {
    ...meta,
    chatId,
    source,
    message: normalizedMessage,
  });

  const { reply, audioUrl } = await requestChatReply(
    http,
    chatId,
    normalizedMessage,
    source
  );

  await sendReply(bot, chatId, reply, audioUrl);
}

async function handleTextMessage(bot, http, msg) {
  const chatId = getChatId(msg);
  const text = typeof msg?.text === "string" ? msg.text.trim() : "";

  if (!chatId || !text || text.startsWith("/")) {
    return;
  }

  try {
    logInfo("incoming text message", getMessageMeta(msg, { text }));
    await processIncomingMessage(bot, http, chatId, text, "telegram", getMessageMeta(msg));
  } catch (error) {
    logError("failed to handle text message", error, getMessageMeta(msg, { text }));
    await safelySendMessage(bot, chatId, FAILURE_MESSAGE);
  }
}

async function handleVoiceMessage(bot, http, msg) {
  const chatId = getChatId(msg);
  const fileId = msg?.voice?.file_id;

  if (!chatId || !fileId) {
    return;
  }

  try {
    logInfo("incoming voice message", getMessageMeta(msg, { fileId }));

    await bot.sendChatAction(chatId, "typing");

    const file = await bot.getFile(fileId);
    const filePath = file?.file_path;

    if (!filePath) {
      throw new Error("Telegram file path not found");
    }

    const fileUrl = getTelegramFileUrl(filePath);
    const text = await transcribeVoice(http, fileUrl, getMessageMeta(msg, { fileId }));

    await processIncomingMessage(bot, http, chatId, text, "telegram", getMessageMeta(msg, {
      fileId,
      transcribedText: text,
    }));
  } catch (error) {
    logError("failed to handle voice message", error, getMessageMeta(msg, { fileId }));
    await safelySendMessage(bot, chatId, FAILURE_MESSAGE);
  }
}

function registerHandlers(bot, http) {
  bot.onText(/\/start/, async (msg) => {
    const chatId = getChatId(msg);

    try {
      logInfo("incoming command", getMessageMeta(msg, { command: "/start" }));
      await safelySendMessage(bot, chatId, START_MESSAGE);
    } catch (error) {
      logError("failed to handle /start", error, getMessageMeta(msg));
    }
  });

  bot.on("message", async (msg) => {
    if (!msg?.text) {
      return;
    }

    await handleTextMessage(bot, http, msg);
  });

  bot.on("voice", async (msg) => {
    await handleVoiceMessage(bot, http, msg);
  });

  bot.on("polling_error", (error) => {
    logError("polling error", error);
  });

  bot.on("error", (error) => {
    logError("bot error", error);
  });
}

function initTelegramBot() {
  if (botInstance) {
    return botInstance;
  }

  if (!TELEGRAM_TOKEN) {
    logger.warn("Telegram bot skipped: TELEGRAM_TOKEN is not configured");
    return null;
  }

  const http = createHttpClient();
  const bot = new TelegramBot(TELEGRAM_TOKEN, {
    polling: true,
  });

  registerHandlers(bot, http);
  botInstance = bot;

  logInfo("started", {
    polling: true,
    backendUrl: BACKEND_URL,
    sttUrl: STT_URL,
  });

  return botInstance;
}

async function stopTelegramBot() {
  if (!botInstance) {
    return;
  }

  try {
    await botInstance.stopPolling();
    logInfo("stopped");
  } catch (error) {
    logError("failed to stop polling", error);
  } finally {
    botInstance = null;
  }
}

if (require.main === module) {
  initTelegramBot();
}

module.exports = {
  initTelegramBot,
  stopTelegramBot,
};
