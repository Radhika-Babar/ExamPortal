/**
 * ExamSession.model.js
 *
 * One document per student per exam attempt.
 * Tracks: which student, which exam, what order they saw questions in,
 * all their answers, and the final score.
 *
 * The `responses` array is embedded because:
 * - It's bounded (one per question, never grows beyond that)
 * - We always need all responses when loading/submitting the session
 * - Updates are frequent (every answer save) — embedding keeps it one operation
 *
 * SQL equivalent: exam_sessions table + responses table, joined every time.
 * MongoDB: one document read/write covers both.
 */

const mongoose = require("mongoose");

const responseSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    selectecOption: {
      type: Number,
      min: 0,
      max: 3,
      default: null,
    },
    isCorrect: {
      type: Boolean,
      default: null,
    },
    isMarkedReview: {
      type: Boolean,
      default: false,
    },
    timeSpentSecs: {
      type: Number,
      default: 0,
    },
    answerAt: Date,
  },
  { _id: false },
); // _id: false — responses don't need their own ID

const examSessionSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Exam",
    required: true,
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  submittedAt: Date,
  status: {
    type: String,
    enum: ["in_progress", "submitted", "auto_submitted"],
    default: "in_progress",
  },

  // Stores the shuffled question order for this specific student.
  // Array of question ObjectIds in the order they were presented
  questionOrder: [mongoose.Schema.Types.ObjectId],

  responses: [responseSchema],

   // Computed score (set on submission)
   score: {
    type: Number,
    default: null
   },
   correct: {
    type: Number,
    default: 0
   },
   wrpng: {
    type: Number,
    default: 0
   },
   skipped: {
    type: Number,
    default: 0
   }
}, {timestamps: true});

// Prevent a student from having two sessions for the same exam
examSessionSchema.index({student: 1, exam: 1}, {unique: true});

const examSessionModel = mongoose.model('ExamSession', examSessionSchema);

module.exports = examSessionModel;