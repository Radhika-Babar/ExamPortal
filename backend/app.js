/**
 * app.js
 *
 * Configures and wires the Express application.
 * No server.listen() here — that's in server.js.
 *
 * Middleware order (REQUEST flows top to bottom):
 *   1. cors()          → browser allowed to call this API
 *   2. express.json()  → parse JSON body so req.body works
 *   3. rateLimiter     → count and reject abusive IPs
 *   4. routes          → actual route handlers
 *   5. 404 handler     → catch unmatched routes
 *   6. errorHandler    → catch all errors thrown in routes/controllers
 *
 * Why is errorHandler LAST?
 *   It's a 4-parameter middleware: (err, req, res, next)
 *   Express recognizes it by signature. It only activates when next(err) is called.
 *   If defined before routes, errors thrown in routes skip it and crash.
 */
const express = require("express");
const cors = require("cors");
const env = require("./src/config/env");
const { generalLimiter } = require("./src/middlewares/rateLimiter.middleware");
const { errorHandler } = require("./src/middlewares/errorHandler.middleware");
const { success } = require("./src/utils/apiResponse");

const app = express();

// ── 1. CORS ──
// Cross-Origin Resource Sharing: browsers block requests to different origins by default.
// This tells them: requests from FRONTEND_URL are allowed.
// credentials: true is needed for Authorization headers to work cross-origin.
app.use(
  cors({
    origin: env.frontendUri || "https://examportal-frontend-b0vj.onrender.com",
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-type", "Authorization"],
  }),
);

// ── 2. Body parsers ──
// Without this, req.body is undefined for POST/PUT requests with JSON bodies.
// limit: '10mb' prevents huge payloads from overwhelming the server.
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── 3. Rate limiting ──
app.use(generalLimiter);

// ── 4. Health check ──
// Used by deployment platforms (Railway, Render) to know the server is alive.
// Returns fast without hitting DB — just proves the process is running.
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: env.nodeEnv,
  });
});

// ── 5. Routes ──
// /api prefix on all routes: convention that distinguishes API from static files.
app.use("/api/auth", require("./src/routes/auth.route"));
app.use("/api/exams", require("./src/routes/exam.route"));
app.use("/api/sessions", require("./src/routes/session.route"));
app.use("/api/results", require("./src/routes/result.route"));

// ── 6. 404 handler ──
// If no route matched above, this runs.
// Without this: Express sends a generic HTML "Cannot GET /xyz" — ugly and confusing.
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// ── 7. Global error handler ── (MUST be last, MUST have 4 parameters)
app.use(errorHandler);

module.exports = app;
