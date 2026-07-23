import dotenv from 'dotenv';
dotenv.config({ path: './.env', override: true });
import { createServer } from "http";
import app from "./app";
import pool from "./database/db";
import createSocketServer, { setSocketInstance } from "./socket";

const PORT = process.env.PORT || 3001;

async function startServer(): Promise<void> {
  try {
    // Test database connection
    const client = await pool.connect();
    console.log("✅ Database connected successfully");

    // Automatically run RBAC migrations on startup
    try {
      const fs = require('fs');
      const path = require('path');
      const schemaPath = path.join(__dirname, '..', 'migrations', '20260718_add_enterprise_rbac_schema.sql');
      const seedPath = path.join(__dirname, '..', 'migrations', '20260718_seed_enterprise_rbac.sql');
      
      if (fs.existsSync(schemaPath)) {
        await client.query(fs.readFileSync(schemaPath, 'utf8'));
      }
      if (fs.existsSync(seedPath)) {
        await client.query(fs.readFileSync(seedPath, 'utf8'));
      }
      console.log("✅ RBAC Schema & Roles verified/updated");
    } catch (err: any) {
      console.error("❌ Failed to run RBAC migrations:", err.message);
    }

    client.release();

    // Create HTTP server
    const httpServer = createServer(app);

    // Increase timeout for long-running AI parsing requests
    httpServer.timeout = 120000; // 120 seconds
    httpServer.keepAliveTimeout = 120000;
    httpServer.headersTimeout = 130000;

    // Create and initialize Socket.io server
    const io = createSocketServer(httpServer);
    setSocketInstance(io);

    // Start HTTP server
    httpServer.listen(PORT, () => {
      const host = process.env.HOSTNAME || 'localhost';
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://${host}:${PORT}/health`);
      console.log(`🔐 Auth endpoints: http://${host}:${PORT}/api/auth`);
      console.log(
        `👥 Candidates endpoints: http://${host}:${PORT}/api/candidates`,
      );
      console.log(`💼 Jobs endpoints: http://${host}:${PORT}/api/jobs`);
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
