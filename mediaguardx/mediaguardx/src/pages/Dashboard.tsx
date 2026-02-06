import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FileUploader from '../components/FileUploader';
import Card from '../components/Card';
import { uploadMedia, getDetectionResult } from '../services/api';
import { useDetectionStore } from '../store/detectionStore';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { History, Upload as UploadIcon } from 'lucide-react';

export default function Dashboard() {
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();
  const { history, addDetection } = useDetectionStore();

  const handleFileSelect = async (file: File) => {
    setUploading(true);
    try {
      const { detectionId } = await uploadMedia(file);
      const result = await getDetectionResult(detectionId);
      addDetection(result);
      navigate(`/detection/${detectionId}`);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleUrlSubmit = async (url: string) => {
    setUploading(true);
    try {
      // Create a mock file from URL
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], 'uploaded-media', { type: blob.type });
      
      const { detectionId } = await uploadMedia(file);
      const result = await getDetectionResult(detectionId);
      addDetection(result);
      navigate(`/detection/${detectionId}`);
    } catch (error) {
      console.error('URL upload failed:', error);
      alert('URL upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-200 mb-2">Dashboard</h1>
        <p className="text-gray-400">Upload media to detect deepfakes</p>
      </div>

      <Card>
        <div className="flex items-center space-x-3 mb-6">
          <UploadIcon className="w-6 h-6 text-primary-400" />
          <h2 className="text-xl font-semibold text-gray-200">Upload Media</h2>
        </div>
        
        {uploading ? (
          <div className="py-12">
            <LoadingSkeleton />
            <p className="text-center text-gray-400 mt-4">Analyzing media...</p>
          </div>
        ) : (
          <FileUploader onFileSelect={handleFileSelect} onUrlSubmit={handleUrlSubmit} />
        )}
      </Card>

      {history.length > 0 && (
        <Card>
          <div className="flex items-center space-x-3 mb-6">
            <History className="w-6 h-6 text-primary-400" />
            <h2 className="text-xl font-semibold text-gray-200">Recent Detections</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">File</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Trust Score</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Action</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 10).map((detection) => (
                  <tr
                    key={detection.id}
                    className="border-b border-dark-800 hover:bg-dark-800/30 transition-colors"
                  >
                    <td className="py-3 px-4 text-gray-300">{detection.fileName}</td>
                    <td className="py-3 px-4 text-gray-400 capitalize">{detection.fileType}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-semibold ${
                          detection.trustScore >= 80
                            ? 'text-green-400'
                            : detection.trustScore >= 50
                            ? 'text-amber-400'
                            : 'text-red-400'
                        }`}
                      >
                        {detection.trustScore}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          detection.status === 'authentic'
                            ? 'bg-green-500/20 text-green-400'
                            : detection.status === 'suspected'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {detection.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-sm">
                      {new Date(detection.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => navigate(`/detection/${detection.id}`)}
                        className="text-primary-400 hover:text-primary-300 text-sm"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

