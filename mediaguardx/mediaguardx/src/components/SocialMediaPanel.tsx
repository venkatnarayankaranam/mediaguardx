import type { DetectionResult } from '../types';

interface Props {
  detection: DetectionResult;
}

export default function SocialMediaPanel({ detection }: Props) {
  const info = detection.compressionInfo;

  return (
    <div className="glass rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-200 mb-4">Social-Media Mode (Compression)</h3>
      <div className="bg-dark-900 p-4 rounded-lg">
        {info ? (
          <div className="text-sm text-gray-400 space-y-2">
            <div>Platform: <span className="text-gray-200">{info.platform || 'Unknown'}</span></div>
            <div>Compression Ratio: <span className="text-gray-200">{info.compressionRatio || 0}</span></div>
            {info.evidence && info.evidence.length > 0 && (
              <div>
                <div className="text-xs text-gray-500">Evidence:</div>
                <ul className="text-xs text-gray-400 list-disc list-inside">
                  {info.evidence.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No social-media compression data available. Try "Social-Media" analysis mode when uploading.</p>
        )}
      </div>
    </div>
  );
}
