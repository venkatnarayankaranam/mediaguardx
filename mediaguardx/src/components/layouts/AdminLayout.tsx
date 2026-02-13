import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, LayoutDashboard, Users, Activity, FileText, LogOut, Menu } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import ToastContainer from '@/components/feedback/ToastContainer';

const adminMenuItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/users', label: 'Users', icon: Users },
  { path: '/admin/logs', label: 'Activity Logs', icon: Activity },
  { path: '/admin/investigator', label: 'Investigator', icon: FileText },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  return (
    <div className="min-h-screen bg-surface-950">
      {/* Admin Navbar */}
      <nav className="glass-strong border-b border-emerald-900/30 sticky top-0 z-40">
        <div className="px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 hover:bg-slate-800 rounded-lg">
                <Menu className="w-5 h-5 text-slate-400" />
              </button>
              <Link to="/admin" className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-gradient-admin rounded-lg flex items-center justify-center shadow-glow-admin">
                  <Shield className="w-4.5 h-4.5 text-white" />
                </div>
                <div className="hidden sm:block">
                  <span className="text-lg font-bold text-gradient-admin">MediaGuardX</span>
                  <span className="ml-2 text-xs font-medium px-2 py-0.5 bg-emerald-500/15 text-emerald-400 rounded-full border border-emerald-500/20">
                    Admin
                  </span>
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <Link to="/dashboard" className="text-sm text-slate-400 hover:text-slate-200 transition-colors">
                User Portal
              </Link>
              <span className="text-sm text-slate-500">{user?.name}</span>
              <button onClick={() => logout()} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Admin Sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        <aside className={`fixed left-0 top-16 bottom-0 z-30 w-64 bg-slate-900/95 backdrop-blur-lg border-r border-emerald-900/20 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
          <nav className="p-3 space-y-1">
            {adminMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 lg:ml-64 p-4 lg:p-6">
          {children}
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}
