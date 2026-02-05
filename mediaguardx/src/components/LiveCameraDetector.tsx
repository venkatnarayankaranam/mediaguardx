import { useEffect, useRef, useState } from 'react';

interface Props {
  onAlert?: (message: string) => void;
}

export default function LiveCameraDetector({ onAlert }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string>('Idle');

  useEffect(() => {
    let stream: MediaStream | null = null;

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setStatus('Analyzing frames...');
        // Mock detection loop
        const loop = () => {
          if (!running) return;
          // In a real implementation, extract a frame and send to model
          // Here we'll randomly trigger an alert to simulate detection
          if (Math.random() > 0.995) {
            setStatus('Potential deepfake detected');
            onAlert?.('Potential deepfake detected in live camera feed (mock)');
          }
          setTimeout(loop, 1000);
        };
        setRunning(true);
        loop();
      } catch (err) {
        console.error('Camera access denied or unavailable', err);
        setStatus('Camera unavailable');
      }
    };

    if (running && !videoRef.current?.srcObject) {
      start();
    }

    return () => {
      setRunning(false);
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [running, onAlert]);

  return (
    <div className="glass rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-200 mb-4">Live Camera Detector</h3>
      <div className="aspect-video bg-dark-900 rounded-lg border border-dark-700 overflow-hidden relative">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        <div className="absolute top-3 left-3 bg-black/30 text-xs text-white px-2 py-1 rounded">{status}</div>
      </div>
      <div className="mt-4 flex space-x-3">
        <button onClick={() => setRunning(true)} className="px-4 py-2 bg-primary-600 rounded-lg">Start</button>
        <button onClick={() => setRunning(false)} className="px-4 py-2 bg-red-600 rounded-lg">Stop</button>
      </div>
    </div>
  );
}
