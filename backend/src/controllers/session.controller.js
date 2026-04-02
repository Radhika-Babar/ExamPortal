/**
 * session.controller.js
 *
 * This is the most critical and complex controller in the whole app.
 * It is the exam engine — the thing that makes exam-taking actually work.
 *
 * Handles:
 *   startSession   → student begins an exam
 *   saveAnswer     → student selects an option (called on every click + auto-save)
 *   syncTimer      → frontend polls every 30s to stay in sync with server clock
 *   submitSession  → student submits manually
 *
 * Key security invariants enforced here:
 *   1. Correct answers NEVER leave the server before submission
 *   2. Timer is computed server-side on every request — browser timer is cosmetic only
 *   3. A student cannot save answers to a session that isn't theirs
 *   4. A student cannot save answers after time has expired
 *   5. One session per student per exam (enforced by DB unique index + code check)
 */

const Exam           = require('../models/exam.model');
const ExamSession    = require('../models/examSession.model');
const { shuffleArray }     = require('../utils/shuffle');
const { getRemainingSeconds, hasExpired } = require('../services/timer.service');
const { calculateScore }                 = require('../services/grading.service');
const { success, created, notFound, badRequest, forbidden } = require('../utils/apiResponse');

// ─────────────────────────────────────────────
// POST /api/sessions/start/:examId
// ─────────────────────────────────────────────
/**
 * Student clicks "Start Exam". This is the most important function.
 *
 * Two scenarios handled:
 *   A) Fresh start → create session, shuffle questions, pre-create responses
 *   B) Resume      → student refreshed browser mid-exam, return existing session
 *
 * Why handle resume?
 *   Without it: browser refresh = lose all progress = angry students.
 *   The session row in DB acts as a checkpoint. Same shuffle order, same responses.
 *
 * Why pre-create empty response rows?
 *   Performance. During the exam, every answer save is a simple $set update
 *   on an existing embedded document. No need to check "does this response exist?"
 *   before deciding to INSERT vs UPDATE. Pre-created = always UPDATE.
 */
const startSession = async (req, res) => {
  const { examId }  = req.params;
  const studentId   = req.user.id;

  // ── 1. Fetch and validate the exam ──
  const exam = await Exam.findById(examId);

  if (!exam)              return notFound(res, 'Exam not found');
  if (!exam.isPublished)  return notFound(res, 'Exam not found');  // don't reveal draft existence

  const now = new Date();
  if (now < new Date(exam.startTime)) {
    const minutesUntilStart = Math.ceil((new Date(exam.startTime) - now) / 60000);
    return badRequest(res, `Exam hasn't started yet. Starts in ${minutesUntilStart} minutes.`);
  }
  if (now > new Date(exam.endTime)) {
    return badRequest(res, 'This exam has ended and is no longer accepting attempts.');
  }

  // ── 2. Check for existing session (resume scenario) ──
  const existingSession = await ExamSession.findOne({ student: studentId, exam: examId });

  if (existingSession) {
    if (existingSession.status !== 'in_progress') {
      return badRequest(res, 'You have already submitted this exam. Check your results.');
    }

    // Check if time expired since they last left
    if (hasExpired(existingSession.startedAt, exam.durationMinutes)) {
      await finalizeSession(existingSession._id, exam._id, 'auto_submitted');
      return badRequest(res, 'Your exam time expired while you were away. It has been auto-submitted.');
    }

    // Resume: return existing session with current state
    // Strip correct answers before sending (same rule as fresh start)
    const safeQuestions = getQuestionsInOrder(exam.questions, existingSession.questionOrder);

    return success(res, {
      session:          existingSession,
      questions:        safeQuestions,
      responses:        existingSession.responses,
      remainingSeconds: getRemainingSeconds(existingSession.startedAt, exam.durationMinutes),
      isResume:         true,
    }, 'Session resumed');
  }

  // ── 3. Fresh start: shuffle questions ──
  // exam.questions is the original ordered array from faculty
  // We make a shuffled copy for THIS student
  let orderedQuestions = [...exam.questions];
  if (exam.shuffleQuestions) {
    orderedQuestions = shuffleArray(orderedQuestions);
  }

  // Store only the IDs in order — the actual question data lives in the Exam doc
  const questionOrder = orderedQuestions.map(q => q._id);

  // ── 4. Pre-create empty response slots ──
  // One slot per question, all with selectedOption: null (unanswered)
  const emptyResponses = orderedQuestions.map(q => ({
    questionId:      q._id,
    selectedOption:  null,
    isCorrect:       null,
    isMarkedReview:  false,
    timeSpentSecs:   0,
    answeredAt:      null,
  }));

  // ── 5. Create the session document ──
  const session = await ExamSession.create({
    student:       studentId,
    exam:          examId,
    questionOrder: questionOrder,
    responses:     emptyResponses,
    status:        'in_progress',
    // startedAt defaults to now() via the model default
  });

  // ── 6. Build safe questions (NO correctOption, NO explanation) ──
  const safeQuestions = getQuestionsInOrder(exam.questions, questionOrder);

  return created(res, {
    session,
    questions:        safeQuestions,
    responses:        session.responses,
    remainingSeconds: getRemainingSeconds(session.startedAt, exam.durationMinutes),
    isResume:         false,
  }, 'Exam started. Good luck!');
};

