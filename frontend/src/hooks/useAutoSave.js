/**
 * useAutoSave.js
 *
 * Saves the student's current answer to the backend.
 * Called every time an option is selected AND on a 30-second interval.
 *
 * Why save on every click AND on interval?
 *   On click: immediate persistence. If browser crashes 5 seconds after answering,
 *             the answer is already saved.
 *   On interval: catches any missed saves, also sends timeSpentSecs update.
 *
 * Debouncing:
 *   If a student clicks rapidly through options (A → B → C in 2 seconds),
 *   we don't want to fire 3 API calls. We wait 500ms after the last click.
 *   Only the final choice gets saved. This is debouncing.
 *
 * Why not save ALL answers at once?
 *   One answer at a time keeps each save small and fast.
 *   If one save fails, others aren't affected.
 *   The server uses the $ positional operator to update just one response.
 */
import { useCallback, useRef } from 'react'
import { saveAnswer } from '../api/session.api'

const useAutoSave = (sessionId) => {
  const debounceRef = useRef({}) // holds debounce timer per questionId

  /**
   * save — debounced answer save
   * @param questionId  - the question being answered
   * @param selectedOption - 0,1,2,3 or null (cleared)
   * @param isMarkedReview - boolean
   * @param timeSpentSecs  - how long student spent on this question
   */
  const save = useCallback((questionId, selectedOption, isMarkedReview = false, timeSpentSecs = 0) => {
    if (!sessionId) return

    // Clear any pending debounce for this question
    if (debounceRef.current[questionId]) {
      clearTimeout(debounceRef.current[questionId])
    }

    // Wait 500ms before actually sending
    debounceRef.current[questionId] = setTimeout(async () => {
      try {
        await saveAnswer(sessionId, {
          questionId,
          selectedOption,
          isMarkedReview,
          timeSpentSecs,
        })
      } catch (err) {
        // Silent fail on save — don't interrupt the student with an error
        // The periodic sync will catch it
        console.error('Auto-save failed for question', questionId, err.message)
      }
    }, 500)
  }, [sessionId])

  /**
   * saveImmediate — saves without debounce delay.
   * Used just before submission to ensure latest answers are persisted.
   */
  const saveImmediate = useCallback(async (questionId, selectedOption, isMarkedReview = false) => {
    if (!sessionId) return
    try {
      await saveAnswer(sessionId, { questionId, selectedOption, isMarkedReview })
    } catch (err) {
      console.error('Immediate save failed', err.message)
    }
  }, [sessionId])

  return { save, saveImmediate }
}

export default useAutoSave