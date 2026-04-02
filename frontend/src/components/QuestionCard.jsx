/**
 * QuestionCard.jsx
 *
 * Displays a single MCQ question with 4 clickable options.
 * Called from ExamRoom with the current question and response state.
 *
 * Props:
 *   question      → { _id, text, options: {a,b,c,d}, marks, negativeMarks }
 *   selectedOption → 0|1|2|3|null — what student currently has selected
 *   isMarked       → boolean — flagged for review
 *   questionNumber → display number (1-based index)
 *   totalQuestions → total count for "Q3 of 10" display
 *   onSelect       → fn(option) called when student clicks an option
 *   onToggleMark   → fn() called when student clicks "Mark for review"
 */
const OPTION_LABELS = ['A', 'B', 'C', 'D']
const OPTION_KEYS   = ['a', 'b', 'c', 'd']

const QuestionCard = ({
  question,
  selectedOption,
  isMarked,
  questionNumber,
  totalQuestions,
  onSelect,
  onToggleMark,
}) => {
  if (!question) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-5">

      {/* Question header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium text-gray-400">
              Question {questionNumber} of {totalQuestions}
            </span>
            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">
              +{question.marks} marks
            </span>
            <span className="text-xs font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded">
              -{question.negativeMarks} negative
            </span>
          </div>
          <p className="text-gray-900 text-base leading-relaxed font-medium">
            {question.text}
          </p>
        </div>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-3">
        {OPTION_KEYS.map((key, index) => {
          const isSelected = selectedOption === index
          return (
            <button
              key={key}
              onClick={() => onSelect(index)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-left
                transition-all duration-150 text-sm
                ${isSelected
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
            >
              {/* Letter circle */}
              <span className={`w-7 h-7 rounded-full flex items-center justify-center
                text-xs font-semibold flex-shrink-0 transition-colors
                ${isSelected
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-500'
                }`}>
                {OPTION_LABELS[index]}
              </span>
              <span className="leading-relaxed">{question.options[key]}</span>
            </button>
          )
        })}
      </div>

      {/* Mark for review toggle */}
      <div className="flex items-center pt-1">
        <button
          onClick={onToggleMark}
          className={`flex items-center gap-2 text-sm transition-colors
            ${isMarked ? 'text-amber-600 font-medium' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <svg className="w-4 h-4" fill={isMarked ? 'currentColor' : 'none'}
            viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          {isMarked ? 'Marked for review' : 'Mark for review'}
        </button>
      </div>

    </div>
  )
}

export default QuestionCard