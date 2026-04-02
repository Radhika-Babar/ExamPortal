/**
 * ExamContext.jsx
 *
 * Manages all state during an active exam session.
 * Shared between: ExamRoom page, QuestionCard, QuestionPalette, ExamTimer.
 *
 * Why a separate context from AuthContext?
 *   AuthContext is always alive (whole app lifetime).
 *   ExamContext only matters during an exam — it's mounted when exam starts,
 *   unmounted when exam ends. Keeping them separate keeps each focused.
 *
 * State managed here:
 *   session        → the session document from the backend
 *   questions      → array of questions (WITHOUT correct answers)
 *   responses      → object mapping questionId → selectedOption
 *   markedReview   → Set of questionIds flagged for review
 *   currentIndex   → which question is currently displayed
 *   remainingSeconds → server-synced countdown
 */
import { createContext, useContext, useState, useCallback } from 'react'

const ExamContext = createContext(null)

export const ExamProvider = ({ children }) => {
  const [session,          setSession]          = useState(null)
  const [questions,        setQuestions]        = useState([])
  const [responses,        setResponses]        = useState({})
  // responses shape: { [questionId]: selectedOption (0-3) or null }
  const [markedReview,     setMarkedReview]     = useState(new Set())
  const [currentIndex,     setCurrentIndex]     = useState(0)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [submitted,        setSubmitted]        = useState(false)

  /**
   * initExam — called when session starts (fresh or resume)
   * Sets up all state from the backend's start response
   */
  const initExam = useCallback((sessionData, questionsData, responsesData, remaining) => {
    setSession(sessionData)
    setQuestions(questionsData)
    setRemainingSeconds(remaining)
    setSubmitted(false)
    setCurrentIndex(0)

    // Convert responses array from backend into a lookup object
    // Backend: [{ questionId, selectedOption }, ...]
    // We want: { "questionId1": 2, "questionId2": null, ... }
    const responseMap = {}
    const reviewSet   = new Set()

    responsesData.forEach(r => {
      responseMap[r.questionId] = r.selectedOption ?? null
      if (r.isMarkedReview) reviewSet.add(r.questionId)
    })

    setResponses(responseMap)
    setMarkedReview(reviewSet)
  }, [])

  /**
   * selectOption — student clicks an option
   * Updates local state immediately (instant UI feedback)
   * The actual API save happens in useAutoSave hook
   */
  const selectOption = useCallback((questionId, option) => {
    setResponses(prev => ({ ...prev, [questionId]: option }))
  }, [])

  /**
   * toggleMarkReview — student flags/unflags a question
   */
  const toggleMarkReview = useCallback((questionId) => {
    setMarkedReview(prev => {
      const next = new Set(prev)
      next.has(questionId) ? next.delete(questionId) : next.add(questionId)
      return next
    })
  }, [])

  const goToQuestion  = useCallback((index) => setCurrentIndex(index), [])
  const goNext        = useCallback(() => setCurrentIndex(i => Math.min(i + 1, questions.length - 1)), [questions.length])
  const goPrev        = useCallback(() => setCurrentIndex(i => Math.max(i - 1, 0)), [])

  // Stats for the palette legend
  const answeredCount = Object.values(responses).filter(v => v !== null).length
  const skippedCount  = questions.length - answeredCount

  return (
    <ExamContext.Provider value={{
      session, questions, responses, markedReview,
      currentIndex, remainingSeconds, submitted,
      answeredCount, skippedCount,
      setRemainingSeconds, setSubmitted,
      initExam, selectOption, toggleMarkReview,
      goToQuestion, goNext, goPrev,
    }}>
      {children}
    </ExamContext.Provider>
  )
}

export const useExam = () => {
  const context = useContext(ExamContext)
  if (!context) throw new Error('useExam must be used inside ExamProvider')
  return context
}