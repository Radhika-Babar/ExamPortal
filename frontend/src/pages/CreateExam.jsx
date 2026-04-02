/**
 * CreateExam.jsx
 *
 * Form to create a new exam with a dynamic list of questions.
 * Faculty can add/remove questions — the questions array grows dynamically.
 *
 * Key pattern — controlled form with array of questions:
 *   questions state = array of question objects
 *   updateQuestion(index, field, value) = updates one field on one question
 *   addQuestion() = appends a blank question to the array
 *   removeQuestion(index) = removes a question by index
 *
 * Why not use a form library (React Hook Form / Formik)?
 *   For learning, plain useState is easier to understand.
 *   You can see exactly how state flows. Libraries add abstraction.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { createExam } from '../api/exam.api'
import toast from 'react-hot-toast'

const blankQuestion = () => ({
  text: '',
  optionA: '', optionB: '', optionC: '', optionD: '',
  correctOption: 0,
  marks: 4,
  negativeMarks: 1,
  explanation: '',
})

const OPTION_LABELS = ['A', 'B', 'C', 'D']

const CreateExam = () => {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    title: '',
    subject: '',
    description: '',
    durationMinutes: 30,
    passMarks: '',
    shuffleQuestions: true,
    allowReview: true,
    startTime: '',
    endTime: '',
  })

  const [questions, setQuestions] = useState([blankQuestion()])
  const [loading, setLoading]     = useState(false)
  const [errors, setErrors]       = useState({})

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const updateQuestion = (index, field, value) => {
    setQuestions(prev => prev.map((q, i) =>
      i === index ? { ...q, [field]: value } : q
    ))
  }

  const addQuestion = () => setQuestions(prev => [...prev, blankQuestion()])

  const removeQuestion = (index) => {
    if (questions.length === 1) {
      toast.error('Exam must have at least one question')
      return
    }
    setQuestions(prev => prev.filter((_, i) => i !== index))
  }

  const validate = () => {
    const errs = {}
    if (!form.title.trim())   errs.title   = 'Title is required'
    if (!form.subject.trim()) errs.subject = 'Subject is required'
    if (!form.startTime)      errs.startTime = 'Start time is required'
    if (!form.endTime)        errs.endTime   = 'End time is required'
    if (form.startTime && form.endTime && new Date(form.endTime) <= new Date(form.startTime)) {
      errs.endTime = 'End time must be after start time'
    }
    questions.forEach((q, i) => {
      if (!q.text.trim())    errs[`q${i}_text`]    = 'Question text required'
      if (!q.optionA.trim()) errs[`q${i}_optionA`] = 'Option A required'
      if (!q.optionB.trim()) errs[`q${i}_optionB`] = 'Option B required'
      if (!q.optionC.trim()) errs[`q${i}_optionC`] = 'Option C required'
      if (!q.optionD.trim()) errs[`q${i}_optionD`] = 'Option D required'
    })
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) {
      toast.error('Please fix the errors before submitting')
      return
    }

    setLoading(true)
    try {
      const payload = {
        ...form,
        durationMinutes: parseInt(form.durationMinutes),
        passMarks: form.passMarks ? parseInt(form.passMarks) : undefined,
        questions: questions.map(q => ({
          ...q,
          correctOption: parseInt(q.correctOption),
          marks: parseFloat(q.marks),
          negativeMarks: parseFloat(q.negativeMarks),
        })),
      }
      await createExam(payload)
      toast.success('Exam created successfully!')
      navigate('/faculty/dashboard')
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create exam'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/faculty/dashboard')}
            className="text-gray-400 hover:text-gray-600">←</button>
          <h1 className="text-xl font-semibold text-gray-900">Create new exam</h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          {/* Exam details card */}
          <div className="card flex flex-col gap-4">
            <h2 className="font-medium text-gray-800">Exam details</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input name="title" value={form.title} onChange={handleFormChange}
                  className="input" placeholder="Data Structures Mid-Term" />
                {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                <input name="subject" value={form.subject} onChange={handleFormChange}
                  className="input" placeholder="DSA" />
                {errors.subject && <p className="text-xs text-red-500 mt-1">{errors.subject}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes) *</label>
                <input type="number" name="durationMinutes" value={form.durationMinutes}
                  onChange={handleFormChange} className="input" min="1" max="300" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pass marks</label>
                <input type="number" name="passMarks" value={form.passMarks}
                  onChange={handleFormChange} className="input" placeholder="Optional" min="0" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start time *</label>
                <input type="datetime-local" name="startTime" value={form.startTime}
                  onChange={handleFormChange} className="input" />
                {errors.startTime && <p className="text-xs text-red-500 mt-1">{errors.startTime}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End time *</label>
                <input type="datetime-local" name="endTime" value={form.endTime}
                  onChange={handleFormChange} className="input" />
                {errors.endTime && <p className="text-xs text-red-500 mt-1">{errors.endTime}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea name="description" value={form.description} onChange={handleFormChange}
                className="input resize-none" rows={2} placeholder="Topics covered, instructions..." />
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap gap-6">
              {[
                { name: 'shuffleQuestions', label: 'Shuffle question order' },
                { name: 'allowReview',      label: 'Show answers after submission' },
              ].map(({ name, label }) => (
                <label key={name} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name={name} checked={form[name]}
                    onChange={handleFormChange}
                    className="w-4 h-4 accent-primary-500" />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Questions */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-gray-800">
                Questions
                <span className="ml-2 text-sm text-gray-400 font-normal">
                  ({questions.length} · {questions.reduce((s, q) => s + parseFloat(q.marks || 0), 0)} total marks)
                </span>
              </h2>
            </div>

            {questions.map((q, i) => (
              <div key={i} className="card flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Question {i + 1}</span>
                  <button type="button" onClick={() => removeQuestion(i)}
                    className="text-xs text-red-400 hover:text-red-600">
                    Remove
                  </button>
                </div>

                {/* Question text */}
                <div>
                  <textarea
                    value={q.text}
                    onChange={e => updateQuestion(i, 'text', e.target.value)}
                    className="input resize-none"
                    rows={2}
                    placeholder="Enter your question here..."
                  />
                  {errors[`q${i}_text`] && (
                    <p className="text-xs text-red-500 mt-1">{errors[`q${i}_text`]}</p>
                  )}
                </div>

                {/* Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {['optionA', 'optionB', 'optionC', 'optionD'].map((opt, idx) => (
                    <div key={opt}>
                      <div className="flex items-center gap-2">
                        {/* Correct answer radio */}
                        <input
                          type="radio"
                          name={`correct_${i}`}
                          checked={parseInt(q.correctOption) === idx}
                          onChange={() => updateQuestion(i, 'correctOption', idx)}
                          className="accent-green-500 flex-shrink-0"
                          title={`Mark option ${OPTION_LABELS[idx]} as correct`}
                        />
                        <label className="text-xs text-gray-500 font-medium w-5 flex-shrink-0">
                          {OPTION_LABELS[idx]}
                        </label>
                        <input
                          type="text"
                          value={q[opt]}
                          onChange={e => updateQuestion(i, opt, e.target.value)}
                          className={`input text-sm ${
                            parseInt(q.correctOption) === idx
                              ? 'border-green-400 bg-green-50'
                              : ''}`}
                          placeholder={`Option ${OPTION_LABELS[idx]}`}
                        />
                      </div>
                      {errors[`q${i}_${opt}`] && (
                        <p className="text-xs text-red-500 mt-1 ml-9">{errors[`q${i}_${opt}`]}</p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Marks + explanation */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">+Marks</label>
                    <input type="number" value={q.marks} min="0" step="0.5"
                      onChange={e => updateQuestion(i, 'marks', e.target.value)}
                      className="input text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">-Negative</label>
                    <input type="number" value={q.negativeMarks} min="0" step="0.5"
                      onChange={e => updateQuestion(i, 'negativeMarks', e.target.value)}
                      className="input text-sm" />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    Explanation (shown after submission if review is enabled)
                  </label>
                  <input type="text" value={q.explanation}
                    onChange={e => updateQuestion(i, 'explanation', e.target.value)}
                    className="input text-sm" placeholder="Why is this the correct answer?" />
                </div>
              </div>
            ))}

            {/* Add question */}
            <button
              type="button"
              onClick={addQuestion}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl
                text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600
                transition-colors"
            >
              + Add another question
            </button>
          </div>

          {/* Submit */}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => navigate('/faculty/dashboard')}
              className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="btn-primary flex items-center gap-2">
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {loading ? 'Creating...' : 'Create exam'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

export default CreateExam