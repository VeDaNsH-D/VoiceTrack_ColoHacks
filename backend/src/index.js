const http = require("http");
const app = require("./app");
const connectDb = require("./config/db");
const env = require("./config/env");
const logger = require("./utils/logger");
const { initTelegramBot, stopTelegramBot } = require("../telegram/bot");

const server = http.createServer(app);

server.on("error", async (error) => {
  if (error?.code === "EADDRINUSE") {
    logger.error(`Port ${env.port} is already in use. Stop the other backend instance and restart.`);
    await stopTelegramBot();
    process.exit(1);
    return;
  }

  logger.error("Server failed with an unexpected error", error);
  await stopTelegramBot();
  process.exit(1);
});

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

process.once("SIGUSR2", async () => {
  logger.info("SIGUSR2 received, shutting down for nodemon restart");
  await stopTelegramBot();
  server.close(() => {
    process.kill(process.pid, "SIGUSR2");
  });
});
