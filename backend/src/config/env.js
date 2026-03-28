const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGO_URI || "",
  groqApiKey: process.env.GROQ_API_KEY || "",
  groqModel: process.env.GROQ_MODEL || "llama3-8b-8192",
  huggingFaceApiKey:
    process.env.HUGGINGFACE_API_KEY ||
    process.env.HF_API_KEY ||
    process.env.HUGGINGFACEHUB_API_TOKEN ||
    "",
  huggingFaceEmbeddingUrl:
    process.env.HUGGINGFACE_EMBEDDING_URL ||
    "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2",
  ttsBaseUrl: process.env.TTS_BASE_URL || "http://127.0.0.1:8000",
  ttsPath: process.env.TTS_PATH || "/tts",
  ttsTimeoutMs: Number(process.env.TTS_TIMEOUT_MS || 10000),
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
