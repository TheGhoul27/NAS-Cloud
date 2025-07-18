import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { filesAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { LogOut, FolderOpen, Upload, Plus, FolderPlus, File, Clock, MoreVertical, X, Folder, ArrowLeft, Home, ChevronRight, Eye, Download, FileText, FileImage, FileVideo, Music, Archive, FileSpreadsheet, Trash2, Sun, Moon, Search, Filter } from 'lucide-react';

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

  // Fetch files when component mounts or path changes
  useEffect(() => {
    fetchFiles();
  }, [currentPath]);

  // Fetch recent files when component mounts
  useEffect(() => {
    fetchRecentFiles();
  }, []);

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
  };

  const handleBackClick = () => {
    const pathParts = currentPath.split('/');
    pathParts.pop();
    setCurrentPath(pathParts.join('/'));
  };

  const handleHomeClick = () => {
    setCurrentPath('');
  };

  const handleFilePreview = (file) => {
    setPreviewFile(file);
    setShowPreviewModal(true);
  };

  const handleRecentFileClick = async (recentFile) => {
    console.log('Recent file clicked:', recentFile);
    
    // Navigate to the folder containing the file and then open preview
    const filePath = recentFile.path;
    const folderPath = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : '';
    
    console.log('Current path:', currentPath);
    console.log('Target folder path:', folderPath);
    
    try {
      if (folderPath !== currentPath) {
        // If we need to navigate to a different folder, set the path first
        console.log('Navigating to folder:', folderPath);
        setCurrentPath(folderPath);
        
        // Wait a bit for the navigation to complete, then open preview
        setTimeout(() => {
          console.log('Opening preview for:', recentFile);
          setPreviewFile(recentFile);
          setShowPreviewModal(true);
        }, 100);
      } else {
        // If we're already in the right folder, just open preview immediately
        console.log('Opening preview directly for:', recentFile);
        setPreviewFile(recentFile);
        setShowPreviewModal(true);
      }
    } catch (error) {
      console.error('Error handling recent file click:', error);
      // Fallback: just open preview without navigation
      setPreviewFile(recentFile);
      setShowPreviewModal(true);
    }
  };

  const getPathBreadcrumbs = () => {
    if (!currentPath) return [];
    return currentPath.split('/');
  };

  const handleUploadFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    // Upload each file
    for (const file of files) {
      await uploadSingleFile(file);
    }
    
    // Reset file input and refresh files list after all uploads
    event.target.value = '';
    await fetchFiles();
    await fetchRecentFiles();
    setUploading(false);
    setUploadProgress(0);
  };

  // Drag and Drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only count if it's actually files being dragged
    if (e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
      setDragCounter(prev => prev + 1);
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragCounter(prev => {
      const newCount = prev - 1;
      if (newCount <= 0) {
        setIsDragOver(false);
        return 0;
      }
      return newCount;
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragCounter(0);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Upload each file
    for (const file of files) {
      await uploadSingleFile(file);
    }
    
    // Refresh files list after all uploads
    await fetchFiles();
    await fetchRecentFiles();
    setUploading(false);
    setUploadProgress(0);
  };

  const uploadSingleFile = async (file) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      const response = await filesAPI.uploadFile(file, currentPath);
      console.log('File uploaded successfully:', response.data);
      
      // Show success message without blocking for multiple files
      const message = `File "${file.name}" uploaded successfully!`;
      console.log(message);
      
    } catch (error) {
      console.error('Upload error:', error);
      if (error.response?.status === 401) {
        logout();
        navigate('/drive/login');
      } else {
        alert(`Failed to upload file "${file.name}". Please try again.`);
      }
    }
  };

  const handleCreateFolder = () => {
    setShowCreateFolderModal(true);
  };

  const handleCreateFolderSubmit = async (e) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    setCreatingFolder(true);
    
    try {
      const response = await filesAPI.createFolder(folderName.trim(), currentPath);

      console.log('Folder created successfully:', response.data);
      alert(`Folder "${folderName}" created successfully!`);
      
      setShowCreateFolderModal(false);
      setFolderName('');
      
      // Refresh files list
      await fetchFiles();
      await fetchRecentFiles();
      
    } catch (error) {
      console.error('Create folder error:', error);
      if (error.response?.status === 401) {
        logout();
        navigate('/drive/login');
      } else {
        alert('Failed to create folder. Please try again.');
      }
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleDelete = (item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      setDeleting(true);
      await filesAPI.deleteFile(itemToDelete.path);
      
      // Refresh the file list
      await fetchFiles();
      await fetchRecentFiles();
      
      setShowDeleteModal(false);
      setItemToDelete(null);
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/drive/login');
  };

  const handleSearch = async (query, fileType = '') => {
    if (!query || query.trim().length < 2) {
      setSearchActive(false);
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await filesAPI.searchFiles(query.trim(), 'drive', fileType || null);
      setSearchResults(response.data.results);
      setSearchActive(true);
    } catch (error) {
      console.error('Search error:', error);
      if (error.response?.status === 401) {
        logout();
        navigate('/drive/login');
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchInputChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      handleSearch(query, selectedFileType);
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchActive(false);
    setSelectedFileType('');
    setShowSearchFilters(false);
  };

  const handleFileTypeFilter = (fileType) => {
    setSelectedFileType(fileType);
    if (searchQuery.trim().length >= 2) {
      handleSearch(searchQuery, fileType);
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
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  const getFileTypeCategory = (mimeType, fileName) => {
    if (!mimeType && !fileName) return 'other';
    
    const extension = fileName ? fileName.split('.').pop().toLowerCase() : '';
    
    // Images
    if (mimeType?.startsWith('image/')) return 'image';
    
    // Videos
    if (mimeType?.startsWith('video/') || ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(extension)) return 'video';
    
    // Audio
    if (mimeType?.startsWith('audio/') || ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'].includes(extension)) return 'audio';
    
    // PDFs
    if (mimeType === 'application/pdf' || extension === 'pdf') return 'pdf';
    
    // Office Documents
    if (['doc', 'docx'].includes(extension) || mimeType?.includes('wordprocessingml')) return 'document';
    if (['xls', 'xlsx'].includes(extension) || mimeType?.includes('spreadsheetml')) return 'spreadsheet';
    if (['ppt', 'pptx'].includes(extension) || mimeType?.includes('presentationml')) return 'presentation';
    
    // Text files
    if (mimeType?.startsWith('text/') || ['txt', 'md', 'json', 'xml', 'csv'].includes(extension)) return 'text';
    
    // Archives
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) return 'archive';
    
    return 'other';
  };

  const canPreviewInline = (fileType, mimeType) => {
    return ['image', 'video', 'audio', 'pdf', 'text'].includes(fileType);
  };

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'image':
        return <FileImage className="h-8 w-8 text-green-500 mx-auto" />;
      case 'video':
        return <FileVideo className="h-8 w-8 text-red-500 mx-auto" />;
      case 'audio':
        return <Music className="h-8 w-8 text-purple-500 mx-auto" />;
      case 'pdf':
        return <FileText className="h-8 w-8 text-red-600 mx-auto" />;
      case 'document':
        return <FileText className="h-8 w-8 text-blue-600 mx-auto" />;
      case 'spreadsheet':
        return <FileSpreadsheet className="h-8 w-8 text-green-600 mx-auto" />;
      case 'presentation':
        return <FileText className="h-8 w-8 text-orange-600 mx-auto" />;
      case 'text':
        return <FileText className="h-8 w-8 text-gray-600 mx-auto" />;
      case 'archive':
        return <Archive className="h-8 w-8 text-yellow-600 mx-auto" />;
      default:
        return <File className="h-8 w-8 text-gray-500 mx-auto" />;
    }
  };

  return (
    <div className={`min-h-screen flex transition-colors duration-200 ${
      isDark ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        multiple={true}
      />

      {/* Sidebar */}
      <div className="w-80 p-4 flex flex-col">
        <div className={`rounded-lg shadow-lg border flex flex-col h-full transition-colors duration-200 ${
          isDark 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        }`}>
        {/* Sidebar Header */}
        <div className={`px-6 py-4 border-b transition-colors duration-200 ${
          isDark ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center">
            <FolderOpen className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className={`text-xl font-semibold transition-colors duration-200 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>My Drive</h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-6 space-y-3">
          <button
            onClick={handleUploadFile}
            disabled={uploading}
            className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            <Upload className="h-5 w-5 mr-2" />
            {uploading ? `Uploading... ${uploadProgress}%` : 'Upload Files'}
          </button>
          
          <button
            onClick={handleCreateFolder}
            disabled={uploading || creatingFolder}
            className={`w-full flex items-center justify-center px-4 py-3 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors ${
              isDark 
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            <FolderPlus className="h-5 w-5 mr-2" />
            {creatingFolder ? 'Creating...' : 'New Folder'}
          </button>
        </div>

        {/* Recent Files Section */}
        <div className="flex-1 px-6 pb-6">
          <div className="mb-4">
            <h3 className={`text-sm font-semibold mb-3 flex items-center transition-colors duration-200 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              <Clock className="h-4 w-4 mr-2" />
              Recent Files
            </h3>
          </div>
          
          <div className="space-y-2">
            {recentFiles.map((file, index) => (
              <div
                key={index}
                className={`flex items-center p-3 rounded-lg cursor-pointer group transition-colors ${
                  isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                }`}
                onClick={() => handleRecentFileClick(file)}
              >
                <File className={`h-5 w-5 mr-3 transition-colors duration-200 ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate transition-colors duration-200 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    {file.name}
                  </p>
                  <p className={`text-xs transition-colors duration-200 ${
                    isDark ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {formatFileSize(file.size)} • {formatDate(file.modified_at)}
                  </p>
                </div>
                <button className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity ${
                  isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                }`}>
                  <MoreVertical className={`h-4 w-4 transition-colors duration-200 ${
                    isDark ? 'text-gray-500' : 'text-gray-400'
                  }`} />
                </button>
              </div>
            ))}
            {recentFiles.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                No recent files
              </p>
            )}
          </div>
          
          {/* Trash Section */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => navigate('/drive/trash')}
              className={`w-full flex items-center p-3 rounded-lg transition-colors ${
                isDark ? 'hover:bg-gray-700 text-gray-300 hover:text-white' : 'hover:bg-gray-50 text-gray-600 hover:text-gray-900'
              }`}
            >
              <Trash2 className="h-5 w-5 mr-3" />
              <span className="text-sm font-medium">Trash</span>
            </button>
          </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col m-4">
        <div className={`rounded-lg shadow-lg border overflow-hidden transition-colors duration-200 ${
          isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          {/* Header */}
          <div className={`border-b transition-colors duration-200 ${
            isDark ? 'border-gray-700' : 'border-gray-200'
          }`}>
          <div className="px-6 py-4">
            <div className="flex justify-between items-center h-8">
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
                    <span className={`text-xl font-semibold transition-colors duration-200 ${
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
                        <span className={`text-xl font-medium transition-colors duration-200 ${
                          isDark ? 'text-gray-300' : 'text-gray-700'
                        }`}>{folder}</span>
                      </button>
                    </div>
                  ))}
                  
                  {currentPath && (
                    <button
                      onClick={handleBackClick}
                      className={`flex items-center px-4 py-1 ml-4 rounded transition-colors ${
                        isDark 
                          ? 'bg-gray-700 hover:bg-gray-600' 
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      <ArrowLeft className="h-5 w-5 mr-2" />
                      <span className={`text-xl font-medium transition-colors duration-200 ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}>Back</span>
                    </button>
                  )}
                </div>

                {/* Search Bar */}
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className={`h-4 w-4 transition-colors duration-200 ${
                        isDark ? 'text-gray-400' : 'text-gray-500'
                      }`} />
                    </div>
                    <input
                      type="text"
                      placeholder="Search files and folders..."
                      value={searchQuery}
                      onChange={handleSearchInputChange}
                      className={`block w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                        isDark 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                    {searchQuery && (
                      <div className="absolute inset-y-0 right-0 flex items-center">
                        <button
                          onClick={() => setShowSearchFilters(!showSearchFilters)}
                          className={`p-1 mr-1 rounded transition-colors ${
                            isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                          } ${selectedFileType ? 'text-blue-500' : ''}`}
                          title="Filter by file type"
                        >
                          <Filter className="h-4 w-4" />
                        </button>
                        <button
                          onClick={clearSearch}
                          className={`p-1 mr-2 rounded transition-colors ${
                            isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                          }`}
                          title="Clear search"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Search Filters Dropdown */}
                  {showSearchFilters && searchQuery && (
                    <div className={`absolute mt-2 w-64 rounded-lg shadow-lg border z-10 transition-colors duration-200 ${
                      isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                    }`}>
                      <div className="p-3">
                        <h4 className={`text-sm font-medium mb-2 transition-colors duration-200 ${
                          isDark ? 'text-white' : 'text-gray-900'
                        }`}>Filter by type:</h4>
                        <div className="grid grid-cols-2 gap-1">
                          {[
                            { value: '', label: 'All files', icon: '📁' },
                            { value: 'image', label: 'Images', icon: '🖼️' },
                            { value: 'video', label: 'Videos', icon: '🎥' },
                            { value: 'audio', label: 'Audio', icon: '🎵' },
                            { value: 'document', label: 'Documents', icon: '📄' },
                            { value: 'archive', label: 'Archives', icon: '🗜️' },
                          ].map((filter) => (
                            <button
                              key={filter.value}
                              onClick={() => {
                                handleFileTypeFilter(filter.value);
                                setShowSearchFilters(false);
                              }}
                              className={`text-left px-2 py-1 text-xs rounded transition-colors ${
                                selectedFileType === filter.value
                                  ? 'bg-blue-500 text-white'
                                  : isDark
                                    ? 'hover:bg-gray-700 text-gray-300'
                                    : 'hover:bg-gray-100 text-gray-700'
                              }`}
                            >
                              {filter.icon} {filter.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
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
          <div 
            className={`flex-1 p-6 relative transition-colors duration-200 ${
              isDragOver 
                ? isDark 
                  ? 'bg-blue-900 border-2 border-dashed border-blue-400' 
                  : 'bg-blue-50 border-2 border-dashed border-blue-300'
                : ''
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
          {/* Drag and Drop Overlay */}
          {isDragOver && (
            <div className={`absolute inset-0 bg-opacity-90 flex items-center justify-center z-50 pointer-events-none transition-colors duration-200 ${
              isDark ? 'bg-blue-900' : 'bg-blue-100'
            }`}>
              <div className="text-center">
                <Upload className={`h-16 w-16 mx-auto mb-4 transition-colors duration-200 ${
                  isDark ? 'text-blue-400' : 'text-blue-600'
                }`} />
                <h3 className={`text-2xl font-bold mb-2 transition-colors duration-200 ${
                  isDark ? 'text-blue-300' : 'text-blue-700'
                }`}>Drop files here</h3>
                <p className={`transition-colors duration-200 ${
                  isDark ? 'text-blue-400' : 'text-blue-600'
                }`}>Release to upload files to this folder</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-4">📁</div>
              <p className={`transition-colors duration-200 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>Loading your files...</p>
            </div>
          ) : searchActive ? (
            /* Search Results */
            <div>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-semibold transition-colors duration-200 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    Search Results
                  </h3>
                  <button
                    onClick={clearSearch}
                    className={`text-sm px-3 py-1 rounded transition-colors ${
                      isDark 
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    Back to Files
                  </button>
                </div>
                
                {isSearching ? (
                  <div className="text-center py-8">
                    <div className="text-2xl mb-2">🔍</div>
                    <p className={`transition-colors duration-200 ${
                      isDark ? 'text-gray-400' : 'text-gray-600'
                    }`}>Searching...</p>
                  </div>
                ) : (
                  <>
                    <div className={`text-sm mb-4 transition-colors duration-200 ${
                      isDark ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
                      {selectedFileType && (
                        <span className="ml-2 px-2 py-1 bg-blue-500 text-white text-xs rounded">
                          {selectedFileType}
                        </span>
                      )}
                    </div>
                    
                    {searchResults.length === 0 ? (
                      <div className="text-center py-16">
                        <div className="text-4xl mb-4">🔍</div>
                        <h3 className={`text-lg font-semibold mb-2 transition-colors duration-200 ${
                          isDark ? 'text-white' : 'text-gray-900'
                        }`}>No results found</h3>
                        <p className={`transition-colors duration-200 ${
                          isDark ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          Try adjusting your search terms or removing filters
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                        {searchResults.map((item, index) => (
                          <div 
                            key={index} 
                            className={`rounded-lg border p-4 hover:shadow-md transition-all duration-200 cursor-pointer group relative ${
                              isDark 
                                ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' 
                                : 'bg-white border-gray-200 hover:bg-gray-50'
                            }`}
                            onClick={() => {
                              if (item.is_directory) {
                                // Navigate to folder and clear search
                                setCurrentPath(item.path);
                                clearSearch();
                              } else {
                                handleFilePreview(item);
                              }
                            }}
                          >
                            <div className="text-center">
                              <div className="text-3xl mb-2">
                                {item.is_directory ? 
                                  <Folder className="h-8 w-8 text-blue-500 mx-auto" /> : 
                                  getFileIcon(getFileTypeCategory(item.type, item.name))
                                }
                              </div>
                              <div className={`text-sm font-medium truncate transition-colors duration-200 ${
                                isDark ? 'text-white' : 'text-gray-900'
                              }`} title={item.name}>
                                {item.name}
                              </div>
                              {!item.is_directory && (
                                <div className={`text-xs mt-1 transition-colors duration-200 ${
                                  isDark ? 'text-gray-400' : 'text-gray-500'
                                }`}>
                                  {formatFileSize(item.size)}
                                </div>
                              )}
                              <div className={`text-xs mt-1 transition-colors duration-200 ${
                                isDark ? 'text-gray-500' : 'text-gray-400'
                              }`}>
                                {formatDate(item.modified_at)}
                              </div>
                              
                              {/* Path indicator for search results */}
                              {item.path.includes('/') && (
                                <div className={`text-xs mt-1 truncate transition-colors duration-200 ${
                                  isDark ? 'text-blue-400' : 'text-blue-600'
                                }`} title={item.path}>
                                  📁 {item.path.substring(0, item.path.lastIndexOf('/'))}
                                </div>
                              )}
                              
                              {/* Action buttons on hover */}
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="flex space-x-1">
                                  {item.is_directory ? (
                                    <div className={`rounded p-1 shadow transition-colors duration-200 ${
                                      isDark ? 'bg-gray-700' : 'bg-white'
                                    }`}>
                                      <FolderOpen className="h-4 w-4 text-blue-600" />
                                    </div>
                                  ) : (
                                    <div className={`rounded p-1 shadow transition-colors duration-200 ${
                                      isDark ? 'bg-gray-700' : 'bg-white'
                                    }`}>
                                      <Eye className={`h-4 w-4 transition-colors duration-200 ${
                                        isDark ? 'text-gray-400' : 'text-gray-600'
                                      }`} />
                                    </div>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(item);
                                    }}
                                    className={`rounded p-1 shadow transition-colors duration-200 ${
                                      isDark 
                                        ? 'bg-gray-700 hover:bg-red-900' 
                                        : 'bg-white hover:bg-red-50'
                                    }`}
                                    title={`Delete ${item.is_directory ? 'folder' : 'file'}`}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📁</div>
              <h2 className={`text-2xl font-bold mb-2 transition-colors duration-200 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>Welcome to Your Drive</h2>
              <p className={`mb-8 transition-colors duration-200 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Your personal file storage and management system
              </p>
              
              <div className={`rounded-lg shadow p-8 max-w-md mx-auto transition-colors duration-200 ${
                isDark ? 'bg-gray-800' : 'bg-white'
              }`}>
                <Upload className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className={`text-lg font-semibold mb-2 transition-colors duration-200 ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  Get Started
                </h3>
                <p className={`text-sm mb-4 transition-colors duration-200 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Upload your first file, create a folder, or simply drag and drop files here to get started.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleUploadFile}
                    className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Upload
                  </button>
                  <button
                    onClick={handleCreateFolder}
                    className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    <FolderPlus className="h-4 w-4 mr-1" />
                    New Folder
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              {/* Files and Folders Grid */}
              <div className="mb-6">
                <h3 className={`text-lg font-semibold mb-4 transition-colors duration-200 ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>Your Files</h3>
                {/* Files and Folders Grid */}
              <div className="mb-4 text-center">
                <p className={`text-sm transition-colors duration-200 ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  💡 Tip: You can drag and drop files directly onto this area to upload them
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {files.map((item, index) => (
                    <div 
                      key={index} 
                      className={`rounded-lg border p-4 hover:shadow-md transition-all duration-200 cursor-pointer group relative ${
                        isDark 
                          ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' 
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => item.is_directory ? handleFolderClick(item.name) : handleFilePreview(item)}
                    >
                      <div className="text-center">
                        <div className="text-3xl mb-2">
                          {item.is_directory ? 
                            <Folder className="h-8 w-8 text-blue-500 mx-auto" /> : 
                            getFileIcon(getFileTypeCategory(item.type, item.name))
                          }
                        </div>
                        <div className={`text-sm font-medium truncate transition-colors duration-200 ${
                          isDark ? 'text-white' : 'text-gray-900'
                        }`} title={item.name}>
                          {item.name}
                        </div>
                        {!item.is_directory && (
                          <div className={`text-xs mt-1 transition-colors duration-200 ${
                            isDark ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            {formatFileSize(item.size)}
                          </div>
                        )}
                        <div className={`text-xs mt-1 transition-colors duration-200 ${
                          isDark ? 'text-gray-500' : 'text-gray-400'
                        }`}>
                          {formatDate(item.modified_at)}
                        </div>
                        
                        {/* Action buttons on hover */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex space-x-1">
                            {item.is_directory ? (
                              <div className={`rounded p-1 shadow transition-colors duration-200 ${
                                isDark ? 'bg-gray-700' : 'bg-white'
                              }`}>
                                <FolderOpen className="h-4 w-4 text-blue-600" />
                              </div>
                            ) : (
                              <div className={`rounded p-1 shadow transition-colors duration-200 ${
                                isDark ? 'bg-gray-700' : 'bg-white'
                              }`}>
                                <Eye className={`h-4 w-4 transition-colors duration-200 ${
                                  isDark ? 'text-gray-400' : 'text-gray-600'
                                }`} />
                              </div>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(item);
                              }}
                              className={`rounded p-1 shadow transition-colors duration-200 ${
                                isDark 
                                  ? 'bg-gray-700 hover:bg-red-900' 
                                  : 'bg-white hover:bg-red-50'
                              }`}
                              title={`Delete ${item.is_directory ? 'folder' : 'file'}`}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      </div>

      {/* File Preview Modal */}
      {showPreviewModal && previewFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto transition-colors duration-200 ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold transition-colors duration-200 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>{previewFile.name}</h3>
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setPreviewFile(null);
                }}
                className={`transition-colors ${
                  isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">File Type:</span>
                  <span className="ml-2 text-gray-600">{previewFile.type}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Size:</span>
                  <span className="ml-2 text-gray-600">{formatFileSize(previewFile.size)}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Modified:</span>
                  <span className="ml-2 text-gray-600">{formatDate(previewFile.modified_at)}</span>
                </div>
              </div>
            </div>
            
            {/* File Preview Content */}
            <div className="border rounded-lg p-4 bg-gray-50 mb-4">
              {(() => {
                const fileType = getFileTypeCategory(previewFile.type, previewFile.name);
                const viewUrl = filesAPI.getViewUrl(previewFile.path);
                
                switch (fileType) {
                  case 'image':
                    return (
                      <div className="text-center">
                        <img 
                          src={viewUrl} 
                          alt={previewFile.name}
                          className="max-w-full max-h-96 mx-auto rounded"
                        />
                      </div>
                    );
                    
                  case 'video':
                    return (
                      <div className="text-center">
                        <video 
                          controls 
                          className="max-w-full max-h-96 mx-auto rounded"
                          preload="metadata"
                        >
                          <source src={viewUrl} type={previewFile.type} />
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    );
                    
                  case 'audio':
                    return (
                      <div className="text-center py-8">
                        <div className="text-6xl mb-4">🎵</div>
                        <audio 
                          controls 
                          className="w-full max-w-md mx-auto"
                          preload="metadata"
                        >
                          <source src={viewUrl} type={previewFile.type} />
                          Your browser does not support the audio tag.
                        </audio>
                        <p className="text-gray-600 mt-4">{previewFile.name}</p>
                      </div>
                    );
                    
                  case 'pdf':
                    return (
                      <div className="text-center">
                        <object
                          data={viewUrl}
                          type="application/pdf"
                          className="w-full h-96 rounded border"
                          title="PDF Preview"
                        >
                          <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded border">
                            <FileText className="h-16 w-16 text-gray-400 mb-4" />
                            <p className="text-gray-600 mb-4">PDF preview not available in this browser</p>
                            <button
                              onClick={() => window.open(viewUrl, '_blank')}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                            >
                              Open in New Tab
                            </button>
                          </div>
                        </object>
                        <p className="text-sm text-gray-600 mt-2">
                          PDF preview - Click "Open in New Tab" if preview doesn't load
                        </p>
                      </div>
                    );
                    
                  case 'text':
                    return (
                      <div className="bg-white p-4 rounded border">
                        <iframe
                          src={viewUrl}
                          className="w-full h-64 border-0"
                          title="Text Preview"
                        />
                      </div>
                    );
                    
                  case 'document':
                    return (
                      <div className="text-center py-8">
                        <div className="text-6xl mb-4">📄</div>
                        <h4 className="text-lg font-medium text-gray-900 mb-2">Word Document</h4>
                        <p className="text-gray-600 mb-4">
                          This is a Microsoft Word document (.docx/.doc)
                        </p>
                        <div className="flex gap-3 justify-center">
                          <button
                            onClick={() => window.open(viewUrl, '_blank')}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                          >
                            Open in Browser
                          </button>
                          <button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = `filesAPI.getDownloadUrl(previewFile.path)`;
                              link.download = previewFile.name;
                              link.click();
                            }}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm"
                          >
                            Download to Open
                          </button>
                        </div>
                      </div>
                    );
                    
                  case 'spreadsheet':
                    return (
                      <div className="text-center py-8">
                        <div className="text-6xl mb-4">📊</div>
                        <h4 className="text-lg font-medium text-gray-900 mb-2">Excel Spreadsheet</h4>
                        <p className="text-gray-600 mb-4">
                          This is a Microsoft Excel spreadsheet (.xlsx/.xls)
                        </p>
                        <div className="flex gap-3 justify-center">
                          <button
                            onClick={() => window.open(viewUrl, '_blank')}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
                          >
                            Open in Browser
                          </button>
                          <button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = `filesAPI.getDownloadUrl(previewFile.path)`;
                              link.download = previewFile.name;
                              link.click();
                            }}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm"
                          >
                            Download to Open
                          </button>
                        </div>
                      </div>
                    );
                    
                  case 'presentation':
                    return (
                      <div className="text-center py-8">
                        <div className="text-6xl mb-4">📽️</div>
                        <h4 className="text-lg font-medium text-gray-900 mb-2">PowerPoint Presentation</h4>
                        <p className="text-gray-600 mb-4">
                          This is a Microsoft PowerPoint presentation (.pptx/.ppt)
                        </p>
                        <div className="flex gap-3 justify-center">
                          <button
                            onClick={() => window.open(viewUrl, '_blank')}
                            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm"
                          >
                            Open in Browser
                          </button>
                          <button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = `filesAPI.getDownloadUrl(previewFile.path)`;
                              link.download = previewFile.name;
                              link.click();
                            }}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm"
                          >
                            Download to Open
                          </button>
                        </div>
                      </div>
                    );
                    
                  case 'archive':
                    return (
                      <div className="text-center py-8">
                        <div className="text-6xl mb-4">🗜️</div>
                        <h4 className="text-lg font-medium text-gray-900 mb-2">Archive File</h4>
                        <p className="text-gray-600 mb-4">
                          This is a compressed archive file
                        </p>
                        <button
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = `filesAPI.getDownloadUrl(previewFile.path)`;
                            link.download = previewFile.name;
                            link.click();
                          }}
                          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm"
                        >
                          Download to Extract
                        </button>
                      </div>
                    );
                    
                  default:
                    return (
                      <div className="text-center py-8">
                        <File className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h4 className="text-lg font-medium text-gray-900 mb-2">Unknown File Type</h4>
                        <p className="text-gray-600 mb-4">Preview not available for this file type</p>
                        <div className="flex gap-3 justify-center">
                          <button
                            onClick={() => window.open(viewUrl, '_blank')}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                          >
                            Try to Open
                          </button>
                          <button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = `filesAPI.getDownloadUrl(previewFile.path)`;
                              link.download = previewFile.name;
                              link.click();
                            }}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm"
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    );
                }
              })()}
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3">
              {canPreviewInline(getFileTypeCategory(previewFile.type, previewFile.name), previewFile.type) && (
                <button
                  onClick={() => window.open(filesAPI.getViewUrl(previewFile.path), '_blank')}
                  className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Open in New Tab
                </button>
              )}
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = `filesAPI.getDownloadUrl(previewFile.path)`;
                  link.download = previewFile.name;
                  link.click();
                }}
                className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </button>
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setPreviewFile(null);
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Create New Folder</h3>
              <button
                onClick={() => {
                  setShowCreateFolderModal(false);
                  setFolderName('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateFolderSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Folder Name
                </label>
                <input
                  type="text"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="Enter folder name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                  required
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateFolderModal(false);
                    setFolderName('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingFolder || !folderName.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  {creatingFolder ? 'Creating...' : 'Create Folder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && itemToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="text-center">
              <Trash2 className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Move to Trash
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to move "{itemToDelete.name}" to trash?
                {itemToDelete.is_directory && (
                  <span className="block mt-2 text-sm text-orange-600">
                    This will move the folder and all its contents to trash.
                  </span>
                )}
                <span className="block mt-2 text-sm text-gray-500">
                  You can restore it from the trash within 30 days.
                </span>
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setItemToDelete(null);
                  }}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed text-gray-800 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  {deleting ? 'Moving to Trash...' : 'Move to Trash'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Progress Overlay */}
      {uploading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="text-center">
              <Upload className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Uploading File</h3>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600">{uploadProgress}% complete</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Drive;
