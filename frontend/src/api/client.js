import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const client = axios.create({
  baseURL: API_URL,
  timeout: 120000, // 2 min for heavy ML inference
  headers: { 'Content-Type': 'application/json' }
})

// Attach JWT to every request
client.interceptors.request.use(config => {
  const token = localStorage.getItem('cervixai_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 — clear token and redirect
client.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('cervixai_token')
      localStorage.removeItem('cervixai_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default client

// ── Auth helpers ──
export const auth = {
  login: (data) => client.post('/api/auth/login', data),
  signup: (data) => client.post('/api/auth/signup', data),
  me: () => client.get('/api/auth/me'),
  logout: () => {
    localStorage.removeItem('cervixai_token')
    localStorage.removeItem('cervixai_user')
  }
}

// ── Prediction helpers ──
export const api = {
  predict: (data) => client.post('/api/predict', data),
  uploadImage: (formData) => client.post('/api/upload_image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getShap: () => client.get('/api/results/shap'),
  getGradcam: () => client.get('/api/results/gradcam'),
  history: () => client.get('/api/history'),
  downloadReport: (data) => client.post('/api/download_report', data, {
    responseType: 'blob'
  }),
  health: () => client.get('/api/health')
}
