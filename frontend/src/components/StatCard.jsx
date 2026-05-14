/**
 * StatCard — small metric display card used across Results and History pages
 */
export default function StatCard({ icon, label, value, sub, accentColor = 'text-rose-400' }) {
  return (
    <div className="card border-slate-800 flex items-center gap-4 py-4">
      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-xl flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 uppercase tracking-widest font-mono">{label}</p>
        <p className={`text-xl font-bold font-mono truncate ${accentColor}`}>{value}</p>
        {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
