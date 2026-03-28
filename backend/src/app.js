const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const assistantRoutes = require("./routes/assistant.routes");
const chatRoutes = require("./routes/chat");
const webhookRoutes = require("./routes/webhook.routes");
const transactionRoutes = require("./routes/transaction.routes");
const insightsRoutes = require("./routes/insights.routes");
const analyticsEngineRoutes = require("./routes/analyticsEngine.routes");
const voiceRoutes = require("./routes/voiceRoute");
const errorMiddleware = require("./middlewares/error.middleware");
const authMiddleware = require("./middlewares/auth.middleware");
const { sendSuccess, sendError } = require("./utils/apiResponse");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => {
  return sendSuccess(res, { status: "ok" }, "Health check OK");
});

app.get("/", (req, res) => {
  return sendSuccess(res, {
    status: "ok",
    service: "voicetrack-backend",
    endpoints: {
      health: "GET /health",
      assistantQuery: "POST /api/assistant/query",
      chat: "POST /chat",
      processTextScoped: "POST /api/transactions/process-text"
    },
  });
});

app.use("/", chatRoutes);
app.use("/api/assistant", assistantRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/insights", insightsRoutes);
<<<<<<< HEAD
app.use("/api/analytics", analyticsEngineRoutes);
=======
app.use("/api/analytics", analyticsEngineRoutes);
app.use("/api/voice", authMiddleware, voiceRoutes);
    user: req.user,
  }, "Protected profile fetched");
});

app.use((req, res) => {
  return sendError(res, "Route not found", 404, { code: "ROUTE_NOT_FOUND" });
});

app.use(errorMiddleware);

module.exports = app;
