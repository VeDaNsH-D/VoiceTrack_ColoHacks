const systemPrompt = `You are a friendly voice assistant for Indian users.

You understand Hindi, English, and Hinglish.

User input comes from speech-to-text systems like SARVAM or Whisper.
Text may contain errors or informal phrasing.

Users are speaking, not typing:
- Messages may be incomplete
- Infer intent when possible

Rules:
- Reply in same language as user
- Keep responses short (1-2 lines max)
- Sound natural and conversational
- Avoid long paragraphs
- Ask follow-up questions if needed
`;

const userChats = {};
const MAX_HISTORY_MESSAGES = 10;

function buildInitialChat() {
  return [{ role: "system", content: systemPrompt }];
}

function ensureUserChat(userId) {
  if (!userChats[userId]) {
    userChats[userId] = buildInitialChat();
  }

  if (userChats[userId][0]?.role !== "system") {
    userChats[userId] = [
      { role: "system", content: systemPrompt },
      ...userChats[userId].filter((message) => message.role !== "system"),
    ];
  } else {
    userChats[userId][0] = { role: "system", content: systemPrompt };
  }

  return userChats[userId];
}

function getUserChat(userId) {
  return ensureUserChat(userId);
}

function trimHistory(userId) {
  const chatHistory = ensureUserChat(userId);
  const conversationHistory = chatHistory.slice(1);

  if (conversationHistory.length <= MAX_HISTORY_MESSAGES) {
    return chatHistory;
  }

  userChats[userId] = [chatHistory[0], ...conversationHistory.slice(-MAX_HISTORY_MESSAGES)];
  return userChats[userId];
}

function addUserMessage(userId, message) {
  const chatHistory = ensureUserChat(userId);
  chatHistory.push({ role: "user", content: message });
  return trimHistory(userId);
}

function addAssistantMessage(userId, reply) {
  const chatHistory = ensureUserChat(userId);
  chatHistory.push({ role: "assistant", content: reply });
  return trimHistory(userId);
}

module.exports = {
  userChats,
  systemPrompt,
  getUserChat,
  addUserMessage,
  addAssistantMessage,
  trimHistory,
};
