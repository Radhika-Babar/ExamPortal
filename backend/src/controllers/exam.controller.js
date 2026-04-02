/**
 * exam.controller.js
 *
 * Handles: createExam, getExams, getExamById, updateExam, publishExam, deleteExam
 *
 * Who can do what:
 *   createExam    → faculty, admin
 *   getExams      → all authenticated users (students see published only)
 *   getExamById   → all authenticated users
 *   updateExam    → faculty (own exams only), admin
 *   publishExam   → faculty (own exams only), admin
 *   deleteExam    → faculty (own exams only), admin
 */
const { validationResult } = require("express-validator");
const Exam = require("../models/exam.model");
const examSession = require("../models/examSession.model");
const {
  success,
  created,
  notFound,
  badRequest,
  forbidden,
} = require("../utils/apiResponse");
const { text } = require("express");

// ─────────────────────────────────────────────
// POST /api/exams
// ─────────────────────────────────────────────
/**
 * Faculty creates a new exam with all its questions in one request.
 *
 * Why send questions with the exam in one request instead of separately?
 *   Simpler for the frontend — one form submission creates everything.
 *   In MongoDB, since questions are embedded, it's one document save anyway.
 *   Atomic: either the whole exam+questions saves, or nothing does.
 *
 * The pre('save') hook in Exam.model.js auto-computes totalMarks,
 * so we don't need to calculate it here.
 */
const createExam = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return badRequest(res, "Validation failed", errors.array());
  }

  const {
    title,
    subject,
    description,
    durationMinutes,
    passMarks,
    shuffleQuestions = true,
    shuffleOptions = false,
    allowReview = true,
    startTime,
    endTime,
    questions = [],
  } = req.body;

  if (questions.length === 0) {
    return badRequest(res, "An exam must have at least one question");
  }

  // Validate time window
  if (new Date(endTime) <= new Date(startTime)) {
    return badRequest(res, "End time must be after start time");
  }

  // Map incoming questions to match our schema
  // Frontend sends: { text, optionA, optionB, optionC, optionD, correctOption, marks, negativeMarks, explanation }
  // Our schema expects: { text, options: { a, b, c, d }, correctOption, marks, negativeMarks, explanation }
  const formattedQuestions = questions.map((q, index) => ({
    text: q.text,
    options: {
      a: q.optionA,
      b: q.optionB,
      c: q.optionC,
      d: q.optionD,
    },
    correctOption: q.correctOption, // 0=A, 1=B, 2=C, 3=D
    marks: q.marks || 4,
    negativeMarks: q.negativeMarks || 1,
    explanation: q.explanation || "",
    orderIndex: index,
  }));

  // createdBy = the logged-in faculty's ID (set by authenticate middleware)

  const exam = await Exam.create({
    title,
    subject,
    description,
    durationMinutes,
    passMarks,
    shuffleQuestions,
    shuffleOptions,
    allowReview,
    startTime,
    endTime,
    createdBy: req.user.id,
    questions: formattedQuestions,
    // totalMarks is computed automatically by pre('save') hook in the model
  });

  // Populate createdBy so response includes faculty name, not just an ObjectId
  await exam.populate("createdBy", "name email");

  return created(res, exam, "Exam created successfully");
};

// ─────────────────────────────────────────────
// GET /api/exams
// ─────────────────────────────────────────────
/**
 * Returns exams based on who's asking.
 *
 * Students see: published exams whose window is currently open or upcoming
 * Faculty see:  their own exams (all states: draft, published, past)
 * Admin sees:   all exams
 *
 * Why different views?
 *   A faculty member needs to see their drafts. A student shouldn't.
 *   A student only cares about exams they can actually take.
 *
 * .select('-questions'):
 *   The questions array can be large (100+ questions with 4 options each).
 *   Listing exams doesn't need question content — just metadata.
 *   Saves a lot of data transfer. Questions are fetched separately at session start.
 */
