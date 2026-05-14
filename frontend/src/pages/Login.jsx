import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form)
      navigate('/detection')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen mesh-bg flex">
      {/* Left — Branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] bg-gradient-to-br from-rose-950/60 via-slate-900 to-plum-950/40 border-r border-slate-800 p-12">
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/30">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">Cervix<span className="gradient-text">AI</span></span>
          </div>

          <h1 className="font-display text-4xl text-white leading-tight mb-6">
            AI-Powered<br />
            <em className="not-italic gradient-text">Early Detection</em><br />
            Saves Lives
          </h1>
          <p className="text-slate-400 text-base leading-relaxed">
            Our two-stage framework combines XGBoost risk prediction with FastViT cytological
            image classification — delivering explainable, accurate cervical cancer screening.
          </p>
        </div>

        <div className="space-y-4">
          {[
            { icon: '🎯', label: 'XGBoost Risk Score', sub: 'SHAP-explained clinical prediction' },
            { icon: '🔬', label: 'FastViT Cell Analysis', sub: 'Grad-CAM visual heatmaps' },
            { icon: '📄', label: 'PDF Report Export', sub: 'Share with your physician' },
          ].map(f => (
            <div key={f.label} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
              <span className="text-xl">{f.icon}</span>
              <div>
                <p className="text-sm font-semibold text-slate-200">{f.label}</p>
                <p className="text-xs text-slate-500">{f.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right — Login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md page-enter">
          <h2 className="text-3xl font-bold text-white mb-1">Welcome back</h2>
          <p className="text-slate-400 mb-8">Sign in to your CervixAI account</p>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Username</label>
              <input className="input-field" placeholder="your_username" value={form.username}
                onChange={set('username')} required autoFocus />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input-field" type="password" placeholder="••••••••"
                value={form.password} onChange={set('password')} required />
            </div>
            <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
              {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in…</> : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-slate-400 text-sm">
            Don't have an account?{' '}
            <Link to="/signup" className="text-rose-400 hover:text-rose-300 font-medium transition-colors">
              Create one →
            </Link>
          </p>

          <p className="mt-8 text-center text-xs text-slate-600 leading-relaxed">
            ⚠ This tool is for informational purposes only and does not replace medical advice.
          </p>
        </div>
      </div>
    </div>
  )
}
