import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import Register from './components/Register';
import Drive from './components/Drive';
import Photos from './components/Photos';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Default redirect to drive */}
          <Route path="/" element={<Navigate to="/drive" replace />} />
          
          {/* Drive App Routes */}
          <Route path="/drive/login" element={<Login />} />
          <Route path="/drive/register" element={<Register />} />
          <Route path="/drive" element={
            <ProtectedRoute>
              <Drive />
            </ProtectedRoute>
          } />
          
          {/* Photos App Routes */}
          <Route path="/photos/login" element={<Login />} />
          <Route path="/photos/register" element={<Register />} />
          <Route path="/photos" element={
            <ProtectedRoute>
              <Photos />
            </ProtectedRoute>
          } />
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/drive" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
