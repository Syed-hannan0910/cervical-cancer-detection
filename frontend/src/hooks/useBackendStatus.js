import { useState, useEffect } from 'react'
import { api } from '../api/client'

/**
 * useBackendStatus
 * ----------------
 * Pings the /api/health endpoint on mount.
 * Returns { status: 'idle'|'checking'|'ok'|'waking'|'error', models }
 *
 * Useful for showing a "backend is waking up" banner on Render free tier,
 * which spins down after 15 min of inactivity.
 */
export function useBackendStatus() {
  const [status, setStatus] = useState('checking')
  const [models, setModels] = useState({ xgboost: false, fastvit: false })
  const [retries, setRetries] = useState(0)

  useEffect(() => {
    let cancelled = false
    let timer

    const check = async () => {
      try {
        const { data } = await api.health()
        if (cancelled) return
        setStatus('ok')
        setModels({ xgboost: data.xgboost_loaded, fastvit: data.fastvit_loaded })
      } catch (err) {
        if (cancelled) return
        if (retries < 3) {
          // Likely cold-starting — retry after 8s
          setStatus('waking')
          timer = setTimeout(() => {
            if (!cancelled) setRetries(r => r + 1)
          }, 8000)
        } else {
          setStatus('error')
        }
      }
    }

    check()
    return () => { cancelled = true; clearTimeout(timer) }
  }, [retries])

  return { status, models }
}
