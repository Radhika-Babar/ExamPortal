/**
 * auth.routes.js
 *
 * Maps HTTP methods + URLs → controller functions.
 * Also defines validation rules using express-validator.
 *
 * Why define validation HERE and not in the controller?
 *   Separation of concerns. Routes define WHAT is acceptable input.
 *   Controllers define WHAT TO DO with that input.
 *   You can read this file and instantly know every rule for every endpoint.
 *
 * express-validator body() method:
 *   body('field')           → selects req.body.field
 *   .notEmpty()             → fails if empty string or undefined
 *   .isEmail()              → must be valid email format
 *   .normalizeEmail()       → lowercases, trims (sanitization, not validation)
 *   .isLength({ min: N })   → minimum character count
 *   .isIn([...])            → must be one of these values
 *   .withMessage('...')     → custom error message if this rule fails
 *   .optional()             → only validate if field is present
 */

const { Router } = require("express");
const { body } = require("express-validator");

const {
  register,
  login,
  getMe,
  refreshToken,
  logout,
} = require("../controllers/auth.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authLimiter } = require("../middlewares/rateLimiter.middleware");
const { asyncHandler } = require("../middlewares/errorHandler.middleware");

const router = Router();

// ── POST /api/auth/register ──
router.post(
  "/register",
  authLimiter, // max 10 requests per 15 min from same IP
  [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Name is required")
      .isLength({ max: 100 })
      .withMessage("Name cannot exceed 100 characters"),

    body("email")
      .isEmail()
      .withMessage("Please provide a valid email")
      .normalizeEmail(), // converts "User@Gmail.Com" → "user@gmail.com"

    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),

    body("role")
      .optional()
      .isIn(["student", "faculty"])
      .withMessage("Role must be student or faculty"),
    // Note: 'admin' not allowed via self-registration — must be set manually in DB

    body("rollNo").optional().trim(),
    body("department").optional().trim(),
    body("semester")
      .optional()
      .isInt({ min: 1, max: 8 })
      .withMessage("Semester must be 1–8"),
  ],
  asyncHandler(register),
);

// ── POST /api/auth/login ──
router.post(
  "/login",
  authLimiter,
  [
    body("email")
      .isEmail()
      .withMessage("Please provide a valid email")
      .normalizeEmail(),

    body("password").notEmpty().withMessage("Password is required"),
  ],
  asyncHandler(login),
);

// ── GET /api/auth/me ── (protected)
// authenticate middleware: verifies JWT, attaches req.user
router.get("/me", authenticate, asyncHandler(getMe));

// ── POST /api/auth/refresh ──
router.post("/refresh", asyncHandler(refreshToken));

// ── POST /api/auth/logout ── (protected)
router.post("/logout", authenticate, asyncHandler(logout));

module.exports = router;
