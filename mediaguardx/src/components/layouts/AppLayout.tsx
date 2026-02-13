import { ReactNode } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import ToastContainer from '@/components/feedback/ToastContainer';
import { useUIStore } from '@/store/uiStore';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { sidebarCollapsed } = useUIStore();

  return (
    <div className="min-h-screen bg-surface-950">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'} p-4 lg:p-6`}>
          {children}
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
