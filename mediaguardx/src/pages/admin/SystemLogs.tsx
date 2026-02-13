import { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Users,
  Shield,
  Eye,
  Trash2,
  Edit,
  LogIn,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { getActivityLogs } from '@/services/api';
import Skeleton from '@/components/ui/Skeleton';

interface ActivityLog {
  id: string;
  action: string;
  userEmail: string;
  timestamp: string;
  resource?: string;
  details?: string;
}

const PAGE_SIZE = 50;

const ACTION_TYPE_OPTIONS = [
  'All',
  'Login',
  'Detection',
  'Upload',
  'Update',
  'Delete',
  'Role Change',
] as const;

function getActionIcon(action: string): React.ReactNode {
  const normalized = action.toLowerCase();
  if (normalized.includes('login') || normalized.includes('auth') || normalized.includes('sign')) {
    return <LogIn className="w-4 h-4 text-indigo-400" />;
  }
  if (normalized.includes('detect') || normalized.includes('scan')) {
    return <Eye className="w-4 h-4 text-emerald-400" />;
  }
  if (normalized.includes('upload')) {
    return <Activity className="w-4 h-4 text-blue-400" />;
  }
  if (normalized.includes('delete') || normalized.includes('remove')) {
    return <Trash2 className="w-4 h-4 text-red-400" />;
  }
  if (normalized.includes('update') || normalized.includes('edit') || normalized.includes('change')) {
    return <Edit className="w-4 h-4 text-amber-400" />;
  }
  if (normalized.includes('role')) {
    return <Shield className="w-4 h-4 text-purple-400" />;
  }
  if (normalized.includes('user') || normalized.includes('register')) {
    return <Users className="w-4 h-4 text-teal-400" />;
  }
  return <Clock className="w-4 h-4 text-slate-400" />;
}

function getActionColor(action: string): string {
  const normalized = action.toLowerCase();
  if (normalized.includes('login') || normalized.includes('auth')) return 'border-indigo-500/30';
  if (normalized.includes('detect') || normalized.includes('scan')) return 'border-emerald-500/30';
  if (normalized.includes('delete') || normalized.includes('remove')) return 'border-red-500/30';
  if (normalized.includes('update') || normalized.includes('edit')) return 'border-amber-500/30';
  if (normalized.includes('role')) return 'border-purple-500/30';
  return 'border-slate-700';
}

export default function SystemLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [actionFilter, setActionFilter] = useState('All');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchLogs = useCallback(async (offset: number, append: boolean) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await getActivityLogs(PAGE_SIZE, offset);
      const newLogs: ActivityLog[] = data.logs || data.activities || [];

      if (append) {
        setLogs((prev) => [...prev, ...newLogs]);
      } else {
        setLogs(newLogs);
      }

      setHasMore(newLogs.length >= PAGE_SIZE);
    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(0, false);
  }, [fetchLogs]);

  function handleLoadMore(): void {
    fetchLogs(logs.length, true);
  }

  function toggleExpand(logId: string): void {
    setExpandedLogId((prev) => (prev === logId ? null : logId));
  }

  const filteredLogs = actionFilter === 'All'
    ? logs
    : logs.filter((log) =>
        log.action.toLowerCase().includes(actionFilter.toLowerCase()),
      );

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <Skeleton className="h-9 w-48 mb-2" variant="text" />
          <Skeleton className="h-5 w-64" variant="text" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card rounded-xl p-4 flex items-start gap-4">
              <Skeleton className="w-8 h-8" variant="circular" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" variant="text" />
                <Skeleton className="h-3 w-32" variant="text" />
              </div>
              <Skeleton className="h-3 w-24" variant="text" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-200 mb-2 flex items-center gap-3">
          <Activity className="w-8 h-8 text-emerald-400" />
          Activity Logs
        </h1>
        <p className="text-slate-400">System-wide activity timeline and audit trail</p>
      </div>

      {/* Filter */}
      <div className="card rounded-xl p-4">
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-400 font-medium">Filter by action:</label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent cursor-pointer"
          >
            {ACTION_TYPE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <span className="text-xs text-slate-500 ml-auto">
            {filteredLogs.length} entries
          </span>
        </div>
      </div>

      {/* Timeline */}
      {filteredLogs.length === 0 ? (
        <div className="card rounded-xl p-12 text-center">
          <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 text-lg font-medium">No activity logs found</p>
          <p className="text-slate-600 text-sm mt-1">
            {actionFilter !== 'All'
              ? 'Try selecting a different filter'
              : 'Activity will appear here as users interact with the system'}
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline vertical line */}
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-slate-800" />

          <div className="space-y-2">
            {filteredLogs.map((log, index) => {
              const isExpanded = expandedLogId === (log.id || String(index));
              const logId = log.id || String(index);

              return (
                <div key={logId} className="relative flex items-start gap-4 pl-2">
                  {/* Timeline dot */}
                  <div className={`relative z-10 w-9 h-9 rounded-full bg-slate-900 border-2 ${getActionColor(log.action)} flex items-center justify-center flex-shrink-0`}>
                    {getActionIcon(log.action)}
                  </div>

                  {/* Log content */}
                  <div className="flex-1 card rounded-xl p-4 hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200">{log.action}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-emerald-400 font-medium">{log.userEmail}</span>
                          {log.resource && (
                            <>
                              <span className="text-xs text-slate-700">|</span>
                              <span className="text-xs text-slate-500 truncate">{log.resource}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-slate-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {log.details && (
                          <button
                            onClick={() => toggleExpand(logId)}
                            className="p-1 rounded hover:bg-slate-700 text-slate-400 transition-colors"
                            title={isExpanded ? 'Collapse details' : 'Expand details'}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expandable details */}
                    {isExpanded && log.details && (
                      <div className="mt-3 pt-3 border-t border-slate-800/50">
                        <pre className="text-xs text-slate-400 whitespace-pre-wrap font-mono bg-slate-800/30 rounded-lg p-3">
                          {log.details}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Load More */}
      {hasMore && filteredLogs.length > 0 && (
        <div className="flex justify-center pt-4">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="btn-admin flex items-center gap-2"
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
