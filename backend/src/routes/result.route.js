/**
 * result.routes.js
 *
 * Route structure:
 *   GET /api/results/my-history          → student's past exams (student only)
 *   GET /api/results/exam/:examId        → all students' results for one exam (faculty/admin)
 *   GET /api/results/:sessionId          → one specific result (student: own only, faculty: any)
 *
 * IMPORTANT: Route order matters in Express.
 *   /my-history must be defined BEFORE /:sessionId
 *   Why? Express matches routes top to bottom.
 *   If /:sessionId comes first, a request to /my-history would match it
 *   with sessionId = "my-history" — wrong route, wrong handler.
 *   Specific routes always before parameterized routes.
 */

const { Router }   = require('express');
const { getMyResult, getExamResults, getMyHistory } = require('../controllers/result.controller');
const { authenticate }  = require('../middlewares/auth.middleware');
const { requireRole }   = require('../middlewares/role.middleware');
const { asyncHandler }  = require('../middlewares/errorHandler.middleware');

const router = Router();

// All result routes require authentication
router.use(authenticate);

// ── Student: view their own exam history ──
// Must be before /:sessionId or "my-history" gets captured as a session ID
router.get('/my-history', requireRole('student'), asyncHandler(getMyHistory));

// ── Faculty/Admin: all results for one exam ──
router.get('/exam/:examId', requireRole('faculty', 'admin'), asyncHandler(getExamResults));

// ── Any authenticated user: specific session result ──
// Controller handles access control (students only see own results)
router.get('/:sessionId', asyncHandler(getMyResult));

module.exports = router;