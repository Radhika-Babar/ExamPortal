import api from "./axios.api";

export const startSession = (examId) => api.post(`/sessions/start/${examId}`);
export const saveAnswer = (sessionId, data) =>
  api.post(`/sessions/${sessionId}/answer`, data);
// data = { questionId, selectedOption, isMarkedReview, timeSpentSecs }
export const syncTimer = (sessionId) => api.get(`/sessions/${sessionId}/timer`);
export const submitSession = (sessionId) =>
  api.post(`/sessions/${sessionId}/submit`);
