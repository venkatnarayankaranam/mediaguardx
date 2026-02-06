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
      // Unauthorized - clear auth state (don't redirect if already on public page)
      const currentPath = window.location.pathname;
      const publicPaths = ['/', '/login', '/register', '/forgot-password', '/dashboard'];
      if (!publicPaths.includes(currentPath)) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
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

  // Transform audio analysis - handle both real backend and simple_server formats
  let audioAnalysis: DetectionResult['audioAnalysis'] = undefined;
  if (data.audioAnalysis) {
    const aa = data.audioAnalysis;
    // Real backend returns { cloned, score, details } directly
    if ('cloned' in aa && 'score' in aa) {
      audioAnalysis = {
        cloned: aa.cloned,
        score: aa.score,
        details: aa.details || [],
      };
    }
    // simple_server format with nested objects
    else if (aa.voiceAuthenticity || aa.spectralAnalysis) {
      audioAnalysis = {
        cloned: aa.voiceAuthenticity?.score < 70,
        score: aa.voiceAuthenticity?.score || 0,
        details: [
          `Fundamental Frequency: ${aa.spectralAnalysis?.fundamentalFrequency?.toFixed(2) || 'N/A'} Hz`,
          `Pitch Confidence: ${((aa.pitchAnalysis?.pitchConfidence || 0) * 100).toFixed(0)}%`,
          `Voice Naturalness: ${((aa.voiceAuthenticity?.naturalness || 0) * 100).toFixed(0)}%`,
          `Formant Stability: ${((aa.formantAnalysis?.formantStability || 0) * 100).toFixed(0)}%`,
        ],
      };
    }
  }

  // Transform metadata analysis - handle both formats
  let metadataAnalysis: DetectionResult['metadataAnalysis'] = undefined;
  if (data.metadataAnalysis) {
    const ma = data.metadataAnalysis;
    // Real backend returns { missingCamera, irregularTimestamps, suspiciousCompression, details }
    if ('missingCamera' in ma || ('details' in ma && Array.isArray(ma.details))) {
      metadataAnalysis = {
        missingCamera: ma.missingCamera || false,
        irregularTimestamps: ma.irregularTimestamps || false,
        suspiciousCompression: ma.suspiciousCompression || false,
        details: ma.details || [],
      };
    }
    // simple_server format with nested objects
    else if (ma.exifData) {
      metadataAnalysis = {
        missingCamera: ma.exifData?.make === 'Unknown',
        irregularTimestamps: !ma.timestamps?.isConsistent,
        suspiciousCompression: ma.editHistory?.suspiciousEdits > 0,
        details: [
          `Camera: ${ma.exifData?.make || 'Unknown'} ${ma.exifData?.model || ''}`,
          `Software: ${ma.exifData?.software || 'Unknown'}`,
          `Resolution: ${ma.exifData?.imageWidth || 0}x${ma.exifData?.imageHeight || 0}`,
          `Edit Count: ${ma.editHistory?.editCount || 0}`,
          `Integrity Score: ${ma.integrityScore || 0}%`,
        ],
      };
    }
  }

  // Transform fingerprint - handle both formats
  let fingerprint: DetectionResult['fingerprint'] = undefined;
  if (data.fingerprint) {
    const fp = data.fingerprint;
    // Real backend returns { source, probability } directly
    if ('source' in fp || 'probability' in fp) {
      fingerprint = {
        source: fp.source || 'Unknown',
        probability: fp.probability || 0,
      };
    }
    // simple_server format
    else if (fp.modelSignature) {
      fingerprint = {
        source: fp.modelSignature?.model || 'Unknown',
        probability: (fp.modelSignature?.confidence || 0) * 100,
      };
    }
  }

  // Transform compression info - handle both formats
  let compressionInfo: DetectionResult['compressionInfo'] = undefined;
  if (data.compressionInfo) {
    const ci = data.compressionInfo;
    // Real backend returns { platform, compressionRatio, evidence }
    if ('evidence' in ci && Array.isArray(ci.evidence)) {
      compressionInfo = {
        platform: ci.platform || 'Unknown',
        compressionRatio: ci.compressionRatio || 0,
        evidence: ci.evidence || [],
      };
    }
    // simple_server format
    else if (ci.socialMediaSignatures) {
      compressionInfo = {
        platform: ci.socialMediaSignatures?.platform || 'Unknown',
        compressionRatio: ci.qualityScore || 0,
        evidence: [
          `Format: ${ci.format || 'Unknown'}`,
          `Quality Score: ${ci.qualityScore || 0}%`,
          `Compression Level: ${ci.compressionLevel || 'Unknown'}`,
          `Recompression Count: ${ci.estimatedRecompression || 0}`,
        ],
      };
    }
  }

  // Transform emotion mismatch - handle both formats
  let emotionMismatch: DetectionResult['emotionMismatch'] = undefined;
  if (data.emotionMismatch) {
    const em = data.emotionMismatch;
    // Real backend returns { faceEmotion, audioEmotion, score }
    if ('faceEmotion' in em && 'audioEmotion' in em) {
      emotionMismatch = {
        faceEmotion: em.faceEmotion || 'Unknown',
        audioEmotion: em.audioEmotion || 'Unknown',
        score: em.score || 0,
      };
    }
    // simple_server format
    else if (em.facialEmotion || em.audioEmotion) {
      emotionMismatch = {
        faceEmotion: em.facialEmotion?.primary || 'Unknown',
        audioEmotion: em.audioEmotion?.primary || 'Unknown',
        score: (em.mismatchScore || 0) * 100,
      };
    }
  }

  // Transform sync analysis - handle both formats
  let syncAnalysis: DetectionResult['syncAnalysis'] = undefined;
  if (data.syncAnalysis) {
    const sa = data.syncAnalysis;
    // Real backend returns { lipSyncMismatch, mismatchScore, details }
    if ('lipSyncMismatch' in sa && 'details' in sa) {
      syncAnalysis = {
        lipSyncMismatch: sa.lipSyncMismatch || false,
        mismatchScore: sa.mismatchScore || 0,
        details: sa.details || [],
      };
    }
    // simple_server format
    else if ('lipSyncScore' in sa) {
      syncAnalysis = {
        lipSyncMismatch: sa.lipSyncScore < 80,
        mismatchScore: 100 - (sa.lipSyncScore || 0),
        details: [
          `Lip Sync Score: ${sa.lipSyncScore || 0}%`,
          `Audio-Video Offset: ${((sa.audioVideoOffset || 0) * 1000).toFixed(1)}ms`,
          `Overall Sync Score: ${sa.overallSyncScore || 0}%`,
        ],
      };
    }
  }

  // Transform XAI regions - handle both formats
  let xaiRegions: DetectionResult['xaiRegions'] = undefined;
  if (data.xaiRegions && data.xaiRegions.length > 0) {
    const first = data.xaiRegions[0];
    // Real backend format: { region, confidence, description }
    if ('region' in first) {
      xaiRegions = data.xaiRegions.map((r: { region: string; confidence: number; description: string }) => ({
        region: r.region || 'Unknown region',
        confidence: r.confidence || 0,
        description: r.description || '',
      }));
    }
    // simple_server format: { label, confidence, severity, x, y, width, height }
    else if ('label' in first) {
      xaiRegions = data.xaiRegions.map((r: { label: string; confidence: number; severity: string; x: number; y: number; width: number; height: number }) => ({
        region: r.label || 'Unknown region',
        confidence: (r.confidence || 0) * 100,
        description: `${r.severity} severity at (${r.x}, ${r.y}) - ${r.width}x${r.height}px`,
      }));
    }
  }

  return {
    id: data.detectionId || data.id || detectionId,
    fileName: data.fileName || data.filename || `Detection ${detectionId}`,
    fileType: mapMediaType(data.mediaType || data.fileType || 'image'),
    fileUrl: fileUrl || '',
    trustScore: data.trustScore || 0,
    status: data.status && ['authentic', 'suspected', 'deepfake'].includes(data.status)
      ? (data.status as 'authentic' | 'suspected' | 'deepfake')
      : mapLabelToStatus(data.label || 'Suspicious'),
    anomalies: anomalies,
    heatmapUrl: heatmapUrl,
    createdAt: data.createdAt || data.created_at || new Date().toISOString(),
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

  // Build absolute PDF URL
  const apiBaseUrl = API_BASE_URL.replace('/api', '');
  let pdfUrl = data.pdfUrl || data.pdf_url;
  if (pdfUrl && !pdfUrl.startsWith('http')) {
    pdfUrl = `${apiBaseUrl}${pdfUrl.startsWith('/') ? '' : '/'}${pdfUrl}`;
  }

  return {
    id: data.id || data.report_id,
    detectionId: detectionId,
    pdfUrl: pdfUrl,
    createdAt: data.createdAt || data.created_at,
  };
};

export default api;
