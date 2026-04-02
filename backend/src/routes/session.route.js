/**
 * session.routes.js
 *
 * Session routes = exam-taking routes.
 * Only students can take exams — requireRole('student') applied to all.
 *
 * Route structure:
 *   POST /api/sessions/start/:examId        → start or resume an exam
 *   POST /api/sessions/:sessionId/answer    → save a single answer
 *   GET  /api/sessions/:sessionId/timer     → sync remaining time
 *   POST /api/sessions/:sessionId/submit    → submit exam manually
 *
 * Note: No validation middleware on answer route because selectedOption
 * can legitimately be 0 (first option), which falsy checks would reject.
 * We handle null/undefined in the controller with nullish coalescing (??).
 */
 
const { Router } = require('express');
const { body }   = require('express-validator');
 
const { startSession, saveAnswer, syncTimer, submitSession } = require('../controllers/session.controller');
const { authenticate }  = require('../middlewares/auth.middleware');
const { requireRole }   = require('../middlewares/role.middleware');
const { asyncHandler }  = require('../middlewares/errorHandler.middleware');
 
const router = Router();
 
// All session routes: must be logged in AND must be a student
router.use(authenticate);
router.use(requireRole('student'));
 
// ── Start or resume an exam ──
router.post('/start/:examId', asyncHandler(startSession));
 
// ── Save a single answer (called on every option click + auto-save) ──
router.post(
  '/:sessionId/answer',
  [
    body('questionId').notEmpty().withMessage('questionId is required'),
    // selectedOption is optional (null = clear answer)
    // isMarkedReview and timeSpentSecs are optional too
  ],
  asyncHandler(saveAnswer)
);
 
// ── Sync timer with server ──
router.get('/:sessionId/timer', asyncHandler(syncTimer));
 
// ── Submit exam manually ──
router.post('/:sessionId/submit', asyncHandler(submitSession));
 
module.exports = router;