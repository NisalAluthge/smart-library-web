import { useState } from 'react'
import { Navigate, useLocation, useNavigate, Link } from 'react-router-dom'
import { Library, LogIn } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import Alert from '../../components/Alert'
import Loading from '../../components/Loading'
import { friendlyError } from '../../lib/format'

export default function AdminLogin() {
  const { session, admin, loading, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (loading) return <Loading />
  if (session && admin) return <Navigate to="/admin" replace />

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await signIn(email.trim(), password)
      navigate(location.state?.from || '/admin', { replace: true })
    } catch (err) {
      setError(
        /invalid login/i.test(err.message) ? 'Incorrect email or password.' : friendlyError(err)
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="center-page login-page">
      <form className="card login-card" onSubmit={submit}>
        <div className="login-logo">
          <Library size={34} />
        </div>
        <h1>Admin Login</h1>
        <p className="muted">Smart Library administration</p>

        <Alert type="error">{error}</Alert>

        <label className="field">
          <span>Email</span>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        <button className="btn btn-block" disabled={busy}>
          <LogIn size={18} /> {busy ? 'Signing in...' : 'Sign in'}
        </button>
        <Link to="/" className="muted back-link">← Back to kiosk</Link>
      </form>
    </div>
  )
}
