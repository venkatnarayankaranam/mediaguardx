import { useState } from 'react';
import api from '../services/api';

interface Props {
  onUpload?: () => void;
}

export default function AdaptiveLearner({ onUpload }: Props) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
    setMessage(null);
  };

  const handleSubmit = async () => {
    if (!files || files.length === 0) {
      setMessage('Please select sample files to upload.');
      return;
    }

    setUploading(true);
    setMessage(null);

    let successCount = 0;
    for (let i = 0; i < files.length; i++) {
      try {
        const formData = new FormData();
        formData.append('file', files[i]);
        await api.post('/detect/adaptive-learning', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        successCount++;
      } catch (err) {
        console.error(`Failed to upload sample ${files[i].name}:`, err);
      }
    }

    setUploading(false);
    setMessage(`Uploaded ${successCount}/${files.length} sample(s) for adaptive learning.`);
    onUpload?.();
  };

  return (
    <div className="glass rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-200 mb-4">Adaptive Learning Upload</h3>
      <p className="text-sm text-gray-400 mb-3">
        Upload new deepfake samples to help the system adapt to emerging techniques.
      </p>
      <div className="flex items-center space-x-3">
        <input type="file" multiple accept="image/*,video/*" onChange={handleFiles} />
        <button
          onClick={handleSubmit}
          disabled={uploading}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-lg transition-colors disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : 'Upload Samples'}
        </button>
      </div>
      {message && (
        <p className="mt-3 text-sm text-gray-300">{message}</p>
      )}
    </div>
  );
}
