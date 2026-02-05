import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  LayoutDashboard,
  Upload,
  History,
  Camera,
  FileText,
  Settings,
  Users,
  Shield,
} from 'lucide-react';

const menuItems = {
  user: [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/dashboard/upload', label: 'Upload Media', icon: Upload },
    { path: '/dashboard/history', label: 'History', icon: History },
  ],
  investigator: [
    { path: '/investigator', label: 'Cases', icon: FileText },
    { path: '/investigator/new', label: 'New Case', icon: FileText },
    { path: '/investigator/evidence', label: 'Evidence', icon: Shield },
  ],
  admin: [
    { path: '/admin', label: 'Overview', icon: LayoutDashboard },
    { path: '/admin/users', label: 'Users', icon: Users },
    { path: '/admin/monitoring', label: 'Monitoring', icon: Shield },
    { path: '/admin/settings', label: 'Settings', icon: Settings },
  ],
};

export default function Sidebar() {
  const { user } = useAuthStore();
  const location = useLocation();
  const role = user?.role || 'user';
  const items = menuItems[role] || menuItems.user;

  return (
    <aside className="w-64 glass border-r border-dark-700 min-h-screen fixed left-0 top-16">
      <nav className="p-4 space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary-600/20 text-primary-400 border border-primary-600/30'
                  : 'text-gray-300 hover:bg-dark-700/50 hover:text-primary-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        
        {role === 'user' && (
          <Link
            to="/camera"
            className="flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-gray-300 hover:bg-dark-700/50 hover:text-primary-400"
          >
            <Camera className="w-5 h-5" />
            <span>Live Camera</span>
          </Link>
        )}
      </nav>
    </aside>
  );
}

