import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, Camera, Image, Sun, Moon } from 'lucide-react';

const Photos = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/photos/login');
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      isDark ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      {/* Header */}
      <div className={`shadow-sm border-b transition-colors duration-200 ${
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Camera className="h-8 w-8 text-purple-600 mr-3" />
              <h1 className={`text-xl font-semibold transition-colors duration-200 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>Cloud Photos</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`text-sm transition-colors duration-200 ${
                isDark ? 'text-gray-300' : 'text-gray-600'
              }`}>
                <div>Welcome, {user?.firstname} {user?.lastname}</div>
                {user?.storage_id && (
                  <div className={`text-xs transition-colors duration-200 ${
                    isDark ? 'text-gray-400' : 'text-gray-500'
                  }`}>ID: {user.storage_id}</div>
                )}
              </div>
              <button
                onClick={toggleTheme}
                className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                  isDark 
                    ? 'text-gray-300 hover:text-white hover:bg-gray-700' 
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                }`}
                title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              >
                {isDark ? (
                  <Sun className="h-4 w-4 mr-1" />
                ) : (
                  <Moon className="h-4 w-4 mr-1" />
                )}
                {isDark ? 'Light' : 'Dark'}
              </button>
              <button
                onClick={handleLogout}
                className={`flex items-center px-3 py-2 text-sm transition-colors ${
                  isDark 
                    ? 'text-gray-300 hover:text-white' 
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                <LogOut className="h-4 w-4 mr-1" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="text-6xl mb-4">📸</div>
          <h2 className={`text-2xl font-bold mb-2 transition-colors duration-200 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>Welcome to Your Photos</h2>
          <p className={`mb-8 transition-colors duration-200 ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Your personal photo and video gallery
          </p>
          
          <div className={`rounded-lg shadow p-8 max-w-md mx-auto transition-colors duration-200 ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}>
            <Image className="h-12 w-12 text-purple-600 mx-auto mb-4" />
            <h3 className={`text-lg font-semibold mb-2 transition-colors duration-200 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              Photos Timeline Coming Soon
            </h3>
            <p className={`text-sm transition-colors duration-200 ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Photo timeline, albums, and AI-powered search features will be available here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Photos;
