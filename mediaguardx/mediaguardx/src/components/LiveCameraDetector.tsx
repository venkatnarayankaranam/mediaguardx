import { useEffect, useRef, useState, useCallback } from 'react';

interface Props {
  onAlert?: (message: string) => void;
}

interface FrameResult {
  frameId: string;
  timestamp: string;
  trustScore: number;
  label: string;
  status: string;
  message?: string;
}

export default function LiveCameraDetector({ onAlert }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string>('Idle');
  const [lastResult, setLastResult] = useState<FrameResult | null>(null);

  const captureAndSend = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ws = wsRef.current;

    if (!video || !canvas || !ws || ws.readyState !== WebSocket.OPEN) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 320;
    canvas.height = 240;
    ctx.drawImage(video, 0, 0, 320, 240);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    ws.send(dataUrl);
  }, []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      // Connect WebSocket
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';
      const wsUrl = apiBase.replace(/^http/, 'ws').replace('/api', '') + '/api/live/ws';

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('Connected — analyzing frames...');
        // Send a frame every second
        intervalRef.current = setInterval(captureAndSend, 1000);
      };

      ws.onmessage = (event) => {
        try {
          const result: FrameResult = JSON.parse(event.data);
          setLastResult(result);

          if (result.trustScore < 40) {
            setStatus(`Potential deepfake detected (score: ${result.trustScore}%)`);
            onAlert?.(`Potential deepfake detected — trust score: ${result.trustScore}%`);
          } else if (result.trustScore < 70) {
            setStatus(`Suspicious content (score: ${result.trustScore}%)`);
          } else {
            setStatus(`Authentic (score: ${result.trustScore}%)`);
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onerror = () => {
        setStatus('WebSocket error — retrying...');
      };

      ws.onclose = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setStatus('Disconnected');
      };

      setRunning(true);
    } catch (err) {
      console.error('Camera access denied or unavailable', err);
      setStatus('Camera unavailable');
    }
  }, [captureAndSend, onAlert]);

  const stop = useCallback(() => {
    setRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus('Idle');
    setLastResult(null);
  }, []);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  const scoreColor = lastResult
    ? lastResult.trustScore >= 70
      ? 'text-green-400'
      : lastResult.trustScore >= 40
      ? 'text-amber-400'
      : 'text-red-400'
    : 'text-gray-400';

  return (
    <div className="glass rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-200 mb-4">Live Camera Detector</h3>
      <div className="aspect-video bg-dark-900 rounded-lg border border-dark-700 overflow-hidden relative">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />
        <div className="absolute top-3 left-3 bg-black/50 text-xs text-white px-2 py-1 rounded">
          {status}
        </div>
        {lastResult && (
          <div className={`absolute top-3 right-3 bg-black/50 text-xs px-2 py-1 rounded font-bold ${scoreColor}`}>
            {lastResult.trustScore.toFixed(1)}% — {lastResult.label}
          </div>
        )}
      </div>
      <div className="mt-4 flex space-x-3">
        <button
          onClick={running ? stop : start}
          className={`px-4 py-2 rounded-lg ${running ? 'bg-red-600 hover:bg-red-500' : 'bg-primary-600 hover:bg-primary-500'}`}
        >
          {running ? 'Stop' : 'Start'}
        </button>
      </div>
    </div>
  );
}
