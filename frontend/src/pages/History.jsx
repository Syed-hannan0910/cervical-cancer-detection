import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { api } from '../api/client'

export default function History() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.history()
      .then(r => setRecords(r.data.assessments))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen mesh-bg">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 page-enter">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Assessment History</h1>
            <p className="text-slate-400 text-sm mt-1">Your past cervical cancer risk analyses</p>
          </div>
          <button onClick={() => navigate('/detection')} className="btn-primary text-sm px-4 py-2">
            + New Assessment
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="spin-ring" />
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-slate-300 mb-2">No assessments yet</h3>
            <p className="text-slate-500 mb-6">Run your first risk analysis to see history here.</p>
            <button onClick={() => navigate('/detection')} className="btn-primary">
              Start Assessment
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {records.map(r => (
              <div key={r.id} className="card border-slate-800 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
                  r.risk_level === 'HIGH' ? 'bg-red-500/10' : 'bg-emerald-500/10'
                }`}>
                  {r.risk_level === 'HIGH' ? '⚠️' : '✅'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    {r.risk_level === 'HIGH'
                      ? <span className="badge-high">HIGH RISK</span>
                      : <span className="badge-low">LOW RISK</span>}
                    {r.cell_type && (
                      <span className="text-xs text-slate-500 font-mono bg-slate-800 px-2 py-0.5 rounded-full">{r.cell_type}</span>
                    )}
                  </div>
                  <p className="text-slate-400 text-sm">
                    Risk probability: <span className="font-mono font-semibold text-slate-200">{(r.probability * 100).toFixed(1)}%</span>
                    {r.cell_confidence && (
                      <> · Cell confidence: <span className="font-mono font-semibold text-slate-200">{r.cell_confidence.toFixed(1)}%</span></>
                    )}
                  </p>
                </div>
                <div className="text-xs text-slate-600 font-mono flex-shrink-0">
                  {new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
