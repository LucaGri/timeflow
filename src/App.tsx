import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { Session } from '@supabase/supabase-js'

// Layouts
import MainLayout from './components/layouts/MainLayout'
import AuthLayout from './components/layouts/AuthLayout'

// Pages
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import Dashboard from './pages/Dashboard'
import Calendar from './pages/Calendar'
import Analytics from './pages/Analytics'
import Journal from './pages/Journal'
import Settings from './pages/Settings'
import GoogleCallback from './pages/auth/GoogleCallback'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'

// Components
import LoadingScreen from './components/ui/LoadingScreen'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <Routes>
      {/* Public routes */}
<Route element={<AuthLayout />}>
  <Route
    path="/login"
    element={session ? <Navigate to="/dashboard" /> : <Login />}
  />
  <Route
    path="/signup"
    element={session ? <Navigate to="/dashboard" /> : <Signup />}
  />
  <Route
    path="/forgot-password"
    element={session ? <Navigate to="/dashboard" /> : <ForgotPassword />}
  />
</Route>

{/* Auth callbacks */}
<Route path="/auth/callback" element={<GoogleCallback />} />
<Route path="/auth/reset-password" element={<ResetPassword />} />

      {/* Google OAuth callback - NUOVA RIGA */}
      <Route path="/auth/callback" element={<GoogleCallback />} />

      {/* Protected routes */}
      <Route
        element={
          session ? <MainLayout /> : <Navigate to="/login" />
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/journal" element={<Journal />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* Root redirect */}
      <Route
        path="/"
        element={
          <Navigate to={session ? '/dashboard' : '/login'} replace />
        }
      />

      {/* 404 fallback */}
      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  )
}

export default App
