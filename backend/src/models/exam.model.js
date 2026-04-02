/**
 * exam.model.js
 *
 * This is where MongoDB's document model really shines over SQL.
 * In PostgreSQL we had TWO tables: exams + questions (with a foreign key).
 * In MongoDB, questions are EMBEDDED directly inside the exam document.
 *
 * Why embed?
 * - Questions only ever make sense in context of their exam
 * - You always fetch them together (no JOIN needed)
 * - Atomic updates: save exam + questions in one operation
 *
 * When NOT to embed (put in separate collection instead):
 * - The subdocument grows unboundedly (e.g. comments on a post)
 * - You need to query subdocuments independently
 * - The parent document would exceed MongoDB's 16MB document limit
 *
 * For exams, embedding is perfect: bounded size, always fetched together.
 */

const { text } = require("express");
const mongoose = require("mongoose");

// Sub-schema for a single MCQ question
// correct_option: 0=A, 1=B, 2=C, 3=D
const questionSchema = new mongoose.Schema({
    text: {type: String, required: true},
    options: {
       a: {type: String, required: true},
       b: {type: String, required: true},
       c: {type: String, required: true},
       d: {type: String, required: true}
    },
    correctOption: {
        type: Number,
        required: true,
        min: 0,
        max: 3,
        select: false      // never sent to the student's browser
    },
    marks: {type: Number, default: 4},
    negativeMarks: {type: Number, default: 0},
    explaination: {
        type: String,
        select: false,       // hidden during exam, revealed after submission
    },
    orderIndex: {type: Number, default: 0},
}, {_id: true})             // _id: true gives each question its own unique ID

const examSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    durationMinutes: {
        type: Number,
        required: true,
        min: 1,
        max: 300
    },
    totalMarks: {
        type: Number
    },
    passMarks: {
        type: Number
    },
    shuffleQuestions: {
        type: Boolean,
        default: true
    },
    shuffleOptions :{
        type: Boolean,
        default: false
    },
    allowReview: {
        type: Boolean,
        default: true
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    },
    isPublished: {
        type: Boolean,
        default: false
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    questions: [questionSchema],      // embedded array of questions
}, {timestamps: true});

// Auto-compute totalMarks whenever the document is saved
examSchema.pre('save', function() {
    if(this.questions && this.questions.length > 0){
        this.totalMarks = this.questions.reduce((sum, q) => sum + q.marks, 0);
    }
    //next();
});

// Virtual field: question count (not stored in DB, computed on demand)
examSchema.virtual('questionCount').get(function() {
    return this.questions?.length || 0;
});

examSchema.set('toJSON', {virtuals: true, versionKey: false});

const examModel = mongoose.model('Exam', examSchema);

module.exports = examModel;