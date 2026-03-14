import { create } from 'zustand';
import { blockService } from '../services/block.service';
import { getDefaultContent, getDefaultSettings } from '../utils/blockDefaults';
import type { EditorStore, EditorState } from '../types/editor.types';
import type { BlockType, EditorBlock } from '../types/blocks.types';
import type { Block, Json } from '../types/database.types';

// Convert database block to editor block
function toEditorBlock(block: Block): EditorBlock {
  return {
    id: block.id,
    course_id: block.course_id,
    type: block.type as BlockType,
    content: block.content as unknown as EditorBlock['content'],
    settings: block.settings as unknown as EditorBlock['settings'],
    order: block.order,
    created_at: block.created_at,
  } as EditorBlock;
}

const initialState: EditorState = {
  courseId: null,
  blocks: [],
  selectedBlockId: null,
  isDragging: false,
  isLoading: false,
  isSaving: false,
  hasUnsavedChanges: false,
  lastSavedAt: null,
  error: null,
};

export const useEditorStore = create<EditorStore>((set, get) => ({
  ...initialState,

  loadCourse: async (courseId: string) => {
    set({ isLoading: true, error: null, courseId });
    try {
      const blocks = await blockService.getBlocksByCourse(courseId);
      set({ blocks: blocks.map(toEditorBlock), isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  reset: () => set(initialState),

  addBlock: async (type: BlockType, position?: number) => {
    const { courseId, blocks } = get();
    if (!courseId) return;

    const insertPosition = position ?? blocks.length;

    // Optimistic update with temporary ID
    const tempId = `temp-${Date.now()}`;
    const newBlock: EditorBlock = {
      id: tempId,
      course_id: courseId,
      type,
      content: getDefaultContent(type),
      settings: getDefaultSettings(),
      order: insertPosition,
      created_at: new Date().toISOString(),
    } as EditorBlock;

    // Update orders for blocks after insertion point
    const updatedBlocks = blocks.map(block =>
      block.order >= insertPosition
        ? { ...block, order: block.order + 1 }
        : block
    );

    set({
      blocks: [...updatedBlocks, newBlock].sort((a, b) => a.order - b.order),
      selectedBlockId: tempId,
      hasUnsavedChanges: true,
    });

    // Persist to database
    try {
      const savedBlock = await blockService.createBlock({
        course_id: courseId,
        type,
        content: newBlock.content as unknown as Json,
        settings: newBlock.settings as unknown as Json,
        order: insertPosition,
      });

      // Replace temp block with saved block
      set(state => ({
        blocks: state.blocks.map(b =>
          b.id === tempId ? toEditorBlock(savedBlock) : b
        ),
        selectedBlockId: state.selectedBlockId === tempId ? savedBlock.id : state.selectedBlockId,
        hasUnsavedChanges: false,
        lastSavedAt: new Date().toISOString(),
      }));

      // Update orders in database for shifted blocks
      const blocksToUpdate = updatedBlocks.filter(b => b.order >= insertPosition);
      if (blocksToUpdate.length > 0) {
        await blockService.updateBlockOrders(
          blocksToUpdate.map(b => ({ id: b.id, order: b.order }))
        );
      }
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  updateBlock: (blockId: string, content: Partial<EditorBlock['content']>) => {
    set(state => ({
      blocks: state.blocks.map(block =>
        block.id === blockId
          ? { ...block, content: { ...block.content, ...content } } as EditorBlock
          : block
      ),
      hasUnsavedChanges: true,
    }));
  },

  updateBlockSettings: (blockId: string, settings: Partial<EditorBlock['settings']>) => {
    set(state => ({
      blocks: state.blocks.map(block =>
        block.id === blockId
          ? { ...block, settings: { ...block.settings, ...settings } } as EditorBlock
          : block
      ),
      hasUnsavedChanges: true,
    }));
  },

  deleteBlock: async (blockId: string) => {
    const { blocks, selectedBlockId } = get();
    const blockToDelete = blocks.find(b => b.id === blockId);
    if (!blockToDelete) return;

    // Optimistic update
    const remainingBlocks = blocks
      .filter(b => b.id !== blockId)
      .map(b => b.order > blockToDelete.order ? { ...b, order: b.order - 1 } : b);

    set({
      blocks: remainingBlocks,
      selectedBlockId: selectedBlockId === blockId ? null : selectedBlockId,
      hasUnsavedChanges: true,
    });

    try {
      await blockService.deleteBlock(blockId);
      set({ hasUnsavedChanges: false, lastSavedAt: new Date().toISOString() });
    } catch (error) {
      // Rollback on error
      set({ blocks, error: (error as Error).message });
    }
  },

  reorderBlocks: (activeId: string, overId: string) => {
    const { blocks } = get();
    const activeIndex = blocks.findIndex(b => b.id === activeId);
    const overIndex = blocks.findIndex(b => b.id === overId);

    if (activeIndex === -1 || overIndex === -1) return;

    const reordered = [...blocks];
    const [removed] = reordered.splice(activeIndex, 1);
    reordered.splice(overIndex, 0, removed);

    // Update order values
    const updatedBlocks = reordered.map((block, index) => ({
      ...block,
      order: index,
    }));

    set({ blocks: updatedBlocks, hasUnsavedChanges: true });
  },

  selectBlock: (blockId: string | null) => {
    set({ selectedBlockId: blockId });
  },

  insertBelow: async (type: BlockType, anchorId: string) => {
    const { blocks, addBlock } = get();
    const idx = blocks.findIndex(b => b.id === anchorId);
    const position = idx === -1 ? blocks.length : idx + 1;
    await addBlock(type, position);
  },

  duplicateBlock: async (blockId: string) => {
    const { blocks, addBlock } = get();
    const target = blocks.find(b => b.id === blockId);
    if (!target) return;
    const cloneContent = JSON.parse(JSON.stringify(target.content));
    const cloneType = target.type;
    const idx = blocks.findIndex(b => b.id === blockId);
    await addBlock(cloneType, idx + 1);
    // Newly added block content default; patch content to clone
    set(state => ({
      blocks: state.blocks.map((b, i) =>
        i === idx + 1 ? ({ ...b, content: cloneContent } as EditorBlock) : b
      ),
      hasUnsavedChanges: true,
    }));
  },

  toggleHidden: async (blockId: string) => {
    set(state => ({
      blocks: state.blocks.map(b =>
        b.id === blockId ? ({ ...b, settings: { ...b.settings, hidden: !b.settings.hidden } } as EditorBlock) : b
      ),
      hasUnsavedChanges: true,
    }));
  },

  saveChanges: async () => {
    const { blocks, hasUnsavedChanges } = get();
    if (!hasUnsavedChanges) return;

    set({ isSaving: true });
    try {
      // Batch update all blocks
      await Promise.all(
        blocks
          .filter(block => !block.id.startsWith('temp-'))
          .map(block =>
            blockService.updateBlock(block.id, {
              content: block.content as unknown as Json,
              settings: block.settings as unknown as Json,
              order: block.order,
            })
          )
      );
      set({ isSaving: false, hasUnsavedChanges: false, lastSavedAt: new Date().toISOString() });
    } catch (error) {
      set({ isSaving: false, error: (error as Error).message });
    }
  },

  setIsDragging: (isDragging: boolean) => {
    set({ isDragging });
  },
}));
