import { useCallback, useState } from 'react';
import { Upload, X, Link as LinkIcon } from 'lucide-react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  onUrlSubmit?: (url: string) => void;
  accept?: string;
  maxSize?: number; // in MB
}

export default function FileUploader({
  onFileSelect,
  onUrlSubmit,
  accept = 'image/*,video/*,audio/*',
  maxSize = 100,
}: FileUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        if (file.size <= maxSize * 1024 * 1024) {
          setSelectedFile(file);
          onFileSelect(file);
        } else {
          alert(`File size exceeds ${maxSize}MB limit`);
        }
      }
    },
    [onFileSelect, maxSize]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.preventDefault();
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        if (file.size <= maxSize * 1024 * 1024) {
          setSelectedFile(file);
          onFileSelect(file);
        } else {
          alert(`File size exceeds ${maxSize}MB limit`);
        }
      }
    },
    [onFileSelect, maxSize]
  );

  const handleUrlSubmit = () => {
    if (urlInput.trim() && onUrlSubmit) {
      onUrlSubmit(urlInput.trim());
      setUrlInput('');
      setShowUrlInput(false);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
  };

  return (
    <div className="space-y-4">
      {!selectedFile ? (
        <div
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
            dragActive
              ? 'border-primary-500 bg-primary-500/10'
              : 'border-dark-600 hover:border-primary-500/50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-300 mb-2">
            Drag and drop your file here
          </p>
          <p className="text-sm text-gray-500 mb-4">
            or click to browse (Max {maxSize}MB)
          </p>
          <label className="inline-block px-6 py-2 bg-primary-600 hover:bg-primary-500 rounded-lg cursor-pointer transition-colors">
            Select File
            <input
              type="file"
              className="hidden"
              accept={accept}
              onChange={handleChange}
            />
          </label>
          {onUrlSubmit && (
            <div className="mt-4">
              <button
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="text-sm text-primary-400 hover:text-primary-300 flex items-center mx-auto"
              >
                <LinkIcon className="w-4 h-4 mr-1" />
                Or paste URL
              </button>
              {showUrlInput && (
                <div className="mt-3 flex gap-2 max-w-md mx-auto">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/media.mp4"
                    className="flex-1 px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-gray-300 focus:outline-none focus:border-primary-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleUrlSubmit()}
                  />
                  <button
                    onClick={handleUrlSubmit}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-lg transition-colors"
                  >
                    Load
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="border border-dark-600 rounded-xl p-6 bg-dark-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-primary-600/20 rounded-lg flex items-center justify-center">
                <Upload className="w-6 h-6 text-primary-400" />
              </div>
              <div>
                <p className="text-gray-300 font-medium">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              onClick={removeFile}
              className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

