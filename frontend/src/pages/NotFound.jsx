import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen mesh-bg flex items-center justify-center p-6">
      <div className="text-center page-enter">
        <p className="text-8xl font-bold font-mono gradient-text mb-4">404</p>
        <h1 className="text-2xl font-bold text-white mb-2">Page Not Found</h1>
        <p className="text-slate-400 mb-8 max-w-sm mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/detection" className="btn-primary inline-flex items-center gap-2 px-8">
          ← Back to Assessment
        </Link>
      </div>
    </div>
  )
}
