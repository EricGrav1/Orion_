import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';
import type { TextContent } from '../../../types/blocks.types';

interface TextBlockProps {
  content: TextContent;
  isSelected: boolean;
  onChange: (content: Partial<TextContent>) => void;
}

export function TextBlock({ content, isSelected, onChange }: TextBlockProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: content.html,
    editable: isSelected,
    onUpdate: ({ editor }) => {
      onChange({ html: editor.getHTML() });
    },
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-[1em]',
      },
    },
  });

  // Update editable state when selection changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(isSelected);
    }
  }, [editor, isSelected]);

  // Sync content when it changes externally (only if not editing)
  useEffect(() => {
    if (editor && !isSelected && editor.getHTML() !== content.html) {
      editor.commands.setContent(content.html);
    }
  }, [editor, content.html, isSelected]);

  return (
    <div
      className={`${isSelected ? '' : 'cursor-pointer'}`}
      onClick={(e) => e.stopPropagation()}
    >
      {isSelected && editor && (
        <div className="toolbar">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'active' : ''}
            title="Bold"
          >
            <span className="font-bold text-sm">B</span>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'active' : ''}
            title="Italic"
          >
            <span className="italic text-sm">I</span>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={editor.isActive('heading', { level: 2 }) ? 'active' : ''}
            title="Heading"
          >
            H2
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? 'active' : ''}
            title="Bullet List"
          >
            <span className="text-sm">•</span>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive('orderedList') ? 'active' : ''}
            title="Numbered List"
          >
            <span className="text-sm">1.</span>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={editor.isActive('blockquote') ? 'active' : ''}
            title="Quote"
          >
            ❝
          </button>
          <button
            onClick={() => editor.chain().focus().setParagraph().run()}
            className={!editor.isActive('heading') && !editor.isActive('blockquote') ? 'active' : ''}
            title="Paragraph"
          >
            ¶
          </button>
        </div>
      )}
      <EditorContent editor={editor} />
      <style>{`
        .toolbar { display: inline-flex; gap: 0.35rem; padding: 0.35rem 0.5rem; margin-bottom: 0.35rem; border-radius: 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); }
        .toolbar button { color: #f6f6fb; background: transparent; border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 0.35rem 0.55rem; font-weight: 700; font-size: 0.85rem; cursor: pointer; }
        .toolbar button.active { border-color: rgba(212,168,75,0.8); background: rgba(212,168,75,0.15); color: #f7e7c0; }
        .toolbar button:hover { border-color: rgba(255,255,255,0.3); }
        .ProseMirror { min-height: 1.2em; color: #f7f7fb; }
        .ProseMirror p { margin: 0 0 0.4rem; line-height: 1.55; }
        .ProseMirror ul, .ProseMirror ol { padding-left: 1.25rem; margin: 0.1rem 0 0.6rem; }
        .ProseMirror blockquote { border-left: 3px solid rgba(212,168,75,0.6); margin: 0.2rem 0 0.6rem; padding-left: 0.6rem; color: rgba(255,255,255,0.8); }
      `}</style>
    </div>
  );
}
