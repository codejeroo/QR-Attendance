import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

// Import pages
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ScanAttendance from './pages/ScanAttendance'
import Events from './pages/Events'
import AttendanceRecords from './pages/AttendanceRecords'
import StudentsManagement from './pages/StudentsManagement'
import Layout from './components/Layout'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              style: {
                background: '#10b981',
              },
            },
            error: {
              style: {
                background: '#ef4444',
              },
            },
          }}
        />
        
        <Routes>
          <Route 
            path="/login" 
            element={!session ? <Login /> : <Navigate to="/dashboard" replace />} 
          />
          <Route 
            path="/" 
            element={session ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
          />
          <Route 
            path="/dashboard"
            element={session ? <Layout session={session}><Dashboard /></Layout> : <Navigate to="/login" replace />}
          />
          <Route 
            path="/scan"
            element={session ? <Layout session={session}><ScanAttendance /></Layout> : <Navigate to="/login" replace />}
          />
          <Route 
            path="/events"
            element={session ? <Layout session={session}><Events /></Layout> : <Navigate to="/login" replace />}
          />
          <Route 
            path="/records"
            element={session ? <Layout session={session}><AttendanceRecords /></Layout> : <Navigate to="/login" replace />}
          />
          <Route 
            path="/students"
            element={session ? <Layout session={session}><StudentsManagement /></Layout> : <Navigate to="/login" replace />}
          />
        </Routes>
      </div>
    </Router>
  )
}

export default App
