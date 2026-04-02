/**
 * ProtectedRoute.jsx
 *
 * Guards routes that require authentication or a specific role.
 *
 * Usage in App.jsx:
 *   <ProtectedRoute>                    → any logged-in user
 *   <ProtectedRoute role="student">     → students only
 *   <ProtectedRoute role="faculty">     → faculty/admin only
 *
 * Three states:
 *   1. Still loading (checking localStorage token) → show spinner
 *   2. Not logged in → redirect to /login
 *   3. Wrong role → redirect to their correct dashboard
 *   4. All good → render the children (the actual page)
 */
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/auth.context'

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth()

  // Auth is still being verified (checking token on page load)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Not logged in at all
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Logged in but wrong role
  if (role === 'student' && user.role !== 'student') {
    return <Navigate to="/faculty/dashboard" replace />
  }
  if (role === 'faculty' && user.role === 'student') {
    return <Navigate to="/student/dashboard" replace />
  }

  return children
}

export default ProtectedRoute