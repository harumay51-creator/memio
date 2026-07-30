export function extractPreview(html: string, maxLength: number = 200): string {
  if (!html) return ''
  // Remove HTML tags
  const text = html.replace(/<[^>]*>?/gm, '')
  // Replace multiple spaces (but keep newlines) with single space
  const cleanText = text.replace(/[ \t]+/g, ' ').replace(/\n+/g, '\n').trim()
  
  if (cleanText.length <= maxLength) return cleanText
  return cleanText.substring(0, maxLength) + '...'
}

export function extractSearchText(html: string): string {
  if (!html) return ''
  const text = html.replace(/<[^>]*>?/gm, '')
  // For search text, we can remove newlines completely
  return text.replace(/\s+/g, ' ').trim()
}
