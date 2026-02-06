import { useEffect, useState } from 'react';
import Card from '../components/Card';
import { Shield, Users, Activity, FileText, AlertCircle } from 'lucide-react';
import api from '../services/api';

interface AdminStats {
  users: { total: number };
  detections: {
    total: number;
    byType: { image: number; video: number; audio: number };
    byLabel: { authentic: number; suspicious: number; deepfake: number };
  };
  reports: { total: number };
}

interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<Array<{ time: string; message: string; type: string }>>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, usersRes] = await Promise.all([
          api.get('/admin/stats'),
          api.get('/admin/users'),
        ]);
        setStats(statsRes.data);
        setUsers(usersRes.data.users || []);

        // Build log entries from recent users
        const recentLogs = (usersRes.data.users || []).slice(0, 4).map((u: UserRecord) => ({
          time: new Date(u.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          message: `User registered: ${u.email}`,
          type: 'info',
        }));
        setLogs(recentLogs);
      } catch (error) {
        console.error('Failed to load admin data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const statCards = stats
    ? [
        { label: 'Total Users', value: stats.users.total.toLocaleString(), icon: Users, color: 'text-blue-400' },
        { label: 'Total Detections', value: stats.detections.total.toLocaleString(), icon: Activity, color: 'text-green-400' },
        { label: 'Deepfakes Found', value: stats.detections.byLabel.deepfake.toLocaleString(), icon: Shield, color: 'text-red-400' },
        { label: 'Reports Generated', value: stats.reports.total.toLocaleString(), icon: FileText, color: 'text-purple-400' },
      ]
    : [];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-20 text-center">
        <p className="text-gray-400">Loading admin data...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-200 mb-2">Admin Dashboard</h1>
        <p className="text-gray-400">System monitoring and management</p>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} hover>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-200">{stat.value}</p>
                </div>
                <Icon className={`w-8 h-8 ${stat.color}`} />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Detection Breakdown */}
      {stats && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <div className="flex items-center space-x-3 mb-6">
              <Activity className="w-6 h-6 text-primary-400" />
              <h2 className="text-xl font-semibold text-gray-200">Detection Breakdown</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-dark-800/50 rounded-lg">
                <span className="text-gray-300">Image Detections</span>
                <span className="text-blue-400 font-semibold">{stats.detections.byType.image}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-dark-800/50 rounded-lg">
                <span className="text-gray-300">Video Detections</span>
                <span className="text-green-400 font-semibold">{stats.detections.byType.video}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-dark-800/50 rounded-lg">
                <span className="text-gray-300">Audio Detections</span>
                <span className="text-purple-400 font-semibold">{stats.detections.byType.audio}</span>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center space-x-3 mb-6">
              <Shield className="w-6 h-6 text-primary-400" />
              <h2 className="text-xl font-semibold text-gray-200">Results Breakdown</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-dark-800/50 rounded-lg">
                <span className="text-gray-300">Authentic</span>
                <span className="text-green-400 font-semibold">{stats.detections.byLabel.authentic}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-dark-800/50 rounded-lg">
                <span className="text-gray-300">Suspicious</span>
                <span className="text-amber-400 font-semibold">{stats.detections.byLabel.suspicious}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-dark-800/50 rounded-lg">
                <span className="text-gray-300">Deepfake</span>
                <span className="text-red-400 font-semibold">{stats.detections.byLabel.deepfake}</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* User Management */}
      <Card>
        <div className="flex items-center space-x-3 mb-6">
          <Users className="w-6 h-6 text-primary-400" />
          <h2 className="text-xl font-semibold text-gray-200">User Management</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Name</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Email</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Role</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-dark-800 hover:bg-dark-800/30 transition-colors"
                >
                  <td className="py-3 px-4 text-gray-300">{user.name}</td>
                  <td className="py-3 px-4 text-gray-400">{user.email}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-primary-600/20 text-primary-400 rounded text-xs">
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        user.is_active
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {user.is_active ? 'active' : 'inactive'}
                    </span>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recent Activity Logs */}
      <Card>
        <div className="flex items-center space-x-3 mb-6">
          <AlertCircle className="w-6 h-6 text-primary-400" />
          <h2 className="text-xl font-semibold text-gray-200">Recent Activity</h2>
        </div>
        <div className="space-y-2">
          {logs.map((log, index) => (
            <div
              key={index}
              className="flex items-center space-x-4 p-3 bg-dark-800/50 rounded-lg text-sm"
            >
              <span className="text-gray-500 w-20">{log.time}</span>
              <span className="flex-1 text-gray-300">{log.message}</span>
            </div>
          ))}
          {logs.length === 0 && (
            <p className="text-gray-500 text-center py-4">No recent activity</p>
          )}
        </div>
      </Card>
    </div>
  );
}
