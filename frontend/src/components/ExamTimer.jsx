/**
 * ExamTimer.jsx
 * Displays the countdown timer during an exam.
 * Turns red when under 5 minutes — visual urgency cue.
 */
import useExamTimer from '../hooks/useExamTimer'

const ExamTimer = ({ sessionId, onExpire }) => {
  const { formattedTime, remainingSeconds } = useExamTimer(sessionId, onExpire)

  const isWarning  = remainingSeconds <= 300 && remainingSeconds > 60  // under 5 min
  const isDanger   = remainingSeconds <= 60                             // under 1 min

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-semibold
      ${isDanger  ? 'bg-red-50 text-red-600 animate-pulse' :
        isWarning ? 'bg-yellow-50 text-yellow-700' :
                    'bg-gray-50 text-gray-800'}`}>
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {formattedTime}
    </div>
  )
}

export default ExamTimer