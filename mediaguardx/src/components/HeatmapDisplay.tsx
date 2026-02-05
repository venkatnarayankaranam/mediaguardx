import { useState } from 'react';
import { Image } from 'lucide-react';

interface HeatmapDisplayProps {
  imageUrl?: string;
  alt?: string;
}

export default function HeatmapDisplay({ imageUrl, alt = 'Heatmap' }: HeatmapDisplayProps) {
  const [imgError, setImgError] = useState(false);
  
  // Debug logging
  if (imageUrl) {
    console.log('HeatmapDisplay - imageUrl:', imageUrl);
  }
  
  return (
    <div className="glass rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-200 mb-4">XAI Heatmap</h3>
      <div className="relative aspect-video bg-dark-900 rounded-lg border border-dark-700 flex items-center justify-center overflow-hidden">
        {imageUrl && !imgError ? (
          <img
            src={imageUrl}
            alt={alt}
            className="w-full h-full object-contain"
            onError={(e) => {
              console.error('Failed to load heatmap image:', imageUrl, e);
              setImgError(true);
            }}
            onLoad={() => {
              console.log('Heatmap image loaded successfully:', imageUrl);
            }}
          />
        ) : (
          <div className="text-center text-gray-500">
            <Image className="w-16 h-16 mx-auto mb-3 opacity-50" />
            <p>Heatmap will be displayed here</p>
            <p className="text-sm text-gray-600 mt-1">
              {imageUrl ? 'Failed to load heatmap image' : 'Placeholder - AI model visualization'}
            </p>
            {imageUrl && (
              <p className="text-xs text-gray-600 mt-2 break-all">URL: {imageUrl}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

