import { doc, deleteDoc } from 'firebase/firestore'
import { db, auth } from '../config/firebase'

// Parses HTML and returns all Firebase Storage image URLs
export function extractFirebaseImageUrls(html: string): string[] {
  const urls: string[] = []
  // Matches <img src="memio-img://IMAGE_ID">
  const imgRegex = /<img[^>]+src="memio-img:\/\/([^">]+)"/g
  let match
  while ((match = imgRegex.exec(html)) !== null) {
    const id = match[1]
    urls.push(id)
  }
  return urls
}

// Deletes a list of Firestore image documents
export async function deleteFirestoreImages(imageIds: string[]) {
  const uid = auth.currentUser?.uid
  if (!uid) return

  const promises = imageIds.map(async (id) => {
    try {
      await deleteDoc(doc(db, `users/${uid}/images/${id}`))
    } catch (err) {
      console.error('Failed to delete image from firestore:', id, err)
    }
  })
  await Promise.allSettled(promises)
}

// Compares old and new HTML, deletes images that were removed
export async function cleanupRemovedImages(oldHtml: string, newHtml: string) {
  const oldUrls = extractFirebaseImageUrls(oldHtml)
  const newUrls = extractFirebaseImageUrls(newHtml)
  
  const removedIds = oldUrls.filter(id => !newUrls.includes(id))
  if (removedIds.length > 0) {
    await deleteFirestoreImages(removedIds)
  }
}
