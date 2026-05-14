import { useBackendStatus } from '../hooks/useBackendStatus'

/**
 * BackendStatusBanner
 * -------------------
 * Shows a non-blocking notice when the Render free-tier backend is cold-starting.
 * Drop this inside any page that makes API calls.
 */
export default function BackendStatusBanner() {
  const { status, models } = useBackendStatus()

  if (status === 'checking') return (
    <div className="flex items-center gap-2.5 text-xs text-slate-500 py-1 mb-2">
      <div className="w-3 h-3 rounded-full border border-slate-600 border-t-slate-400 animate-spin flex-shrink-0" />
      Connecting to backend…
    </div>
  )

  if (status === 'waking') return (
    <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/8 border border-amber-500/25 text-sm mb-4">
      <span className="text-amber-400 text-base flex-shrink-0">⏳</span>
      <div>
        <p className="font-semibold text-amber-400 text-xs uppercase tracking-widest mb-0.5">Backend waking up</p>
        <p className="text-slate-400 text-xs leading-relaxed">
          The Render free-tier server is starting after a period of inactivity.
          This takes about 30–60 seconds. The page will become interactive automatically.
        </p>
      </div>
    </div>
  )

  if (status === 'error') return (
    <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-sm mb-4">
      <span className="text-red-400 text-base flex-shrink-0">⚠️</span>
      <div>
        <p className="font-semibold text-red-400 text-xs uppercase tracking-widest mb-0.5">Backend Unreachable</p>
        <p className="text-slate-400 text-xs leading-relaxed">
          Could not connect to the API. Check that the backend is deployed and
          <code className="mx-1 px-1 bg-slate-800 rounded font-mono">VITE_API_URL</code>
          is set correctly in Vercel.
        </p>
      </div>
    </div>
  )

  // status === 'ok'
  if (!models.xgboost || !models.fastvit) return (
    <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/8 border border-amber-500/25 text-sm mb-4">
      <span className="text-amber-400 text-base flex-shrink-0">⚠️</span>
      <div>
        <p className="font-semibold text-amber-400 text-xs uppercase tracking-widest mb-0.5">Model Files Missing</p>
        <p className="text-slate-400 text-xs leading-relaxed">
          Backend is running but model files were not found.
          {!models.xgboost && ' XGBoost model missing.'}{!models.fastvit && ' FastViT model missing.'}
          {' '}Ensure <code className="px-1 bg-slate-800 rounded font-mono">backend/model/</code> contains all four model files (see README).
        </p>
      </div>
    </div>
  )

  return null  // all ok — show nothing
}
