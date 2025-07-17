import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { filesAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { LogOut, FolderOpen, Upload, Plus, FolderPlus, File, Clock, MoreVertical, X, Folder, ArrowLeft, Home, ChevronRight, Eye, Download, FileText, FileImage, FileVideo, Music, Archive, FileSpreadsheet } from 'lucide-react';

const Drive = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  // File and folder state
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState('');

  // Modal states
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [creatingFolder, setCreatingFolder] = useState(false);
  
  // Preview modal state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);

  // Fetch files when component mounts or path changes
  useEffect(() => {
    fetchFiles();
  }, [currentPath]);

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

  const getPathBreadcrumbs = () => {
    if (!currentPath) return [];
    return currentPath.split('/');
  };

  const handleUploadFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const response = await filesAPI.uploadFile(file, currentPath);
      
      console.log('File uploaded successfully:', response.data);
      alert(`File "${file.name}" uploaded successfully!`);
      
      // Reset file input and refresh files list
      event.target.value = '';
      await fetchFiles();
      
    } catch (error) {
      console.error('Upload error:', error);
      if (error.response?.status === 401) {
        logout();
        navigate('/drive/login');
      } else {
        alert('Failed to upload file. Please try again.');
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
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

  const handleLogout = () => {
    logout();
    navigate('/drive/login');
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        multiple={false}
      />

      {/* Sidebar */}
      <div className="w-80 bg-white shadow-lg border-r border-gray-200 flex flex-col">
        {/* Sidebar Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <FolderOpen className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-xl font-semibold text-gray-900">My Drive</h1>
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
            {uploading ? `Uploading... ${uploadProgress}%` : 'Upload File'}
          </button>
          
          <button
            onClick={handleCreateFolder}
            disabled={uploading || creatingFolder}
            className="w-full flex items-center justify-center px-4 py-3 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 rounded-lg font-medium transition-colors"
          >
            <FolderPlus className="h-5 w-5 mr-2" />
            {creatingFolder ? 'Creating...' : 'New Folder'}
          </button>
        </div>

        {/* Recent Files Section */}
        <div className="flex-1 px-6 pb-6">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Recent Files
            </h3>
          </div>
          
          <div className="space-y-2">
            {files.filter(file => !file.is_directory).slice(0, 5).map((file, index) => (
              <div
                key={index}
                className="flex items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer group transition-colors"
              >
                <File className="h-5 w-5 mr-3 text-gray-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)} • {formatDate(file.modified_at)}
                  </p>
                </div>
                <button className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 transition-opacity">
                  <MoreVertical className="h-4 w-4 text-gray-400" />
                </button>
              </div>
            ))}
            {files.filter(file => !file.is_directory).length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                No files yet
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                {/* Breadcrumb Navigation */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleHomeClick}
                    className="flex items-center px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                  >
                    <Home className="h-4 w-4 mr-1" />
                    <span className="text-sm font-medium">Home</span>
                  </button>
                  
                  {getPathBreadcrumbs().map((folder, index) => (
                    <div key={index} className="flex items-center">
                      <ChevronRight className="h-4 w-4 text-gray-400 mx-1" />
                      <button
                        onClick={() => {
                          const pathParts = getPathBreadcrumbs().slice(0, index + 1);
                          setCurrentPath(pathParts.join('/'));
                        }}
                        className="px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                      >
                        <span className="text-sm font-medium text-gray-700">{folder}</span>
                      </button>
                    </div>
                  ))}
                  
                  {currentPath && (
                    <button
                      onClick={handleBackClick}
                      className="flex items-center px-3 py-1 ml-4 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      <span className="text-sm">Back</span>
                    </button>
                  )}
                </div>
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
        <div className="flex-1 p-6">
          {loading ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-4">📁</div>
              <p className="text-gray-600">Loading your files...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📁</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Your Drive</h2>
              <p className="text-gray-600 mb-8">
                Your personal file storage and management system
              </p>
              
              <div className="bg-white rounded-lg shadow p-8 max-w-md mx-auto">
                <Upload className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Get Started
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Upload your first file or create a folder to organize your files.
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
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Files</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {files.map((item, index) => (
                    <div 
                      key={index} 
                      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer group relative"
                      onClick={() => item.is_directory ? handleFolderClick(item.name) : handleFilePreview(item)}
                    >
                      <div className="text-center">
                        <div className="text-3xl mb-2">
                          {item.is_directory ? 
                            <Folder className="h-8 w-8 text-blue-500 mx-auto" /> : 
                            getFileIcon(getFileTypeCategory(item.type, item.name))
                          }
                        </div>
                        <div className="text-sm font-medium text-gray-900 truncate" title={item.name}>
                          {item.name}
                        </div>
                        {!item.is_directory && (
                          <div className="text-xs text-gray-500 mt-1">
                            {formatFileSize(item.size)}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          {formatDate(item.modified_at)}
                        </div>
                        
                        {/* Action buttons on hover */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {item.is_directory ? (
                            <div className="bg-white rounded p-1 shadow">
                              <FolderOpen className="h-4 w-4 text-blue-600" />
                            </div>
                          ) : (
                            <div className="bg-white rounded p-1 shadow">
                              <Eye className="h-4 w-4 text-gray-600" />
                            </div>
                          )}
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

      {/* File Preview Modal */}
      {showPreviewModal && previewFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{previewFile.name}</h3>
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setPreviewFile(null);
                }}
                className="text-gray-400 hover:text-gray-600"
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
