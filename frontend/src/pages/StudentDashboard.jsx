/**
 * StudentDashboard.jsx
 *
 * Shows two sections:
 *   1. Available exams — published exams the student can take
 *   2. Past attempts  — exam history with scores
 *
 * useEffect fires on mount to fetch both lists simultaneously using Promise.all.
 * Promise.all([a, b]) runs both requests at the same time instead of waiting
 * for one to finish before starting the other — twice as fast.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { getExams }     from '../api/exam.api'
import { getMyHistory } from '../api/result.api'

const StudentDashboard = () => {
  const navigate          = useNavigate()
  const [exams, setExams] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        // Run both requests simultaneously
        const [examsRes, historyRes] = await Promise.all([
          getExams(),
          getMyHistory(),
        ])
        setExams(examsRes.data.data)
        setHistory(historyRes.data.data)
      } catch (err) {
        console.error('Dashboard fetch failed:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  // Check if student already attempted a specific exam
  const getAttempt = (examId) =>
    history.find(h => h.exam?._id === examId || h.examId === examId)

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Available exams */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Available exams</h2>

          {exams.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-400 text-sm">No exams available right now.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {exams.map(exam => {
                const attempt = getAttempt(exam._id)
                const hasAttempted = !!attempt

                return (
                  <div key={exam._id}
                    className="card flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900 truncate">{exam.title}</h3>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{exam.subject}</span>
                        <span>•</span>
                        <span>{exam.durationMinutes} min</span>
                        <span>•</span>
                        <span>{exam.totalMarks} marks</span>
                        <span>•</span>
                        <span>By {exam.createdBy?.name}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Ends: {formatDate(exam.endTime)}
                      </div>
                    </div>

                    {hasAttempted ? (
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-800">
                            {attempt.score}/{attempt.exam?.totalMarks || exam.totalMarks}
                          </p>
                          <p className="text-xs text-gray-400">{attempt.percentage}%</p>
                        </div>
                        <button
                          onClick={() => navigate(`/student/result/${attempt.sessionId}`)}
                          className="btn-secondary text-xs px-3 py-2"
                        >
                          View result
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => navigate(`/student/exam/${exam._id}`)}
                        className="btn-primary flex-shrink-0 text-sm px-5"
                      >
                        Start exam
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Past attempts */}
        {history.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Past attempts</h2>
            <div className="card overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Exam', 'Score', 'Percentage', 'Status', 'Date', ''].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {history.map(h => (
                    <tr key={h.sessionId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {h.exam?.title || 'Exam'}
                        <div className="text-xs text-gray-400">{h.exam?.subject}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {h.score}/{h.exam?.totalMarks}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${
                          h.percentage >= 60 ? 'text-green-600' : 'text-red-500'
                        }`}>
                          {h.percentage}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium
                          ${h.passed === true  ? 'bg-green-50 text-green-700' :
                            h.passed === false ? 'bg-red-50 text-red-600' :
                                                 'bg-gray-100 text-gray-500'}`}>
                          {h.passed === true ? 'Passed' : h.passed === false ? 'Failed' : h.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {formatDate(h.submittedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`/student/result/${h.sessionId}`)}
                          className="text-primary-600 text-xs hover:underline"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

      </div>
    </div>
  )
}

export default StudentDashboard