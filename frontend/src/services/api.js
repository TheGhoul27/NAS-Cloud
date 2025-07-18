import axios from 'axios';

// Use proxy for API calls - Vite will forward /api requests to the backend
const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          // Implement token refresh logic here when needed
          // For now, just redirect to login
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        } catch (refreshError) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
};

export const filesAPI = {
  listFiles: (path = '', context = 'drive') => api.get('/files/list', { params: { path, context } }),
  uploadFile: (file, path = '', context = 'drive') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);
    formData.append('context', context);
    return api.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  createFolder: (name, path = '', context = 'drive') => api.post('/files/create-folder', { name, path, context }),
  getStorageInfo: () => api.get('/files/storage-info'),
  viewFile: (filePath, context = 'drive') => api.get(`/files/view/${filePath}`, { 
    params: { context },
    responseType: 'blob' 
  }),
  downloadFile: (filePath, context = 'drive') => api.get(`/files/download/${filePath}`, { 
    params: { context },
    responseType: 'blob' 
  }),
  deleteFile: (filePath, context = 'drive') => api.delete(`/files/delete/${filePath}`, { 
    params: { context } 
  }),
  getRecentFiles: (limit = 10, context = 'drive') => api.get('/files/recent', { params: { limit, context } }),
  searchFiles: (query, context = 'drive', fileType = null) => api.get('/files/search', { 
    params: { query, context, file_type: fileType } 
  }),
  
  // Create authenticated URLs for direct use in src attributes
  getViewUrl: (filePath, context = 'drive') => {
    const token = localStorage.getItem('access_token');
    return `/api/files/view/${filePath}?context=${context}&token=${encodeURIComponent(token)}`;
  },
  
  getDownloadUrl: (filePath, context = 'drive') => {
    const token = localStorage.getItem('access_token');
    return `/api/files/download/${filePath}?context=${context}&token=${encodeURIComponent(token)}`;
  },
};

export default api;
