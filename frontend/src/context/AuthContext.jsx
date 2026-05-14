import { createContext, useContext, useState, useEffect } from 'react'
import { auth } from '../api/client'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cervixai_user')) } catch { return null }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('cervixai_token')
    if (!token) { setLoading(false); return }
    auth.me()
      .then(r => setUser(r.data.user))
      .catch(() => { auth.logout(); setUser(null) })
      .finally(() => setLoading(false))
  }, [])

  const login = async (credentials) => {
    const { data } = await auth.login(credentials)
    localStorage.setItem('cervixai_token', data.access_token)
    localStorage.setItem('cervixai_user', JSON.stringify(data.user))
    setUser(data.user)
    return data
  }

  const logout = () => {
    auth.logout()
    setUser(null)
  }

  return (
    <AuthCtx.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
