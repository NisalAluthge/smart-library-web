import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Loading from './Loading'

// Only logged-in administrators may open these pages.
export default function ProtectedRoute({ children }) {
  const { session, admin, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Loading label="Checking login..." />
  if (!session || !admin) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }
  return children
}
