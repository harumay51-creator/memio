import { useEffect, useState } from 'react'
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import Image from '@tiptap/extension-image'
import { doc, getDoc } from 'firebase/firestore'
import { db, auth } from '../../config/firebase'

const AsyncImageComponent = (props: any) => {
  const src = props.node.attrs.src
  const [imgSrc, setImgSrc] = useState<string>(src)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let isMounted = true
    if (src && src.startsWith('memio-img://')) {
      const id = src.replace('memio-img://', '')
      const uid = auth.currentUser?.uid
      if (uid) {
        setLoading(true)
        getDoc(doc(db, `users/${uid}/images/${id}`))
          .then(snap => {
            if (isMounted && snap.exists()) {
              setImgSrc(snap.data().base64)
            }
          })
          .catch(console.error)
          .finally(() => {
            if (isMounted) setLoading(false)
          })
      }
    } else {
      setImgSrc(src)
    }
    return () => { isMounted = false }
  }, [src])

  return (
    <NodeViewWrapper className="async-image-wrapper relative inline-block my-4 w-full">
      {loading ? (
        <div className="flex items-center justify-center p-8 bg-yuri-50 border border-yuri-200 rounded text-yuri-400 text-sm w-full">
          이미지 불러오는 중...
        </div>
      ) : (
        <img 
          src={imgSrc} 
          alt={props.node.attrs.alt || '이미지'} 
          className="rounded-lg shadow-sm border border-yuri-100 max-w-full"
        />
      )}
    </NodeViewWrapper>
  )
}

export const AsyncImage = Image.extend({
  addNodeView() {
    return ReactNodeViewRenderer(AsyncImageComponent)
  }
})
