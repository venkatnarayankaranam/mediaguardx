import { AlertTriangle } from 'lucide-react';
import type { Anomaly } from '../types';

interface AnomalyListProps {
  anomalies: Anomaly[];
}

export default function AnomalyList({ anomalies }: AnomalyListProps) {
  if (anomalies.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>No anomalies detected</p>
      </div>
    );
  }

  const severityColors = {
    low: 'text-amber-400',
    medium: 'text-orange-400',
    high: 'text-red-400',
  };

  const severityBg = {
    low: 'bg-amber-500/10 border-amber-500/20',
    medium: 'bg-orange-500/10 border-orange-500/20',
    high: 'bg-red-500/10 border-red-500/20',
  };

  const typeLabels = {
    face_blending: 'Face Blending',
    texture_artifacts: 'Texture Artifacts',
    lighting_inconsistency: 'Lighting Inconsistency',
    audio_sync_mismatch: 'Audio Sync Mismatch',
    metadata_tampering: 'Metadata Tampering',
  };

  return (
    <div className="space-y-3">
      {anomalies.map((anomaly, index) => (
        <div
          key={index}
          className={`border rounded-lg p-4 ${severityBg[anomaly.severity]}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <AlertTriangle
                className={`w-5 h-5 mt-0.5 ${severityColors[anomaly.severity]}`}
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-medium text-gray-200">
                    {typeLabels[anomaly.type]}
                  </h4>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border ${severityColors[anomaly.severity]} border-current/30`}
                  >
                    {anomaly.severity.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-gray-400">{anomaly.description}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Confidence: {anomaly.confidence}%
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

