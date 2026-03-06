import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Brain,
  BarChart3,
  RefreshCw,
  CheckCircle2,
  Target,
  Clock,
  MessageSquarePlus,
  Sparkles,
  AlertCircle,
  Database,
  Upload,
  FileImage,
} from 'lucide-react';
import { getAdaptiveStats, triggerRetrain, uploadTrainingMedia } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';

// Matches backend get_feedback_stats() response from model_engine.py
interface AdaptiveStats {
  feedback_samples: number;
  fake_count: number;
  real_count: number;
  min_for_retrain: number;
  ready_to_retrain: boolean;
  model_loaded: boolean;
  model_info: {
    val_accuracy?: number;
    epoch?: number;
    last_retrained?: string | null;
  };
}

export default function AdaptiveLearning() {
  const { profile } = useAuthStore();
  const toast = useToast();

  const [stats, setStats] = useState<AdaptiveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadLabel, setUploadLabel] = useState<'fake' | 'real'>('fake');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canRetrain = profile?.role === 'admin' || profile?.role === 'investigator';

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdaptiveStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch adaptive stats:', err);
      setError('Failed to load adaptive learning statistics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleRetrain = async () => {
    if (retraining) return;
    setRetraining(true);
    try {
      const result = await triggerRetrain();
      if (result.status === 'not_ready') {
        toast.error(result.message || 'Not enough feedback samples to retrain.');
      } else {
        toast.success(result.message || 'Model retraining triggered successfully.');
      }
      await fetchStats();
    } catch (err) {
      console.error('Retrain failed:', err);
      toast.error('Failed to trigger model retraining.');
    } finally {
      setRetraining(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    let successCount = 0;
    for (const file of Array.from(files)) {
      try {
        await uploadTrainingMedia(file, uploadLabel);
        successCount++;
      } catch (err) {
        console.error('Upload failed:', err);
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    if (successCount > 0) {
      toast.success(`Uploaded ${successCount} file(s) labeled as "${uploadLabel}" for training.`);
      await fetchStats();
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const accuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return 'text-emerald-400';
    if (accuracy >= 60) return 'text-amber-400';
    return 'text-red-400';
  };

  const modelAccuracy = stats?.model_info?.val_accuracy ?? null;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-200 mb-2 flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-indigo-400" />
            Adaptive Learning
          </h1>
          <p className="text-slate-400">
            Monitor feedback-driven model improvements and accuracy metrics
          </p>
        </div>
        {canRetrain && (
          <button
            onClick={handleRetrain}
            disabled={retraining}
            className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${retraining ? 'animate-spin' : ''}`} />
            {retraining ? 'Retraining...' : 'Retrain Model'}
          </button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="card rounded-xl p-4 border border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-3 text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
            <button
              onClick={fetchStats}
              className="ml-auto text-xs font-medium text-red-300 hover:text-red-200 underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card rounded-xl p-5">
              <div className="animate-pulse space-y-3">
                <div className="h-4 w-24 bg-slate-700 rounded" />
                <div className="h-8 w-16 bg-slate-700 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Feedback Samples */}
          <div className="card rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-indigo-500/10">
                <MessageSquarePlus className="w-5 h-5 text-indigo-400" />
              </div>
              <span className="text-sm font-medium text-slate-400">Feedback Samples</span>
            </div>
            <p className="text-2xl font-bold text-slate-200">{stats.feedback_samples}</p>
            <p className="text-xs text-slate-500 mt-1">
              {stats.fake_count} fake, {stats.real_count} real
            </p>
          </div>

          {/* Retrain Readiness */}
          <div className="card rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-sm font-medium text-slate-400">Retrain Status</span>
            </div>
            {stats.ready_to_retrain ? (
              <p className="text-lg font-bold text-emerald-400">Ready</p>
            ) : (
              <p className="text-lg font-bold text-amber-400">
                Need {stats.min_for_retrain - stats.feedback_samples} more
              </p>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Min {stats.min_for_retrain} samples required
            </p>
          </div>

          {/* Model Accuracy */}
          <div className="card rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Target className="w-5 h-5 text-amber-400" />
              </div>
              <span className="text-sm font-medium text-slate-400">Model Accuracy</span>
            </div>
            {modelAccuracy !== null ? (
              <p className={`text-2xl font-bold ${accuracyColor(modelAccuracy)}`}>
                {modelAccuracy.toFixed(1)}%
              </p>
            ) : (
              <p className="text-2xl font-bold text-slate-500">N/A</p>
            )}
            {stats.model_info?.epoch && (
              <p className="text-xs text-slate-500 mt-1">
                Trained for {stats.model_info.epoch} epochs
              </p>
            )}
          </div>

          {/* Last Retrained */}
          <div className="card rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Clock className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-sm font-medium text-slate-400">Last Retrained</span>
            </div>
            <p className="text-lg font-semibold text-slate-200">
              {formatDate(stats.model_info?.last_retrained)}
            </p>
          </div>
        </div>
      ) : null}

      {/* Model Status Card */}
      {!loading && stats && (
        <div className="card rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-400" />
            Model Status
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
              <span className="text-sm text-slate-400">Model Loaded</span>
              <span className={`text-sm font-medium ${stats.model_loaded ? 'text-emerald-400' : 'text-red-400'}`}>
                {stats.model_loaded ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
              <span className="text-sm text-slate-400">Architecture</span>
              <span className="text-sm font-medium text-slate-200">EfficientNet-B0</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
              <span className="text-sm text-slate-400">Ready to Retrain</span>
              <span className={`text-sm font-medium ${stats.ready_to_retrain ? 'text-emerald-400' : 'text-amber-400'}`}>
                {stats.ready_to_retrain ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Upload Training Media */}
      {!loading && canRetrain && (
        <div className="card rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-400" />
            Upload Training Media
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            Upload labeled images or videos to improve model accuracy. Select a label, then choose files.
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setUploadLabel('fake')}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  uploadLabel === 'fake'
                    ? 'bg-red-500/20 text-red-400 border-red-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                }`}
              >
                Fake / Deepfake
              </button>
              <button
                onClick={() => setUploadLabel('real')}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  uploadLabel === 'real'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                }`}
              >
                Real / Authentic
              </button>
            </div>
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleUpload}
                className="hidden"
                id="training-upload"
              />
              <label
                htmlFor="training-upload"
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                  uploading
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/25'
                }`}
              >
                {uploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <FileImage className="w-4 h-4" />
                    Choose Files
                  </>
                )}
              </label>
            </div>
          </div>
        </div>
      )}

      {/* How it Works (empty state when no feedback) */}
      {!loading && stats && stats.feedback_samples === 0 && (
        <div className="card rounded-xl py-16 text-center">
          <Brain className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 text-lg font-medium">No feedback yet</p>
          <p className="text-slate-600 text-sm mt-1 max-w-md mx-auto">
            Submit feedback on detection results to help improve model accuracy.
            Go to a detection result and mark it as "real" or "fake" to provide feedback.
          </p>
        </div>
      )}
    </div>
  );
}
