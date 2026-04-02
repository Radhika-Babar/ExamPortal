/**
 * ExamRoom.jsx
 *
 * The live exam taking page. The most important and complex page.
 *
 * Responsibilities:
 *   1. On mount: call POST /sessions/start/:examId
 *   2. Initialize ExamContext with returned data
 *   3. Render QuestionCard + QuestionPalette + ExamTimer
 *   4. On option click: update context + trigger auto-save
 *   5. On submit: confirm → POST /sessions/:id/submit → navigate to result
 *   6. On timer expire: auto-submit silently
 *
 * Why useRef for questionStartTime?
 *   We track how many seconds the student spends on each question.
 *   useRef holds a mutable value that doesn't cause re-renders when changed.
 *   useState would re-render on every second — bad for performance.
 */
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { useExam } from "../context/exam.context";
import { startSession, submitSession } from "../api/session.api";
import useAutoSave from "../hooks/useAutoSave";

import ExamTimer from "../components/ExamTimer";
import QuestionCard from "../components/QuestionCard";
import QuestionPalette from "../components/QuestionPalette";

const ExamRoom = () => {
  const { examId } = useParams(); // from URL: /student/exam/:examId
  const navigate = useNavigate();

  const {
    session,
    questions,
    responses,
    markedReview,
    currentIndex,
    initExam,
    selectOption,
    toggleMarkReview,
    goNext,
    goPrev,
    setSubmitted,
  } = useExam();

  const [pageLoading, setPageLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");

  // Track time spent per question
  const questionStartTime = useRef(Date.now());

  const { save } = useAutoSave(session?._id);

  // ── Load the exam session on mount ──
  useEffect(() => {
    const load = async () => {
      try {
        const res = await startSession(examId);
        const data = res.data.data;
        initExam(
          data.session,
          data.questions,
          data.responses,
          data.remainingSeconds,
        );
        if (data.isResume) toast("Resuming your exam", { icon: "↩️" });
      } catch (err) {
        const msg = err.response?.data?.message || "Could not load exam";
        setError(msg);
      } finally {
        setPageLoading(false);
      }
    };
    load();
  }, [examId]);

  // ── Reset question timer when question changes ──
  useEffect(() => {
    questionStartTime.current = Date.now();
  }, [currentIndex]);

  // ── Handle option selection ──
  const handleSelect = useCallback(
    (option) => {
      const question = questions[currentIndex];
      if (!question) return;

      const timeSpent = Math.floor(
        (Date.now() - questionStartTime.current) / 1000,
      );

      selectOption(question._id, option);
      save(question._id, option, markedReview.has(question._id), timeSpent);
    },
    [questions, currentIndex, markedReview, selectOption, save],
  );

  // ── Handle mark for review ──
  const handleToggleMark = useCallback(() => {
    const question = questions[currentIndex];
    if (!question) return;
    toggleMarkReview(question._id);
    // Save the mark status immediately
    save(
      question._id,
      responses[question._id] ?? null,
      !markedReview.has(question._id),
      0,
    );
  }, [
    questions,
    currentIndex,
    toggleMarkReview,
    markedReview,
    responses,
    save,
  ]);

  // ── Submit exam ──
  const handleSubmit = async () => {
    setSubmitLoading(true);
    try {
      const res = await submitSession(session._id);
      setSubmitted(true);
      toast.success("Exam submitted successfully!");
      navigate(`/student/result/${session._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Submit failed. Try again.");
    } finally {
      setSubmitLoading(false);
      setShowConfirm(false);
    }
  };

  // ── Auto-submit when timer expires ──
  const handleExpire = useCallback(async () => {
    toast("Time is up! Submitting your exam...", { icon: "⏰" });
    try {
      await submitSession(session._id);
      setSubmitted(true);
      navigate(`/student/result/${session._id}`);
    } catch {
      toast.error("Auto-submit failed. Contact your faculty.");
    }
  }, [session, navigate]);

  // ── Loading state ──
  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading your exam...</p>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="card max-w-md w-full text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Cannot load exam
          </h2>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <button
            onClick={() => navigate("/student/dashboard")}
            className="btn-secondary"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar — exam title + timer */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-sm font-semibold text-gray-900 truncate">
              {session?.exam?.title || "Exam in progress"}
            </h1>
            <p className="text-xs text-gray-400">
              {questions.length} questions · Stay on this tab
            </p>
          </div>
          <ExamTimer sessionId={session?._id} onExpire={handleExpire} />
        </div>
      </header>

      {/* Main layout — question left, palette right */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6 items-start">
          {/* Left: question + navigation */}
          <div className="flex flex-col gap-4">
            <QuestionCard
              question={currentQuestion}
              selectedOption={responses[currentQuestion?._id] ?? null}
              isMarked={markedReview.has(currentQuestion?._id)}
              questionNumber={currentIndex + 1}
              totalQuestions={questions.length}
              onSelect={handleSelect}
              onToggleMark={handleToggleMark}
            />

            {/* Prev / Next navigation */}
            <div className="flex justify-between">
              <button
                onClick={goPrev}
                disabled={currentIndex === 0}
                className="btn-secondary"
              >
                ← Previous
              </button>

              {currentIndex < questions.length - 1 ? (
                <button onClick={goNext} className="btn-primary">
                  Next →
                </button>
              ) : (
                <button
                  onClick={() => setShowConfirm(true)}
                  className="btn-primary bg-green-600 hover:bg-green-700"
                >
                  Review & Submit
                </button>
              )}
            </div>
          </div>

          {/* Right: palette + submit */}
          <div className="lg:sticky lg:top-20">
            <QuestionPalette onSubmit={() => setShowConfirm(true)} />
          </div>
        </div>
      </div>

      {/* Submit confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Submit exam?
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              You have answered{" "}
              <span className="font-medium text-gray-800">
                {Object.values(responses).filter((v) => v !== null).length}
              </span>{" "}
              of{" "}
              <span className="font-medium text-gray-800">
                {questions.length}
              </span>{" "}
              questions. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="btn-secondary flex-1"
                disabled={submitLoading}
              >
                Go back
              </button>
              <button
                onClick={handleSubmit}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
                disabled={submitLoading}
              >
                {submitLoading && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {submitLoading ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamRoom;
