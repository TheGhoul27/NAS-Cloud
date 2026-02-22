import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Shield, Lock, User, Sun, Moon, ArrowRight } from 'lucide-react';
import axios from 'axios';

const AdminLogin = ({ appType = 'drive' }) => {
  const { theme, toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const adminApiBase = import.meta.env.VITE_API_URL || '/api';
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError('');

    try {
      // Use basic auth for admin login
      const credentials = btoa(`${data.username}:${data.password}`);
      
      const response = await axios.get(`${adminApiBase}/admin/dashboard`, {
        headers: {
          'Authorization': `Basic ${credentials}`
        }
      });

      if (response.status === 200) {
        // Store admin credentials for the session
        localStorage.setItem('admin_credentials', credentials);
        navigate('/admin/dashboard');
      }
    } catch (error) {
      console.error('Admin login error:', error);
      if (error.response?.status === 401) {
        setError('Invalid admin credentials');
      } else if (!error.response) {
        setError('Backend is unreachable. Make sure the API server is running on port 8000.');
      } else {
        setError('Admin login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDark
      ? 'bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900'
      : 'bg-gradient-to-br from-red-100 via-orange-50 to-yellow-100'
      } flex items-center justify-center p-4 relative overflow-hidden`}>

      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className={`absolute top-6 right-6 p-3 rounded-full transition-all duration-300 z-50 cursor-pointer border-2 ${isDark
            ? 'bg-gray-800 hover:bg-gray-700 text-yellow-400 border-gray-600 hover:border-yellow-400'
            : 'bg-white hover:bg-gray-100 text-gray-600 border-gray-200 hover:border-gray-400'
          } shadow-lg hover:shadow-xl hover:scale-105 active:scale-95`}
        aria-label="Toggle theme"
        type="button"
      >
        {isDark ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )}
      </button>

      {/* Background pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className={`absolute top-20 left-20 w-32 h-32 ${isDark ? 'bg-red-500/10' : 'bg-white/20'
          } rounded-full blur-xl`}></div>
        <div className={`absolute bottom-20 right-20 w-48 h-48 ${isDark ? 'bg-orange-500/10' : 'bg-orange-200/20'
          } rounded-full blur-xl`}></div>
        <div className={`absolute top-1/2 left-1/3 w-24 h-24 ${isDark ? 'bg-yellow-500/10' : 'bg-yellow-200/20'
          } rounded-full blur-xl`}></div>
      </div>

      {/* Main card */}
      <div className={`relative ${isDark
          ? 'bg-gray-800/90 border-gray-700/50'
          : 'bg-white/90 border-white/20'
        } backdrop-blur-xl rounded-3xl shadow-2xl border p-8 w-full max-w-md`}>
        
        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="relative inline-block mb-6">
              <div className="bg-gradient-to-r from-red-500 to-orange-600 rounded-2xl p-4 shadow-lg">
                <Shield className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-800'
              } mb-2`}>
              Admin Portal
            </h1>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'
              } text-sm leading-relaxed`}>
              Access the administrative dashboard<br />
              to manage users and approvals
            </p>
          </div>

          {error && (
            <div className={`${isDark
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'bg-red-50 border-red-200 text-red-800'
              } border px-4 py-3 rounded-xl mb-6`}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <div className="relative">
                <User className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 ${isDark ? 'text-gray-400' : 'text-gray-400'
                  }`} />
                <input
                  id="username"
                  type="text"
                  {...register('username', {
                    required: 'Username is required'
                  })}
                  className={`w-full pl-12 pr-4 py-4 ${isDark
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 hover:bg-gray-600/50'
                      : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400 hover:bg-gray-100'
                    } border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300`}
                  placeholder="Admin Username"
                />
              </div>
              {errors.username && (
                <p className={`mt-2 text-sm ${isDark ? 'text-red-400' : 'text-red-600'
                  }`}>{errors.username.message}</p>
              )}
            </div>

            <div>
              <div className="relative">
                <Lock className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 ${isDark ? 'text-gray-400' : 'text-gray-400'
                  }`} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', {
                    required: 'Password is required'
                  })}
                  className={`w-full pl-12 pr-14 py-4 ${isDark
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 hover:bg-gray-600/50'
                      : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400 hover:bg-gray-100'
                    } border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300`}
                  placeholder="Admin Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute inset-y-0 right-0 pr-4 flex items-center ${isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-100'
                    } rounded-r-xl transition-all duration-300`}
                >
                  {showPassword ? (
                    <EyeOff className={`h-5 w-5 ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'
                      }`} />
                  ) : (
                    <Eye className={`h-5 w-5 ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'
                      }`} />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className={`mt-2 text-sm ${isDark ? 'text-red-400' : 'text-red-600'
                  }`}>{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full ${isDark
                  ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                  : 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 focus:ring-red-500'
                } text-white py-4 px-6 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-300 font-medium`}
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              ) : (
                <>
                  <span>Access Admin Panel</span>
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </button>

            {/* Navigation Links */}
            <div className={`mt-6 pt-6 border-t ${
              isDark ? 'border-gray-700/50' : 'border-gray-200'
            }`}>
              <p className={`text-xs ${
                isDark ? 'text-gray-500' : 'text-gray-500'
              } mb-3 text-center`}>
                Back to {appType === 'photos' ? 'Photos' : 'Drive'}:
              </p>
              <div className="flex gap-2 justify-center flex-wrap">
                <Link
                  to="/login"
                  className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
                    isDark
                      ? 'text-blue-400 hover:bg-gray-700'
                      : 'text-blue-600 hover:bg-gray-100'
                  }`}
                >
                  App Login
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
