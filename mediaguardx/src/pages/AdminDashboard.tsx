import Card from '../components/Card';
import { Shield, Users, Activity, FileText, TrendingUp, AlertCircle } from 'lucide-react';

export default function AdminDashboard() {
  const stats = [
    { label: 'Total Users', value: '1,234', icon: Users, color: 'text-blue-400' },
    { label: 'Detections Today', value: '567', icon: Activity, color: 'text-green-400' },
    { label: 'System Health', value: '98%', icon: Shield, color: 'text-primary-400' },
    { label: 'Reports Generated', value: '890', icon: FileText, color: 'text-purple-400' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-200 mb-2">Admin Dashboard</h1>
        <p className="text-gray-400">System monitoring and management</p>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
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

      {/* System Monitoring */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center space-x-3 mb-6">
            <Activity className="w-6 h-6 text-primary-400" />
            <h2 className="text-xl font-semibold text-gray-200">System Monitoring</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-dark-800/50 rounded-lg">
              <span className="text-gray-300">API Response Time</span>
              <span className="text-green-400 font-semibold">120ms</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-dark-800/50 rounded-lg">
              <span className="text-gray-300">Model Inference Time</span>
              <span className="text-green-400 font-semibold">2.3s</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-dark-800/50 rounded-lg">
              <span className="text-gray-300">Queue Length</span>
              <span className="text-amber-400 font-semibold">12</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-dark-800/50 rounded-lg">
              <span className="text-gray-300">Storage Used</span>
              <span className="text-gray-400 font-semibold">45%</span>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center space-x-3 mb-6">
            <AlertCircle className="w-6 h-6 text-primary-400" />
            <h2 className="text-xl font-semibold text-gray-200">Notifications</h2>
          </div>
          <div className="space-y-3">
            <div className="p-4 bg-primary-600/10 border border-primary-600/30 rounded-lg">
              <p className="text-sm text-primary-400 font-medium mb-1">Model Update Available</p>
              <p className="text-xs text-gray-400">New deepfake detection model v2.1 is ready for deployment</p>
            </div>
            <div className="p-4 bg-amber-600/10 border border-amber-600/30 rounded-lg">
              <p className="text-sm text-amber-400 font-medium mb-1">High Traffic Warning</p>
              <p className="text-xs text-gray-400">Detections have increased by 45% in the last hour</p>
            </div>
          </div>
        </Card>
      </div>

      {/* User Management */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Users className="w-6 h-6 text-primary-400" />
            <h2 className="text-xl font-semibold text-gray-200">User Management</h2>
          </div>
          <button className="px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-lg transition-colors">
            Add User
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Name</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Email</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Role</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'John Doe', email: 'john@example.com', role: 'user', status: 'active' },
                { name: 'Jane Smith', email: 'jane@example.com', role: 'investigator', status: 'active' },
                { name: 'Bob Wilson', email: 'bob@example.com', role: 'user', status: 'inactive' },
              ].map((user, index) => (
                <tr
                  key={index}
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
                        user.status === 'active'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button className="text-primary-400 hover:text-primary-300 text-sm">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Logs */}
      <Card>
        <div className="flex items-center space-x-3 mb-6">
          <FileText className="w-6 h-6 text-primary-400" />
          <h2 className="text-xl font-semibold text-gray-200">Recent Logs</h2>
        </div>
        <div className="space-y-2">
          {[
            { time: '10:23 AM', message: 'User login: john@example.com', type: 'info' },
            { time: '10:20 AM', message: 'Detection completed: det_123456', type: 'success' },
            { time: '10:15 AM', message: 'Model inference error: timeout', type: 'error' },
            { time: '10:10 AM', message: 'Report generated: report_789', type: 'success' },
          ].map((log, index) => (
            <div
              key={index}
              className="flex items-center space-x-4 p-3 bg-dark-800/50 rounded-lg text-sm"
            >
              <span className="text-gray-500 w-20">{log.time}</span>
              <span
                className={`flex-1 ${
                  log.type === 'error'
                    ? 'text-red-400'
                    : log.type === 'success'
                    ? 'text-green-400'
                    : 'text-gray-300'
                }`}
              >
                {log.message}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

