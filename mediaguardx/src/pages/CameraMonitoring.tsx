import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, CameraOff, Wifi, WifiOff, SlidersHorizontal, Activity, Clock } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';

interface AnalysisResult {
  trustScore: number;
  anomalies: string[];
  timestamp: string;
}

interface FrameThumbnail {
  id: string;
  dataUrl: string;
  trustScore: number;
  timestamp: string;
}

const FRAME_RATE_OPTIONS = [
  { label: '1 FPS', value: 1 },
  { label: '2 FPS', value: 2 },
  { label: '5 FPS', value: 5 },
] as const;

function getTrustScoreVariant(score: number): 'success' | 'warning' | 'danger' {
  if (score >= 70) return 'success';
  if (score >= 40) return 'warning';
  return 'danger';
}

function getTrustScoreColor(score: number): string {
  if (score >= 70) return 'text-emerald-400';
  if (score >= 40) return 'text-amber-400';
  return 'text-red-400';
}

export default function CameraMonitoring() {
  const { session } = useAuthStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(50);
  const [frameRate, setFrameRate] = useState(1);
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [thumbnails, setThumbnails] = useState<FrameThumbnail[]>([]);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraReady(true);
    } catch (err) {
      setError('Failed to access camera. Please grant camera permissions.');
      console.error('Camera access error:', err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraReady(false);
  }, []);

  const connectWebSocket = useCallback(() => {
    if (!session?.access_token) {
      setError('No authentication token available.');
      return;
    }

    const wsUrl = `ws://localhost:8000/api/live/ws?token=${session.access_token}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const data: AnalysisResult = JSON.parse(event.data);
        setCurrentResult(data);

        if (canvasRef.current && videoRef.current) {
          const thumbnail = canvasRef.current.toDataURL('image/jpeg', 0.5);
          setThumbnails((prev) => [
            {
              id: `${Date.now()}`,
              dataUrl: thumbnail,
              trustScore: data.trustScore,
              timestamp: data.timestamp,
            },
            ...prev,
          ].slice(0, 20));
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.onerror = () => {
      setError('WebSocket connection error.');
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    wsRef.current = ws;
  }, [session?.access_token]);

  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const captureAndSendFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ws = wsRef.current;

    if (!video || !canvas || !ws || ws.readyState !== WebSocket.OPEN) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob && ws.readyState === WebSocket.OPEN) {
          ws.send(blob);
        }
      },
      'image/jpeg',
      0.8,
    );
  }, []);

  const startMonitoring = useCallback(async () => {
    await startCamera();
    connectWebSocket();
    setIsMonitoring(true);
  }, [startCamera, connectWebSocket]);

  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    disconnectWebSocket();
    stopCamera();
    setIsMonitoring(false);
    setCurrentResult(null);
  }, [disconnectWebSocket, stopCamera]);

  // Manage frame capture interval based on frameRate and monitoring state
  useEffect(() => {
    if (isMonitoring && isConnected && isCameraReady) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      const intervalMs = 1000 / frameRate;
      intervalRef.current = setInterval(captureAndSendFrame, intervalMs);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isMonitoring, isConnected, isCameraReady, frameRate, captureAndSendFrame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-200 mb-2">Live Camera Monitoring</h1>
        <p className="text-slate-400">Real-time deepfake detection from your camera feed</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Video Feed - Left Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card relative overflow-hidden rounded-xl aspect-video bg-slate-950">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />

            {!isMonitoring && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80">
                <CameraOff className="w-16 h-16 text-slate-600 mb-4" />
                <p className="text-slate-500 text-lg">Camera is off</p>
                <p className="text-slate-600 text-sm mt-1">Click Start Monitoring to begin</p>
              </div>
            )}

            {/* Trust Score Overlay */}
            {isMonitoring && currentResult && (
              <div className="absolute top-4 left-4">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/80 backdrop-blur-sm border border-slate-700/50">
                  <Activity className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-300">Trust Score:</span>
                  <Badge variant={getTrustScoreVariant(currentResult.trustScore)}>
                    {currentResult.trustScore.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            )}

            {/* Connection Status Overlay */}
            {isMonitoring && (
              <div className="absolute top-4 right-4">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/80 backdrop-blur-sm border border-slate-700/50">
                  {isConnected ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs text-emerald-400">Live</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-red-400" />
                      <span className="text-xs text-red-400">Disconnected</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Anomaly Alerts */}
            {isMonitoring && currentResult && currentResult.anomalies.length > 0 && currentResult.trustScore < confidenceThreshold && (
              <div className="absolute bottom-4 left-4 right-4">
                <div className="px-4 py-3 rounded-lg bg-red-500/15 border border-red-500/30 backdrop-blur-sm">
                  <p className="text-sm font-medium text-red-400 mb-1">Anomalies Detected</p>
                  <ul className="text-xs text-red-300 space-y-0.5">
                    {currentResult.anomalies.slice(0, 3).map((anomaly, i) => (
                      <li key={i}>{anomaly}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Controls Panel - Right Column */}
        <div className="space-y-4">
          {/* Start/Stop Button */}
          <div className="card rounded-xl p-6">
            <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5 text-indigo-400" />
              Controls
            </h2>

            <button
              onClick={isMonitoring ? stopMonitoring : startMonitoring}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                isMonitoring
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/25'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
              }`}
            >
              {isMonitoring ? (
                <>
                  <CameraOff className="w-5 h-5" />
                  Stop Monitoring
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5" />
                  Start Monitoring
                </>
              )}
            </button>
          </div>

          {/* Connection Status */}
          <div className="card rounded-xl p-6">
            <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
              {isConnected ? (
                <Wifi className="w-4 h-4 text-emerald-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-slate-500" />
              )}
              Connection Status
            </h3>
            <div className="flex items-center gap-3">
              <span
                className={`w-3 h-3 rounded-full ${
                  isConnected ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50' : 'bg-slate-600'
                }`}
              />
              <span className={`text-sm font-medium ${isConnected ? 'text-emerald-400' : 'text-slate-500'}`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          {/* Confidence Threshold */}
          <div className="card rounded-xl p-6">
            <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
              Confidence Threshold
            </h3>
            <div className="space-y-2">
              <input
                type="range"
                min={0}
                max={100}
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>0%</span>
                <span className="text-indigo-400 font-medium">{confidenceThreshold}%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          {/* Frame Rate Selector */}
          <div className="card rounded-xl p-6">
            <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              Frame Rate
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {FRAME_RATE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFrameRate(option.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    frameRate === option.value
                      ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                      : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Live Score Display */}
          {currentResult && (
            <div className="card rounded-xl p-6">
              <h3 className="text-sm font-medium text-slate-400 mb-3">Current Analysis</h3>
              <div className="text-center">
                <p className={`text-4xl font-bold ${getTrustScoreColor(currentResult.trustScore)}`}>
                  {currentResult.trustScore.toFixed(1)}%
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {new Date(currentResult.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Frame Thumbnails */}
      {thumbnails.length > 0 && (
        <div className="card rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            Recent Frame Analysis
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {thumbnails.map((thumb) => (
              <div
                key={thumb.id}
                className="flex-shrink-0 w-32 rounded-lg overflow-hidden border border-slate-700/50 bg-slate-800"
              >
                <img
                  src={thumb.dataUrl}
                  alt="Frame capture"
                  className="w-full h-20 object-cover"
                />
                <div className="p-2 text-center">
                  <p className={`text-sm font-semibold ${getTrustScoreColor(thumb.trustScore)}`}>
                    {thumb.trustScore.toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {new Date(thumb.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isMonitoring && thumbnails.length === 0 && (
        <div className="card rounded-xl p-6 bg-indigo-500/5 border-indigo-500/20">
          <div className="flex items-start gap-4">
            <Camera className="w-6 h-6 text-indigo-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-indigo-400 mb-2">How It Works</h3>
              <p className="text-slate-300 mb-3">
                This feature captures video frames and analyzes them in real-time using WebSocket
                to detect potential deepfakes.
              </p>
              <ul className="text-sm text-slate-400 space-y-1.5 list-disc list-inside">
                <li>Frames are captured at your chosen FPS and sent to the analysis server</li>
                <li>Each frame is analyzed by the EfficientNet-B0 deepfake detection model</li>
                <li>Trust score and anomalies update in real-time on the video overlay</li>
                <li>Frame thumbnails with scores are saved for review below the feed</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
