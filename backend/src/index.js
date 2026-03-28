const http = require("http");
const app = require("./app");
const connectDb = require("./config/db");
const env = require("./config/env");
const logger = require("./utils/logger");
const { initTelegramBot, stopTelegramBot } = require("../telegram/bot");

const server = http.createServer(app);

async function startServer() {
  try {
    await connectDb();
    server.listen(env.port, () => {
      logger.info(`Backend listening on port ${env.port}`);
      initTelegramBot();
    });
  } catch (error) {
    logger.error("Failed to start backend", error);
    process.exit(1);
  }
}

startServer();

process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down");
  await stopTelegramBot();
  server.close(() => process.exit(0));
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down");
  await stopTelegramBot();
  server.close(() => process.exit(0));
});
