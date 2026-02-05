import { useState } from 'react';
import Card from '../components/Card';
import TrustScoreGauge from '../components/TrustScoreGauge';
import StatusBadge from '../components/StatusBadge';
import { AlertCircle } from 'lucide-react';
import LiveCameraDetector from '../components/LiveCameraDetector';

export default function CameraMonitoring() {
  const [trustScore, setTrustScore] = useState(50);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const handleAlert = (msg: string) => {
    setAlertMessage(msg);
    // Extract trust score from alert message if present
    const match = msg.match(/trust score: ([\d.]+)%/);
    if (match) {
      setTrustScore(parseFloat(match[1]));
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-200 mb-2">Live Camera Monitoring</h1>
        <p className="text-gray-400">Real-time deepfake detection from camera feed</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Camera View */}
        <Card className="lg:col-span-2">
          <LiveCameraDetector onAlert={handleAlert} />
        </Card>

        {/* Trust Score */}
        <Card>
          <h2 className="text-xl font-semibold text-gray-200 mb-4">Live Trust Score</h2>
          <div className="flex flex-col items-center space-y-6">
            <TrustScoreGauge score={trustScore} size={200} />
            <StatusBadge
              status={trustScore >= 70 ? 'authentic' : trustScore >= 40 ? 'suspected' : 'deepfake'}
              size="lg"
            />
            {alertMessage && (
              <div className="w-full p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-center space-x-2 text-red-400 mb-2">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Alert</span>
                </div>
                <p className="text-xs text-gray-400">{alertMessage}</p>
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
              <li>Frames are captured at 1 FPS and sent via WebSocket to the backend</li>
              <li>Each frame is analyzed by the EfficientNet-B0 model</li>
              <li>Trust score updates in real-time</li>
              <li>Alerts are shown when suspicious content is detected</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
