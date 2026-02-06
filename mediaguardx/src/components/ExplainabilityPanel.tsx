import type { DetectionResult } from '../types';
import HeatmapDisplay from './HeatmapDisplay';

interface Props {
  detection: DetectionResult;
  heatmapUrl?: string | null;
}

export default function ExplainabilityPanel({ detection, heatmapUrl }: Props) {
  return (
    <div className="glass rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-200 mb-4">Explainable AI (XAI) Heatmap</h3>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <HeatmapDisplay imageUrl={heatmapUrl || detection.heatmapUrl} alt="XAI heatmap" />
        </div>
        <div className="space-y-3">
          <h4 className="font-medium text-gray-200">Suspicious Regions</h4>
          <div className="bg-dark-900 rounded-lg p-4">
            {detection.xaiRegions && detection.xaiRegions.length > 0 ? (
              <ul className="space-y-2 text-sm text-gray-400">
                {detection.xaiRegions.map((r, i) => (
                  <li key={i}>
                    <div className="flex items-center justify-between">
                      <span>{r.region}</span>
                      <span className="text-xs text-gray-500">{r.confidence}%</span>
                    </div>
                    {r.description && <div className="text-xs text-gray-500">{r.description}</div>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">No explainability regions available for this detection.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
