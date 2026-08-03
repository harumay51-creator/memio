import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { StarterKit } from '@tiptap/starter-kit';
import { Highlight } from '@tiptap/extension-highlight';
import { Placeholder } from '@tiptap/extension-placeholder';

const HIGHLIGHT_COLORS = [
  { name: 'Icy Blue', value: '#CFE7F4' },
  { name: 'Lavender', value: '#DCCFF3' },
  { name: 'Sage Mint', value: '#CFE8DC' },
];

interface DiaryTextEditorProps {
  initialContent: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  onMenuStateChange?: (isOpen: boolean) => void;
}

const DiaryTextEditor: React.FC<DiaryTextEditorProps> = ({ 
  initialContent, 
  onChange, 
  onBlur,
  onFocus,
  placeholder, 
  className = '',
  autoFocus = false,
  onMenuStateChange
}) => {
  // Parse plain text compatibility
  const getSafeContent = (text: string) => {
    if (!text) return '';
    const isRichText = text.includes('<p>') || text.includes('<ul>') || text.includes('<h2>') || text.includes('<h3>');
    if (isRichText) return text;
    
    // Convert plain text to HTML paragraphs
    return text.split('\n').map(line => `<p>${line.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`).join('');
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        orderedList: false,
        bulletList: false,
        blockquote: false,
        codeBlock: false,
        heading: false,
        horizontalRule: false,
        strike: false,
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Placeholder.configure({
        placeholder: placeholder || '기록을 남겨보세요...',
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: getSafeContent(initialContent),
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onSelectionUpdate: ({ editor }) => {
      if (onMenuStateChange) {
        onMenuStateChange(!editor.state.selection.empty);
      }
    },
    onBlur: () => {
      if (onBlur) onBlur();
    },
    onFocus: () => {
      if (onFocus) onFocus();
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none min-h-[40px] w-full ${className}`,
        spellcheck: 'false',
      },
      transformPastedHTML(html) {
        return html.replace(/>\s+</g, '><');
      },
    },
  });

  useEffect(() => {
    if (autoFocus && editor && !editor.isFocused) {
      editor.commands.focus('end', { scrollIntoView: false });
    }
  }, [editor, autoFocus]);

  useEffect(() => {
    if (!editor) return;

    const currentHtml = editor.getHTML();
    const safeIncoming = getSafeContent(initialContent);

    // 1. When externally reset to empty (e.g. after adding a new memo)
    if (initialContent === '' && !editor.isEmpty) {
      editor.commands.setContent('');
    } 
    // 2. When async data loads from DB (editor is empty, but incoming data has content)
    else if (initialContent !== '' && currentHtml === '<p></p>' && safeIncoming !== '<p></p>') {
      editor.commands.setContent(safeIncoming);
    }
  }, [editor, initialContent]);

  if (!editor) return null;

  return (
    <div className="relative w-full h-full cursor-text" onClick={(e) => {
      const isEditor = (e.target as HTMLElement).closest('.ProseMirror');
      if (!isEditor) {
        editor.chain().focus('end').run();
      }
    }}>
      {editor && (
        <BubbleMenu editor={editor}>
          <div 
            className="diary-bubble-menu flex items-center gap-1.5 p-1.5 bg-white/90 backdrop-blur shadow-[0_4px_16px_rgba(0,0,0,0.12)] rounded-full border border-[#E5E5EA]"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {HIGHLIGHT_COLORS.map(color => {
              const isActive = editor.isActive('highlight', { color: color.value });
              return (
                <button
                  type="button"
                  key={color.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isActive) {
                      editor.chain().focus().unsetHighlight().run();
                    } else {
                      editor.chain().focus().setHighlight({ color: color.value }).run();
                    }
                    if (onMenuStateChange) {
                      setTimeout(() => onMenuStateChange(false), 150);
                    }
                  }}
                  className={`diary-color-btn w-5 h-5 rounded-full border-2 transition-transform cursor-pointer flex-shrink-0 ${
                    isActive ? 'border-[#8B7CF8] scale-110 shadow-sm' : 'border-transparent hover:scale-110'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title="형광펜"
                />
              );
            })}
          </div>
        </BubbleMenu>
      )}
      <EditorContent editor={editor} className="h-full" />
    </div>
  );
};

export default DiaryTextEditor;
