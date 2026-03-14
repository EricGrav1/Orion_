import { useEffect, useRef } from 'react';
import type { HeadingContent } from '../../../types/blocks.types';

interface HeadingBlockProps {
  content: HeadingContent;
  isSelected: boolean;
  onChange: (content: Partial<HeadingContent>) => void;
}

export function HeadingBlock({ content, isSelected, onChange }: HeadingBlockProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const safeLevel: 1 | 2 | 3 = content.level === 1 || content.level === 2 || content.level === 3 ? content.level : 2;
  const safeText = typeof content.text === 'string' ? content.text : '';

  useEffect(() => {
    if (!isSelected) return;
    const id = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      const valueLength = inputRef.current?.value.length ?? 0;
      inputRef.current?.setSelectionRange(valueLength, valueLength);
    });
    return () => window.cancelAnimationFrame(id);
  }, [isSelected]);

  const sizeClasses = {
    1: 'text-4xl font-bold',
    2: 'text-3xl font-semibold',
    3: 'text-2xl font-medium',
  };

  if (isSelected) {
    return (
      <div className="space-y-2">
        <div className="flex gap-2 mb-2">
          {([1, 2, 3] as const).map((level) => (
            <button
              key={level}
              onClick={(e) => {
                e.stopPropagation();
                onChange({ level });
              }}
              className={`px-3 py-1 text-sm rounded ${
                safeLevel === level
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              H{level}
            </button>
          ))}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={safeText}
          onChange={(e) => onChange({ text: e.target.value })}
          className={`w-full border-none outline-none bg-transparent ${sizeClasses[safeLevel]}`}
          placeholder="Enter heading..."
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        />
      </div>
    );
  }

  const Tag = `h${safeLevel}` as 'h1' | 'h2' | 'h3';

  return (
    <Tag className={sizeClasses[safeLevel]}>
      {safeText || 'Untitled'}
    </Tag>
  );
}
