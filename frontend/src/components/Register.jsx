import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Eye, EyeOff, UserPlus, Cloud, Mail, Lock, Shield, ArrowRight, Sun, Moon, User, Phone } from 'lucide-react';

const Register = () => {
  const { register: registerUser } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors }, watch } = useForm();
  const password = watch('password');

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError('');

    const result = await registerUser(data);

    if (result.success) {
      // Redirect to login page after successful registration
      const isPhotosApp = location.pathname.includes('/photos');
      const loginPath = isPhotosApp ? '/photos/login' : '/drive/login';
      navigate(loginPath, {
        replace: true,
        state: { 
          message: 'Registration successful! Your account is pending admin approval. You will be able to sign in once an administrator approves your registration.',
          type: 'info'
        }
      });
    } else {
      setError(result.error);
    }

    setIsLoading(false);
  };

  // Determine which app we're registering for based on the URL
  const isPhotosApp = location.pathname.includes('/photos');
  const appName = isPhotosApp ? 'Photos' : 'Drive';

  return (
    <div className={`min-h-screen ${isDark
      ? 'bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900'
      : 'bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100'
      } flex items-center justify-center p-4 sm:p-6 md:p-8 relative overflow-hidden`}>

      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className={`absolute top-4 right-4 sm:top-6 sm:right-6 p-3 rounded-full transition-all duration-300 z-50 cursor-pointer border-2 touch-target ${isDark
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

      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className={`absolute top-20 left-20 w-32 h-32 ${isDark ? 'bg-blue-500/10' : 'bg-white/20'
          } rounded-full blur-xl`}></div>
        <div className={`absolute bottom-20 right-20 w-48 h-48 ${isDark ? 'bg-indigo-500/10' : 'bg-blue-200/20'
          } rounded-full blur-xl`}></div>
        <div className={`absolute top-1/2 left-1/3 w-24 h-24 ${isDark ? 'bg-purple-500/10' : 'bg-indigo-200/20'
          } rounded-full blur-xl`}></div>
      </div>

      {/* Main card */}
      <div className={`relative ${isDark
          ? 'bg-gray-800/90 border-gray-700/50'
          : 'bg-white/90 border-white/20'
        } backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl border p-6 sm:p-8 w-full max-w-lg mx-4 sm:mx-0`}>
        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="relative inline-block mb-4 sm:mb-6">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-lg">
                <UserPlus className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
            </div>
            <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-800'
              } mb-2`}>
              Create your account
            </h1>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'
              } text-sm leading-relaxed px-2 sm:px-0`}>
              Join us today and get secure cloud storage<br className="hidden sm:block" />
              <span className="sm:hidden"> </span>for all your files and memories
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="relative">
                  <User className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 ${isDark ? 'text-gray-400' : 'text-gray-400'
                    }`} />
                  <input
                    id="firstname"
                    type="text"
                    {...register('firstname', {
                      required: 'First name is required',
                      minLength: {
                        value: 2,
                        message: 'First name must be at least 2 characters'
                      }
                    })}
                    className={`w-full pl-12 pr-4 py-4 ${isDark
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 hover:bg-gray-600/50'
                        : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400 hover:bg-gray-100'
                      } border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300`}
                    placeholder="First Name"
                  />
                </div>
                {errors.firstname && (
                  <p className={`mt-2 text-sm ${isDark ? 'text-red-400' : 'text-red-600'
                    }`}>{errors.firstname.message}</p>
                )}
              </div>

              <div>
                <div className="relative">
                  <User className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 ${isDark ? 'text-gray-400' : 'text-gray-400'
                    }`} />
                  <input
                    id="lastname"
                    type="text"
                    {...register('lastname', {
                      required: 'Last name is required',
                      minLength: {
                        value: 2,
                        message: 'Last name must be at least 2 characters'
                      }
                    })}
                    className={`w-full pl-12 pr-4 py-3 sm:py-4 ${isDark
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 hover:bg-gray-600/50'
                        : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400 hover:bg-gray-100'
                      } border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-base`}
                    placeholder="Last Name"
                  />
                </div>
                {errors.lastname && (
                  <p className={`mt-2 text-sm ${isDark ? 'text-red-400' : 'text-red-600'
                    }`}>{errors.lastname.message}</p>
                )}
              </div>
            </div>

            <div>
              <div className="relative">
                <Phone className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 ${isDark ? 'text-gray-400' : 'text-gray-400'
                  }`} />
                <input
                  id="phone"
                  type="tel"
                  {...register('phone', {
                    pattern: {
                      value: /^[\+]?[1-9][\d]{0,15}$/,
                      message: 'Please enter a valid phone number'
                    }
                  })}
                  className={`w-full pl-12 pr-4 py-4 ${isDark
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 hover:bg-gray-600/50'
                      : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400 hover:bg-gray-100'
                    } border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300`}
                  placeholder="Phone Number (optional)"
                />
              </div>
              {errors.phone && (
                <p className={`mt-2 text-sm ${isDark ? 'text-red-400' : 'text-red-600'
                  }`}>{errors.phone.message}</p>
              )}
            </div>

            <div>
              <div className="relative">
                <Mail className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 ${isDark ? 'text-gray-400' : 'text-gray-400'
                  }`} />
                <input
                  id="email"
                  type="email"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  className={`w-full pl-12 pr-4 py-4 ${isDark
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 hover:bg-gray-600/50'
                      : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400 hover:bg-gray-100'
                    } border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300`}
                  placeholder="Email"
                />
              </div>
              {errors.email && (
                <p className={`mt-2 text-sm ${isDark ? 'text-red-400' : 'text-red-600'
                  }`}>{errors.email.message}</p>
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
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters'
                    }
                  })}
                  className={`w-full pl-12 pr-14 py-4 ${isDark
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 hover:bg-gray-600/50'
                      : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400 hover:bg-gray-100'
                    } border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300`}
                  placeholder="Password"
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

            <div>
              <div className="relative">
                <Shield className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 ${isDark ? 'text-gray-400' : 'text-gray-400'
                  }`} />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: value => value === password || 'Passwords do not match'
                  })}
                  className={`w-full pl-12 pr-14 py-4 ${isDark
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 hover:bg-gray-600/50'
                      : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400 hover:bg-gray-100'
                    } border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300`}
                  placeholder="Confirm Password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className={`absolute inset-y-0 right-0 pr-4 flex items-center ${isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-100'
                    } rounded-r-xl transition-all duration-300`}
                >
                  {showConfirmPassword ? (
                    <EyeOff className={`h-5 w-5 ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'
                      }`} />
                  ) : (
                    <Eye className={`h-5 w-5 ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'
                      }`} />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className={`mt-2 text-sm ${isDark ? 'text-red-400' : 'text-red-600'
                  }`}>{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full ${isDark
                  ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                  : 'bg-gray-900 hover:bg-gray-800 focus:ring-gray-500'
                } text-white py-4 px-6 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-300 font-medium mt-6`}
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              ) : (
                "Get Started"
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'
              } text-sm`}>
              Already have an account?{' '}
              <Link
                to={isPhotosApp ? "/photos/login" : "/drive/login"}
                className={`font-medium ${isDark
                    ? 'text-blue-400 hover:text-blue-300'
                    : 'text-blue-600 hover:text-blue-700'
                  } transition-colors duration-300`}
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
