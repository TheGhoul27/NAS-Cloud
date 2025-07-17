import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import Login from './pages/Login'
import Register from './pages/Register'
import Drive from './pages/Drive'
import Photos from './pages/Photos'
import Layout from './components/Layout'

function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/drive" /> : <Login />} 
        />
        <Route 
          path="/register" 
          element={isAuthenticated ? <Navigate to="/drive" /> : <Register />} 
        />
        
        {/* Protected routes */}
        <Route 
          path="/drive/*" 
          element={isAuthenticated ? <Layout><Drive /></Layout> : <Navigate to="/login" />} 
        />
        <Route 
          path="/photos/*" 
          element={isAuthenticated ? <Layout><Photos /></Layout> : <Navigate to="/login" />} 
        />
        
        {/* Default redirect */}
        <Route 
          path="/" 
          element={<Navigate to={isAuthenticated ? "/drive" : "/login"} />} 
        />
      </Routes>
    </Router>
  )
}

export default App
