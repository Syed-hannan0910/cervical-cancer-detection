/**
 * ProgressBar — labelled horizontal progress bar used for class probabilities
 */
export default function ProgressBar({ label, value, color = '#f43f5e', showPercent = true }) {
  const pct = Math.min(100, Math.max(0, value * 100))
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400 truncate mr-2">{label}</span>
        {showPercent && (
          <span className="font-mono font-semibold flex-shrink-0" style={{ color }}>
            {pct.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}
