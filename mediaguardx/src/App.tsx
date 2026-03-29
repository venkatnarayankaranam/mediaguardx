import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

// Guards
import ProtectedRoute from '@/guards/ProtectedRoute';
import AdminRoute from '@/guards/AdminRoute';

// Layouts (keep eagerly loaded — they wrap every page)
import AppLayout from '@/components/layouts/AppLayout';
import AdminLayout from '@/components/layouts/AdminLayout';

// Layouts (auth pages)
import AuthLayout from '@/components/layouts/AuthLayout';

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
const AdaptiveLearning = lazy(() => import('@/pages/AdaptiveLearning'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

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

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
          <h1 className="text-4xl font-bold text-red-400 mb-4">Something went wrong</h1>
          <p className="text-slate-400 mb-8">{this.state.error?.message || 'An unexpected error occurred'}</p>
          <button onClick={() => window.location.reload()} className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors">Reload Page</button>
        </div>
      );
    }
    return this.props.children;
  }
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
      <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/reset-password" element={
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-2 border-purple-500 rounded-full border-t-transparent" /></div>}>
              <AuthLayout><ResetPassword /></AuthLayout>
            </Suspense>
          } />

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
          <Route path="/adaptive-learning" element={
            <ProtectedRoute>
              <AppLayout><AdaptiveLearning /></AppLayout>
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
          <Route path="*" element={
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
              <h1 className="text-6xl font-bold text-purple-400 mb-4">404</h1>
              <p className="text-xl text-slate-400 mb-8">Page not found</p>
              <a href="/" className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors">Go Home</a>
            </div>
          } />
        </Routes>
      </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
