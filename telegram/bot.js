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
  timeout: 60000,
});

// User language preferences storage (in-memory, can be upgraded to DB)
const userLanguages = new Map();

// ────────────────────────────────────────────────────────
// Utility Functions
// ────────────────────────────────────────────────────────

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

function detectLanguage(text) {
  const input = String(text || "").trim();

  if (!input) {
    return "en";
  }

  // Check for Hindi script (Devanagari)
  if (/[\u0900-\u097F]/.test(input)) {
    return "hi";
  }

  // Check for common Hindi words
  if (
    /\b(aaj|kal|kitna|kitni|kitne|tumne|maal|becha|bika|biki|hai|haan|nahi|bikri|kul|kharcha|entry|fayda|nuksan)\b/i.test(
      input
    )
  ) {
    return "hi";
  }

  return "en";
}

function getUserLanguage(chatId) {
  return userLanguages.get(String(chatId)) || "en";
}

function setUserLanguage(chatId, language) {
  userLanguages.set(String(chatId), language);
}

function getPrompt(key, language = "en") {
  const prompts = {
    en: {
      welcome: "👋 Welcome to VoiceTrack! I can help you record sales, expenses, and get insights.\n\n📝 Send text or voice messages to record transactions.",
      selectLanguage: "Please select your preferred language:",
      language: "Language",
      english: "🇬🇧 English",
      hindi: "🇮🇳 हिंदी",
      recordEntry: "📝 Record Entry",
      viewHistory: "📊 View History",
      getInsights: "💡 Get Insights",
      undoLast: "↩️ Undo Last",
      settings: "⚙️ Settings",
      listeningMode: "🎤 I'm listening... Send voice or text message to record a transaction.",
      processingMode: "⏳ Processing your entry...",
      entryRecorded: "✅ Entry recorded successfully!",
      entryFailed: "❌ Failed to record entry. Please try again.",
      noHistory: "📭 No transaction history found.",
      noInsights: "📭 No insights available yet. Record some entries first.",
      undoSuccess: "↩️ Last transaction undone successfully!",
      undoFailed: "❌ Nothing to undo right now.",
      error: "❌ Something went wrong. Please try again.",
      help: "📖 VoiceTrack Bot Help:\n\n/start - Start the bot\n/record - Record a new entry\n/history - View transactions\n/insights - Get insights\n/undo - Undo last entry\n/language - Change language\n/help - Show this help",
      recentTransactions: "📊 Recent Transactions:",
      businessInsights: "💡 Business Insights:",
      totals: "Totals:",
      sales: "Sales",
      expenses: "Expenses",
      profit: "Profit",
      transactions: "Transactions",
      topSellingItems: "Top Selling Items:",
      units: "units",
      recorded: "Recorded",
    },
    hi: {
      welcome: "👋 VoiceTrack में आपका स्वागत है! मैं आपको बिक्री, खर्च रिकॉर्ड करने में मदद कर सकता हूँ।\n\n📝 लेनदेन रिकॉर्ड करने के लिए टेक्स्ट या वॉइस भेजें।",
      selectLanguage: "कृपया अपनी पसंदीदा भाषा चुनें:",
      language: "भाषा",
      english: "🇬🇧 English",
      hindi: "🇮🇳 हिंदी",
      recordEntry: "📝 एंट्री रिकॉर्ड करें",
      viewHistory: "📊 इतिहास देखें",
      getInsights: "💡 अंतर्दृष्टि प्राप्त करें",
      undoLast: "↩️ पिछली रद्द करें",
      settings: "⚙️ सेटिंग्स",
      listeningMode: "🎤 मैं सुन रहा हूँ... लेनदेन रिकॉर्ड करने के लिए वॉइस या टेक्स्ट संदेश भेजें।",
      processingMode: "⏳ आपकी एंट्री प्रोसेस हो रही है...",
      entryRecorded: "✅ एंट्री सफलतापूर्वक रिकॉर्ड की गई!",
      entryFailed: "❌ एंट्री रिकॉर्ड करने में विफल। कृपया पुनः प्रयास करें।",
      noHistory: "📭 कोई लेन-देन इतिहास नहीं मिला।",
      noInsights: "📭 कोई अंतर्दृष्टि उपलब्ध नहीं। पहले कुछ एंट्री रिकॉर्ड करें।",
      undoSuccess: "↩️ पिछली लेनदेन सफलतापूर्वक रद्द कर दी गई!",
      undoFailed: "❌ अभी रद्द करने के लिए कुछ नहीं है।",
      error: "❌ कुछ गलत हुआ। कृपया पुनः प्रयास करें।",
      help: "📖 VoiceTrack बॉट मदद:\n\n/start - बॉट शुरू करें\n/record - नई एंट्री रिकॉर्ड करें\n/history - लेन-देन देखें\n/insights - अंतर्दृष्टि प्राप्त करें\n/undo - पिछली एंट्री रद्द करें\n/language - भाषा बदलें\n/help - यह मदद दिखाएं",
      recentTransactions: "📊 हाल के लेनदेन:",
      businessInsights: "💡 व्यावसायिक अंतर्दृष्टि:",
      totals: "कुल:",
      sales: "बिक्री",
      expenses: "खर्च",
      profit: "लाभ",
      transactions: "लेनदेन",
      topSellingItems: "टॉप बिकने वाली चीजें:",
      units: "इकाइयां",
      recorded: "रिकॉर्ड किए गए",
    },
  };

  return prompts[language]?.[key] || prompts.en[key];
}

