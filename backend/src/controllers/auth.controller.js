/**
 * auth.controller.js
 *
 * Handles: register, login, getMe, refreshToken
 *
 * Pattern reminder:
 *   - validationResult()  → check express-validator rules ran in the route
 *   - Service calls       → token.service for JWT
 *   - Model calls         → User.findOne(), User.create()
 *   - apiResponse helpers → consistent response shape every time
 */
const { validationResult } = require("express-validator");
const User = require("../models/user.model");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../services/token.service");
const {
  success,
  created,
  badRequest,
  unauthorized,
} = require("../utils/apiResponse");

/ ─────────────────────────────────────────────/;
// POST /api/auth/register
// ─────────────────────────────────────────────
/**
 * Creates a new user account.
 *
 * Why check validationResult first?
 *   express-validator runs the rules defined in the route file and collects
 *   errors. It does NOT automatically reject the request — you have to check.
 *   If you forget this check, invalid data silently reaches your DB.
 *
 * Why not hash password here?
 *   We put bcrypt in a Mongoose pre('save') hook on the User model.
 *   Benefit: impossible to accidentally save a plain-text password from
 *   anywhere in the app — the hook always runs before .save().
 */
const register = async (req, res) => {
  // 1. Check validation errors from express-validator rules
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return badRequest(res, "Validation failed", errors.array());
  }

  const {
    name,
    email,
    password,
    role = "student",
    rollNo,
    department,
    semester,
  } = req.body;

  // 2. Check if email already taken
  //    Why not rely on the unique index alone?
  //    Because the DB error (code 11000) is caught in errorHandler and gives
  //    a generic message. Checking manually lets us give a friendlier message.
  const existing = await User.findOne({ email });
  if (existing) {
    return badRequest(res, "An account with this email already exists");
  }

  // 3. Create the user — password is hashed automatically by the pre('save') hook
  const user = await User.create({
    name,
    email,
    password,
    role,
    rollNo,
    department,
    semester,
  });

  // 4. Generate tokens immediately so user is logged in after registering
  const payload = { id: user._id, email: user.email, role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // 5. user.toJSON() strips password and __v automatically (configured in model)
  return created(
    res,
    { user, accessToken, refreshToken },
    "Registration successful",
  );
};

// ─────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────
/**
 * Validates credentials and returns JWT tokens.
 *
 * Timing attack prevention:
 *   If user not found, we still call bcrypt.compare against a dummy hash.
 *   Why? bcrypt.compare takes ~300ms. If we return instantly when user not
 *   found, an attacker can measure response time to discover valid emails:
 *     - Fast response  = email doesn't exist
 *     - Slow response  = email exists, wrong password
 *   Always take the same time regardless of outcome.
 */
const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return badRequest(res, "Validation failed", errors.array());
  }

  const { email, password } = req.body;

  // select('+password') is needed because we set select: false on password field
  // Without +password, user.password is undefined and comparePassword always fails
  const user = await User.findOne({ email }).select("+password");

  // Timing-safe check: compare against dummy hash even if user not found
  const dummyHash =
    "$2a$12$invalidhashforpreventingtimingattacksXXXXXXXXXXXXXXXXX";
  const passwordMatch = await (user
    ? user.comparePassword(password) // real comparison
    : require("bcryptjs").compare(password, dummyHash)); // dummy — always false

  if (!user || !passwordMatch) {
    // Same message for both cases — don't tell attacker whether email exists
    return unauthorized(res, "Invalid email or password");
  }

  if (!user.isActive) {
    return unauthorized(
      res,
      "Your account has been deactivated. Contact your administrator.",
    );
  }

  const payload = { id: user._id, email: user.email, role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Remove password from the response object (toJSON handles this, but explicit is clearer)
  const userObj = user.toJSON(); // toJSON transform removes password + __v

  return success(
    res,
    { user: userObj, accessToken, refreshToken },
    "Login successful",
  );
};

// ─────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────
/**
 * Returns the currently logged-in user's full profile.
 * req.user is set by the authenticate middleware — contains { id, email, role }.
 *
 * We do a fresh DB query instead of returning req.user directly because:
 *   - JWT payload is a snapshot from login time
 *   - If user's name/department was updated since login, JWT still has old data
 *   - DB query gets the latest version
 */
const getMe = async (req, res) => {
  // -password excludes the field (alternative to select: false on every query)
  const user = await User.findById(req.user.id).select("-password");

  if (!user) {
    // Rare case: user was deleted after their JWT was issued
    return unauthorized(res, "User no longer exists");
  }

  return success(res, user);
};

// ─────────────────────────────────────────────
// POST /api/auth/refresh
// ─────────────────────────────────────────────
/**
 * Issues a new access token using the refresh token.
 *
 * Why two tokens (access + refresh)?
 *   Access token: short enough to limit damage if stolen (7 days)
 *   Refresh token: long lived (30 days), but only hits ONE endpoint
 *
 * Flow:
 *   1. Access token expires after 7 days
 *   2. Frontend silently calls this endpoint with refresh token
 *   3. Gets a new access token — user never sees a login screen
 *   4. If refresh token is also expired → force re-login
 */
const refreshToken = async (req, res) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    return badRequest(res, "Refresh token is required");
  }

  try {
    const decoded = verifyRefreshToken(token);
    const newAccess = generateAccessToken({
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    });
    return success(res, { accessToken: newAccess }, "Token refreshed");
  } catch (err) {
    // TokenExpiredError or JsonWebTokenError
    return unauthorized(
      res,
      "Refresh token is invalid or expired. Please log in again.",
    );
  }
};

// ─────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────
/**
 * Stateless logout.
 *
 * Since JWTs are stateless, the server can't truly "invalidate" a token.
 * True invalidation needs a token blacklist in Redis — overkill for a college project.
 *
 * Simple approach: tell the frontend to delete its tokens.
 * The access token expires in 7 days anyway. Good enough for our use case.
 *
 * Production approach: store token JTI (unique ID) in Redis with TTL = expiry time.
 * On each request, check if JTI is blacklisted.
 */
const logout = async (req, res) => {
  // Nothing to do server-side for stateless JWT
  // Frontend should: clear accessToken from memory, clear refreshToken from localStorage
  return success(
    res,
    null,
    "Logged out successfully. Please clear your tokens on the client.",
  );
};

module.exports = { register, login, getMe, refreshToken, logout };
