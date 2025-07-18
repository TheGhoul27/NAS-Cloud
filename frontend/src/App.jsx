import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import Register from './components/Register';
import Drive from './components/Drive';
import Photos from './components/Photos';
import Trash from './components/Trash';
import AdminLogin from './components/AdminLogin';
import AdminPanel from './components/AdminPanel';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
        <Routes>
          {/* Default redirect to drive */}
          <Route path="/" element={<Navigate to="/drive" replace />} />
          
          {/* Drive App Routes */}
          <Route path="/drive/login" element={<Login />} />
          <Route path="/drive/register" element={<Register />} />
          <Route path="/drive/trash" element={
            <ProtectedRoute>
              <Trash />
            </ProtectedRoute>
          } />
          <Route path="/drive" element={
            <ProtectedRoute>
              <Drive />
            </ProtectedRoute>
          } />
          
          {/* Photos App Routes */}
          <Route path="/photos/login" element={<Login />} />
          <Route path="/photos/register" element={<Register />} />
          <Route path="/photos/trash" element={
            <ProtectedRoute>
              <Trash />
            </ProtectedRoute>
          } />
          <Route path="/photos" element={
            <ProtectedRoute>
              <Photos />
            </ProtectedRoute>
          } />
          
          {/* Admin Routes - Separate from regular user system */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminPanel />} />
          <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/drive" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  </ThemeProvider>
  );
}

export default App;