const getExams = async (req, res) => {
  let query;

  if (req.user.role === "student") {
    query = Exam.find({
      isPublished: true,
      endTime: { $gt: new Date() }, // $gt = greater than = not yet ended
    });
  } else if (req.user.role === "faculty") {
    query = Exam.find({ createdBy: req.user.id });
  } else {
    //admin
    query = Exam.find({});
  }

  const exams = await query
    .select("-questions.correctOption") // exclude the questions array — too heavy for a list
    .populate("createdBy", "name") // replace ObjectId with just the name
    .sort({ createdAt: -1 }); // newest first

  // For faculty/admin: attach attempt count to each exam
  // This lets the UI show "32 students have attempted this exam"
  // We do this in a second pass to avoid complex aggregation pipelines
  let examsWithMeta = exams;
  if (req.user.role !== "student") {
    examsWithMeta = await Promise.all(
      exams.map(async (exam) => {
        const attemptCount = await examSession.countDocuments({
          exam: exam._id,
        });

        // lean() returns plain JS object, so we can add properties to it
        const examObj = exam.toJSON();
        examObj.attemptCount = attemptCount;
        return examObj;
      }),
    );
  }

  return success(res, examsWithMeta);
};

// ─────────────────────────────────────────────
// GET /api/exams/:id
// ─────────────────────────────────────────────
/**
 * Returns a single exam's metadata (no questions — those load at session start).
 *
 * Why not send questions here?
 *   The student views this page to see exam details before starting.
 *   Sending questions now would expose them before the timer starts.
 *   Questions are only sent when the session is created (POST /api/sessions/start/:examId).
 */
const getExamById = async (req, res) => {
  const exam = await Exam.findById(req.params.id)
    .select("-questions.correctOption")
    .populate("createdBy", "name email");

  if (!exam) return notFound(res, "Exam not found");

  //Students can only see published exams
  if (req.user.role === "student" && !exam.isPublished) {
    return notFound(res, "Exam not Found");
    // Note: we say "not found" instead of "not published" — don't leak existence of drafts
  }

  return success(res, exam);
};

// ─────────────────────────────────────────────
// PUT /api/exams/:id
// ─────────────────────────────────────────────
/**
 * Faculty updates exam details or questions.
 *
 * Critical rule: only allow updates before any student has attempted the exam.
 * Changing questions mid-exam would invalidate existing responses.
 *
 * Why check attemptCount before allowing edit?
 *   If Student A answered Q3 "Option B" and you change Q3 to a different question,
 *   their answer now means something entirely different. Scores become meaningless.
 */
const updateExam = async (req, res) => {
  const exam = await Exam.findById(req.params.id);
  if (!exam) return notFound(res, "Exam not found");

  // Ownership check: faculty can only edit their own exams
  if (
    req.user.role === "faculty" &&
    exam.createdBy.toString() !== req.user.id
  ) {
    return forbidden(res, "You can only edit your own exam");
  }

  // Lock edits once students have started attempting
  const attemptCount = await examSession.countDocuments({ exam: exam._id });
  if (attemptCount > 0) {
    return badRequest(
      res,
      `Cannot edit -${attemptCount} student(s) have already attempted this exam`,
    );
  }

  const {
    title,
    subject,
    description,
    durationMinutes,
    passMarks,
    shuffleQuestions,
    shuffleOptions,
    allowReview,
    startTime,
    endTime,
    questions,
  } = req.body;

  // Update only provided fields
  // Object.assign is fine here, but explicit mapping is clearer
  if (title)           exam.title           = title;
  if (subject)         exam.subject         = subject;
  if (description)     exam.description     = description;
  if (durationMinutes) exam.durationMinutes = durationMinutes;
  if (passMarks)       exam.passMarks       = passMarks;
  if (startTime)       exam.startTime       = startTime;
  if (endTime)         exam.endTime         = endTime;

  if(shuffleQuestions !== undefined) exam.shuffleQuestions = shuffleQuestions;
  if(shuffleOptions !== undefined) exam.shuffleOptions = shuffleOptions;
  if(allowReview !== undefined) exam.allowReview = allowReview;

  // Replace questions array if provided
  if(questions && questions.length > 0){
    exam.questions = questions.map((q, i) => ({
        text: q.text,
        options: {a: q.optionA, b: q.optionB, c:q.optionC, d:q.optionD},
        correctOption: q.correctOption,
        marks: q.marks || 4,
        negativeMarks: q.negativeMarks || 0,
        explanation: q.explanation || '',
        orderIndex: i,
    }))
    //total marks will be recomputed by pre('save') hook
  }

  await exam.save() //triggers pre('save') to recompute totalmarks

  return success(res, exam, 'Exam updated successfully')
};

