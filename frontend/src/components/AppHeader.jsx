import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HardDrive, Images, LogOut, Settings, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const AppHeader = ({ appName, appIcon: AppIcon, currentPath }) => {
  const { logout, user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const switchApp = (app) => {
    if (app === 'drive') {
      navigate('/');
    } else if (app === 'photos') {
      navigate('/photos');
    }
  };

  const goToAdmin = () => {
    navigate('/admin/dashboard');
  };

  return (
    <header
      className={`${
        isDark
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white border-gray-200'
      } border-b sticky top-0 z-40`}
    >
      <div className="px-4 py-3 md:px-6 md:py-4">
        <div className="flex items-center justify-between gap-2">
          {/* App Name & Icon */}
          <div className="flex items-center gap-3 flex-1">
            <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-lg p-2">
              <AppIcon className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <div>
              <h1 className={`font-bold text-lg md:text-xl ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                {appName}
              </h1>
              {user && (
                <p className={`text-xs md:text-sm ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {user.email}
                </p>
              )}
            </div>
          </div>

          {/* App Switcher & Actions */}
          <div className="flex items-center gap-2">
            {/* App Switcher */}
            <div className={`hidden sm:flex items-center gap-1 ${
              isDark ? 'bg-gray-700' : 'bg-gray-100'
            } rounded-lg p-1`}>
              <button
                onClick={() => switchApp('drive')}
                title="Go to Drive"
                className={`p-2 rounded transition-all ${
                  currentPath === 'drive'
                    ? isDark
                      ? 'bg-gray-600 text-orange-400'
                      : 'bg-white text-orange-600 shadow'
                    : isDark
                    ? 'text-gray-400 hover:text-gray-300'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <HardDrive className="h-5 w-5" />
              </button>
              <button
                onClick={() => switchApp('photos')}
                title="Go to Photos"
                className={`p-2 rounded transition-all ${
                  currentPath === 'photos'
                    ? isDark
                      ? 'bg-gray-600 text-orange-400'
                      : 'bg-white text-orange-600 shadow'
                    : isDark
                    ? 'text-gray-400 hover:text-gray-300'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Images className="h-5 w-5" />
              </button>
            </div>

            {/* Admin & Logout */}
            <button
              onClick={goToAdmin}
              title="Admin Panel"
              className={`p-2 rounded hover:opacity-70 transition-all ${
                isDark
                  ? 'hover:bg-gray-700 text-gray-400'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <Shield className="h-5 w-5" />
            </button>

            <button
              onClick={handleLogout}
              title="Logout"
              className={`p-2 rounded hover:opacity-70 transition-all ${
                isDark
                  ? 'hover:bg-gray-700 text-gray-400'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
