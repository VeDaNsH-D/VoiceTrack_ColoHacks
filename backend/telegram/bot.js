const path = require("path");
const dotenv = require("dotenv");
const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const BACKEND_URL = (process.env.BACKEND_URL || "http://localhost:5001").replace(/\/$/, "");
const STT_URL = (process.env.STT_URL || "http://localhost:8000/stt").replace(/\/$/, "");

const FAILURE_MESSAGE = "Something went wrong";
const SPEAK_PROMPT = "Voice note bhejo 🎙️";

const BUTTONS = {
  today: "📊 Today",
  yesterday: "📅 Yesterday",
  topProduct: "🔥 Top Product",
  trends: "📈 Trends",
  speak: "🎙️ Speak",
  menu: "🔙 Menu",
};

const QUERY_MAP = {
  [BUTTONS.today]: "aaj kitna becha",
  [BUTTONS.yesterday]: "kal kitna becha",
  [BUTTONS.topProduct]: "sabse zyada kya bika",
  [BUTTONS.trends]: "trend kya hai",
};

const CALLBACK_MAP = {
  ACTION_TODAY: QUERY_MAP[BUTTONS.today],
  ACTION_TRENDS: QUERY_MAP[BUTTONS.trends],
  ACTION_MENU: "MENU",
};

const http = axios.create({ timeout: 30000 });

let botInstance = null;

function createMainKeyboard() {
  return {
    keyboard: [
      [BUTTONS.today, BUTTONS.yesterday],
      [BUTTONS.topProduct, BUTTONS.trends],
      [BUTTONS.speak],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}

function createNextActionsInlineKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: BUTTONS.today, callback_data: "ACTION_TODAY" },
        { text: BUTTONS.trends, callback_data: "ACTION_TRENDS" },
      ],
      [{ text: BUTTONS.menu, callback_data: "ACTION_MENU" }],
    ],
  };
}

