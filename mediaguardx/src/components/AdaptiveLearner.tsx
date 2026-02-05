import { useState } from 'react';

interface Props {
  onUpload?: () => void;
}

export default function AdaptiveLearner({ onUpload }: Props) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
  };

  const handleSubmit = async () => {
    if (!files || files.length === 0) return alert('Select sample files to upload');
    setUploading(true);
    // Mock upload - in a real app you'd send these samples to the adaptive learning endpoint
    setTimeout(() => {
      setUploading(false);
      alert(`Uploaded ${files.length} sample(s) for adaptive learning (mock).`);
      onUpload?.();
    }, 1200);
  };

  return (
    <div className="glass rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-200 mb-4">Adaptive Learning Upload</h3>
      <p className="text-sm text-gray-400 mb-3">Upload new deepfake samples to help the system adapt to emerging apps.</p>
      <div className="flex items-center space-x-3">
        <input type="file" multiple accept="image/*,video/*" onChange={handleFiles} />
        <button onClick={handleSubmit} disabled={uploading} className="px-4 py-2 bg-primary-600 rounded-lg">
          {uploading ? 'Uploading...' : 'Upload Samples'}
        </button>
      </div>
    </div>
  );
}
