import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { filesAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, FolderOpen, Upload, Plus, FolderPlus, File, Clock, MoreVertical, 
  X, Folder, ArrowLeft, Home, ChevronRight, Eye, Download, FileText, 
  FileImage, FileVideo, Music, Archive, FileSpreadsheet, Trash2, Sun, 
  Moon, Search, Filter, Menu, Grid, List 
} from 'lucide-react';
import MobileHeader from './MobileHeader';
import ResponsiveSidebar from './ResponsiveSidebar';

const Drive = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  // File and folder state
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState('');
  const [recentFiles, setRecentFiles] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  // Modal states
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [creatingFolder, setCreatingFolder] = useState(false);
  
  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  // Preview modal state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);

  // Drag and drop state
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [selectedFileType, setSelectedFileType] = useState('');
  const [showSearchFilters, setShowSearchFilters] = useState(false);

  // Mobile responsive state
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  
  // Action menu state
  const [openActionMenu, setOpenActionMenu] = useState(null);

  // Fetch files when component mounts or path changes
  useEffect(() => {
    fetchFiles();
  }, [currentPath]);

  // Fetch recent files when component mounts
  useEffect(() => {
    fetchRecentFiles();
  }, []);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close action menu when clicking outside or on navigation
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openActionMenu && !event.target.closest('.action-menu')) {
        setOpenActionMenu(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openActionMenu]);

  // Close mobile menu when clicking outside or on navigation
  useEffect(() => {
    if (showMobileMenu && !isMobile) {
      setShowMobileMenu(false);
    }
  }, [isMobile, showMobileMenu]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const response = await filesAPI.listFiles(currentPath);
      setFiles(response.data.items);
    } catch (error) {
      console.error('Error fetching files:', error);
      if (error.response?.status === 401) {
        logout();
        navigate('/drive/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentFiles = async () => {
    try {
      setLoadingRecent(true);
      const response = await filesAPI.getRecentFiles(5);
      setRecentFiles(response.data.files);
    } catch (error) {
      console.error('Error fetching recent files:', error);
    } finally {
      setLoadingRecent(false);
    }
  };

  const handleFolderClick = (folderName) => {
    const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
    setCurrentPath(newPath);
    if (isMobile) setShowMobileMenu(false);
  };

  const handleBackClick = () => {
    const pathParts = currentPath.split('/');
    pathParts.pop();
    setCurrentPath(pathParts.join('/'));
  };

  const handleHomeClick = () => {
    setCurrentPath('');
  };

  const getPathBreadcrumbs = () => {
    if (!currentPath) return [];
    return currentPath.split('/');
  };

  const handleUploadFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event) => {
    const selectedFiles = Array.from(event.target.files);
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('context', 'drive');
        if (currentPath) formData.append('path', currentPath);

        await filesAPI.uploadFile(formData, {
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              ((i * 100) + (progressEvent.loaded * 100) / progressEvent.total) / selectedFiles.length
            );
            setUploadProgress(progress);
          }
        });
      }
      
      await fetchFiles();
      await fetchRecentFiles();
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      event.target.value = '';
    }
  };

  const handleCreateFolder = () => {
    setShowCreateFolderModal(true);
  };

  const createFolder = async () => {
    if (!folderName.trim()) return;

    setCreatingFolder(true);
    try {
      const folderPath = currentPath ? `${currentPath}/${folderName.trim()}` : folderName.trim();
      await filesAPI.createFolder(folderPath);
      
      setShowCreateFolderModal(false);
      setFolderName('');
      await fetchFiles();
    } catch (error) {
      console.error('Create folder error:', error);
      alert('Failed to create folder. Please try again.');
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleDeleteFile = (file) => {
    setItemToDelete(file);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    setDeleting(true);
    try {
      const filePath = currentPath ? `${currentPath}/${itemToDelete.name}` : itemToDelete.name;
      await filesAPI.deleteFile(filePath);
      
      setShowDeleteModal(false);
      setItemToDelete(null);
      await fetchFiles();
      await fetchRecentFiles();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete item. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDownload = async (file) => {
    try {
      const filePath = currentPath ? `${currentPath}/${file.name}` : file.name;
      const response = await filesAPI.downloadFile(filePath);
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download file. Please try again.');
    }
  };

  const handlePreview = (file) => {
    setPreviewFile(file);
    setShowPreviewModal(true);
  };

  const handleRecentFileClick = (file) => {
    // The file.path contains the relative path including the filename
    // We need to extract just the directory part
    const fullPath = file.path || '';
    const fileName = file.name;
    
    // Extract directory path by removing the filename from the end of the path
    let directoryPath = '';
    
    if (fullPath && fullPath !== fileName) {
      // File is in a subdirectory
      // Remove the filename from the end of the path
      const lastSlashIndex = fullPath.lastIndexOf('/');
      if (lastSlashIndex >= 0) {
        directoryPath = fullPath.substring(0, lastSlashIndex);
      }
    }
    // If fullPath === fileName, then file is in root directory, so directoryPath stays ''
    
    // Navigate to the directory first
    setCurrentPath(directoryPath);
    
    // After navigation, wait for files to load and then show preview
    setTimeout(() => {
      handlePreview(file);
    }, 500);
  };

  const getFileType = (fileName, mimeType) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    // Image types
    if (mimeType?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(extension)) {
      return 'image';
    }
    
    // Video types
    if (mimeType?.startsWith('video/') || ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v'].includes(extension)) {
      return 'video';
    }
    
    // Audio types
    if (mimeType?.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'].includes(extension)) {
      return 'audio';
    }
    
    // PDF
    if (extension === 'pdf' || mimeType === 'application/pdf') {
      return 'pdf';
    }
    
    // Documents
    if (['doc', 'docx'].includes(extension) || mimeType?.includes('wordprocessingml')) {
      return 'document';
    }
    
    // Spreadsheets
    if (['xls', 'xlsx'].includes(extension) || mimeType?.includes('spreadsheetml')) {
      return 'spreadsheet';
    }
    
    // Presentations
    if (['ppt', 'pptx'].includes(extension) || mimeType?.includes('presentationml')) {
      return 'presentation';
    }
    
    // Text files
    if (mimeType?.startsWith('text/') || ['txt', 'md', 'json', 'xml', 'csv', 'log'].includes(extension)) {
      return 'text';
    }
    
    // Archives
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(extension)) {
      return 'archive';
    }
    
    return 'other';
  };

  const getFileIcon = (fileType, size = 'h-8 w-8') => {
    const iconClass = `${size} mx-auto`;
    
    switch (fileType) {
      case 'image':
        return <FileImage className={`${iconClass} text-green-500`} />;
      case 'video':
        return <FileVideo className={`${iconClass} text-red-500`} />;
      case 'audio':
        return <Music className={`${iconClass} text-purple-500`} />;
      case 'pdf':
        return <FileText className={`${iconClass} text-red-600`} />;
      case 'document':
        return <FileText className={`${iconClass} text-blue-600`} />;
      case 'spreadsheet':
        return <FileSpreadsheet className={`${iconClass} text-green-600`} />;
      case 'presentation':
        return <FileText className={`${iconClass} text-orange-600`} />;
      case 'text':
        return <FileText className={`${iconClass} text-gray-600`} />;
      case 'archive':
        return <Archive className={`${iconClass} text-yellow-600`} />;
      default:
        return <File className={`${iconClass} text-gray-500`} />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSearch = async (query = searchQuery) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setSearchActive(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await filesAPI.searchFiles(query.trim(), 'drive', selectedFileType || null);
      setSearchResults(response.data.results);
      setSearchActive(true);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300); // 300ms delay for debouncing

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedFileType]);

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchActive(false);
    setSelectedFileType('');
  };

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    setDragCounter(prev => prev + 1);
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragCounter(prev => {
      const newCount = prev - 1;
      if (newCount === 0) {
        setIsDragOver(false);
      }
      return newCount;
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    setDragCounter(0);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < droppedFiles.length; i++) {
        const file = droppedFiles[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('context', 'drive');
        if (currentPath) formData.append('path', currentPath);

        await filesAPI.uploadFile(formData, {
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              ((i * 100) + (progressEvent.loaded * 100) / progressEvent.total) / droppedFiles.length
            );
            setUploadProgress(progress);
          }
        });
      }
      
      await fetchFiles();
      await fetchRecentFiles();
    } catch (error) {
      console.error('Drop upload error:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const displayFiles = searchActive ? searchResults : files;

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      isDark ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      {/* Mobile Header */}
      <MobileHeader
        isDark={isDark}
        user={user}
        onMenuToggle={() => setShowMobileMenu(!showMobileMenu)}
        showMobileMenu={showMobileMenu}
        currentPath={currentPath}
        title="My Drive"
        onSearch={() => setSearchActive(true)}
        onLogout={logout}
      />

      <div className="flex">
        {/* Responsive Sidebar */}
        <ResponsiveSidebar
          isDark={isDark}
          showMobileMenu={showMobileMenu}
          onCloseMobileMenu={() => setShowMobileMenu(false)}
          onUpload={handleUploadFile}
          onCreateFolder={handleCreateFolder}
          uploading={uploading}
          uploadProgress={uploadProgress}
          creatingFolder={creatingFolder}
          recentFiles={recentFiles}
          loadingRecent={loadingRecent}
          onNavigate={navigate}
          toggleTheme={toggleTheme}
          currentApp="drive"
          onRecentFileClick={handleRecentFileClick}
        />

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          multiple={true}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col p-2 sm:p-4 min-h-screen lg:min-h-0">
          <div className={`rounded-lg shadow-lg border overflow-hidden transition-colors duration-200 flex-1 ${
            isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            {/* Header - Hidden on mobile since we have MobileHeader */}
            <div className={`hidden lg:block border-b transition-colors duration-200 ${
              isDark ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className="responsive-padding">
                <div className="flex justify-between items-center">
                  <div className="flex items-center flex-1 mr-6">
                    {/* Breadcrumb Navigation */}
                    <div className="flex items-center space-x-2 mr-6">
                      <button
                        onClick={handleHomeClick}
                        className={`flex items-center px-3 py-1 rounded transition-colors ${
                          isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                        }`}
                      >
                        <Home className="h-5 w-5 mr-2" />
                        <span className={`responsive-title font-semibold transition-colors duration-200 ${
                          isDark ? 'text-white' : 'text-gray-900'
                        }`}>Home</span>
                      </button>
                      
                      {getPathBreadcrumbs().map((folder, index) => (
                        <div key={index} className="flex items-center">
                          <ChevronRight className="h-5 w-5 text-gray-400 mx-2" />
                          <button
                            onClick={() => {
                              const pathParts = getPathBreadcrumbs().slice(0, index + 1);
                              setCurrentPath(pathParts.join('/'));
                            }}
                            className={`px-3 py-1 rounded transition-colors ${
                              isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                            }`}
                          >
                            <span className={`responsive-subtitle transition-colors duration-200 ${
                              isDark ? 'text-gray-200' : 'text-gray-700'
                            }`}>{folder}</span>
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Search Bar */}
                    <div className="flex-1 max-w-md">
                      <div className="flex">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            placeholder="Search files and folders..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full pl-10 pr-10 py-2 border rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                              isDark 
                                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                            }`}
                          />
                          <Search className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                          {isSearching && (
                            <div className="absolute right-3 top-2.5">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            </div>
                          )}
                          {searchActive && !isSearching && (
                            <button
                              onClick={clearSearch}
                              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                        
                        {/* File Type Filter */}
                        <select
                          value={selectedFileType}
                          onChange={(e) => setSelectedFileType(e.target.value)}
                          className={`px-3 py-2 border border-l-0 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                            isDark 
                              ? 'bg-gray-700 border-gray-600 text-white' 
                              : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        >
                          <option value="">All types</option>
                          <option value="image">Images</option>
                          <option value="video">Videos</option>
                          <option value="audio">Audio</option>
                          <option value="document">Documents</option>
                          <option value="pdf">PDF</option>
                          <option value="spreadsheet">Spreadsheets</option>
                          <option value="archive">Archives</option>
                          <option value="text">Text files</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Right side controls */}
                  <div className="flex items-center space-x-2">
                    {/* View mode toggle */}
                    <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded ${
                          viewMode === 'grid'
                            ? 'bg-white dark:bg-gray-600 shadow-sm'
                            : 'text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        <Grid className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded ${
                          viewMode === 'list'
                            ? 'bg-white dark:bg-gray-600 shadow-sm'
                            : 'text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        <List className="h-4 w-4" />
                      </button>
                    </div>

                    {/* User menu */}
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
                      <div className={`absolute right-0 mt-1 w-48 rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 ${
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
                            onClick={toggleTheme}
                            className={`w-full flex items-center px-4 py-2 text-sm transition-colors ${
                              isDark 
                                ? 'text-gray-300 hover:bg-gray-700 hover:text-white' 
                                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                          >
                            {isDark ? (
                              <Sun className="h-4 w-4 mr-3" />
                            ) : (
                              <Moon className="h-4 w-4 mr-3" />
                            )}
                            {isDark ? 'Light Mode' : 'Dark Mode'}
                          </button>
                          
                          <button
                            onClick={logout}
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
              </div>
            </div>

            {/* Content Area */}
            <div 
              className="flex-1 p-2 sm:p-4 md:p-6"
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {/* Mobile Search Bar */}
              {(searchActive || searchQuery) && (
                <div className="lg:hidden mb-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search files and folders..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                        isDark 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                    <Search className="h-5 w-5 text-gray-400 absolute left-3 top-3.5" />
                    {isSearching && (
                      <div className="absolute right-10 top-3.5">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                    <button
                      onClick={clearSearch}
                      className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Back button for mobile */}
              {currentPath && (
                <div className="lg:hidden mb-4">
                  <button
                    onClick={handleBackClick}
                    className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                      isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    <ArrowLeft className="h-5 w-5 mr-2" />
                    <span className="text-sm font-medium">Back</span>
                  </button>
                </div>
              )}

              {/* Drag and drop overlay */}
              {isDragOver && (
                <div className="fixed inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center z-50">
                  <div className={`p-8 rounded-lg border-2 border-dashed border-blue-500 ${
                    isDark ? 'bg-gray-800' : 'bg-white'
                  }`}>
                    <Upload className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                    <p className={`text-lg font-medium text-center ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                      Drop files to upload
                    </p>
                  </div>
                </div>
              )}

              {/* Loading state */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className={`ml-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    Loading files...
                  </span>
                </div>
              ) : (
                <>
                  {/* Empty state */}
                  {displayFiles.length === 0 ? (
                    <div className="text-center py-12">
                      <FolderOpen className={`h-12 w-12 ${isDark ? 'text-gray-600' : 'text-gray-400'} mx-auto mb-3`} />
                      <p className={`text-lg font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {searchActive ? 'No files found' : 'This folder is empty'}
                      </p>
                      <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                        {searchActive ? 'Try adjusting your search' : 'Upload files or create folders to get started'}
                      </p>
                    </div>
                  ) : (
                    /* Files and folders grid/list */
                    <div className={
                      viewMode === 'grid' 
                        ? 'responsive-grid'
                        : 'space-y-2'
                    }>
                      {displayFiles.map((item, index) => (
                        <div
                          key={index}
                          className={`group relative transition-all duration-200 ${
                            viewMode === 'grid'
                              ? `${isDark ? 'bg-gray-750 hover:bg-gray-700 border-gray-600' : 'bg-gray-50 hover:bg-gray-100 border-gray-200'} border rounded-lg p-3 cursor-pointer`
                              : `${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} flex items-center p-3 rounded-lg cursor-pointer`
                          }`}
                          onClick={() => {
                            if (item.type === 'folder') {
                              handleFolderClick(item.name);
                            } else {
                              handlePreview(item);
                            }
                          }}
                        >
                          {viewMode === 'grid' ? (
                            /* Grid view */
                            <>
                              <div className="flex flex-col items-center text-center">
                                <div className="mb-3">
                                  {item.type === 'folder' ? (
                                    <Folder className="h-8 w-8 sm:h-10 sm:w-10 text-blue-500 mx-auto" />
                                  ) : (
                                    getFileIcon(getFileType(item.name, item.mimeType), 'h-8 w-8 sm:h-10 sm:w-10')
                                  )}
                                </div>
                                
                                <h3 className={`text-sm font-medium truncate w-full ${
                                  isDark ? 'text-gray-200' : 'text-gray-800'
                                }`} title={item.name}>
                                  {item.name}
                                </h3>
                                
                                {item.type === 'file' && (
                                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {formatFileSize(item.size)}
                                  </p>
                                )}
                              </div>
                              
                              {/* Action menu */}
                              {item.type === 'file' && (
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="relative action-menu">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenActionMenu(openActionMenu === `${index}-grid` ? null : `${index}-grid`);
                                      }}
                                      className={`p-1 rounded transition-colors ${
                                        isDark ? 'hover:bg-gray-600' : 'hover:bg-white'
                                      }`}
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </button>
                                    
                                    {/* Dropdown menu */}
                                    {openActionMenu === `${index}-grid` && (
                                      <div className={`absolute right-0 mt-1 w-48 rounded-lg shadow-lg border z-50 ${
                                        isDark 
                                          ? 'bg-gray-800 border-gray-700' 
                                          : 'bg-white border-gray-200'
                                      }`}>
                                        <div className="py-2">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handlePreview(item);
                                              setOpenActionMenu(null);
                                            }}
                                            className={`w-full flex items-center px-4 py-2 text-sm transition-colors ${
                                              isDark 
                                                ? 'text-gray-300 hover:bg-gray-700 hover:text-white' 
                                                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                                            }`}
                                          >
                                            <Eye className="h-4 w-4 mr-3" />
                                            Preview
                                          </button>
                                          
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDownload(item);
                                              setOpenActionMenu(null);
                                            }}
                                            className={`w-full flex items-center px-4 py-2 text-sm transition-colors ${
                                              isDark 
                                                ? 'text-gray-300 hover:bg-gray-700 hover:text-white' 
                                                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                                            }`}
                                          >
                                            <Download className="h-4 w-4 mr-3" />
                                            Download
                                          </button>
                                          
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteFile(item);
                                              setOpenActionMenu(null);
                                            }}
                                            className={`w-full flex items-center px-4 py-2 text-sm transition-colors ${
                                              isDark 
                                                ? 'text-red-400 hover:bg-gray-700 hover:text-red-300' 
                                                : 'text-red-600 hover:bg-gray-100 hover:text-red-700'
                                            }`}
                                          >
                                            <Trash2 className="h-4 w-4 mr-3" />
                                            Delete
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            /* List view */
                            <>
                              <div className="flex items-center flex-1 min-w-0">
                                <div className="flex-shrink-0 mr-3">
                                  {item.type === 'folder' ? (
                                    <Folder className="h-6 w-6 text-blue-500" />
                                  ) : (
                                    getFileIcon(getFileType(item.name, item.mimeType), 'h-6 w-6')
                                  )}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <h3 className={`text-sm font-medium truncate ${
                                    isDark ? 'text-gray-200' : 'text-gray-800'
                                  }`}>
                                    {item.name}
                                  </h3>
                                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {item.type === 'file' ? formatFileSize(item.size) : 'Folder'} • {formatDate(item.modified)}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Action buttons */}
                              <div className="flex items-center space-x-1 ml-2">
                                {item.type === 'file' && (
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePreview(item);
                                      }}
                                      className={`p-2 rounded transition-colors touch-target ${
                                        isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                                      }`}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </button>
                                    
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDownload(item);
                                      }}
                                      className={`p-2 rounded transition-colors touch-target ${
                                        isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                                      }`}
                                    >
                                      <Download className="h-4 w-4" />
                                    </button>
                                  </>
                                )}
                                
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteFile(item);
                                  }}
                                  className={`p-2 rounded transition-colors touch-target ${
                                    isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                                  }`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Folder Modal */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`modal-container w-full max-w-md rounded-lg shadow-xl ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="card-padding">
              <h3 className={`responsive-subtitle font-semibold mb-4 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Create New Folder
              </h3>
              
              <input
                type="text"
                placeholder="Folder name"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && createFolder()}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
                autoFocus
              />
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={createFolder}
                  disabled={!folderName.trim() || creatingFolder}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors touch-target"
                >
                  {creatingFolder ? 'Creating...' : 'Create'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateFolderModal(false);
                    setFolderName('');
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors touch-target ${
                    isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`modal-container w-full max-w-md rounded-lg shadow-xl ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="card-padding">
              <h3 className={`responsive-subtitle font-semibold mb-4 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Delete {itemToDelete?.type === 'folder' ? 'Folder' : 'File'}
              </h3>
              
              <p className={`mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Are you sure you want to delete "{itemToDelete?.name}"? This action cannot be undone.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors touch-target"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setItemToDelete(null);
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors touch-target ${
                    isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewFile && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-full w-full h-full flex items-center justify-center">
            <button
              onClick={() => setShowPreviewModal(false)}
              className="absolute top-4 right-4 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all z-10"
            >
              <X className="h-6 w-6" />
            </button>
            
            {(() => {
              const fileType = getFileType(previewFile.name, previewFile.mimeType);
              const filePath = currentPath ? `${currentPath}/${previewFile.name}` : previewFile.name;
              const viewUrl = filesAPI.getViewUrl(filePath, 'drive');
              
              if (fileType === 'image') {
                return (
                  <img
                    src={viewUrl}
                    alt={previewFile.name}
                    className="max-w-full max-h-full object-contain"
                  />
                );
              } else if (fileType === 'video') {
                return (
                  <video
                    src={viewUrl}
                    controls
                    className="max-w-full max-h-full"
                  />
                );
              } else if (fileType === 'pdf') {
                return (
                  <iframe
                    src={viewUrl}
                    className="w-full h-full min-h-[80vh]"
                    title={previewFile.name}
                  />
                );
              } else if (fileType === 'audio') {
                return (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md">
                    <div className="text-center">
                      {getFileIcon(fileType, 'h-16 w-16')}
                      <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                        {previewFile.name}
                      </h3>
                      <audio
                        src={viewUrl}
                        controls
                        className="mt-4 w-full"
                      />
                    </div>
                  </div>
                );
              } else {
                return (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md">
                    <div className="text-center">
                      {getFileIcon(fileType, 'h-16 w-16')}
                      <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                        {previewFile.name}
                      </h3>
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        Preview not available for this file type ({fileType})
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        Extension: .{previewFile.name.split('.').pop()} | MIME: {previewFile.mimeType || 'unknown'}
                      </p>
                      <button
                        onClick={() => handleDownload(previewFile)}
                        className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                      >
                        Download File
                      </button>
                    </div>
                  </div>
                );
              }
            })()}
            
            {/* File info overlay */}
            <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white p-4 rounded-lg">
              <h3 className="font-medium mb-1">{previewFile.name}</h3>
              <p className="text-sm text-gray-300">
                {formatFileSize(previewFile.size)} • {formatDate(previewFile.modified)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-80 z-50">
          <div className={`rounded-lg shadow-lg border p-4 ${
            isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Uploading files...
              </span>
              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                {uploadProgress}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Drive;
