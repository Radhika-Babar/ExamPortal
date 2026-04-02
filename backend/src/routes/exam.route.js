/**
 * exam.routes.js
 *
 * All exam routes require authentication (router.use(authenticate)).
 * Some additionally require faculty/admin role.
 *
 * Route structure:
 *   GET    /api/exams              → list exams (role-filtered)
 *   POST   /api/exams              → create exam (faculty/admin)
 *   GET    /api/exams/:id          → exam details
 *   PUT    /api/exams/:id          → update exam (faculty/admin)
 *   PATCH  /api/exams/:id/publish  → toggle publish (faculty/admin)
 *   DELETE /api/exams/:id          → delete exam (faculty/admin)
 *   GET    /api/exams/:id/questions → get questions with answers (faculty/admin)
 *
 * Why router.use(authenticate) instead of adding authenticate to each route?
 *   All exam routes need auth. Putting it once on the router applies to every
 *   route defined below it. Less repetition, impossible to forget on one route.
 *   Routes that need ADDITIONAL role checks add requireRole on top.
 */
 
const { Router } = require('express');
const { body }   = require('express-validator');
 
const {
  createExam, getExams, getExamById,
  updateExam, publishExam, deleteExam, getExamQuestions,
} = require('../controllers/exam.controller');
 
const { authenticate }  = require('../middlewares/auth.middleware');
const { requireRole }   = require('../middlewares/role.middleware');
const { asyncHandler }  = require('../middlewares/errorHandler.middleware');
 
const router = Router();
 
// Apply authentication to every route in this file
router.use(authenticate);
 
// ── Validation rules for exam creation/update ──
// Defining once, reused for both POST and PUT
const examValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Exam title is required'),
 
  body('subject')
    .trim()
    .notEmpty().withMessage('Subject is required'),
 
  body('durationMinutes')
    .isInt({ min: 1, max: 300 })
    .withMessage('Duration must be between 1 and 300 minutes'),
 
  body('startTime')
    .isISO8601().withMessage('Start time must be a valid date'),
 
  body('endTime')
    .isISO8601().withMessage('End time must be a valid date'),
 
  body('questions')
    .isArray({ min: 1 }).withMessage('At least one question is required'),
 
  body('questions.*.text')
    .notEmpty().withMessage('Each question must have text'),
 
  body('questions.*.optionA').notEmpty().withMessage('Option A is required'),
  body('questions.*.optionB').notEmpty().withMessage('Option B is required'),
  body('questions.*.optionC').notEmpty().withMessage('Option C is required'),
  body('questions.*.optionD').notEmpty().withMessage('Option D is required'),
 
  body('questions.*.correctOption')
    .isInt({ min: 0, max: 3 })
    .withMessage('Correct option must be 0 (A), 1 (B), 2 (C), or 3 (D)'),
 
  body('questions.*.marks')
    .optional()
    .isFloat({ min: 0 }).withMessage('Marks must be a positive number'),
 
  body('questions.*.negativeMarks')
    .optional()
    .isFloat({ min: 0 }).withMessage('Negative marks must be a positive number'),
];
 
// ── Routes ──
 
router.get('/',    asyncHandler(getExams));
router.get('/:id', asyncHandler(getExamById));
 
// Faculty-only routes
router.post('/',
  requireRole('faculty', 'admin'),
  examValidation,
  asyncHandler(createExam)
);
 
router.put('/:id',
  requireRole('faculty', 'admin'),
  asyncHandler(updateExam)
);
 
router.patch('/:id/publish',
  requireRole('faculty', 'admin'),
  asyncHandler(publishExam)
);
 
router.delete('/:id',
  requireRole('faculty', 'admin'),
  asyncHandler(deleteExam)
);
 
router.get('/:id/questions',
  requireRole('faculty', 'admin'),
  asyncHandler(getExamQuestions)
);
 
module.exports = router;