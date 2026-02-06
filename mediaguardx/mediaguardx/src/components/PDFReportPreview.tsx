import { FileText, Download, Calendar, User, Shield } from 'lucide-react';
import type { DetectionResult } from '../types';
import StatusBadge from './StatusBadge';

interface PDFReportPreviewProps {
  detection: DetectionResult;
  onDownload?: () => void;
}

export default function PDFReportPreview({ detection, onDownload }: PDFReportPreviewProps) {
  return (
    <div className="glass rounded-xl p-8 max-w-4xl mx-auto bg-white text-gray-900">
      {/* Header */}
      <div className="border-b-2 border-gray-300 pb-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">MediaGuardX</h1>
              <p className="text-sm text-gray-600">Deepfake Detection Report</p>
            </div>
          </div>
          <StatusBadge status={detection.status} size="lg" />
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4" />
            <span>{new Date(detection.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4" />
            <span>Report ID: {detection.id}</span>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="space-y-6">
        {/* File Information */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">File Information</h2>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">File Name:</span>
              <span className="font-medium text-gray-900">{detection.fileName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">File Type:</span>
              <span className="font-medium text-gray-900 capitalize">{detection.fileType}</span>
            </div>
            {detection.metadata && (
              <>
                {detection.metadata.resolution && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Resolution:</span>
                    <span className="font-medium text-gray-900">{detection.metadata.resolution}</span>
                  </div>
                )}
                {detection.metadata.fileSize && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">File Size:</span>
                    <span className="font-medium text-gray-900">
                      {(detection.metadata.fileSize / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Trust Score */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Detection Results</h2>
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="text-center">
              <div className="text-5xl font-bold mb-2" style={{ color: 
                detection.trustScore >= 80 ? '#14b8a6' : 
                detection.trustScore >= 50 ? '#f59e0b' : '#ef4444'
              }}>
                {detection.trustScore}
              </div>
              <p className="text-gray-600">Trust Score (0-100)</p>
              <p className="text-sm text-gray-500 mt-2">
                {detection.trustScore >= 80 
                  ? 'Media appears authentic with high confidence'
                  : detection.trustScore >= 50
                  ? 'Media shows suspicious indicators'
                  : 'Potential deepfake detected'}
              </p>
            </div>
          </div>
        </section>

        {/* Anomalies */}
        {detection.anomalies.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Detected Anomalies</h2>
            <div className="space-y-3">
              {detection.anomalies.map((anomaly, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 border-l-4" style={{
                  borderColor: anomaly.severity === 'high' ? '#ef4444' : 
                               anomaly.severity === 'medium' ? '#f59e0b' : '#eab308'
                }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">
                      {anomaly.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    <span className="text-sm px-2 py-1 bg-gray-200 rounded">
                      {anomaly.severity.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{anomaly.description}</p>
                  <p className="text-xs text-gray-500 mt-1">Confidence: {anomaly.confidence}%</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <div className="border-t-2 border-gray-300 pt-6 mt-6 text-center text-sm text-gray-500">
          <p>This report was generated by MediaGuardX AI Deepfake Detection Platform</p>
          <p className="mt-2">Report is tamper-proof and timestamped</p>
        </div>
      </div>

      {/* Download Button */}
      {onDownload && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={onDownload}
            className="flex items-center space-x-2 px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors"
          >
            <Download className="w-5 h-5" />
            <span>Download PDF Report</span>
          </button>
        </div>
      )}
    </div>
  );
}

