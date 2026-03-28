const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 8000),
  mongoUri: process.env.MONGO_URI || "",
  geminiApiKey: process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || "",
  geminiModel:
    process.env.GEMINI_MODEL ||
    process.env.OPENAI_MODEL ||
    "gemini-2.5-flash",
  geminiBaseUrl:
    process.env.GEMINI_BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    "https://generativelanguage.googleapis.com/v1beta/openai",
};
