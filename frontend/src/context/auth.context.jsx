/**
 * AuthContext.jsx
 *
 * Provides global authentication state to the entire app.
 *
 * What is React Context?
 *   Normally, to share data between components you pass props down:
 *   App → Page → Component → SubComponent (prop drilling — messy).
 *   Context lets any component ACCESS shared state directly, no prop passing.
 *
 * What this context provides:
 *   user        → the logged-in user object { id, name, email, role }
 *   loading     → true while checking if user is already logged in (page refresh)
 *   login()     → call this after successful API login
 *   logout()    → clears everything, redirects to /login
 *   isStudent() → helper to check role
 *   isFaculty() → helper to check role
 *
 * localStorage strategy:
 *   accessToken  → stored so it survives page refresh
 *   refreshToken → stored for silent token renewal
 *   user         → stored so dashboard loads instantly without an API call
 *
 * Why not store everything in localStorage?
 *   localStorage persists across tabs and sessions. Sensitive data (like tokens)
 *   should have the shortest lifetime needed. React state is cleared on tab close.
 *   We use localStorage only for tokens (needed across refreshes) not for
 *   sensitive display data.
 */
import { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMe } from '../api/auth.api'
import toast from 'react-hot-toast'

// 1. Create the context object
const AuthContext = createContext(null)

// 2. Provider component — wraps the whole app in App.jsx
export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true) // true on first load
  const navigate              = useNavigate()

  // On every page load/refresh: check if a token exists and verify it
  // This is what keeps users logged in after they refresh the browser
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken')

      if (!token) {
        setLoading(false)
        return
      }

      try {
        // Token exists — verify it's still valid and get fresh user data
        const res = await getMe()
        setUser(res.data.data)
      } catch {
        // Token is expired or invalid — clear storage
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  /**
   * login() — called by the Login page after successful API response
   * Stores tokens, sets user state, navigates to correct dashboard
   */
  const login = (userData, accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    setUser(userData)

    // Navigate based on role
    if (userData.role === 'student') {
      navigate('/student/dashboard')
    } else if (userData.role === 'faculty' || userData.role === 'admin') {
      navigate('/faculty/dashboard')
    }

    toast.success(`Welcome back, ${userData.name.split(' ')[0]}!`)
  }

  /**
   * logout() — clears all auth state and redirects to login
   */
  const logout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setUser(null)
    navigate('/login')
    toast.success('Logged out successfully')
  }

  const isStudent = () => user?.role === 'student'
  const isFaculty = () => user?.role === 'faculty' || user?.role === 'admin'

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isStudent, isFaculty }}>
      {children}
    </AuthContext.Provider>
  )
}

// 3. Custom hook — how any component accesses the context
// Usage: const { user, logout } = useAuth()
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}