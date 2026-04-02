/**
 * Login.jsx
 *
 * Public page. If user is already logged in, redirect to their dashboard.
 *
 * Form state is managed with useState — simple and readable.
 * On submit: call loginUser API → on success call auth.login() which
 * stores tokens and navigates automatically.
 *
 * Error handling:
 *   err.response?.data?.message → the message our backend sends
 *   Fallback to generic message if network error or unexpected shape
 */
import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/auth.context'
import { loginUser } from '../api/auth.api'
import toast from 'react-hot-toast'

const Login = () => {
  const { user, login } = useAuth()
  const [form, setForm]       = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  // Already logged in → skip this page
  if (user) {
    return <Navigate to={user.role === 'student' ? '/student/dashboard' : '/faculty/dashboard'} replace />
  }

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('') // clear error on edit
  }

  const handleSubmit = async (e) => {
    e.preventDefault() // prevent browser default form submission (page reload)
    setLoading(true)
    setError('')

    try {
      const res  = await loginUser(form)
      const data = res.data.data
      login(data.user, data.accessToken, data.refreshToken)
      // login() in AuthContext handles navigation and toast
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">ExamPortal</h1>
          <p className="text-gray-500 mt-1 text-sm">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="card">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Error message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="input"
                placeholder="you@college.edu"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="input"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary mt-2 flex items-center justify-center gap-2"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>

          </form>
        </div>

        {/* Register link */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary-600 font-medium hover:underline">
            Register here
          </Link>
        </p>

      </div>
    </div>
  )
}

export default Login