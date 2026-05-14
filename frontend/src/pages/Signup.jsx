import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { auth } from '../api/client'

const PURPOSES = ['Personal health monitoring', 'Medical research', 'Healthcare professional', 'Student / Education', 'Other']

export default function Signup() {
  const [form, setForm] = useState({
    username: '', password: '', confirm: '', email: '',
    first_name: '', last_name: '', age: '', purpose: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) { setError('Passwords do not match'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      const { username, password, email, first_name, last_name, age, purpose } = form
      await auth.signup({ username, password, email, first_name, last_name, age, purpose })
      navigate('/login', { state: { success: 'Account created! Please sign in.' } })
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen mesh-bg flex items-center justify-center p-6">
      <div className="w-full max-w-2xl page-enter">
        <div className="text-center mb-8">
          <Link to="/login" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors text-sm mb-6">
            ← Back to login
          </Link>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/30">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Create your account</h1>
          <p className="text-slate-400">Join CervixAI for AI-powered health screening</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="card space-y-5 border-slate-700/60">
          {/* Personal info */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Personal Information</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">First Name</label>
                <input className="input-field" placeholder="Jane" value={form.first_name} onChange={set('first_name')} />
              </div>
              <div>
                <label className="label">Last Name</label>
                <input className="input-field" placeholder="Doe" value={form.last_name} onChange={set('last_name')} />
              </div>
              <div>
                <label className="label">Age</label>
                <input className="input-field" type="number" placeholder="28" min="13" max="120" value={form.age} onChange={set('age')} />
              </div>
              <div>
                <label className="label">Purpose of Use</label>
                <select className="input-field" value={form.purpose} onChange={set('purpose')}>
                  <option value="">Select…</option>
                  {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Account credentials */}
          <div className="border-t border-slate-800 pt-5">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Account Credentials</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Email <span className="text-rose-500">*</span></label>
                <input className="input-field" type="email" placeholder="jane@example.com" value={form.email} onChange={set('email')} required />
              </div>
              <div>
                <label className="label">Username <span className="text-rose-500">*</span></label>
                <input className="input-field" placeholder="jane_doe" value={form.username} onChange={set('username')} required autoComplete="username" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Password <span className="text-rose-500">*</span></label>
                  <input className="input-field" type="password" placeholder="••••••••" value={form.password} onChange={set('password')} required minLength={6} autoComplete="new-password" />
                </div>
                <div>
                  <label className="label">Confirm Password <span className="text-rose-500">*</span></label>
                  <input className="input-field" type="password" placeholder="••••••••" value={form.confirm} onChange={set('confirm')} required autoComplete="new-password" />
                </div>
              </div>
            </div>
          </div>

          <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
            {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating account…</> : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-slate-400 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-rose-400 hover:text-rose-300 font-medium transition-colors">Sign in →</Link>
        </p>
      </div>
    </div>
  )
}
