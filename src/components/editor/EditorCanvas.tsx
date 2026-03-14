import { useEffect, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { BlockWrapper } from './BlockWrapper';
import { renderBlock } from './blocks/renderBlock';
import type { EditorBlock } from '../../types/blocks.types';

interface EditorCanvasProps {
  blocks: EditorBlock[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  onReorder: (activeId: string, overId: string) => void;
  onUpdateBlock: (id: string, content: Partial<EditorBlock['content']>) => void;
  onUpdateBlockSettings: (id: string, settings: Partial<EditorBlock['settings']>) => void;
  onDeleteBlock: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onToggleHidden?: (id: string) => void;
  onInsertBelow?: (type: EditorBlock['type'], anchorId: string) => void;
}

export function EditorCanvas({
  blocks,
  selectedBlockId,
  onSelectBlock,
  onReorder,
  onUpdateBlock,
  onUpdateBlockSettings,
  onDeleteBlock,
  onDuplicate,
  onToggleHidden,
  onInsertBelow,
}: EditorCanvasProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      onReorder(active.id as string, over.id as string);
    }
  };

  const activeBlock = activeId ? blocks.find(b => b.id === activeId) : null;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) {
      return;
    }

    if (!selectedBlockId) return;
    const idx = blocks.findIndex(b => b.id === selectedBlockId);
    if (idx === -1) return;
    if (e.key === 'ArrowUp' && idx > 0) {
      e.preventDefault();
      onReorder(selectedBlockId, blocks[idx - 1].id);
    } else if (e.key === 'ArrowDown' && idx < blocks.length - 1) {
      e.preventDefault();
      onReorder(selectedBlockId, blocks[idx + 1].id);
    }
  };

  useEffect(() => {
    if (!selectedBlockId) return;
    const el = document.getElementById(`block-${selectedBlockId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedBlockId]);

  return (
    <div className="canvas-body" onClick={() => onSelectBlock(null)} tabIndex={0} onKeyDown={handleKeyDown}>
      <div className="stack">
        {blocks.length === 0 ? (
          <div className="empty">
            <p className="title">No blocks yet</p>
            <p className="subtitle">Add a block from the left to get started.</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={blocks.map(b => b.id)}
              strategy={verticalListSortingStrategy}
            >
              {blocks.map((block) => (
                <BlockWrapper
                  key={block.id}
                  block={block}
                  isSelected={selectedBlockId === block.id}
                  onSelect={() => onSelectBlock(block.id)}
                  onDelete={() => onDeleteBlock(block.id)}
                  onDuplicate={onDuplicate}
                  onUpdateSettings={onUpdateBlockSettings}
                  onToggleHidden={onToggleHidden}
                  onInsertBelow={onInsertBelow}
                >
                  <div id={`block-${block.id}`}>
                    {renderBlock(block, {
                      isSelected: selectedBlockId === block.id,
                      onChange: (content) => onUpdateBlock(block.id, content),
                    })}
                  </div>
                  {block.settings?.hidden && (
                    <div className="hidden-pill">Hidden</div>
                  )}
                </BlockWrapper>
              ))}
            </SortableContext>

            <DragOverlay>
              {activeBlock ? (
                <div className="overlay-card">
                  {renderBlock(activeBlock, {
                    isSelected: false,
                    onChange: () => {},
                  })}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
      <style>{`
        .canvas-body { min-height: 70vh; }
        .stack { max-width: 820px; margin: 0 auto; padding: 0.25rem 0.25rem 3rem; }
        .empty { text-align: center; padding: 5rem 1rem; color: rgba(255,255,255,0.7); }
        .empty .title { font-size: 1.2rem; margin: 0; }
        .empty .subtitle { margin: 0.35rem 0 0; color: rgba(255,255,255,0.55); }
        .overlay-card { background: rgba(20,24,45,0.92); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 1rem; box-shadow: 0 12px 32px rgba(0,0,0,0.35); }
        .hidden-pill { margin-top: 0.5rem; display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.25rem 0.55rem; border-radius: 999px; border: 1px solid rgba(255,255,255,0.12); color: rgba(255,255,255,0.7); font-size: 0.8rem; background: rgba(255,255,255,0.04); }
      `}</style>
    </div>
  );
}
