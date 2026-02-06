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
  
  return {
    id: data.id,
    fileName: data.fileName,
    fileType: data.fileType,
    fileUrl: fileUrl,
    trustScore: data.trustScore,
    status: data.status,
    anomalies: data.anomalies || [],
    heatmapUrl: heatmapUrl,
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

