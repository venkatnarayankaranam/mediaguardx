import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import ToastContainer from '@/components/feedback/ToastContainer';

export default function LandingLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="min-h-screen bg-surface-950">
      {/* Transparent nav */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-surface-950/80 backdrop-blur-lg border-b border-slate-800/30">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-brand rounded-lg flex items-center justify-center shadow-glow-brand">
                <Shield className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="text-xl font-bold text-gradient-brand">MediaGuardX</span>
            </Link>

            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <Link to="/dashboard" className="btn-primary text-sm px-4 py-2">
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/login" className="text-sm text-slate-300 hover:text-indigo-400 transition-colors">
                    Sign In
                  </Link>
                  <Link to="/register" className="btn-primary text-sm px-4 py-2">
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-16">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-gradient-brand rounded flex items-center justify-center">
                  <Shield className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-bold text-gradient-brand">MediaGuardX</span>
              </div>
              <p className="text-sm text-slate-500">AI-powered deepfake detection platform</p>
            </div>
            <div>
              <h4 className="font-medium text-slate-300 mb-3">Product</h4>
              <div className="space-y-2 text-sm text-slate-500">
                <p>Detection</p>
                <p>Live Monitoring</p>
                <p>Reports</p>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-slate-300 mb-3">Platform</h4>
              <div className="space-y-2 text-sm text-slate-500">
                <p>Dashboard</p>
                <p>API Access</p>
                <p>Documentation</p>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-slate-300 mb-3">Legal</h4>
              <div className="space-y-2 text-sm text-slate-500">
                <p>Privacy</p>
                <p>Terms</p>
                <p>Security</p>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-800/60 text-center text-sm text-slate-600">
            &copy; {new Date().getFullYear()} MediaGuardX. All rights reserved.
          </div>
        </div>
      </footer>

      <ToastContainer />
    </div>
  );
}
