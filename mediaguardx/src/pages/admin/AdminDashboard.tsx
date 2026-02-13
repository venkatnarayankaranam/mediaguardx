import { useState, useEffect } from 'react';
import { Users, Activity, Shield, BarChart3, Clock, FileText, Eye } from 'lucide-react';
import { getAdminStats, getActivityLogs, getAdminHistory } from '@/services/api';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';

interface AdminStats {
  users: { total: number };
  detections: {
    total: number;
    byType: { image: number; video: number; audio: number };
    byLabel: { authentic: number; suspicious: number; deepfake: number };
  };
  reports: { total: number };
  avgTrustScore?: number;
}

interface ActivityLog {
  id: string;
  action: string;
  userEmail: string;
  timestamp: string;
  resource?: string;
  details?: string;
}

interface RecentDetection {
  id: string;
  fileName: string;
  fileType: string;
  trustScore: number;
  status: string;
  createdAt: string;
  userEmail?: string;
}

function getTrustScoreColor(score: number): string {
  if (score >= 70) return 'text-emerald-400';
  if (score >= 40) return 'text-amber-400';
  return 'text-red-400';
}

function getStatusBadgeVariant(status: string): 'success' | 'warning' | 'danger' {
  if (status === 'authentic') return 'success';
  if (status === 'suspected' || status === 'suspicious') return 'warning';
  return 'danger';
}

function getActionIcon(action: string): React.ReactNode {
  const normalized = action.toLowerCase();
  if (normalized.includes('login') || normalized.includes('auth')) {
    return <Users className="w-4 h-4 text-indigo-400" />;
  }
  if (normalized.includes('detect') || normalized.includes('upload')) {
    return <Eye className="w-4 h-4 text-emerald-400" />;
  }
  if (normalized.includes('delete') || normalized.includes('remove')) {
    return <Shield className="w-4 h-4 text-red-400" />;
  }
  if (normalized.includes('update') || normalized.includes('role') || normalized.includes('status')) {
    return <Activity className="w-4 h-4 text-amber-400" />;
  }
  return <Clock className="w-4 h-4 text-slate-400" />;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [recentDetections, setRecentDetections] = useState<RecentDetection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [statsData, logsData, historyData] = await Promise.all([
          getAdminStats(),
          getActivityLogs(10, 0),
          getAdminHistory(5, 0),
        ]);
        setStats(statsData);
        setActivityLogs(logsData.logs || logsData.activities || []);
        setRecentDetections(historyData.detections || []);
      } catch (err) {
        console.error('Failed to load admin dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <Skeleton className="h-9 w-64 mb-2" variant="text" />
          <Skeleton className="h-5 w-48" variant="text" />
        </div>
        <div className="grid md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card rounded-xl p-6">
              <Skeleton className="h-5 w-24 mb-3" variant="text" />
              <Skeleton className="h-8 w-16" variant="text" />
            </div>
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card rounded-xl p-6">
            <Skeleton className="h-6 w-40 mb-4" variant="text" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full mb-2" />
            ))}
          </div>
          <div className="card rounded-xl p-6">
            <Skeleton className="h-6 w-40 mb-4" variant="text" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full mb-2" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Users',
      value: stats?.users.total ?? 0,
      icon: Users,
      iconColor: 'text-emerald-400',
      bgColor: 'bg-emerald-500/15',
      borderColor: 'border-emerald-500/20',
    },
    {
      label: 'Total Detections',
      value: stats?.detections.total ?? 0,
      icon: Activity,
      iconColor: 'text-emerald-400',
      bgColor: 'bg-emerald-500/15',
      borderColor: 'border-emerald-500/20',
    },
    {
      label: 'Deepfakes Found',
      value: stats?.detections.byLabel.deepfake ?? 0,
      icon: Shield,
      iconColor: 'text-red-400',
      bgColor: 'bg-red-500/15',
      borderColor: 'border-red-500/20',
    },
    {
      label: 'Avg Trust Score',
      value: stats?.avgTrustScore != null ? `${stats.avgTrustScore.toFixed(1)}%` : 'N/A',
      icon: BarChart3,
      iconColor: 'text-emerald-400',
      bgColor: 'bg-emerald-500/15',
      borderColor: 'border-emerald-500/20',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-200 mb-2">Admin Dashboard</h1>
        <p className="text-slate-400">System overview and recent activity</p>
      </div>

      {/* Stat Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`rounded-xl p-5 border ${card.bgColor} ${card.borderColor} transition-all hover:scale-[1.02]`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-400">{card.label}</span>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-slate-900/50`}>
                  <Icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-100">
                {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="card rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            Recent Activity
          </h2>

          {activityLogs.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No recent activity</p>
          ) : (
            <div className="space-y-1">
              {activityLogs.map((log, index) => (
                <div key={log.id || index} className="flex items-start gap-3 py-3 relative">
                  {/* Timeline line */}
                  {index < activityLogs.length - 1 && (
                    <div className="absolute left-[11px] top-10 bottom-0 w-px bg-slate-800" />
                  )}
                  {/* Icon */}
                  <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5 z-10">
                    {getActionIcon(log.action)}
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 font-medium">{log.action}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500">{log.userEmail}</span>
                      <span className="text-xs text-slate-700">|</span>
                      <span className="text-xs text-slate-500">
                        {new Date(log.timestamp).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {log.resource && (
                      <p className="text-xs text-slate-600 mt-1 truncate">{log.resource}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Detections */}
        <div className="card rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            Recent Detections
          </h2>

          {recentDetections.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No recent detections</p>
          ) : (
            <div className="space-y-3">
              {recentDetections.map((detection) => (
                <div
                  key={detection.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-slate-800/30 border border-slate-800/50 hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 font-medium truncate">
                      {detection.fileName}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="neutral">{detection.fileType}</Badge>
                      {detection.userEmail && (
                        <span className="text-xs text-slate-500 truncate">{detection.userEmail}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-semibold ${getTrustScoreColor(detection.trustScore)}`}>
                      {detection.trustScore.toFixed(1)}%
                    </p>
                    <Badge variant={getStatusBadgeVariant(detection.status)}>
                      {detection.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
