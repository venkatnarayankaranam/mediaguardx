import { Link, useLocation } from 'react-router-dom';
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

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/camera', label: 'Live Camera', icon: Camera },
  { path: '/admin', label: 'Admin Panel', icon: Settings },
  { path: '/investigator', label: 'Investigator', icon: FileText },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 glass border-r border-dark-700 min-h-screen fixed left-0 top-16">
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => {
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
      </nav>
    </aside>
  );
}