function getTelegramFileUrl(filePath) {
  return `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${filePath}`;
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function sendMainMenu(bot, chatId) {
  await bot.sendMessage(chatId, "Choose an option:", {
    reply_markup: createMainKeyboard(),
  });
}

async function sendReplyWithNextActions(bot, chatId, replyText, audioUrl) {
  await bot.sendMessage(chatId, replyText, {
    reply_markup: createNextActionsInlineKeyboard(),
  });

  if (audioUrl) {
    await bot.sendVoice(chatId, audioUrl);
  }
}

async function callChatBackend(chatId, message) {
  const payload = {
    userId: String(chatId),
    message,
    source: "telegram",
  };

  const { data } = await http.post(`${BACKEND_URL}/chat`, payload);

  console.log("backend response:", {
    chatId,
    request: payload,
    response: data,
  });

  return {
    reply: normalizeText(data?.reply),
    audioUrl: normalizeText(data?.audioUrl) || null,
  };
}

async function handleMappedQuery(bot, chatId, query) {
  await bot.sendChatAction(chatId, "typing");

  const { reply, audioUrl } = await callChatBackend(chatId, query);

  if (!reply) {
    throw new Error("Empty reply from backend");
  }

  await sendReplyWithNextActions(bot, chatId, reply, audioUrl);
}

async function transcribeVoice(fileUrl) {
  const { data } = await http.post(STT_URL, { audioUrl: fileUrl });
  const text = normalizeText(data?.text);

  if (!text) {
    throw new Error("Empty transcription from STT");
  }

  return text;
}

function mapIncomingTextToQuery(text) {
  if (QUERY_MAP[text]) {
    return QUERY_MAP[text];
  }

  return text;
}

async function handleStart(bot, msg) {
  const chatId = msg?.chat?.id;
  if (!chatId) {
    return;
  }

  try {
    await bot.sendMessage(chatId, "Welcome! Dashboard quick actions ready.");
    await sendMainMenu(bot, chatId);
  } catch (error) {
    console.error("start handler error:", error?.message || error);
    await bot.sendMessage(chatId, FAILURE_MESSAGE);
  }
}

async function handleMessage(bot, msg) {
  const chatId = msg?.chat?.id;
  const text = normalizeText(msg?.text);

  if (!chatId || !text) {
    return;
  }

  if (text.startsWith("/")) {
    return;
  }

  try {
    console.log("incoming message:", {
      chatId,
      text,
      messageId: msg?.message_id,
      from: msg?.from?.username || msg?.from?.id,
    });

    if (text === BUTTONS.speak) {
      await bot.sendMessage(chatId, SPEAK_PROMPT);
      return;
    }

    if (text === BUTTONS.menu) {
      await sendMainMenu(bot, chatId);
      return;
    }

    const query = mapIncomingTextToQuery(text);
    console.log("mapped query:", { chatId, input: text, query });

    await handleMappedQuery(bot, chatId, query);
  } catch (error) {
    console.error("message handler error:", error?.message || error);
    await bot.sendMessage(chatId, FAILURE_MESSAGE);
  }
}

async function handleCallbackQuery(bot, callbackQuery) {
  const chatId = callbackQuery?.message?.chat?.id;
  const callbackData = callbackQuery?.data;
  const callbackId = callbackQuery?.id;

  if (!chatId || !callbackData) {
    return;
  }

  try {
    if (callbackId) {
      await bot.answerCallbackQuery(callbackId);
    }

    if (callbackData === "ACTION_MENU") {
      await sendMainMenu(bot, chatId);
      return;
    }

    const query = CALLBACK_MAP[callbackData];

    if (!query || query === "MENU") {
      return;
    }

    console.log("mapped query:", {
      chatId,
      input: callbackData,
      query,
      source: "callback",
    });

    await handleMappedQuery(bot, chatId, query);
  } catch (error) {
    console.error("callback handler error:", error?.message || error);
    await bot.sendMessage(chatId, FAILURE_MESSAGE);
  }
}

async function handleVoice(bot, msg) {
  const chatId = msg?.chat?.id;
  const voiceFileId = msg?.voice?.file_id;

  if (!chatId || !voiceFileId) {
    return;
  }

  try {
    console.log("incoming message:", {
      chatId,
      type: "voice",
      fileId: voiceFileId,
      messageId: msg?.message_id,
    });

    await bot.sendChatAction(chatId, "typing");

    const fileMeta = await bot.getFile(voiceFileId);
    const filePath = fileMeta?.file_path;

    if (!filePath) {
      throw new Error("Unable to resolve Telegram file path");
    }

    const fileUrl = getTelegramFileUrl(filePath);
    const transcribedText = await transcribeVoice(fileUrl);

    console.log("mapped query:", {
      chatId,
      input: "voice",
      query: transcribedText,
      source: "stt",
    });

    await handleMappedQuery(bot, chatId, transcribedText);
  } catch (error) {
    console.error("voice handler error:", error?.message || error);
    await bot.sendMessage(chatId, FAILURE_MESSAGE);
  }
}

function registerHandlers(bot) {
  bot.onText(/\/start/, async (msg) => {
    await handleStart(bot, msg);
  });

  bot.on("message", async (msg) => {
    await handleMessage(bot, msg);
  });

  bot.on("callback_query", async (callbackQuery) => {
    await handleCallbackQuery(bot, callbackQuery);
  });

  bot.on("voice", async (msg) => {
    await handleVoice(bot, msg);
  });

  bot.on("polling_error", (error) => {
    console.error("polling error:", error?.message || error);
  });

  bot.on("error", (error) => {
    console.error("bot error:", error?.message || error);
  });
}

function initTelegramBot() {
  if (botInstance) {
    return botInstance;
  }

  if (!TELEGRAM_TOKEN) {
    console.error("TELEGRAM_TOKEN is not configured");
    return null;
  }

  botInstance = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
  registerHandlers(botInstance);

  console.log("Telegram bot started", {
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
    console.log("Telegram bot stopped");
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
