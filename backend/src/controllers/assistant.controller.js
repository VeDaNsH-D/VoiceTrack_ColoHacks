const { extractIntent } = require("../services/intentService");
const { handleQuery } = require("../services/queryService");
const { generateResponse } = require("../services/responseService");

async function queryAssistant(req, res) {
  const { userId, message } = req.body || {};

  if (typeof userId !== "string" || !userId.trim()) {
    return res.status(400).json({
      error: {
        message: "userId is required",
        code: "INVALID_USER_ID",
      },
    });
  }

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({
      error: {
        message: "message is required",
        code: "INVALID_MESSAGE",
      },
    });
  }

  try {
    const intent = await extractIntent(message);
    const queryResult = await handleQuery(userId.trim(), intent);
    const response = await generateResponse(message, queryResult);

    return res.status(200).json({
      intent,
      queryResult,
      ...response,
    });
  } catch (error) {
    console.error("Assistant query failed", {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });

    return res.status(500).json({
      error: {
        message: "Something went wrong",
        code: "ASSISTANT_QUERY_FAILED",
      },
    });
  }
}

module.exports = {
  queryAssistant,
};
