/**
 * timer.service.js
 *
 * ALWAYS calculate remaining time from the server clock, never trust the browser.
 * A student can pause JS execution, slow DevTools, or change their system clock.
 *
 * We store session.startedAt in MongoDB when the exam begins.
 * Every answer-save request passes through hasExpired() — if time is up, we reject it.
 */
const getRemainingSeconds = (startedAt, durationMinutes) => {
  const endMs = new Date(startedAt).getTime() + durationMinutes * 60 * 1000;
  return Math.max(0, Math.floor((endMs - Date.now()) / 1000));
};
 
const hasExpired = (startedAt, durationMinutes) =>
  getRemainingSeconds(startedAt, durationMinutes) === 0;
 
module.exports = { getRemainingSeconds, hasExpired };