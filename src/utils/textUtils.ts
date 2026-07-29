export function extractPreview(html: string, maxLength: number = 200): string {
  if (!html) return ''
  // Remove HTML tags
  const text = html.replace(/<[^>]*>?/gm, '')
  // Replace multiple spaces/newlines with single space
  const cleanText = text.replace(/\s+/g, ' ').trim()
  
  if (cleanText.length <= maxLength) return cleanText
  return cleanText.substring(0, maxLength) + '...'
}
