/**
 * axios.js — the single configured Axios instance for the whole app.
 *
 * Why one instance instead of calling axios directly everywhere?
 *   - One place to set the base URL
 *   - One place to attach the auth token to every request
 *   - One place to handle token expiry (auto-logout or refresh)
 *   - If the backend URL ever changes, you update one file, not 20
 *
 * Interceptors:
 *   Request interceptor  → runs BEFORE every request leaves the browser
 *   Response interceptor → runs AFTER every response arrives
 */
import axios from 'axios'

const api = axios.create({
  // Because vite.config.js proxies /api → localhost:5000,
  // we use /api as the base URL in development.
  // In production, set VITE_API_URL to your deployed backend URL.
  baseURL: 'https://examportal-xrtd.onrender.com/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // fail the request if backend doesn't respond in 10 seconds
})

// ── Request interceptor ──
// Runs before EVERY request. Attaches the JWT token automatically.
// Without this: you'd have to manually add headers to every API call.
api.interceptors.request.use(
  (config) => {
    // Token is stored in memory (AuthContext) but we also keep a copy
    // in localStorage for page refresh persistence
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor ──
// Runs after EVERY response. Handles global error cases.
api.interceptors.response.use(
  // Success: just pass through the response
  (response) => response,

  // Error: check if it's a 401 (token expired/invalid)
  async (error) => {
    const originalRequest = error.config

    // 401 = token expired. Try to refresh it once.
    // _retry flag prevents infinite loop if refresh also fails
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const refreshToken = localStorage.getItem('refreshToken')
      if (refreshToken) {
        try {
          // Call refresh endpoint directly (not through our intercepted instance
          // to avoid infinite loop)
          const res = await axios.post('https://examportal-xrtd.onrender.com/api/auth/refresh', { refreshToken })
          const newToken = res.data.data.accessToken

          localStorage.setItem('accessToken', newToken)
          originalRequest.headers.Authorization = `Bearer ${newToken}`

          // Retry the original failed request with the new token
          return api(originalRequest)
        } catch {
          // Refresh also failed → force logout
          localStorage.clear()
          window.location.href = '/login'
        }
      } else {
        // No refresh token → force logout
        localStorage.clear()
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default api