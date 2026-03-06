import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Loader2,
  AlertTriangle,
  Fingerprint,
  FileSearch,
  Mic,
  HardDrive,
  ShieldAlert,
  Image as ImageIcon,
  Activity,
  Heart,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { getDetectionResult, generateReport, submitFeedback } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import TrustScoreGauge from '@/components/TrustScoreGauge';
import MediaPreview from '@/components/MediaPreview';
import AnomalyCard from '@/components/AnomalyCard';
import type { DetectionResult } from '@/types';

type TabId = 'anomalies' | 'metadata' | 'audio' | 'fingerprint' | 'compression' | 'emotion' | 'sync';

interface TabDefinition {
  id: TabId;
  label: string;
  icon: React.ElementType;
  visible: boolean;
}

const STATUS_BADGE_VARIANT: Record<DetectionResult['status'], 'success' | 'warning' | 'danger'> = {
  authentic: 'success',
  suspected: 'warning',
  deepfake: 'danger',
};

const STATUS_LABELS: Record<DetectionResult['status'], string> = {
  authentic: 'Authentic',
  suspected: 'Suspected',
  deepfake: 'Deepfake',
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// --- Loading skeleton ---

function ResultSkeleton() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      <Skeleton className="h-8 w-48" variant="text" />
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-72" variant="text" />
          <Skeleton className="h-4 w-48" variant="text" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Skeleton className="aspect-video" />
        <Skeleton className="h-64" />
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}

// --- Tab content panels ---

function AnomaliesPanel({ detection }: { detection: DetectionResult }) {
  if (detection.anomalies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ShieldAlert className="w-12 h-12 text-slate-600 mb-3" />
        <p className="text-slate-400">No anomalies detected</p>
        <p className="text-sm text-slate-500 mt-1">
          This media passed all analysis checks.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {detection.anomalies.map((anomaly, index) => (
        <AnomalyCard key={`${anomaly.type}-${index}`} anomaly={anomaly} />
      ))}
    </div>
  );
}

