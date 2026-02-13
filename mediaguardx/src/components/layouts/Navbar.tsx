import { Link, useLocation } from 'react-router-dom';
import { Menu, LogOut, User, Shield } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { toggleSidebar } = useUIStore();
  const location = useLocation();

  return (
    <nav className="glass-strong border-b border-slate-800/60 sticky top-0 z-40">
      <div className="px-4 lg:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <button onClick={toggleSidebar} className="lg:hidden p-2 hover:bg-slate-800 rounded-lg">
              <Menu className="w-5 h-5 text-slate-400" />
            </button>
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-brand rounded-lg flex items-center justify-center shadow-glow-brand">
                <Shield className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="text-xl font-bold text-gradient-brand hidden sm:block">
                MediaGuardX
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <div className="hidden md:flex items-center gap-2 text-sm text-slate-400">
                  <User className="w-4 h-4" />
                  <span>{user?.name || user?.email}</span>
                </div>
                <button
                  onClick={() => logout()}
                  className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className={`text-sm font-medium transition-colors ${location.pathname === '/login' ? 'text-indigo-400' : 'text-slate-300 hover:text-indigo-400'}`}
                >
                  Sign In
                </Link>
                <Link to="/register" className="btn-primary text-sm px-4 py-2">
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
