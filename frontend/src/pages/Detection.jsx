import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Alert from '../components/Alert'
import BackendStatusBanner from '../components/BackendStatusBanner'
import { api } from '../api/client'

/* ─── Reusable step counter input ─── */
function StepInput({ id, label, info, value, onChange, min = 0, max = 100, step = 1, suffix = '' }) {
  const inc = () => onChange(Math.min(max, parseFloat((parseFloat(value) + step).toFixed(1))))
  const dec = () => onChange(Math.max(min, parseFloat((parseFloat(value) - step).toFixed(1))))
  return (
    <div>
      <label className="label">{label}</label>
      {info && <p className="text-xs text-slate-500 mb-2">{info}</p>}
      <div className="flex items-center gap-2">
        <button type="button" onClick={dec} className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors flex items-center justify-center font-bold">−</button>
        <div className="flex-1 relative">
          <input
            type="number" value={value} min={min} max={max} step={step}
            onChange={e => onChange(parseFloat(e.target.value) || min)}
            className="input-field text-center font-mono font-semibold pr-12"
          />
          {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">{suffix}</span>}
        </div>
        <button type="button" onClick={inc} className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors flex items-center justify-center font-bold">+</button>
      </div>
    </div>
  )
}

/* ─── Binary radio toggle ─── */
function Toggle({ name, value, onChange, yesLabel = 'Positive', noLabel = 'Negative', yesVal = 1, noVal = 0 }) {
  return (
    <div className="flex gap-2">
      {[{ label: yesLabel, val: yesVal, cls: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' },
        { label: noLabel, val: noVal, cls: 'border-red-500/50 bg-red-500/10 text-red-400' }
      ].map(opt => (
        <label key={opt.val} className={`flex-1 text-center px-3 py-2.5 rounded-xl border cursor-pointer text-sm font-semibold transition-all
          ${value === opt.val ? opt.cls : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-750'}`}>
          <input type="radio" name={name} value={opt.val} checked={value === opt.val}
            onChange={() => onChange(opt.val)} className="sr-only" />
          {opt.label}
        </label>
      ))}
    </div>
  )
}

/* ─── Section heading ─── */
function Section({ icon, title, children }) {
  return (
    <div className="card border-slate-800/80 space-y-5">
      <h3 className="flex items-center gap-2 text-base font-semibold text-slate-200">
        <span className="text-xl">{icon}</span> {title}
      </h3>
      {children}
    </div>
  )
}

const DEFAULT = {
  age: 35, schiller: 1, citology: 1, dx_cin: 0, genital_herpes: 0,
  stds_number: 0, sexual_partners: 1, first_intercourse: 18, pregnancies: 0, smoking: 0
}

export default function Detection() {
  const [form, setForm] = useState(DEFAULT)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.predict(form)
      // Store result in sessionStorage for Results page
      sessionStorage.setItem('cervixai_result', JSON.stringify({ ...data, user_input: form }))
      navigate('/results')
    } catch (err) {
      setError(err.response?.data?.error || 'Prediction failed. Please ensure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen mesh-bg">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-10 page-enter">
          <span className="inline-block bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-widest mb-4">
            AI Assessment
          </span>
          <h1 className="text-4xl font-bold text-white mb-3">
            Risk Assessment <span className="gradient-text">Analysis</span>
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto">
            Complete the clinical form below. Our XGBoost model will predict your risk profile
            and generate SHAP explainability charts.
          </p>
        </div>

        <Alert type="error" message={error} onDismiss={() => setError('')} className="mb-6" />
        <BackendStatusBanner />

        <form onSubmit={handleSubmit} className="space-y-6 page-enter">
          {/* Patient Information */}
          <Section icon="👤" title="Patient Information">
            <StepInput id="age" label="Age" value={form.age} onChange={set('age')}
              min={13} max={100} suffix="years" info="Patient's current age in years" />
          </Section>

          {/* Medical Tests */}
          <Section icon="🔬" title="Medical Test Results">
            <div className="grid sm:grid-cols-3 gap-5">
              <div>
                <label className="label">Schiller Test</label>
                <p className="text-xs text-slate-500 mb-2">Iodine-based cervical screening</p>
                <Toggle name="schiller" value={form.schiller} onChange={set('schiller')} />
              </div>
              <div>
                <label className="label">Citology (PAP Smear)</label>
                <p className="text-xs text-slate-500 mb-2">Cervical cytology result</p>
                <Toggle name="citology" value={form.citology} onChange={set('citology')} />
              </div>
              <div>
                <label className="label">Dx: CIN</label>
                <p className="text-xs text-slate-500 mb-2">Cervical intraepithelial neoplasia</p>
                <Toggle name="dx_cin" value={form.dx_cin} onChange={set('dx_cin')}
                  yesLabel="Yes" noLabel="No" />
              </div>
            </div>
          </Section>

          {/* STD History */}
          <Section icon="🩺" title="STD History">
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="label">Genital Herpes (STD)</label>
                <p className="text-xs text-slate-500 mb-2">History of herpes simplex virus</p>
                <Toggle name="genital_herpes" value={form.genital_herpes} onChange={set('genital_herpes')}
                  yesLabel="Yes" noLabel="No" />
              </div>
              <StepInput label="Number of STDs" value={form.stds_number} onChange={set('stds_number')}
                min={0} max={20} info="Total count of diagnosed STDs" />
            </div>
          </Section>

          {/* Lifestyle & Reproductive */}
          <Section icon="📋" title="Lifestyle & Reproductive History">
            <div className="grid sm:grid-cols-2 gap-5">
              <StepInput label="Number of Sexual Partners"
                value={form.sexual_partners} onChange={set('sexual_partners')} min={0} max={50} />
              <StepInput label="Age at First Intercourse"
                value={form.first_intercourse} onChange={set('first_intercourse')} min={10} max={50} suffix="years" />
              <StepInput label="Number of Pregnancies"
                value={form.pregnancies} onChange={set('pregnancies')} min={0} max={20} />
              <StepInput label="Smoking (packs / year)"
                value={form.smoking} onChange={set('smoking')} min={0} max={100} step={0.5} suffix="packs/yr"
                info="0 if non-smoker" />
            </div>
          </Section>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-4 text-base flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Running XGBoost Analysis…
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Analyse Risk Profile
              </>
            )}
          </button>

          <p className="text-center text-xs text-slate-600">
            ⚕ This assessment is AI-assisted and does not replace professional medical diagnosis.
          </p>
        </form>
      </main>
    </div>
  )
}
