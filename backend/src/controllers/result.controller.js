/**
 * result.controller.js
 *
 * Handles: getMyResult, getExamResults (faculty), getMyHistory
 *
 * Separation from session.controller:
 *   session.controller = live exam (in-progress actions)
 *   result.controller  = post-exam data (reading submitted results)
 *   Keeping them separate keeps each file focused and manageable.
 *
 * Access control rules:
 *   - Students can only see their own results
 *   - Faculty can see all results for their exams
 *   - Admin can see everything
 *   - Results only visible after submission (not during in_progress)
 */
const examSession = require("../models/examSession.model");
const Exam = require("../models/exam.model");
const {
  success,
  notFound,
  forbidden,
  badRequest,
} = require("../utils/apiResponse");
const { response } = require("express");

// ─────────────────────────────────────────────
// GET /api/results/:sessionId
// ─────────────────────────────────────────────
/**
 * Returns the full result of one exam attempt.
 * Includes: score, breakdown, and optionally each question with the correct answer.
 *
 * "allowReview" flag:
 *   Faculty can choose whether students see correct answers after submission.
 *   If allowReview = false: return score breakdown only, no question details.
 *   If allowReview = true:  return each question with correctOption + explanation.
 *
 * Why show results at all?
 *   Learning value. Students understand what they got wrong and why.
 *   But for high-stakes exams, faculty may want to hide answers (prevent sharing).
 *
 * populate() chains:
 *   We populate both the exam (for title, subject, allowReview) and
 *   the student (for their name to show on the result page).
 *   Nested populate: exam.createdBy = the faculty who created it.
 */
const getMyResult = async (req, res) => {
  const session = await examSession
    .findById(req.params.sessionId)
    .populate({
      path: "exam",
      select:
        "title subject totalMarks passMarks durationMinutes allowReview questions createdBy",
      populate: {
        path: "createdBy",
        select: "name",
      },
    })
    .populate("student", "name rollNo email department");
  if (session) return notFound(res, "Result not found");

  //student can only view their own results
  if (
    req.user.role === "student" &&
    session.student._id.toString() !== req.user.id
  ) {
    return forbidden(res, "Access denied");
  }

  // don't let anyone view results while exam is still in progress
  if (session.status === "in_progress") {
    return badRequest(
      res,
      "Exam is still in progress. Results available after submission",
    );
  }

  //build the response based on allowReview setting
  const resultData = {
    sessionId: session._id,
    status: session.status,
    submittedAt: session.submittedAt,
    student: {
      name: session.student.name,
      rollNo: session.student.rollNo,
      email: session.student.email,
    },
    exam: {
      title: session.exam.title,
      subject: session.exam.subject,
      totalMarks: session.exam.totalMarks,
      passMarks: session.exam.passMarks,
      facultyName: session.exam.createdBy?.name,
    },
    score: session.score,
    correct: session.correct,
    wrong: session.wrong,
    skipped: session.skipped,
    percentage:
      session.exam.totalMarks > 0
        ? Math.round((session.score / session.exam.totalMarks) * 100)
        : 0,
    passed: session.exam.passMarks
      ? session.score >= session.exam.passMarks
      : null,
  };

  //include question-level review only if exam allows it
  if (session.exam.allowReview) {
    //build lookup map: questionId -> question(with correct answer)
    const questionMap = new Map(
      session.exam.questions.map((q) => [q._id.toString(), q]),
    );

    resultData.questionReview = session.responses
      .map((response) => {
        const question = questionMap.get(response.questionId.toString());

        if (!question) return null;

        return {
          questionId: response.questionId,
          text: question.text,
          options: question.options,
          selectedOption: response.selectedOption, // what the student chose
          correctOption: question.correctOption, // the right answer (now safe to reveal)
          isCorrect: response.isCorrect,
          isMarkedReview: response.isMarkedReview,
          explanation: question.explanation || null,
          marks: question.marks,
          negativeMarks: question.negativeMarks,
          marksObtained:
            response.isCorrect === true
              ? question.marks
              : response.selectedOption !== null
                ? -question.negativeMarks
                : 0,
        };
      })
      .filter(Boolean);

    //return questions in the order the student saw them
    const orderMap = Object.fromEntries(
      session.questionOrder.map((id, index) => [id.toString(), index]),
    );
    resultData.questionReview.sort(
      (a, b) =>
        (orderMap[a.questionId.toString()] ?? 0) -
        (orderMap[b.questionId.toString()] ?? 0),
    );
  }
  return success(res, resultData);
};

