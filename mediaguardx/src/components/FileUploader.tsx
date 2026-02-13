import { useCallback, useRef, useState } from 'react';
import {
  FileAudio,
  FileVideo,
  Image,
  Loader2,
  Trash2,
  Upload,
  Zap,
} from 'lucide-react';

const MAX_FILE_SIZE_MB = 100;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED_TYPES = 'image/*,video/*,audio/*';

interface FileUploaderProps {
  onUpload: (file: File) => void;
  isUploading?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getFileCategory(file: File): 'image' | 'video' | 'audio' | 'unknown' {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'unknown';
}

function FileTypeIcon({ category }: { category: 'image' | 'video' | 'audio' | 'unknown' }) {
  const iconClass = 'w-8 h-8 text-indigo-400';

  switch (category) {
    case 'image':
      return <Image className={iconClass} />;
    case 'video':
      return <FileVideo className={iconClass} />;
    case 'audio':
      return <FileAudio className={iconClass} />;
    default:
      return <Upload className={iconClass} />;
  }
}

function FileCategoryBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    image: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    video: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    audio: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    unknown: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors[category] ?? colors.unknown}`}
    >
      {category}
    </span>
  );
}

export default function FileUploader({ onUpload, isUploading = false }: FileUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function validateAndSetFile(file: File): void {
    setValidationError(null);

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setValidationError(`File size exceeds the ${MAX_FILE_SIZE_MB}MB limit.`);
      return;
    }

    const category = getFileCategory(file);
    if (category === 'unknown') {
      setValidationError('Unsupported file type. Please upload an image, video, or audio file.');
      return;
    }

    setSelectedFile(file);

    // Generate thumbnail preview for images
    if (category === 'image') {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  }

  function clearSelection(): void {
    setSelectedFile(null);
    setValidationError(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }

  function handleSubmit(): void {
    if (selectedFile && !isUploading) {
      onUpload(selectedFile);
    }
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  }, []);

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  }

  function handleZoneClick(): void {
    inputRef.current?.click();
  }

  // -- Selected file view --
  if (selectedFile) {
    const category = getFileCategory(selectedFile);

    return (
      <div className="space-y-4">
        <div className="card flex items-center gap-4">
          {/* Preview / Icon */}
          <div className="w-16 h-16 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <FileTypeIcon category={category} />
            )}
          </div>

          {/* File info */}
          <div className="flex-1 min-w-0">
            <p className="text-slate-200 font-medium truncate">
              {selectedFile.name}
            </p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-slate-400">
                {formatFileSize(selectedFile.size)}
              </span>
              <FileCategoryBadge category={category} />
            </div>
          </div>

          {/* Remove button */}
          <button
            type="button"
            onClick={clearSelection}
            disabled={isUploading}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50"
            aria-label="Remove file"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {/* Analyze button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isUploading}
          className="btn-primary w-full gap-2"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              Analyze
            </>
          )}
        </button>
      </div>
    );
  }

  // -- Drop zone view --
  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        onClick={handleZoneClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') handleZoneClick();
        }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200 ${
          dragActive
            ? 'border-indigo-500 bg-indigo-500/10 shadow-glow-brand'
            : 'border-slate-700 hover:border-indigo-500/50 hover:bg-slate-900/30'
        }`}
      >
        <Upload
          className={`w-12 h-12 mx-auto mb-4 transition-colors ${
            dragActive ? 'text-indigo-400' : 'text-slate-500'
          }`}
        />
        <p className="text-lg font-medium text-slate-300 mb-1">
          Drag and drop your file here
        </p>
        <p className="text-sm text-slate-500 mb-4">
          or click to browse
        </p>
        <p className="text-xs text-slate-600">
          Images, videos, or audio up to {MAX_FILE_SIZE_MB}MB
        </p>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      {validationError && (
        <p className="text-sm text-red-400 pl-1">{validationError}</p>
      )}
    </div>
  );
}
