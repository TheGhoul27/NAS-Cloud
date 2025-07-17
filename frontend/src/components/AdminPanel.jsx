import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  Shield, 
  ShieldCheck,
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  XCircle,
  Crown,
  LogOut,
  Settings,
  Key
} from 'lucide-react';
import axios from 'axios';

const AdminPanel = () => {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [actionLoading, setActionLoading] = useState(null);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });
  const [userPasswordModal, setUserPasswordModal] = useState({ show: false, user: null });
  const [userPasswordData, setUserPasswordData] = useState({ newPassword: '', confirmPassword: '' });
  const [userPasswordLoading, setUserPasswordLoading] = useState(false);

  // Check if admin is authenticated
  useEffect(() => {
    const adminCredentials = localStorage.getItem('admin_credentials');
    if (!adminCredentials) {
      navigate('/admin/login');
      return;
    }
    
    fetchUsers();
    fetchPendingUsers();
  }, [navigate]);

  const getAuthHeaders = () => {
    const adminCredentials = localStorage.getItem('admin_credentials');
    return {
      'Authorization': `Basic ${adminCredentials}`
    };
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/admin/users`, {
        headers: getAuthHeaders()
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('admin_credentials');
        navigate('/admin/login');
      }
    }
  };

  const fetchPendingUsers = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/admin/users/pending`, {
        headers: getAuthHeaders()
      });
      setPendingUsers(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching pending users:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('admin_credentials');
        navigate('/admin/login');
      }
      setLoading(false);
    }
  };

  const handleUserAction = async (userId, action) => {
    setActionLoading(`${userId}-${action}`);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/admin/users/approve`, {
        user_id: userId,
        action: action
      }, {
        headers: getAuthHeaders()
      });
      
      // Refresh both lists
      await fetchUsers();
      await fetchPendingUsers();
    } catch (error) {
      console.error(`Error ${action}ing user:`, error);
      if (error.response?.status === 401) {
        localStorage.removeItem('admin_credentials');
        navigate('/admin/login');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const toggleAdminRole = async (userId) => {
    setActionLoading(`${userId}-toggle`);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/admin/users/${userId}/toggle-admin`, {}, {
        headers: getAuthHeaders()
      });
      await fetchUsers();
    } catch (error) {
      console.error('Error toggling admin role:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('admin_credentials');
        navigate('/admin/login');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_credentials');
    navigate('/admin/login');
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (passwordData.newPassword.length < 3) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 3 characters long' });
      return;
    }

    setPasswordLoading(true);
    setPasswordMessage({ type: '', text: '' });

    try {
      await axios.post(
        'http://localhost:8000/api/admin/change-password',
        {
          current_password: passwordData.currentPassword,
          new_password: passwordData.newPassword
        },
        { headers: getAuthHeaders() }
      );
      
      setPasswordMessage({ type: 'success', text: 'Password changed successfully' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Error changing password:', error);
      if (error.response?.status === 400) {
        setPasswordMessage({ type: 'error', text: 'Current password is incorrect' });
      } else if (error.response?.status === 401) {
        localStorage.removeItem('admin_credentials');
        navigate('/admin/login');
      } else {
        setPasswordMessage({ type: 'error', text: 'Failed to change password' });
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleUserPasswordChange = async (e) => {
    e.preventDefault();
    
    if (userPasswordData.newPassword !== userPasswordData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    if (userPasswordData.newPassword.length < 3) {
      alert('Password must be at least 3 characters long');
      return;
    }

    setUserPasswordLoading(true);

    try {
      await axios.post(
        'http://localhost:8000/api/admin/users/change-password',
        {
          user_id: userPasswordModal.user.id,
          new_password: userPasswordData.newPassword
        },
        { headers: getAuthHeaders() }
      );
      
      alert(`Password changed successfully for ${userPasswordModal.user.email}`);
      setUserPasswordModal({ show: false, user: null });
      setUserPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Error changing user password:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('admin_credentials');
        navigate('/admin/login');
      } else {
        alert('Failed to change user password');
      }
    } finally {
      setUserPasswordLoading(false);
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

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'yellow', icon: Clock, text: 'Pending' },
      approved: { color: 'green', icon: CheckCircle, text: 'Approved' },
      rejected: { color: 'red', icon: XCircle, text: 'Rejected' }
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
        ${status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' : ''}
        ${status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : ''}
        ${status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : ''}
      `}>
        <Icon className="h-3 w-3" />
        {config.text}
      </span>
    );
  };

  const getRoleBadge = (role) => {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
        ${role === 'admin' 
          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' 
          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
        }
      `}>
        {role === 'admin' ? <Crown className="h-3 w-3" /> : <Users className="h-3 w-3" />}
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} p-6`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-200'} p-6 mb-6`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg p-2">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Admin Panel
                </h1>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Manage user registrations and permissions
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'pending'
                ? `${isDark ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'}`
                : `${isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-600 hover:bg-gray-50'}`
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending ({pendingUsers.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'all'
                ? `${isDark ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'}`
                : `${isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-600 hover:bg-gray-50'}`
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              All Users ({users.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'settings'
                ? `${isDark ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'}`
                : `${isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-600 hover:bg-gray-50'}`
            }`}
          >
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </div>
          </button>
        </div>

        {/* Content */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          {activeTab === 'pending' ? (
            <div className="p-6">
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                Pending Registrations
              </h2>
              
              {pendingUsers.length === 0 ? (
                <div className="text-center py-8">
                  <UserCheck className={`h-12 w-12 ${isDark ? 'text-gray-600' : 'text-gray-400'} mx-auto mb-3`} />
                  <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    No pending registrations
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingUsers.map((pendingUser) => (
                    <div
                      key={pendingUser.id}
                      className={`border ${isDark ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'} rounded-lg p-4`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {pendingUser.firstname} {pendingUser.lastname}
                            </h3>
                            {getStatusBadge(pendingUser.status)}
                          </div>
                          
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2">
                              <Mail className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                              <span className={`${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                {pendingUser.email}
                              </span>
                            </div>
                            {pendingUser.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                                <span className={`${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {pendingUser.phone}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Calendar className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                              <span className={`${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                Registered: {formatDate(pendingUser.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleUserAction(pendingUser.id, 'approve')}
                            disabled={actionLoading === `${pendingUser.id}-approve`}
                            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                          >
                            {actionLoading === `${pendingUser.id}-approve` ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                            Approve
                          </button>
                          <button
                            onClick={() => handleUserAction(pendingUser.id, 'reject')}
                            disabled={actionLoading === `${pendingUser.id}-reject`}
                            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                          >
                            {actionLoading === `${pendingUser.id}-reject` ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              <UserX className="h-4 w-4" />
                            )}
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === 'all' ? (
            <div className="p-6">
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                All Users
              </h2>
              
              <div className="space-y-4">
                {users.map((userData) => (
                  <div
                    key={userData.id}
                    className={`border ${isDark ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'} rounded-lg p-4`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {userData.firstname} {userData.lastname}
                          </h3>
                          {getStatusBadge(userData.status)}
                          {getRoleBadge(userData.role)}
                        </div>
                        
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <Mail className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                            <span className={`${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                              {userData.email}
                            </span>
                          </div>
                          {userData.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                              <span className={`${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                {userData.phone}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Calendar className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                            <span className={`${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                              Registered: {formatDate(userData.created_at)}
                            </span>
                          </div>
                          {userData.approved_at && (
                            <div className="flex items-center gap-2">
                              <CheckCircle className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                              <span className={`${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                Approved: {formatDate(userData.approved_at)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {userData.status === 'approved' && (
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => toggleAdminRole(userData.id)}
                            disabled={actionLoading === `${userData.id}-toggle`}
                            className={`${userData.role === 'admin' 
                              ? 'bg-gray-600 hover:bg-gray-700' 
                              : 'bg-purple-600 hover:bg-purple-700'
                            } disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1`}
                          >
                            {actionLoading === `${userData.id}-toggle` ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              <ShieldCheck className="h-4 w-4" />
                            )}
                            {userData.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                          </button>
                          <button
                            onClick={() => setUserPasswordModal({ show: true, user: userData })}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                          >
                            <Key className="h-4 w-4" />
                            Change Password
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6">
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
                <Settings className="h-5 w-5" />
                Admin Settings
              </h2>
              
              <div className="max-w-md">
                <div className={`${isDark ? 'bg-gray-750' : 'bg-gray-50'} rounded-lg p-6 border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                  <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
                    <Key className="h-4 w-4" />
                    Change Password
                  </h3>
                  
                  {passwordMessage.text && (
                    <div className={`mb-4 p-3 rounded-lg ${
                      passwordMessage.type === 'success' 
                        ? 'bg-green-100 text-green-700 border border-green-200' 
                        : 'bg-red-100 text-red-700 border border-red-200'
                    }`}>
                      {passwordMessage.text}
                    </div>
                  )}
                  
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          isDark 
                            ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' 
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        required
                      />
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                        New Password
                      </label>
                      <input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          isDark 
                            ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' 
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        required
                      />
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          isDark 
                            ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' 
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        required
                      />
                    </div>
                    
                    <button
                      type="submit"
                      disabled={passwordLoading}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      {passwordLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Key className="h-4 w-4" />
                      )}
                      Change Password
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Password Change Modal */}
      {userPasswordModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 w-full max-w-md mx-4`}>
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
              Change Password for {userPasswordModal.user?.email}
            </h3>
            
            <form onSubmit={handleUserPasswordChange} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                  New Password
                </label>
                <input
                  type="password"
                  value={userPasswordData.newPassword}
                  onChange={(e) => setUserPasswordData({ ...userPasswordData, newPassword: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    isDark 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  required
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={userPasswordData.confirmPassword}
                  onChange={(e) => setUserPasswordData({ ...userPasswordData, confirmPassword: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    isDark 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  required
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={userPasswordLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {userPasswordLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Key className="h-4 w-4" />
                  )}
                  Change Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserPasswordModal({ show: false, user: null });
                    setUserPasswordData({ newPassword: '', confirmPassword: '' });
                  }}
                  className={`flex-1 ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} px-4 py-2 rounded-lg font-medium transition-colors`}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
