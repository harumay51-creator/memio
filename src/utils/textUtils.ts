export function decodeHtmlEntities(text: string): string {
  const map: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' '
  }
  return text.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => map[m] || m)
}

export function extractPreview(html: string, maxLength: number = 200): string {
  if (!html) return ''
  // Remove HTML tags and decode entities
  let text = html.replace(/<[^>]*>?/gm, '')
  text = decodeHtmlEntities(text)
  // Replace multiple spaces (but keep newlines) with single space
  const cleanText = text.replace(/[ \t]+/g, ' ').replace(/\n+/g, '\n').trim()
  
  if (cleanText.length <= maxLength) return cleanText
  return cleanText.substring(0, maxLength) + '...'
}

export function extractSearchText(html: string): string {
  if (!html) return ''
  let text = html.replace(/<[^>]*>?/gm, '')
  text = decodeHtmlEntities(text)
  // For search text, we can remove newlines completely
  return text.replace(/\s+/g, ' ').trim()
}

export function getSearchTokens(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean)
}

export function isSearchMatch(text: string, query: string): boolean {
  const tokens = getSearchTokens(query)
  if (tokens.length === 0) return true
  const lowerText = text.toLowerCase()
  return tokens.every(token => lowerText.includes(token))
}

export function getSearchPreview(fullText: string, query: string, fallbackText?: string): string {
  const tokens = getSearchTokens(query)
  const textForFallback = fallbackText !== undefined ? fallbackText : fullText
  const strippedFallback = decodeHtmlEntities(textForFallback.replace(/<[^>]*>?/gm, '')).trim()
  
  if (tokens.length === 0) {
    return strippedFallback.length > 40 ? strippedFallback.substring(0, 40) + '...' : strippedFallback
  }
  
  const strippedFull = decodeHtmlEntities(fullText.replace(/<[^>]*>?/gm, '')).trim()
  const lowerFull = strippedFull.toLowerCase()
  const matchIndices = tokens.map(token => lowerFull.indexOf(token)).filter(index => index !== -1)
  
  if (matchIndices.length === 0) {
    return strippedFallback.length > 40 ? strippedFallback.substring(0, 40) + '...' : strippedFallback
  }
  
  const earliestMatch = Math.min(...matchIndices)
  const start = Math.max(0, earliestMatch - 15)
  const end = Math.min(strippedFull.length, start + 50)
  
  let result = strippedFull.substring(start, end)
  if (start > 0) result = '...' + result
  if (end < strippedFull.length) result = result + '...'
  
  return result
}

export function repairCorruptedHtml(text: string): string {
  if (!text) return text;
  if (text.includes('\n')) return text;
  
  if (text.startsWith('<')) {
    const blockTags = ['</p>', '</h1>', '</h2>', '</h3>', '</div>', '</ul>', '</ol>'];
    let firstTagIndex = -1;
    for (const tag of blockTags) {
      const idx = text.indexOf(tag);
      if (idx !== -1 && (firstTagIndex === -1 || idx < firstTagIndex)) {
        firstTagIndex = idx + tag.length;
      }
    }
    
    if (firstTagIndex !== -1) {
      const firstBlock = text.substring(0, firstTagIndex);
      const rest = text.substring(firstTagIndex);
      
      const title = decodeHtmlEntities(firstBlock.replace(/<[^>]*>?/gm, '')).trim();
      
      if (title) {
        return title + '\n' + rest;
      }
    }
  }
  return text;
}

export function handlePlainTextPaste(editor: any, event: any): boolean {
  if (!editor || !event.clipboardData) return false;
  
  const items = event.clipboardData.items;
  if (!items) return false;

  let hasHtml = false;
  let hasPlain = false;
  
  for (let i = 0; i < items.length; i++) {
    if (items[i].type === 'text/html') hasHtml = true;
    if (items[i].type === 'text/plain') hasPlain = true;
  }

  // If HTML is present, let Tiptap handle it natively (protects Tables, rich text, etc.)
  if (hasHtml || !hasPlain) return false;

  const text = event.clipboardData.getData('text/plain');
  if (!text) return false;

  event.preventDefault();
  
  // Normalize Windows CRLF and Mac CR to LF
  const normalized = text.replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');
  
  const nodes = lines.map((line: string) => {
    if (line === '') return { type: 'paragraph' };
    return { type: 'paragraph', content: [{ type: 'text', text: line }] };
  });
  
  editor.commands.insertContent(nodes);
  return true;
}

