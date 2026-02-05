import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import { FileText, Calendar, Activity, Search } from 'lucide-react';
import api from '../services/api';

interface DetectionRecord {
  id: string;
  filename: string;
  mediaType: string;
  trustScore: number;
  label: string;
  timestamp: string;
  userId: string;
  userEmail?: string;
}

export default function InvestigatorDashboard() {
  const navigate = useNavigate();
  const [detections, setDetections] = useState<DetectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchDetections = async () => {
      try {
        const response = await api.get('/history/admin', { params: { limit: 50 } });
        setDetections(response.data.detections || []);
        setTotal(response.data.total || 0);
      } catch (error) {
        console.error('Failed to load investigator data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetections();
  }, []);

  const labelToStatus = (label: string): 'authentic' | 'suspected' | 'deepfake' => {
    if (label === 'Authentic') return 'authentic';
    if (label === 'Deepfake') return 'deepfake';
    return 'suspected';
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-20 text-center">
        <p className="text-gray-400">Loading investigator data...</p>
      </div>
    );
  }

  const deepfakeCount = detections.filter(d => d.label === 'Deepfake').length;
  const suspiciousCount = detections.filter(d => d.label === 'Suspicious').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-200 mb-2">Investigator Dashboard</h1>
        <p className="text-gray-400">Review and analyze detection evidence</p>
      </div>

      {/* Summary Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card hover>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Total Detections</p>
              <p className="text-2xl font-bold text-gray-200">{total}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-400" />
          </div>
        </Card>
        <Card hover>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Deepfakes Found</p>
              <p className="text-2xl font-bold text-red-400">{deepfakeCount}</p>
            </div>
            <Search className="w-8 h-8 text-red-400" />
          </div>
        </Card>
        <Card hover>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Suspicious</p>
              <p className="text-2xl font-bold text-amber-400">{suspiciousCount}</p>
            </div>
            <FileText className="w-8 h-8 text-amber-400" />
          </div>
        </Card>
      </div>

      {/* Detections Table */}
      <Card>
        <div className="flex items-center space-x-3 mb-6">
          <FileText className="w-6 h-6 text-primary-400" />
          <h2 className="text-xl font-semibold text-gray-200">All Detections</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">File</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Type</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Score</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Result</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">User</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Date</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {detections.map((det) => (
                <tr
                  key={det.id}
                  className="border-b border-dark-800 hover:bg-dark-800/30 transition-colors"
                >
                  <td className="py-3 px-4 text-gray-300 max-w-[200px] truncate">{det.filename}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-dark-700 text-gray-300 rounded text-xs uppercase">
                      {det.mediaType}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`font-semibold ${
                      det.trustScore >= 70 ? 'text-green-400' :
                      det.trustScore >= 40 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {det.trustScore.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={labelToStatus(det.label)} size="sm" />
                  </td>
                  <td className="py-3 px-4 text-gray-400 text-sm">{det.userEmail || det.userId}</td>
                  <td className="py-3 px-4 text-gray-400 text-sm">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(det.timestamp).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => navigate(`/detection/${det.id}`)}
                      className="text-primary-400 hover:text-primary-300 text-sm"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
              {detections.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    No detections found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
