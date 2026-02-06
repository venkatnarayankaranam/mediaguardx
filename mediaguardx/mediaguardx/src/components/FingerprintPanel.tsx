import type { DetectionResult } from '../types';

interface Props { detection: DetectionResult }

export default function FingerprintPanel({ detection }: Props) {
  const f = detection.fingerprint;
  return (
    <div className="glass rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-200 mb-4">Deepfake Fingerprint</h3>
      <div className="bg-dark-900 p-4 rounded-lg text-sm text-gray-400">
        {f ? (
          <>
            <div>Possible Source: <span className="text-gray-200">{f.source || 'Unknown'}</span></div>
            <div>Probability: <span className="text-gray-200">{f.probability || 0}%</span></div>
          </>
        ) : (
          <div>No fingerprint data available for this detection.</div>
        )}
      </div>
    </div>
  );
}
