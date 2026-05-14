import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => { logout(); navigate('/login') }

  const navLink = (to, label) => (
    <Link
      to={to}
      className={`text-sm font-medium transition-colors ${
        location.pathname === to
          ? 'text-rose-400'
          : 'text-slate-400 hover:text-slate-100'
      }`}
    >
      {label}
    </Link>
  )

  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/60">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/detection" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="font-bold text-slate-100">
            Cervix<span className="gradient-text">AI</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navLink('/detection', 'Assessment')}
          {navLink('/history', 'History')}
        </nav>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 bg-slate-800/60 rounded-full px-3 py-1.5">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-rose-400 to-plum-500 flex items-center justify-center text-xs font-bold text-white">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <span className="text-sm text-slate-300">{user?.username}</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-slate-500 hover:text-rose-400 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
