import axios from 'axios';
import type { DetectionResult, Report } from '@/types';
import { supabase, isDemoMode } from '@/lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach Supabase session token to requests (only in live mode)
api.interceptors.request.use(async (config) => {
  if (!isDemoMode) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!isDemoMode && error.response?.status === 401) {
      supabase.auth.signOut();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

// ── Demo data helpers ──────────────────────────────────────────────

const DEMO_DETECTIONS_KEY = 'mediaguardx_demo_detections';

function getDemoDetections(): DetectionResult[] {
  try {
    return JSON.parse(localStorage.getItem(DEMO_DETECTIONS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveDemoDetections(detections: DetectionResult[]) {
  localStorage.setItem(DEMO_DETECTIONS_KEY, JSON.stringify(detections));
}

function randomScore(): number {
  return Math.round(Math.random() * 60 + 30); // 30–90
}

function scoreToStatus(score: number): 'authentic' | 'suspected' | 'deepfake' {
  if (score >= 70) return 'authentic';
  if (score >= 40) return 'suspected';
  return 'deepfake';
}

function buildDemoDetection(file: File): DetectionResult {
  const score = randomScore();
  const fileType: 'image' | 'video' | 'audio' = file.type.startsWith('video/')
    ? 'video'
    : file.type.startsWith('audio/')
      ? 'audio'
      : 'image';

  return {
    id: `demo-${Date.now()}`,
    fileName: file.name,
    fileType,
    fileUrl: URL.createObjectURL(file),
    trustScore: score,
    status: scoreToStatus(score),
    anomalies: score < 70
      ? [
          {
            type: 'model_prediction',
            severity: score < 40 ? 'high' : 'medium',
            description: 'AI analysis detected potential manipulation artifacts in this media.',
            confidence: parseFloat((1 - score / 100).toFixed(2)),
          },
          {
            type: 'metadata_tampering',
            severity: 'low',
            description: 'Some metadata fields are missing or inconsistent with the file format.',
            confidence: parseFloat((Math.random() * 0.4 + 0.2).toFixed(2)),
          },
        ]
      : [],
    createdAt: new Date().toISOString(),
    metadata: { fileSize: file.size },
    metadataAnalysis: {
      missingCamera: Math.random() > 0.5,
      irregularTimestamps: Math.random() > 0.6,
      suspiciousCompression: score < 50,
      details: ['EXIF data analyzed', 'File signature verified'],
    },
    fingerprint: {
      source: score < 50 ? 'StyleGAN2' : 'Unknown (likely original)',
      probability: score < 50 ? parseFloat((Math.random() * 0.4 + 0.5).toFixed(2)) : parseFloat((Math.random() * 0.2).toFixed(2)),
    },
    compressionInfo: {
      platform: Math.random() > 0.5 ? 'WhatsApp' : 'Original',
      compressionRatio: Math.round(Math.random() * 60 + 20),
      evidence: ['JPEG quantization table analyzed'],
    },
  };
}

// ── API functions ──────────────────────────────────────────────────

export const uploadMedia = async (file: File): Promise<{ detectionId: string }> => {
  if (isDemoMode) {
    // Simulate upload delay
    await new Promise((r) => setTimeout(r, 2500));
    const detection = buildDemoDetection(file);
    const detections = getDemoDetections();
    detections.unshift(detection);
    saveDemoDetections(detections);
    return { detectionId: detection.id };
  }

  let endpoint = '/detect/image';
  if (file.type.startsWith('video/')) endpoint = '/detect/video';
  else if (file.type.startsWith('audio/')) endpoint = '/detect/audio';

  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post(endpoint, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return { detectionId: response.data.detectionId };
};

export const getDetectionResult = async (detectionId: string): Promise<DetectionResult> => {
  if (isDemoMode) {
    const detections = getDemoDetections();
    const found = detections.find((d) => d.id === detectionId);
    if (!found) throw new Error('Detection not found');
    return found;
  }

  const response = await api.get(`/detect/${detectionId}`);
  const data = response.data;

  const apiBaseUrl = API_BASE_URL.replace('/api', '');
  let fileUrl = data.fileUrl;
  let heatmapUrl = data.heatmapUrl;

  if (fileUrl && !fileUrl.startsWith('http')) {
    fileUrl = `${apiBaseUrl}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
  }
  if (heatmapUrl && !heatmapUrl.startsWith('http')) {
    heatmapUrl = `${apiBaseUrl}${heatmapUrl.startsWith('/') ? '' : '/'}${heatmapUrl}`;
  }

  // Append session token to file URLs so browser <img>/<video>/<audio> elements can authenticate
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    const sep = fileUrl?.includes('?') ? '&' : '?';
    if (fileUrl) fileUrl = `${fileUrl}${sep}token=${session.access_token}`;
    if (heatmapUrl) {
      const hSep = heatmapUrl.includes('?') ? '&' : '?';
      heatmapUrl = `${heatmapUrl}${hSep}token=${session.access_token}`;
    }
  }

  return {
    id: data.id,
    fileName: data.fileName,
    fileType: data.fileType,
    fileUrl,
    trustScore: data.trustScore,
    status: data.status,
    anomalies: data.anomalies || [],
    heatmapUrl,
    createdAt: data.createdAt,
    metadata: data.metadata || {},
    audioAnalysis: data.audioAnalysis,
    metadataAnalysis: data.metadataAnalysis,
    fingerprint: data.fingerprint,
    compressionInfo: data.compressionInfo,
    emotionMismatch: data.emotionMismatch,
    syncAnalysis: data.syncAnalysis,
    xaiRegions: data.xaiRegions,
  };
};

export const generateReport = async (detectionId: string): Promise<Report> => {
  if (isDemoMode) {
    await new Promise((r) => setTimeout(r, 800));
    return {
      id: `report-${Date.now()}`,
      detectionId,
      pdfUrl: '#',
      createdAt: new Date().toISOString(),
    };
  }

  const response = await api.post(`/report/${detectionId}`);
  const data = response.data;
  return {
    id: data.id,
    detectionId,
    pdfUrl: data.pdfUrl,
    createdAt: data.createdAt,
  };
};

export const getUserHistory = async (limit = 50, _offset = 0) => {
  if (isDemoMode) {
    const detections = getDemoDetections();
    return { detections: detections.slice(0, limit) };
  }

  const response = await api.get('/history/user', { params: { limit, offset: _offset } });
  return response.data;
};

// ── Admin API functions ────────────────────────────────────────────

export const getAdminStats = async () => {
  if (isDemoMode) {
    const detections = getDemoDetections();
    const deepfakes = detections.filter((d) => d.status === 'deepfake').length;
    const avg = detections.length > 0
      ? Math.round(detections.reduce((s, d) => s + d.trustScore, 0) / detections.length)
      : 0;
    return {
      users: { total: 2 },
      detections: {
        total: detections.length,
        byType: {
          image: detections.filter((d) => d.fileType === 'image').length,
          video: detections.filter((d) => d.fileType === 'video').length,
          audio: detections.filter((d) => d.fileType === 'audio').length,
        },
        byLabel: {
          authentic: detections.filter((d) => d.status === 'authentic').length,
          suspicious: detections.filter((d) => d.status === 'suspected').length,
          deepfake: deepfakes,
        },
      },
      reports: { total: 0 },
      avgTrustScore: avg,
    };
  }

  const response = await api.get('/admin/stats');
  return response.data;
};

export const getAdminUsers = async (_limit = 50, _offset = 0) => {
  if (isDemoMode) {
    return {
      users: [
        { id: 'demo-admin-001', email: 'admin@mediaguardx.com', name: 'Admin', role: 'admin', is_active: true, created_at: '2025-01-01T00:00:00Z' },
        { id: 'demo-user-001', email: 'user@mediaguardx.com', name: 'Demo User', role: 'user', is_active: true, created_at: '2025-01-01T00:00:00Z' },
      ],
    };
  }

  const response = await api.get('/admin/users', { params: { limit: _limit, offset: _offset } });
  return response.data;
};

export const updateUserRole = async (userId: string, role: string) => {
  if (isDemoMode) {
    return { message: `Role updated to ${role}` };
  }
  const response = await api.put(`/admin/users/${userId}/role`, null, { params: { role } });
  return response.data;
};

export const updateUserStatus = async (userId: string, isActive: boolean) => {
  if (isDemoMode) {
    return { message: `Status updated to ${isActive ? 'active' : 'inactive'}` };
  }
  const response = await api.put(`/admin/users/${userId}/status`, null, { params: { is_active: isActive } });
  return response.data;
};

export const deleteUser = async (userId: string) => {
  if (isDemoMode) {
    return { message: 'User deleted' };
  }
  const response = await api.delete(`/admin/users/${userId}`);
  return response.data;
};

export const getActivityLogs = async (limit = 50, _offset = 0) => {
  if (isDemoMode) {
    const logs = [
      { id: '1', action: 'login', userEmail: 'admin@mediaguardx.com', timestamp: new Date().toISOString(), resource: 'auth', details: 'Admin logged in' },
      { id: '2', action: 'detection', userEmail: 'user@mediaguardx.com', timestamp: new Date(Date.now() - 3600000).toISOString(), resource: 'detection', details: 'File analyzed' },
    ].slice(0, limit);
    return { logs };
  }

  const response = await api.get('/admin/activity-logs', { params: { limit, offset: _offset } });
  return response.data;
};

export const getAdminHistory = async (limit = 50, _offset = 0) => {
  if (isDemoMode) {
    const detections = getDemoDetections();
    return { detections: detections.slice(0, limit) };
  }

  const response = await api.get('/history/admin', { params: { limit, offset: _offset } });
  return response.data;
};

export default api;
