import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import Login from './components/Login';
import Register from './components/Register';
import DriveApp from './components/DriveApp';
import PhotosApp from './components/PhotosApp';
import DriveTrash from './components/DriveTrash';
import PhotosTrash from './components/PhotosTrash';
import AdminLogin from './components/AdminLogin';
import AdminPanel from './components/AdminPanel';

const APP_TYPE = typeof __APP_TYPE__ !== 'undefined' ? __APP_TYPE__ : 'drive';

function App() {
  const isPhotosApp = APP_TYPE === 'photos';
  const appBasePath = isPhotosApp ? '/photos' : '/drive';

  return (
    <ThemeProvider>
      <AuthProvider>
        <PWAInstallPrompt />
        <Router basename={appBasePath}>
        <Routes>
          <Route path="/login" element={<Login appType={APP_TYPE} />} />
          <Route path="/register" element={<Register appType={APP_TYPE} />} />
          <Route path="/trash" element={
            <ProtectedRoute>
              {isPhotosApp ? <PhotosTrash /> : <DriveTrash />}
            </ProtectedRoute>
          } />
          <Route path="/" element={
            <ProtectedRoute>
              {isPhotosApp ? <PhotosApp /> : <DriveApp />}
            </ProtectedRoute>
          } />

          {/* Legacy redirects */}
          <Route path="/drive" element={<Navigate to="/" replace />} />
          <Route path="/drive/login" element={<Navigate to="/login" replace />} />
          <Route path="/drive/register" element={<Navigate to="/register" replace />} />
          <Route path="/drive/trash" element={<Navigate to="/trash" replace />} />
          <Route path="/photos" element={<Navigate to="/" replace />} />
          <Route path="/photos/login" element={<Navigate to="/login" replace />} />
          <Route path="/photos/register" element={<Navigate to="/register" replace />} />
          <Route path="/photos/trash" element={<Navigate to="/trash" replace />} />
          
          {/* Admin Routes embedded in each app */}
          <Route path="/admin/login" element={<AdminLogin appType={APP_TYPE} />} />
          <Route path="/admin/dashboard" element={
            <AdminProtectedRoute>
              <AdminPanel appType={APP_TYPE} />
            </AdminProtectedRoute>
          } />
          <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        </Router>
        </AuthProvider>
      </ThemeProvider>
    );
  }

export default App;
