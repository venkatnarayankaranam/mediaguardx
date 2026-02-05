import { ReactNode } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useAuthStore } from '../store/authStore';

interface LayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
}

export default function Layout({ children, showSidebar = true }: LayoutProps) {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="min-h-screen bg-dark-900">
      <Navbar />
      <div className="flex">
        {isAuthenticated && showSidebar && <Sidebar />}
        <main
          className={`flex-1 ${isAuthenticated && showSidebar ? 'ml-64' : ''} p-6`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

