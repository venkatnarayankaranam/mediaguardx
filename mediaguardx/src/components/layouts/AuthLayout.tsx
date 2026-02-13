import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import ToastContainer from '@/components/feedback/ToastContainer';

interface AuthLayoutProps {
  children: ReactNode;
  variant?: 'default' | 'admin';
}

export default function AuthLayout({ children, variant = 'default' }: AuthLayoutProps) {
  const isAdmin = variant === 'admin';

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col">
      {/* Minimal nav */}
      <nav className="px-6 py-4">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isAdmin ? 'bg-gradient-admin shadow-glow-admin' : 'bg-gradient-brand shadow-glow-brand'}`}>
            <Shield className="w-4.5 h-4.5 text-white" />
          </div>
          <span className={`text-xl font-bold ${isAdmin ? 'text-gradient-admin' : 'text-gradient-brand'}`}>
            MediaGuardX
          </span>
        </Link>
      </nav>

      {/* Centered content */}
      <div className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>

      <ToastContainer />
    </div>
  );
}
