import type { DetectionResult } from '../types';

interface Props { detection: DetectionResult }

export default function EmotionMismatchPanel({ detection }: Props) {
  const e = detection.emotionMismatch;

  return (
    <div className="glass rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-200 mb-4">Emotion Mismatch</h3>
      <div className="bg-dark-900 p-4 rounded-lg text-sm text-gray-400">
        {e ? (
          <>
            <div>Face Emotion: <span className="text-gray-200">{e.faceEmotion}</span></div>
            <div>Audio Emotion: <span className="text-gray-200">{e.audioEmotion}</span></div>
            <div>Mismatch Score: <span className="text-gray-200">{e.score || 0}%</span></div>
          </>
        ) : (
          <div>No emotion mismatch data available.</div>
        )}
      </div>
    </div>
  );
}
