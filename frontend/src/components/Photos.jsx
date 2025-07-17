import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, Camera, Image } from 'lucide-react';

const Photos = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/photos/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Camera className="h-8 w-8 text-purple-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">Cloud Photos</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <div>Welcome, {user?.firstname} {user?.lastname}</div>
                {user?.storage_id && (
                  <div className="text-xs text-gray-500">ID: {user.storage_id}</div>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 text-sm text-gray-700 hover:text-gray-900"
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Your Photos</h2>
          <p className="text-gray-600 mb-8">
            Your personal photo and video gallery
          </p>
          
          <div className="bg-white rounded-lg shadow p-8 max-w-md mx-auto">
            <Image className="h-12 w-12 text-purple-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Photos Timeline Coming Soon
            </h3>
            <p className="text-gray-600 text-sm">
              Photo timeline, albums, and AI-powered search features will be available here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Photos;
