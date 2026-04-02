import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { getExamResults } from '../api/result.api'

const ExamResults = () => {
  const { examId } = useParams()
  const navigate   = useNavigate()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getExamResults(examId)
        setData(res.data.data)
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load results')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [examId])

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  }) : '—'

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
        <button onClick={() => navigate('/faculty/dashboard')} className="btn-secondary">Back</button>
      </div>
    </div>
  )

  const { exam, sessions, analytics } = data

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/faculty/dashboard')}
            className="text-gray-400 hover:text-gray-600">←</button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{exam?.title}</h1>
            <p className="text-sm text-gray-400">{exam?.subject} · {exam?.totalMarks} marks</p>
          </div>
        </div>

        {/* Analytics cards */}
        {analytics && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total attempts',  value: analytics.totalAttempts },
              { label: 'Submitted',       value: analytics.submitted },
              { label: 'Average score',   value: `${analytics.averageScore}` },
              { label: 'Pass rate',       value: analytics.passPercentage !== null
                  ? `${analytics.passPercentage}%` : 'N/A' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">{value}</div>
                <div className="text-xs text-gray-400 mt-1">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Score range */}
        {analytics && analytics.submitted > 0 && (
          <div className="card mb-6 flex gap-8">
            <div>
              <p className="text-xs text-gray-400">Highest score</p>
              <p className="text-lg font-semibold text-green-600">{analytics.highestScore}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Lowest score</p>
              <p className="text-lg font-semibold text-red-500">{analytics.lowestScore}</p>
            </div>
            {analytics.passCount !== null && (
              <div>
                <p className="text-xs text-gray-400">Passed</p>
                <p className="text-lg font-semibold text-gray-800">
                  {analytics.passCount} / {analytics.submitted}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Students table */}
        <div className="card overflow-hidden p-0">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-medium text-gray-700">Student results</h2>
          </div>

          {sessions.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              No students have attempted this exam yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['#', 'Student', 'Roll No', 'Score', '%', 'Status', 'Submitted'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sessions.map((s, i) => {
                  const pct = exam?.totalMarks
                    ? Math.round((s.score / exam.totalMarks) * 100)
                    : null
                  const passed = exam?.passMarks ? s.score >= exam.passMarks : null

                  return (
                    <tr key={s._id || i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {s.student?.name || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {s.student?.rollNo || '—'}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {s.score !== null ? s.score : '—'}/{exam?.totalMarks}
                      </td>
                      <td className="px-4 py-3">
                        {pct !== null ? (
                          <span className={`font-medium ${pct >= 60 ? 'text-green-600' : 'text-red-500'}`}>
                            {pct}%
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium
                          ${s.status === 'submitted' || s.status === 'auto_submitted'
                            ? passed === true  ? 'bg-green-50 text-green-700'
                            : passed === false ? 'bg-red-50 text-red-600'
                            :                   'bg-blue-50 text-blue-700'
                            : 'bg-gray-100 text-gray-500'}`}>
                          {s.status === 'auto_submitted' ? 'Auto-submitted'
                           : s.status === 'submitted'    ? 'Submitted'
                           :                               'In progress'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {formatDate(s.submittedAt)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  )
}

export default ExamResults