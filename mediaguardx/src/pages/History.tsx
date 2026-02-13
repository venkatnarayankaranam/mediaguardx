import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { History as HistoryIcon, Search, FileImage, FileVideo, FileAudio, ChevronLeft, ChevronRight, FileQuestion } from 'lucide-react';
import { getUserHistory } from '@/services/api';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';

interface HistoryItem {
  id: string;
  fileName: string;
  fileType: 'image' | 'video' | 'audio';
  trustScore: number;
  status: 'authentic' | 'suspected' | 'deepfake';
  createdAt: string;
}

interface HistoryResponse {
  detections: HistoryItem[];
  total: number;
}

const PAGE_SIZE = 20;

const MEDIA_TYPE_OPTIONS = ['All', 'Image', 'Video', 'Audio'] as const;
const STATUS_OPTIONS = ['All', 'Authentic', 'Suspicious', 'Deepfake'] as const;

function getStatusBadgeVariant(status: string): 'success' | 'warning' | 'danger' {
  if (status === 'authentic') return 'success';
  if (status === 'suspected') return 'warning';
  return 'danger';
}

function getTrustScoreColor(score: number): string {
  if (score >= 70) return 'text-emerald-400';
  if (score >= 40) return 'text-amber-400';
  return 'text-red-400';
}

function getFileTypeIcon(fileType: string): React.ReactNode {
  if (fileType === 'image') return <FileImage className="w-4 h-4" />;
  if (fileType === 'video') return <FileVideo className="w-4 h-4" />;
  if (fileType === 'audio') return <FileAudio className="w-4 h-4" />;
  return <FileQuestion className="w-4 h-4" />;
}

function getFileTypeBadgeVariant(fileType: string): 'info' | 'success' | 'warning' | 'neutral' {
  if (fileType === 'image') return 'info';
  if (fileType === 'video') return 'success';
  if (fileType === 'audio') return 'warning';
  return 'neutral';
}

export default function History() {
  const navigate = useNavigate();

  const [detections, setDetections] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  const [mediaTypeFilter, setMediaTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchHistory = useCallback(async (currentPage: number) => {
    setLoading(true);
    try {
      const offset = currentPage * PAGE_SIZE;
      const data: HistoryResponse = await getUserHistory(PAGE_SIZE, offset);
      setDetections(data.detections || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch detection history:', err);
      setDetections([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(page);
  }, [page, fetchHistory]);

  const filteredDetections = detections.filter((item) => {
    if (mediaTypeFilter !== 'All' && item.fileType !== mediaTypeFilter.toLowerCase()) {
      return false;
    }
    if (statusFilter !== 'All') {
      const normalizedStatus = statusFilter.toLowerCase();
      const itemStatus = item.status === 'suspected' ? 'suspicious' : item.status;
      if (itemStatus !== normalizedStatus) return false;
    }
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      if (!item.fileName.toLowerCase().includes(query)) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-200 mb-2 flex items-center gap-3">
          <HistoryIcon className="w-8 h-8 text-indigo-400" />
          Detection History
        </h1>
        <p className="text-slate-400">Browse and filter your past media analysis results</p>
      </div>

      {/* Filter Bar */}
      <div className="card rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by file name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all"
            />
          </div>

          {/* Media Type Filter */}
          <select
            value={mediaTypeFilter}
            onChange={(e) => setMediaTypeFilter(e.target.value)}
            className="px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
          >
            {MEDIA_TYPE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt === 'All' ? 'All Types' : opt}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt === 'All' ? 'All Statuses' : opt}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left py-3.5 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  File Name
                </th>
                <th className="text-left py-3.5 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="text-left py-3.5 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Trust Score
                </th>
                <th className="text-left py-3.5 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left py-3.5 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading && (
                <>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="py-4 px-5"><Skeleton className="h-4 w-40" variant="text" /></td>
                      <td className="py-4 px-5"><Skeleton className="h-5 w-16" variant="rectangular" /></td>
                      <td className="py-4 px-5"><Skeleton className="h-4 w-12" variant="text" /></td>
                      <td className="py-4 px-5"><Skeleton className="h-5 w-20" variant="rectangular" /></td>
                      <td className="py-4 px-5"><Skeleton className="h-4 w-24" variant="text" /></td>
                    </tr>
                  ))}
                </>
              )}

              {!loading && filteredDetections.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <FileQuestion className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500 text-lg font-medium">No detections found</p>
                    <p className="text-slate-600 text-sm mt-1">
                      {searchQuery || mediaTypeFilter !== 'All' || statusFilter !== 'All'
                        ? 'Try adjusting your filters'
                        : 'Upload media from the dashboard to get started'}
                    </p>
                  </td>
                </tr>
              )}

              {!loading && filteredDetections.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => navigate(`/detection/${item.id}`)}
                  className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                >
                  <td className="py-3.5 px-5">
                    <span className="text-sm text-slate-200 font-medium truncate block max-w-[250px]">
                      {item.fileName}
                    </span>
                  </td>
                  <td className="py-3.5 px-5">
                    <Badge variant={getFileTypeBadgeVariant(item.fileType)}>
                      <span className="flex items-center gap-1.5">
                        {getFileTypeIcon(item.fileType)}
                        {item.fileType}
                      </span>
                    </Badge>
                  </td>
                  <td className="py-3.5 px-5">
                    <span className={`text-sm font-semibold ${getTrustScoreColor(item.trustScore)}`}>
                      {item.trustScore.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3.5 px-5">
                    <Badge variant={getStatusBadgeVariant(item.status)}>
                      {item.status}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-5">
                    <span className="text-sm text-slate-400">
                      {new Date(item.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-800">
            <p className="text-sm text-slate-500">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total} results
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <span className="text-sm text-slate-400 px-2">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
