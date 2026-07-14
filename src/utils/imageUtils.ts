import { ref, deleteObject } from 'firebase/storage'
import { storage } from '../config/firebase'

// Parses HTML and returns all Firebase Storage image URLs
export function extractFirebaseImageUrls(html: string): string[] {
  const urls: string[] = []
  // Matches <img src="URL"> where URL contains firebasestorage.googleapis.com
  const imgRegex = /<img[^>]+src="([^">]+)"/g
  let match
  while ((match = imgRegex.exec(html)) !== null) {
    const url = match[1]
    if (url.includes('firebasestorage.googleapis.com')) {
      urls.push(url)
    }
  }
  return urls
}

// Deletes a list of Firebase Storage URLs
export async function deleteFirebaseImages(urls: string[]) {
  const promises = urls.map(async (url) => {
    try {
      const decodedUrl = decodeURIComponent(url)
      // Extracts the actual path inside storage (e.g. users/uid/notes/123.webp)
      const pathMatch = decodedUrl.match(/\/o\/([^?]+)/)
      if (pathMatch && pathMatch[1]) {
        const filePath = pathMatch[1]
        const fileRef = ref(storage, filePath)
        await deleteObject(fileRef)
      }
    } catch (err) {
      console.error('Failed to delete image from storage:', url, err)
    }
  })
  await Promise.allSettled(promises)
}

// Compares old and new HTML, deletes images that were removed
export async function cleanupRemovedImages(oldHtml: string, newHtml: string) {
  const oldUrls = extractFirebaseImageUrls(oldHtml)
  const newUrls = extractFirebaseImageUrls(newHtml)
  
  const removedUrls = oldUrls.filter(url => !newUrls.includes(url))
  if (removedUrls.length > 0) {
    await deleteFirebaseImages(removedUrls)
  }
}
