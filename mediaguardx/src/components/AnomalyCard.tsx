import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import type { Anomaly } from '@/types';

interface AnomalyCardProps {
  anomaly: Anomaly;
}

const SEVERITY_STRIPE: Record<Anomaly['severity'], string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-indigo-500',
};

const SEVERITY_BADGE_VARIANT: Record<Anomaly['severity'], 'danger' | 'warning' | 'info'> = {
  high: 'danger',
  medium: 'warning',
  low: 'info',
};

const TYPE_LABELS: Record<Anomaly['type'], string> = {
  face_blending: 'Face Blending',
  texture_artifacts: 'Texture Artifacts',
  lighting_inconsistency: 'Lighting Inconsistency',
  audio_sync_mismatch: 'Audio Sync Mismatch',
  metadata_tampering: 'Metadata Tampering',
  model_prediction: 'Model Prediction',
  general: 'General',
};

export default function AnomalyCard({ anomaly }: AnomalyCardProps) {
  const [expanded, setExpanded] = useState(false);

  const confidencePercent = Math.round(anomaly.confidence * 100);
  const stripeClass = SEVERITY_STRIPE[anomaly.severity];
  const badgeVariant = SEVERITY_BADGE_VARIANT[anomaly.severity];
  const typeLabel = TYPE_LABELS[anomaly.type] ?? anomaly.type;

  return (
    <div className="card flex overflow-hidden">
      {/* Severity color stripe */}
      <div className={`w-1 shrink-0 -my-6 -ml-6 mr-4 ${stripeClass}`} />

      <div className="flex-1 min-w-0">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <h4 className="text-sm font-semibold text-slate-200 truncate">
            {typeLabel}
          </h4>
          <Badge variant={badgeVariant} className="shrink-0">
            {anomaly.severity}
          </Badge>
        </div>

        {/* Confidence bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Confidence</span>
            <span>{confidencePercent}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-800">
            <div
              className="h-1.5 rounded-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
        </div>

        {/* Expandable details */}
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-3 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Hide details</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Show details</span>
            </>
          )}
        </button>

        {expanded && (
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            {anomaly.description}
          </p>
        )}
      </div>
    </div>
  );
}
