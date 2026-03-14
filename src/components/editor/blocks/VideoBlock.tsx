import { Video } from 'lucide-react';
import { parseVideoUrl, getVideoEmbedUrl } from '../../../utils/blockDefaults';
import type { VideoContent } from '../../../types/blocks.types';

interface VideoBlockProps {
  content: VideoContent;
  isSelected: boolean;
  onChange: (content: Partial<VideoContent>) => void;
}

export function VideoBlock({ content, isSelected, onChange }: VideoBlockProps) {
  const handleUrlChange = (url: string) => {
    const { provider, videoId } = parseVideoUrl(url);
    onChange({ url, provider, videoId });
  };

  if (!content.videoId) {
    return (
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <Video className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        {isSelected ? (
          <div className="space-y-2">
            <input
              type="url"
              placeholder="Paste YouTube or Vimeo URL..."
              value={content.url}
              className="w-full p-2 border border-gray-300 rounded text-center"
              onChange={(e) => handleUrlChange(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-gray-500">
              Supports YouTube and Vimeo links
            </p>
          </div>
        ) : (
          <p className="text-gray-500">Click to add a video</p>
        )}
      </div>
    );
  }

  const embedUrl = content.provider && content.videoId
    ? getVideoEmbedUrl(content.provider, content.videoId)
    : '';

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <div className="aspect-video rounded-lg overflow-hidden bg-black">
        <iframe
          src={embedUrl}
          className="w-full h-full"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>
      {isSelected && (
        <input
          type="url"
          value={content.url}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder="Video URL..."
          className="w-full mt-3 p-2 border border-gray-300 rounded text-sm"
        />
      )}
    </div>
  );
}
