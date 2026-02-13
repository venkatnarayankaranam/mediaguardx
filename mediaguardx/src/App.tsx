import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

// Guards
import ProtectedRoute from '@/guards/ProtectedRoute';
import AdminRoute from '@/guards/AdminRoute';

// Layouts
import AppLayout from '@/components/layouts/AppLayout';
import AdminLayout from '@/components/layouts/AdminLayout';

// Public pages
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import AdminLogin from '@/pages/AdminLogin';

// Protected pages
import Dashboard from '@/pages/Dashboard';
import DetectionResult from '@/pages/DetectionResult';
import CameraMonitoring from '@/pages/CameraMonitoring';
import History from '@/pages/History';

// Admin pages
import AdminDashboard from '@/pages/admin/AdminDashboard';
import UserManagement from '@/pages/admin/UserManagement';
import SystemLogs from '@/pages/admin/SystemLogs';
import InvestigatorDashboard from '@/pages/admin/InvestigatorDashboard';

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
    </BrowserRouter>
  );
}

export default App;
