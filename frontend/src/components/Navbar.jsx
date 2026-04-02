import { Link } from 'react-router-dom'
import { useAuth } from '../context/auth.context'

const Navbar = () => {
  const { user, logout } = useAuth()

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">

        {/* Logo */}
        <Link
          to={user?.role === 'student' ? '/student/dashboard' : '/faculty/dashboard'}
          className="text-lg font-semibold text-primary-600"
        >
          ExamPortal
        </Link>

        {/* Right side */}
        {user && (
          <div className="flex items-center gap-4">
            {/* Role badge */}
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full
              ${user.role === 'student'
                ? 'bg-blue-50 text-blue-700'
                : 'bg-purple-50 text-purple-700'}`}>
              {user.role}
            </span>

            {/* User name */}
            <span className="text-sm text-gray-600">{user.name}</span>

            {/* Logout */}
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navbar