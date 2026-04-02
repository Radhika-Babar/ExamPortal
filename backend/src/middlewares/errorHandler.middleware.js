/**
 * errorHandler.js
 *
 * Global error handler — catches everything that falls through,
 * including Mongoose validation errors, cast errors, and unhandled throws.
 * Must be the LAST middleware registered in app.js.
 *
 * asyncHandler wraps async route functions so you never need
 * try/catch in controllers — any thrown error lands here automatically.
 */
const env = require('../config/env');
 
const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
 
  // Mongoose: document failed schema validation
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ success: false, message: messages.join(', ') });
  }
 
  // Mongoose: invalid ObjectId format (e.g. /api/exams/not-a-valid-id)
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }
 
  // MongoDB: duplicate unique field (e.g. email already exists)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
    });
  }
 
  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    // only show stack traces during development
    ...(env.nodeEnv === 'development' && { stack: err.stack }),
  });
};
 
/**
 * asyncHandler
 * Wraps async route handlers to forward errors to errorHandler automatically.
 *
 * Without:  async (req, res, next) => { try { ... } catch(e) { next(e) } }
 * With:     asyncHandler(async (req, res) => { ... })
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
 
module.exports = { errorHandler, asyncHandler };