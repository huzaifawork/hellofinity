import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import LoadingOverlay from '../app/LoadingOverlay'

/**
 * ProtectedRoute — wraps routes that require authentication.
 * While the session is loading, shows the loading overlay.
 * If no session, redirects to /app/login.
 */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return <LoadingOverlay visible={true} />
  if (!user)   return <Navigate to="/app/login" replace />

  return children
}
