import type { EditorBlock, BlockType } from './blocks.types';

export interface EditorState {
  // Data
  courseId: string | null;
  blocks: EditorBlock[];

  // UI State
  selectedBlockId: string | null;
  isDragging: boolean;
  isLoading: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  lastSavedAt: string | null;
  error: string | null;
}

export interface EditorActions {
  // Initialization
  loadCourse: (courseId: string) => Promise<void>;
  reset: () => void;

  // Block operations
  addBlock: (type: BlockType, position?: number) => Promise<void>;
  updateBlock: (blockId: string, content: Partial<EditorBlock['content']>) => void;
  updateBlockSettings: (blockId: string, settings: Partial<EditorBlock['settings']>) => void;
  deleteBlock: (blockId: string) => Promise<void>;
  reorderBlocks: (activeId: string, overId: string) => void;
  duplicateBlock: (blockId: string) => Promise<void>;
  toggleHidden: (blockId: string) => Promise<void>;
  insertBelow: (type: BlockType, anchorId: string) => Promise<void>;

  // Selection
  selectBlock: (blockId: string | null) => void;

  // Persistence
  saveChanges: () => Promise<void>;

  // Drag state
  setIsDragging: (isDragging: boolean) => void;
}

export type EditorStore = EditorState & EditorActions;