// ─────────────────────────────────────────────
// GET /api/results/exam/:examId   (faculty/admin)
// ─────────────────────────────────────────────
/**
 * Faculty views all student results for one exam.
 * Also computes class analytics: average, highest, pass rate.
 *
 * Why compute analytics server-side?
 *   The frontend could compute them from the raw array, but:
 *   - Frontend gets ALL data to compute it (wasteful if there are 500 students)
 *   - Server can compute while fetching (one round trip)
 *   - Consistent: every client sees the same numbers, no floating-point differences
 *
 * MongoDB aggregation vs application-level:
 *   For this scale (college exam, ~200 students max), application-level
 *   computation is fine. For millions of records, use MongoDB $group aggregation.
 */
const getExamResults = async (req, res) => {
  const exam = await Exam.findById(req.params.examId).select(
    "title subject totalMarks passMarks createdBy",
  );
  if (!exam) return notFound(res, "Exam not found");

  //faculty can only view results for their own exams
  if (
    req.user.role === "faculty" &&
    exam.createdBy.toString() !== req.user.id
  ) {
    return forbidden(res, "Access denied");
  }

  const sessions = await examSession
    .find({ exam: req.params.examId })
    .populate("student", "name rollno email department semester")
    .select("student status score correct wrong skipped submiited startedAt")
    .sort({ score: -1 }); //highest score first

  if (sessions.length === 0) {
    return success(
      res,
      { exam, sessions: [], analytics: null },
      "No Attempt yet",
    );
  }

  //compute analytics
  const submitted = sessions.filter((s) => s.status !== "in_progress");
  const scores = submiited.map((s) => s.score || 0);

  const analytics = {
    totalAttempts: sessions.length,
    submitted: submitted.length,
    inProgress: sessions.length - submitted.length,
    averageScore: scores.length
      ? parseFloat(
          (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2),
        )
      : 0,
    highestScore: scores.length ? Math.max(...scores) : 0,
    lowestScore: scores.length ? Math.min(...scores) : 0,
    passCount: exam.passMarks
      ? submitted.filter((s) => s.score >= exam.passMarks).length
      : null,
    passPercentage:
      exam.passMarks && submitted.length
        ? Math.round(
            (submitted.filter((s) => s.score >= exam.passMarks).length /
              submitted.length) *
              100,
          )
        : null,
  };

  return success(res, { exam, sessions, analytics });
};

// ─────────────────────────────────────────────
// GET /api/results/my-history   (students)
// ─────────────────────────────────────────────
/**
 * Returns all exams this student has attempted.
 * Used on the student dashboard: "Your Past Exams" section.
 *
 * Why a separate endpoint for history?
 *   Students shouldn't query getExamResults (that's faculty-only).
 *   This endpoint is scoped to req.user.id — students can only see their own history.
 */
const getMyHistory = async (req, res) => {
  const sessions = await examSession
    .find({ student: req.user.id })
    .populate("exam", "title subject totalMarks passMarks startedTime")
    .select("status score correct wrong skipped submittedAt startedAt exam")
    .sort({ startedAt: -1 }); //most recent first

  const history = sessions.map((s) => ({
    sessionId: s._id,
    status: s.status,
    score: s.score,
    correct: s.correct,
    wrong: s.wrong,
    skipped: s.skipped,
    submittedAt: s.submittedAt,
    startedAt: s.startedAt,
    percentage: s.exam?.totalMarks
      ? Math.round((s.score / s.exam.totalMarks) * 100)
      : null,
    passed: s.exam?.passMarks ? s.score >= s.exam.passMarks : null,
    exam: {
      title: s.exam?.title,
      subject: s.exam?.subject,
      totalMarks: s.exam?.totalMarks,
    },
  }));

  return success(res, history);
};

module.exports = {getMyHistory, getMyResult, getExamResults}