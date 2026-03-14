import { useRef, useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import type { ImageContent } from '../../../types/blocks.types';

interface ImageBlockProps {
  content: ImageContent;
  isSelected: boolean;
  onChange: (content: Partial<ImageContent>) => void;
}

export function ImageBlock({ content, isSelected, onChange }: ImageBlockProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUploadClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file.');
      event.target.value = '';
      return;
    }

    const maxSizeBytes = 8 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setUploadError('Image is too large. Max file size is 8MB.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        setUploadError('Could not read image file.');
        return;
      }

      const suggestedAlt = file.name
        .replace(/\.[^.]+$/, '')
        .replace(/[_-]+/g, ' ')
        .trim();

      onChange({
        src: result,
        alt: content.alt?.trim() ? content.alt : suggestedAlt,
      });
      setUploadError(null);
      event.target.value = '';
    };

    reader.onerror = () => {
      setUploadError('Could not read image file.');
      event.target.value = '';
    };

    reader.readAsDataURL(file);
  };

  if (!content.src) {
    return (
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        {isSelected ? (
          <div className="space-y-2">
            <button
              type="button"
              className="w-full p-2 border border-gray-300 rounded text-sm bg-[rgba(255,255,255,0.06)]"
              onClick={handleUploadClick}
            >
              Upload image
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
              onClick={(e) => e.stopPropagation()}
            />
            <input
              type="url"
              placeholder="Paste image URL..."
              className="w-full p-2 border border-gray-300 rounded text-center"
              onChange={(e) => onChange({ src: e.target.value })}
              autoFocus
            />
            {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}
            <p className="text-xs text-gray-500">
              Upload from your computer or paste an image URL.
            </p>
          </div>
        ) : (
          <p className="text-gray-500">Click to add an image</p>
        )}
      </div>
    );
  }

  return (
    <figure onClick={(e) => e.stopPropagation()}>
      <img
        src={content.src}
        alt={content.alt}
        className="max-w-full rounded-lg mx-auto"
        onError={(e) => {
          (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" fill="%23f3f4f6"><rect width="100%" height="100%"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-family="sans-serif">Image failed to load</text></svg>';
        }}
      />
      {isSelected ? (
        <div className="mt-3 space-y-2">
          <button
            type="button"
            className="w-full p-2 border border-gray-300 rounded text-sm bg-[rgba(255,255,255,0.06)]"
            onClick={handleUploadClick}
          >
            Replace image
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
            onClick={(e) => e.stopPropagation()}
          />
          <input
            type="url"
            value={content.src}
            onChange={(e) => onChange({ src: e.target.value })}
            placeholder="Image URL..."
            className="w-full p-2 border border-gray-300 rounded text-sm"
          />
          {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}
          <input
            type="text"
            value={content.alt}
            onChange={(e) => onChange({ alt: e.target.value })}
            placeholder="Alt text (for accessibility)..."
            className="w-full p-2 border border-gray-300 rounded text-sm"
          />
          <input
            type="text"
            value={content.caption}
            onChange={(e) => onChange({ caption: e.target.value })}
            placeholder="Caption (optional)..."
            className="w-full p-2 border border-gray-300 rounded text-sm"
          />
        </div>
      ) : content.caption ? (
        <figcaption className="mt-2 text-center text-sm text-gray-600">
          {content.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
