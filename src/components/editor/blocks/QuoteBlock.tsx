import type { QuoteContent } from '../../../types/blocks.types';

interface QuoteBlockProps {
  content: QuoteContent;
  isSelected: boolean;
  onChange: (content: Partial<QuoteContent>) => void;
}

export function QuoteBlock({ content, isSelected, onChange }: QuoteBlockProps) {
  if (isSelected) {
    return (
      <blockquote className="border-l-4 border-blue-500 pl-4 py-2">
        <textarea
          value={content.text}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder="Enter quote text..."
          className="w-full text-lg italic text-gray-700 border-none outline-none resize-none bg-transparent"
          rows={3}
          onClick={(e) => e.stopPropagation()}
        />
        <input
          type="text"
          value={content.attribution}
          onChange={(e) => onChange({ attribution: e.target.value })}
          placeholder="— Attribution (optional)"
          className="w-full text-sm text-gray-500 border-none outline-none mt-2 bg-transparent"
          onClick={(e) => e.stopPropagation()}
        />
      </blockquote>
    );
  }

  return (
    <blockquote className="border-l-4 border-blue-500 pl-4 py-2">
      <p className="text-lg italic text-gray-700">
        {content.text || 'Enter quote text...'}
      </p>
      {content.attribution && (
        <cite className="block mt-2 text-sm text-gray-500 not-italic">
          — {content.attribution}
        </cite>
      )}
    </blockquote>
  );
}
