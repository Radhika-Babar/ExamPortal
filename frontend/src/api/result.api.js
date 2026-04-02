import api from './axios.api'
 
export const getMyResult    = (sessionId) => api.get(`/results/${sessionId}`)
export const getExamResults = (examId)    => api.get(`/results/exam/${examId}`)
export const getMyHistory   = ()          => api.get('/results/my-history')