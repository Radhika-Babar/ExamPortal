/**
 * QuestionPalette.jsx
 *
 * The grid of numbered buttons on the right side during an exam.
 * Each button shows the status of that question at a glance.
 *
 * Status colours:
 *   Green  → answered
 *   Amber  → marked for review
 *   White  → not visited / unanswered
 *   Blue   → currently viewing
 */
import { useExam } from "../context/exam.context";

const QuestionPalette = ({ onSubmit }) => {
  const {
    questions,
    responses,
    markedReview,
    currentIndex,
    goToQuestion,
    answeredCount,
  } = useExam();

  const getStatus = (questionId, index) => {
    if (index === currentIndex) return "current";
    if (markedReview.has(questionId)) return "marked";
    if (responses[questionId] !== null && responses[questionId] !== undefined)
      return "answered";
    return "unanswered";
  };

  const statusClass = {
    current: "bg-primary-500 text-white border-primary-500",
    answered: "bg-green-500 text-white border-green-500",
    marked: "bg-amber-400 text-white border-amber-400",
    unanswered: "bg-white text-gray-600 border-gray-200 hover:border-gray-400",
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-4">
      {/* Legend */}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Question palette
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {[
            { color: "bg-green-500", label: "Answered" },
            { color: "bg-amber-400", label: "Marked" },
            { color: "bg-white border border-gray-300", label: "Not answered" },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-sm ${color}`} />
              <span className="text-xs text-gray-500">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Grid of question numbers */}
      <div className="grid grid-cols-5 gap-1.5">
        {questions.map((q, index) => {
          const status = getStatus(q._id, index);
          return (
            <button
              key={q._id}
              onClick={() => goToQuestion(index)}
              className={`h-8 w-full rounded-md border text-xs font-medium
                transition-all ${statusClass[status]}`}
            >
              {index + 1}
            </button>
          );
        })}
      </div>

      {/* Summary stats */}
      <div className="border-t border-gray-100 pt-3 flex justify-between text-xs text-gray-500">
        <span>{answeredCount} answered</span>
        <span>{markedReview.size} marked</span>
        <span>{questions.length - answeredCount} left</span>
      </div>

      {/* Submit button */}
      <button onClick={onSubmit} className="w-full btn-primary">
        Submit exam
      </button>
    </div>
  );
};

export default QuestionPalette;
