import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { filesAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { LogOut, Camera, Upload, X, Eye, Download, FileImage, FileVideo, Trash2, Sun, Moon, Search, Filter } from 'lucide-react';

const Photos = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  // Photo and video state
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
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

  // Fetch media files when component mounts
  useEffect(() => {
    fetchMediaFiles();
  }, []);

  const fetchMediaFiles = async () => {
    try {
      setLoading(true);
      const response = await filesAPI.listFiles('', 'photos'); // Use photos context with empty path
      
      // Filter only image and video files, then sort by date (newest first)
      const mediaFiles = response.data.items
        .filter(item => !item.is_directory && isMediaFile(item.type, item.name))
        .sort((a, b) => new Date(b.modified_at) - new Date(a.modified_at));
      
      setMedia(mediaFiles);
    } catch (error) {
      console.error('Error fetching media files:', error);
      if (error.response?.status === 401) {
        logout();
        navigate('/photos/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const isMediaFile = (mimeType, fileName) => {
    if (!mimeType && !fileName) return false;
    
    const extension = fileName ? fileName.split('.').pop().toLowerCase() : '';
    
    // Images
    if (mimeType?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(extension)) {
      return true;
    }
    
    // Videos
    if (mimeType?.startsWith('video/') || ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', '3gp', 'm4v'].includes(extension)) {
      return true;
    }
    
    return false;
  };

  const getMediaType = (mimeType, fileName) => {
    if (!mimeType && !fileName) return 'other';
    
    const extension = fileName ? fileName.split('.').pop().toLowerCase() : '';
    
    // Images
    if (mimeType?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(extension)) {
      return 'image';
    }
    
    // Videos
    if (mimeType?.startsWith('video/') || ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', '3gp', 'm4v'].includes(extension)) {
      return 'video';
    }
    
    return 'other';
  };

  const handleUploadFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    // Filter to only allow image and video files
    const mediaFiles = files.filter(file => isMediaFile(file.type, file.name));
    
    if (mediaFiles.length === 0) {
      alert('Please select only image or video files.');
      return;
    }

    if (mediaFiles.length < files.length) {
      alert(`${files.length - mediaFiles.length} non-media files were filtered out. Only images and videos are allowed.`);
    }

    // Upload each media file
    for (const file of mediaFiles) {
      await uploadSingleFile(file);
    }
    
    // Reset file input and refresh media list after all uploads
    event.target.value = '';
    await fetchMediaFiles();
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

    // Filter to only allow image and video files
    const mediaFiles = files.filter(file => isMediaFile(file.type, file.name));
    
    if (mediaFiles.length === 0) {
      alert('Please drop only image or video files.');
      return;
    }

    if (mediaFiles.length < files.length) {
      alert(`${files.length - mediaFiles.length} non-media files were filtered out. Only images and videos are allowed.`);
    }

    // Upload each media file
    for (const file of mediaFiles) {
      await uploadSingleFile(file);
    }
    
    // Refresh media list after all uploads
    await fetchMediaFiles();
    setUploading(false);
    setUploadProgress(0);
  };

  const uploadSingleFile = async (file) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      const response = await filesAPI.uploadFile(file, '', 'photos'); // Upload to photos context with empty path
      console.log('Media file uploaded successfully:', response.data);
      
    } catch (error) {
      console.error('Upload error:', error);
      if (error.response?.status === 401) {
        logout();
        navigate('/photos/login');
      } else {
        alert(`Failed to upload file "${file.name}". Please try again.`);
      }
    }
  };

  const handleMediaPreview = (mediaFile) => {
    setPreviewFile(mediaFile);
    setShowPreviewModal(true);
  };

  const handleDelete = (item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      setDeleting(true);
      await filesAPI.deleteFile(itemToDelete.path, 'photos');
      
      // Refresh the media list
      await fetchMediaFiles();
      
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
    navigate('/photos/login');
  };

  const handleSearch = async (query, fileType = '') => {
    if (!query || query.trim().length < 2) {
      setSearchActive(false);
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await filesAPI.searchFiles(query.trim(), 'photos', fileType || null);
      // Filter only media files from search results
      const mediaResults = response.data.results.filter(item => 
        !item.is_directory && isMediaFile(item.type, item.name)
      );
      setSearchResults(mediaResults);
      setSearchActive(true);
    } catch (error) {
      console.error('Search error:', error);
      if (error.response?.status === 401) {
        logout();
        navigate('/photos/login');
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

  const getMediaIcon = (mediaType) => {
    switch (mediaType) {
      case 'image':
        return <FileImage className="h-8 w-8 text-green-500 mx-auto" />;
      case 'video':
        return <FileVideo className="h-8 w-8 text-red-500 mx-auto" />;
      default:
        return <FileImage className="h-8 w-8 text-gray-500 mx-auto" />;
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
        accept="image/*,video/*"
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
              <Camera className="h-8 w-8 text-purple-600 mr-3" />
              <h1 className={`text-xl font-semibold transition-colors duration-200 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>My Photos</h1>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-6 py-6 space-y-3">
            <button
              onClick={handleUploadFile}
              disabled={uploading}
              className="w-full flex items-center justify-center px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              <Upload className="h-5 w-5 mr-2" />
              {uploading ? `Uploading... ${uploadProgress}%` : 'Upload Photos'}
            </button>
          </div>

          {/* Info Section */}
          <div className="flex-1 px-6 pb-6">
            <div className="mb-4">
              <h3 className={`text-sm font-semibold mb-3 flex items-center transition-colors duration-200 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                <Camera className="h-4 w-4 mr-2" />
                Gallery Info
              </h3>
            </div>
            
            <div className={`rounded-lg p-4 transition-colors duration-200 ${
              isDark ? 'bg-gray-700' : 'bg-gray-50'
            }`}>
              <p className={`text-sm transition-colors duration-200 ${
                isDark ? 'text-gray-300' : 'text-gray-600'
              }`}>
                📸 Upload your photos and videos to create your personal gallery timeline
              </p>
              <p className={`text-xs mt-2 transition-colors duration-200 ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Supported formats: JPG, PNG, GIF, MP4, MOV, and more
              </p>
            </div>
            
            {/* Trash Section */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => navigate('/photos/trash')}
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
                  <div className="flex items-center space-x-2 mr-6">
                    <h2 className={`text-xl font-semibold transition-colors duration-200 ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}>Photo Gallery</h2>
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
                        placeholder="Search photos and videos..."
                        value={searchQuery}
                        onChange={handleSearchInputChange}
                        className={`block w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
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
                            } ${selectedFileType ? 'text-purple-500' : ''}`}
                            title="Filter by media type"
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
                      <div className={`absolute mt-2 w-48 rounded-lg shadow-lg border z-10 transition-colors duration-200 ${
                        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                      }`}>
                        <div className="p-3">
                          <h4 className={`text-sm font-medium mb-2 transition-colors duration-200 ${
                            isDark ? 'text-white' : 'text-gray-900'
                          }`}>Filter by type:</h4>
                          <div className="space-y-1">
                            {[
                              { value: '', label: 'All media', icon: '📸' },
                              { value: 'image', label: 'Images', icon: '🖼️' },
                              { value: 'video', label: 'Videos', icon: '🎥' },
                            ].map((filter) => (
                              <button
                                key={filter.value}
                                onClick={() => {
                                  handleFileTypeFilter(filter.value);
                                  setShowSearchFilters(false);
                                }}
                                className={`w-full text-left px-2 py-1 text-xs rounded transition-colors ${
                                  selectedFileType === filter.value
                                    ? 'bg-purple-500 text-white'
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
                  ? 'bg-purple-900 border-2 border-dashed border-purple-400' 
                  : 'bg-purple-50 border-2 border-dashed border-purple-300'
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
                isDark ? 'bg-purple-900' : 'bg-purple-100'
              }`}>
                <div className="text-center">
                  <Upload className={`h-16 w-16 mx-auto mb-4 transition-colors duration-200 ${
                    isDark ? 'text-purple-400' : 'text-purple-600'
                  }`} />
                  <h3 className={`text-2xl font-bold mb-2 transition-colors duration-200 ${
                    isDark ? 'text-purple-300' : 'text-purple-700'
                  }`}>Drop photos & videos here</h3>
                  <p className={`transition-colors duration-200 ${
                    isDark ? 'text-purple-400' : 'text-purple-600'
                  }`}>Release to upload media files to your gallery</p>
                </div>
              </div>
            )}

            {loading ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-4">📸</div>
                <p className={`transition-colors duration-200 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>Loading your photos...</p>
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
                      Back to Gallery
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
                          <span className="ml-2 px-2 py-1 bg-purple-500 text-white text-xs rounded">
                            {selectedFileType}
                          </span>
                        )}
                      </div>
                      
                      {searchResults.length === 0 ? (
                        <div className="text-center py-16">
                          <div className="text-4xl mb-4">🔍</div>
                          <h3 className={`text-lg font-semibold mb-2 transition-colors duration-200 ${
                            isDark ? 'text-white' : 'text-gray-900'
                          }`}>No media found</h3>
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
                              className={`rounded-lg border overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer group ${
                                isDark 
                                  ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' 
                                  : 'bg-white border-gray-200 hover:bg-gray-50'
                              }`}
                              onClick={() => handleMediaPreview(item)}
                            >
                              <div className="aspect-square relative">
                                {isImageFile(item.type, item.name) ? (
                                  <img 
                                    src={filesAPI.getViewUrl(item.path, 'photos')} 
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gray-900 flex items-center justify-center relative">
                                    <video 
                                      src={filesAPI.getViewUrl(item.path, 'photos')}
                                      className="w-full h-full object-cover"
                                      muted
                                      preload="metadata"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                                      <div className="text-white text-2xl">▶️</div>
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              <div className="p-2">
                                <div className={`text-xs font-medium truncate transition-colors duration-200 ${
                                  isDark ? 'text-white' : 'text-gray-900'
                                }`} title={item.name}>
                                  {item.name}
                                </div>
                                <div className={`text-xs mt-1 transition-colors duration-200 ${
                                  isDark ? 'text-gray-400' : 'text-gray-500'
                                }`}>
                                  {formatFileSize(item.size)}
                                </div>
                                <div className={`text-xs transition-colors duration-200 ${
                                  isDark ? 'text-gray-500' : 'text-gray-400'
                                }`}>
                                  {formatDate(item.modified_at)}
                                </div>
                                
                                {/* Path indicator for search results */}
                                {item.path.includes('/') && (
                                  <div className={`text-xs mt-1 truncate transition-colors duration-200 ${
                                    isDark ? 'text-purple-400' : 'text-purple-600'
                                  }`} title={item.path}>
                                    📁 {item.path.substring(0, item.path.lastIndexOf('/'))}
                                  </div>
                                )}
                              </div>

                              {/* Action buttons on hover */}
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="flex space-x-1">
                                  <div className={`rounded p-1 shadow transition-colors duration-200 ${
                                    isDark ? 'bg-gray-700' : 'bg-white'
                                  }`}>
                                    <Eye className={`h-4 w-4 transition-colors duration-200 ${
                                      isDark ? 'text-gray-400' : 'text-gray-600'
                                    }`} />
                                  </div>
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
                                    title="Delete media"
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </button>
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
            ) : media.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📸</div>
                <h2 className={`text-2xl font-bold mb-2 transition-colors duration-200 ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>Welcome to Your Photo Gallery</h2>
                <p className={`mb-8 transition-colors duration-200 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Your personal photo and video collection
                </p>
                
                <div className={`rounded-lg shadow p-8 max-w-md mx-auto transition-colors duration-200 ${
                  isDark ? 'bg-gray-800' : 'bg-white'
                }`}>
                  <Camera className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                  <h3 className={`text-lg font-semibold mb-2 transition-colors duration-200 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    Start Your Gallery
                  </h3>
                  <p className={`text-sm mb-4 transition-colors duration-200 ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Upload your photos and videos to create a beautiful timeline gallery.
                  </p>
                  <button
                    onClick={handleUploadFile}
                    className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors mx-auto"
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Upload Media
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* Media Gallery Grid */}
                <div className="mb-6">
                  <h3 className={`text-lg font-semibold mb-4 transition-colors duration-200 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>Your Photos & Videos ({media.length})</h3>
                  
                  <div className="mb-4 text-center">
                    <p className={`text-sm transition-colors duration-200 ${
                      isDark ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      📸 Sorted by upload date (newest first) • Drag & drop to add more media
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {media.map((item, index) => (
                      <div 
                        key={index} 
                        className={`rounded-lg border p-2 hover:shadow-md transition-all duration-200 cursor-pointer group relative ${
                          isDark 
                            ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' 
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => handleMediaPreview(item)}
                      >
                        <div className="aspect-square relative overflow-hidden rounded">
                          {getMediaType(item.type, item.name) === 'image' ? (
                            <img 
                              src={filesAPI.getViewUrl(item.path, 'photos')} 
                              alt={item.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-900 flex items-center justify-center relative">
                              <video 
                                src={filesAPI.getViewUrl(item.path, 'photos')}
                                className="w-full h-full object-cover"
                                muted
                                preload="metadata"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                                <div className="text-white text-2xl">▶️</div>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-2">
                          <div className={`text-xs font-medium truncate transition-colors duration-200 ${
                            isDark ? 'text-white' : 'text-gray-900'
                          }`} title={item.name}>
                            {item.name}
                          </div>
                          <div className={`text-xs mt-1 transition-colors duration-200 ${
                            isDark ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            {formatFileSize(item.size)} • {formatDate(item.modified_at)}
                          </div>
                        </div>
                        
                        {/* Action buttons on hover */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex space-x-1">
                            <div className={`rounded p-1 shadow transition-colors duration-200 ${
                              isDark ? 'bg-gray-700' : 'bg-white'
                            }`}>
                              <Eye className={`h-3 w-3 transition-colors duration-200 ${
                                isDark ? 'text-gray-400' : 'text-gray-600'
                              }`} />
                            </div>
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
                              title="Delete media"
                            >
                              <Trash2 className="h-3 w-3 text-red-600" />
                            </button>
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

      {/* Media Preview Modal */}
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
                  <span className={`font-medium transition-colors duration-200 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>File Type:</span>
                  <span className={`ml-2 transition-colors duration-200 ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>{previewFile.type}</span>
                </div>
                <div>
                  <span className={`font-medium transition-colors duration-200 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>Size:</span>
                  <span className={`ml-2 transition-colors duration-200 ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>{formatFileSize(previewFile.size)}</span>
                </div>
                <div>
                  <span className={`font-medium transition-colors duration-200 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>Date:</span>
                  <span className={`ml-2 transition-colors duration-200 ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>{formatDate(previewFile.modified_at)}</span>
                </div>
              </div>
            </div>
            
            {/* Media Preview Content */}
            <div className={`border rounded-lg p-4 mb-4 transition-colors duration-200 ${
              isDark ? 'border-gray-600 bg-gray-900' : 'border-gray-200 bg-gray-50'
            }`}>
              {(() => {
                const mediaType = getMediaType(previewFile.type, previewFile.name);
                const viewUrl = filesAPI.getViewUrl(previewFile.path, 'photos');
                
                if (mediaType === 'image') {
                  return (
                    <div className="text-center">
                      <img 
                        src={viewUrl} 
                        alt={previewFile.name}
                        className="max-w-full max-h-96 mx-auto rounded"
                      />
                    </div>
                  );
                } else if (mediaType === 'video') {
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
                } else {
                  return (
                    <div className="text-center py-8">
                      <FileImage className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h4 className={`text-lg font-medium mb-2 transition-colors duration-200 ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}>Media File</h4>
                      <p className={`mb-4 transition-colors duration-200 ${
                        isDark ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Preview not available for this media type
                      </p>
                    </div>
                  );
                }
              })()}
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => window.open(filesAPI.getViewUrl(previewFile.path, 'photos'), '_blank')}
                className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                <Eye className="h-4 w-4 mr-2" />
                Open in New Tab
              </button>
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = filesAPI.getDownloadUrl(previewFile.path);
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
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isDark 
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && itemToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 w-full max-w-md mx-4 transition-colors duration-200 ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="text-center">
              <Trash2 className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h3 className={`text-lg font-semibold mb-2 transition-colors duration-200 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Move to Trash
              </h3>
              <p className={`mb-6 transition-colors duration-200 ${
                isDark ? 'text-gray-300' : 'text-gray-600'
              }`}>
                Are you sure you want to move "{itemToDelete.name}" to trash?
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
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    isDark 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 disabled:opacity-50' 
                      : 'bg-gray-300 hover:bg-gray-400 text-gray-800 disabled:opacity-50'
                  }`}
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
          <div className={`rounded-lg p-6 w-full max-w-md mx-4 transition-colors duration-200 ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="text-center">
              <Upload className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h3 className={`text-lg font-semibold mb-2 transition-colors duration-200 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>Uploading Media</h3>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className={`text-sm transition-colors duration-200 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>{uploadProgress}% complete</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Photos;
