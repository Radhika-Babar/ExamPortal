const rateLimit = require("express-rate-limit");

// general: 100 requests per 15 min per IP
const generalLimiter =  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {success: false, message: 'Too many requests. Try again after 15 minutes.'},
    standardHeaders: true,
    legacyHeaders: false
})

// Auth routes: stricter — 10 attempts per 15 min (prevents brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts. Wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
 
module.exports = { generalLimiter, authLimiter };