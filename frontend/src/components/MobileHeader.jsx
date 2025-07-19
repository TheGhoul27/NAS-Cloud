import React from 'react';
import { Menu, X, FolderOpen, Search, Settings, LogOut } from 'lucide-react';

const MobileHeader = ({ 
  isDark, 
  user, 
  onMenuToggle, 
  showMobileMenu,
  currentPath,
  title = "My Drive",
  onSearch,
  onLogout 
}) => {
  return (
    <div className={`lg:hidden sticky top-0 z-40 ${
      isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    } border-b`}>
      <div className="flex items-center justify-between p-4">
        {/* Left section - Menu toggle and title */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onMenuToggle}
            className={`p-2 rounded-lg transition-colors ${
              isDark 
                ? 'hover:bg-gray-700 text-gray-300' 
                : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            {showMobileMenu ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
          
          <div className="flex items-center space-x-2">
            <FolderOpen className="h-6 w-6 text-blue-600" />
            <h1 className={`text-lg font-semibold truncate max-w-[150px] ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              {title}
            </h1>
          </div>
        </div>

        {/* Right section - Search and user menu */}
        <div className="flex items-center space-x-2">
          {onSearch && (
            <button
              onClick={onSearch}
              className={`p-2 rounded-lg transition-colors ${
                isDark 
                  ? 'hover:bg-gray-700 text-gray-300' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <Search className="h-5 w-5" />
            </button>
          )}
          
          <div className="relative group">
            <button className={`flex items-center space-x-2 p-2 rounded-lg transition-colors ${
              isDark 
                ? 'hover:bg-gray-700 text-gray-300' 
                : 'hover:bg-gray-100 text-gray-600'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                isDark ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'
              }`}>
                {user?.firstname?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </div>
            </button>
            
            {/* Dropdown menu */}
            <div className={`absolute right-0 mt-1 w-48 rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 ${
              isDark 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              <div className="py-2">
                <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                  <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {user?.firstname} {user?.lastname}
                  </p>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {user?.email}
                  </p>
                </div>
                
                <button
                  onClick={onLogout}
                  className={`w-full flex items-center px-4 py-2 text-sm transition-colors ${
                    isDark 
                      ? 'text-gray-300 hover:bg-gray-700 hover:text-white' 
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <LogOut className="h-4 w-4 mr-3" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Breadcrumb for mobile */}
      {currentPath && (
        <div className="px-4 pb-3">
          <div className="flex items-center space-x-1 text-sm">
            <span className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Path:
            </span>
            <span className={`font-medium truncate ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              /{currentPath}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileHeader;