function getMainKeyboard(language) {
  return {
    reply_markup: {
      keyboard: [
        [
          { text: getPrompt("recordEntry", language) },
          { text: getPrompt("viewHistory", language) },
        ],
        [
          { text: getPrompt("getInsights", language) },
          { text: getPrompt("undoLast", language) },
        ],
        [{ text: getPrompt("settings", language) }],
      ],
      resize_keyboard: true,
      one_time_keyboard: false,
    },
  };
}

function getLanguageKeyboard() {
  return {
    reply_markup: {
      keyboard: [
        [{ text: getPrompt("english", "en") }, { text: getPrompt("hindi", "en") }],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  };
}

async function sendFailureMessage(chatId, language = "en") {
  if (!chatId) {
    return;
  }

  try {
    await bot.sendMessage(chatId, getPrompt("error", language));
  } catch (error) {
    logError("Failed to send error message", error, { chatId });
  }
}

// ────────────────────────────────────────────────────────
// API Integration Functions
// ────────────────────────────────────────────────────────

async function processVoiceNarration(chatId, transcript, languageHint) {
  const userId = getUserId(chatId);

  try {
    const payload = {
      transcript,
      userId,
      languageHint: languageHint || "en",
    };

    const response = await http.post(buildUrl(BACKEND_URL, "/api/voice/process"), payload, {
      timeout: 180000,
    });

    const data = response.data?.data || response.data;
    logInfo("Voice narration processed", {
      chatId,
      hasTransactions: Array.isArray(data?.transactions),
      status: data?.status,
    });

    return {
      status: data?.status || "recorded",
      transactions: data?.transactions || [],
      rawTranscript: data?.rawTranscript || transcript || "",
      normalizedTranscript: data?.normalizedTranscript || "",
      responseMessage: data?.responseMessage || "",
      audioUrl: data?.audioUrl || null,
      confirmationMessage: data?.confirmationMessage || "",
      overallConfidence: data?.overallConfidence || 0.7,
    };
  } catch (error) {
    logError("Failed to process voice narration", error, { chatId });
    throw error;
  }
}

async function transcribeTelegramVoice(fileUrl) {
  try {
    const payload = {
      audioUrl: fileUrl,
    };

    const response = await http.post(buildUrl(STT_URL, "/stt"), payload);
    const text = typeof response.data?.text === "string" ? response.data.text.trim() : "";

    if (!text) {
      throw new Error("STT service returned empty text");
    }

    logInfo("STT output", { text });
    return text;
  } catch (error) {
    logError("Failed to transcribe voice", error);
    throw error;
  }
}

async function getTransactionHistory(chatId, limit = 10) {
  const userId = getUserId(chatId);

  try {
    const response = await http.get(buildUrl(BACKEND_URL, "/api/transactions/history"), {
      params: {
        userId,
        limit,
      },
    });

    const data = response.data?.data || response.data;
    return (data?.transactions || []).slice(0, limit);
  } catch (error) {
    logError("Failed to fetch transaction history", error, { chatId });
    return [];
  }
}

async function getBusinessInsights(chatId) {
  const userId = getUserId(chatId);

  try {
    const response = await http.get(buildUrl(BACKEND_URL, "/api/insights"), {
      params: { userId },
    });

    const data = response.data?.data || response.data;
    return data;
  } catch (error) {
    logError("Failed to fetch insights", error, { chatId });
    return null;
  }
}

async function undoLastTransaction(chatId) {
  const userId = getUserId(chatId);

  try {
    const response = await http.post(buildUrl(BACKEND_URL, "/api/voice/undo-last"), {
      userId,
    });

    logInfo("Transaction undone", { chatId });
    return true;
  } catch (error) {
    logError("Failed to undo transaction", error, { chatId });
    return false;
  }
}

// ────────────────────────────────────────────────────────
// Message Handlers
// ────────────────────────────────────────────────────────

async function sendReply(chatId, reply, audioUrl) {
  try {
    await bot.sendChatAction(chatId, "typing");
    await bot.sendMessage(chatId, reply);

    if (audioUrl) {
      await bot.sendChatAction(chatId, "record_voice");
      await bot.sendVoice(chatId, audioUrl);
    }
  } catch (error) {
    logError("Failed to send reply", error, { chatId });
  }
}

async function handleTextMessage(msg) {
  const chatId = getChatId(msg);
  const text = typeof msg?.text === "string" ? msg.text.trim() : "";
  const language = getUserLanguage(chatId);

  if (!chatId || !text) {
    return;
  }

  // Handle commands and buttons
  if (
    text === getPrompt("recordEntry", language) ||
    text === "📝 Record Entry" ||
    text === "📝 एंट्री रिकॉर्ड करें"
  ) {
    try {
      await bot.sendMessage(chatId, getPrompt("listeningMode", language), getMainKeyboard(language));
    } catch (error) {
      logError("Failed to handle record command", error, { chatId });
    }
    return;
  }

  if (
    text === getPrompt("viewHistory", language) ||
    text === "📊 View History" ||
    text === "📊 इतिहास देखें" ||
    text === "/history"
  ) {
    try {
      await bot.sendChatAction(chatId, "typing");
      const history = await getTransactionHistory(chatId, 5);

      if (!history || history.length === 0) {
        await bot.sendMessage(chatId, getPrompt("noHistory", language), getMainKeyboard(language));
        return;
      }

      let historyText = getPrompt("recentTransactions", language) + ":\n\n";
      history.forEach((tx, idx) => {
        const date = new Date(tx.createdAt).toLocaleDateString(language === "hi" ? "hi-IN" : "en-US");
        historyText += `${idx + 1}. ${date}\n`;
        if (tx.rawText) {
          historyText += `   📝 ${tx.rawText.substring(0, 50)}${tx.rawText.length > 50 ? "..." : ""}\n`;
        }
        if (tx.sales?.length > 0) {
          const salesStr = tx.sales.map((s) => `${s.item}(${s.qty})`).join(", ");
          historyText += `   💰 ${getPrompt("sales", language)}: ${salesStr}\n`;
        }
        if (tx.expenses?.length > 0) {
          const expStr = tx.expenses.map((e) => `${e.item}(₹${e.amount})`).join(", ");
          historyText += `   💸 ${getPrompt("expenses", language)}: ${expStr}\n`;
        }
        historyText += "\n";
      });

      await bot.sendMessage(chatId, historyText, getMainKeyboard(language));
    } catch (error) {
      logError("Failed to fetch history", error, { chatId });
      await sendFailureMessage(chatId, language);
    }
    return;
  }

  if (
    text === getPrompt("getInsights", language) ||
    text === "💡 Get Insights" ||
    text === "💡 अंतर्दृष्टि प्राप्त करें" ||
    text === "/insights"
  ) {
    try {
      await bot.sendChatAction(chatId, "typing");
      const insights = await getBusinessInsights(chatId);

      if (!insights) {
        await bot.sendMessage(chatId, getPrompt("noInsights", language), getMainKeyboard(language));
        return;
      }

      let insightsText = getPrompt("businessInsights", language) + ":\n\n";

      if (insights.totals) {
        insightsText += getPrompt("totals", language) + ":\n";
        insightsText += `  ${getPrompt("sales", language)}: ₹${insights.totals.sales || 0}\n`;
        insightsText += `  ${getPrompt("expenses", language)}: ₹${insights.totals.expenses || 0}\n`;
        insightsText += `  ${getPrompt("profit", language)}: ₹${(insights.totals.sales || 0) - (insights.totals.expenses || 0)}\n\n`;
      }

      if (insights.transactionCount) {
        insightsText += `${getPrompt("transactions", language)}: ${insights.transactionCount}\n`;
      }

      if (Array.isArray(insights.topSellingItems) && insights.topSellingItems.length > 0) {
        insightsText += "\n" + getPrompt("topSellingItems", language) + ":\n";
        insights.topSellingItems.slice(0, 3).forEach((item) => {
          insightsText += `  • ${item.item}: ${item.quantity} ${getPrompt("units", language)} (₹${item.revenue})\n`;
        });
      }

      await bot.sendMessage(chatId, insightsText, getMainKeyboard(language));
    } catch (error) {
      logError("Failed to fetch insights", error, { chatId });
      await sendFailureMessage(chatId, language);
    }
    return;
  }

  if (
    text === getPrompt("undoLast", language) ||
    text === "↩️ Undo Last" ||
    text === "↩️ पिछली रद्द करें" ||
    text === "/undo"
  ) {
    try {
      const success = await undoLastTransaction(chatId);
      const message = success ? getPrompt("undoSuccess", language) : getPrompt("undoFailed", language);
      await bot.sendMessage(chatId, message, getMainKeyboard(language));
    } catch (error) {
      logError("Failed to undo", error, { chatId });
      await sendFailureMessage(chatId, language);
    }
    return;
  }

  if (
    text === getPrompt("settings", language) ||
    text === "⚙️ Settings" ||
    text === "⚙️ सेटिंग्स"
  ) {
    try {
      await bot.sendMessage(chatId, getPrompt("selectLanguage", language), getLanguageKeyboard());
    } catch (error) {
      logError("Failed to show settings", error, { chatId });
    }
    return;
  }

  if (text.includes("English") || text.includes("हिंदी")) {
    const newLanguage = text.includes("हिंदी") ? "hi" : "en";
    setUserLanguage(chatId, newLanguage);
    try {
      await bot.sendMessage(chatId, getPrompt("welcome", newLanguage), getMainKeyboard(newLanguage));
    } catch (error) {
      logError("Failed to set language", error, { chatId });
    }
    return;
  }

  // Process as transaction entry
  if (!text.startsWith("/")) {
    try {
      logInfo("Processing text entry", { chatId, text });
      await bot.sendChatAction(chatId, "typing");

      const detectedLanguage = detectLanguage(text);
      const result = await processVoiceNarration(chatId, text, detectedLanguage);

      if (result.transactions && result.transactions.length > 0) {
        const transactionText =
          language === "en"
            ? `✅ ${getPrompt("recorded", language)} ${result.transactions.length} ${language === "en" ? "transaction(s)" : "लेनदेन"}:\n\n`
            : `✅ ${result.transactions.length} लेनदेन ${getPrompt("recorded", language)} किए गए:\n\n`;

        let fullText = transactionText;
        result.transactions.forEach((tx) => {
          fullText += `• ${tx.item}: ${tx.quantity} @ ₹${tx.price} = ₹${tx.total}\n`;
        });

        await bot.sendMessage(chatId, fullText, getMainKeyboard(language));

        if (result.audioUrl) {
          await bot.sendChatAction(chatId, "record_voice");
          await bot.sendVoice(chatId, result.audioUrl);
        }
      } else if (result.responseMessage) {
        await sendReply(chatId, result.responseMessage, result.audioUrl);
      } else {
        await bot.sendMessage(chatId, getPrompt("entryRecorded", language), getMainKeyboard(language));
      }
    } catch (error) {
      logError("Failed to process text entry", error, { chatId, text });
      await sendFailureMessage(chatId, language);
    }
  }
}

async function handleVoiceMessage(msg) {
  const chatId = getChatId(msg);
  const fileId = msg?.voice?.file_id;
  const language = getUserLanguage(chatId);

  if (!chatId || !fileId) {
    return;
  }

  try {
    logInfo("Incoming voice message", { chatId, fileId });

    await bot.sendChatAction(chatId, "typing");

    const file = await bot.getFile(fileId);
    const filePath = file?.file_path;

    if (!filePath) {
      throw new Error("Telegram did not return a file path for the voice message");
    }

    const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${filePath}`;

    // Transcribe voice
    const transcribedText = await transcribeTelegramVoice(fileUrl);
    const detectedLanguage = detectLanguage(transcribedText);

    // Process as voice narration
    const result = await processVoiceNarration(chatId, transcribedText, detectedLanguage);

    if (result.transactions && result.transactions.length > 0) {
      const transactionText = `✅ ${result.transactions.length} ${language === "en" ? "transaction(s)" : "लेनदेन"}:\n\n`;

      let fullText = transactionText;
      result.transactions.forEach((tx) => {
        fullText += `• ${tx.item}: ${tx.quantity} @ ₹${tx.price} = ₹${tx.total}\n`;
      });

      await bot.sendMessage(chatId, fullText, getMainKeyboard(language));

      if (result.audioUrl) {
        await bot.sendChatAction(chatId, "record_voice");
        await bot.sendVoice(chatId, result.audioUrl);
      }
    } else if (result.responseMessage) {
      await sendReply(chatId, result.responseMessage, result.audioUrl);
    } else {
      await bot.sendMessage(chatId, getPrompt("entryRecorded", language), getMainKeyboard(language));
    }
  } catch (error) {
    logError("Failed to handle voice message", error, { chatId, fileId });
    await sendFailureMessage(chatId, language);
  }
}

// ────────────────────────────────────────────────────────
// Bot Command Handlers
// ────────────────────────────────────────────────────────

bot.onText(/\/start/, async (msg) => {
  const chatId = getChatId(msg);
  const language = getUserLanguage(chatId);

  try {
    await bot.sendMessage(chatId, getPrompt("welcome", language), getMainKeyboard(language));
  } catch (error) {
    logError("Failed to handle /start command", error, { chatId });
  }
});

bot.onText(/\/language/, async (msg) => {
  const chatId = getChatId(msg);

  try {
    await bot.sendMessage(chatId, getPrompt("selectLanguage", "en"), getLanguageKeyboard());
  } catch (error) {
    logError("Failed to handle /language command", error, { chatId });
  }
});

bot.onText(/\/help/, async (msg) => {
  const chatId = getChatId(msg);
  const language = getUserLanguage(chatId);

  try {
    await bot.sendMessage(chatId, getPrompt("help", language));
  } catch (error) {
    logError("Failed to handle /help command", error, { chatId });
  }
});

bot.onText(/\/record/, async (msg) => {
  const chatId = getChatId(msg);
  const language = getUserLanguage(chatId);

  try {
    await bot.sendMessage(chatId, getPrompt("listeningMode", language), getMainKeyboard(language));
  } catch (error) {
    logError("Failed to handle /record command", error, { chatId });
  }
});

bot.on("message", async (msg) => {
  const text = msg?.text;
  if (text && !text.startsWith("/")) {
    await handleTextMessage(msg);
  }
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

function initTelegramBot() {
  logInfo("Bot started with full features", {
    mode: "polling",
    backendUrl: BACKEND_URL,
    sttUrl: STT_URL,
    features: [
      "✅ Transaction Recording (Voice & Text)",
      "✅ Transaction History Viewing",
      "✅ Business Insights & Analytics",
      "✅ Undo Last Transaction",
      "✅ Bilingual Support (English & हिंदी)",
      "✅ Language Auto-Detection",
      "✅ Audio Response Generation (TTS)",
      "✅ Keyboard Navigation UI",
    ],
  });
}

function stopTelegramBot() {
  bot.stopPolling();
  logInfo("Bot stopped");
}

initTelegramBot();

module.exports = { bot, initTelegramBot, stopTelegramBot };
