import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { filesAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, Camera, Upload, X, Eye, Download, FileImage, FileVideo, 
  Trash2, Sun, Moon, Search, Filter, Menu, Grid, List 
} from 'lucide-react';
import MobileHeader from './MobileHeader';
import ResponsiveSidebar from './ResponsiveSidebar';

const Photos = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  // Photo and video state
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recentFiles, setRecentFiles] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  
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

  // Mobile responsive state
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  // Fetch media files when component mounts
  useEffect(() => {
    fetchMediaFiles();
  }, []);

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

  // Close mobile menu when clicking outside or on navigation
  useEffect(() => {
    if (showMobileMenu && !isMobile) {
      setShowMobileMenu(false);
    }
  }, [isMobile, showMobileMenu]);

  const fetchMediaFiles = async () => {
    try {
      setLoading(true);
      const response = await filesAPI.getPhotos();
      // Filter only media files - use items from the list endpoint
      const mediaFiles = response.data.items.filter(file => 
        isMediaFile(file.mimeType, file.name)
      );
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

  const fetchRecentFiles = async () => {
    try {
      setLoadingRecent(true);
      const response = await filesAPI.getRecentFiles(5, 'photos');
      setRecentFiles(response.data.files);
    } catch (error) {
      console.error('Error fetching recent files:', error);
    } finally {
      setLoadingRecent(false);
    }
  };

  const isMediaFile = (mimeType, fileName) => {
    if (!mimeType && !fileName) return false;
    
    // Check MIME type first
    if (mimeType) {
      if (mimeType.startsWith('image/') || mimeType.startsWith('video/')) {
        return true;
      }
    }
    
    // Check file extension if MIME type is not available
    if (fileName) {
      const extension = fileName.split('.').pop()?.toLowerCase();
      const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'ico'];
      const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', '3gp', 'ogg'];
      return imageExtensions.includes(extension) || videoExtensions.includes(extension);
    }
    
    return false;
  };

  const getFileType = (mimeType, fileName) => {
    if (!mimeType && !fileName) return 'other';
    
    // Check MIME type first
    if (mimeType) {
      if (mimeType.startsWith('image/')) {
        return 'image';
      }
      if (mimeType.startsWith('video/')) {
        return 'video';
      }
    }
    
    return 'other';
  };

  const handleUploadFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    // Filter only media files
    const mediaFiles = files.filter(file => isMediaFile(file.type, file.name));
    if (mediaFiles.length === 0) {
      alert('Please select only image or video files.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < mediaFiles.length; i++) {
        const file = mediaFiles[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', ''); // Upload to photos root
        formData.append('context', 'photos');

        await filesAPI.uploadFile(formData, {
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              ((i * 100) + (progressEvent.loaded * 100) / progressEvent.total) / mediaFiles.length
            );
            setUploadProgress(progress);
          }
        });
      }
      
      await fetchMediaFiles();
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

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Filter only media files
    const mediaFiles = files.filter(file => isMediaFile(file.type, file.name));
    if (mediaFiles.length === 0) {
      alert('Please drop only image or video files.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < mediaFiles.length; i++) {
        const file = mediaFiles[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', ''); // Upload to photos root
        formData.append('context', 'photos');

        await filesAPI.uploadFile(formData, {
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              ((i * 100) + (progressEvent.loaded * 100) / progressEvent.total) / mediaFiles.length
            );
            setUploadProgress(progress);
          }
        });
      }
      
      await fetchMediaFiles();
      await fetchRecentFiles();
    } catch (error) {
      console.error('Drop upload error:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
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

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchActive(false);
    setSelectedFileType('');
    setShowSearchFilters(false);
  };

  const handleRecentFileClick = (file) => {
    // For photos, just show the preview since photos are in root directory
    handlePreview(file);
  };

  const handleDeleteFile = (file) => {
    setItemToDelete(file);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    setDeleting(true);
    try {
      await filesAPI.deleteFile(itemToDelete.name, 'photos');
      
      setShowDeleteModal(false);
      setItemToDelete(null);
      await fetchMediaFiles();
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
      const response = await filesAPI.downloadFile(file.name, 'photos');
      
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

  const formatDateSection = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return 'This Week';
    } else if (diffDays <= 30) {
      return 'This Month';
    } else if (diffDays <= 365) {
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else {
      return date.getFullYear().toString();
    }
  };

  const groupPhotosByDate = (photos) => {
    if (!photos || photos.length === 0) return {};
    
    // Sort photos by date_taken (or modified if no date_taken) in descending order
    const sortedPhotos = [...photos].sort((a, b) => {
      const dateA = new Date(a.date_taken || a.modified);
      const dateB = new Date(b.date_taken || b.modified);
      return dateB - dateA;
    });
    
    // Group by date sections
    const grouped = {};
    sortedPhotos.forEach(photo => {
      const photoDate = photo.date_taken || photo.modified;
      const section = formatDateSection(photoDate);
      
      if (!grouped[section]) {
        grouped[section] = [];
      }
      grouped[section].push(photo);
    });
    
    return grouped;
  };

  const displayMedia = searchActive ? searchResults : media;
  const groupedPhotos = groupPhotosByDate(displayMedia);

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
        currentPath=""
        title="My Photos"
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
          uploading={uploading}
          uploadProgress={uploadProgress}
          recentFiles={recentFiles}
          loadingRecent={loadingRecent}
          onNavigate={navigate}
          toggleTheme={toggleTheme}
          currentApp="photos"
          onRecentFileClick={handleRecentFileClick}
          customActions={[
            {
              icon: <Camera className="h-5 w-5" />,
              label: 'Upload Photos',
              action: handleUploadFile,
              disabled: uploading
            }
          ]}
        />

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          multiple={true}
          accept="image/*,video/*"
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
                    {/* Title */}
                    <div className="flex items-center mr-6">
                      <Camera className="h-8 w-8 text-purple-600 mr-3" />
                      <h1 className={`responsive-title font-semibold transition-colors duration-200 ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}>My Photos</h1>
                    </div>

                    {/* Search Bar */}
                    <div className="flex-1 max-w-md">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search photos and videos..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSearch(searchQuery, selectedFileType)}
                          className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                            isDark 
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                        />
                        <Search className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                        {searchActive && (
                          <button
                            onClick={clearSearch}
                            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        )}
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
                          isDark ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700'
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
              {searchActive && (
                <div className="lg:hidden mb-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search photos and videos..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch(searchQuery, selectedFileType)}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                        isDark 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                    <Search className="h-5 w-5 text-gray-400 absolute left-3 top-3.5" />
                    <button
                      onClick={clearSearch}
                      className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Drag and drop overlay */}
              {isDragOver && (
                <div className="fixed inset-0 bg-purple-500 bg-opacity-20 flex items-center justify-center z-50">
                  <div className={`p-8 rounded-lg border-2 border-dashed border-purple-500 ${
                    isDark ? 'bg-gray-800' : 'bg-white'
                  }`}>
                    <Camera className="h-12 w-12 text-purple-500 mx-auto mb-4" />
                    <p className={`text-lg font-medium text-center ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                      Drop photos to upload
                    </p>
                  </div>
                </div>
              )}

              {/* Loading state */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  <span className={`ml-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    Loading photos...
                  </span>
                </div>
              ) : (
                <>
                  {/* Empty state */}
                  {displayMedia.length === 0 ? (
                    <div className="text-center py-12">
                      <Camera className={`h-12 w-12 ${isDark ? 'text-gray-600' : 'text-gray-400'} mx-auto mb-3`} />
                      <p className={`text-lg font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {searchActive ? 'No photos found' : 'No photos yet'}
                      </p>
                      <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                        {searchActive ? 'Try adjusting your search' : 'Upload photos and videos to get started'}
                      </p>
                    </div>
                  ) : (
                    /* Date-grouped Media */
                    <div className="space-y-8">
                      {Object.entries(groupedPhotos).map(([dateSection, photos]) => (
                        <div key={dateSection} className="space-y-4">
                          {/* Date Section Header */}
                          <div className="flex items-center space-x-4">
                            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {dateSection}
                            </h2>
                            <div className={`flex-1 h-px ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              {photos.length} {photos.length === 1 ? 'item' : 'items'}
                            </span>
                          </div>

                          {/* Photos Grid/List for this date section */}
                          <div className={
                            viewMode === 'grid' 
                              ? 'responsive-grid'
                              : 'space-y-2'
                          }>
                            {photos.map((item, index) => (
                              <div
                                key={`${dateSection}-${index}`}
                                className={`group relative transition-all duration-200 ${
                                  viewMode === 'grid'
                                    ? `${isDark ? 'bg-gray-750 hover:bg-gray-700 border-gray-600' : 'bg-gray-50 hover:bg-gray-100 border-gray-200'} border rounded-lg overflow-hidden cursor-pointer`
                                    : `${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} flex items-center p-3 rounded-lg cursor-pointer`
                                }`}
                                onClick={() => handlePreview(item)}
                              >
                                {viewMode === 'grid' ? (
                                  /* Grid view */
                                  <>
                                    {/* Media thumbnail */}
                                    <div className="aspect-square relative">
                                      {getFileType(item.mimeType, item.name) === 'image' ? (
                                        <img
                                          src={filesAPI.getViewUrl(item.name, 'photos')}
                                          alt={item.name}
                                          className="w-full h-full object-cover"
                                          loading="lazy"
                                        />
                                      ) : (
                                        <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                          <FileVideo className="h-8 w-8 text-gray-400" />
                                        </div>
                                      )}
                                      
                                      {/* Overlay on hover */}
                                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handlePreview(item);
                                            }}
                                            className="p-2 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all"
                                          >
                                            <Eye className="h-4 w-4 text-gray-700" />
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDownload(item);
                                            }}
                                            className="p-2 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all"
                                          >
                                            <Download className="h-4 w-4 text-gray-700" />
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteFile(item);
                                            }}
                                            className="p-2 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all"
                                          >
                                            <Trash2 className="h-4 w-4 text-red-600" />
                                          </button>
                                        </div>
                                      </div>
                                      
                                      {/* Date taken indicator */}
                                      {item.date_taken && item.date_taken !== item.modified && (
                                        <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                                          📷
                                        </div>
                                      )}
                                    </div>

                                    {/* File info */}
                                    <div className="p-3">
                                      <h3 className={`text-sm font-medium truncate ${
                                        isDark ? 'text-gray-200' : 'text-gray-800'
                                      }`} title={item.name}>
                                        {item.name}
                                      </h3>
                                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {formatFileSize(item.size)}
                                        {item.camera_make && item.camera_model && (
                                          <span className="block">
                                            {item.camera_make} {item.camera_model}
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                  </>
                                ) : (
                                  /* List view */
                                  <>
                                    <div className="flex items-center flex-1 min-w-0">
                                      <div className="flex-shrink-0 mr-3">
                                        {getFileType(item.mimeType, item.name) === 'image' ? (
                                          <div className="w-12 h-12 rounded overflow-hidden">
                                            <img
                                              src={filesAPI.getViewUrl(item.name, 'photos')}
                                              alt={item.name}
                                              className="w-full h-full object-cover"
                                              loading="lazy"
                                            />
                                          </div>
                                        ) : (
                                          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                                            <FileVideo className="h-6 w-6 text-gray-400" />
                                          </div>
                                        )}
                                      </div>
                                      
                                      <div className="flex-1 min-w-0">
                                        <h3 className={`text-sm font-medium truncate ${
                                          isDark ? 'text-gray-200' : 'text-gray-800'
                                        }`}>
                                          {item.name}
                                        </h3>
                                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                          {formatFileSize(item.size)} • {formatDate(item.date_taken || item.modified)}
                                          {item.camera_make && item.camera_model && (
                                            <span className="block">
                                              📷 {item.camera_make} {item.camera_model}
                                            </span>
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                    
                                    {/* Action buttons */}
                                    <div className="flex items-center space-x-1 ml-2">
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
                Delete Photo
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
            
            {getFileType(previewFile.mimeType, previewFile.name) === 'image' ? (
              <img
                src={filesAPI.getViewUrl(previewFile.name, 'photos')}
                alt={previewFile.name}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <video
                src={filesAPI.getViewUrl(previewFile.name, 'photos')}
                controls
                className="max-w-full max-h-full"
              />
            )}
            
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
                Uploading photos...
              </span>
              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                {uploadProgress}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Photos;
