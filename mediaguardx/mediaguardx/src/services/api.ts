import axios from 'axios';
import type { DetectionResult, Report } from '../types';
import { useAuthStore } from '../store/authStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear auth and redirect to login
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth functions
export const login = async (email: string, password: string) => {
  const response = await api.post('/auth/login', { email, password });
  const data = response.data;
  return {
    token: data.access_token,
    user: {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name || data.user.email,
      role: data.user.role,
    },
  };
};

export const register = async (email: string, password: string, name: string) => {
  const response = await api.post('/auth/register', { email, password, name });
  const data = response.data;
  return {
    token: data.access_token,
    user: {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name || name,
      role: data.user.role,
    },
  };
};

// Media upload function
export const uploadMedia = async (file: File, _url?: string): Promise<{ detectionId: string }> => {
  // Determine media type from file
  let endpoint = '/detect/image';
  if (file.type.startsWith('video/')) {
    endpoint = '/detect/video';
  } else if (file.type.startsWith('audio/')) {
    endpoint = '/detect/audio';
  }
  
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post(endpoint, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return { detectionId: response.data.detectionId };
};

// Map backend label to frontend status
const mapLabelToStatus = (label: string): 'authentic' | 'suspected' | 'deepfake' => {
  if (label === 'Authentic') return 'authentic';
  if (label === 'Suspicious') return 'suspected';
  return 'deepfake';
};

// Map backend mediaType to frontend fileType
const mapMediaType = (mediaType: string): 'image' | 'video' | 'audio' => {
  if (mediaType === 'video') return 'video';
  if (mediaType === 'audio') return 'audio';
  return 'image';
};

// Get detection result
export const getDetectionResult = async (detectionId: string): Promise<DetectionResult> => {
  const response = await api.get(`/detect/${detectionId}`);
  const data = response.data;

  // Ensure URLs are absolute
  const apiBaseUrl = API_BASE_URL.replace('/api', '');
  let fileUrl = data.fileUrl;
  let heatmapUrl = data.heatmapUrl;

  if (fileUrl && !fileUrl.startsWith('http')) {
    fileUrl = `${apiBaseUrl}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
  }

  if (heatmapUrl && !heatmapUrl.startsWith('http')) {
    heatmapUrl = `${apiBaseUrl}${heatmapUrl.startsWith('/') ? '' : '/'}${heatmapUrl}`;
  }

  // Transform anomalies to frontend format
  const anomalies = (data.anomalies || []).map((a: { type: string; severity: string; description: string; confidence: number }) => ({
    type: a.type || 'general',
    severity: a.severity || 'medium',
    description: a.description || 'Unknown anomaly',
    confidence: a.confidence || 50,
  }));

  // Transform audio analysis
  const audioAnalysis = data.audioAnalysis ? {
    cloned: data.audioAnalysis.voiceAuthenticity?.score < 70,
    score: data.audioAnalysis.voiceAuthenticity?.score || 0,
    details: [
      `Fundamental Frequency: ${data.audioAnalysis.spectralAnalysis?.fundamentalFrequency?.toFixed(2) || 'N/A'} Hz`,
      `Pitch Confidence: ${((data.audioAnalysis.pitchAnalysis?.pitchConfidence || 0) * 100).toFixed(0)}%`,
      `Voice Naturalness: ${((data.audioAnalysis.voiceAuthenticity?.naturalness || 0) * 100).toFixed(0)}%`,
      `Formant Stability: ${((data.audioAnalysis.formantAnalysis?.formantStability || 0) * 100).toFixed(0)}%`,
      ...(data.audioAnalysis.anomalies || []).map((a: { type: string; timestamp: number; severity: string }) =>
        `${a.type} at ${a.timestamp}s (${a.severity})`
      ),
    ],
  } : undefined;

  // Transform metadata analysis
  const metadataAnalysis = data.metadataAnalysis ? {
    missingCamera: data.metadataAnalysis.exifData?.make === 'Unknown',
    irregularTimestamps: !data.metadataAnalysis.timestamps?.isConsistent,
    suspiciousCompression: data.metadataAnalysis.editHistory?.suspiciousEdits > 0,
    details: [
      `Camera: ${data.metadataAnalysis.exifData?.make || 'Unknown'} ${data.metadataAnalysis.exifData?.model || ''}`,
      `Software: ${data.metadataAnalysis.exifData?.software || 'Unknown'}`,
      `Resolution: ${data.metadataAnalysis.exifData?.imageWidth || 0}x${data.metadataAnalysis.exifData?.imageHeight || 0}`,
      `Edit Count: ${data.metadataAnalysis.editHistory?.editCount || 0}`,
      `Integrity Score: ${data.metadataAnalysis.integrityScore || 0}%`,
      data.metadataAnalysis.gpsData?.hasLocation ? `GPS: ${data.metadataAnalysis.gpsData.latitude?.toFixed(4)}, ${data.metadataAnalysis.gpsData.longitude?.toFixed(4)}` : 'No GPS data',
    ],
  } : undefined;

  // Transform fingerprint
  const fingerprint = data.fingerprint ? {
    source: data.fingerprint.modelSignature?.model || 'Unknown',
    probability: (data.fingerprint.modelSignature?.confidence || 0) * 100,
  } : undefined;

  // Transform compression info
  const compressionInfo = data.compressionInfo ? {
    platform: data.compressionInfo.socialMediaSignatures?.platform || 'Unknown',
    compressionRatio: data.compressionInfo.qualityScore || 0,
    evidence: [
      `Format: ${data.compressionInfo.format || 'Unknown'}`,
      `Quality Score: ${data.compressionInfo.qualityScore || 0}%`,
      `Compression Level: ${data.compressionInfo.compressionLevel || 'Unknown'}`,
      `Recompression Count: ${data.compressionInfo.estimatedRecompression || 0}`,
      data.compressionInfo.socialMediaSignatures?.detected ?
        `Platform: ${data.compressionInfo.socialMediaSignatures.platform} (${((data.compressionInfo.socialMediaSignatures.confidence || 0) * 100).toFixed(0)}% confidence)` :
        'No social media signature detected',
      `Blocking Artifacts: ${((data.compressionInfo.artifacts?.blockingArtifacts || 0) * 100).toFixed(1)}%`,
    ],
  } : undefined;

  // Transform emotion mismatch
  const emotionMismatch = data.emotionMismatch ? {
    faceEmotion: data.emotionMismatch.facialEmotion?.primary || 'Unknown',
    audioEmotion: data.emotionMismatch.audioEmotion?.primary || 'Unknown',
    score: (data.emotionMismatch.mismatchScore || 0) * 100,
  } : undefined;

  // Transform sync analysis
  const syncAnalysis = data.syncAnalysis ? {
    lipSyncMismatch: data.syncAnalysis.lipSyncScore < 80,
    mismatchScore: 100 - (data.syncAnalysis.lipSyncScore || 0),
    details: [
      `Lip Sync Score: ${data.syncAnalysis.lipSyncScore || 0}%`,
      `Audio-Video Offset: ${((data.syncAnalysis.audioVideoOffset || 0) * 1000).toFixed(1)}ms`,
      `Phoneme Accuracy: ${((data.syncAnalysis.phonemeAlignment?.accuracy || 0) * 100).toFixed(0)}%`,
      `Blink Rate: ${data.syncAnalysis.blinkAnalysis?.blinksPerMinute?.toFixed(1) || 'N/A'} per minute`,
      `Mouth Naturalness: ${((data.syncAnalysis.mouthMovement?.naturalness || 0) * 100).toFixed(0)}%`,
      `Overall Sync Score: ${data.syncAnalysis.overallSyncScore || 0}%`,
    ],
  } : undefined;

  // Transform XAI regions
  const xaiRegions = data.xaiRegions ? data.xaiRegions.map((r: { id: string; label: string; confidence: number; severity: string; x: number; y: number; width: number; height: number }) => ({
    region: r.label || 'Unknown region',
    confidence: (r.confidence || 0) * 100,
    description: `${r.severity} severity at (${r.x}, ${r.y}) - ${r.width}x${r.height}px`,
  })) : undefined;

  return {
    id: data.detectionId || data.id || detectionId,
    fileName: data.fileName || `Detection ${detectionId}`,
    fileType: mapMediaType(data.mediaType || 'image'),
    fileUrl: fileUrl,
    trustScore: data.trustScore || 0,
    status: mapLabelToStatus(data.label || 'Suspicious'),
    anomalies: anomalies,
    heatmapUrl: heatmapUrl,
    createdAt: data.createdAt || new Date().toISOString(),
    metadata: data.metadata || {},
    audioAnalysis,
    metadataAnalysis,
    fingerprint,
    compressionInfo,
    emotionMismatch,
    syncAnalysis,
    xaiRegions,
  };
};

// Generate report
export const generateReport = async (detectionId: string): Promise<Report> => {
  const response = await api.post(`/report/${detectionId}`);
  const data = response.data;
  
  return {
    id: data.report_id || data.id,
    detectionId: detectionId,
    pdfUrl: data.pdf_url || data.pdfUrl,
    createdAt: data.created_at || data.createdAt,
  };
};

export default api;

