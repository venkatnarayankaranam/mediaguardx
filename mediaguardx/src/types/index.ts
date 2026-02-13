export type UserRole = 'user' | 'investigator' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface DetectionResult {
  id: string;
  fileName: string;
  fileType: 'image' | 'video' | 'audio';
  fileUrl: string;
  trustScore: number;
  status: 'authentic' | 'suspected' | 'deepfake';
  anomalies: Anomaly[];
  heatmapUrl?: string;
  createdAt: string;
  userId?: string;
  userEmail?: string;
  fileSize?: number;
  metadata?: {
    duration?: number;
    resolution?: string;
    fileSize?: number;
  };
  sightengineResult?: {
    trust_score: number;
    deepfake_probability: number;
    api_available: boolean;
  };
  audioAnalysis?: {
    cloned?: boolean;
    score?: number;
    details?: string[];
  };
  metadataAnalysis?: {
    missingCamera?: boolean;
    irregularTimestamps?: boolean;
    suspiciousCompression?: boolean;
    details?: string[];
  };
  fingerprint?: {
    source?: string;
    probability?: number;
  };
  compressionInfo?: {
    platform?: string;
    compressionRatio?: number;
    evidence?: string[];
  };
  emotionMismatch?: {
    faceEmotion?: string;
    audioEmotion?: string;
    score?: number;
  };
  syncAnalysis?: {
    lipSyncMismatch?: boolean;
    mismatchScore?: number;
    details?: string[];
  };
  xaiRegions?: Array<{ region: string; confidence: number; description?: string }>;
}

export interface Anomaly {
  type: 'face_blending' | 'texture_artifacts' | 'lighting_inconsistency' | 'audio_sync_mismatch' | 'metadata_tampering' | 'model_prediction' | 'general';
  severity: 'low' | 'medium' | 'high';
  description: string;
  confidence: number;
}

export interface Case {
  id: string;
  title: string;
  description: string;
  evidence: DetectionResult[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Report {
  id: string;
  detectionId: string;
  pdfUrl?: string;
  caseId?: string;
  tamperProofHash?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  details?: Record<string, unknown>;
  created_at: string;
  userEmail?: string;
}

export interface AdminStats {
  totalUsers: number;
  totalDetections: number;
  deepfakesFound: number;
  avgTrustScore: number;
}
