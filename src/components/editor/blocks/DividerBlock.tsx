import type { DividerContent } from '../../../types/blocks.types';

interface DividerBlockProps {
  content: DividerContent;
  isSelected: boolean;
  onChange: (content: Partial<DividerContent>) => void;
}

export function DividerBlock({ content, isSelected, onChange }: DividerBlockProps) {
  const styleClasses = {
    solid: 'border-solid',
    dashed: 'border-dashed',
    dotted: 'border-dotted',
  };

  return (
    <div className="py-4">
      <hr className={`border-t-2 border-gray-300 ${styleClasses[content.style]}`} />
      {isSelected && (
        <div className="flex gap-2 mt-3 justify-center">
          {(['solid', 'dashed', 'dotted'] as const).map((style) => (
            <button
              key={style}
              onClick={(e) => {
                e.stopPropagation();
                onChange({ style });
              }}
              className={`px-3 py-1 text-sm rounded capitalize ${
                content.style === style
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {style}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