// ─────────────────────────────────────────────
// POST /api/sessions/:sessionId/answer
// ─────────────────────────────────────────────
/**
 * Called when student clicks an option. Also called by auto-save every 30 seconds.
 *
 * Security checks on every call:
 *   1. Session exists AND belongs to THIS student (not another student's session)
 *   2. Session is still in_progress (not already submitted)
 *   3. Server-side time check — time hasn't expired
 *
 * Why check ownership explicitly?
 *   Without it: student A crafts a request with student B's sessionId.
 *   If we only check "does session exist?", student A modifies student B's answers.
 *   With student filter: session must belong to req.user.id — ownership enforced.
 *
 * Why the positional $ operator for the update?
 *   We're updating ONE element inside the embedded responses array.
 *   responses.$.selectedOption means "the responses element that matched
 *   the query condition 'responses.questionId: questionId'".
 */
const saveAnswer = async (req, res) => {
  const { sessionId }                                   = req.params;
  const { questionId, selectedOption, isMarkedReview, timeSpentSecs } = req.body;

  // ── 1. Fetch session with exam duration (needed for timer check) ──
  // We populate exam but only fetch durationMinutes — no need for questions here
  const session = await ExamSession.findOne({
    _id:     sessionId,
    student: req.user.id,   // ownership check — this is critical
  }).populate('exam', 'durationMinutes');

  if (!session)                          return forbidden(res, 'Session not found or access denied');
  if (session.status !== 'in_progress') return badRequest(res, 'This exam has already been submitted');

  // ── 2. Server-side timer check ──
  if (hasExpired(session.startedAt, session.exam.durationMinutes)) {
    // Auto-submit — don't let them save any more answers
    await finalizeSession(session._id, session.exam._id, 'auto_submitted');
    return badRequest(res, 'Time is up! Your exam has been automatically submitted.');
  }

  // ── 3. Update the specific response in the embedded array ──
  // The query part: { _id: sessionId, 'responses.questionId': questionId }
  //   finds the session AND the specific response in the array
  // The update part: $set with $ positional operator updates JUST that response
  await ExamSession.updateOne(
    {
      _id:                    session._id,
      'responses.questionId': questionId,  // match the correct response in the array
    },
    {
      $set: {
        'responses.$.selectedOption': selectedOption ?? null,
        // selectedOption can be 0 (option A), so we can't use || — use ?? (nullish coalescing)
        // ?? returns right side only if left side is null or undefined (not 0 or false)
        'responses.$.isMarkedReview': isMarkedReview ?? false,
        'responses.$.timeSpentSecs':  timeSpentSecs  ?? 0,
        'responses.$.answeredAt':     selectedOption !== null && selectedOption !== undefined
          ? new Date()
          : null,
      },
    }
  );

  // Return remaining time so frontend can re-sync its display timer
  const remainingSeconds = getRemainingSeconds(session.startedAt, session.exam.durationMinutes);

  return success(res, { remainingSeconds }, 'Answer saved');
};

// ─────────────────────────────────────────────
// GET /api/sessions/:sessionId/timer
// ─────────────────────────────────────────────
/**
 * Frontend polls this endpoint every 30 seconds.
 * Returns authoritative remaining time from server clock.
 *
 * Why poll instead of WebSocket?
 *   WebSockets are real-time and efficient but add significant complexity
 *   (socket.io setup, connection management, reconnection handling).
 *   For an exam timer, polling every 30 seconds is perfectly fine.
 *   The client timer does smooth second-by-second countdown locally.
 *   This just re-syncs it every 30s to prevent drift.
 *
 * Why 30 seconds? Balance between:
 *   - Too frequent (5s): many extra requests, server load
 *   - Too infrequent (5min): timer could drift by minutes
 *   30s means max 2-second drift between polls — imperceptible to students.
 */
