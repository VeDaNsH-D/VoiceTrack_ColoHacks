const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const webhookRoutes = require("./routes/webhook.routes");
const transactionRoutes = require("./routes/transaction.routes");
const insightsRoutes = require("./routes/insights.routes");
const errorMiddleware = require("./middlewares/error.middleware");
const authMiddleware = require("./middlewares/auth.middleware");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "voicetrack-backend",
    endpoints: {
      health: "GET /health",
      processText: "POST /process-text",
      processTextScoped: "POST /api/transactions/process-text",
    },
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/insights", insightsRoutes);

app.get("/api/protected", authMiddleware, (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
});

app.use("/", transactionRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: {
      message: "Route not found",
      code: "ROUTE_NOT_FOUND",
    },
  });
});

app.use(errorMiddleware);

module.exports = app;
