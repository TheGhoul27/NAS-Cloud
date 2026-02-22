import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { filesAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, RotateCcw, AlertTriangle, File, Folder, Clock, Calendar, X, CheckCircle } from 'lucide-react';

const DriveTrash = () => {
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
      const response = await filesAPI.listTrash('drive');
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
      const response = await filesAPI.emptyTrash('drive');
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      isDark ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/')}
                className={`mr-4 p-2 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                }`}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <Trash2 className="h-8 w-8 text-red-600 mr-3" />
              <div>
                <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Drive Trash
                </h1>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Items deleted from Drive • Auto-deleted after 30 days
                </p>
              </div>
            </div>
            
            {trashItems.length > 0 && (
              <button
                onClick={() => setShowEmptyTrashModal(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Empty Drive Trash
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className={`rounded-lg shadow-lg border ${
          isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
              <span className={`ml-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Loading trash...
              </span>
            </div>
          ) : trashItems.length === 0 ? (
            <div className="text-center py-12">
              <Trash2 className={`h-12 w-12 ${isDark ? 'text-gray-600' : 'text-gray-400'} mx-auto mb-3`} />
              <p className={`text-lg font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Drive trash is empty
              </p>
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                Items you delete from Drive will appear here
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                    <th className={`text-left p-4 font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Name
                    </th>
                    <th className={`text-left p-4 font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Original Location
                    </th>
                    <th className={`text-left p-4 font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Deleted
                    </th>
                    <th className={`text-left p-4 font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Size
                    </th>
                    <th className={`text-left p-4 font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {trashItems.map((item, index) => (
                    <tr 
                      key={index}
                      className={`border-b transition-colors ${
                        isDark 
                          ? 'border-gray-700 hover:bg-gray-750' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <td className="p-4">
                        <div className="flex items-center">
                          {item.is_directory ? (
                            <Folder className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0" />
                          ) : (
                            <File className="h-5 w-5 text-gray-500 mr-3 flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {item.original_name}
                            </p>
                            {item.expires_in_days <= 7 && (
                              <p className="text-xs text-red-500 flex items-center mt-1">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Expires in {item.expires_in_days} days
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className={`p-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        <span className="text-sm">
                          /drive/{item.original_path}
                        </span>
                      </td>
                      <td className={`p-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        <div className="flex items-center text-sm">
                          <Clock className="h-4 w-4 mr-2" />
                          {formatDate(item.deleted_at)}
                        </div>
                      </td>
                      <td className={`p-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        <span className="text-sm">
                          {formatFileSize(item.size)}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setItemToRestore(item);
                              setShowRestoreModal(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg transition-colors"
                            title="Restore"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setItemToDelete(item);
                              setShowDeleteModal(true);
                            }}
                            className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-colors"
                            title="Delete Permanently"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Restore Confirmation Modal */}
      {showRestoreModal && itemToRestore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-lg shadow-xl ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="p-6">
              <h3 className={`text-lg font-semibold mb-4 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Restore Item
              </h3>
              
              <p className={`mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Are you sure you want to restore "{itemToRestore.original_name}" to its original location?
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => handleRestore(itemToRestore)}
                  disabled={processing}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  {processing ? 'Restoring...' : 'Restore'}
                </button>
                <button
                  onClick={() => {
                    setShowRestoreModal(false);
                    setItemToRestore(null);
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
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
      {showDeleteModal && itemToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-lg shadow-xl ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="p-6">
              <h3 className={`text-lg font-semibold mb-4 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Permanently Delete Item
              </h3>
              
              <p className={`mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Are you sure you want to permanently delete "{itemToDelete.original_name}"? This action cannot be undone.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => handlePermanentDelete(itemToDelete)}
                  disabled={processing}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  {processing ? 'Deleting...' : 'Delete Permanently'}
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setItemToDelete(null);
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
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

      {/* Empty Trash Confirmation Modal */}
      {showEmptyTrashModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-lg shadow-xl ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="p-6">
              <h3 className={`text-lg font-semibold mb-4 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Empty Drive Trash
              </h3>
              
              <p className={`mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Are you sure you want to permanently delete all {trashItems.length} items in the Drive trash? This action cannot be undone.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={handleEmptyTrash}
                  disabled={processing}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  {processing ? 'Emptying...' : 'Empty Trash'}
                </button>
                <button
                  onClick={() => setShowEmptyTrashModal(false)}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
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
    </div>
  );
};

export default DriveTrash;
