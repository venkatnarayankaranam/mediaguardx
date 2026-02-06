import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import DetectionResult from './pages/DetectionResult';
import AdminDashboard from './pages/AdminDashboard';
import InvestigatorDashboard from './pages/InvestigatorDashboard';
import CameraMonitoring from './pages/CameraMonitoring';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing page (no sidebar) */}
        <Route path="/" element={<Landing />} />

        {/* Auth pages (no sidebar) */}
        <Route path="/login" element={<Layout showSidebar={false}><Login /></Layout>} />
        <Route path="/register" element={<Layout showSidebar={false}><Register /></Layout>} />
        <Route path="/forgot-password" element={<Layout showSidebar={false}><ForgotPassword /></Layout>} />

        {/* Main pages with sidebar */}
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/detection/:id" element={<Layout><DetectionResult /></Layout>} />
        <Route path="/admin" element={<Layout><AdminDashboard /></Layout>} />
        <Route path="/investigator" element={<Layout><InvestigatorDashboard /></Layout>} />
        <Route path="/camera" element={<Layout><CameraMonitoring /></Layout>} />

        {/* Redirect any unknown routes to landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