const syncTimer = async (req, res) => {
  const session = await ExamSession.findOne({
    _id:     req.params.sessionId,
    student: req.user.id,
  }).populate('exam', 'durationMinutes');

  if (!session) return notFound(res, 'Session not found');

  const remainingSeconds = getRemainingSeconds(session.startedAt, session.exam.durationMinutes);

  // If time ran out since last sync, auto-submit
  if (remainingSeconds === 0 && session.status === 'in_progress') {
    await finalizeSession(session._id, session.exam._id, 'auto_submitted');
    return success(res, { remainingSeconds: 0, status: 'auto_submitted' });
  }

  return success(res, { remainingSeconds, status: session.status });
};

// ─────────────────────────────────────────────
// POST /api/sessions/:sessionId/submit
// ─────────────────────────────────────────────
/**
 * Student manually clicks "Submit Exam".
 *
 * We allow early submission — student may finish before time.
 * Calls finalizeSession which: marks correct/incorrect, calculates score, updates status.
 */
const submitSession = async (req, res) => {
  const session = await ExamSession.findOne({
    _id:     req.params.sessionId,
    student: req.user.id,
  });

  if (!session)                          return notFound(res, 'Session not found');
  if (session.status !== 'in_progress') return badRequest(res, 'This exam was already submitted');

  const scoreData = await finalizeSession(session._id, session.exam, 'submitted');

  return success(res, scoreData, 'Exam submitted successfully!');
};

// ─────────────────────────────────────────────
// Internal helper: finalizeSession
// ─────────────────────────────────────────────
/**
 * Used by both manual submit and auto-submit.
 * Does the actual grading and marks the session as complete.
 *
 * Why a shared helper?
 *   DRY principle. submitSession and the timer expiry both need the same logic.
 *   A helper ensures they behave identically — no risk of one doing it differently.
 *
 * Steps:
 *   1. Fetch the session's current responses
 *   2. Fetch the exam's questions with correct answers
 *   3. Calculate score using grading service (pure function)
 *   4. Mark each response as correct/incorrect
 *   5. Update session: status, submittedAt, score breakdown
 */
const finalizeSession = async (sessionId, examId, status = 'submitted') => {
  // Fetch session — need responses array
  const session = await ExamSession.findById(sessionId);

  // Fetch exam WITH correct answers (we're server-side now, safe to access)
  // We need the full question data including correctOption
  const exam = await Exam.findById(examId || session.exam);

  // Use the grading service (pure function, easy to test)
  const scoreData = calculateScore(session.responses, exam.questions);

  // Mark each individual response as correct or incorrect
  // This enables the "review answers" view after submission
  const updatedResponses = session.responses.map(response => {
    const question = exam.questions.find(
      q => q._id.toString() === response.questionId.toString()
    );

    if (!question || response.selectedOption === null) {
      return { ...response.toObject(), isCorrect: null }; // skipped
    }

    return {
      ...response.toObject(),
      isCorrect: response.selectedOption === question.correctOption,
    };
  });

  // Update session in DB with final score
  await ExamSession.findByIdAndUpdate(sessionId, {
    status,
    submittedAt:  new Date(),
    score:        scoreData.score,
    correct:      scoreData.correct,
    wrong:        scoreData.wrong,
    skipped:      scoreData.skipped,
    responses:    updatedResponses,
  });

  return {
    score:      scoreData.score,
    maxMarks:   scoreData.maxMarks,
    correct:    scoreData.correct,
    wrong:      scoreData.wrong,
    skipped:    scoreData.skipped,
    percentage: scoreData.percentage,
    status,
  };
};

// ─────────────────────────────────────────────
// Internal helper: getQuestionsInOrder
// ─────────────────────────────────────────────
/**
 * Reconstructs the shuffled question list in the student's specific order
 * AND strips correctOption + explanation before sending to client.
 *
 * Why strip fields here and not in the model?
 *   The model's select: false only works at the document level.
 *   Questions are embedded sub-documents — their fields don't have select: false.
 *   We manually omit them here before sending.
 *
 * This function is called both on fresh start AND resume,
 * guaranteeing both return questions in exactly the same order.
 */
const getQuestionsInOrder = (allQuestions, questionOrder) => {
  // Build a lookup map: questionId string → question object
  // O(1) lookup instead of O(n) find for each question
  const questionMap = new Map(
    allQuestions.map(q => [q._id.toString(), q])
  );

  return questionOrder.map(qId => {
    const q = questionMap.get(qId.toString());
    if (!q) return null;

    // Return only safe fields — NEVER send correctOption or explanation
    return {
      _id:        q._id,
      text:       q.text,
      options:    q.options,      // { a, b, c, d }
      marks:      q.marks,
      negativeMarks: q.negativeMarks,
      orderIndex: q.orderIndex,
      // correctOption: OMITTED
      // explanation: OMITTED
    };
  }).filter(Boolean); // remove any nulls (shouldn't happen, but defensive)
};

module.exports = { startSession, saveAnswer, syncTimer, submitSession };