function MetadataPanel({ detection }: { detection: DetectionResult }) {
  const analysis = detection.metadataAnalysis;

  if (!analysis) {
    return <EmptyTabState message="No metadata analysis available for this media." />;
  }

  const entries: Array<{ label: string; value: string }> = [
    { label: 'Missing Camera Info', value: analysis.missingCamera ? 'Yes' : 'No' },
    { label: 'Irregular Timestamps', value: analysis.irregularTimestamps ? 'Yes' : 'No' },
    { label: 'Suspicious Compression', value: analysis.suspiciousCompression ? 'Yes' : 'No' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {entries.map((entry) => (
          <div
            key={entry.label}
            className="flex items-center justify-between py-2 border-b border-slate-800/60 last:border-0"
          >
            <span className="text-sm text-slate-400">{entry.label}</span>
            <span className="text-sm font-medium text-slate-200">{entry.value}</span>
          </div>
        ))}
      </div>

      {analysis.details && analysis.details.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Details
          </h4>
          <ul className="space-y-1.5">
            {analysis.details.map((detail, index) => (
              <li key={index} className="text-sm text-slate-300 flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                {detail}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function AudioPanel({ detection }: { detection: DetectionResult }) {
  const analysis = detection.audioAnalysis;

  if (!analysis) {
    return <EmptyTabState message="No audio analysis available for this media." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
        <span className="text-sm text-slate-400">Voice Cloning Detected</span>
        <Badge variant={analysis.cloned ? 'danger' : 'success'}>
          {analysis.cloned ? 'Yes' : 'No'}
        </Badge>
      </div>

      {analysis.score !== undefined && (
        <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
          <span className="text-sm text-slate-400">Clone Likelihood</span>
          <span className="text-sm font-medium text-slate-200">
            {analysis.score > 1
              ? Math.round(analysis.score)
              : Math.round(analysis.score * 100)}%
          </span>
        </div>
      )}

      {analysis.details && analysis.details.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Details
          </h4>
          <ul className="space-y-1.5">
            {analysis.details.map((detail, index) => (
              <li key={index} className="text-sm text-slate-300 flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                {detail}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function FingerprintPanel({ detection }: { detection: DetectionResult }) {
  const fingerprint = detection.fingerprint;

  if (!fingerprint) {
    return <EmptyTabState message="No fingerprint data available for this media." />;
  }

  return (
    <div className="space-y-4">
      {fingerprint.source && (
        <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
          <span className="text-sm text-slate-400">Suspected Source</span>
          <span className="text-sm font-medium text-slate-200">{fingerprint.source}</span>
        </div>
      )}

      {fingerprint.probability !== undefined && (
        <div>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-slate-400">Match Probability</span>
            <span className="font-medium text-slate-200">
              {fingerprint.probability > 1
                ? Math.round(fingerprint.probability)
                : Math.round(fingerprint.probability * 100)}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-800">
            <div
              className="h-2 rounded-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${Math.min(100, fingerprint.probability > 1 ? fingerprint.probability : fingerprint.probability * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function CompressionPanel({ detection }: { detection: DetectionResult }) {
  const info = detection.compressionInfo;

  if (!info) {
    return <EmptyTabState message="No compression data available for this media." />;
  }

  return (
    <div className="space-y-4">
      {info.platform && (
        <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
          <span className="text-sm text-slate-400">Platform</span>
          <span className="text-sm font-medium text-slate-200">{info.platform}</span>
        </div>
      )}

      {info.compressionRatio !== undefined && (
        <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
          <span className="text-sm text-slate-400">Compression Ratio</span>
          <span className="text-sm font-medium text-slate-200">
            {info.compressionRatio.toFixed(2)}
          </span>
        </div>
      )}

      {info.evidence && info.evidence.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Evidence
          </h4>
          <ul className="space-y-1.5">
            {info.evidence.map((item, index) => (
              <li key={index} className="text-sm text-slate-300 flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function EmotionPanel({ detection }: { detection: DetectionResult }) {
  const analysis = detection.emotionMismatch;

  if (!analysis) {
    return <EmptyTabState message="No emotion mismatch analysis available for this media." />;
  }

  const score = analysis.score !== undefined
    ? (analysis.score > 1 ? analysis.score : analysis.score * 100)
    : undefined;
  const isMismatch = score !== undefined && score >= 50;

  return (
    <div className="space-y-4">
      {analysis.faceEmotion && (
        <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
          <span className="text-sm text-slate-400">Face Emotion</span>
          <span className="text-sm font-medium text-slate-200 capitalize">{analysis.faceEmotion}</span>
        </div>
      )}

      {analysis.audioEmotion && (
        <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
          <span className="text-sm text-slate-400">Audio Emotion</span>
          <span className="text-sm font-medium text-slate-200 capitalize">{analysis.audioEmotion}</span>
        </div>
      )}

      {score !== undefined && (
        <div>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-slate-400">Mismatch Score</span>
            <span className="font-medium text-slate-200">{Math.round(score)}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-800">
            <div
              className="h-2 rounded-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${Math.min(100, score)}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
        <span className="text-sm text-slate-400">Result</span>
        <Badge variant={isMismatch ? 'danger' : 'success'}>
          {isMismatch ? 'Mismatch' : 'Consistent'}
        </Badge>
      </div>
    </div>
  );
}

function SyncPanel({ detection }: { detection: DetectionResult }) {
  const analysis = detection.syncAnalysis;

  if (!analysis) {
    return <EmptyTabState message="No lip-sync analysis available for this media." />;
  }

  const score = analysis.mismatchScore !== undefined
    ? (analysis.mismatchScore > 1 ? analysis.mismatchScore : analysis.mismatchScore * 100)
    : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
        <span className="text-sm text-slate-400">Lip Sync Mismatch</span>
        <Badge variant={analysis.lipSyncMismatch ? 'danger' : 'success'}>
          {analysis.lipSyncMismatch ? 'Yes' : 'No'}
        </Badge>
      </div>

      {score !== undefined && (
        <div>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-slate-400">Mismatch Score</span>
            <span className="font-medium text-slate-200">{Math.round(score)}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-800">
            <div
              className="h-2 rounded-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${Math.min(100, score)}%` }}
            />
          </div>
        </div>
      )}

      {analysis.details && analysis.details.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Details
          </h4>
          <ul className="space-y-1.5">
            {analysis.details.map((detail, index) => (
              <li key={index} className="text-sm text-slate-300 flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                {detail}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function EmptyTabState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <FileSearch className="w-10 h-10 text-slate-600 mb-3" />
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  );
}

// --- Main page component ---

export default function DetectionResultPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('anomalies');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<string | null>(null);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function fetchDetection() {
      try {
        const result = await getDetectionResult(id!);
        if (!cancelled) {
          setDetection(result);
        }
      } catch {
        if (!cancelled) {
          toast.error('Failed to load detection result.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchDetection();
    return () => { cancelled = true; };
  }, [id]);

  async function handleGenerateReport() {
    if (!id) return;

    setGeneratingReport(true);
    try {
      const report = await generateReport(id);
      toast.success('Report generated — downloading PDF...');

      // Download the PDF via the authenticated API client (no token in URL)
      if (report.pdfUrl && report.pdfUrl !== '#') {
        try {
          const { default: apiClient } = await import('@/services/api');
          const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
          const baseUrl = apiBase.replace('/api', '');
          const fullUrl = report.pdfUrl.startsWith('http')
            ? report.pdfUrl
            : `${baseUrl}${report.pdfUrl}`;

          const pdfResponse = await apiClient.get(fullUrl, { responseType: 'blob' });
          const blob = new Blob([pdfResponse.data], { type: 'application/pdf' });
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = `MediaGuardX_Report_${id}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
        } catch {
          toast.error('Failed to download PDF.');
        }
      }
    } catch {
      toast.error('Failed to generate report.');
    } finally {
      setGeneratingReport(false);
    }
  }

  async function handleFeedback(label: 'real' | 'fake') {
    if (!id || submittingFeedback) return;
    setSubmittingFeedback(true);
    try {
      await submitFeedback(id, label);
      setFeedbackSubmitted(label);
      toast.success(`Feedback submitted: marked as ${label}`);
    } catch {
      toast.error('Failed to submit feedback.');
    } finally {
      setSubmittingFeedback(false);
    }
  }

  if (loading) {
    return <ResultSkeleton />;
  }

  if (!detection) {
    return (
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="w-12 h-12 text-slate-600 mb-4" />
        <p className="text-lg text-slate-400">Detection result not found</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-4 btn-ghost text-sm flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
      </div>
    );
  }

  const showAudioTab = detection.fileType === 'video' || detection.fileType === 'audio';

  const tabs: TabDefinition[] = [
    { id: 'anomalies', label: 'Anomalies', icon: ShieldAlert, visible: true },
    { id: 'metadata', label: 'Metadata', icon: FileSearch, visible: true },
    { id: 'audio', label: 'Audio', icon: Mic, visible: showAudioTab },
    { id: 'fingerprint', label: 'Fingerprint', icon: Fingerprint, visible: true },
    { id: 'compression', label: 'Compression', icon: HardDrive, visible: true },
    { id: 'emotion', label: 'Emotion', icon: Heart, visible: detection.fileType === 'video' },
    { id: 'sync', label: 'Lip-Sync', icon: Activity, visible: detection.fileType === 'video' },
  ];

  const visibleTabs = tabs.filter((tab) => tab.visible);

  function renderTabContent(): React.ReactNode {
    switch (activeTab) {
      case 'anomalies':
        return <AnomaliesPanel detection={detection!} />;
      case 'metadata':
        return <MetadataPanel detection={detection!} />;
      case 'audio':
        return <AudioPanel detection={detection!} />;
      case 'fingerprint':
        return <FingerprintPanel detection={detection!} />;
      case 'compression':
        return <CompressionPanel detection={detection!} />;
      case 'emotion':
        return <EmotionPanel detection={detection!} />;
      case 'sync':
        return <SyncPanel detection={detection!} />;
      default:
        return null;
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Back button */}
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-slate-400 hover:text-indigo-400 transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-100">
              {detection.fileName}
            </h1>
            <Badge variant={STATUS_BADGE_VARIANT[detection.status]}>
              {STATUS_LABELS[detection.status]}
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            {formatDate(detection.createdAt)}
          </p>
        </div>

        <button
          onClick={handleGenerateReport}
          disabled={generatingReport}
          className="btn-primary flex items-center gap-2 shrink-0"
        >
          {generatingReport ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Generate Report
            </>
          )}
        </button>
      </div>

      {/* Two-column layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left column: Media Preview + Trust Score */}
        <div className="space-y-6">
          <MediaPreview
            url={detection.fileUrl}
            type={detection.fileType}
            fileName={detection.fileName}
            thumbnailUrl={detection.thumbnailUrl}
          />

          <div className="card flex justify-center py-8">
            <TrustScoreGauge score={detection.trustScore} size={220} />
          </div>

          {/* Score Breakdown — shows individual analyzer contributions */}
          {detection.scoreBreakdown && Object.keys(detection.scoreBreakdown).length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Score Breakdown</h3>
              <div className="space-y-2.5">
                {Object.entries(detection.scoreBreakdown)
                  .sort(([, a], [, b]) => b.weight - a.weight)
                  .map(([name, { score, weight }]) => {
                    const label = {
                      ml_model: 'ML Model (EfficientNet-B0)',
                      sightengine: 'Sightengine API',
                      metadata: 'Metadata Analysis',
                      fingerprint: 'Fingerprint',
                      compression: 'Compression',
                      audio: 'Audio Analysis',
                      emotion: 'Emotion Mismatch',
                      sync: 'Lip-Sync',
                    }[name] || name;
                    const barColor = score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500';
                    return (
                      <div key={name}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-400">{label} <span className="text-slate-600">({weight}%)</span></span>
                          <span className={`font-semibold ${score >= 70 ? 'text-emerald-400' : score >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                            {score.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-800">
                          <div className={`h-1.5 rounded-full ${barColor} transition-all duration-500`} style={{ width: `${Math.min(100, score)}%` }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Feedback Buttons — help improve model accuracy */}
          <div className="card p-4">
            <p className="text-sm text-slate-400 mb-3">Is this classification correct? Your feedback helps improve the model.</p>
            {feedbackSubmitted ? (
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <ThumbsUp className="w-4 h-4" />
                Feedback submitted: marked as <span className="font-medium capitalize">{feedbackSubmitted}</span>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => handleFeedback('real')}
                  disabled={submittingFeedback}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                >
                  <ThumbsUp className="w-4 h-4" />
                  Authentic (Real)
                </button>
                <button
                  onClick={() => handleFeedback('fake')}
                  disabled={submittingFeedback}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                >
                  <ThumbsDown className="w-4 h-4" />
                  Deepfake (Fake)
                </button>
              </div>
            )}
          </div>

          {/* Heatmap display with side-by-side annotations + color legend */}
          {detection.heatmapUrl && (
            <div className="card overflow-hidden">
              <div className="flex items-center gap-2 mb-4">
                <ImageIcon className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-semibold text-slate-200">
                  XAI Heatmap Analysis
                </h3>
              </div>

              {/* Side-by-side: Heatmap Image + Region Annotations */}
              <div className={`grid gap-4 ${detection.xaiRegions && detection.xaiRegions.length > 0 ? 'grid-cols-1 md:grid-cols-[1fr_280px]' : 'grid-cols-1'}`}>
                {/* Left: Heatmap Image */}
                <div className="relative bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-center overflow-hidden min-h-[200px]">
                  <img
                    src={detection.heatmapUrl}
                    alt="Heatmap analysis overlay"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>

                {/* Right: Region Annotations (why each area is highlighted) */}
                {detection.xaiRegions && detection.xaiRegions.length > 0 && (
                  <div className="space-y-2 overflow-y-auto max-h-[360px]">
                    <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Flagged Regions
                    </h4>
                    {detection.xaiRegions.map((region: { region: string; confidence: number; description?: string; reason?: string }, idx: number) => {
                      const severity = region.confidence >= 0.7 ? 'high' : region.confidence >= 0.4 ? 'medium' : 'low';
                      const severityColors = {
                        high: { dot: 'bg-red-400', badge: 'bg-red-500/20 text-red-300 border-red-500/30', border: 'border-red-500/30' },
                        medium: { dot: 'bg-amber-400', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30', border: 'border-amber-500/30' },
                        low: { dot: 'bg-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', border: 'border-emerald-500/30' },
                      };
                      const colors = severityColors[severity];

                      return (
                        <div key={idx} className={`p-3 bg-slate-800/60 rounded-lg border ${colors.border}`}>
                          {/* Region header: name + confidence */}
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colors.dot}`} />
                              <span className="text-sm font-semibold text-slate-100">{region.region}</span>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colors.badge}`}>
                              {(region.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                          {/* Reason: WHY this area is flagged */}
                          <p className="text-xs text-slate-300 leading-relaxed pl-[18px]">
                            {region.reason || region.description || 'Statistical anomaly detected by neural network analysis'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Color Legend — explains what heatmap colors mean */}
              <div className="mt-4 p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
                  Heatmap Color Guide
                </h4>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-3 rounded-sm" style={{ background: 'linear-gradient(90deg, #d00000, #ff3333)' }} />
                    <span className="text-xs text-slate-300">
                      <span className="font-medium text-red-300">Red</span> — High manipulation probability
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-3 rounded-sm" style={{ background: 'linear-gradient(90deg, #ff8800, #ffcc00)' }} />
                    <span className="text-xs text-slate-300">
                      <span className="font-medium text-amber-300">Yellow/Orange</span> — Moderate suspicion
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-3 rounded-sm" style={{ background: 'linear-gradient(90deg, #00cc66, #33ff99)' }} />
                    <span className="text-xs text-slate-300">
                      <span className="font-medium text-emerald-300">Green</span> — Low suspicion
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-3 rounded-sm" style={{ background: 'linear-gradient(90deg, #0044cc, #3366ff)' }} />
                    <span className="text-xs text-slate-300">
                      <span className="font-medium text-blue-300">Blue</span> — Likely authentic region
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  The heatmap is generated using Grad-CAM (Gradient-weighted Class Activation Mapping).
                  It visualizes which regions of the image the EfficientNet-B0 model focused on when assessing
                  manipulation probability. Brighter/warmer colors indicate areas where the model detected stronger
                  evidence of potential manipulation or AI generation.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right column: Tabbed analysis panels */}
        <div className="card flex flex-col min-h-0">
          {/* Tab bar */}
          <div className="flex flex-wrap gap-1 border-b border-slate-800/60 -mx-6 px-6">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="flex-1 pt-5 overflow-y-auto">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
