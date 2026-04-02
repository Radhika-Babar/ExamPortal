/**
 * server.js
 *
 * Entry point. The only file that:
 *   1. Loads environment variables (must be first)
 *   2. Connects to MongoDB
 *   3. Starts listening on a port
 *
 * Why connect to DB before starting the server?
 *   If DB connection fails, we don't want the server to start accepting requests
 *   that will all fail. Connect first — if it succeeds, start listening.
 *
 * Graceful shutdown:
 *   When the server receives SIGTERM (e.g. deployment platform restarting it),
 *   we finish any in-flight requests before closing.
 *   Without this: in-progress exam saves could be cut off mid-write.
 */

//require("dotenv").config(); // MUST be before any other require that reads process.env

const app = require("./app");
const connectDB = require("./src/config/db");
const env = require("./src/config/env");

const startServer = async () => {
  // Connect to MongoDB first — fail fast if DB is unavailable
  await connectDB();

  const server = app.listen(env.port, () => {
    console.log(`🚀  Server running on http://localhost:${env.port}`);
    console.log(`📘  Environment: ${env.nodeEnv}`);
    console.log(`📡  MongoDB: connected`);
    console.log(`\n  API routes:`);
    console.log(`    POST  /api/auth/register`);
    console.log(`    POST  /api/auth/login`);
    console.log(`    GET   /api/auth/me`);
    console.log(`    GET   /api/exams`);
    console.log(`    POST  /api/exams`);
    console.log(`    POST  /api/sessions/start/:examId`);
    console.log(`    POST  /api/sessions/:id/answer`);
    console.log(`    POST  /api/sessions/:id/submit`);
    console.log(`    GET   /api/results/:sessionId`);
    console.log(`    GET   /api/results/exam/:examId`);
  });

  // Graceful shutdown on SIGTERM (e.g. Ctrl+C or container stop)
  process.on("SIGTERM", () => {
    console.log("\nSIGTERM received. Closing server gracefully...");
    server.close(() => {
      console.log("Server closed. Exiting.");
      process.exit(0);
    });
  });

  process.on("SIGINT", () => {
    console.log("\nSIGINT received. Closing server gracefully...");
    server.close(() => {
      console.log("Server closed. Exiting.");
      process.exit(0);
    });
  });

  // Catch unhandled promise rejections — last safety net
  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Promise Rejection:", reason);
    // Don't crash in development — log and continue
    // In production: consider crashing and letting process manager restart
    if (env.nodeEnv === "production") {
      server.close(() => process.exit(1));
    }
  });
};

startServer();
