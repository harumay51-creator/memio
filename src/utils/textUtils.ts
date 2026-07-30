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
