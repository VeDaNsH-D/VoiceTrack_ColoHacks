const path = require("path");
const dotenv = require("dotenv");
const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../backend/.env") });

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const BACKEND_URL = process.env.BACKEND_URL;
const STT_URL = process.env.STT_URL || BACKEND_URL;

if (!TELEGRAM_TOKEN) {
  throw new Error("Missing TELEGRAM_TOKEN in environment variables");
}

if (!BACKEND_URL) {
  throw new Error("Missing BACKEND_URL in environment variables");
}

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

const http = axios.create({
  timeout: 30000,
});

function buildUrl(baseUrl, endpoint) {
  return new URL(endpoint, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
}

function getChatId(msg) {
  return msg?.chat?.id;
}

function getUserId(chatId) {
  return String(chatId);
}

function logInfo(message, meta = {}) {
  console.log(`[TelegramBot] ${message}`, meta);
}

function logError(message, error, meta = {}) {
  console.error(`[TelegramBot] ${message}`, {
    ...meta,
    error: error?.message,
    status: error?.response?.status,
    data: error?.response?.data,
  });
}

async function sendFailureMessage(chatId) {
  if (!chatId) {
    return;
  }

  try {
    await bot.sendMessage(chatId, "Something went wrong");
  } catch (error) {
    logError("Failed to send error message", error, { chatId });
  }
}

async function requestChatReply(chatId, message, source) {
  const payload = {
    userId: getUserId(chatId),
    message,
    source,
  };

  const { data } = await http.post(buildUrl(BACKEND_URL, "/chat"), payload);
  const reply = typeof data?.reply === "string" ? data.reply.trim() : "";
  const audioUrl = typeof data?.audioUrl === "string" && data.audioUrl.trim()
    ? data.audioUrl.trim()
    : null;

  if (!reply) {
    throw new Error("Chat backend returned an empty reply");
  }

  logInfo("Chatbot reply", {
    chatId,
    source,
    reply,
    audioUrl,
  });

  return {
    reply,
    audioUrl,
  };
}

async function transcribeTelegramVoice(fileUrl) {
  const payload = {
    audioUrl: fileUrl,
  };

  const { data } = await http.post(buildUrl(STT_URL, "/stt"), payload);
  const text = typeof data?.text === "string" ? data.text.trim() : "";

  if (!text) {
    throw new Error("STT service returned empty text");
  }

  logInfo("STT output", { text });
  return text;
}

async function sendReply(chatId, reply, audioUrl) {
  await bot.sendChatAction(chatId, "typing");
  await bot.sendMessage(chatId, reply);

  if (audioUrl) {
    await bot.sendChatAction(chatId, "record_voice");
    await bot.sendVoice(chatId, audioUrl);
  }
}

async function handleTextMessage(msg) {
  const chatId = getChatId(msg);
  const text = typeof msg?.text === "string" ? msg.text.trim() : "";

  if (!chatId || !text || text.startsWith("/")) {
    return;
  }

  try {
    logInfo("Incoming text message", {
      chatId,
      text,
      from: msg?.from?.username || msg?.from?.first_name || "unknown",
    });

    const { reply, audioUrl } = await requestChatReply(chatId, text, "telegram");
    await sendReply(chatId, reply, audioUrl);
  } catch (error) {
    logError("Failed to handle text message", error, { chatId, text });
    await sendFailureMessage(chatId);
  }
}

async function handleVoiceMessage(msg) {
  const chatId = getChatId(msg);
  const fileId = msg?.voice?.file_id;

  if (!chatId || !fileId) {
    return;
  }

  try {
    logInfo("Incoming voice message", {
      chatId,
      fileId,
      from: msg?.from?.username || msg?.from?.first_name || "unknown",
    });

    await bot.sendChatAction(chatId, "typing");

    const file = await bot.getFile(fileId);
    const filePath = file?.file_path;

    if (!filePath) {
      throw new Error("Telegram did not return a file path for the voice message");
    }

    const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${filePath}`;
    const transcribedText = await transcribeTelegramVoice(fileUrl);
    const { reply, audioUrl } = await requestChatReply(chatId, transcribedText, "telegram");

    await sendReply(chatId, reply, audioUrl);
  } catch (error) {
    logError("Failed to handle voice message", error, { chatId, fileId });
    await sendFailureMessage(chatId);
  }
}

bot.onText(/\/start/, async (msg) => {
  try {
    await bot.sendMessage(msg.chat.id, "👋 VoiceTrack AI ready! Bol ya likh ke puch 😄");
  } catch (error) {
    logError("Failed to handle /start command", error, { chatId: msg?.chat?.id });
  }
});

bot.on("message", async (msg) => {
  if (!msg?.text) {
    return;
  }

  await handleTextMessage(msg);
});

bot.on("voice", async (msg) => {
  await handleVoiceMessage(msg);
});

bot.on("polling_error", (error) => {
  logError("Polling error", error);
});

bot.on("webhook_error", (error) => {
  logError("Webhook error", error);
});

logInfo("Bot started", {
  mode: "polling",
  backendUrl: BACKEND_URL,
  sttUrl: STT_URL,
});
