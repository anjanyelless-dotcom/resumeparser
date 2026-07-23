import dotenv from "dotenv";
import { createServer } from "http";
import app from "./app";
import pool from "./database/db";
import createSocketServer, { setSocketInstance } from "./socket";

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3001;

// Debug: Print DATABASE_URL (without password)
const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl) {
  const maskedUrl = databaseUrl.replace(/:([^:@]+)@/, ":***@");
  console.log("🔍 DATABASE_URL:", maskedUrl);
} else {
  console.log("❌ DATABASE_URL is undefined");
}

async function startServer(): Promise<void> {
  try {
    // Test database connection
    const client = await pool.connect();
    console.log("✅ Database connected successfully");
    client.release();

    // Create HTTP server
    const httpServer = createServer(app);

    // Create and initialize Socket.io server
    const io = createSocketServer(httpServer);
    setSocketInstance(io);

    // Start HTTP server
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`);
      console.log(
        `👥 Candidates endpoints: http://localhost:${PORT}/api/candidates`,
      );
      console.log(`💼 Jobs endpoints: http://localhost:${PORT}/api/jobs`);
      console.log(`🔌 Socket.io server initialized`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  console.log("🔄 SIGTERM received, shutting down gracefully");
  try {
    await pool.end();
    console.log("✅ All services shut down successfully");
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
  }
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("🔄 SIGINT received, shutting down gracefully");
  try {
    await pool.end();
    console.log("✅ All services shut down successfully");
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
  }
  process.exit(0);
});

// Start the server
startServer().catch((error) => {
  console.error("❌ Server startup failed:", error);
  process.exit(1);
});
 // trigger restart
