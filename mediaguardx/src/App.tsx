import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

// Guards
import ProtectedRoute from '@/guards/ProtectedRoute';
import AdminRoute from '@/guards/AdminRoute';

// Layouts (keep eagerly loaded — they wrap every page)
import AppLayout from '@/components/layouts/AppLayout';
import AdminLayout from '@/components/layouts/AdminLayout';

// Public pages (eagerly loaded — initial landing)
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Register from '@/pages/Register';

// Lazy-loaded pages (code-split into separate chunks)
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const AdminLogin = lazy(() => import('@/pages/AdminLogin'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const DetectionResult = lazy(() => import('@/pages/DetectionResult'));
const CameraMonitoring = lazy(() => import('@/pages/CameraMonitoring'));
const History = lazy(() => import('@/pages/History'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const UserManagement = lazy(() => import('@/pages/admin/UserManagement'));
const SystemLogs = lazy(() => import('@/pages/admin/SystemLogs'));
const InvestigatorDashboard = lazy(() => import('@/pages/admin/InvestigatorDashboard'));

function PageLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500">Loading...</p>
      </div>
    </div>
  );
}

function App() {
  const { initialize, initialized } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!initialized) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading MediaGuardX...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Protected routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <AppLayout><Dashboard /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/detection/:id" element={
            <ProtectedRoute>
              <AppLayout><DetectionResult /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/camera" element={
            <ProtectedRoute>
              <AppLayout><CameraMonitoring /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/history" element={
            <ProtectedRoute>
              <AppLayout><History /></AppLayout>
            </ProtectedRoute>
          } />

          {/* Admin routes */}
          <Route path="/admin" element={
            <AdminRoute>
              <AdminLayout><AdminDashboard /></AdminLayout>
            </AdminRoute>
          } />
          <Route path="/admin/users" element={
            <AdminRoute>
              <AdminLayout><UserManagement /></AdminLayout>
            </AdminRoute>
          } />
          <Route path="/admin/logs" element={
            <AdminRoute>
              <AdminLayout><SystemLogs /></AdminLayout>
            </AdminRoute>
          } />
          <Route path="/admin/investigator" element={
            <AdminRoute>
              <AdminLayout><InvestigatorDashboard /></AdminLayout>
            </AdminRoute>
          } />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
