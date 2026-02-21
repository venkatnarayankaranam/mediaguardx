import { useState } from 'react';
import { Image, Video, Music, ExternalLink, AlertCircle } from 'lucide-react';

interface MediaPreviewProps {
  url: string;
  type: 'image' | 'video' | 'audio';
  fileName: string;
}

function FallbackIcon({ type }: { type: MediaPreviewProps['type'] }) {
  const iconClass = 'w-12 h-12 text-slate-600';

  if (type === 'video') return <Video className={iconClass} />;
  if (type === 'audio') return <Music className={iconClass} />;
  return <Image className={iconClass} />;
}

function MediaError({ fileName }: { fileName: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <AlertCircle className="w-10 h-10 text-red-400 mb-2" />
      <p className="text-sm text-slate-400">Failed to load media preview</p>
      <p className="text-xs text-slate-600 mt-1 truncate max-w-full px-4">{fileName}</p>
    </div>
  );
}

function ImagePreview({ url, fileName }: { url: string; fileName: string }) {
  const [error, setError] = useState(false);

  if (error) return <MediaError fileName={fileName} />;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block w-full h-full"
    >
      <img
        src={url}
        alt={fileName}
        className="w-full h-full object-cover rounded-lg"
        onError={() => setError(true)}
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors rounded-lg">
        <ExternalLink className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </a>
  );
}

function VideoPreview({ url, fileName }: { url: string; fileName: string }) {
  const [error, setError] = useState(false);

  if (error) return <MediaError fileName={fileName} />;

  return (
    <video
      src={url}
      controls
      className="w-full h-full object-contain rounded-lg"
      onError={() => setError(true)}
    >
      Your browser does not support the video element.
    </video>
  );
}

function AudioPreview({ url, fileName }: { url: string; fileName: string }) {
  const [error, setError] = useState(false);

  if (error) return <MediaError fileName={fileName} />;

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8 w-full">
      <Music className="w-16 h-16 text-indigo-400" />
      <p className="text-sm text-slate-400 truncate max-w-full px-4">{fileName}</p>
      <audio src={url} controls className="w-full max-w-md" onError={() => setError(true)}>
        Your browser does not support the audio element.
      </audio>
    </div>
  );
}

export default function MediaPreview({ url, type, fileName }: MediaPreviewProps) {
  if (!url) {
    return (
      <div className="card flex flex-col items-center justify-center aspect-video">
        <FallbackIcon type={type} />
        <p className="mt-3 text-sm text-slate-500">No preview available</p>
        <p className="mt-1 text-xs text-slate-600 truncate max-w-full px-4">
          {fileName}
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden aspect-video flex items-center justify-center">
      {type === 'image' && <ImagePreview url={url} fileName={fileName} />}
      {type === 'video' && <VideoPreview url={url} fileName={fileName} />}
      {type === 'audio' && <AudioPreview url={url} fileName={fileName} />}
    </div>
  );
}
