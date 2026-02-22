import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { filesAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, RotateCcw, AlertTriangle, File, Folder, Clock, Calendar, X, CheckCircle } from 'lucide-react';

const Trash = () => {
  const { user, logout } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  
  // State
  const [trashItems, setTrashItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEmptyTrashModal, setShowEmptyTrashModal] = useState(false);
  const [itemToRestore, setItemToRestore] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchTrashItems();
  }, []);

  const fetchTrashItems = async () => {
    try {
      setLoading(true);
      const response = await filesAPI.listTrash();
      setTrashItems(response.data.items);
    } catch (error) {
      console.error('Error fetching trash items:', error);
      if (error.response?.status === 401) {
        logout();
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (item) => {
    setProcessing(true);
    try {
      const response = await filesAPI.restoreFromTrash(item.trash_id);
      alert(`${item.original_name} has been restored successfully!`);
      await fetchTrashItems();
      setShowRestoreModal(false);
      setItemToRestore(null);
    } catch (error) {
      console.error('Error restoring item:', error);
      alert('Failed to restore item. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handlePermanentDelete = async (item) => {
    setProcessing(true);
    try {
      await filesAPI.permanentlyDelete(item.trash_id);
      alert(`${item.original_name} has been permanently deleted.`);
      await fetchTrashItems();
      setShowDeleteModal(false);
      setItemToDelete(null);
    } catch (error) {
      console.error('Error permanently deleting item:', error);
      alert('Failed to permanently delete item. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleEmptyTrash = async () => {
    setProcessing(true);
    try {
      const response = await filesAPI.emptyTrash();
      alert(response.data.message);
      await fetchTrashItems();
      setShowEmptyTrashModal(false);
    } catch (error) {
      console.error('Error emptying trash:', error);
      alert('Failed to empty trash. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCleanupOld = async () => {
    setProcessing(true);
    try {
      const response = await filesAPI.cleanupTrash();
      alert(response.data.message);
      await fetchTrashItems();
    } catch (error) {
      console.error('Error cleaning up old items:', error);
      alert('Failed to cleanup old items. Please try again.');
    } finally {
      setProcessing(false);
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
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getExpiryColor = (daysRemaining) => {
    if (daysRemaining <= 3) return 'text-red-500';
    if (daysRemaining <= 7) return 'text-yellow-500';
    return isDark ? 'text-gray-400' : 'text-gray-600';
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      isDark ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className={`rounded-lg shadow-lg border mb-6 transition-colors duration-200 ${
          isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => navigate(-1)}
                  className={`mr-4 p-2 rounded-lg transition-colors ${
                    isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <Trash2 className="h-8 w-8 text-red-600 mr-3" />
                <div>
                  <h1 className={`text-2xl font-bold transition-colors duration-200 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>Trash</h1>
                  <p className={`text-sm transition-colors duration-200 ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>Items are automatically deleted after 30 days</p>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleCleanupOld}
                  disabled={processing}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    isDark 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  } disabled:opacity-50`}
                >
                  <Clock className="h-4 w-4 mr-2 inline" />
                  Cleanup Old Items
                </button>
                {trashItems.length > 0 && (
                  <button
                    onClick={() => setShowEmptyTrashModal(true)}
                    disabled={processing}
                    className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2 inline" />
                    Empty Trash
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className={`rounded-lg shadow-lg border transition-colors duration-200 ${
          isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="p-6">
            {loading ? (
              <div className="text-center py-16">
                <Trash2 className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <p className={`transition-colors duration-200 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>Loading trash items...</p>
              </div>
            ) : trashItems.length === 0 ? (
              <div className="text-center py-16">
                <Trash2 className="h-24 w-24 mx-auto mb-4 text-gray-400" />
                <h3 className={`text-xl font-semibold mb-2 transition-colors duration-200 ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>Trash is empty</h3>
                <p className={`transition-colors duration-200 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>Deleted files and folders will appear here</p>
              </div>
            ) : (
              <div>
                <div className={`text-sm mb-4 transition-colors duration-200 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {trashItems.length} item{trashItems.length !== 1 ? 's' : ''} in trash
                </div>
                
                <div className="space-y-2">
                  {trashItems.map((item, index) => (
                    <div 
                      key={index} 
                      className={`flex items-center p-4 rounded-lg border transition-colors duration-200 ${
                        isDark 
                          ? 'bg-gray-700 border-gray-600 hover:bg-gray-650' 
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <div className="mr-4">
                        {item.is_directory ? (
                          <Folder className="h-8 w-8 text-blue-500" />
                        ) : (
                          <File className="h-8 w-8 text-gray-500" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium truncate transition-colors duration-200 ${
                          isDark ? 'text-white' : 'text-gray-900'
                        }`}>
                          {item.original_name}
                        </div>
                        <div className={`text-sm transition-colors duration-200 ${
                          isDark ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          Original location: {item.original_path} ({item.context})
                        </div>
                        <div className="flex items-center space-x-4 text-sm mt-1">
                          <span className={`transition-colors duration-200 ${
                            isDark ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            Deleted: {formatDate(item.deleted_at)}
                          </span>
                          {!item.is_directory && (
                            <span className={`transition-colors duration-200 ${
                              isDark ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              Size: {formatFileSize(item.size)}
                            </span>
                          )}
                          <span className={`font-medium ${getExpiryColor(item.expires_in_days)}`}>
                            {item.expires_in_days > 0 
                              ? `Expires in ${item.expires_in_days} days`
                              : 'Expired - will be deleted automatically'
                            }
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setItemToRestore(item);
                            setShowRestoreModal(true);
                          }}
                          disabled={processing}
                          className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                            isDark 
                              ? 'bg-green-600 hover:bg-green-700 text-white' 
                              : 'bg-green-100 hover:bg-green-200 text-green-700'
                          }`}
                          title="Restore"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setItemToDelete(item);
                            setShowDeleteModal(true);
                          }}
                          disabled={processing}
                          className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                            isDark 
                              ? 'bg-red-600 hover:bg-red-700 text-white' 
                              : 'bg-red-100 hover:bg-red-200 text-red-700'
                          }`}
                          title="Delete permanently"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Restore Confirmation Modal */}
      {showRestoreModal && itemToRestore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 w-full max-w-md mx-4 transition-colors duration-200 ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="text-center">
              <RotateCcw className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className={`text-lg font-semibold mb-2 transition-colors duration-200 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Restore Item
              </h3>
              <p className={`mb-6 transition-colors duration-200 ${
                isDark ? 'text-gray-300' : 'text-gray-600'
              }`}>
                Are you sure you want to restore "{itemToRestore.original_name}"?
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowRestoreModal(false);
                    setItemToRestore(null);
                  }}
                  disabled={processing}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                    isDark 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                      : 'bg-gray-300 hover:bg-gray-400 text-gray-800'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRestore(itemToRestore)}
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {processing ? 'Restoring...' : 'Restore'}
                </button>
              </div>
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
              <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h3 className={`text-lg font-semibold mb-2 transition-colors duration-200 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Permanently Delete
              </h3>
              <p className={`mb-6 transition-colors duration-200 ${
                isDark ? 'text-gray-300' : 'text-gray-600'
              }`}>
                Are you sure you want to permanently delete "{itemToDelete.original_name}"? This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setItemToDelete(null);
                  }}
                  disabled={processing}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                    isDark 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                      : 'bg-gray-300 hover:bg-gray-400 text-gray-800'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handlePermanentDelete(itemToDelete)}
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {processing ? 'Deleting...' : 'Delete Forever'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty Trash Confirmation Modal */}
      {showEmptyTrashModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 w-full max-w-md mx-4 transition-colors duration-200 ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h3 className={`text-lg font-semibold mb-2 transition-colors duration-200 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Empty Trash
              </h3>
              <p className={`mb-6 transition-colors duration-200 ${
                isDark ? 'text-gray-300' : 'text-gray-600'
              }`}>
                Are you sure you want to permanently delete all {trashItems.length} items in trash? This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowEmptyTrashModal(false)}
                  disabled={processing}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                    isDark 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                      : 'bg-gray-300 hover:bg-gray-400 text-gray-800'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleEmptyTrash}
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {processing ? 'Emptying...' : 'Empty Trash'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Trash;
