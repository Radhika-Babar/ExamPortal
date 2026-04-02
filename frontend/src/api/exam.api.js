import api from './axios.api'

export const getExams       = ()         => api.get('/exams')
export const getExamById    = (id)       => api.get(`/exams/${id}`)
export const createExam     = (data)     => api.post('/exams', data)
export const updateExam     = (id, data) => api.put(`/exams/${id}`, data)
export const publishExam    = (id)       => api.patch(`/exams/${id}/publish`)
export const deleteExam     = (id)       => api.delete(`/exams/${id}`)
export const getExamQuestions = (id)     => api.get(`/exams/${id}/questions`)