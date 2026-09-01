import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { StarterKit } from '@tiptap/starter-kit';
import { Highlight } from '@tiptap/extension-highlight';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Table as TableIcon, MoreHorizontal } from 'lucide-react';
import { handlePlainTextPaste } from '../../utils/textUtils';

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
    coreExtensionOptions: {
      clipboardTextSerializer: {
        blockSeparator: '\n',
      },
    },
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
      Table.configure({
        resizable: false,
      }),
      TableRow,
      TableHeader,
      TableCell,
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
      handlePaste: (_view, event) => {
        if (editor && handlePlainTextPaste(editor, event)) {
          return true;
        }
        return false;
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

  const [isTableInsertOpen, setIsTableInsertOpen] = React.useState(false);
  const [isTableMoreOpen, setIsTableMoreOpen] = React.useState(false);

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
            
            <div className="w-px h-4 bg-gray-200 mx-1" />
            
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsTableInsertOpen(!isTableInsertOpen);
                }}
                className={`w-6 h-6 flex items-center justify-center rounded-full transition-colors ${editor.isActive('table') ? 'bg-accent/10 text-accent' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                <TableIcon size={14} />
              </button>
              
              {isTableInsertOpen && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white border border-gray-100 shadow-[0_4px_16px_rgba(0,0,0,0.12)] rounded-lg p-1.5 flex flex-col gap-0.5 w-24">
                  <button type="button" onClick={(e) => { e.stopPropagation(); editor.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: false }).run(); setIsTableInsertOpen(false); }} className="text-xs text-left px-2 py-1.5 hover:bg-gray-50 rounded text-gray-700 font-medium">2 × 2</button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); editor.chain().focus().insertTable({ rows: 2, cols: 3, withHeaderRow: false }).run(); setIsTableInsertOpen(false); }} className="text-xs text-left px-2 py-1.5 hover:bg-gray-50 rounded text-gray-700 font-medium">3 × 2</button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: false }).run(); setIsTableInsertOpen(false); }} className="text-xs text-left px-2 py-1.5 hover:bg-gray-50 rounded text-gray-700 font-medium">3 × 3</button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); editor.chain().focus().insertTable({ rows: 3, cols: 4, withHeaderRow: false }).run(); setIsTableInsertOpen(false); }} className="text-xs text-left px-2 py-1.5 hover:bg-gray-50 rounded text-gray-700 font-medium">4 × 3</button>
                </div>
              )}
            </div>
          </div>
        </BubbleMenu>
      )}

      {editor && (
        <BubbleMenu 
          editor={editor} 
          shouldShow={({ editor }) => editor.isActive('table')}
        >
          <div className="flex items-center gap-1 p-1 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.12)] rounded-lg border border-gray-100">
            <button type="button" onPointerDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().addRowAfter().run()} className="text-[11px] px-2 py-1.5 hover:bg-gray-50 rounded text-gray-700 font-medium">행 +</button>
            <button type="button" onPointerDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().addColumnAfter().run()} className="text-[11px] px-2 py-1.5 hover:bg-gray-50 rounded text-gray-700 font-medium">열 +</button>
            
            <div className="relative">
              <button type="button" onPointerDown={(e) => e.preventDefault()} onClick={() => setIsTableMoreOpen(!isTableMoreOpen)} className="p-1 hover:bg-gray-50 rounded text-gray-500">
                <MoreHorizontal size={14} />
              </button>
              
              {isTableMoreOpen && (
                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-100 shadow-lg rounded-lg p-1 flex flex-col gap-0.5 w-20">
                  <button type="button" onPointerDown={(e) => e.preventDefault()} onClick={() => { editor.chain().focus().deleteRow().run(); setIsTableMoreOpen(false); }} className="text-[11px] text-center px-2 py-1.5 hover:bg-red-50 rounded text-red-600 font-medium">행 삭제</button>
                  <button type="button" onPointerDown={(e) => e.preventDefault()} onClick={() => { editor.chain().focus().deleteColumn().run(); setIsTableMoreOpen(false); }} className="text-[11px] text-center px-2 py-1.5 hover:bg-red-50 rounded text-red-600 font-medium">열 삭제</button>
                  <button type="button" onPointerDown={(e) => e.preventDefault()} onClick={() => { editor.chain().focus().deleteTable().run(); setIsTableMoreOpen(false); }} className="text-[11px] text-center px-2 py-1.5 hover:bg-red-50 rounded text-red-600 font-bold">표 삭제</button>
                </div>
              )}
            </div>
          </div>
        </BubbleMenu>
      )}
      <EditorContent editor={editor} className="h-full" />
    </div>
  );
};

export default DiaryTextEditor;