// ─────────────────────────────────────────────
// PATCH /api/exams/:id/publish
// ─────────────────────────────────────────────
/**
 * Toggles an exam between draft (isPublished: false) and published (true).
 *
 * Why PATCH and not PUT?
 *   HTTP convention:
 *     PUT    = replace the entire resource
 *     PATCH  = partial update (toggle one field)
 *   Using the right HTTP verb makes your API self-documenting.
 *
 * Why a separate endpoint instead of including isPublished in PUT /exams/:id?
 *   Publishing is a deliberate, significant action — separate from editing content.
 *   A faculty member editing typos shouldn't accidentally publish with the same request.
 *   Explicit endpoint = explicit intent.
 */
const publishExam = async(req, res) => {
    const exam = await Exam.findById(req.params.id);
    if(!exam)  return notFound(res, 'Exam not found')
    
    if(req.user.role === 'faculty' && exam.createdBy.toString() !== req.user.id){
        return forbidden(res, 'You can only publish your own exam');
    }

    //basic sanity check before publishing
    if(!exam.isPublished && exam.questions.length === 0){
        return badRequest(res, 'Cannot publish an exam with no questions');
    }

    exam.isPublished =  !exam.isPublished //toggle
    await exam.save();

    const action = exam.isPublished ? 'published' : 'unpublished';
    return success(res, {id: exam._id, isPublished: exam.isPublished}, `Exam ${action} successfully`);
};

// DELETE /api/exams/:id
// ─────────────────────────────────────────────
/**
 * Deletes an exam and all associated sessions/responses.
 *
 * Why allow delete at all?
 *   Faculty needs to clean up test exams created by mistake.
 *
 * Why block delete if students attempted?
 *   Deleting an exam with sessions would orphan the data.
 *   Students who attempted it would have no record of their score.
 *   Policy decision: once attempted, the exam is permanent history.
 */
const deleteExam = async(req, res) => {
    const exam = await Exam.findById(req.params.id);
    if(!exam) return notFound(res, 'Exam not found');

    if(req.user.role === 'faculty' && exam.createdBy.toString() !== req.user.id){
        return forbidden(res, 'You can only delete your own exams');
    }

    const attemptCount = await examSession.countDocuments({ exam: exam._id});
    if(attemptCount > 0){
        return badRequest(res, `Cannot delete -${attemptCount} students have records for this exam`);
    }

    await exam.deleteOne();

    return success(res, null, 'Exam deleted successfully')
}

/**
 * Returns an exam's questions WITH correct answers — for faculty review only.
 * Students never hit this endpoint (requireRole('faculty','admin') in routes).
 */
const getExamQuestions = async (req, res) => {
  const exam = await Exam.findById(req.params.id);
  if (!exam) return notFound(res, 'Exam not found');
 
  if (req.user.role === 'faculty' && exam.createdBy.toString() !== req.user.id) {
    return forbidden(res, 'Access denied');
  }
 
  return success(res, exam.questions);
};
 
module.exports = { createExam, getExams, getExamById, updateExam, publishExam, deleteExam, getExamQuestions };