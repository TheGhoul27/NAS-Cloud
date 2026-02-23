import React from 'react';
import { 
  FolderOpen, 
  Upload, 
  FolderPlus, 
  Clock, 
  Trash2, 
  Sun, 
  Moon,
  X,
  Camera,
  Home
} from 'lucide-react';

const ResponsiveSidebar = ({ 
  isDark,
  showMobileMenu,
  onCloseMobileMenu,
  onUpload,
  onCreateFolder,
  uploading,
  uploadProgress,
  creatingFolder,
  recentFiles,
  loadingRecent,
  onNavigate,
  toggleTheme,
  currentApp = 'drive', // 'drive' or 'photos'
  onRecentFileClick, // New prop for handling recent file clicks
  customActions
}) => {
  const sidebarContent = (
    <div className={`flex flex-col h-full transition-colors duration-200 ${
      isDark 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    }`}>
      {/* Sidebar Header */}
      <div className={`px-4 sm:px-6 py-4 border-b transition-colors duration-200 ${
        isDark ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {currentApp === 'photos' ? (
              <Camera className="h-6 sm:h-8 w-6 sm:w-8 text-green-600 mr-3" />
            ) : (
              <FolderOpen className="h-6 sm:h-8 w-6 sm:w-8 text-blue-600 mr-3" />
            )}
            <h1 className={`text-lg sm:text-xl font-semibold transition-colors duration-200 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              {currentApp === 'photos' ? 'My Photos' : 'My Drive'}
            </h1>
          </div>
          
          {/* Close button for mobile */}
          <button
            onClick={onCloseMobileMenu}
            className={`lg:hidden p-2 rounded-lg transition-colors ${
              isDark 
                ? 'hover:bg-gray-700 text-gray-300' 
                : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="px-4 sm:px-6 py-4 space-y-2">
        <button
          onClick={() => onNavigate('/')}
          className={`w-full flex items-center p-3 rounded-lg transition-colors ${
            currentApp === 'photos'
              ? (isDark ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700')
              : (isDark ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700')
          }`}
        >
          {currentApp === 'photos' ? (
            <Camera className="h-5 w-5 mr-3" />
          ) : (
            <FolderOpen className="h-5 w-5 mr-3" />
          )}
          <span className="text-sm font-medium">{currentApp === 'photos' ? 'Photos' : 'My Drive'}</span>
        </button>
      </div>

      {/* Action Buttons */}
      <div className="px-4 sm:px-6 py-4 space-y-3">
        <button
          onClick={onUpload}
          disabled={uploading}
          className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors touch-target"
        >
          <Upload className="h-5 w-5 mr-2" />
          <span className="text-sm sm:text-base">
            {uploading ? `Uploading... ${uploadProgress}%` : 'Upload Files'}
          </span>
        </button>
        
        {currentApp === 'drive' && (
          <button
            onClick={onCreateFolder}
            disabled={uploading || creatingFolder}
            className={`w-full flex items-center justify-center px-4 py-3 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors touch-target ${
              isDark 
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            <FolderPlus className="h-5 w-5 mr-2" />
            <span className="text-sm sm:text-base">
              {creatingFolder ? 'Creating...' : 'New Folder'}
            </span>
          </button>
        )}
      </div>

      {/* Recent Files Section */}
      <div className="flex-1 px-4 sm:px-6 pb-4">
        <div className="mb-4">
          <h3 className={`text-sm font-medium mb-3 transition-colors duration-200 ${
            isDark ? 'text-gray-300' : 'text-gray-700'
          }`}>
            Recent Files
          </h3>
          
          <div className="space-y-2">
            {loadingRecent ? (
              <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Loading...
              </div>
            ) : recentFiles?.length > 0 ? (
              recentFiles.map((file, index) => (
                <div
                  key={index}
                  onClick={() => onRecentFileClick && onRecentFileClick(file)}
                  className={`p-2 rounded transition-colors cursor-pointer ${
                    isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className={`text-sm font-medium truncate ${
                    isDark ? 'text-gray-200' : 'text-gray-800'
                  }`}>
                    {file.name}
                  </div>
                  <div className={`text-xs mt-1 ${
                    isDark ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {new Date(file.modified).toLocaleDateString()}
                  </div>
                </div>
              ))
            ) : (
              <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                No recent files
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <button
            onClick={() => onNavigate('/trash')}
            className={`w-full flex items-center p-3 rounded-lg transition-colors touch-target ${
              isDark ? 'hover:bg-gray-700 text-gray-300 hover:text-white' : 'hover:bg-gray-50 text-gray-600 hover:text-gray-900'
            }`}
          >
            <Trash2 className="h-5 w-5 mr-3" />
            <span className="text-sm font-medium">Trash</span>
          </button>
          
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center p-3 rounded-lg transition-colors touch-target ${
              isDark ? 'hover:bg-gray-700 text-gray-300 hover:text-white' : 'hover:bg-gray-50 text-gray-600 hover:text-gray-900'
            }`}
          >
            {isDark ? (
              <Sun className="h-5 w-5 mr-3" />
            ) : (
              <Moon className="h-5 w-5 mr-3" />
            )}
            <span className="text-sm font-medium">
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-80 p-4 flex-shrink-0">
        <div className={`rounded-lg shadow-lg border ${
          isDark 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        }`}>
          {sidebarContent}
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {showMobileMenu && (
        <>
          {/* Backdrop */}
          <div 
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={onCloseMobileMenu}
          />
          
          {/* Sidebar */}
          <div className={`lg:hidden fixed left-0 top-0 bottom-0 w-80 max-w-[85vw] z-50 transform transition-transform duration-300 ${
            showMobileMenu ? 'translate-x-0' : '-translate-x-full'
          }`}>
            <div className="h-full border-r border-gray-200 dark:border-gray-700">
              {sidebarContent}
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default ResponsiveSidebar;
