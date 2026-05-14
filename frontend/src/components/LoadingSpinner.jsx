/**
 * LoadingSpinner — Full-page and inline loading states
 */

export function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return (
    <div
      className={`rounded-full border-2 border-slate-700 border-t-rose-500 animate-spin ${sizes[size]} ${className}`}
    />
  )
}

export function PageLoader({ message = 'Loading…' }) {
  return (
    <div className="min-h-screen mesh-bg flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="spin-ring mx-auto" />
        <p className="text-slate-400 text-sm font-mono">{message}</p>
      </div>
    </div>
  )
}

export function InlineLoader({ message = 'Processing…' }) {
  return (
    <div className="flex items-center gap-3 py-6 justify-center">
      <Spinner size="sm" />
      <span className="text-slate-400 text-sm">{message}</span>
    </div>
  )
}
