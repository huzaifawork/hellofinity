import { Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { AuthProvider } from './context/AuthContext'
import ErrorBoundary from './components/common/ErrorBoundary'
import ProtectedRoute from './components/common/ProtectedRoute'
import LandingPage from './pages/LandingPage'
import AppLayout from './pages/AppPage'
import SubscribedPage from './pages/SubscribedPage'

import AuthScreen from './components/app/AuthScreen'
import DashboardScreen from './components/app/DashboardScreen'
import ChallengeScreen from './components/app/ChallengeScreen'
import CustomChallengeCreator from './components/creator/CustomChallengeCreator'
import PrivacyScreen from './components/app/PrivacyScreen'
import TermsScreen from './components/app/TermsScreen'

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/subscribed" element={<SubscribedPage />} />

            {/* /app/* — all app routes share AppLayout */}
            <Route path="/app" element={<AppLayout />}>
              {/* Public auth routes */}
              <Route path="login" element={<AuthScreen />} />

              {/* Protected routes */}
              <Route path="setup" element={<ProtectedRoute><AuthScreen /></ProtectedRoute>} />
              <Route path="dashboard" element={<ProtectedRoute><DashboardScreen visible={true} /></ProtectedRoute>} />
              <Route path="challenge" element={<ProtectedRoute><ChallengeScreen visible={true} /></ProtectedRoute>} />
              <Route path="custom-creator" element={<ProtectedRoute><CustomChallengeCreator /></ProtectedRoute>} />
              <Route path="privacy" element={<PrivacyScreen />} />
              <Route path="terms" element={<TermsScreen />} />

              {/* /app → redirect to login (AppLayout will redirect to dashboard if authenticated) */}
              <Route index element={<Navigate to="/app/login" replace />} />
            </Route>
          </Routes>
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}
