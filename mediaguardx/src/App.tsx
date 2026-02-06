import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Pages
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import DetectionResult from './pages/DetectionResult';
import AdminDashboard from './pages/AdminDashboard';
import InvestigatorDashboard from './pages/InvestigatorDashboard';
import CameraMonitoring from './pages/CameraMonitoring';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing page */}
        <Route path="/" element={<Landing />} />

        {/* Main pages - no login required */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/detection/:id" element={<DetectionResult />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/investigator" element={<InvestigatorDashboard />} />
        <Route path="/camera" element={<CameraMonitoring />} />

        {/* Redirect any unknown routes to landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
