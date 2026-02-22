import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HardDrive, Images } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const AppSwitcher = ({ currentApp }) => {
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const apps = [
    { id: 'drive', name: 'Drive', icon: HardDrive, path: '/drive' },
    { id: 'photos', name: 'Photos', icon: Images, path: '/photos' },
  ];

  return (
    <div className={`flex gap-2 mb-4 sm:hidden`}>
      {apps.map((app) => {
        const Icon = app.icon;
        const isActive = currentApp === app.id;
        
        return (
          <button
            key={app.id}
            onClick={() => navigate(app.path)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all font-medium ${
              isActive
                ? isDark
                  ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg'
                  : 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg'
                : isDark
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Icon className="h-5 w-5" />
            <span>{app.name}</span>
          </button>
        );
      })}
    </div>
  );
};

export default AppSwitcher;
