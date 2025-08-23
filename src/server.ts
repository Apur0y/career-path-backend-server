import { Server } from "http";
import app from "./app";
import config from "./app/config";
import { seedSuperAdmin } from "./seedSuperAdmin";
import { connectWebSocketServer } from "./app/modules/chat/chat.websocket";

let server: Server;

const main = async () => {
  try {
    // Seed Super Admin
    await seedSuperAdmin();

    // server = app.listen(Number(config.port), "10.0.30.249", () => {
    //   console.log(`🚀 App is listening on: http://10.0.30.249:${config.port}`);
    // });

    server = app.listen(config.port, () => {
      console.log(`🚀 App is listening on: http://localhost:${config.port}`);
    });

    // ✅ Connect WebSocket
    connectWebSocketServer(server);
  } catch (err) {
    console.log(err);
  }
};

main();

// Graceful shutdown handling
const shutdown = () => {
  console.log("🛑 Shutting down servers...");

  if (server) {
    server.close(() => {
      console.log("Servers closed");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on("unhandledRejection", () => {
  console.log(`❌ unhandledRejection is detected, shutting down...`);
  shutdown();
});

process.on("uncaughtException", () => {
  console.log(`❌ uncaughtException is detected, shutting down...`);
  shutdown();
});

process.on("SIGTERM", () => {
  console.log("🛑 SIGTERM received");
  shutdown();
});

process.on("SIGINT", () => {
  console.log("🛑 SIGINT received");
  shutdown();
});
