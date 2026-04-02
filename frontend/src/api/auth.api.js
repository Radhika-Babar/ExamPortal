/**
 * auth.api.js
 * All auth-related API calls in one place.
 *
 * Pattern: each function maps to one backend endpoint.
 * Controllers call these, never calling axios directly in components.
 * This way if the endpoint URL changes, you fix it here — not in every component.
 */
import api from './axios.api'

export const registerUser = (data) => api.post('/auth/register', data)
// data = { name, email, password, role, rollNo, department, semester }

export const loginUser = (data) => api.post('/auth/login', data)
// data = { email, password }

export const getMe = () => api.get('/auth/me')
// No data needed — token in header identifies the user

export const refreshToken = (refreshToken) =>
  api.post('/auth/refresh', { refreshToken })

export const logoutUser = () => api.post('/auth/logout')