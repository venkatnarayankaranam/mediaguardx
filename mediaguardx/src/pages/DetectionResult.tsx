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
} from 'lucide-react';
import { getDetectionResult, generateReport } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import TrustScoreGauge from '@/components/TrustScoreGauge';
import MediaPreview from '@/components/MediaPreview';
import AnomalyCard from '@/components/AnomalyCard';
import type { DetectionResult } from '@/types';

type TabId = 'anomalies' | 'metadata' | 'audio' | 'fingerprint' | 'compression';

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
          <span className="text-sm text-slate-400">Confidence Score</span>
          <span className="text-sm font-medium text-slate-200">
            {Math.round(analysis.score * 100)}%
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
              {Math.round(fingerprint.probability * 100)}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-800">
            <div
              className="h-2 rounded-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${Math.round(fingerprint.probability * 100)}%` }}
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
      await generateReport(id);
      toast.success('Report generated successfully.');
    } catch {
      toast.error('Failed to generate report.');
    } finally {
      setGeneratingReport(false);
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
          />

          <div className="card flex justify-center py-8">
            <TrustScoreGauge score={detection.trustScore} size={220} />
          </div>
        </div>

        {/* Right column: Tabbed analysis panels */}
        <div className="card flex flex-col min-h-0">
          {/* Tab bar */}
          <div className="flex gap-1 border-b border-slate-800/60 -mx-6 px-6 overflow-x-auto">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
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
