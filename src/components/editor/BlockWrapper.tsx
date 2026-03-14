import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import type { EditorBlock } from '../../types/blocks.types';
import {
  getBlockContainerStyle,
  getBlockSurfaceStyle,
  maxWidthOptions,
  paddingOptions,
} from '../../utils/blockStyles';

interface BlockWrapperProps {
  block: EditorBlock;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate?: (id: string) => void;
  onUpdateSettings?: (id: string, settings: Partial<EditorBlock['settings']>) => void;
  onToggleHidden?: (id: string) => void;
  onInsertBelow?: (type: EditorBlock['type'], anchorId: string) => void;
  children: React.ReactNode;
}

export function BlockWrapper({
  block,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
  onUpdateSettings,
  onToggleHidden,
  onInsertBelow,
  children,
}: BlockWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    ...getBlockContainerStyle(block.settings),
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    borderColor: isSelected ? 'var(--course-brand, #D4A84B)' : 'rgba(255,255,255,0.08)',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group relative mb-4 rounded-xl border
        ${isSelected ? 'ring-2 ring-[rgba(212,168,75,0.25)]' : ''}
        ${isDragging ? 'shadow-lg' : 'shadow-sm'}
        bg-[rgba(25,30,55,0.85)] backdrop-blur
      `}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <div className="content text-[rgb(240,240,245)]" style={getBlockSurfaceStyle(block.settings)}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <button
              {...attributes}
              {...listeners}
              className="drag-handle"
              aria-label="Drag to reorder block"
              onClick={(event) => event.stopPropagation()}
            >
              <GripVertical className="w-4 h-4 text-gray-300" />
            </button>
            <span className="text-xs uppercase tracking-[0.08em] text-[rgba(255,255,255,0.55)]">{block.type}</span>
          </div>
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {onDuplicate && (
              <button className="chip" onClick={(e) => { e.stopPropagation(); onDuplicate(block.id); }}>Duplicate</button>
            )}
            {onInsertBelow && (
              <button className="chip" onClick={(e) => { e.stopPropagation(); onInsertBelow(block.type, block.id); }}>Add below</button>
            )}
            {onToggleHidden && (
              <button className="chip" onClick={(e) => { e.stopPropagation(); onToggleHidden(block.id); }}>
                {block.settings?.hidden ? 'Unhide' : 'Hide'}
              </button>
            )}
            <button
              className="icon-chip"
              onClick={(event) => {
                event.stopPropagation();
                onDelete();
              }}
              aria-label="Delete block"
              title="Delete block"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        {isSelected && onUpdateSettings && (
          <div className="settings-row">
            <label>
              Background
              <div className="background-control">
                <input
                  type="color"
                  value={block.settings.backgroundColor || '#1a1a1a'}
                  onChange={(event) => onUpdateSettings(block.id, { backgroundColor: event.target.value })}
                  onClick={(event) => event.stopPropagation()}
                />
                <button
                  type="button"
                  className="clear-bg"
                  onClick={(event) => {
                    event.stopPropagation();
                    onUpdateSettings(block.id, { backgroundColor: '' });
                  }}
                >
                  Clear
                </button>
              </div>
            </label>
            <label>
              Spacing
              <select
                value={block.settings.padding ?? 'medium'}
                onChange={(event) => onUpdateSettings(block.id, { padding: event.target.value as EditorBlock['settings']['padding'] })}
                onClick={(event) => event.stopPropagation()}
              >
                {paddingOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label>
              Width
              <select
                value={block.settings.maxWidth ?? 'medium'}
                onChange={(event) => onUpdateSettings(block.id, { maxWidth: event.target.value as EditorBlock['settings']['maxWidth'] })}
                onClick={(event) => event.stopPropagation()}
              >
                {maxWidthOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>
        )}
        {children}
      </div>

      <style>{`
        .drag-handle { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.16); background: rgba(255,255,255,0.06); cursor: grab; }
        .drag-handle:active { cursor: grabbing; }
        .chip { padding: 0.25rem 0.55rem; border-radius: 999px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.05); color: #f6f6fb; font-size: 0.8rem; cursor: pointer; }
        .icon-chip { width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.85); cursor: pointer; }
        .icon-chip:hover { color: #fca5a5; border-color: rgba(252,165,165,0.55); }
        .content { border-radius: inherit; }
        .settings-row { margin-bottom: 0.75rem; display: grid; gap: 0.5rem; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); }
        .settings-row label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.75rem; color: rgba(255,255,255,0.72); }
        .settings-row select, .settings-row input { border-radius: 8px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.04); color: #f6f6fb; padding: 0.35rem 0.45rem; }
        .settings-row input[type="color"] { height: 32px; padding: 0.1rem; cursor: pointer; }
        .background-control { display: grid; grid-template-columns: 1fr auto; gap: 0.4rem; }
        .clear-bg { border-radius: 8px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.78); padding: 0.25rem 0.45rem; cursor: pointer; }
      `}</style>
    </div>
  );
}
