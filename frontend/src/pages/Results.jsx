import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Alert from '../components/Alert'
import ProgressBar from '../components/ProgressBar'
import { api } from '../api/client'

const CLASS_COLORS = {
  'Dyskeratotic': '#f43f5e',
  'Koilocytotic': '#f97316',
  'Metaplastic': '#a855f7',
  'Parabasal': '#3b82f6',
  'Superficial-Intermediate': '#10b981'
}

function RiskBadge({ level }) {
  return level === 'HIGH'
    ? <span className="badge-high">🔴 HIGH RISK</span>
    : <span className="badge-low">🟢 LOW RISK</span>
}



export default function Results() {
  const navigate = useNavigate()
  const [result, setResult] = useState(null)
  const [imageResult, setImageResult] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  useEffect(() => {
    const raw = sessionStorage.getItem('cervixai_result')
    if (!raw) { navigate('/detection'); return }
    setResult(JSON.parse(raw))
  }, [navigate])

  if (!result) return null

  const isHigh = result.risk_level === 'HIGH'

  const handleImageUpload = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPG, PNG, BMP)')
      return
    }
    setError('')
    setUploading(true)
    const formData = new FormData()
    formData.append('image', file)
    try {
      const { data } = await api.uploadImage(formData)
      setImageResult(data)
    } catch (err) {
      setError(err.response?.data?.error || 'Image analysis failed.')
    } finally {
      setUploading(false)
    }
  }

  const handleDownloadReport = async () => {
    setDownloading(true)
    try {
      const payload = {
        probability: result.probability,
        user_input: result.user_input,
        cell_type: imageResult?.cell_type,
        cell_confidence: imageResult?.confidence
      }
      const { data } = await api.downloadReport(payload)
      const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `cervixai_report_${Date.now()}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Report download failed.')
    } finally {
      setDownloading(false)
    }
  }

  const pct = (result.probability * 100).toFixed(1)
  const riskColor = isHigh ? '#f43f5e' : '#10b981'

  return (
    <div className="min-h-screen mesh-bg">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8 page-enter">

        {/* Header */}
        <div className="text-center">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 ${isHigh ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
            <span className="text-4xl">{isHigh ? '⚠️' : '✅'}</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Assessment Complete</h1>
          <p className="text-slate-400">Your cervical cancer risk analysis results</p>
        </div>

        {/* Risk Overview */}
        <div className={`card border ${isHigh ? 'border-red-500/30 bg-red-950/20' : 'border-emerald-500/30 bg-emerald-950/20'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <RiskBadge level={result.risk_level} />
              <h2 className="text-2xl font-bold text-white mt-2">
                {isHigh ? 'High Risk Detected' : 'Low Risk Detected'}
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                {isHigh
                  ? 'Please consult a gynaecologist promptly for further evaluation.'
                  : 'Your risk profile is within low-risk parameters. Continue regular screenings.'}
              </p>
            </div>
            <div className="flex-shrink-0 text-center">
              <div className="text-5xl font-bold font-mono" style={{ color: riskColor }}>{pct}%</div>
              <div className="text-xs text-slate-500 mt-1 uppercase tracking-widest">Risk Probability</div>
            </div>
          </div>
          {/* Probability bar */}
          <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${riskColor}80, ${riskColor})` }} />
          </div>
        </div>

        {/* Input Summary */}
        <div className="card border-slate-800">
          <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <span>📋</span> Input Summary
          </h3>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
            {[
              ['Age', `${result.user_input?.age} years`],
              ['Schiller Test', result.user_input?.schiller ? 'Positive' : 'Negative'],
              ['Citology', result.user_input?.citology ? 'Positive' : 'Negative'],
              ['Dx: CIN', result.user_input?.dx_cin ? 'Yes' : 'No'],
              ['Genital Herpes', result.user_input?.genital_herpes ? 'Yes' : 'No'],
              ['STDs Count', result.user_input?.stds_number],
              ['Sexual Partners', result.user_input?.sexual_partners],
              ['First Intercourse Age', `${result.user_input?.first_intercourse} yrs`],
              ['Pregnancies', result.user_input?.pregnancies],
              ['Smoking', `${result.user_input?.smoking} packs/yr`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-1.5 border-b border-slate-800/60 last:border-0">
                <span className="text-slate-500">{k}</span>
                <span className="font-medium text-slate-200">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SHAP Plot */}
        {result.shap_plot && (
          <div className="card border-slate-800">
            <h3 className="font-semibold text-slate-200 mb-1 flex items-center gap-2">
              <span>🔍</span> SHAP Feature Impact
            </h3>
            <p className="text-xs text-slate-500 mb-4">Each bar shows how a feature influenced the prediction. Red pushes toward higher risk, blue toward lower.</p>
            <img src={`data:image/png;base64,${result.shap_plot}`} alt="SHAP analysis"
              className="w-full rounded-xl border border-slate-700/50" />
          </div>
        )}

        {/* Cytological Image Upload — only for high risk */}
        {isHigh && (
          <div className="card border-amber-500/30 bg-amber-950/10">
            <div className="flex items-start gap-3 mb-5">
              <span className="text-2xl">🔬</span>
              <div>
                <h3 className="font-semibold text-slate-200">Stage 2 — Cytological Analysis</h3>
                <p className="text-xs text-slate-400 mt-1">
                  High risk detected. Upload a cervical cell microscopy image for FastViT classification with Grad-CAM heatmap.
                </p>
              </div>
            </div>

            {!imageResult && (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleImageUpload(e.dataTransfer.files[0]) }}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                  dragOver ? 'border-rose-500 bg-rose-500/5' : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/30'
                }`}
              >
                {uploading ? (
                  <div className="space-y-3">
                    <div className="spin-ring mx-auto" />
                    <p className="text-sm text-slate-400">Analysing cell morphology…</p>
                    <p className="text-xs text-slate-600">Running FastViT + Grad-CAM (may take 30–60s)</p>
                  </div>
                ) : (
                  <>
                    <div className="text-4xl mb-3">🖼️</div>
                    <p className="text-sm font-medium text-slate-300">Drop image here or click to browse</p>
                    <p className="text-xs text-slate-500 mt-1">Supports JPG, PNG, BMP — max 16MB</p>
                  </>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => handleImageUpload(e.target.files[0])} />
              </div>
            )}

            <Alert type="error" message={error} onDismiss={() => setError('')} className="mt-3" />

            {imageResult && (
              <div className="space-y-5 mt-2 page-enter">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-800/60 border border-slate-700">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                    style={{ background: `${CLASS_COLORS[imageResult.cell_type]}20` }}>🔬</div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 uppercase tracking-widest">Classified as</p>
                    <p className="font-bold text-lg" style={{ color: CLASS_COLORS[imageResult.cell_type] }}>
                      {imageResult.cell_type}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Confidence</p>
                    <p className="font-mono font-bold text-xl text-white">{imageResult.confidence.toFixed(1)}%</p>
                  </div>
                </div>

                {/* Class probabilities */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Class Probabilities</p>
                  {Object.entries(imageResult.probabilities).map(([cls, prob]) => (
                    <ProgressBar key={cls} label={cls} value={prob} color={CLASS_COLORS[cls] || '#94a3b8'} />
                  ))}
                </div>

                {/* Grad-CAM */}
                {imageResult.gradcam && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                      Grad-CAM Heatmap — Model attention regions
                    </p>
                    <img src={`data:image/png;base64,${imageResult.gradcam}`} alt="Grad-CAM"
                      className="w-full max-w-sm mx-auto rounded-xl border border-slate-700/50" />
                  </div>
                )}

                <button onClick={() => setImageResult(null)} className="btn-secondary text-sm w-full">
                  Upload Different Image
                </button>
              </div>
            )}
          </div>
        )}

        {/* Recommendations */}
        <div className="card border-slate-800">
          <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2"><span>💡</span> Recommendations</h3>
          <ul className="space-y-2.5 text-sm">
            {(isHigh ? [
              'Consult a gynaecologist within 1–2 weeks for colposcopy evaluation.',
              'Discuss biopsy options with your physician based on these findings.',
              'Avoid smoking — it significantly increases cervical cancer progression risk.',
              'Ensure HPV vaccination is up to date if applicable.',
              'Follow up with regular Pap smears every 6 months.',
            ] : [
              'Continue annual Pap smear / cervical screening as recommended.',
              'Maintain healthy lifestyle — balanced diet, exercise, no smoking.',
              'Schedule routine gynaecological check-ups yearly.',
              'Consider HPV vaccination if not already vaccinated.',
              'Report any unusual symptoms to your doctor promptly.',
            ]).map(r => (
              <li key={r} className="flex items-start gap-2 text-slate-300">
                <span className="text-rose-400 mt-0.5 flex-shrink-0">→</span> {r}
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={handleDownloadReport} disabled={downloading}
            className="btn-primary flex-1 flex items-center justify-center gap-2">
            {downloading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating PDF…</> : <><span>📄</span> Download Report</>}
          </button>
          <button onClick={() => navigate('/detection')} className="btn-secondary flex-1 flex items-center justify-center gap-2">
            <span>↩</span> New Assessment
          </button>
        </div>

        <p className="text-center text-xs text-slate-600 pb-4">
          ⚕ This AI-generated report is for informational purposes only. Always seek professional medical advice.
        </p>
      </main>
    </div>
  )
}
