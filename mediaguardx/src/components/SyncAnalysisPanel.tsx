import type { DetectionResult } from '../types';

interface Props { detection: DetectionResult }

export default function SyncAnalysisPanel({ detection }: Props) {
  const s = detection.syncAnalysis;

  return (
    <div className="glass rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-200 mb-4">Voice–Face Synchronization</h3>
      <div className="bg-dark-900 p-4 rounded-lg text-sm text-gray-400">
        {s ? (
          <>
            <div>Lip-sync mismatch: <span className="text-gray-200">{s.lipSyncMismatch ? 'Yes' : 'No'}</span></div>
            <div>Mismatch Score: <span className="text-gray-200">{s.mismatchScore || 0}%</span></div>
            {s.details && s.details.length > 0 && (
              <ul className="mt-2 list-disc list-inside text-xs text-gray-500">
                {s.details.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            )}
          </>
        ) : (
          <div>No synchronization analysis available.</div>
        )}
      </div>
    </div>
  );
}
