import type { DetectionResult } from '../types';
import { Music, Image, FileText } from 'lucide-react';

interface Props {
  detection: DetectionResult;
}

export default function MultiLayerPanel({ detection }: Props) {
  return (
    <div className="glass rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-200 mb-4">Multi-Layer Analysis</h3>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-dark-900 p-4 rounded-lg">
          <div className="flex items-center space-x-3 mb-2">
            <Image className="w-5 h-5 text-gray-300" />
            <h4 className="font-medium text-gray-200">Visual</h4>
          </div>
          <p className="text-sm text-gray-400">
            {detection.anomalies && detection.anomalies.length > 0
              ? `${detection.anomalies.length} visual anomalies detected`
              : 'No significant visual anomalies'}
          </p>
        </div>

        <div className="bg-dark-900 p-4 rounded-lg">
          <div className="flex items-center space-x-3 mb-2">
            <Music className="w-5 h-5 text-gray-300" />
            <h4 className="font-medium text-gray-200">Audio</h4>
          </div>
          <p className="text-sm text-gray-400">
            {detection.audioAnalysis ? (
              detection.audioAnalysis.cloned ? (
                <>
                  <strong className="text-amber-300">Voice cloning suspected</strong>
                  <div className="text-xs text-gray-400 mt-1">Score: {detection.audioAnalysis.score}%</div>
                </>
              ) : (
                <span>Audio appears consistent</span>
              )
            ) : (
              <span>No audio analysis available</span>
            )}
          </p>
        </div>

        <div className="bg-dark-900 p-4 rounded-lg">
          <div className="flex items-center space-x-3 mb-2">
            <FileText className="w-5 h-5 text-gray-300" />
            <h4 className="font-medium text-gray-200">Metadata</h4>
          </div>
          <p className="text-sm text-gray-400">
            {detection.metadataAnalysis ? (
              <>
                {detection.metadataAnalysis.missingCamera && <div>Missing camera EXIF</div>}
                {detection.metadataAnalysis.irregularTimestamps && <div>Irregular timestamps</div>}
                {detection.metadataAnalysis.suspiciousCompression && <div>Suspicious compression</div>}
              </>
            ) : (
              <span>No metadata issues found</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
