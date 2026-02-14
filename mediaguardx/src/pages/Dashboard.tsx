import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  Eye,
  History,
  ScanLine,
  Shield,
  Upload as UploadIcon,
} from 'lucide-react';
import FileUploader from '@/components/FileUploader';
import AnalysisProgress from '@/components/AnalysisProgress';
import { uploadMedia, getUserHistory } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';
import type { DetectionResult } from '@/types';

// -- Helpers --

function getTrustScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 50) return 'text-amber-400';
  return 'text-red-400';
}

function getStatusBadgeClasses(status: DetectionResult['status']): string {
  switch (status) {
    case 'authentic':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    case 'suspected':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    case 'deepfake':
      return 'bg-red-500/15 text-red-400 border-red-500/30';
  }
}

function getFileTypeBadgeClasses(fileType: DetectionResult['fileType']): string {
  switch (fileType) {
    case 'image':
      return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    case 'video':
      return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
    case 'audio':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// -- Stat card sub-component --

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  accentColor?: string;
}

function StatCard({ icon, label, value, subtitle, accentColor = 'text-indigo-400' }: StatCardProps) {
  return (
    <div className="card flex items-start gap-4">
      <div className={`p-3 rounded-lg bg-slate-800 ${accentColor}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-400">{label}</p>
        <p className="text-2xl font-bold text-slate-100">{value}</p>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

// -- Main Dashboard component --

export default function Dashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);

  const [uploading, setUploading] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [recentDetections, setRecentDetections] = useState<DetectionResult[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Fetch recent detection history on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchHistory(): Promise<void> {
      setLoadingHistory(true);
      try {
        const data = await getUserHistory(5, 0);
        if (!cancelled) {
          setRecentDetections(Array.isArray(data) ? data : data.detections ?? []);
        }
      } catch {
        if (!cancelled) {
          setRecentDetections([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingHistory(false);
        }
      }
    }

    fetchHistory();
    return () => { cancelled = true; };
  }, []);

  // Simulate analysis progress steps during upload
  useEffect(() => {
    if (!uploading) {
      setAnalysisStep(0);
      return;
    }

    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      if (step <= 3) {
        setAnalysisStep(step);
      } else {
        clearInterval(interval);
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [uploading]);

  async function handleUpload(file: File): Promise<void> {
    setUploading(true);
    try {
      const { detectionId } = await uploadMedia(file);
      setAnalysisStep(4);
      toast.success('Analysis complete! Redirecting to results...');

      // Brief pause so the user sees the "Complete" step
      await new Promise((resolve) => setTimeout(resolve, 600));
      navigate(`/detection/${detectionId}`);
    } catch {
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  // Compute quick stats from loaded history
  const totalScans = recentDetections.length;
  const avgTrustScore =
    totalScans > 0
      ? Math.round(
          recentDetections.reduce((sum, d) => sum + d.trustScore, 0) / totalScans,
        )
      : 0;
  const recentAlerts = recentDetections.filter(
    (d) => d.status === 'deepfake' || d.status === 'suspected',
  ).length;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Welcome header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-100">
          Welcome back, {user?.name ?? 'User'}
        </h1>
        <p className="text-slate-400 mt-1">
          Upload media to scan for deepfakes and manipulations.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<ScanLine className="w-5 h-5" />}
          label="Total Scans"
          value={totalScans}
          subtitle="From recent history"
          accentColor="text-indigo-400"
        />
        <StatCard
          icon={<BarChart3 className="w-5 h-5" />}
          label="Avg Trust Score"
          value={totalScans > 0 ? `${avgTrustScore}%` : '--'}
          subtitle="Across all scans"
          accentColor="text-emerald-400"
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Recent Alerts"
          value={recentAlerts}
          subtitle="Suspected or deepfake"
          accentColor="text-amber-400"
        />
      </div>

      {/* Upload section */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-indigo-500/10">
            <UploadIcon className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Upload Media</h2>
            <p className="text-sm text-slate-500">
              Drag a file or click to browse
            </p>
          </div>
        </div>

        {uploading ? (
          <div className="py-4">
            <AnalysisProgress currentStep={analysisStep} isComplete={analysisStep >= 4} />
            <p className="text-center text-sm text-slate-400 mt-2">
              Analyzing your media for signs of manipulation...
            </p>
          </div>
        ) : (
          <FileUploader onUpload={handleUpload} isUploading={uploading} />
        )}
      </div>

      {/* Recent detections table */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-indigo-500/10">
            <History className="w-5 h-5 text-indigo-400" />
          </div>
          <h2 className="text-xl font-semibold text-slate-100">Recent Detections</h2>
        </div>

        {loadingHistory ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-slate-800/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : recentDetections.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No detections yet</p>
            <p className="text-sm text-slate-500 mt-1">
              Upload a file above to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    File Name
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Trust Score
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {recentDetections.map((detection) => (
                  <tr
                    key={detection.id}
                    className="hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <span className="text-slate-200 font-medium text-sm truncate max-w-[200px] inline-block">
                        {detection.fileName}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${getFileTypeBadgeClasses(detection.fileType)}`}
                      >
                        {detection.fileType}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-semibold text-sm ${getTrustScoreColor(detection.trustScore)}`}>
                        {detection.trustScore}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${getStatusBadgeClasses(detection.status)}`}
                      >
                        {detection.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-400">
                      {formatDate(detection.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => navigate(`/detection/${detection.id}`)}
                        className="inline-flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
