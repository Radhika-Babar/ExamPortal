import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { getMyResult } from '../api/result.api'

const OPTION_LABELS = ['A', 'B', 'C', 'D']
const OPTION_KEYS   = ['a', 'b', 'c', 'd']

const Result = () => {
  const { sessionId } = useParams()
  const navigate      = useNavigate()
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const res = await getMyResult(sessionId)
        setResult(res.data.data)
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load result')
      } finally {
        setLoading(false)
      }
    }
    fetchResult()
  }, [sessionId])

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={() => navigate('/student/dashboard')} className="btn-secondary">
          Back to dashboard
        </button>
      </div>
    </div>
  )

  const { session, exam, score, correct, wrong, skipped,
          percentage, passed, questionReview } = result

  const scoreColor = percentage >= 60 ? 'text-green-600' : 'text-red-500'

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Score card */}
        <div className="card text-center mb-6">
          <h1 className="text-lg font-semibold text-gray-900 mb-1">{exam?.title}</h1>
          <p className="text-sm text-gray-400 mb-6">{exam?.subject}</p>

          {/* Big score */}
          <div className={`text-6xl font-bold mb-1 ${scoreColor}`}>{percentage}%</div>
          <p className="text-gray-500 text-sm mb-6">
            {score} / {exam?.totalMarks} marks
          </p>

          {/* Passed / Failed badge */}
          {passed !== null && (
            <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold mb-6
              ${passed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {passed ? 'Passed' : 'Failed'}
            </span>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Correct',   value: correct, color: 'text-green-600' },
              { label: 'Wrong',     value: wrong,   color: 'text-red-500'   },
              { label: 'Skipped',   value: skipped, color: 'text-gray-500'  },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-50 rounded-lg p-4">
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
                <div className="text-xs text-gray-500 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Answer review */}
        {questionReview && questionReview.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Answer review</h2>
            <div className="flex flex-col gap-4">
              {questionReview.map((q, i) => (
                <div key={q.questionId}
                  className={`card border-l-4 ${
                    q.isCorrect === true  ? 'border-l-green-500' :
                    q.isCorrect === false ? 'border-l-red-400' :
                                           'border-l-gray-300'
                  }`}>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <p className="text-sm font-medium text-gray-800">
                      <span className="text-gray-400 mr-2">Q{i + 1}.</span>
                      {q.text}
                    </p>
                    <span className={`text-xs font-semibold flex-shrink-0 px-2 py-1 rounded
                      ${q.isCorrect === true  ? 'bg-green-50 text-green-700' :
                        q.isCorrect === false ? 'bg-red-50 text-red-600' :
                                               'bg-gray-100 text-gray-500'}`}>
                      {q.isCorrect === true  ? `+${q.marks}` :
                       q.isCorrect === false ? `-${q.negativeMarks}` : '0'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5">
                    {OPTION_KEYS.map((key, idx) => {
                      const isCorrect  = idx === q.correctOption
                      const isSelected = idx === q.selectedOption
                      const isWrong    = isSelected && !isCorrect

                      return (
                        <div key={key}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                            ${isCorrect ? 'bg-green-50 text-green-800 font-medium' :
                              isWrong   ? 'bg-red-50 text-red-700' :
                                          'text-gray-500'}`}>
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center
                            text-xs font-semibold flex-shrink-0
                            ${isCorrect ? 'bg-green-500 text-white' :
                              isWrong   ? 'bg-red-400 text-white' :
                                          'bg-gray-100 text-gray-400'}`}>
                            {OPTION_LABELS[idx]}
                          </span>
                          {q.options?.[key]}
                          {isCorrect && <span className="ml-auto text-green-600 text-xs">✓ Correct</span>}
                          {isWrong   && <span className="ml-auto text-red-500 text-xs">Your answer</span>}
                        </div>
                      )
                    })}
                  </div>

                  {q.explanation && (
                    <div className="mt-3 text-xs text-gray-500 bg-blue-50 px-3 py-2 rounded-lg">
                      <span className="font-medium text-blue-700">Explanation: </span>
                      {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/student/dashboard')}
            className="btn-secondary"
          >
            Back to dashboard
          </button>
        </div>

      </div>
    </div>
  )
}

export default Result