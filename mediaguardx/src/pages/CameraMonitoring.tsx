import { useState } from 'react';
import Card from '../components/Card';
import TrustScoreGauge from '../components/TrustScoreGauge';
import StatusBadge from '../components/StatusBadge';
import { Camera, Video, Square, AlertCircle } from 'lucide-react';
import LiveCameraDetector from '../components/LiveCameraDetector';

export default function CameraMonitoring() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [trustScore] = useState(85); // Mock trust score

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-200 mb-2">Live Camera Monitoring</h1>
        <p className="text-gray-400">Real-time deepfake detection from camera feed</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Camera View */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-200">Camera Feed</h2>
            <button
              onClick={() => setIsMonitoring(!isMonitoring)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                isMonitoring
                  ? 'bg-red-600 hover:bg-red-500'
                  : 'bg-primary-600 hover:bg-primary-500'
              }`}
            >
              {isMonitoring ? (
                <>
                  <Square className="w-4 h-4" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Video className="w-4 h-4" />
                  <span>Start Monitoring</span>
                </>
              )}
            </button>
          </div>
            <div className="">
              <LiveCameraDetector onAlert={(msg) => alert(msg)} />
            </div>
        </Card>

        {/* Trust Score */}
        <Card>
          <h2 className="text-xl font-semibold text-gray-200 mb-4">Live Trust Score</h2>
          <div className="flex flex-col items-center space-y-6">
            <TrustScoreGauge score={trustScore} size={200} />
            <StatusBadge
              status={trustScore >= 80 ? 'authentic' : trustScore >= 50 ? 'suspected' : 'deepfake'}
              size="lg"
            />
            {isMonitoring && (
              <div className="w-full p-4 bg-dark-800/50 rounded-lg">
                <div className="flex items-center space-x-2 text-amber-400 mb-2">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Monitoring Active</span>
                </div>
                <p className="text-xs text-gray-400">
                  Analyzing frames in real-time...
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="bg-primary-600/10 border-primary-600/30">
        <div className="flex items-start space-x-4">
          <AlertCircle className="w-6 h-6 text-primary-400 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-primary-400 mb-2">
              Live Monitoring Information
            </h3>
            <p className="text-gray-300 mb-2">
              This feature analyzes video frames in real-time to detect potential deepfakes.
            </p>
            <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
              <li>Frames are analyzed at 1 FPS for performance</li>
              <li>Trust score updates in real-time</li>
              <li>Alerts are shown when suspicious content is detected</li>
              <li>All analysis data can be exported for review</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}

