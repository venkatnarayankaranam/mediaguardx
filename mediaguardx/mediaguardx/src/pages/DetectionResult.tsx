import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TrustScoreGauge from '../components/TrustScoreGauge';
import StatusBadge from '../components/StatusBadge';
import HeatmapDisplay from '../components/HeatmapDisplay';
import AnomalyList from '../components/AnomalyList';
import Card from '../components/Card';
import MultiLayerPanel from '../components/MultiLayerPanel';
import ExplainabilityPanel from '../components/ExplainabilityPanel';
import SocialMediaPanel from '../components/SocialMediaPanel';
import FingerprintPanel from '../components/FingerprintPanel';
import EmotionMismatchPanel from '../components/EmotionMismatchPanel';
import SyncAnalysisPanel from '../components/SyncAnalysisPanel';
import AdaptiveLearner from '../components/AdaptiveLearner';
import { getDetectionResult, generateReport } from '../services/api';
import { useDetectionStore } from '../store/detectionStore';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { Download, FileText, ArrowLeft, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { DetectionResult } from '../types';

export default function DetectionResultPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getDetection, updateDetection } = useDetectionStore();
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [imageBlobUrl, setImageBlobUrl] = useState<string | null>(null);
  const [heatmapBlobUrl, setHeatmapBlobUrl] = useState<string | null>(null);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (imageBlobUrl) {
        URL.revokeObjectURL(imageBlobUrl);
      }
      if (heatmapBlobUrl) {
        URL.revokeObjectURL(heatmapBlobUrl);
      }
    };
  }, [imageBlobUrl, heatmapBlobUrl]);

  useEffect(() => {
    const loadDetection = async () => {
      if (!id) return;

      // Always fetch fresh data from backend to avoid blob URL issues
      try {
        const result = await getDetectionResult(id);
        console.log('Detection result loaded:', {
          id: result.id,
          fileUrl: result.fileUrl,
          heatmapUrl: result.heatmapUrl,
          status: result.status
        });
        updateDetection(id, result);
        setDetection(result);
        
        // Fetch image file with authentication and create blob URL
        if (result.fileUrl) {
          try {
            // Use full URL if it's absolute, otherwise use axios instance
            const imageUrlToFetch = result.fileUrl.startsWith('http') 
              ? result.fileUrl 
              : `${api.defaults.baseURL?.replace('/api', '')}${result.fileUrl}`;
            
            const imageResponse = await fetch(imageUrlToFetch, {
              headers: {
                'Authorization': `Bearer ${useAuthStore.getState().token}`,
              },
            });
            
            if (imageResponse.ok) {
              const imageBlob = await imageResponse.blob();
              const imageUrl = URL.createObjectURL(imageBlob);
              setImageBlobUrl(imageUrl);
              console.log('Image blob URL created:', imageUrl);
            } else {
              console.error('Failed to fetch image:', imageResponse.status, imageResponse.statusText);
            }
          } catch (imgError) {
            console.error('Failed to load image:', imgError);
          }
        }
        
        // Fetch heatmap (static file, may not need auth, but try with auth first)
        if (result.heatmapUrl) {
          try {
            // Use full URL if it's absolute, otherwise construct it
            const heatmapUrlToFetch = result.heatmapUrl.startsWith('http')
              ? result.heatmapUrl
              : `${api.defaults.baseURL?.replace('/api', '')}${result.heatmapUrl}`;
            
            // Try with auth first, fallback to without auth if it's a static file
            const token = useAuthStore.getState().token;
            const headers: HeadersInit = token ? {
              'Authorization': `Bearer ${token}`,
            } : {};
            
            const heatmapResponse = await fetch(heatmapUrlToFetch, { headers });
            
            if (heatmapResponse.ok) {
              const heatmapBlob = await heatmapResponse.blob();
              const heatmapUrl = URL.createObjectURL(heatmapBlob);
              setHeatmapBlobUrl(heatmapUrl);
              console.log('Heatmap blob URL created:', heatmapUrl);
            } else {
              console.error('Failed to fetch heatmap:', heatmapResponse.status, heatmapResponse.statusText);
              // Try without auth as fallback (for static files)
              if (token) {
                try {
                  const fallbackResponse = await fetch(heatmapUrlToFetch);
                  if (fallbackResponse.ok) {
                    const heatmapBlob = await fallbackResponse.blob();
                    const heatmapUrl = URL.createObjectURL(heatmapBlob);
                    setHeatmapBlobUrl(heatmapUrl);
                    console.log('Heatmap loaded without auth (static file)');
                  }
                } catch (e) {
                  console.error('Failed to load heatmap even without auth:', e);
                }
              }
            }
          } catch (heatmapError) {
            console.error('Failed to load heatmap:', heatmapError);
          }
        }
      } catch (error) {
        console.error('Failed to load detection:', error);
        // If fetch fails, try cached data as fallback
        const cached = getDetection(id);
        if (cached) {
          // Clean up any blob URLs in cached data
          if (cached.fileUrl && cached.fileUrl.startsWith('blob:')) {
            cached.fileUrl = null;
          }
          if (cached.heatmapUrl && cached.heatmapUrl.startsWith('blob:')) {
            cached.heatmapUrl = null;
          }
          setDetection(cached);
        }
      } finally {
        setLoading(false);
      }
    };

    loadDetection();
  }, [id, getDetection, updateDetection]);

  const handleGenerateReport = async () => {
    if (!id) return;
    setGeneratingReport(true);
    try {
      const report = await generateReport(id);
      // Download the PDF via authenticated fetch
      if (report.pdfUrl) {
        const pdfUrlFull = report.pdfUrl.startsWith('http')
          ? report.pdfUrl
          : `${api.defaults.baseURL?.replace('/api', '')}${report.pdfUrl}`;
        const pdfResponse = await fetch(pdfUrlFull, {
          headers: {
            'Authorization': `Bearer ${useAuthStore.getState().token}`,
          },
        });
        if (pdfResponse.ok) {
          const blob = await pdfResponse.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `report_${id}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } else {
          console.error('Failed to download PDF:', pdfResponse.status);
        }
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setGeneratingReport(false);
    }
  };

  const getRecommendation = (status: DetectionResult['status'], trustScore: number) => {
    if (status === 'authentic') {
      return {
        icon: CheckCircle,
        color: 'text-green-400',
        bg: 'bg-green-500/10 border-green-500/30',
        title: 'Media appears authentic',
        message: 'No significant deepfake indicators were detected. The media can be trusted with high confidence.',
      };
    } else if (status === 'suspected') {
      return {
        icon: AlertTriangle,
        color: 'text-amber-400',
        bg: 'bg-amber-500/10 border-amber-500/30',
        title: 'Media shows suspicious signs',
        message: 'Some anomalies were detected. Exercise caution and verify through additional sources if possible.',
      };
    } else {
      return {
        icon: XCircle,
        color: 'text-red-400',
        bg: 'bg-red-500/10 border-red-500/30',
        title: 'Potential deepfake detected',
        message: 'Multiple indicators suggest this media may be synthetic. Do not trust this content without verification.',
      };
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <LoadingSkeleton />
      </div>
    );
  }

  if (!detection) {
    return (
      <div className="max-w-7xl mx-auto text-center py-20">
        <p className="text-gray-400">Detection not found</p>
      </div>
    );
  }

  const recommendation = getRecommendation(detection.status, detection.trustScore);
  const RecommendationIcon = recommendation.icon;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center space-x-2 text-gray-400 hover:text-primary-400 transition-colors mb-4"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Dashboard</span>
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-200 mb-2">Detection Result</h1>
          <p className="text-gray-400">{detection.fileName}</p>
        </div>
        <StatusBadge status={detection.status} size="lg" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Trust Score Gauge */}
        <Card>
          <h2 className="text-xl font-semibold text-gray-200 mb-6">Trust Score</h2>
          <div className="flex justify-center">
            <TrustScoreGauge score={detection.trustScore} size={250} />
          </div>
        </Card>

        {/* Media Preview */}
        <Card className="lg:col-span-2">
          <h2 className="text-xl font-semibold text-gray-200 mb-4">Media Preview</h2>
          <div className="aspect-video bg-dark-900 rounded-lg border border-dark-700 flex items-center justify-center overflow-hidden">
            {detection.fileType === 'image' ? (
              imageBlobUrl ? (
                <img
                  src={imageBlobUrl}
                  alt={detection.fileName}
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    console.error('Image failed to load from blob URL:', imageBlobUrl);
                    console.error('Original fileUrl:', detection.fileUrl);
                  }}
                />
              ) : (
                <div className="text-center text-gray-500">
                  <p>Loading image...</p>
                  <p className="text-sm text-gray-600 mt-2">{detection.fileName}</p>
                </div>
              )
            ) : (
              <div className="text-center text-gray-500">
                <p>Video/Audio preview placeholder</p>
                <p className="text-sm text-gray-600 mt-2">{detection.fileName}</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Heatmap / Explainability */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ExplainabilityPanel detection={detection} heatmapUrl={heatmapBlobUrl} />
        </div>
        <div className="space-y-6">
          <MultiLayerPanel detection={detection} />
          <SocialMediaPanel detection={detection} />
        </div>
      </div>

      {/* Anomalies */}
      {detection.anomalies.length > 0 && (
        <Card>
          <h2 className="text-xl font-semibold text-gray-200 mb-4">Detected Anomalies</h2>
          <AnomalyList anomalies={detection.anomalies} />
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <FingerprintPanel detection={detection} />
        <EmotionMismatchPanel detection={detection} />
        <SyncAnalysisPanel detection={detection} />
      </div>

      {/* Recommendation */}
      <Card className={recommendation.bg}>
        <div className="flex items-start space-x-4">
          <RecommendationIcon className={`w-6 h-6 mt-1 ${recommendation.color}`} />
          <div>
            <h3 className={`text-lg font-semibold mb-2 ${recommendation.color}`}>
              {recommendation.title}
            </h3>
            <p className="text-gray-300">{recommendation.message}</p>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-200 mb-2">Actions</h2>
            <p className="text-gray-400 text-sm">Generate detailed PDF report</p>
          </div>
          <button
            onClick={handleGenerateReport}
            disabled={generatingReport}
            className="flex items-center space-x-2 px-6 py-3 bg-primary-600 hover:bg-primary-500 rounded-lg transition-colors disabled:opacity-50"
          >
            {generatingReport ? (
              <>
                <FileText className="w-5 h-5" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>Generate Report</span>
              </>
            )}
          </button>
        </div>
        <div className="mt-6">
          <AdaptiveLearner />
        </div>
      </Card>
    </div>
  );
}

