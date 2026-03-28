const { parseAndPreparePending } = require("./messageHandler");

async function handleVoiceMessage({
    bot,
    msg,
    botToken,
    speechToTextFromTelegramVoice,
    parseTransactionFromText,
    pendingTransactions,
    editModeChats,
}) {
    const chatId = msg?.chat?.id;
    const voiceFileId = msg?.voice?.file_id;

    if (!chatId || !voiceFileId) {
        return;
    }

    try {
        await bot.sendMessage(chatId, "⏳ Processing...");

        const transcribedText = await speechToTextFromTelegramVoice({
            bot,
            botToken,
            voiceFileId,
        });

        if (!transcribedText) {
            await bot.sendMessage(chatId, "❌ Couldn\'t understand. Try again.");
            return;
        }

        await bot.sendMessage(chatId, `🗣️ Heard: ${transcribedText}`);

        await parseAndPreparePending({
            bot,
            chatId,
            text: transcribedText,
            parseTransactionFromText,
            pendingTransactions,
            editModeChats,
            source: "voice",
            showProcessing: false,
        });
    } catch (_) {
        await bot.sendMessage(chatId, "❌ Couldn\'t understand. Try again.");
    }
}

module.exports = {
    handleVoiceMessage,
};
