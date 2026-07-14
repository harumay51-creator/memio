import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { Link } from '@tiptap/extension-link';
import { Placeholder } from '@tiptap/extension-placeholder';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import Image from '@tiptap/extension-image';
import { 
  Bold, Italic, Strikethrough, Heading2, Heading3, 
  List, Minus, Smile, Link as LinkIcon 
} from 'lucide-react';
import { auth, storage } from '../../config/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

const COLORS = ['#5B4FCF', '#D45D6E', '#C96A95', '#3F9E7A'];

interface RichTextEditorProps {
  initialContent: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ initialContent, onChange, placeholder, className = '' }) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);

  // Parse plain text compatibility
  const getSafeContent = (text: string) => {
    if (!text) return '';
    const isRichText = text.includes('<p>') || text.includes('<ul>') || text.includes('<h2>') || text.includes('<h3>');
    if (isRichText) return text;
    
    // Convert plain text to HTML paragraphs
    return text.split('\n').map(line => `<p>${line.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`).join('');
  };

  const resizeImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 1200;
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas toBlob failed'));
        }, 'image/webp', 0.8);
      };
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = url;
    });
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        orderedList: false,
        blockquote: false,
        codeBlock: false,
        heading: {
          levels: [2, 3],
        },
      }),
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-accent underline cursor-pointer',
        },
      }),
      Placeholder.configure({
        placeholder: placeholder || '내용을 작성하세요...',
        emptyEditorClass: 'is-editor-empty',
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      })
    ],
    content: getSafeContent(initialContent),
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[150px] w-full',
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type.indexOf('image') === 0) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) {
              const uid = auth.currentUser?.uid;
              if (!uid) return true;
              
              const tempUrl = URL.createObjectURL(file);
              // Insert placeholder image
              editor?.chain().focus().setImage({ src: tempUrl, alt: 'uploading...' }).run();

              resizeImage(file).then(blob => {
                const timestamp = Date.now();
                const randomStr = Math.random().toString(36).substring(2, 8);
                const filePath = `users/${uid}/notes/${timestamp}_${randomStr}.webp`;
                const fileRef = ref(storage, filePath);
                
                const uploadTask = uploadBytesResumable(fileRef, blob);
                uploadTask.on('state_changed', 
                  null, 
                  (error) => {
                    console.error('Upload failed', error);
                  }, 
                  async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    const html = editor?.getHTML() || '';
                    const updatedHtml = html.replace(tempUrl, downloadURL);
                    editor?.commands.setContent(updatedHtml);
                    onChange(updatedHtml);
                    URL.revokeObjectURL(tempUrl);
                    URL.revokeObjectURL(tempUrl);
                  }
                );
              }).catch(console.error);
            }
            return true;
          }
        }
        return false;
      }
    },
  });

  // Handle click outside for emoji picker
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!editor) return null;

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL을 입력하세요', previousUrl)

    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <div className={`flex flex-col h-full bg-transparent ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 mb-2 bg-yuri-50/50 rounded-lg shrink-0 border border-yuri-100">
        <ToolbarButton
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          icon={<Bold size={15} />}
          title="굵게"
        />
        <ToolbarButton
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          icon={<Italic size={15} />}
          title="기울임"
        />
        <ToolbarButton
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          icon={<Strikethrough size={15} />}
          title="취소선"
        />
        
        <div className="w-px h-4 bg-yuri-200 mx-1" />
        
        <ToolbarButton
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          icon={<Heading2 size={15} />}
          title="제목 2"
        />
        <ToolbarButton
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          icon={<Heading3 size={15} />}
          title="제목 3"
        />
        <ToolbarButton
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          icon={<List size={15} />}
          title="글머리 기호"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          icon={<Minus size={15} />}
          title="구분선"
        />
        
        <div className="w-px h-4 bg-yuri-200 mx-1" />
        
        <ToolbarButton
          active={editor.isActive('highlight')}
          onClick={() => editor.chain().focus().toggleHighlight({ color: '#FEF08A' }).run()}
          icon={<div className="w-3.5 h-3.5 bg-yellow-200 rounded-sm flex items-center justify-center font-bold text-[9px] text-yellow-700">A</div>}
          title="형광펜"
        />
        
        <ToolbarButton
          active={editor.isActive('link')}
          onClick={setLink}
          icon={<LinkIcon size={15} />}
          title="링크"
        />

        <div className="w-px h-4 bg-yuri-200 mx-1" />
        
        {/* Colors */}
        <div className="flex items-center gap-1.5 mx-1">
          {COLORS.map(color => (
            <button
              key={color}
              type="button"
              onClick={() => editor.chain().focus().setColor(color).run()}
              className={`w-4 h-4 rounded-full border-2 transition-transform cursor-pointer ${editor.isActive('textStyle', { color }) ? 'border-yuri-900 scale-110' : 'border-transparent hover:scale-110'}`}
              style={{ backgroundColor: color }}
              title="글씨 색상"
            />
          ))}
          <button
              type="button"
              onClick={() => editor.chain().focus().unsetColor().run()}
              className="w-4 h-4 rounded-full border border-yuri-300 bg-white flex items-center justify-center text-[9px] text-yuri-400 hover:bg-yuri-100 transition-colors cursor-pointer"
              title="색상 초기화"
          >
            ✕
          </button>
        </div>

        <div className="w-px h-4 bg-yuri-200 mx-1" />
        
        {/* Emoji */}
        <div className="relative" ref={emojiRef}>
          <ToolbarButton
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            icon={<Smile size={15} />}
            title="이모지"
            active={showEmojiPicker}
          />
          {showEmojiPicker && (
            <div className="absolute top-full left-0 mt-1 z-50 shadow-xl rounded-xl border border-yuri-200 overflow-hidden">
              <EmojiPicker 
                theme={Theme.LIGHT} 
                onEmojiClick={(emojiObj) => {
                  editor.chain().focus().insertContent(emojiObj.emoji).run();
                  setShowEmojiPicker(false);
                }} 
              />
            </div>
          )}
        </div>
      </div>

      {/* Editor Content */}
      <div 
        className="flex-1 overflow-y-auto cursor-text rounded-lg" 
        onClick={() => {
          if (!editor.isFocused) {
            editor.commands.focus();
          }
        }}
      >
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
};

interface ToolbarButtonProps {
  icon: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  title?: string;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ icon, active, onClick, title }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={`p-1.5 rounded-md transition-colors flex items-center justify-center cursor-pointer ${
      active ? 'bg-accent/20 text-accent font-bold' : 'text-yuri-500 hover:bg-yuri-200 hover:text-yuri-800'
    }`}
  >
    {icon}
  </button>
);

export default RichTextEditor;
